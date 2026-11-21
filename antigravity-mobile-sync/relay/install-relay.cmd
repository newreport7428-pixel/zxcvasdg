@echo off
setlocal EnableExtensions
rem ============================================================
rem  Mobile Sync relay installer (Windows Server 2012 R2 or newer)
rem  Put this file next to mobile-sync-relay.exe, then
rem  right-click it and choose "Run as administrator".
rem ============================================================
title Mobile Sync relay installer

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Please right-click install-relay.cmd and choose "Run as administrator".
  echo.
  pause
  exit /b 1
)

set "SRC=%~dp0mobile-sync-relay.exe"
set "DIR=C:\mobile-sync"
set "EXE=%DIR%\mobile-sync-relay.exe"
set "TASK=MobileSyncRelay"

if not exist "%SRC%" (
  echo  mobile-sync-relay.exe was not found next to this file.
  pause
  exit /b 1
)

echo [1/5] Stopping an older copy if it is running...
schtasks /end /tn "%TASK%" >nul 2>&1
taskkill /f /im mobile-sync-relay.exe >nul 2>&1

echo [2/5] Copying the program to %DIR% ...
if not exist "%DIR%" mkdir "%DIR%"
if /i "%~dp0"=="%DIR%\" goto copied
copy /y "%SRC%" "%EXE%" >nul || (echo  Could not copy the program. & pause & exit /b 1)
:copied

echo [3/5] Setup (answer the questions below)...
echo.
"%EXE%" -setup
if errorlevel 1 (
  echo.
  echo  Setup did not finish. Read the message above, fix it, then run this installer again.
  echo  Your answers are saved; to change them delete %DIR%\relay-config.json
  pause
  exit /b 1
)

echo.
echo [4/5] Opening the firewall...
set "PORTS="
for /f "usebackq delims=" %%P in (`%EXE% -print-ports`) do set "PORTS=%%P"
if not defined PORTS set "PORTS=443,80"
netsh advfirewall firewall delete rule name="Mobile Sync Relay" >nul 2>&1
netsh advfirewall firewall add rule name="Mobile Sync Relay" dir=in action=allow protocol=TCP localport=%PORTS% >nul
echo        Opened TCP port(s) %PORTS% in Windows Firewall.
echo        If your VPS provider has a firewall in its web panel, open the same port(s) there too.

echo [5/5] Starting the relay now and at every boot...
schtasks /create /tn "%TASK%" /tr "%EXE%" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul
schtasks /run /tn "%TASK%" >nul

clip < "%DIR%\connect-string.txt" >nul 2>&1
echo.
echo ================================================================
echo  Done! The relay is running.
echo.
echo  The connect string below is already COPIED to the clipboard.
echo  On your computer, in Antigravity: Ctrl+Shift+P
echo    -^> "Mobile Sync: Connect to VPS Relay" -^> paste.
echo.
type "%DIR%\connect-string.txt"
echo.
echo  Keep it secret. Log file: %DIR%\relay.log
echo ================================================================
pause
