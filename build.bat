@echo off
chcp 65001 >nul
cd /d "%~dp0"
python tools/thumbs/build_thumbs.py
node build.mjs
pause
