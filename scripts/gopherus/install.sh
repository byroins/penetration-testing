#!/bin/bash
echo "正在安装依赖..."
python -m pip install argparse
python -m pip install requests
echo "正在设置权限..."
chmod +x gopherus.py
echo "正在创建软链接..."
ln -sf $(pwd)/gopherus.py /usr/local/bin/gopherus
echo "安装完成！"