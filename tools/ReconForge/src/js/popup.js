// @Date    : 2020-09-12 16:26:48
// @Author  : residuallaugh
// @Description: 弹出窗口主逻辑

/**
 * 根据ID设置元素的文本内容
 * @param {string} id - 元素ID
 */
function setTextContentById(id) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = chrome.i18n.getMessage(id);
    }
}

/**
 * 初始化国际化文本
 */
function init_locales() {
    const popupIdList = [
        "Zhuye",
        "Peizhi",
        "popupIp",
        "popupIpPort",
        "popupDomain",
        "popupSfz",
        "popupMobile",
        "popupMail",
        "popupJwt",
        "popupAlgorithm",
        "popupSecret",
        "popupPath",
        "popupIncompletePath",
        "popupUrl",
        "popupStaticPath",
    ];

    for (const id of popupIdList) {
        try {
            setTextContentById(id);
        } catch (e) {
            console.log("无法设置文本内容:", id);
        }
    }
}

// 数据类型键名
var key = ["ip", "ip_port", "domain", "path", "incomplete_path", "url", "static", "sfz", "mobile", "mail", "jwt", "algorithm", "secret"];

// [Forge] 缓存最近一次渲染的原始数据，供「导出 CSV」使用
let lastResultData = null;

/**
 * 初始化复制按钮功能
 */
function init_copy() {
    var elements = document.getElementsByClassName("copy-btn");
    if (elements) {
        for (var i = 0, len = elements.length | 0; i < len; i = i + 1 | 0) {
            // 设置按钮文本
            const copyText = chrome.i18n.getMessage("popupCopy");
            if (copyText) {
                elements[i].textContent = copyText;
            }
            
            let ele_name = elements[i].name;
            let ele_id = elements[i].id;
            
            elements[i].onclick = function () {
                var inp = document.createElement('textarea');
                document.body.appendChild(inp);
                // 获取要复制的文本内容（只获取原始数据，不包含来源信息）
                var copytext = getRawDataText(ele_name);
                
                // 普通复制功能
                inp.value = copytext;
                inp.select();
                document.execCommand('copy', false);
                inp.remove();
            };
        }
    }
    
    // 初始化复制URL按钮
    init_copy_url_buttons();
}

/**
 * 获取指定元素的原始数据文本（不包含来源信息）
 * @param {string} elementId - 元素ID
 * @returns {string} 原始数据文本
 */
function getRawDataText(elementId) {
    // 从隐藏的数据存储中获取原始数据
    const dataElement = document.getElementById('data-' + elementId);
    if (dataElement) {
        return dataElement.textContent;
    }
    
    // 如果没有隐藏数据存储，则从显示区域获取（向后兼容）
    const element = document.getElementById(elementId);
    if (element) {
        return element.textContent;
    }
    
    return "";
}

/**
 * 初始化复制URL按钮功能
 */
function init_copy_url_buttons() {
    // 为所有复制URL按钮添加事件监听器
    const copyUrlButtons = document.querySelectorAll('.copy-url-btn');
    const copyUrlText = chrome.i18n.getMessage("popupCopyurl");
    
    copyUrlButtons.forEach(button => {
        if (copyUrlText) {
            button.textContent = copyUrlText;
        }
        
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            copyUrl(targetId);
        });
    });
}

/**
 * 复制指定区域内容的完整URL
 * @param {string} targetId - 目标元素ID
 */
function copyUrl(targetId) {
    getCurrentTab().then(function(tab) {
        if (tab && tab.url) {
            const url = new URL(tab.url);
            const origin = url.origin;
            
            // 获取原始数据文本（不包含来源信息）
            const rawDataText = getRawDataText(targetId);
            if (rawDataText && rawDataText !== '🈚️') {
                const lines = rawDataText.split('\n').filter(line => line.trim() !== '');
                
                const fullUrls = lines.map(line => {
                    // 处理不同类型的路径
                    if (line.startsWith('http://') || line.startsWith('https://')) {
                        // 已经是完整URL
                        return line;
                    } else if (line.startsWith('//')) {
                        // 协议相对URL
                        return url.protocol + line;
                    } else if (line.startsWith('/')) {
                        // 绝对路径
                        return origin + line;
                    } else if (line.startsWith('./') || line.startsWith('../')) {
                        // [Forge] 相对路径归一化：按当前页面解析为绝对 URL（符合 RFC 3986）
                        // 修复 ../ 越过根目录被塌缩、导致丢目录前缀 / 指向错误地址的问题
                        const resolved = resolveRelativePath(line, tab.url);
                        return resolved !== null ? resolved : origin + '/' + line;
                    } else {
                        // 其他情况，当作相对路径处理
                        return origin + '/' + line;
                    }
                }).join('\n');
                
                copyToClipboard(fullUrls);
            }
        }
    });
}

/**
 * 初始化标签页切换功能
 */
function init_tabs() {
    const tabNavItems = document.querySelectorAll('.tab-nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabNavItems.forEach(item => {
        item.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // 更新导航项激活状态
            tabNavItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应的标签页内容
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === tabId + '-tab') {
                    pane.classList.add('active');
                }
            });
        });
    });
}

/**
 * 初始化批量复制功能
 */
function init_batch_copy(result_data) {
    // 复制所有路径
    const copyAllPathsBtn = document.getElementById('copyAllPaths');
    if (copyAllPathsBtn) {
        copyAllPathsBtn.addEventListener('click', function() {
            // 获取原始数据文本（不包含来源信息）
            const pathContent = getRawDataText('path');
            const incompletePathContent = getRawDataText('incomplete_path');
            const staticContent = getRawDataText('static');
            
            // 合并所有路径内容
            let allPaths = [];
            if (pathContent && pathContent !== '🈚️') {
                allPaths = allPaths.concat(pathContent.split('\n').filter(p => p.trim() !== ''));
            }
            if (incompletePathContent && incompletePathContent !== '🈚️') {
                allPaths = allPaths.concat(incompletePathContent.split('\n').filter(p => p.trim() !== ''));
            }
            if (staticContent && staticContent !== '🈚️') {
                allPaths = allPaths.concat(staticContent.split('\n').filter(p => p.trim() !== ''));
            }
            
            copyToClipboard(allPaths.join('\n'));
        });
    }
    
    // 复制域名+路径
    const copyDomainPathsBtn = document.getElementById('copyDomainPaths');
    if (copyDomainPathsBtn) {
        copyDomainPathsBtn.addEventListener('click', function() {
            getCurrentTab().then(function(tab) {
                if (tab && tab.url) {
                    const url = new URL(tab.url);
                    const origin = url.origin;
                    
                    // 获取原始数据文本（不包含来源信息）
                    const pathContent = getRawDataText('path');
                    let allPaths = [];
                    if (pathContent && pathContent !== '🈚️') {
                        allPaths = pathContent.split('\n').filter(p => p.trim() !== '');
                    }
                    
                    const domainPaths = allPaths.map(path => {
                        if (path.startsWith('http://') || path.startsWith('https://')) {
                            // 已经是完整URL
                            return path;
                        } else if (path.startsWith('//')) {
                            // 协议相对URL
                            return url.protocol + path;
                        } else if (path.startsWith('/')) {
                            // 绝对路径
                            return origin + path;
                        } else if (path.startsWith('./') || path.startsWith('../')) {
                            // [Forge] 相对路径归一化：同 copyUrl，按当前页面解析为绝对 URL
                            const resolved = resolveRelativePath(path, tab.url);
                            return resolved !== null ? resolved : origin + '/' + path;
                        } else {
                            // 其他情况，当作相对路径处理
                            return origin + '/' + path;
                        }
                    }).join('\n');
                    
                    copyToClipboard(domainPaths);
                }
            });
        });
    }
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 */
function copyToClipboard(text) {
    var inp = document.createElement('textarea');
    document.body.appendChild(inp);
    inp.value = text;
    inp.select();
    document.execCommand('copy', false);
    inp.remove();
    
    // 显示复制成功的提示（可选）
    showCopySuccessMessage();
}

/**
 * 显示复制成功的提示信息
 */
function showCopySuccessMessage() {
    // 创建提示元素
    const messageElement = document.createElement('div');
    messageElement.textContent = '复制成功!';
    messageElement.style.position = 'fixed';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = '#27ae60';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '4px';
    messageElement.style.zIndex = '10000';
    messageElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageElement.id = 'copy-success-message';
    
    // 添加到页面
    document.body.appendChild(messageElement);
    
    // 3秒后移除提示
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 1500);
}

/**
 * 为单条信息添加点击复制功能
 * @param {Element} container - 包含信息的容器元素
 */
function addSingleItemClickToCopy(container) {
    if (!container) return;
    
    // 为每个span元素添加点击事件（这些是单条信息）
    const spans = container.querySelectorAll('span');
    spans.forEach(span => {
        // 添加CSS样式表示可点击
        span.style.cursor = 'pointer';
        span.title = '点击复制';
        
        // 添加点击事件
        span.addEventListener('click', function() {
            const text = this.textContent.trim();
            if (text) {
                copyToClipboard(text);
            }
        });
    });
    
    // 为每个信息项添加点击事件（处理分组显示的情况）
    const dataListContainers = container.querySelectorAll('.data-list');
    dataListContainers.forEach(dataList => {
        const dataItems = dataList.querySelectorAll('span');
        dataItems.forEach(item => {
            // 添加CSS样式表示可点击
            item.style.cursor = 'pointer';
            item.title = '点击复制';
            
            // 添加点击事件
            item.addEventListener('click', function() {
                const text = this.textContent.trim();
                if (text) {
                    copyToClipboard(text);
                }
            });
        });
    });
}

/**
 * 获取当前活动标签页
 * @returns {Promise} 返回当前标签页信息
 */
async function getCurrentTab() {
    let queryOptions = { active: true, lastFocusedWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

/**
 * 显示提取结果信息
 * @param {Object} result_data - 提取结果数据
 */
function show_info(result_data) {
    // [Forge] 记录本次数据，供「导出 CSV」使用
    lastResultData = result_data;

    // 遍历所有数据类型并显示
    for (var k in key) {
        if (result_data[key[k]]) {
            let container = document.getElementById(key[k]);
            // 清空容器内容
            if (container) {
                while ((ele = container.firstChild)) {
                    ele.remove();
                }
                container.style.whiteSpace = "pre";
                
                // 创建隐藏的数据存储元素
                let hiddenData = document.createElement("div");
                hiddenData.id = "data-" + key[k];
                hiddenData.style.display = "none";
                
                // 构建原始数据文本
                let rawDataText = "";
                for (var i in result_data[key[k]]) {
                    rawDataText += result_data[key[k]][i] + '\n';
                }
                hiddenData.textContent = rawDataText;
                document.body.appendChild(hiddenData);
                
                // 按来源URL分组信息
                const groupedData = {};
                const noSourceData = [];
                
                // 先将数据按来源分组
                for (var i in result_data[key[k]]) {
                    const item = result_data[key[k]][i];
                    const source = result_data['source'][item];
                    
                    if (source) {
                        if (!groupedData[source]) {
                            groupedData[source] = [];
                        }
                        groupedData[source].push(item);
                    } else {
                        noSourceData.push(item);
                    }
                }
                
                // 显示没有来源的数据
                for (var i in noSourceData) {
                    let span = document.createElement("span");
                    span.textContent = noSourceData[i] + '\n';
                    container.appendChild(span);
                }
                
                // 显示按来源分组的数据
                for (const source in groupedData) {
                    if (groupedData.hasOwnProperty(source)) {
                        // 为每个来源创建一个容器
                        let sourceContainer = document.createElement("div");
                        sourceContainer.className = "source-container";
                        sourceContainer.style.marginBottom = "10px";
                        
                        // 创建来源信息行
                        let sourceInfo = document.createElement("div");
                        sourceInfo.className = "source-info";
                        sourceInfo.style.display = "flex";
                        sourceInfo.style.alignItems = "center";
                        sourceInfo.style.marginBottom = "4px";
                        
                        // 创建来源按钮（替换原来的"<"符号）
                        let sourceBtn = document.createElement("button");
                        sourceBtn.className = "source-btn";
                        sourceBtn.textContent = "🔗";
                        sourceBtn.title = source;
                        sourceBtn.style.background = "none";
                        sourceBtn.style.border = "1px solid #3498db";
                        sourceBtn.style.borderRadius = "3px";
                        sourceBtn.style.cursor = "pointer";
                        sourceBtn.style.marginRight = "8px";
                        sourceBtn.style.padding = "2px 6px";
                        sourceBtn.style.fontSize = "12px";
                        sourceBtn.onclick = function() {
                            window.open(source, '_blank');
                        };
                        
                        // 创建来源URL文本
                        let sourceUrl = document.createElement("span");
                        sourceUrl.className = "source-url";
                        sourceUrl.textContent = source;
                        sourceUrl.style.fontSize = "12px";
                        sourceUrl.style.color = "#7f8c8d";
                        sourceUrl.style.flex = "1";
                        sourceUrl.style.overflow = "hidden";
                        sourceUrl.style.textOverflow = "ellipsis";
                        sourceUrl.style.whiteSpace = "nowrap";
                        
                        sourceInfo.appendChild(sourceBtn);
                        sourceInfo.appendChild(sourceUrl);
                        sourceContainer.appendChild(sourceInfo);
                        
                        // 创建该来源下的所有数据
                        let dataList = document.createElement("div");
                        dataList.className = "data-list";
                        dataList.style.paddingLeft = "15px";
                        dataList.style.borderLeft = "2px solid #3498db";
                        
                        for (var i in groupedData[source]) {
                            let span = document.createElement("span");
                            span.textContent = groupedData[source][i] + '\n';
                            dataList.appendChild(span);
                        }
                        
                        sourceContainer.appendChild(dataList);
                        container.appendChild(sourceContainer);
                    }
                }
                
                // 为这个容器添加单条信息点击复制功能
                addSingleItemClickToCopy(container);
            }
        }
    }
    
    // 初始化批量复制功能
    init_batch_copy(result_data);
}

/**
 * 获取并显示信息
 */
getCurrentTab().then(function get_info(tab) {
    chrome.storage.local.get(["findsomething_result_" + tab.url], function (result_data) {
        if (!result_data) {
            return;
        }
        result_data = result_data["findsomething_result_" + tab.url];
        if (!result_data) {
            return;
        }
        show_info(result_data);
        
        // 更新任务状态显示
        const taskStatusElement = document.getElementById('taskstatus');
        if (taskStatusElement) {
            if (result_data.donetasklist) {
                if (result_data['done'] != 'done') {
                    taskStatusElement.textContent = chrome.i18n.getMessage("popupProcessing") + result_data['donetasklist'].length + "/" + result_data['tasklist'].length;
                } else {
                    taskStatusElement.textContent = chrome.i18n.getMessage("popupComplete") + result_data['donetasklist'].length + "/" + result_data['tasklist'].length;
                }
            } else {
                taskStatusElement.textContent = chrome.i18n.getMessage("popupProcessing");
            }
        }
        return;
    });
});

/**
 * 监听存储变化并更新显示
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    getCurrentTab().then(function get_info(tab) {
        for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
            if (key == "findsomething_result_" + tab.url) {
                const result_data = newValue;
                show_info(result_data);
                
                // 更新任务状态显示
                const taskStatusElement = document.getElementById('taskstatus');
                if (taskStatusElement) {
                    if (result_data.donetasklist) {
                        if (result_data['done'] != 'done') {
                            taskStatusElement.textContent = chrome.i18n.getMessage("popupProcessing") + result_data['donetasklist'].length + "/" + result_data['tasklist'].length;
                        } else {
                            taskStatusElement.textContent = chrome.i18n.getMessage("popupComplete") + result_data['donetasklist'].length + "/" + result_data['tasklist'].length;
                        }
                    } else {
                        taskStatusElement.textContent = chrome.i18n.getMessage("popupProcessing");
                    }
                }
            }
        }
    });
});

// ============================================================
// [Forge] 以下为本分支新增：相对路径归一化 + 导出 CSV
// ============================================================

/**
 * 相对路径（./、../）归一化：按当前页面解析为绝对 URL（RFC 3986 相对引用解析）
 * @param {string} line - 原始路径，如 "../../apply/myDesktop/index.html"
 * @param {string} tabUrl - 当前页面的完整 URL
 * @returns {string|null} 绝对 URL；解析失败返回 null（调用方自行兜底）
 */
function resolveRelativePath(line, tabUrl) {
    try {
        return new URL(line, tabUrl).href;
    } catch (e) {
        return null;
    }
}

/**
 * 触发浏览器下载
 */
function download_text(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        URL.revokeObjectURL(objUrl);
        if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
}

/**
 * CSV 字段转义
 */
function csv_escape(value) {
    return '"' + String(value).replace(/"/g, '""') + '"';
}

/**
 * 导出全部类目为 CSV：类别,值,来源
 */
async function export_data() {
    const emptyTip = chrome.i18n.getMessage("popupExportEmpty") || "暂无可导出的数据";

    if (!lastResultData) {
        alert(emptyTip);
        return;
    }

    const rows = ['"category","value","source"'];
    for (const k of key) {
        const values = lastResultData[k];
        if (!values || !values.length) continue;
        for (const item of values) {
            const source = (lastResultData.source && lastResultData.source[item]) || "";
            rows.push([csv_escape(k), csv_escape(item), csv_escape(source)].join(","));
        }
    }
    if (rows.length === 1) {
        alert(emptyTip);
        return;
    }

    let host = "unknown";
    try {
        const tab = await getCurrentTab();
        if (tab && tab.url) host = new URL(tab.url).host;
    } catch (e) {
        // 拿不到当前标签页时用 unknown
    }

    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss
    const csv = "\uFEFF" + rows.join("\r\n"); // BOM 便于 Excel 识别 UTF-8
    download_text(csv, "reconforge_" + host + "_" + ts + ".csv", "text/csv;charset=utf-8");
}

/**
 * 绑定「导出 CSV」按钮
 */
function init_export_button() {
    const btn = document.getElementById("exportData");
    if (!btn) return;
    const label = chrome.i18n.getMessage("popupExport");
    if (label) btn.textContent = label;
    btn.addEventListener("click", function () {
        export_data();
    });
}

// 初始化界面
init_locales();
init_copy();
init_tabs();
init_export_button();