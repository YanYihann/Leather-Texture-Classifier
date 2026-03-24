@echo off
setlocal

echo [INFO] Stopping tunnel and local dev server...

taskkill /F /FI "WINDOWTITLE eq LeatherMind Tunnel*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq LeatherMind Dev Server*" >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr ":3000 "') do (
  taskkill /F /PID %%P >nul 2>&1
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr LISTENING ^| findstr ":24678 "') do (
  taskkill /F /PID %%P >nul 2>&1
)

echo [DONE] Stop command finished.
pause

