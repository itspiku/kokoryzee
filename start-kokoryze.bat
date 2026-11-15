@echo off
title Kokoryze
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
)
echo.
echo Starting Kokoryze at http://localhost:5173
echo (leave this window open; press Ctrl+C to stop)
echo.
start "" http://localhost:5173
call npm run dev
