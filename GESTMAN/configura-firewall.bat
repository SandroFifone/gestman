@echo off
REM Script per configurare il firewall Windows per GESTMAN
echo Configurazione Firewall per GESTMAN
echo =====================================

echo.
echo Verifica privilegi amministratore...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRORE: Questo script deve essere eseguito come Amministratore!
    echo.
    echo Per eseguirlo come amministratore:
    echo 1. Clicca con il tasto destro su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

echo ✅ Privilegi amministratore confermati
echo.

echo Aggiunta regola firewall per Backend Flask (porta 5000)...
netsh advfirewall firewall add rule name="GESTMAN-Backend-5000" dir=in action=allow protocol=TCP localport=5000 enable=yes
if %errorLevel% equ 0 (
    echo ✅ Regola Backend creata con successo
) else (
    echo ❌ Errore nella creazione della regola Backend
)

echo.
echo Aggiunta regola firewall per Frontend Vite (porta 5173)...
netsh advfirewall firewall add rule name="GESTMAN-Frontend-5173" dir=in action=allow protocol=TCP localport=5173 enable=yes
if %errorLevel% equ 0 (
    echo ✅ Regola Frontend creata con successo
) else (
    echo ❌ Errore nella creazione della regola Frontend
)

echo.
echo Visualizza regole create...
echo =============================
netsh advfirewall firewall show rule name="GESTMAN-Backend-5000"
echo.
netsh advfirewall firewall show rule name="GESTMAN-Frontend-5173"

echo.
echo =====================================================
echo CONFIGURAZIONE COMPLETATA!
echo =====================================================
echo.
echo Ora dovresti poter accedere a GESTMAN da dispositivi mobili usando:
echo   • Frontend: http://172.16.1.16:5173
echo   • Backend:  http://172.16.1.16:5000
echo.
echo Se il problema persiste, prova:
echo 1. Disabilita temporaneamente l'antivirus
echo 2. Riavvia il router
echo 3. Verifica che il dispositivo mobile sia sulla stessa rete Wi-Fi
echo 4. Controlla le impostazioni del router (filtri MAC, isolamento client)
echo.
pause
