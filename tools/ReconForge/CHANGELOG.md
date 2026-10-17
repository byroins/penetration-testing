# 变更日志

本文件只记录 **本分支（ReconForge）相对上游的改动**。
上游 v2.0.0 → v2.1.1 的完整变更史请见上游仓库（`momosecurity/FindSomething`）的 `CHANGELOG.md`。

---

## [2.1.1.1] - 2026-10-17

基于上游 **v2.1.1** 的二次开发分支首版。**提取引擎未做任何修改。**

### 修复

- **请求去重未生效** — `src/js/content.js`
  原实现把去重结果写入 `tmp_target_list`，但随后 `tmp_target_list.pop(href)` 中的
  `Array.prototype.pop()` **不接受参数**，属空操作；且发送给 background 的是**未去重**的 `target_list`。
  现改为 `[...new Set(target_list)]` 去重后再发送。
  > 注：「跳过当前页」原本由 background 的 `req_url == request.current` 处理，抓取语义未变。

- **相对路径输出的 URL 错误** — `src/js/popup.js`（**两处**）
  `./`、`../` 开头的路径原先被拼成 `origin + '/' + 路径`。当路径以 `../` 开头时，
  `..` 越过根目录会被 URL 标准塌缩，导致**丢失目录前缀、指向错误地址**。
  新增 `resolveRelativePath(line, tabUrl)`，按当前页面用 `new URL(line, tabUrl)`
  归一化为绝对 URL（符合 RFC 3986 相对引用解析）。
  修正了**两处**做同样拼接的地方：「复制URL」（`copyUrl`）与「复制域名+路径」（`copyDomainPaths` 处理器），
  原先那两处的 `./` 专用分支（手工 `pathname.substring(0, pathname.lastIndexOf('/'))` 拼接）一并移除。
  > 仅影响 `./`、`../` 开头的条目；`http(s)://`、`//`、`/` 开头以及裸路径的输出**保持原样**。

### 新增

- **导出 CSV** — `src/html/popup.html` + `src/js/popup.js`
  在「路径信息」标签页的按钮区新增「导出 CSV」：导出 `类别, 值, 来源` 三列，
  带 UTF-8 BOM，Excel 可直接打开；无数据时给出提示。
- **i18n** — 新增 `popupExport`、`popupExportEmpty` 两个 key（`zh_CN` / `en` / `ar`）。

### 变更

- `manifest.json` 版本号 `2.1.1` → **`2.1.1.1`**（表示基于上游 2.1.1 的第 1 个修订）

### 有意未做

- **抓取并发未改**：保持上游 `Promise.all` 的行为
- **提取规则未改**：12 类正则与 728 条 nuclei 正则原样保留
- **安全模式 / webhook / 域名白名单 / 全局悬浮窗 / 设置页结构**：均未改动