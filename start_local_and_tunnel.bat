@echo off
setlocal enabledelayedexpansion

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

set "PYTHON_EXE=D:\anaconda\envs\digital-artisan\python.exe"
if not exist "%PYTHON_EXE%" (
  set "PYTHON_EXE=python"
)

set "CLOUDFLARED_CMD="
for /f "delims=" %%P in ('where cloudflared 2^>nul') do (
  set "CLOUDFLARED_CMD=%%P"
  goto :cf_found
)

if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
  set "CLOUDFLARED_CMD=C:\Program Files (x86)\cloudflared\cloudflared.exe"
  goto :cf_found
)

if exist "C:\Program Files\cloudflared\cloudflared.exe" (
  set "CLOUDFLARED_CMD=C:\Program Files\cloudflared\cloudflared.exe"
  goto :cf_found
)

echo [ERROR] cloudflared not found. Please install it first.
echo Hint: winget install --id Cloudflare.cloudflared -e
pause
exit /b 1

:cf_found
echo [INFO] Project: %PROJECT_DIR%
echo [INFO] Python: %PYTHON_EXE%
echo [INFO] cloudflared: %CLOUDFLARED_CMD%

echo [INFO] Starting local dev server...
start "LeatherMind Dev Server" cmd /k "cd /d ""%PROJECT_DIR%"" && set PYTHON_EXECUTABLE=%PYTHON_EXE% && npm run dev"

echo [INFO] Waiting for local server...
timeout /t 6 /nobreak >nul

echo [INFO] Starting Cloudflare Tunnel...
start "LeatherMind Tunnel" cmd /k "cd /d ""%PROJECT_DIR%"" && ""%CLOUDFLARED_CMD%"" tunnel --url http://localhost:3000"

echo [INFO] Opening local page in browser...
timeout /t 2 /nobreak >nul
start "" http://localhost:3000

echo.
echo [DONE] Local page is opening.
echo [DONE] In the "LeatherMind Tunnel" window, copy the https://*.trycloudflare.com URL to your phone.
echo [TIP] Run stop_local_and_tunnel.bat to stop services quickly.
echo.
pause

