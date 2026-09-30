Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Smart Bus Stand Two-Wheeler Parking System...   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy Bypass", "-File .\backend\run.ps1"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command Set-Location .\frontend; npm run dev"

Write-Host "`nSystem services started in new terminal windows!" -ForegroundColor Green
Write-Host "Frontend UI : http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend API : http://localhost:5000" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
