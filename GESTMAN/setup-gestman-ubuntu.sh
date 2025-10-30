#!/bin/bash
# Setup completo GESTMAN su Ubuntu 24.04.3 LTS
# File: setup-gestman-ubuntu.sh

set -e  # Exit on any error

echo "🚀 GESTMAN Setup su Ubuntu 24.04.3 LTS"
echo "======================================="

# Variabili configurazione
DOMAIN="tuodominio.com"  # CAMBIA CON IL TUO DOMINIO
GESTMAN_USER="sandro"     # Utente effettivo del sistema
GESTMAN_DIR="/opt/gestman"
BACKUP_DIR="/opt/gestman/backups"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica che lo script sia eseguito come root per alcune operazioni
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Questo script deve essere eseguito con privilegi sudo"
        echo "Usa: sudo bash setup-gestman-ubuntu.sh"
        exit 1
    fi
}

# 1. AGGIORNAMENTO SISTEMA
update_system() {
    print_status "Aggiornamento sistema Ubuntu 24.04.3 LTS..."
    apt update && apt upgrade -y
    
    print_status "Installazione pacchetti base..."
    apt install -y curl wget git vim htop tree unzip fail2ban ufw
    apt install -y build-essential software-properties-common
    apt install -y python3 python3-pip python3-venv python3-dev
    apt install -y nginx sqlite3 nodejs npm
    apt install -y certbot python3-certbot-nginx
    apt install -y snapd  # Per installazioni moderne
    
    print_status "Sistema aggiornato con successo ✅"
}

# 2. CONFIGURAZIONE FIREWALL
setup_firewall() {
    print_status "Configurazione firewall UFW..."
    ufw --force enable
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw status verbose
    
    print_status "Firewall configurato ✅"
}

# 3. CREAZIONE UTENTE E STRUTTURA DIRECTORY
setup_user_and_dirs() {
    print_status "Creazione utente $GESTMAN_USER e struttura directory..."
    
    # Crea utente se non esiste
    if ! id "$GESTMAN_USER" &>/dev/null; then
        useradd -m -s /bin/bash $GESTMAN_USER
        usermod -aG sudo $GESTMAN_USER
        print_status "Utente $GESTMAN_USER creato"
    else
        print_status "Utente $GESTMAN_USER già esistente"
    fi
    
    # Crea struttura directory
    mkdir -p $GESTMAN_DIR/{backend,frontend,logs,backups,scripts,uploads}
    chown -R $GESTMAN_USER:$GESTMAN_USER $GESTMAN_DIR
    
    # Directory web
    mkdir -p /var/www/gestman
    chown -R www-data:www-data /var/www/gestman
    
    print_status "Struttura directory creata ✅"
}

# 4. SETUP PYTHON VIRTUAL ENVIRONMENT
setup_python_env() {
    print_status "Setup Python virtual environment..."
    
    cd $GESTMAN_DIR
    sudo -u $GESTMAN_USER python3 -m venv venv
    sudo -u $GESTMAN_USER bash -c "source venv/bin/activate && pip install --upgrade pip"
    
    # Installa dipendenze base
    sudo -u $GESTMAN_USER bash -c "source venv/bin/activate && pip install flask flask-cors werkzeug requests python-dateutil reportlab"
    
    print_status "Python environment pronto ✅"
}

# 5. CONFIGURAZIONE NGINX
setup_nginx() {
    print_status "Configurazione Nginx..."
    
    # Backup configurazione originale
    cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # Crea configurazione GESTMAN
    cat > /etc/nginx/sites-available/gestman << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    root /var/www/gestman;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /uploads {
        alias /opt/gestman/backend/uploads;
        expires 30d;
    }
    
    client_max_body_size 50M;
    
    access_log /var/log/nginx/gestman_access.log;
    error_log /var/log/nginx/gestman_error.log;
}
EOF
    
    # Sostituisci placeholder con dominio reale
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/gestman
    
    # Abilita sito
    ln -sf /etc/nginx/sites-available/gestman /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configurazione
    nginx -t
    systemctl restart nginx
    systemctl enable nginx
    
    print_status "Nginx configurato ✅"
}

# 6. SETUP SYSTEMD SERVICE PER BACKEND
setup_systemd_service() {
    print_status "Creazione systemd service per backend..."
    
    cat > /etc/systemd/system/gestman-backend.service << EOF
[Unit]
Description=GESTMAN Backend API
After=network.target

[Service]
Type=simple
User=$GESTMAN_USER
Group=$GESTMAN_USER
WorkingDirectory=$GESTMAN_DIR/backend
Environment=PATH=$GESTMAN_DIR/venv/bin
ExecStart=$GESTMAN_DIR/venv/bin/python server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable gestman-backend
    
    print_status "Systemd service creato ✅"
}

# 7. CONFIGURAZIONE BACKUP AUTOMATICO
setup_backup() {
    print_status "Configurazione backup automatico..."
    
    # Script di backup
    cat > $GESTMAN_DIR/scripts/backup.sh << 'EOF'
#!/bin/bash
# Backup automatico GESTMAN

BACKUP_DIR="/opt/gestman/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="gestman_backup_$DATE.tar.gz"

# Crea directory backup se non esiste
mkdir -p $BACKUP_DIR

# Backup database e file
cd /opt/gestman
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude='venv' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='*.log' \
    backend/ \
    *.db

# Mantieni solo gli ultimi 7 backup
cd $BACKUP_DIR
ls -t gestman_backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completato: $BACKUP_FILE"
EOF
    
    chmod +x $GESTMAN_DIR/scripts/backup.sh
    chown $GESTMAN_USER:$GESTMAN_USER $GESTMAN_DIR/scripts/backup.sh
    
    # Cron job per backup quotidiano alle 2:00
    (crontab -u $GESTMAN_USER -l 2>/dev/null; echo "0 2 * * * $GESTMAN_DIR/scripts/backup.sh") | crontab -u $GESTMAN_USER -
    
    print_status "Backup automatico configurato (quotidiano ore 2:00) ✅"
}

# 8. CONFIGURAZIONE FAIL2BAN
setup_fail2ban() {
    print_status "Configurazione Fail2Ban..."
    
    # Configurazione per Nginx
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    print_status "Fail2Ban configurato ✅"
}

# 9. CREAZIONE SCRIPT DI DEPLOY
create_deploy_script() {
    print_status "Creazione script di deploy..."
    
    cat > $GESTMAN_DIR/scripts/deploy.sh << 'EOF'
#!/bin/bash
# Script di deploy per aggiornamenti GESTMAN

set -e

GESTMAN_DIR="/opt/gestman"
WEB_DIR="/var/www/gestman"

echo "🚀 Deploy GESTMAN in corso..."

# Backup prima del deploy
$GESTMAN_DIR/scripts/backup.sh

# Stop backend service
sudo systemctl stop gestman-backend

# Update backend
cd $GESTMAN_DIR/backend
source ../venv/bin/activate
pip install -r requirements.txt

# Build frontend
cd $GESTMAN_DIR/frontend
npm ci --production
npm run build

# Deploy frontend
sudo rm -rf $WEB_DIR/*
sudo cp -r dist/* $WEB_DIR/
sudo chown -R www-data:www-data $WEB_DIR

# Start backend service
sudo systemctl start gestman-backend

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Deploy completato con successo!"
EOF
    
    chmod +x $GESTMAN_DIR/scripts/deploy.sh
    chown $GESTMAN_USER:$GESTMAN_USER $GESTMAN_DIR/scripts/deploy.sh
    
    print_status "Script di deploy creato ✅"
}

# 10. RIEPILOGO FINALE
print_summary() {
    echo ""
    echo "🎉 GESTMAN Setup completato con successo!"
    echo "======================================="
    echo ""
    echo "📁 Directory principale: $GESTMAN_DIR"
    echo "👤 Utente: $GESTMAN_USER"
    echo "🌐 Dominio configurato: $DOMAIN"
    echo ""
    echo "📋 PROSSIMI PASSI:"
    echo "1. Copia i file del progetto in $GESTMAN_DIR/"
    echo "2. Configura il dominio DNS verso questo server"
    echo "3. Esegui: sudo certbot --nginx -d $DOMAIN"
    echo "4. Avvia backend: sudo systemctl start gestman-backend"
    echo ""
    echo "🔧 COMANDI UTILI:"
    echo "- Stato servizi: sudo systemctl status gestman-backend nginx"
    echo "- Log backend: journalctl -u gestman-backend -f"
    echo "- Log Nginx: tail -f /var/log/nginx/gestman_error.log"
    echo "- Deploy: $GESTMAN_DIR/scripts/deploy.sh"
    echo "- Backup: $GESTMAN_DIR/scripts/backup.sh"
    echo ""
    print_status "Sistema pronto per il deployment! 🚀"
}

# ESECUZIONE PRINCIPALE
main() {
    check_sudo
    
    print_status "Inizio setup GESTMAN su Ubuntu 24.04.3 LTS"
    
    update_system
    setup_firewall
    setup_user_and_dirs
    setup_python_env
    setup_nginx
    setup_systemd_service
    setup_backup
    setup_fail2ban
    create_deploy_script
    
    print_summary
}

# Esegui solo se script chiamato direttamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi