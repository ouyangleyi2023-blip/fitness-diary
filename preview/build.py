#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 src/shell.html + src/app.js 合成单文件 preview/index.html。
用法：python3 build.py
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(HERE, 'src', 'shell.html')
APP = os.path.join(HERE, 'src', 'app.js')
OUT = os.path.join(HERE, 'index.html')


def main():
    with open(SHELL, encoding='utf-8') as f:
        shell = f.read()
    with open(APP, encoding='utf-8') as f:
        app = f.read()

    if '/* APP_JS */' not in shell:
        raise SystemExit('shell.html 缺少 /* APP_JS */ 占位符')

    # 防止脚本里的 </script> 提前闭合
    app = app.replace('</script>', '<\\/script>')

    html = shell.replace('/* APP_JS */', app)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)

    size = os.path.getsize(OUT)
    print('built %s (%.1f KB, %d lines)' % (OUT, size / 1024, html.count('\n') + 1))


if __name__ == '__main__':
    main()
