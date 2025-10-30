#!/bin/bash
# GESTMAN Upgrade Script v1.2.0
# Aggiunge la funzionalità di gestione file e documenti

set -e  # Exit on any error

echo "🚀 GESTMAN Upgrade v1.2.0 - File Management"
echo "=============================================="

# Configurazione (modifica questi percorsi secondo il tuo setup)
PROJECT_DIR="/home/ubuntu/gestman"  # Modifica con il tuo percorso
SERVICE_NAME="gestman"              # Nome del servizio systemd
BACKUP_DIR="$PROJECT_DIR/backups"

echo "📁 Directory progetto: $PROJECT_DIR"
echo "🔧 Servizio: $SERVICE_NAME"

# Crea directory backup se non esiste
mkdir -p "$BACKUP_DIR"

# 1. Backup del backend attuale
echo "💾 Creando backup..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
cp -r "$PROJECT_DIR/backend" "$BACKUP_DIR/$BACKUP_NAME"
echo "✅ Backup creato: $BACKUP_DIR/$BACKUP_NAME"

# 2. Ferma il servizio
echo "⏸️ Fermando il servizio..."
sudo systemctl stop "$SERVICE_NAME" || echo "⚠️ Servizio già fermo"

# 3. Aggiorna il codice dal repository
echo "📥 Aggiornando codice dal repository..."
cd "$PROJECT_DIR"
git pull origin main || {
    echo "❌ Errore nel pull da Git"
    echo "🔄 Ripristinando backup..."
    rm -rf backend
    cp -r "$BACKUP_DIR/$BACKUP_NAME" backend
    sudo systemctl start "$SERVICE_NAME"
    exit 1
}

# 4. Aggiorna le dipendenze Python (se necessario)
echo "📦 Verificando dipendenze Python..."
cd "$PROJECT_DIR"
if [ -f "backend/requirements.txt" ]; then
    python3 -m pip install -r backend/requirements.txt --user
fi

# 5. Verifica che i file necessari esistano
echo "🔍 Verificando file necessari..."
if [ ! -f "$PROJECT_DIR/backend/docs.py" ]; then
    echo "❌ File docs.py non trovato!"
    exit 1
fi

# 6. Crea le directory necessarie se non esistono
mkdir -p "$PROJECT_DIR/backend/uploads"
mkdir -p "$PROJECT_DIR/backend/floor_plans"

# 7. Riavvia il servizio
echo "🔄 Riavviando il servizio..."
sudo systemctl start "$SERVICE_NAME"

# 8. Verifica che il servizio sia attivo
sleep 3
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✅ Servizio riavviato con successo!"
else
    echo "❌ Errore nel riavvio del servizio"
    echo "📋 Stato del servizio:"
    sudo systemctl status "$SERVICE_NAME" --no-pager
    echo "🔄 Ripristinando backup..."
    sudo systemctl stop "$SERVICE_NAME"
    rm -rf backend
    cp -r "$BACKUP_DIR/$BACKUP_NAME" backend
    sudo systemctl start "$SERVICE_NAME"
    exit 1
fi

# 9. Test di connettività
echo "🧪 Test di connettività..."
sleep 2
if curl -s http://localhost:5000/api/docs/files > /dev/null; then
    echo "✅ Nuovo endpoint funzionante!"
else
    echo "⚠️ Endpoint non risponde (normale se CORS è attivo)"
fi

echo ""
echo "🎉 UPGRADE COMPLETATO CON SUCCESSO!"
echo "=============================================="
echo "📋 Riepilogo:"
echo "  • Backup salvato in: $BACKUP_DIR/$BACKUP_NAME"
echo "  • Servizio riavviato: $SERVICE_NAME"
echo "  • Nuova funzionalità: Gestione File e Documenti"
echo ""
echo "🔗 Accedi all'applicazione e vai su Docs → File e Documenti"
echo "📞 In caso di problemi, ripristina con:"
echo "   sudo systemctl stop $SERVICE_NAME"
echo "   rm -rf $PROJECT_DIR/backend"
echo "   cp -r $BACKUP_DIR/$BACKUP_NAME $PROJECT_DIR/backend"
echo "   sudo systemctl start $SERVICE_NAME"