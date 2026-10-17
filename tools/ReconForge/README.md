# ReconForge

> **FindSomething 的二次开发分支** ——**不改动其提取引擎**，只修复采集链路中的 3 个实际问题，并补上结果导出。

- **上游项目**：[momosecurity/FindSomething](https://github.com/momosecurity/FindSomething)（GPL-3.0）
- **基线版本**：上游 **v2.1.1**（本分支的起点）
- **本分支定位**：做「采集之后」的事 —— 让收集到的数据**请求不重复、地址可用、结果可导出**

---

## 本分支 vs 上游 v2.1.1

| # | 问题（上游 v2.1.1） | 本分支的改动 | 影响 |
|---|---|---|---|
| 1 | **请求去重未生效**：去重结果写进了 `tmp_target_list`，但 `Array.prototype.pop()` 不接受参数（等于空操作），且实际发送给 background 的是**未去重**的 `target_list` | 改为 `[...new Set(target_list)]` 去重后再发送（`src/js/content.js`） | 不再对同一 URL 重复发请求；进度计数（图标 badge）更准确 |
| 2 | **相对路径输出的 URL 是错的**：`../` 开头的路径被拼成 `origin + '/' + 路径`，而 `..` 越过根目录会被 URL 标准塌缩 → **丢失目录前缀、指向错误地址** | 新增 `resolveRelativePath()`，`./`、`../` 开头的路径按当前页面归一化为**绝对 URL**（RFC 3986 相对引用解析）；**「复制URL」与「复制域名+路径」两处路径映射都已修正**（`src/js/popup.js`） | 复制出来的 URL 可直接访问、可直接丢给其他工具 |
| 3 | **结果只能复制到剪贴板**，无法导出 | 新增 **「导出 CSV」** 按钮：`类别, 值, 来源` 三列，带 UTF-8 BOM，Excel 可直接打开（`src/html/popup.html` + `src/js/popup.js`） | 不用再手工复制粘贴 |

> 其余部分 —— **12 类提取规则、728 条 nuclei 敏感信息正则、抓取并发、安全模式、webhook、域名白名单、全局悬浮窗** —— **全部保持上游原样**。

### 改动位置一览

```
src/js/content.js         去重修复（1 处）
src/js/popup.js           相对路径归一化（2 处）+ 导出功能（3 处）
src/html/popup.html       导出按钮（1 处）
_locales/{zh_CN,en,ar}    新增 popupExport / popupExportEmpty
manifest.json             version: 2.1.1 → 2.1.1.1
tests/test_forge.js       自测（33 项断言，node tests/test_forge.js）
```

---

## 安装

**Chrome / Edge**

1. 打开 `chrome://extensions/`
2. 打开右上角「开发者模式」
3. 点「加载已解压的扩展程序」，选择本目录

> 本分支基于 **Chrome 版（Manifest V3）** 修改；Firefox 请用上游的 `firefox` 分支。

## 使用

与上游一致：打开目标页面 → 点插件图标 → 切到「路径信息」标签页：

- **复制 / 复制URL**：复制当前区块。两者都会把 `./`、`../` 相对路径**归一化为绝对地址**
- **复制所有路径 / 复制域名+路径**：批量复制（后者同样会对 `./`、`../` 做归一化）
- **导出 CSV（新增）**：把全部类目导出为 CSV（类别 / 值 / 来源）

---

## 与上游的关系 / 版权声明

- 本分支基于上游 **v2.1.1** 修改，**保留原作者署名与 GPL-3.0 许可**（见 `LICENSE`）。
- 上游代码版权归原作者 `residuallaugh` 与陌陌安全所有；**本分支改动见 `CHANGELOG.md`**。
- 需要上游最新版本，请访问上游仓库。
- **内部标识保留上游命名**：浏览器存储键（`findsomething_result_*`）、悬浮窗 DOM id（`findsomething_*`）等**不对外展示**，
  改动会导致存取不一致，故保持原样（**代码内的 `@Author` 署名同样保留**，这是 GPL 的要求）。

## 用途与免责

仅用于**已获授权**的安全测试与自查。本工具为被动提取（解析当前浏览页面及其引用的资源）；
但**关闭「安全模式」后会对页面引用的非 JS 资源发起请求**，请自行确认在授权范围内使用。使用者自行承担全部责任。