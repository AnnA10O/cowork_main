
# CoWork HQ - One-Click Dev USB Tunnel Setup
# Run this every time you plug in your phone.

# Use full path to adb since PATH may not be updated in this session
$adbExe = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Host ""
Write-Host "CoWork HQ - Dev Environment Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check adb is available
if (-not (Test-Path $adbExe)) {
    Write-Host "ERROR: adb not found at:" -ForegroundColor Red
    Write-Host "  $adbExe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Download Android Platform Tools from:" -ForegroundColor Yellow
    Write-Host "  https://developer.android.com/tools/releases/platform-tools" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "adb found OK." -ForegroundColor Green

# 2. Check a device is connected
$devices = & $adbExe devices | Select-String -Pattern "device$"
if (-not $devices) {
    Write-Host ""
    Write-Host "WARNING: No Android device detected via USB." -ForegroundColor Yellow
    Write-Host "  1. Connect your phone via USB cable" -ForegroundColor Yellow
    Write-Host "  2. Enable USB Debugging in Developer Options" -ForegroundColor Yellow
    Write-Host "  3. Accept the 'Allow USB Debugging' popup on your phone" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Waiting 15 seconds for device..." -ForegroundColor Gray
    Start-Sleep -Seconds 15
    $devices = & $adbExe devices | Select-String -Pattern "device$"
    if (-not $devices) {
        Write-Host "ERROR: No device found. Connect phone and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "Android device connected!" -ForegroundColor Green

# 3. Set up adb reverse tunnels
Write-Host ""
Write-Host "Setting up USB tunnels..." -ForegroundColor Cyan

& $adbExe reverse tcp:3000 tcp:3000 | Out-Null
Write-Host "  OK - Port 3000 (Backend API) tunneled to phone" -ForegroundColor Green

& $adbExe reverse tcp:8080 tcp:8080 | Out-Null
Write-Host "  OK - Port 8080 (Manager Portal) tunneled to phone" -ForegroundColor Green

# 4. Summary
Write-Host ""
Write-Host "==============================================" -ForegroundColor DarkGray
Write-Host "Dev environment ready! Now open 3 terminals:" -ForegroundColor White
Write-Host ""
Write-Host "  [Terminal 1] Backend:" -ForegroundColor Yellow
Write-Host "    cd coworkhq-backend-v2 && npm run start:dev" -ForegroundColor Gray
Write-Host ""
Write-Host "  [Terminal 2] Manager Portal:" -ForegroundColor Yellow
Write-Host "    cd coworkhq-frontend-manager && npx http-server -p 8080 -c-1" -ForegroundColor Gray
Write-Host ""
Write-Host "  [Terminal 3] Flutter App:" -ForegroundColor Yellow
Write-Host "    cd book_my_space && flutter run" -ForegroundColor Gray
Write-Host ""
Write-Host "  The phone uses localhost:3000 tunneled via USB." -ForegroundColor DarkGray
Write-Host "==============================================" -ForegroundColor DarkGray
Write-Host ""

# 5. Keep tunnels alive - refresh every 30s
Write-Host "Tunnels active. Keep this window open while developing." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

while ($true) {
    Start-Sleep -Seconds 30
    $check = & $adbExe devices | Select-String -Pattern "device$"
    if ($check) {
        & $adbExe reverse tcp:3000 tcp:3000 | Out-Null
        & $adbExe reverse tcp:8080 tcp:8080 | Out-Null
        $ts = Get-Date -Format 'HH:mm:ss'
        Write-Host "  [$ts] Tunnels refreshed" -ForegroundColor DarkGray
    } else {
        $ts = Get-Date -Format 'HH:mm:ss'
        Write-Host "  [$ts] Device disconnected, waiting..." -ForegroundColor Yellow
    }
}
