#!/bin/bash
# GESTMAN Mini PC Deploy Script
# Ottimizzato per hardware locale

set -e

echo "🖥️ GESTMAN Mini PC Deploy Starting..."

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

# Controlla hardware
log "Rilevamento hardware..."
CPU=$(lscpu | grep "Model name" | cut -d: -f2 | xargs)
RAM=$(free -h | grep Mem | awk '{print $2}')
DISK=$(df -h / | awk 'NR==2{print $2}')

echo "CPU: $CPU"
echo "RAM: $RAM" 
echo "Disk: $DISK"

if [[ $(nproc) -ge 2 ]] && [[ $(free -m | awk 'NR==2{print $2}') -ge 4000 ]]; then
    log "✅ Hardware idoneo per GESTMAN!"
else
    echo "⚠️ Hardware limitato, ma procediamo..."
fi

log "Aggiornamento sistema..."
sudo apt update && sudo apt upgrade -y

log "Installazione software ottimizzato per hardware locale..."
sudo apt install -y nginx python3 python3-pip python3-venv git sqlite3 supervisor
sudo apt install -y htop neofetch curl wget ufw fail2ban

# Installazione Node.js
log "Installazione Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installazione Cloudflare Tunnel (per accesso internet facile)
log "Installazione Cloudflare Tunnel..."
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Setup progetto
log "Setup GESTMAN..."
cd $HOME
rm -rf gestman-app 2>/dev/null || true
mkdir -p gestman-app/{backend,frontend}
cd gestman-app/backend

# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Requirements ottimizzati per mini PC
cat > requirements.txt << 'EOF'
Flask==3.0.0
Flask-CORS==4.0.0
reportlab==4.0.7
gunicorn==21.2.0
python-dotenv==1.0.0
Werkzeug==3.0.1
EOF

pip install -r requirements.txt

# Configurazione Gunicorn per mini PC (più workers)
cat > gunicorn.conf.py << 'EOF'
import multiprocessing

# Sfruttiamo tutti i core disponibili
workers = multiprocessing.cpu_count()
bind = "127.0.0.1:5000"
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
worker_tmp_dir = "/dev/shm"  # RAM disk per performance
EOF

# Nginx ottimizzato per mini PC
sudo tee /etc/nginx/sites-available/gestman > /dev/null << 'EOF'
server {
    listen 80;
    server_name localhost _;
    
    client_max_body_size 100M;
    
    # Gzip per risparmiare banda
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    
    location / {
        root /home/USER_PLACEHOLDER/gestman-app/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache aggressivo per assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Sostituisci placeholder con utente corrente
sudo sed -i "s/USER_PLACEHOLDER/$USER/g" /etc/nginx/sites-available/gestman
sudo ln -sf /etc/nginx/sites-available/gestman /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Supervisor per auto-restart
sudo tee /etc/supervisor/conf.d/gestman.conf > /dev/null << EOF
[program:gestman]
command=$HOME/gestman-app/backend/venv/bin/gunicorn -c gunicorn.conf.py server:app
directory=$HOME/gestman-app/backend
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/gestman.log
EOF

# Sicurezza base
log "Configurazione sicurezza..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Monitoraggio risorse
cat > $HOME/monitor-gestman.sh << 'EOF'
#!/bin/bash
echo "🖥️ GESTMAN System Monitor"
echo "========================"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')"
echo "RAM Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
echo
echo "🌐 Network Status:"
ping -c 1 8.8.8.8 > /dev/null && echo "✅ Internet OK" || echo "❌ Internet DOWN"
echo
echo "📊 GESTMAN Status:"
sudo supervisorctl status gestman
echo
echo "📋 Latest Logs:"
tail -5 /var/log/gestman.log
EOF
chmod +x $HOME/monitor-gestman.sh

# Avvio servizi
sudo systemctl restart nginx
sudo supervisorctl reread && sudo supervisorctl update

# IP locale
LOCAL_IP=$(hostname -I | awk '{print $1}')

log "🎉 DEPLOY MINI PC COMPLETATO!"
echo
echo "📍 Accesso locale: http://$LOCAL_IP"
echo "📍 Accesso localhost: http://localhost"  
echo "🖥️  Monitoring: ./monitor-gestman.sh"
echo
echo "🌐 Per accesso da internet:"
echo "1. Configura port forwarding router (porta 80)"
echo "2. Oppure usa Cloudflare Tunnel:"
echo "   cloudflared tunnel login"
echo "   cloudflared tunnel create gestman"
echo "   cloudflared tunnel route dns gestman tuodominio.com"
echo "   cloudflared tunnel run gestman"
echo
echo "📂 Ora carica i tuoi file in:"
echo "   Backend: $HOME/gestman-app/backend/"
echo "   Frontend: $HOME/gestman-app/frontend/"
echo "   Database: $HOME/gestman-app/"