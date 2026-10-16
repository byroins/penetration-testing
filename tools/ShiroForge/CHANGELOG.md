# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## v1.0.4 — 2026-10-15

发布前收尾：**文档精简** + **依赖统一由 uv 管理**。

### Changed

- **README 重写为精简版**：只留重点（定位 / 原理 / 安装 / 快速开始 / 命令 / 判据 / 适配 / FAQ / 局限 / 合规），
  删去冗长的开发叙事
- **Python 运行方式只保留 uv**：所有示例统一为
  `uv run --with-requirements requirements.txt python …`，不再出现 pip 相关表述；
  包装脚本也改为读取 `requirements.txt`（依赖版本集中一处）
- 工具内的依赖缺失提示同步改为 uv 版本

### Added

- `docs/RESUME.md` —— 简历 / 面试描述参考（一行版 / 项目卡片版 / 面试自述版 / 英文版 / 诚实边界）

## v1.0.3 — 2026-10-15

修正判据：**"过滤器已绕过但页面没渲染"不能再被判成"无效"**（真实目标反馈驱动）。

### Added

- 新增判据 **`FILTER_PASSED`**：基线 `302/401/403` → 带 cookie **非 200**（如 `405`）且**无 deleteMe**
  ⇒ Shiro 过滤器**已被绕过**，但该路径未渲染页面（常见：只接受 POST）。
  以前这类情形被误判为 `NO_EFFECT`（"未见绕过效果"），会掩盖真实证据。

### 背景

实测某 JSP 平台（`/admin/**` 只接受 POST）：有效密钥的伪造 cookie 使
`/admin/main` 从 `302 → /login.jsp` 变为 `405`，且 `deleteMe` 消失；
换成错误密钥或垃圾值则立刻回到 `302 + deleteMe`。**这个差值就是绕过证据**，
但旧判据把它标成了"无效"。现在会被正确识别并解释原因。

### 判据顺序调整

`200` 判定提前（最明确的成功），`500 → PARTIAL` 保留，其余"状态码变化且无 deleteMe"归入
`FILTER_PASSED`。

## v1.0.2 — 2026-10-15

解决"**同一把密钥，A 站能进、B 站进不去**"的困惑（真实使用反馈）。

### Added

- **`probe --class auto`** —— 依次尝试 `java/stubs` 下所有身份类存根，命中即停，
  并明确告诉你**命中的是哪一个**。不用再靠记忆或试错（实测：`jsnjfz` / `nikati` 两分支场景下自动命中）
- `probe` 基线返回 **HTTP 400 且 URL 是 `http://`** 时，提示"该端口可能只接受 https"

### Changed

- `make --class auto` 会给出明确提示（`make` 需要具体类名），引导改用 `probe --class auto`
- `--help` 中 `--class` 的说明补充了 `auto`

### 背景（为什么需要它）

`--id` / `--account` 从来不是失败原因 —— 参数一直是那几个。
失败原因是**身份类必须逐站匹配**：同一产品的不同分支（如 WebStack-Guns 的
`com.jsnjfz.manage…` 与 `com.nikati.manage…`）类名不同，用错就得到 `rememberMe=deleteMe`。
另外部分端口只跑 https，用 `http://` 会直接 400。

## v1.0.1 — 2026-10-15

修复首次使用时最容易踩的几个坑（全部由真实使用反馈驱动）。

### Added

- **`stubs` 子命令** —— 列出当前可用的身份类存根，`--class` 填什么不再靠猜
- **`shiroforge.sh` / `shiroforge.cmd` 包装脚本** —— 免写 `uv run --with ...` 前缀
- `--class` 报 `ClassNotFoundException` 时，错误提示**直接列出可用的类名**

### Fixed

- **文档坑（本次反馈的主因）**：README 教程里用了 `com.example.app.core.shiro.ShiroUser`
  这种"看起来很真"的示例占位名，用户照抄 → `ClassNotFoundException`。
  已改为真实存在的类名，并加显著警告 + `stubs` 引导
- **`shiroforge.sh` 在 Git Bash 下路径错误**：`pwd` 返回 `/d/...`，而 python / uv 是原生
  Windows 程序、MSYS 不做路径转换 → 实际去找 `D:\d\...`。改用 `cygpath -w` 转换
- **`shiroforge.cmd` 内含中文导致 cmd.exe 解析失败**：控制台码页非 UTF-8 时字节被误解码，
  出现 `'EM' 不是内部或外部命令` → 改为**纯 ASCII** 并以 CRLF 保存；`.gitattributes` 增加 `*.cmd`

## v1.0.0 — 2026-10-15

首个版本。把一次真实授权测试中"Shiro 硬编码密钥 → 伪造身份 cookie → 登录绕过"的
完整链路，提炼为可复用工具。

### Added

- **`shiroforge.py` CLI**，四个子命令：
  - `build` — 编译 Java 载荷生成器（首次自动下载 `shiro-core`）
  - `make` — 生成载荷并加密成 cookie（支持 `--check` 自检、`--json`）
  - `check` — 解密自检：结构校验 + **类名精确提取**
  - `probe` — 端到端验证：与"无 cookie 基线"自动对比，输出 5 类判据
- **`GenShiroSPC`** — 用目标自己的身份类构造 `SimplePrincipalCollection` 载荷
- **`GenSPCmin`** — 通用/对照载荷（`--string` 通行对照、`--placeholder` 否定对照、base64(FQCN) 探测）
- **身份类存根示例** — WebStack-Guns 的 `jsnjfz` / `nikati` 两个分支
- **跨平台构建** — `build.sh`（Git Bash/Linux/macOS）与 `build.ps1`（PowerShell）
- **文档** — README（开发思路/技术栈/教程/适配/FAQ）、`docs/TESTING.md`

### Fixed（开发期修掉的问题）

- `probe` 的生成参数互斥组曾误设为必填，导致"只给 `-c` cookie"时报错 → 改为可选
- Base64 补位在"已带 `=`"的输入上会重复填充导致解码失败 → 改为先剥离再补齐
- `urllib3` 警告屏蔽方式在不同版本下不兼容 → 改为容错导入
- URL 缺少 scheme（如 `1.2.3.4:8000`）→ 自动补 `http://`
- `check` 的类名提取原用宽松正则，会带出 `ArrayListx` 之类噪声 → 改为按
  `TC_CLASSDESC(0x72) + 2字节长度` 精确解析
- `make` 遇到不可序列化的类时直接把 Java 栈打印出来 → 增加针对性提示
  （`NotSerializableException` / `ClassNotFoundException` / `NoSuchMethodException`）

### Verified

- 载荷字节一致性回归：与人工验证过的 PoC **sha256 完全一致**
- 联网端到端：**正例 BYPASS**（基线 302 → 带 cookie 200）、**负例 REJECTED**（`rememberMe=deleteMe`）
- 全部测试记录见 `docs/TESTING.md`