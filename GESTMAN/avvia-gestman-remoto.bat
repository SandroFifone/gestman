@echo off
echo =================================
echo GESTMAN - Avvio Configurazione Remota
echo =================================
echo.

REM ===== CONFIGURAZIONI PER ACCESSO REMOTO =====

REM Disabilita temporaneamente Windows Defender Real-time Protection per le porte di sviluppo
echo Configurazione accesso remoto...
powershell -Command "try { Add-MpPreference -ExclusionProcess 'python.exe' -ErrorAction SilentlyContinue } catch { }"
powershell -Command "try { Add-MpPreference -ExclusionProcess 'node.exe' -ErrorAction SilentlyContinue } catch { }"

REM Forza la scoperta della rete e la condivisione
netsh firewall set service type = fileandprint mode = enable profile = current >nul 2>&1
netsh advfirewall firewall set rule group="Network Discovery" new enable=Yes >nul 2>&1

REM Configura priorità alta per i processi di sviluppo
wmic process where name="python.exe" CALL setpriority "above normal" >nul 2>&1
wmic process where name="node.exe" CALL setpriority "above normal" >nul 2>&1

REM ===== RILEVAMENTO IP MIGLIORATO =====

REM Ottieni l'indirizzo IP locale usando metodi multipli
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"Indirizzo IPv4"') do (
    for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
)

REM Se non trova con "Indirizzo IPv4", prova con la versione inglese
if "%LOCAL_IP%"=="" (
    for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
        for /f "tokens=1" %%j in ("%%i") do set LOCAL_IP=%%j
    )
)

REM Metodo alternativo usando PowerShell
if "%LOCAL_IP%"=="" (
    for /f %%i in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi).IPAddress"') do set LOCAL_IP=%%i
)

REM Fallback finale
if "%LOCAL_IP%"=="" set LOCAL_IP=172.16.1.16

REM Rimuovi eventuali spazi dalla variabile LOCAL_IP
set LOCAL_IP=%LOCAL_IP: =%

echo ✅ Indirizzo IP del computer: %LOCAL_IP%
echo.
echo 📱 Il progetto sarà accessibile da dispositivi mobili:
echo    • Frontend: http://%LOCAL_IP%:5173
echo    • Backend:  http://%LOCAL_IP%:5000/api/test-connection
echo.
echo 🖥️  Accesso locale:
echo    • Frontend: http://localhost:5173
echo    • Backend:  http://localhost:5000
echo.
echo =================================
echo.

REM ===== VERIFICA CONNETTIVITÀ =====
echo 🔍 Verifica configurazione rete...

REM Test rapido per verificare che le porte siano libere
netstat -an | findstr :5000 >nul 2>&1
if %errorLevel% equ 0 (
    echo ⚠️  Porta 5000 già in uso - arresto processi esistenti...
    taskkill /f /im python.exe >nul 2>&1
    timeout /t 2 /nobreak > nul
)

netstat -an | findstr :5173 >nul 2>&1
if %errorLevel% equ 0 (
    echo ⚠️  Porta 5173 già in uso - arresto processi esistenti...
    taskkill /f /im node.exe >nul 2>&1
    timeout /t 2 /nobreak > nul
)

REM ===== AVVIO SERVIZI CON CONFIGURAZIONI OTTIMIZZATE =====

echo 🚀 Avvio Backend Flask con configurazione remota...
start "Backend GESTMAN" cmd /k "cd /d %~dp0backend && set FLASK_ENV=development && set FLASK_DEBUG=1 && python server.py"

REM Aspetta per il backend
timeout /t 4 /nobreak > nul

echo 🌐 Avvio Frontend React con configurazione remota...
set VITE_BACKEND_HOST=%LOCAL_IP%
set VITE_HOST=0.0.0.0
echo    Backend configurato su: %LOCAL_IP%:5000
start "Frontend GESTMAN" cmd /k "cd /d %~dp0frontend && set VITE_BACKEND_HOST=%LOCAL_IP% && set VITE_HOST=0.0.0.0 && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo ===== AVVIO COMPLETATO =====
echo.
echo ✅ Backend Flask in esecuzione
echo ✅ Frontend React in esecuzione  
echo.
echo 📋 ISTRUZIONI PER ACCESSO DA MOBILE:
echo.
echo 1️⃣ Assicurati che il dispositivo mobile sia sulla stessa rete Wi-Fi
echo 2️⃣ Apri il browser del mobile
echo 3️⃣ Naviga a: http://%LOCAL_IP%:5173
echo.
echo 🔧 Se non funziona:
echo    • Verifica che mobile e PC siano sulla stessa rete
echo    • Disabilita temporaneamente l'antivirus
echo    • Riavvia il router se necessario
echo    • Controlla "Isolamento AP" nelle impostazioni router
echo.
echo Chiudi questa finestra quando hai finito di usare l'applicazione.
echo.
pause
