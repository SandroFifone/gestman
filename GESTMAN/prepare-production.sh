#!/bin/bash
# Script per preparare GESTMAN per deployment in produzione
# File: prepare-production.sh

set -e

echo "🚀 Preparazione GESTMAN per produzione..."

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m' 
RED='\033[0;31m'
NC='\033[0m'

# Directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo -e "${YELLOW}📁 Working directory: $SCRIPT_DIR${NC}"

# 1. CONTROLLO PREREQUISITI
echo -e "${GREEN}1. Controllo prerequisiti...${NC}"

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installa Node.js 18+${NC}"
    exit 1
fi

# Verifica Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 non trovato${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisiti OK${NC}"

# 2. BACKEND - PREPARAZIONE
echo -e "${GREEN}2. Preparazione Backend...${NC}"

cd "$BACKEND_DIR"

# Crea virtual environment se non esiste
if [ ! -d "venv" ]; then
    echo "Creazione virtual environment..."
    python3 -m venv venv
fi

# Attiva venv e installa dipendenze
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Copia configurazione produzione
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo -e "${GREEN}✅ Configurazione produzione applicata${NC}"
fi

# Test rapido backend
echo "Test backend..."
python -c "
import sys
sys.path.append('.')
try:
    import main
    print('✅ Backend importato correttamente')
except Exception as e:
    print(f'❌ Errore backend: {e}')
    sys.exit(1)
"

cd "$SCRIPT_DIR"

# 3. FRONTEND - BUILD PRODUZIONE
echo -e "${GREEN}3. Build Frontend per produzione...${NC}"

cd "$FRONTEND_DIR"

# Installa dipendenze
echo "Installazione dipendenze npm..."
npm ci --production=false

# Build per produzione
echo "Build produzione React..."
NODE_ENV=production npm run build

# Verifica build
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Build frontend fallita - directory dist non trovata${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build frontend completato${NC}"

cd "$SCRIPT_DIR"

# 4. CREAZIONE PACKAGE DEPLOY
echo -e "${GREEN}4. Creazione package per deploy...${NC}"

# Crea directory deploy se non esiste
mkdir -p deploy

# Crea archivio per deploy
DEPLOY_ARCHIVE="deploy/gestman-production-$(date +%Y%m%d_%H%M%S).tar.gz"

tar -czf "$DEPLOY_ARCHIVE" \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.log' \
    --exclude='.git' \
    --exclude='deploy' \
    --exclude='.vscode' \
    --exclude='*.pyc' \
    backend/ \
    frontend/ \
    *.sh \
    *.md \
    *.db 2>/dev/null || true

# 5. ISTRUZIONI FINALI
echo ""
echo -e "${GREEN}🎉 Preparazione completata!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}📦 Package creato:${NC} $DEPLOY_ARCHIVE"
echo ""
echo -e "${YELLOW}📋 PROSSIMI PASSI:${NC}"
echo "1. Trasferisci il package sul server:"
echo "   scp $DEPLOY_ARCHIVE gestman@tuoserver:/home/gestman/"
echo ""
echo "2. Sul server, estrai e installa:"
echo "   tar -xzf gestman-production-*.tar.gz"
echo "   sudo ./setup-gestman-ubuntu.sh"
echo ""
echo "3. Configura dominio e SSL:"
echo "   sudo certbot --nginx -d tuodominio.com"
echo ""
echo -e "${GREEN}✅ GESTMAN pronto per il deployment!${NC}"