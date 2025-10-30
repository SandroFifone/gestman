# 🚀 GESTMAN v1.2.0 - Prima pubblicazione su GitHub

## ISTRUZIONI PASSO-PASSO

### 1. CREA NUOVO REPOSITORY
- Vai su: https://github.com
- Accedi al tuo account GitHub
- Clicca il pulsante verde "New" (o "+" in alto a destra → "New repository")
- Nome repository: `gestman`
- Descrizione: `Sistema di gestione manutenzione industriale`
- ✅ Public (o Private se preferisci)
- ❌ NON aggiungere README, .gitignore, o license (caricheremo tutto noi)
- Clicca "Create repository"

### 2. CARICA I FILE (GitHub non accetta cartelle via web)

#### METODO A: **ZIP E UPLOAD** (PIÙ FACILE)
1. Nel tuo PC, vai in `D:\Progetti Python ultimati o quasi\GESTMAN`
2. Seleziona TUTTO (Ctrl+A) TRANNE la cartella `upload-github`
3. Tasto destro → "Invia a" → "Cartella compressa (zip)"
4. Rinomina in `gestman-complete.zip`
5. Nel repository GitHub, clicca "Upload files"
6. Trascina il file `.zip`
7. Commit: "Initial upload - complete GESTMAN project"
8. Dopo upload, GitHub estrarrà automaticamente il contenuto

#### METODO B: **FILE SINGOLI** (più laborioso ma sicuro)
**Prima i file nella ROOT:**
1. Upload tutti i file .bat, .sh, .md dalla cartella principale
2. Commit: "Add root files"

**Poi cartella BACKEND:** 
1. Nel repository, clicca "Create new file"
2. Scrivi `backend/main.py` (GitHub creerà la cartella)
3. Copia contenuto da `backend/main.py` del tuo PC
4. Commit: "Add backend/main.py"
5. Ripeti per TUTTI i file in backend/ (docs.py, server.py, etc.)

**Poi cartella FRONTEND:**
1. Stessa cosa: `frontend/package.json` 
2. Poi tutti i file in frontend/src/, frontend/public/, etc.

### 3. OPZIONE ALTERNATIVA: USA GITHUB DESKTOP (CONSIGLIATA!)
Se il metodo ZIP non funziona:
1. Scarica **GitHub Desktop** da: https://desktop.github.com/
2. Installa e accedi con il tuo account GitHub
3. "Clone a repository from the Internet" → Clona il repository vuoto appena creato
4. Nella cartella locale clonata, copia TUTTI i file del progetto GESTMAN
5. GitHub Desktop rileverà automaticamente tutti i cambiamenti
6. Scrivi commit message: "Initial commit - GESTMAN v1.2.0 complete"
7. Clicca "Commit to main" → "Push origin"

### 4. DOPO IL PRIMO UPLOAD - AGGIORNA I FILE MODIFICATI:

#### A) backend/docs.py
1. Clicca su `backend/` → `docs.py`
2. Clicca sull'icona matita "Edit this file"
3. Seleziona tutto (Ctrl+A) e cancella
4. Copia il contenuto da `upload-github/docs.py`
5. Incolla nel web editor
6. Scroll down → "Commit changes"
7. Messaggio: "Update docs.py - add file management endpoints"
8. Clicca "Commit changes"

#### B) frontend/src/components/Docs.jsx
1. Naviga: `frontend/` → `src/` → `components/` → `Docs.jsx`
2. Edit (matita)
3. Sostituisci tutto con `upload-github/Docs.jsx`
4. Commit: "Update Docs.jsx - add file management UI"

#### C) frontend/src/components/Docs.css
1. Naviga: `frontend/src/components/Docs.css`
2. Edit → sostituisci con `upload-github/Docs.css`
3. Commit: "Update Docs.css - add file management styles"

#### D) frontend/src/components/Auth.jsx
1. Naviga: `frontend/src/components/Auth.jsx`
2. Edit → sostituisci con `upload-github/Auth.jsx` 
3. Commit: "Fix Auth.jsx - correct import statement"

### 3. UPLOAD BUILD FRONTEND
1. Nella root del repository GitHub
2. Clicca "Upload files"
3. Trascina TUTTO il contenuto di `frontend/dist/` 
4. Commit: "Add new frontend build v1.2.0 with file management"

## SUL SERVER UBUNTU:

### 1. INSTALLA GIT E CLONA IL REPOSITORY:
```bash
sudo apt update
sudo apt install git -y
cd /var/www
sudo git clone https://github.com/TUO-USERNAME/NOME-REPOSITORY.git gestman
sudo chown -R www-data:www-data gestman/
```
**IMPORTANTE**: Sostituisci `TUO-USERNAME/NOME-REPOSITORY` con il tuo username GitHub e il nome del repository che hai creato.

### 2. CONFIGURA E AVVIA (solo al primo deploy):
```bash
cd /var/www/gestman/backend

# Installa dipendenze Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configura systemd service (se non esiste già)
sudo cp /var/www/gestman/deploy/gestman.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable gestman
sudo systemctl start gestman
```

### 3. PER AGGIORNAMENTI FUTURI:
```bash
# SSH nel server
ssh [tuo-user]@[tuo-server]

# Vai nella directory del progetto
cd /var/www/gestman

# Backup
sudo systemctl stop gestman
cp -r backend backend_backup_$(date +%Y%m%d)

# Aggiorna dal repository
sudo git pull origin main

# Riavvia il servizio
sudo systemctl start gestman

# Verifica stato
sudo systemctl status gestman
```

## ✅ TEST FINALE
1. Vai alla tua app web
2. Login → Docs → "File e Documenti"
3. Verifica che vedi la nuova sezione
4. Testa download di un file esistente

## 🆘 ROLLBACK (se problemi)
```bash
sudo systemctl stop gestman
rm -rf backend
mv backend_backup_YYYYMMDD backend
sudo systemctl start gestman
```