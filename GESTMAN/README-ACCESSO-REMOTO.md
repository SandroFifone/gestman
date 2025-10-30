# GESTMAN - Configurazione Accesso Remoto

## Configurazione completata per l'accesso remoto

Il progetto è stato configurato per permettere l'accesso da dispositivi remoti sulla stessa rete WiFi.

### Modifiche apportate:

#### Backend (Flask)
- **server.py**: Configurato per accettare connessioni da `0.0.0.0:5000` invece di solo localhost

#### Frontend (React/Vite)
- **Nuovo file config/api.js**: Gestione dinamica degli URL API
- **vite.config.js**: Configurato per accettare connessioni da qualsiasi IP della rete
- **Tutti i componenti**: Aggiornati per usare URL dinamici invece di localhost hardcodato

### Come utilizzare:

#### Opzione 1: Script automatico (Raccomandato)
1. Esegui `avvia-gestman-remoto.bat`
2. Lo script mostrerà l'IP del computer e avvierà automaticamente entrambi i servizi
3. Accedi da qualsiasi dispositivo della rete usando l'IP mostrato

#### Opzione 2: Avvio manuale
1. **Avvia il backend**:
   ```bash
   cd backend
   python server.py
   ```

2. **Avvia il frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Trova l'IP del tuo computer**:
   - Windows: `ipconfig` nel prompt dei comandi
   - Il tuo IP sarà qualcosa come `192.168.1.XXX` o `10.0.0.XXX`

### URL di accesso:

- **Computer host**: http://localhost:5173
- **Dispositivi remoti**: http://[IP_DEL_COMPUTER]:5173
- **Backend API**: http://[IP_DEL_COMPUTER]:5000

### Esempio:
Se l'IP del computer è `192.168.1.100`:
- Frontend: http://192.168.1.100:5173
- Backend: http://192.168.1.100:5000

### Note importanti:

1. **Firewall**: Assicurati che il firewall di Windows permetta le connessioni sulle porte 5000 e 5173
2. **Rete WiFi**: Tutti i dispositivi devono essere sulla stessa rete WiFi
3. **Performance**: L'accesso remoto potrebbe essere leggermente più lento del localhost
4. **Sicurezza**: Questa configurazione è adatta solo per reti private/domestiche

### Troubleshooting:

- **Non riesco ad accedere da remoto**: Controlla il firewall e verifica che l'IP sia corretto
- **Errore API**: Assicurati che il backend sia avviato correttamente sulla porta 5000
- **Pagina non carica**: Verifica che il frontend sia avviato sulla porta 5173

### Ritorno alla configurazione localhost:

Se vuoi tornare alla configurazione solo localhost, modifica:
1. `backend/server.py`: `app.run(debug=True)` invece di `app.run(host='0.0.0.0', port=5000, debug=True)`
2. `frontend/vite.config.js`: rimuovi `host: '0.0.0.0'`
