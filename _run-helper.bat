@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
cd /d "%ROOT%"

set "MODE=%~1"
set "PYTHONUTF8=1"
set "VENV=%ROOT%.venv"
set "PYTHONEXE=%VENV%\Scripts\python.exe"
set "PIPEXE=%VENV%\Scripts\pip.exe"
set "LOGS=%ROOT%logs"
set "PORT=8000"
set "MAX_PORT_TRIES=20"

if not exist "%LOGS%" mkdir "%LOGS%"

for /f %%I in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd-HHmmss')"') do set "STAMP=%%I"
if not defined STAMP set "STAMP=run"
set "RUN_LOG=%LOGS%\startup-%STAMP%.log"

call :log "Workspace: %ROOT%"
call :log "Mode: %MODE%"

where python >nul 2>nul
if errorlevel 1 (
  call :log "Python was not found in PATH."
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  call :log "npm was not found in PATH."
  exit /b 1
)

if not exist "%PYTHONEXE%" (
  call :log "Creating virtualenv..."
  python -m venv "%VENV%" >> "%RUN_LOG%" 2>&1
  if errorlevel 1 (
    call :log "Virtualenv creation failed."
    exit /b 1
  )
)

if /I not "%MODE%"=="skip-install" (
  call :log "Upgrading pip..."
  "%PYTHONEXE%" -m pip install --upgrade pip >> "%RUN_LOG%" 2>&1
  if errorlevel 1 (
    call :log "pip upgrade failed."
    exit /b 1
  )

  call :log "Installing backend requirements..."
  "%PIPEXE%" install -r "%ROOT%backend\requirements.txt" >> "%RUN_LOG%" 2>&1
  if errorlevel 1 (
    call :log "Backend dependency installation failed."
    exit /b 1
  )

  pushd "%ROOT%frontend"
  call :log "Installing frontend dependencies..."
  call npm install >> "%RUN_LOG%" 2>&1
  set "STEP_ERROR=!ERRORLEVEL!"
  popd
  if not "!STEP_ERROR!"=="0" (
    call :log "Frontend dependency installation failed with code !STEP_ERROR!."
    exit /b !STEP_ERROR!
  )
)

pushd "%ROOT%frontend"
call :log "Building frontend..."
call npm run build >> "%RUN_LOG%" 2>&1
set "STEP_ERROR=!ERRORLEVEL!"
popd
if not "!STEP_ERROR!"=="0" (
  call :log "Frontend build failed with code !STEP_ERROR!."
  exit /b !STEP_ERROR!
)

call :find_free_port %PORT%
if errorlevel 1 exit /b %ERRORLEVEL%

call :log "Starting app at http://127.0.0.1:%PORT%"
call :log "Logs file: %RUN_LOG%"
echo Stop with Ctrl+C
echo.

"%PYTHONEXE%" "%ROOT%backend\serve.py" --host 127.0.0.1 --port %PORT% >> "%RUN_LOG%" 2>&1
set "APP_EXIT=%ERRORLEVEL%"
if not "!APP_EXIT!"=="0" (
  call :log "Application exited with code !APP_EXIT!."
)
exit /b !APP_EXIT!

:find_free_port
set "PORT=%~1"
set /a PORT_TRIES=0

:find_free_port_loop
set "PORT_IN_USE="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "PORT_IN_USE=%%P"
)

if not defined PORT_IN_USE exit /b 0

if !PORT_TRIES! EQU 0 call :log "Port %PORT% is already in use. Looking for a free port..."

set /a PORT+=1
set /a PORT_TRIES+=1

if !PORT_TRIES! GEQ %MAX_PORT_TRIES% (
  call :log "Could not find a free port in the range starting at %~1."
  exit /b 1
)

goto :find_free_port_loop

:log
echo %~1
>> "%RUN_LOG%" echo [%date% %time%] %~1
exit /b 0
