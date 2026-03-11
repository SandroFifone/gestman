#!/bin/bash
# Script per rebuild frontend dopo fix paginazione API

echo "=============================================="
echo "GESTMAN - Rebuild Frontend"
echo "Fix: Breaking changes API paginazione"
echo "=============================================="
echo ""

cd ~/GESTMAN/frontend

# Verifica che node_modules esista
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules non trovato, eseguo npm install..."
  npm install
fi

echo "📦 Building frontend..."
npm run build

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Build completato con successo!"
  echo ""
  echo "📊 Statistiche build:"
  du -sh dist/
  echo ""
  echo "🔍 Verifica file modificati:"
  ls -lh dist/assets/*.js | head -5
  echo ""
  echo "✅ Frontend aggiornato e pronto!"
  echo ""
  echo "🧪 Test manuale:"
  echo "1. Apri http://192.168.1.100:5173 o la tua URL"
  echo "2. Vai su Alert/Tickets → deve caricare senza errori"
  echo "3. Vai su Documents → deve caricare senza errori"
  echo "4. Vai su Calendario → deve caricare senza errori"
  echo ""
else
  echo ""
  echo "❌ Build fallito! Controlla gli errori sopra."
  exit 1
fi
