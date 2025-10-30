@echo off
echo TEST CONNETTIVITA' GESTMAN
echo ==========================
echo.

REM Ottieni l'IP locale
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /C:"IPv4"') do (
    for /f "tokens=1" %%B in ("%%A") do (
        set LOCAL_IP=%%B
        goto :found_ip
    )
)
:found_ip

echo 🖥️  IP locale rilevato: %LOCAL_IP%
echo.

echo 🔍 Test connessioni...
echo.

REM Test localhost backend
echo Testo Backend su localhost...
curl -s http://127.0.0.1:5000/api/test-connection >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Backend raggiungibile su localhost
) else (
    echo ❌ Backend NON raggiungibile su localhost
)

REM Test IP locale backend
echo Testo Backend su IP locale...
curl -s http://%LOCAL_IP%:5000/api/test-connection >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Backend raggiungibile su %LOCAL_IP%
) else (
    echo ❌ Backend NON raggiungibile su %LOCAL_IP%
)

echo.
echo 📱 ISTRUZIONI PER TEST DA MOBILE
echo ================================
echo.
echo 1. Assicurati che il dispositivo mobile sia connesso alla stessa rete Wi-Fi
echo.
echo 2. Apri il browser del mobile e prova questi URL:
echo    • Frontend: http://%LOCAL_IP%:5173
echo    • Test Backend: http://%LOCAL_IP%:5000/api/test-connection
echo.
echo 3. Se non funziona, esegui 'configura-firewall.bat' come Amministratore
echo.
echo 4. Altre soluzioni:
echo    • Disabilita temporaneamente Windows Defender
echo    • Controlla impostazioni router (isolamento client AP)
echo    • Verifica che non ci siano filtri di rete aziendali
echo.

REM Mostra informazioni di rete
echo 🌐 INFORMAZIONI RETE
echo ====================
ipconfig | findstr /C:"Configurazione IP"
ipconfig | findstr /C:"Scheda"
ipconfig | findstr /C:"IPv4"
ipconfig | findstr /C:"Subnet"
ipconfig | findstr /C:"Gateway"

echo.
pause
