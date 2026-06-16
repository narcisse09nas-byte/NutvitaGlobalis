@echo off
setlocal
title NutVitaGlobalis - Preview Server
cd /d "%~dp0"

echo ========================================
echo   NutVitaGlobalis - Previsualisation
echo ========================================
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERREUR: Node.js est introuvable.
  echo Installez Node.js puis relancez ce fichier.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo Installation des dependances...
  call npm.cmd install
  if errorlevel 1 goto :error
)

if not exist ".next\BUILD_ID" (
  echo Creation du build de production...
  call npm.cmd run build
  if errorlevel 1 goto :error
)

echo Serveur: http://127.0.0.1:3000
echo.
echo IMPORTANT: gardez cette fenetre ouverte.
echo Pour arreter le serveur, appuyez sur Ctrl+C.
echo.

call npm.cmd run start -- -H 127.0.0.1 -p 3000

echo.
echo Le serveur s'est arrete.
pause
exit /b 0

:error
echo.
echo ERREUR: la previsualisation n'a pas pu demarrer.
pause
exit /b 1
