# GESTMAN Deployment Guide - Ubuntu 24.04.3 LTS
# Guida completa per deployment su mini-PC Lenovo

## 📋 PREPARAZIONE PRE-INSTALLAZIONE

### 1. Download Ubuntu Server 24.04.3 LTS
```bash
# URL ufficiale: https://ubuntu.com/download/server
# File: ubuntu-24.04.3-live-server-amd64.iso
# Dimensione: ~1.8GB
# SHA256: verificare sempre l'integrità del download
```

### 2. Creazione USB Bootable
```bash
# Windows: Rufus, Etcher, o Windows Media Creation Tool
# Linux/Mac: 
dd if=ubuntu-24.04.3-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
```

## 🖥️ CONFIGURAZIONE HARDWARE MINI-PC LENOVO

### Specifiche Raccomandate:
- **RAM**: Minimo 4GB, raccomandato 8GB+
- **Storage**: SSD da 128GB+ (per performance)
- **Rete**: Ethernet cablato (più stabile di WiFi)
- **USB**: 2+ porte per tastiera e storage

### BIOS Settings:
- **Secure Boot**: Disabled (per compatibilità)
- **Boot Order**: USB First
- **Wake on LAN**: Enabled (per gestione remota)
- **Power Management**: Restart after power failure

## 🚀 INSTALLAZIONE UBUNTU 24.04.3

### Configurazione Durante Installazione:

```yaml
Language: English
Keyboard: Italian (o la tua lingua)
Network: 
  - Ethernet: Auto DHCP (poi configurerai IP statico)
  - WiFi: Skip (usa ethernet per stabilità)

Storage Configuration:
  - Use entire disk
  - Set up LVM: YES (per flessibilità futura)
  - Encrypt: NO (per semplicità, opzionale per sicurezza alta)

Partitioning (esempio per SSD 256GB):
  /boot/efi: 512MB
  /: 50GB (sistema)
  /var: 30GB (logs, cache)
  /opt: 120GB (GESTMAN app)
  swap: 4GB
  /home: resto

Profile Setup:
  Your name: GESTMAN Administrator
  Server name: gestman-server
  Username: gestman
  Password: [password sicura - cambierai dopo]

SSH Setup: 
  ✅ Install OpenSSH server
  ✅ Import SSH identity: No (configurerai dopo)

Snaps: 
  ✅ docker (utile per futuro)

Security Updates: 
  ✅ Install security updates automatically
```

## 🔧 POST-INSTALLAZIONE IMMEDIATA

### Primo Accesso e Aggiornamenti:
```bash
# Login come gestman
sudo apt update && sudo apt full-upgrade -y
sudo reboot

# Verifica versioni installate
python3 --version  # Dovrebbe essere 3.12.x
node --version     # Dovrebbe essere 18.x+
nginx -v          # Dovrebbe essere 1.24.x+
```

### Setup Rete Statica (Raccomandato per Server):
```bash
# Identifica interfaccia di rete
ip addr show

# Configura IP statico
sudo nano /etc/netplan/00-installer-config.yaml

# Esempio configurazione:
network:
  ethernets:
    enp1s0:  # Il tuo nome interfaccia
      dhcp4: false
      addresses:
        - 192.168.1.100/24  # IP statico nel tuo range
      gateway4: 192.168.1.1  # Il tuo router
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
  version: 2

# Applica configurazione
sudo netplan apply
```

## 🛡️ SICUREZZA E HARDENING

### Setup SSH Key (Molto Importante):
```bash
# Sul tuo PC Windows (in PowerShell):
ssh-keygen -t ed25519 -C "gestman@tuodominio.com"

# Copia chiave pubblica su server:
scp ~/.ssh/id_ed25519.pub gestman@IP_SERVER:~/.ssh/authorized_keys

# Sul server, hardening SSH:
sudo nano /etc/ssh/sshd_config

# Modifica queste righe:
PermitRootLogin no
PasswordAuthentication no  # SOLO dopo aver testato SSH key
Port 2222  # Cambia porta default (opzionale ma raccomandato)
MaxAuthTries 3
ClientAliveInterval 300

sudo systemctl restart ssh
```

### Firewall Configurazione:
```bash
sudo ufw enable
sudo ufw allow 2222/tcp  # SSH (se hai cambiato porta)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw status verbose
```

## 📦 ESECUZIONE SETUP AUTOMATICO

Dopo l'installazione base, esegui lo script di setup:

```bash
# Copia script su server
scp setup-gestman-ubuntu.sh gestman@IP_SERVER:~/

# Sul server:
chmod +x setup-gestman-ubuntu.sh
sudo ./setup-gestman-ubuntu.sh
```

## 🌐 CONFIGURAZIONE DOMINIO

### DNS Setup (presso il tuo provider):
```dns
Tipo    Nome    Valore              TTL
A       @       TUO_IP_PUBBLICO     300
A       www     TUO_IP_PUBBLICO     300
CNAME   api     tuodominio.com      300
```

### Router Port Forwarding:
```
Servizio     Porta Esterna    Porta Interna    IP Interno
HTTP         80              80               192.168.1.100
HTTPS        443             443              192.168.1.100  
SSH          2222            2222             192.168.1.100
```

## 🔒 SSL/HTTPS Setup

Dopo che il DNS è propagato:
```bash
# Installa certificato SSL automatico
sudo certbot --nginx -d tuodominio.com -d www.tuodominio.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 📊 MONITORAGGIO E MANUTENZIONE

### Comandi Utili Ubuntu 24.04.3:
```bash
# Stato servizi
systemctl status gestman-backend nginx

# Log real-time
journalctl -u gestman-backend -f
tail -f /var/log/nginx/gestman_error.log

# Risorse sistema
htop
df -h
free -h

# Aggiornamenti sistema
sudo apt list --upgradable
sudo apt upgrade

# Backup manuale
/opt/gestman/scripts/backup.sh

# Deploy aggiornamenti
/opt/gestman/scripts/deploy.sh
```

## 🚨 TROUBLESHOOTING COMUNE

### Python 3.12 Issues:
```bash
# Se ci sono problemi con Python 3.12:
sudo apt install python3.12-venv python3.12-dev

# Ricrea virtual environment:
cd /opt/gestman
rm -rf venv
python3.12 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Node.js Aggiornamento:
```bash
# Se serve versione Node.js più recente:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## ✅ VANTAGGI UBUNTU 24.04.3 PER GESTMAN

1. **Performance**: Python 3.12 è ~15% più veloce
2. **Sicurezza**: Patch di sicurezza più recenti
3. **Supporto**: LTS fino al 2029 (5 anni di tranquillità)
4. **Compatibilità**: Tutto il tuo stack funziona perfettamente
5. **Stabilità**: Base solida per produzione

Perfetto! Con Ubuntu 24.04.3 LTS hai scelto la migliore base possibile per il tuo server GESTMAN. 

Vuoi che proceda con qualche configurazione specifica o hai domande su particolari aspetti del deployment?