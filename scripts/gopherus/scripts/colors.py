"""统一的颜色管理模块"""

# 重置
RESET = "\033[0m"

# 标准颜色
BLACK = "\033[30m"
RED = "\033[31m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
CYAN = "\033[36m"
WHITE = "\033[37m"

# 加粗/高亮
BOLD = "\033[1m"
DIM = "\033[2m"
ITALIC = "\033[3m"
UNDERLINE = "\033[4m"
BLINK = "\033[5m"
REVERSE = "\033[7m"
HIDDEN = "\033[8m"

# 背景色
BG_BLACK = "\033[40m"
BG_RED = "\033[41m"
BG_GREEN = "\033[42m"
BG_YELLOW = "\033[43m"
BG_BLUE = "\033[44m"
BG_MAGENTA = "\033[45m"
BG_CYAN = "\033[46m"
BG_WHITE = "\033[47m"

# 亮色
BRIGHT_BLACK = "\033[90m"
BRIGHT_RED = "\033[91m"
BRIGHT_GREEN = "\033[92m"
BRIGHT_YELLOW = "\033[93m"
BRIGHT_BLUE = "\033[94m"
BRIGHT_MAGENTA = "\033[95m"
BRIGHT_CYAN = "\033[96m"
BRIGHT_WHITE = "\033[97m"


def c(text, *colors):
    """
    给文本添加颜色/样式

    用法:
        c("文本", CYAN)           # 青色文本
        c("文本", YELLOW, BG_RED) # 黄色文字，红色背景
        c("文本", BOLD, GREEN)    # 加粗绿色文本
    """
    return "".join(colors) + str(text) + RESET


def print_c(text, *colors):
    """打印带颜色的文本"""
    print(c(text, *colors))


# UI 辅助函数
def print_banner(title, width=50):
    """打印带边框的标题"""
    print("\n" + c("=" * width, BRIGHT_CYAN))
    print(c(f"  {title}", BOLD + BRIGHT_CYAN))
    print(c("=" * width, BRIGHT_CYAN))


def print_step(step_num, description):
    """打印步骤提示"""
    print(c(f"\n  [步骤 {step_num}] ", BOLD + YELLOW) + c(description, CYAN))
    print(c("  " + "-" * 40, DIM))


def print_info(text):
    """打印信息提示"""
    print(c(f"  [i] {text}", BRIGHT_CYAN))


def print_success(text):
    """打印成功信息"""
    print(c(f"  [ok] {text}", BRIGHT_GREEN))


def print_warning(text):
    """打印警告信息"""
    print(c(f"  [!] {text}", BRIGHT_YELLOW))


def print_error(text):
    """打印错误信息"""
    print(c(f"  [x] {text}", BRIGHT_RED))


# 预定义的常用样式
class Style:
    """常用样式组合"""

    # 输入提示
    INPUT = CYAN

    # 警告/注意
    WARNING = YELLOW
    ERROR = RED
    SUCCESS = GREEN

    # 标题
    TITLE = BOLD
    SUBTITLE = BOLD + CYAN

    # 结果输出
    RESULT = YELLOW
    RESULT_URL = UNDERLINE + YELLOW

    # 签名/底部信息
    SIGNATURE = BG_RED

    # 强调
    EMPHASIS = BOLD + RED
