#!/usr/bin/env bash
# ============================================================
# ShiroForge 构建脚本（Git Bash / Linux / macOS）
#   编译 GenShiroSPC + GenSPCmin + 身份类存根 -> build/classes
#   首次运行会自动下载 shiro-core（若 lib/ 下没有）
# ============================================================
set -eu
cd "$(dirname "$0")"

LIB=lib
JAR="$LIB/shiro-core-1.7.1.jar"
OUT=build/classes
mkdir -p "$LIB" "$OUT"

if [ ! -f "$JAR" ] || [ "$(head -c2 "$JAR" 2>/dev/null || true)" != "PK" ]; then
  echo "[*] 下载 shiro-core-1.7.1.jar (Apache-2.0) ..."
  curl -fsSL -o "$JAR" \
    https://maven.aliyun.com/repository/public/org/apache/shiro/shiro-core/1.7.1/shiro-core-1.7.1.jar \
  || curl -fsSL -o "$JAR" \
    https://repo1.maven.org/maven2/org/apache/shiro/shiro-core/1.7.1/shiro-core-1.7.1.jar
fi

echo "[*] 编译 ..."
javac -nowarn -encoding UTF-8 -cp "$JAR" -d "$OUT" \
  $(find java -name '*.java')

echo "[+] 构建完成 -> $OUT"
echo "    下一步：python shiroforge.py make --class com.jsnjfz.manage.core.shiro.ShiroUser --id 1 --account admin"