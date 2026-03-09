# Sistema di Tracciabilità Documenti - Guida Implementazione

## Panoramica
Sistema completo per tracciare e gestire i documenti PDF generati in GESTMAN, con storico, filtri e template predefiniti.

## Files Creati/Modificati

### Backend
1. **create_document_history_table.sql** - Script SQL per creazione tabella
2. **create_document_history.py** - Script Python per eseguire SQL
3. **docs.py** - Modificato con nuovi endpoint
4. **document_templates.json** - Template predefiniti

### Frontend
1. **DocumentHistory.jsx** - Componente React per storico
2. **DocumentHistory.css** - Stili componente

## Installazione Backend

### 1. Creare tabella document_history

Sul server di produzione:

```bash
cd ~/GESTMAN/backend
python create_document_history.py
```

Output atteso:
```
=== Creazione tabella document_history ===
✓ Tabella document_history creata con successo
✓ 6 indici creati
```

### 2. Verificare struttura tabella

```bash
sqlite3 compilazioni.db "PRAGMA table_info(document_history);"
```

### 3. Creare directory per documenti

```bash
mkdir -p ~/GESTMAN/backend/uploads/documents
chmod 755 ~/GESTMAN/backend/uploads/documents
```

### 4. Riavviare backend

```bash
sudo systemctl restart gestman-backend.service
```

## Nuovi Endpoint API

### Generazione Documento (Modificato)
```http
POST /api/docs/generate-document
Content-Type: application/json

{
  "blocks": [...],
  "variables": {...},
  "generated_by": "username",
  "metadata": {
    "title": "Rapporto Mensile Marzo 2026",
    "civico_numero": "001",
    "asset_id": "FRE-001",
    "periodo_inizio": "2026-03-01",
    "periodo_fine": "2026-03-31",
    "related_type": "manual",
    "related_ids": [1, 2, 3],
    "template_id": 1,
    "notes": "Report completo",
    "extra_params": {}
  }
}
```

**Risposta**: File PDF + salvataggio automatico in history

### Lista Documenti
```http
GET /api/docs/history?civico=001&from=2026-01-01&to=2026-03-31&generated_by=sandro&related_type=submission&limit=20&offset=0

Risposta:
{
  "documents": [
    {
      "id": 1,
      "filename": "document_sandro_20260309_193045.pdf",
      "title": "Rapporto Mensile Marzo",
      "generated_at": "2026-03-09 19:30:45",
      "generated_by": "sandro",
      "civico_numero": "001",
      "asset_id": "FRE-001",
      "periodo_inizio": "2026-03-01",
      "periodo_fine": "2026-03-31",
      "related_type": "manual",
      "related_ids": [1, 2, 3],
      "template_id": 1,
      "parameters": {...},
      "file_size_bytes": 45678,
      "notes": "Report completo"
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

### Dettaglio Documento
```http
GET /api/docs/history/1

Risposta:
{
  "id": 1,
  "filename": "...",
  "file_exists": true,
  "download_url": "/api/docs/download/1",
  ...tutti i campi...
}
```

### Download Documento
```http
GET /api/docs/download/1
```
Risposta: File PDF

### Elimina Documento
```http
DELETE /api/docs/history/1

Risposta:
{
  "success": true,
  "message": "Documento eliminato"
}
```

### Lista Template
```http
GET /api/docs/templates

Risposta:
{
  "templates": [
    {
      "id": 1,
      "name": "Rapporto Mensile Civico",
      "description": "...",
      "category": "civico",
      "parameters": [...],
      "blocks": [...]
    }
  ]
}
```

### Dettaglio Template
```http
GET /api/docs/templates/1
```

## Integrazione Frontend

### In Docs.jsx o App.jsx:

```jsx
import DocumentHistory from './components/DocumentHistory';

// Aggiungere rotta o tab
<Route path="/docs/history" element={<DocumentHistory currentUser={currentUser} />} />

// Oppure come tab dentro Docs:
<Tab label="Storico" value="history">
  <DocumentHistory currentUser={currentUser} />
</Tab>
```

### Modifica chiamata generate-document:

```javascript
// Prima (solo blocchi):
const response = await fetch('/api/docs/generate-document', {
  method: 'POST',
  body: JSON.stringify({ blocks, variables })
});

// Dopo (con metadati):
const response = await fetch('/api/docs/generate-document', {
  method: 'POST',
  body: JSON.stringify({
    blocks,
    variables,
    generated_by: currentUser.username,
    metadata: {
      title: documentTitle,
      civico_numero: selectedCivico,
      asset_id: selectedAsset,
      periodo_inizio: startDate,
      periodo_fine: endDate,
      related_type: 'manual',
      template_id: templateId,
      notes: userNotes
    }
  })
});
```

## Template Predefiniti

### 1. Rapporto Mensile Civico (ID: 1)
Parametri richiesti:
- civico_numero
- periodo_inizio
- periodo_fine

### 2. Verbale Intervento Singolo Asset (ID: 2)
Parametri richiesti:
- asset_id
- intervento_data
- operatore

### 3. Elenco Alert Aperti (ID: 3)
Parametri richiesti:
- data_report
- tipo_alert (opzionale)

## Uso Template da Frontend

```javascript
// Carica template
const response = await fetch('/api/docs/templates/1');
const template = await response.json();

// Chiedi parametri all'utente
const params = {};
template.parameters.forEach(param => {
  params[param.name] = prompt(param.label);
});

// Sostituisci variabili nei blocchi
const blocks = template.blocks.map(block => {
  // Sostituisci {{variabile}} con valore
  return replaceVariables(block, params);
});

// Genera documento
await fetch('/api/docs/generate-document', {
  method: 'POST',
  body: JSON.stringify({
    blocks,
    variables: params,
    generated_by: currentUser.username,
    metadata: {
      title: template.name,
      template_id: template.id,
      ...extractMetadata(params)
    }
  })
});
```

## Query Parametrizzate nei Template

I template supportano variabili nei filtri SQL:

```json
{
  "type": "table",
  "config": {
    "filters": [
      {
        "field": "civico",
        "operator": "=",
        "value": "{{civico_numero}}"
      }
    ]
  }
}
```

Le variabili vengono sostituite dal backend prima dell'esecuzione query.

## Testing

### 1. Test creazione tabella
```bash
python create_document_history.py
```

### 2. Test generazione documento con metadati
```bash
curl -X POST http://localhost:5000/api/docs/generate-document \
  -H "Content-Type: application/json" \
  -d '{
    "blocks": [{"type": "title", "config": {"text": "Test"}}],
    "generated_by": "test_user",
    "metadata": {
      "title": "Documento Test",
      "civico_numero": "001"
    }
  }' -o test.pdf
```

### 3. Test lista documenti
```bash
curl http://localhost:5000/api/docs/history
```

### 4. Test template
```bash
curl http://localhost:5000/api/docs/templates
```

## Manutenzione

### Pulizia documenti vecchi

```sql
-- Elimina documenti più vecchi di 6 mesi
DELETE FROM document_history 
WHERE generated_at < datetime('now', '-6 months');
```

### Backup documenti

```bash
# Backup database
cp compilazioni.db compilazioni_backup_$(date +%Y%m%d).db

# Backup files PDF
tar -czf documents_backup_$(date +%Y%m%d).tar.gz uploads/documents/
```

### Query utili

```sql
-- Documenti per utente
SELECT generated_by, COUNT(*) as count, SUM(file_size_bytes) as total_size
FROM document_history
GROUP BY generated_by
ORDER BY count DESC;

-- Documenti per periodo
SELECT DATE(generated_at) as date, COUNT(*) as count
FROM document_history
GROUP BY DATE(generated_at)
ORDER BY date DESC
LIMIT 30;

-- Documenti per tipo
SELECT related_type, COUNT(*) as count
FROM document_history
GROUP BY related_type;
```

## Troubleshooting

### Errore: Tabella document_history non esiste
```bash
python create_document_history.py
```

### Errore: Permessi directory uploads/documents
```bash
chmod 755 ~/GESTMAN/backend/uploads/documents
chown www-data:www-data ~/GESTMAN/backend/uploads/documents
```

### PDF non si scarica
Verifica che nginx serva la directory uploads:
```nginx
location /uploads {
    alias /path/to/backend/uploads;
}
```

## Prossimi Sviluppi

- [ ] Compressione automatica documenti vecchi
- [ ] Export storico in Excel
- [ ] Notifiche email quando documento pronto
- [ ] Anteprima documento prima generazione
- [ ] Editor template da interfaccia
- [ ] Condivisione documenti tra utenti
- [ ] Firma digitale documenti

## Supporto

Per problemi o domande, consultare i log:
```bash
sudo journalctl -u gestman-backend.service -f
```
