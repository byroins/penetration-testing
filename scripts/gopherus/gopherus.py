#!/usr/bin/env python
import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))
from scripts.colors import c, GREEN, BLUE, YELLOW, RESET
from scripts.FastCGI import FastCGI
from scripts.MySQL import MySQL
from scripts.PostgreSQL import PostgreSQL
from scripts.DumpMemcached import DumpMemcached
from scripts.PHPMemcached import PHPMemcached
from scripts.PyMemcached import PyMemcached
from scripts.RbMemcached import RbMemcached
from scripts.Redis import Redis
from scripts.SMTP import SMTP
from scripts.Zabbix import Zabbix

parser = argparse.ArgumentParser()
parser.add_argument(
    "--exploit", "-e",
    help="支持的利用类型: mysql, postgresql, fastcgi, redis, smtp, zabbix, "
    "dmpmemcache, phpmemcache, rbmemcache, pymemcache ",
)
args = parser.parse_args()

logo = r"""

  ________              .__
 /  _____/  ____ ______ |  |__   ___________ __ __  ______
/   \  ___ /  _ \\____ \|  |  \_/ __ \_  __ \  |  \/  ___/
\    \_\  (  <_> )  |_> >   Y  \  ___/|  | \/  |  /\___ \\
 \______  /\____/|   __/|___|  /\___  >__|  |____//____  >
        \/       |__|        \/     \/                 \/
"""

print(
    c(logo, GREEN)
    + "\n\t\t"
    + c("原作者: ", BLUE)
    + c("$_SpyD3r_$", YELLOW)
    + "\n\t\t"
    + c("修改者: ", BLUE)
    + c("@_mingy_@", YELLOW)
    + RESET
)

if not args.exploit:
    print(parser.print_help())
    exit()

if args.exploit == "mysql":
    MySQL()
elif args.exploit == "postgresql":
    PostgreSQL()
elif args.exploit == "fastcgi":
    FastCGI()
elif args.exploit == "redis":
    Redis()
elif args.exploit == "smtp":
    SMTP()
elif args.exploit == "zabbix":
    Zabbix()
elif args.exploit == "dmpmemcache":
    DumpMemcached()
elif args.exploit == "phpmemcache":
    PHPMemcached()
elif args.exploit == "rbmemcache":
    RbMemcached()
elif args.exploit == "pymemcache":
    PyMemcached()
else:
    print(parser.print_help())
