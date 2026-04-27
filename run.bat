@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%_run-helper.bat" install
set "EXIT_CODE=%errorlevel%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo Start failed. Code: %EXIT_CODE%
  pause
)
exit /b %EXIT_CODE%
