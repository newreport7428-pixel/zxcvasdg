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
if exist "C:\mobile-sync\mobile-sync-relay.exe" "C:\mobile-sync\mobile-sync-relay.exe" -remove-iis-site
netsh advfirewall firewall delete rule name="Mobile Sync Relay" >nul 2>&1
echo Mobile Sync relay stopped and removed from startup, the firewall and IIS.
echo The folder C:\mobile-sync (key and certificates) was kept; delete it yourself if you want.
pause
