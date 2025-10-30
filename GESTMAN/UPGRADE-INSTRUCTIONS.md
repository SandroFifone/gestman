# GESTMAN - Upgrade Instructions
## Nuova funzionalità: Gestione File e Documenti

### Data: 30 Ottobre 2025
### Versione: v1.2.0 - File Management

## Modifiche implementate:

### 1. Backend (Python Flask)
- **File modificato:** `backend/docs.py`
- **Nuove funzionalità:**
  - Endpoint per visualizzare tutti i file caricati
  - Download diretto dei file 
  - Eliminazione singola e multipla
  - Pulizia automatica file orfani
  - Associazione file-asset automatica

### 2. Frontend (React)
- **File modificati:** 
  - `frontend/src/components/Docs.jsx`
  - `frontend/src/components/Docs.css`
  - `frontend/src/components/Auth.jsx` (fix import)
- **Nuova sezione:** "File e Documenti" nella dashboard Docs
- **Funzionalità:** Download, eliminazione, filtri, statistiche

## Istruzioni per l'upgrade sul server Ubuntu:

### Opzione A: Via Git (CONSIGLIATA)
```bash
# 1. Accedi al server
ssh user@your-server

# 2. Vai nella directory del progetto
cd /path/to/gestman

# 3. Fai backup
sudo systemctl stop gestman  # o il nome del tuo servizio
cp -r backend backend_backup_$(date +%Y%m%d)

# 4. Pull delle modifiche
git pull origin main

# 5. Copia i nuovi file di build del frontend
# (devi trasferire prima la cartella dist/ sul server)

# 6. Riavvia il servizio
sudo systemctl start gestman
```

### Opzione B: Upload manuale
1. Trasferire `backend/docs.py` modificato
2. Trasferire contenuto di `frontend/dist/` nella cartella static del server
3. Riavviare il servizio Flask

## Struttura file coinvolti:
```
backend/
├── docs.py (MODIFICATO - gestione file)
├── uploads/ (cartella esistente)
└── floor_plans/ (cartella esistente)

frontend/dist/ (NUOVO BUILD)
├── index.html
├── assets/
│   ├── index-D_do4v5R.css
│   └── index-2ASbQmpF.js
└── [altri file statici]
```

## Test post-upgrade:
1. Accedi all'applicazione
2. Vai in "Docs" → "File e Documenti" 
3. Verifica che i file esistenti siano visibili
4. Testa download e eliminazione
5. Controlla che non ci siano errori nella console del browser

## Rollback (se necessario):
```bash
# Ripristina backup
cp -r backend_backup_YYYYMMDD/* backend/
sudo systemctl restart gestman
```