@echo off
REM Script Windows per preparare GESTMAN per produzione
REM File: prepare-production.bat

echo 🚀 Preparazione GESTMAN per produzione...

REM Vai alla directory del progetto
cd /d "%~dp0"

echo 📁 Directory di lavoro: %CD%

REM 1. CONTROLLO PREREQUISITI
echo.
echo 1. Controllo prerequisiti...

REM Verifica Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js non trovato. Installa Node.js 18+
    pause
    exit /b 1
)

REM Verifica Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python non trovato
    pause
    exit /b 1
)

echo ✅ Prerequisiti OK

REM 2. BACKEND - PREPARAZIONE
echo.
echo 2. Preparazione Backend...

cd backend

REM Crea virtual environment se non esiste
if not exist "venv" (
    echo Creazione virtual environment...
    python -m venv venv
)

REM Attiva venv e installa dipendenze
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Copia configurazione produzione
if exist ".env.production" (
    copy .env.production .env >nul
    echo ✅ Configurazione produzione applicata
)

REM Test rapido backend
echo Test backend...
python -c "import sys; sys.path.append('.'); import main; print('✅ Backend importato correttamente')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Errore nel test backend
    pause
    exit /b 1
)

cd ..

REM 3. FRONTEND - BUILD PRODUZIONE
echo.
echo 3. Build Frontend per produzione...

cd frontend

REM Installa dipendenze
echo Installazione dipendenze npm...
call npm ci

REM Build per produzione
echo Build produzione React...
set NODE_ENV=production
call npm run build

REM Verifica build
if not exist "dist" (
    echo ❌ Build frontend fallita - directory dist non trovata
    pause
    exit /b 1
)

echo ✅ Build frontend completato

cd ..

REM 4. CREAZIONE PACKAGE DEPLOY
echo.
echo 4. Creazione package per deploy...

REM Crea directory deploy se non esiste
if not exist "deploy" mkdir deploy

REM Crea nome file con timestamp
for /f "tokens=2 delims==" %%I in ('wmic OS Get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,8%_%datetime:~8,6%
set DEPLOY_ARCHIVE=deploy\gestman-production-%timestamp%.zip

REM Crea archivio (richiede PowerShell)
powershell -Command "Compress-Archive -Path 'backend\*','frontend\dist','*.sh','*.md','*.bat' -DestinationPath '%DEPLOY_ARCHIVE%' -Force"

REM 5. ISTRUZIONI FINALI
echo.
echo 🎉 Preparazione completata!
echo ==================================================
echo.
echo 📦 Package creato: %DEPLOY_ARCHIVE%
echo.
echo 📋 PROSSIMI PASSI:
echo 1. Trasferisci il package sul server Ubuntu
echo 2. Estrai e esegui setup-gestman-ubuntu.sh
echo 3. Configura dominio e SSL
echo.
echo ✅ GESTMAN pronto per il deployment!
echo.
pause