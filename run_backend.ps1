# Runs the FastAPI backend server on http://localhost:8000
Set-Location "$PSScriptRoot\backend"
$env:PYTHONPATH = "$PSScriptRoot\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir app


