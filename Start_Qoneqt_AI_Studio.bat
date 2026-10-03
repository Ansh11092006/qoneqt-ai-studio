@echo off
setlocal

REM Qoneqt AI Studio - One-click launcher
REM Put this .bat file in the project root (same folder as package.json).

cd /d "%~dp0"

REM Request Administrator privileges if not already elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo Starting Qoneqt AI Studio...
echo.

REM Start backend in a separate window
start "Qoneqt Backend" cmd /k "cd /d ""%~dp0"" && .venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Give backend a moment to initialize
timeout /t 3 /nobreak >nul

REM Start frontend in a separate window
start "Qoneqt Frontend" cmd /k "cd /d ""%~dp0"" && npm run ui"

REM Give Vite a moment to start, then open the site
timeout /t 4 /nobreak >nul
start "" "http://localhost:5173/"

echo.
echo Qoneqt AI Studio is starting.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
pause
