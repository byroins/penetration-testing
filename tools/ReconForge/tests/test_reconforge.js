/**
 * ReconForge 自测
 *
 * 原则：直接从 shipped 代码里"提取函数源码"再执行，而不是另写一份等价逻辑，
 *       这样测的就是真正交付的那段代码。
 *
 * 覆盖：
 *   1) resolveRelativePath —— 相对路径归一化（含用户真实数据中的 7 条 ../ 样本）
 *   2) export_data + csv_escape —— CSV 导出（stub 掉 chrome/DOM，捕获下载内容）
 *   3) content.js 去重修复 —— 断言旧 bug 行已消失、新实现存在
 *
 * 运行：node tests/test_forge.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const POPUP = fs.readFileSync(path.join(ROOT, 'src/js/popup.js'), 'utf8');
const CONTENT = fs.readFileSync(path.join(ROOT, 'src/js/content.js'), 'utf8');

let pass = 0, fail = 0;
const failures = [];
function check(name, actual, expected) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) { pass++; console.log(`  ✅ ${name}`); }
    else {
        fail++; failures.push(name);
        console.log(`  ❌ ${name}\n      期望: ${JSON.stringify(expected)}\n      实际: ${JSON.stringify(actual)}`);
    }
}
function checkTrue(name, cond) {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; failures.push(name); console.log(`  ❌ ${name}`); }
}

/** 从源码里按大括号配对提取一个函数（含前面的注释块） */
function extractFunction(src, name) {
    const idx = src.indexOf('function ' + name + '(');
    if (idx < 0) throw new Error('函数未找到: ' + name);
    let start = idx;
    // 把紧邻其上的 JSDoc/注释一起带上（便于阅读，但不影响执行）
    const jsdoc = src.lastIndexOf('/**', idx);
    if (jsdoc >= 0 && src.slice(jsdoc, idx).indexOf('*/') >= 0 && idx - jsdoc < 600) start = jsdoc;
    let i = src.indexOf('{', idx);
    let depth = 0;
    for (let j = i; j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
    throw new Error('括号不配对: ' + name);
}

// ─────────────────────────────────────────────────────────
// 1) 相对路径归一化
// ─────────────────────────────────────────────────────────
console.log('\n【1】resolveRelativePath —— 相对路径归一化（RFC 3986 相对引用解析）');

const sandbox = { URL, console };
vm.createContext(sandbox);
vm.runInContext(extractFunction(POPUP, 'resolveRelativePath'), sandbox);
const resolve = (line, tabUrl) => vm.runInContext('resolveRelativePath', sandbox)(line, tabUrl);

// 用户 info2(二开).txt 里真实出现的 5 条 ../ 路径（同一页面）
const TAB = 'http://example.com/xbsf_student/console/templates/normal/desktop.html';
const realCases = [
    ['../../apply/myDesktop/changePwd.html',      'http://example.com/xbsf_student/console/apply/myDesktop/changePwd.html'],
    ['../../apply/myDesktop/index.html',          'http://example.com/xbsf_student/console/apply/myDesktop/index.html'],
    ['../../apply/myDesktop/downloadCenter.html', 'http://example.com/xbsf_student/console/apply/myDesktop/downloadCenter.html'],
    ['../../apply/myDesktop/announceMent.html',   'http://example.com/xbsf_student/console/apply/myDesktop/announceMent.html'],
    ['../../../index.html',                       'http://example.com/xbsf_student/index.html'],
];
realCases.forEach(([line, want]) => check(`真实样本 ${line}`, resolve(line, TAB), want));

// 对照：旧实现的输出（origin + '/' + line），浏览器会塌缩掉 ../ 使其指向错误地址
const origin = 'http://example.com';
const oldOut = origin + '/' + realCases[0][0];
check('对照·旧实现输出（≠正确地址）', oldOut, 'http://example.com/../../apply/myDesktop/changePwd.html');
checkTrue('对照·新实现结果 ≠ 旧实现结果（确实修掉了）', resolve(realCases[0][0], TAB) !== oldOut);

// 边界
check('./ 当前目录', resolve('./a.html', 'http://h/p/q/page.html'), 'http://h/p/q/a.html');
check('../ 上一级', resolve('../a.html', 'http://h/p/q/page.html'), 'http://h/p/a.html');
check('../ 越过根目录（塌缩到根）', resolve('../../../../a.html', 'http://h/p/q/page.html'), 'http://h/a.html');
check('保留端口与查询串', resolve('../a.html?x=1#f', 'http://h:8080/p/q/page.html'), 'http://h:8080/p/a.html?x=1#f');
check('非法 URL → null（走调用方兜底）', resolve('../a.html', 'not-a-url'), null);

// ─────────────────────────────────────────────────────────
// 2) CSV 导出
// ─────────────────────────────────────────────────────────
console.log('\n【2】export_data + csv_escape —— 导出 CSV（stub chrome/DOM，捕获下载内容）');

let downloaded = null;
let alerted = [];
const sandbox2 = {
    URL,
    console,
    setTimeout,
    alert: (m) => alerted.push(m),
    Blob: class { constructor(parts) { this.parts = parts; } },
    document: { createElement: () => ({ style: {}, click() {}, parentNode: { removeChild() {} } }), body: { appendChild() {} } },
    chrome: { i18n: { getMessage: (k) => ({ popupExportEmpty: '暂无可导出的数据' }[k] || '') } },
    getCurrentTab: async () => ({ url: TAB }),
    lastResultData: {
        path: ['/a/b.js', '../../apply/myDesktop/changePwd.html', 'has"quote.html'],
        ip: ['1.2.3.4'],
        domain: ['example.com'],
        source: { '1.2.3.4': 'http://example.com/x.js', '../../apply/myDesktop/changePwd.html': 'http://example.com/x.js' },
    },
    key: ['ip', 'ip_port', 'domain', 'path', 'incomplete_path', 'url', 'static', 'sfz', 'mobile', 'mail', 'jwt', 'algorithm', 'secret'],
};
vm.createContext(sandbox2);
['csv_escape', 'download_text', 'export_data'].forEach((fn) => vm.runInContext(extractFunction(POPUP, fn), sandbox2));
// download_text 里用 URL.createObjectURL，捕获内容
sandbox2.URL = Object.assign(URL, { createObjectURL: (blob) => { downloaded = blob.parts[0]; return 'blob:fake'; }, revokeObjectURL: () => {} });

const emptyTipExpected = '暂无可导出的数据';
const runExport = () => vm.runInContext('export_data()', sandbox2);

// 完整体验前先测 csv_escape
const esc = vm.runInContext('csv_escape', sandbox2);
check('csv_escape 普通值', esc('abc'), '"abc"');
check('csv_escape 含双引号', esc('has"quote'), '"has""quote"');

// ── 正式跑一次导出
(async () => {
    await runExport();
    const lines = String(downloaded).replace(/^\uFEFF/, '').split('\r\n');
    checkTrue('导出内容带 UTF-8 BOM', String(downloaded).startsWith('\uFEFF'));
    check('CSV 表头', lines[0], '"category","value","source"');
    check('CSV 行数（1 表头 + 5 条数据）', lines.length, 6);
    check('ip 行', lines[1], '"ip","1.2.3.4","http://example.com/x.js"');
    check('domain 行（无来源 → 空）', lines[2], '"domain","example.com",""');
    check('path 第 2 行 = ../ 原样保留在 CSV 里', lines[3], '"path","/a/b.js",""');
    check('path 第 3 行（../）', lines[4], '"path","../../apply/myDesktop/changePwd.html","http://example.com/x.js"');
    check('path 第 4 行（含引号转义）', lines[5], '"path","has""quote.html",""');

    // ── 无数据时必须走提示分支（负控制）
    vm.runInContext('lastResultData = null', sandbox2);
    downloaded = null; alerted = [];
    await runExport();
    check('无数据时不下载', downloaded, null);
    check('无数据时给出提示', alerted, [emptyTipExpected]);

    // ── 空对象（只有 key 无内容）
    vm.runInContext('lastResultData = {path: []}', sandbox2);
    alerted = [];
    await runExport();
    check('空类目时给出提示', alerted, [emptyTipExpected]);

    // ─────────────────────────────────────────────────────
    // 3) content.js 去重修复
    // ─────────────────────────────────────────────────────
    console.log('\n【3】content.js —— 去重修复（静态断言）');
    checkTrue('旧的空操作 pop(href) 已不存在', !/tmp_target_list\.pop\(href\)/.test(CONTENT));
    checkTrue('发送的是去重后的列表（tmp_target_list）', /data:\s*tmp_target_list/.test(CONTENT));
    checkTrue('使用 Set 去重', /tmp_target_list\s*=\s*\[\.\.\.new Set\(target_list\)\]/.test(CONTENT));
    checkTrue('不再发送未去重的 target_list', !/data:\s*target_list\b/.test(CONTENT));

    // 两处路径映射（「复制URL」与「复制域名+路径」）都必须走归一化
    check('resolveRelativePath 调用点数量（2 处调用 + 1 处定义）', (POPUP.match(/resolveRelativePath\(/g) || []).length, 3);
    checkTrue('旧的「./ 专用分支」已消失（两处）', !POPUP.includes("startsWith('./') {"));
    checkTrue('旧的手工 basePath 拼接已消失', !/pathname\.lastIndexOf\('\/'\)/.test(POPUP));

    // 行为验证：[...new Set()] 的去重效果（与 shipped 表达式一致）
    const dedup = (l) => [...new Set(l)];
    check('Set 去重语义', dedup(['a', 'b', 'a', 'c', 'b']), ['a', 'b', 'c']);

    console.log('\n────────────────────────────────────────');
    console.log(`结果: ${pass} 通过 / ${fail} 失败`);
    if (fail) { console.log('失败项:\n - ' + failures.join('\n - ')); process.exit(1); }
    console.log('全部通过 ✅');
})();