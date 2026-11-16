@echo off
title Incident Resolution Frontend
cd /d "%~dp0frontend"
npm run dev -- --host
pause

