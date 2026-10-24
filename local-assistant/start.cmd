@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS first. See README.md.
  pause
  exit /b 1
)
node server.mjs
pause
