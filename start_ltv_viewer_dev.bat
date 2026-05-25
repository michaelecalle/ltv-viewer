@echo off
title LTV Viewer - Dev Server
cd /d "S:\Dev\ltv-viewer"

echo =========================================
echo   LTV Viewer - lancement local
echo =========================================
echo.
echo Dossier : %cd%
echo.
echo Demarrage du serveur Vite...
echo.

npm run dev

echo.
echo Le serveur s'est arrete.
pause
