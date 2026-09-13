@echo off
title Matter-Born Local Wi-Fi Game Server
color 0A
echo ========================================================
echo       MATTER-BORN WI-FI MULTIPLAYER GAME SERVER
echo ========================================================
echo.
echo Detecting Local Wi-Fi IPv4 Address...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "Persistent"') do (
    set LOCAL_IP=%%a
)
echo Host IP: %LOCAL_IP%
echo Server Port: 3000
echo.
echo Ready for your 4-player team on Wi-Fi!
echo Server URL for Phones: http://172.32.1.134:3000
echo.
echo Starting Server (Press Ctrl+C to stop)...
echo ========================================================
echo.
node dist/server.cjs
pause
