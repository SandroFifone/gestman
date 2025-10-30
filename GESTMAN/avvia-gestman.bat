@echo off
REM Avvia backend Flask, frontend React e apre la pagina web


REM Avvia backend Flask in una nuova finestra, attivando il virtualenv
start cmd /k "cd /d "%~dp0backend" && call ..\.venv\Scripts\activate && python server.py"

REM Avvia frontend React in una nuova finestra
start cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM Attendi qualche secondo per sicurezza
TIMEOUT /T 5 >nul

REM Apri la pagina web nel browser predefinito
start http://localhost:5173/
