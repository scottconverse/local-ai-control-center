@echo off
cd /d "%~dp0"
call npm.cmd install
call npm.cmd run build
echo.
echo Install complete. Double-click "Start Local AI Control Center.cmd" to open the app.
pause
