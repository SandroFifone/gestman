#!/bin/bash
# GESTMAN Auto-Deploy Script
# Uso: bash deploy-gestman.sh

set -e

echo "🚀 GESTMAN Auto-Deploy Starting..."

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funzione di log
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Controlla se è root
if [[ $EUID -eq 0 ]]; then
   error "Non eseguire come root! Usa un utente normale con sudo."
fi

log "Aggiornamento sistema..."
sudo apt update && sudo apt upgrade -y

log "Installazione dipendenze base..."
sudo apt install -y nginx python3 python3-pip python3-venv git sqlite3 supervisor curl

log "Installazione Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

log "Creazione directory progetto..."
cd /home/$USER
rm -rf gestman-app 2>/dev/null || true
mkdir -p gestman-app
cd gestman-app

# Simula il tuo progetto (dovrai fare upload dei file)
log "Creazione struttura progetto..."
mkdir -p backend frontend
mkdir -p backend/uploads backend/floor_plans

log "Setup Python virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate

# Crea requirements.txt ottimizzato per produzione
cat > requirements.txt << 'EOF'
Flask==3.0.0
Flask-CORS==4.0.0
reportlab==4.0.7
gunicorn==21.2.0
python-dotenv==1.0.0
Werkzeug==3.0.1
EOF

log "Installazione dipendenze Python..."
pip install -r requirements.txt

# Configurazione Gunicorn
cat > gunicorn.conf.py << 'EOF'
import multiprocessing

bind = "127.0.0.1:5000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2
max_requests = 1000
max_requests_jitter = 50
preload_app = True
EOF

# File di ambiente
cat > .env << 'EOF'
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-change-this
DATABASE_PATH=/home/$USER/gestman-app
EOF

log "Configurazione Nginx..."
sudo tee /etc/nginx/sites-available/gestman > /dev/null << EOF
server {
    listen 80;
    server_name _;
    
    # Max upload size
    client_max_body_size 100M;
    
    # Frontend statico
    location / {
        root /home/$USER/gestman-app/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache headers per assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120;
        proxy_connect_timeout 120;
    }
    
    # Upload files
    location /uploads {
        alias /home/$USER/gestman-app/backend/uploads;
        expires 30d;
        add_header Cache-Control "public";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/gestman /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t

log "Configurazione Supervisor..."
sudo tee /etc/supervisor/conf.d/gestman.conf > /dev/null << EOF
[program:gestman]
command=/home/$USER/gestman-app/backend/venv/bin/gunicorn -c gunicorn.conf.py server:app
directory=/home/$USER/gestman-app/backend
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/gestman.log
environment=PATH="/home/$USER/gestman-app/backend/venv/bin"
EOF

log "Configurazione firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp  
sudo ufw allow 443/tcp
sudo ufw --force enable

log "Avvio servizi..."
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo supervisorctl reread
sudo supervisorctl update

# Crea script di deploy per aggiornamenti
cat > /home/$USER/update-gestman.sh << 'EOF'
#!/bin/bash
cd /home/$USER/gestman-app

echo "🔄 Aggiornamento GESTMAN..."

# Backup database
cp *.db backup/ 2>/dev/null || true

# Aggiorna codice (se hai Git)
# git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart backend
sudo supervisorctl restart gestman

echo "✅ Aggiornamento completato!"
EOF
chmod +x /home/$USER/update-gestman.sh

# Informazioni finali
IP=$(curl -s ifconfig.me)
log "🎉 DEPLOY COMPLETATO!"
echo
echo "📍 Il tuo sito è raggiungibile su:"
echo "   http://$IP"
echo
echo "📂 File progetto in: /home/$USER/gestman-app"
echo "📋 Log applicazione: tail -f /var/log/gestman.log"
echo "🔄 Per aggiornamenti: ./update-gestman.sh"
echo
warn "⚠️  PROSSIMI STEP OBBLIGATORI:"
echo "1. Carica i tuoi file Python in /home/$USER/gestman-app/backend/"
echo "2. Carica i file React in /home/$USER/gestman-app/frontend/"
echo "3. Carica i database .db nella directory principale"
echo "4. Esegui: sudo supervisorctl restart gestman"
echo "5. Configura dominio DNS verso IP: $IP"
echo
log "Script completato! 🚀"