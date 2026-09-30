@echo off
echo ==========================================================
echo Starting Smart Bus Stand Two-Wheeler Parking System...
echo ==========================================================

start "Smart Parking Backend" cmd /k "cd backend && call run.bat"
timeout /t 3 /nobreak >nul
start "Smart Parking Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo System started!
echo Frontend will be accessible at: http://localhost:5173
echo Backend API running at:         http://localhost:5000
echo ==========================================================
