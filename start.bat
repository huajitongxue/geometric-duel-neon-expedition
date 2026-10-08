@echo off
setlocal EnableExtensions
cd /d "%~dp0"
set "PORT=8081"
set "URL=http://127.0.0.1:%PORT%/index.html"

python --version >nul 2>&1
if not errorlevel 1 set "PY=python"
if not defined PY (
  py --version >nul 2>&1
  if not errorlevel 1 set "PY=py"
)
if not defined PY (
  echo [Error] Python 3 was not found. Install Python 3 and add it to PATH.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 -Uri '%URL%'; if($r.StatusCode -eq 200){exit 0}} catch {}; exit 1"
if not errorlevel 1 goto open

netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo [Error] Port %PORT% is occupied by another application.
  pause
  exit /b 1
)

start "GeometryDuelServer" /min %PY% -m http.server %PORT% --bind 127.0.0.1
timeout /t 1 /nobreak >nul
:open
start "" "%URL%"
