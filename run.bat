@echo off
chcp 65001 > nul
echo ===================================================
echo   Krafton Jungle Project 1 - Flask Server Launcher
echo ===================================================
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] 가상환경(.venv)을 찾을 수 없습니다.
    echo python -m venv .venv 명령어로 가상환경을 먼저 생성해주세요.
    pause
    exit /b 1
)

echo [INFO] Flask 서버를 실행합니다...
echo [INFO] 브라우저 접속 주소: http://127.0.0.1:5000
echo.

.venv\Scripts\python.exe app.py

pause
