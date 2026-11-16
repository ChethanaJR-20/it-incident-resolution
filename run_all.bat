@echo off
echo Starting Autonomous IT Incident Resolution Agent...
cd /d "%~dp0"
start "Backend (FastAPI)" cmd /k run_backend.bat
ping 127.0.0.1 -n 3 >nul
start "Frontend (Vite React)" cmd /k run_frontend.bat
ping 127.0.0.1 -n 3 >nul
echo Opening Web Portal in browser...
start http://localhost:5173
echo Done! Both servers are now running in separate windows.



