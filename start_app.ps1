# Launch CashCycle Ops Services
$ErrorActionPreference = "Stop"

Write-Host "Starting CashCycle Cycle Command Center..." -ForegroundColor Cyan

# 1. Start Backend
# Runs python backend/app/api.py in a new window
Write-Host "Launching Backend (Port 8000)..." -ForegroundColor Green
Start-Process "python" -ArgumentList "backend/app/api.py" -WorkingDirectory "$PSScriptRoot"

# 2. Wait a moment for backend
Start-Sleep -Seconds 2

# 3. Start Frontend
# Runs npm run dev in a new window so logs are visible
Write-Host "Launching Frontend (Port 3000)..." -ForegroundColor Green
Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WorkingDirectory "$PSScriptRoot"

Write-Host "Done! Services are running in separate windows." -ForegroundColor Yellow
Write-Host "Access the App at: http://localhost:3000" -ForegroundColor Cyan
