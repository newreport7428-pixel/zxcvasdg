@echo off
rem Removes the Mobile Sync relay. Right-click -> "Run as administrator".
net session >nul 2>&1
if errorlevel 1 (
  echo Please right-click uninstall-relay.cmd and choose "Run as administrator".
  pause
  exit /b 1
)
schtasks /end /tn "MobileSyncRelay" >nul 2>&1
schtasks /delete /tn "MobileSyncRelay" /f >nul 2>&1
taskkill /f /im mobile-sync-relay.exe >nul 2>&1
netsh advfirewall firewall delete rule name="Mobile Sync Relay" >nul 2>&1
echo Mobile Sync relay stopped and removed from startup and the firewall.
echo The folder C:\mobile-sync (key and certificates) was kept; delete it yourself if you want.
pause
