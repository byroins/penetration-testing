# ============================================================
# ShiroForge 构建脚本（Windows PowerShell）
#   powershell -ExecutionPolicy Bypass -File build.ps1
# ============================================================
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

$LIB = "lib"
$JAR = Join-Path $LIB "shiro-core-1.7.1.jar"
$OUT = "build\classes"
New-Item -ItemType Directory -Force -Path $LIB | Out-Null
New-Item -ItemType Directory -Force -Path $OUT | Out-Null

if (-not (Test-Path $JAR)) {
    Write-Host "[*] 下载 shiro-core-1.7.1.jar (Apache-2.0) ..."
    Invoke-WebRequest -Uri "https://maven.aliyun.com/repository/public/org/apache/shiro/shiro-core/1.7.1/shiro-core-1.7.1.jar" -OutFile $JAR
}

Write-Host "[*] 编译 ..."
$srcs = Get-ChildItem -Recurse -Filter *.java -Path java | ForEach-Object { $_.FullName }
javac -nowarn -encoding UTF-8 -cp $JAR -d $OUT @srcs
if ($LASTEXITCODE -ne 0) { Write-Host "编译失败"; exit 1 }

Write-Host "[+] 构建完成 -> $OUT"
Write-Host "    下一步：python shiroforge.py make --class com.jsnjfz.manage.core.shiro.ShiroUser --id 1 --account admin"