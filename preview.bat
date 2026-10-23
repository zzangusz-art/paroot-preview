@echo off
chcp 65001 >nul
cd /d "%~dp0"
python tools/thumbs/build_thumbs.py
node build.mjs || goto :end
echo.
echo 미리보기: http://localhost:5530  (닫으려면 Ctrl+C)
start "" http://localhost:5530
python -m http.server 5530 --directory dist
:end
pause
