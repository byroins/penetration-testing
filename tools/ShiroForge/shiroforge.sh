#!/usr/bin/env bash
# ============================================================
#  ShiroForge 包装器（Git Bash / Linux / macOS）—— 免写 uv run 前缀
#
#  用法（在项目目录下）：
#      ./shiroforge.sh stubs
#      ./shiroforge.sh make --class com.jsnjfz.manage.core.shiro.ShiroUser --key <KEY>
#      ./shiroforge.sh probe --url http://TARGET/admin -c cookie.txt
# ============================================================
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PY="$DIR/shiroforge.py"
REQ="$DIR/requirements.txt"

# 关键：Git Bash(MSYS) 下 uv/python 是原生 Windows 程序，不做路径转换，
# 必须把 /d/xxx 形态转成 D:\xxx，否则会去找 D:\d\xxx 而报"找不到文件"。
if command -v cygpath >/dev/null 2>&1; then
    PY="$(cygpath -w "$PY")"
    REQ="$(cygpath -w "$REQ")"
fi

if command -v uv >/dev/null 2>&1; then
    exec uv run --with-requirements "$REQ" python "$PY" "$@"
fi
# 没有 uv 时回落到本机 python（依赖需自行安装）
exec python "$PY" "$@"