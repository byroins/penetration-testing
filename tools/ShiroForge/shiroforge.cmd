@echo off
REM ============================================================
REM  ShiroForge wrapper (Windows cmd) - saves typing "uv run --with ..."
REM
REM  IMPORTANT: keep this file ASCII-only.
REM  Chinese characters in a .cmd file break cmd.exe when the console
REM  codepage is not UTF-8 (bytes get mis-decoded and stop parsing).
REM
REM  Usage (from the project directory):
REM      shiroforge.cmd stubs
REM      shiroforge.cmd make --class com.jsnjfz.manage.core.shiro.ShiroUser --key <KEY>
REM      shiroforge.cmd probe --url http://TARGET/admin -c cookie.txt
REM
REM  In PowerShell, prefix with .\   =>   .\shiroforge.cmd stubs
REM ============================================================
setlocal
set "DIR=%~dp0"
where uv >nul 2>&1
if %ERRORLEVEL%==0 (
    uv run --with-requirements "%DIR%requirements.txt" python "%DIR%shiroforge.py" %*
) else (
    REM fallback to local python (dependencies must be installed)
    python "%DIR%shiroforge.py" %*
)
endlocal