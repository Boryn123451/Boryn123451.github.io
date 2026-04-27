@echo off
setlocal
set PYTHONUTF8=1
..\.venv\Scripts\python.exe serve.py %*
