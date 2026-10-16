# ShiroForge

> 用已知 / 硬编码的 Shiro `rememberMe` 密钥，伪造一枚「身份 cookie」，**绕过认证进后台**。
>
> **仅限授权测试**（自己的系统 / 已获书面授权的目标）。

**一句话定位**：现有工具（`ShiroAttack2` / `ShiroExploit` / `nuclei` 模板）覆盖的是**密钥爆破**与 **RCE**；
本工具专做它们没覆盖的那一环 —— **伪造身份**。当「密钥有效、但 RCE 打不通」时，用它拿到后台身份。

---

## 原理

```
rememberMe = base64( 随机IV(16字节) ‖ AES-128-CBC( Java序列化对象, PKCS7 ) )
```

服务端收到后：`Base64 解码 → 取前 16 字节当 IV → AES 解密 → Java 反序列化`，得到一个"身份"。
**密钥与身份对象都由攻击者控制**，因此可以伪造任意身份。

- **密钥**决定「能不能过闸机」；**身份类**决定「过闸机后前台认不认你」。
  密钥错 → 响应出现 `Set-Cookie: rememberMe=deleteMe`；身份类错 → 同样 `deleteMe`。
- **身份类必须逐站匹配**：同一产品的不同分支（如 WebStack-Guns 的
  `com.jsnjfz.manage…` 与 `com.nikati.manage…`）类名都不同 → 用 `--class auto` 自动试。
- **IV 随机** → 每次生成的 cookie 都不同，属正常；cookie **无过期、可复用**（目标轮换密钥才失效）。

---

## 安装

- **JDK 8+**（生成载荷需要 `javac` / `java`）
- **Python 3.8+** 与 [uv](https://github.com/astral-sh/uv)（依赖由 uv 管理，见 `requirements.txt`）

```bash
uv run --with-requirements requirements.txt python shiroforge.py build
```

首次构建会自动下载 `shiro-core`（Apache-2.0）。

**包装脚本**（内部同样走 uv，免写前缀）：

```powershell
.\shiroforge.cmd stubs          # Windows（PowerShell / cmd）
```
```bash
./shiroforge.sh stubs           # Git Bash / Linux / macOS
```

---

## 快速开始

```bash
# 1) 构建（一次）
uv run --with-requirements requirements.txt python shiroforge.py build

# 2) 看有哪些身份类可用（★ 不要照抄文档里的示例名）
uv run --with-requirements requirements.txt python shiroforge.py stubs

# 3) 不知道目标用哪个身份类 → 让它自己试，命中即停
uv run --with-requirements requirements.txt python shiroforge.py probe \
    --url http://TARGET:8080/admin --class auto --key <目标的base64密钥>
```

只有 `--class` 是必填的：`--id` / `--account` / `-o` 默认 `1` / `admin` / `cookie.txt`。

---

## 命令

| 命令 | 作用 |
|---|---|
| `build` | 编译 Java 载荷生成器（含身份类存根） |
| `stubs` | 列出当前可用的身份类存根（`--class` 只能填这些） |
| `make` | 生成载荷并加密成 cookie（`--check` 立即自检，`--json` 便于写报告） |
| `check` | 自检一枚 cookie：解密、校验结构、**列出内嵌类名** |
| `probe` | 端到端验证：与「无 cookie 基线」对比并给出结论 |

| 关键参数 | 说明 |
|---|---|
| `--class <FQCN>` | 目标身份类全限定名；`probe` 时可用 **`auto`**（逐个试存根） |
| `--string` | 通行对照：principal 为字符串（只证明密钥正确/穿过过滤器，进不了后台） |
| `--placeholder` | 否定对照：目标必然没有的类（预期出现 `deleteMe`，用于验证判据可靠） |
| `--key <base64>` | 目标 AES 密钥（16 字节）。默认值是**公开字典**里的 Guns 系默认键，**换目标必须改** |

---

## 判据

| 现象 | 判定 | 含义 / 下一步 |
|---|---|---|
| 基线 302/401 → 带 cookie **200** | ✅ **BYPASS** | 认证绕过成立 |
| 响应含 **`rememberMe=deleteMe`** | ❌ **REJECTED** | 服务端拒收：**密钥不对**或**身份类/字段不匹配** |
| 带 cookie **500** | ⚠️ **PARTIAL** | 过滤器已穿过，页面需要**目标自己的身份类** |
| 基线 302/401 → 带 cookie **405 等非 200**（无 deleteMe） | ⚠️ **FILTER_PASSED** | **过滤器已被绕过**，只是该路径没渲染页面（常见：只接受 POST） |
| 基线 200 → 带 cookie 200 | ➖ **NO_AUTH_REQUIRED** | 页面本来无需认证 → 换受保护页面 |
| 基线 302 → 带 cookie 302（无 deleteMe） | ⚠️ **NO_EFFECT** | 未见绕过；可能该应用要求真实认证（已加固） |

**退出码**：`0` 至少一个 BYPASS；`3` 未观测到绕过；`4` 环境/构建问题。

> 别用 `/login` 验证 —— 它要的是**密码**，会返回 401，属正常。请用**受保护的后台页面**。

---

## 换目标怎么适配

本工具内置两个 WebStack-Guns 分支的身份类存根作示例，换系统需要两步：

**第 1 步：拿到目标的身份类（FQCN）**

| 方法 | 做法 |
|---|---|
| **报错泄露**（最好用） | 用 `--string` 打受保护页面，类型转换报错会把类名吐出来：<br>`class java.lang.String cannot be cast to class com.xxx.core.shiro.ShiroUser` |
| 开源仓库 / 反编译 | 开源产品直接读它的 `ShiroUser`；闭源则反编译部署 jar |
| **盲测** | 不同分支包名不同，用 `--class auto` 各试一次 |

**第 2 步：在本地建同名"存根类"**，三条必须都对：**包名+类名**、**serialVersionUID**、**字段名与类型**
（字段名不同就改 `java/GenShiroSPC.java` 里的 `set(...)` 那几行），然后 `build` 重建。
存根只用于让序列化流里出现正确的类描述符，不参与任何业务逻辑。

---

## 常见问题

| 现象 | 原因 / 解决 |
|---|---|
| `ClassNotFoundException: com.example...` | 照抄了文档里的**示例占位名**。跑 `stubs` 看可用清单（报错时也会列出） |
| `No module named 'Crypto'` | 没走 uv。用 `uv run --with-requirements requirements.txt python …` 或包装脚本 |
| 错误: 找不到或无法加载主类 `GenShiroSPC` | 还没 `build`，或不在项目根目录执行 |
| 每次 cookie 都不同 | **IV 随机**，正常；长度一致即可 |
| `deleteMe` 一直出现 | 密钥不对，或身份类/字段与目标不匹配 |
| 基线就是 **HTTP 400** | 端口协议不对（多半只跑 https）→ 换 `https://` |
| `skip field xxx` | 本地存根缺该字段 → 身份类与目标不一致，去改存根 |
| cookie 用一会儿失效 | 目标**轮换了密钥**或已加固。交付时给「生成方法」而不只是一枚 cookie |

---

## 局限

- 只实现 **AES-CBC**；**不支持** Shiro ≥ 1.4.2 的 AES-GCM 模式。
- **不做**密钥爆破、**不做** RCE / 内存马（有意为之，保持工具只读、可解释、可复核）。
- 全程只发 **GET** 只读请求：不写文件、不建会话、不传数据。

---

## 项目结构

```
ShiroForge/
├── shiroforge.py                  # CLI：build / stubs / make / check / probe
├── shiroforge.sh / shiroforge.cmd # 包装脚本（内部走 uv）
├── build.sh / build.ps1           # 编译 Java 载荷生成器
├── requirements.txt               # Python 依赖（uv 读取）
├── lib/shiro-core-1.7.1.jar       # 生成端依赖（Apache-2.0）
├── java/
│   ├── GenShiroSPC.java           # 身份类载荷生成器（核心）
│   ├── GenSPCmin.java             # 通用/对照载荷生成器
│   └── stubs/                     # 身份类存根示例（换成你的目标）
└── docs/
    ├── TESTING.md                 # 测试记录（含联网正/负例）
    └── RESUME.md                  # 简历/面试描述参考
```

---

## 验证状态

已在 Windows + Git Bash / PowerShell 实测：clean-room 全流程构建、**载荷字节一致性回归**
（sha256 与人工验证过的 PoC 完全一致）、**联网正例 BYPASS**（302 → 200）与**负例 REJECTED**
（错误密钥 → `deleteMe`）、`--class auto` 自动命中身份类。详见 `docs/TESTING.md`。

---

## 合规声明

仅限用于你**自己拥有**或**已获书面授权**的系统。未经授权对第三方系统使用属违法行为。
请遵守最小影响原则（本工具设计为只发 GET），并在厂商修复前**不要公开**可武器化的目标细节。

## 许可

MIT（见 `LICENSE`）。依赖 [Apache Shiro](https://shiro.apache.org/)（Apache-2.0）。