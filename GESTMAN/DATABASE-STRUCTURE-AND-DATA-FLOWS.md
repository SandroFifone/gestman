# 📊 GESTMAN - Analisi Completa Database e Flussi Dati
## Documentazione Tecnica Sistema - Marzo 2026

---

## 📋 INDICE

1. [Panoramica Sistema](#panoramica)
2. [Database gestman.db](#gestman-db)
3. [Database compilazioni.db](#compilazioni-db)
4. [Flussi Dati Principali](#flussi-dati)
5. [Mapping API → Database](#mapping-api)
6. [Relazioni tra Tabelle](#relazioni)
7. [Scripts e Popolamento](#scripts)

---

<a name="panoramica"></a>
## 🏗️ PANORAMICA SISTEMA

### Architettura Database
GESTMAN utilizza **2 database SQLite separati**:

| Database | Scopo | Tabelle | Dimensione Tipica |
|----------|-------|---------|-------------------|
| **gestman.db** | Dati operativi (civici, assets, utenti) | 8 | ~5-50 MB |
| **compilazioni.db** | Attività e tracciamento (form, alert, calendario) | 21 | ~10-100 MB |

### Motivazione Separazione
- **Performance**: Query diverse non interferiscono
- **Backup**: Possibilità di backup differenziati
- **Sicurezza**: Dati utenti vs dati operativi
- **Scalabilità**: Possibile migrazione futura su DB diversi

---

<a name="gestman-db"></a>
## 🗄️ DATABASE: gestman.db

### Schema Generale
```
civici (numero, descrizione)
  └─→ assets (id_aziendale, tipo, dati JSON, civico_numero FK)
        └─→ asset_types (schema campi dinamici)

users (id, username, password, is_admin)
  ├─→ user_notes (note personali)
  ├─→ user_sections (permessi menu)
  └─→ user_widgets (dashboard)

document_templates (template documenti PDF)
```

---

### 1. civici
**Scopo**: Anagrafica edifici/immobili gestiti

```sql
CREATE TABLE civici (
    numero TEXT PRIMARY KEY,
    descrizione TEXT
);
```

**Popolamento**:
```python
# File: civici.py

# INSERT nuovo civico
POST /api/civici
Body: { "numero": "001", "descrizione": "Palazzo A" }
→ db.execute('INSERT INTO civici (numero, descrizione) VALUES (?, ?)', (...))

# UPDATE descrizione
PATCH /api/civici/:numero
Body: { "descrizione": "Palazzo A - Ristrutturato" }
→ db.execute('UPDATE civici SET descrizione = ? WHERE numero = ?', (...))
```

**Utilizzo**:
- FK in `assets.civico_numero`
- Filtro in alert, scadenze, form submissions
- Dropdown selezione civico in frontend

---

### 2. assets
**Scopo**: Anagrafica beni/impianti (frigoriferi, frese, camini, etc.)

```sql
CREATE TABLE assets (
    id_aziendale TEXT PRIMARY KEY,    -- es. "FRE-001"
    tipo TEXT NOT NULL,                -- es. "Frigorifero"
    dati TEXT,                         -- JSON campi dinamici
    doc_tecnica TEXT,                  -- JSON documenti tecnici
    civico_numero TEXT,                -- FK → civici.numero
    ubicazione TEXT                    -- es. "Piano 2, Cucina"
);
```

**Campo `dati` (JSON dinamico)**:
```json
{
  "marca": "Whirlpool",
  "modello": "WX5000",
  "capacita": "450",
  "anno_installazione": "2020",
  "matricola": "WX5000-12345"
}
```
Schema definito da `asset_types.fields_template`

**Popolamento**:
```python
# File: server.py

# INSERT nuovo asset
POST /api/assets
Body: {
  "id_aziendale": "FRE-001",
  "tipo": "Frigorifero",
  "civico_numero": "001",
  "dati": { "marca": "Whirlpool", ... }
}
→ conn.execute("INSERT INTO assets (...) VALUES (...)", ...)
# Linea 243

# UPDATE asset esistente
PUT /api/assets/:id_aziendale
Body: { "dati": { "marca": "Samsung", ... } }
→ conn.execute(f"UPDATE assets SET {set_clause} WHERE id_aziendale = ?", values)
# Linee 272-327
```

**Relazioni**:
- Ogni asset appartiene a 1 civico (FK soft)
- Riferito in `scadenze_calendario.asset_id`
- Riferito in `alert.asset`
- Riferito in `form_submissions.asset_id`

---

### 3. asset_types
**Scopo**: Definisce schemi dinamici per tipi di asset (metadati)

```sql
CREATE TABLE asset_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,         -- "Frigorifero", "Fresa", etc.
    description TEXT,
    fields_template TEXT NOT NULL,     -- JSON schema campi
    fields_order TEXT,                 -- Array ordine campi
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Esempio `fields_template`**:
```json
{
  "marca": {
    "type": "text",
    "label": "Marca",
    "required": true,
    "placeholder": "es. Whirlpool"
  },
  "modello": {
    "type": "text",
    "label": "Modello",
    "required": false
  },
  "capacita": {
    "type": "number",
    "label": "Capacità (litri)",
    "min": 0,
    "max": 1000
  },
  "anno_installazione": {
    "type": "number",
    "label": "Anno Installazione",
    "min": 1990,
    "max": 2030
  }
}
```

**Popolamento**:
```python
# File: asset_types.py

# INSERT nuovo tipo
POST /api/asset-types
Body: {
  "name": "Frigorifero",
  "description": "Elettrodomestico refrigerazione",
  "fields_template": { ... },
  "fields_order": ["marca", "modello", "capacita", ...]
}
→ cursor.execute("INSERT INTO asset_types (...) VALUES (...)", ...)
# Linea 187

# UPDATE tipo esistente (con cleanup assets)
PUT /api/asset-types/:id
→ Aggiorna fields_template
→ Rimuove campi obsoleti da assets.dati (se campi eliminati)
# Linee 272-290
```

**Logica Aggiornamento Dinamico**:
Quando un campo viene rimosso da `fields_template`, il sistema:
1. Identifica campi eliminati (diff tra old/new template)
2. UPDATE tutti gli assets di quel tipo → rimuove campi obsoleti dal JSON `dati`
3. Mantiene coerenza schema

---

### 4. users
**Scopo**: Autenticazione e gestione utenti

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,            -- hash bcrypt
    is_admin INTEGER DEFAULT 0,
    password_clear TEXT,               -- [DEPRECATO] password in chiaro
    nome TEXT                          -- nome completo opzionale
);
```

**Popolamento**:
```python
# File: server.py

# Registrazione nuovo utente
POST /api/register
Body: { "username": "mario", "password": "secret123", "nome": "Mario Rossi" }
→ password_hash = generate_password_hash(password)
→ conn.execute("INSERT INTO users (...) VALUES (...)", ...)
# Linea 444

# Modifica profilo
PATCH /api/users/:id
→ Aggiorna nome, password, sezioni abilitate
# Linea 483

# Inizializzazione DB vuoto
# Crea admin di default (username: admin, password: admin)
# Linea 991
```

**Sicurezza**:
- Password hashate con bcrypt (werkzeug.security)
- Campo `password_clear` da rimuovere in futuro (security issue)
- Session token gestito da Flask

---

### 5. user_notes
**Scopo**: Note personali salvate per ogni utente (widget dashboard)

```sql
CREATE TABLE user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Popolamento**:
```python
# File: server.py

# Salva/Aggiorna note utente
POST /api/users/:username/notes
Body: { "notes": "Promemoria: controllare frigorifero 001" }
→ Logica UPSERT:
   - Se esiste record → UPDATE
   - Se non esiste → INSERT
# Linee 654-660, 729-735
```

---

### 6. user_sections
**Scopo**: Controllo permessi sezioni menu per utente

```sql
CREATE TABLE user_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    section TEXT NOT NULL,             -- "calendario", "assets", "compilazioni", etc.
    UNIQUE(user_id, section),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Popolamento**:
```python
# File: server.py

# Aggiungi sezione a utente
POST /api/users/:id/sections
Body: { "section": "calendario" }
→ INSERT INTO user_sections (user_id, section) VALUES (?, ?)
# Linea 919
```

**Utilizzo Frontend**:
```javascript
// Sidebar.jsx controlla se utente ha accesso a sezione
const hasAccess = (section) => {
  if (isAdmin) return true;
  return userSections.includes(section);
};
```

---

### 7. user_widgets
**Scopo**: Widget personalizzati dashboard utente

```sql
CREATE TABLE user_widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    section TEXT NOT NULL,             -- nome widget (es: "alert_summary")
    position INTEGER NOT NULL,         -- ordine visualizzazione
    created_at TIMESTAMP,
    UNIQUE(user_id, section),
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Popolamento**:
```python
# File: server.py

# Aggiungi widget a dashboard
POST /api/users/:username/widgets
Body: { "section": "alert_summary", "position": 1 }
→ INSERT INTO user_widgets (...) VALUES (...)
# Linea 818
```

**Widget Disponibili**:
- `alert_summary`: Riepilogo alert aperti
- `scadenze_prossime`: Prossime scadenze 7 giorni
- `assets_overview`: Conteggio assets per tipo
- `user_notes`: Note personali

---

### 8. document_templates
**Scopo**: Template salvati per generazione documenti PDF

```sql
CREATE TABLE document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by TEXT NOT NULL,          -- username
    shared INTEGER DEFAULT 0,          -- 0=privato, 1=condiviso
    blocks TEXT NOT NULL,              -- JSON array blocchi documento
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Esempio `blocks`**:
```json
[
  {
    "type": "title",
    "config": {
      "text": "Rapporto Mensile {{civico}}",
      "level": "h1",
      "align": "center"
    }
  },
  {
    "type": "table",
    "config": {
      "database": "compilazioni",
      "table": "form_submissions",
      "columns": ["id", "submitted_at", "asset_id"],
      "filters": [{"field": "civico_numero", "operator": "=", "value": "{{civico}}"}]
    }
  }
]
```

**Popolamento**:
```python
# File: docs.py

# Salva template
POST /api/docs/templates
Body: { "name": "Report Mensile", "blocks": [...] }
→ INSERT INTO document_templates (...) VALUES (...)
# Linea 876

# Aggiorna template
PUT /api/docs/templates/:id
→ UPDATE document_templates SET blocks = ?, updated_at = ? WHERE id = ?
# Linea 925
```

---

<a name="compilazioni-db"></a>
## 🗄️ DATABASE: compilazioni.db

### Schema Generale
```
ALERT SYSTEM
  alert (id, tipo, titolo, civico, asset, stato)

CALENDARIO
  scadenze_calendario (id, titolo, frequenza, data_prossima)
    ├─→ manutenzione_tipologie (colore, icona)
    ├─→ manutenzione_checklist_template
    ├─→ manutenzione_programmata_checklist
    ├─→ manutenzione_checklist_risultati
    └─→ scadenze_storico_esecuzioni

FORM DINAMICI
  form_templates (id, name, category)
    ├─→ form_fields (campi dinamici)
    └─→ form_submissions (compilazioni)

DOCUMENTI
  document_history (tracciamento PDF generati)

MAGAZZINO
  magazzino_ricambi (codice, quantita)
    └─→ magazzino_movimenti (carico/scarico)

TELEGRAM
  telegram_config (bot token)
  telegram_chats (chat registrate)
  telegram_logs (messaggi inviati)

RUBRICA
  rubrica_contatti
  rubrica_categorie
```

---

### 1. alert
**Scopo**: Sistema centralizzato notifiche/alert/non conformità/tickets

```sql
CREATE TABLE alert (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,                -- 'non_conformita', 'scadenza', 'Tickets'
    titolo TEXT NOT NULL,
    descrizione TEXT,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    civico TEXT,                       -- Soft FK → civici.numero
    asset TEXT,                        -- Soft FK → assets.id_aziendale
    stato TEXT DEFAULT 'aperto',       -- 'aperto', 'in_carico', 'chiuso'
    note TEXT,
    operatore TEXT,                    -- username assegnato
    data_chiusura TIMESTAMP,
    data_scadenza DATE                 -- solo per tipo='scadenza'
);
```

**Popolamento (4 modalità)**:

1. **Manuale**:
```python
# File: alert_manager.py
POST /api/alert
Body: {
  "tipo": "non_conformita",
  "titolo": "Frigorifero rotto",
  "civico": "001",
  "asset": "FRE-001"
}
→ INSERT INTO alert (...) VALUES (...)
# Linea 90
```

2. **Automatico da Scadenze Scadute**:
```python
# File: scheduler_worker.py (esegue ogni ora)
→ Query: SELECT * FROM scadenze_calendario WHERE data_prossima_scadenza <= oggi
→ Per ogni scadenza scaduta:
     INSERT INTO alert (tipo='scadenza', titolo=scadenza.titolo, ...)
```

3. **Da Form Dinamici con Flag Alert**:
```python
# File: dynamic_forms.py
POST /api/dynamic-forms/submissions
→ Se form_templates.has_alert = 1:
     INSERT INTO alert (tipo='non_conformita', descrizione=submission_data, ...)
# Linea 663
```

4. **Da Completamento Scadenza con Criticità**:
```python
# File: calendario.py
POST /api/calendario/scadenze/:id/completa-checklist
→ Se item checklist critical non completato:
     INSERT INTO alert (tipo='scadenza', titolo="Check critico saltato", ...)
# Linea 507
```

**Modifiche Alert**:
```python
# Chiudi alert singolo
PATCH /api/alert/:id/close
→ UPDATE alert SET stato='chiuso', data_chiusura=now() WHERE id=?
# alert_manager.py:219

# Prendi in carico ticket
PATCH /api/alert/:id/take
→ UPDATE alert SET stato='in_carico' WHERE id=? AND tipo='Tickets'
# alert_manager.py:241

# Chiusura multipla
POST /api/alert/bulk-close
Body: { "alert_ids": [1,2,3] }
→ UPDATE alert SET stato='chiuso' WHERE id IN (?,?,?)
# alert_manager.py:274
```

---

### 2. scadenze_calendario
**Scopo**: Scadenze manutenzione ricorrenti programmate

```sql
CREATE TABLE scadenze_calendario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titolo TEXT NOT NULL,
    descrizione TEXT,
    civico TEXT,
    asset_id TEXT,
    frequenza TEXT NOT NULL,           -- 'settimanale','mensile','trimestrale','annuale','biennale'
    data_prossima_scadenza DATE NOT NULL,
    data_ultima_esecuzione DATE,
    operatore_assegnato TEXT,
    tipologia_id INTEGER,              -- FK → manutenzione_tipologie
    priorita TEXT DEFAULT 'media',     -- 'bassa', 'media', 'alta'
    note TEXT,
    completata INTEGER DEFAULT 0,
    ha_checklist INTEGER DEFAULT 0,
    data_creazione TIMESTAMP,
    FOREIGN KEY(tipologia_id) REFERENCES manutenzione_tipologie(id)
);
```

**Popolamento**:
```python
# File: calendario.py

# Crea scadenza manuale
POST /api/calendario/scadenze
Body: {
  "titolo": "Manutenzione Frigorifero",
  "civico": "001",
  "asset_id": "FRE-001",
  "frequenza": "mensile",
  "data_prossima_scadenza": "2026-04-01",
  "tipologia_id": 1
}
→ INSERT INTO scadenze_calendario (...) VALUES (...)
# Linea 1159
```

**Completamento e Ricalcolo Date**:
```python
# Completa scadenza (senza checklist)
POST /api/calendario/scadenze/:id/completa
→ Logica:
   1. data_esecuzione = oggi
   2. Calcola nuova_data = data_esecuzione + intervallo(frequenza)
      es: mensile → +30 giorni, annuale → +365 giorni
   3. UPDATE scadenze_calendario SET 
        data_prossima_scadenza = nuova_data,
        data_ultima_esecuzione = data_esecuzione
   4. INSERT INTO scadenze_storico_esecuzioni (log esecuzione)
   5. Se esiste alert correlato → chiudi alert
# Linee 1410-1543

# Completa con checklist
POST /api/calendario/scadenze/:id/completa-checklist
Body: { "checklist_results": [...] }
→ Same ricalcolo + salva risultati checklist
→ Se item critico non completato → crea alert
# Linee 533-590
```

**Frequenze Supportate**:
| Codice | Descrizione | Intervallo |
|--------|-------------|-----------|
| settimanale | 1 volta/settimana | +7 giorni |
| bisettimanale | Ogni 2 settimane | +14 giorni |
| mensile | 1 volta/mese | +30 giorni (o stesso giorno mese successivo) |
| bimestrale | Ogni 2 mesi | +60 giorni |
| trimestrale | Ogni 3 mesi | +90 giorni |
| semestrale | Ogni 6 mesi | +180 giorni |
| annuale | 1 volta/anno | +365 giorni |
| biennale | Ogni 2 anni | +730 giorni |

---

### 3. manutenzione_tipologie
**Scopo**: Categorizzazione scadenze (colore, icona UI)

```sql
CREATE TABLE manutenzione_tipologie (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,         -- "Manutenzione Ordinaria", "Controllo Qualità"
    descrizione TEXT,
    ha_checklist INTEGER DEFAULT 0,
    colore TEXT DEFAULT '#3498db',     -- Hex color badge
    icona TEXT DEFAULT '🔧'            -- Emoji icona
);
```

**Popolamento Iniziale** (automatico startup):
```python
# File: calendario.py:138-191
INSERT INTO manutenzione_tipologie VALUES
  (1, 'Manutenzione Ordinaria', '...', 0, '#2ecc71', '🔧'),
  (2, 'Manutenzione Straordinaria', '...', 0, '#e74c3c', '⚙️'),
  (3, 'Controllo Qualità', '...', 1, '#3498db', '✓'),
  (4, 'Ispezione Generale', '...', 1, '#f39c12', '🔍');
```

**Aggiunta Custom**:
```python
POST /api/calendario/tipologie
Body: { "nome": "Pulizia Filtri", "colore": "#9b59b6", "icona": "🧹" }
→ INSERT INTO manutenzione_tipologie (...) VALUES (...)
# Linea 256
```

---

### 4-6. Sistema Checklist

#### manutenzione_checklist_template
**Scopo**: Template checklist riutilizzabili

```sql
CREATE TABLE manutenzione_checklist_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipologia_id INTEGER NOT NULL,
    items TEXT NOT NULL,               -- JSON array items
    created_at TIMESTAMP,
    FOREIGN KEY(tipologia_id) REFERENCES manutenzione_tipologie(id)
);
```

**Esempio `items`**:
```json
[
  {
    "id": 1,
    "label": "Verifica temperatura (-18°C ~ -20°C)",
    "critical": true,
    "note_field": true
  },
  {
    "id": 2,
    "label": "Pulizia filtri aria",
    "critical": false,
    "note_field": false
  },
  {
    "id": 3,
    "label": "Test sistema allarme",
    "critical": true,
    "note_field": false
  }
]
```

#### manutenzione_programmata_checklist
**Scopo**: Collega checklist template a scadenze

```sql
CREATE TABLE manutenzione_programmata_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scadenza_id INTEGER NOT NULL,
    checklist_template_id INTEGER NOT NULL,
    FOREIGN KEY(scadenza_id) REFERENCES scadenze_calendario(id),
    FOREIGN KEY(checklist_template_id) REFERENCES manutenzione_checklist_template(id)
);
```

#### manutenzione_checklist_risultati
**Scopo**: Risultati effettivi checklist eseguite

```sql
CREATE TABLE manutenzione_checklist_risultati (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scadenza_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    item_label TEXT NOT NULL,
    completato INTEGER DEFAULT 0,      -- 0=non fatto, 1=fatto
    note_item TEXT,
    eseguito_da TEXT,
    eseguito_il TIMESTAMP,
    FOREIGN KEY(scadenza_id) REFERENCES scadenze_calendario(id)
);
```

**Flusso Completo Checklist**:
```
1. Crea template → manutenzione_checklist_template
2. Crea scadenza con checklist → scadenze_calendario + manutenzione_programmata_checklist
3. Esegui scadenza → salva risultati in manutenzione_checklist_risultati
4. Se item critical non completato → crea alert
```

---

### 7. scadenze_storico_esecuzioni
**Scopo**: Audit trail esecuzioni scadenze

```sql
CREATE TABLE scadenze_storico_esecuzioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scadenza_id INTEGER NOT NULL,
    data_esecuzione TIMESTAMP NOT NULL,
    data_prossima_calcolata DATE,
    operatore TEXT,
    note TEXT,
    FOREIGN KEY(scadenza_id) REFERENCES scadenze_calendario(id)
);
```

**Popolamento Automatico**:
```python
# File: calendario.py:2455
# Ogni volta che scadenza viene completata:
INSERT INTO scadenze_storico_esecuzioni (
  scadenza_id, data_esecuzione, data_prossima_calcolata, operatore
) VALUES (...)
```

---

### 8. alert_scheduler_config
**Scopo**: Configurazione ON/OFF scheduler alert automatici

```sql
CREATE TABLE alert_scheduler_config (
    id INTEGER PRIMARY KEY,             -- sempre = 1 (singleton)
    enabled INTEGER DEFAULT 1,          -- 0=disabilitato, 1=abilitato
    updated_at TIMESTAMP,
    updated_by TEXT
);
```

**Popolamento Iniziale**:
```python
# File: calendario.py:213
INSERT INTO alert_scheduler_config (id, enabled) VALUES (1, 1);
```

**Toggle Scheduler**:
```python
POST /api/calendario/scheduler/toggle
Body: { "enabled": false }
→ UPDATE alert_scheduler_config SET enabled=?, updated_at=now()
```

**Utilizzo**:
```python
# File: scheduler_worker.py
def run_alert_check():
    config = db.execute("SELECT enabled FROM alert_scheduler_config WHERE id=1")
    if not config['enabled']:
        return  # Skip alert generation
    # ... crea alert per scadenze scadute
```

---

### 9. document_history
**Scopo**: Tracciamento documenti PDF generati

```sql
CREATE TABLE document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    title TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT NOT NULL,
    civico_numero TEXT,
    asset_id TEXT,
    periodo_inizio DATE,
    periodo_fine DATE,
    related_type TEXT,                 -- 'submission', 'scadenza', 'alert', 'manual'
    related_ids TEXT,                  -- JSON array IDs
    template_id INTEGER,
    parameters_json TEXT,              -- parametri usati
    file_size_bytes INTEGER,
    notes TEXT
);
```

**Indici**:
```sql
CREATE INDEX idx_document_history_generated_by ON document_history(generated_by);
CREATE INDEX idx_document_history_civico ON document_history(civico_numero);
CREATE INDEX idx_document_history_date ON document_history(generated_at);
```

**Popolamento Automatico**:
```python
# File: docs.py:1311
POST /api/docs/generate-document
Body: {
  "blocks": [...],
  "variables": {...},
  "generated_by": "sandro",
  "metadata": {
    "title": "Rapporto Mensile Marzo",
    "civico_numero": "001",
    "periodo_inizio": "2026-03-01",
    "periodo_fine": "2026-03-31"
  }
}
→ Genera PDF + salva file in uploads/documents/
→ INSERT INTO document_history (filename, generated_by, title, ...)
```

---

### 10-12. Sistema Form Dinamici

#### form_templates
**Scopo**: Template form compilabili (es. rapportino manutenzione)

```sql
CREATE TABLE form_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,                     -- FK → template_categories.name
    is_active INTEGER DEFAULT 1,
    has_alert INTEGER DEFAULT 0,       -- genera alert su submit
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### form_fields
**Scopo**: Campi dinamici dei form

```sql
CREATE TABLE form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,          -- chiave programmatica
    field_label TEXT NOT NULL,         -- label UI
    field_type TEXT NOT NULL,          -- text|number|date|select|textarea|file|rubrica
    field_options TEXT,                -- JSON configurazioni
    is_required INTEGER DEFAULT 0,
    field_order INTEGER DEFAULT 0,
    FOREIGN KEY(template_id) REFERENCES form_templates(id)
);
```

**Esempio Configurazione**:
```json
// Template: Rapportino Manutenzione Frigorifero
{
  "field_name": "temperatura_misurata",
  "field_label": "Temperatura Misurata (°C)",
  "field_type": "number",
  "field_options": {
    "min": -30,
    "max": 10,
    "step": 0.1,
    "placeholder": "es. -18.5"
  },
  "is_required": 1
}
```

#### form_submissions
**Scopo**: Compilazioni salvate

```sql
CREATE TABLE form_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    submission_data TEXT NOT NULL,     -- JSON valori campi
    submitted_by TEXT NOT NULL,
    submitted_at TIMESTAMP,
    civico TEXT,
    asset_id TEXT,
    FOREIGN KEY(template_id) REFERENCES form_templates(id)
);
```

**Esempio `submission_data`**:
```json
{
  "temperatura_misurata": "-18.2",
  "livello_olio": "OK",
  "pulizia_filtri": "Eseguita",
  "note": "Tutto regolare",
  "operatore": "Mario Rossi"
}
```

**Flusso Compilazione**:
```python
# File: dynamic_forms.py

POST /api/dynamic-forms/submissions
Body: {
  "template_id": 3,
  "civico_numero": "001",
  "asset_id": "FRE-001",
  "submission_data": { ... }
}
→ INSERT INTO form_submissions (...) VALUES (...)
→ Se form_templates.has_alert = 1:
     INSERT INTO alert (tipo='non_conformita', descrizione=submission_data)
# Linee 478, 663
```

---

### 13-15. Sistema Magazzino

#### magazzino_ricambi
**Scopo**: Anagrafica ricambi

```sql
CREATE TABLE magazzino_ricambi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codice TEXT UNIQUE NOT NULL,
    descrizione TEXT NOT NULL,
    categoria TEXT,
    quantita_attuale INTEGER DEFAULT 0,
    quantita_minima INTEGER DEFAULT 0,
    unita_misura TEXT DEFAULT 'pz',
    prezzo_ultimo REAL,
    fornitore TEXT,
    ubicazione TEXT,
    asset_compatibili TEXT,            -- JSON array asset_id
    note TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### magazzino_movimenti
**Scopo**: Storico carico/scarico

```sql
CREATE TABLE magazzino_movimenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ricambio_id INTEGER NOT NULL,
    tipo TEXT NOT NULL,                -- 'carico', 'scarico'
    quantita INTEGER NOT NULL,
    causale TEXT,
    riferimento_doc TEXT,              -- DDT, ordine, etc.
    operatore TEXT NOT NULL,
    data_movimento TIMESTAMP,
    note TEXT,
    FOREIGN KEY(ricambio_id) REFERENCES magazzino_ricambi(id)
);
```

**Flusso Movimento**:
```python
# File: magazzino.py

POST /api/magazzino/movimenti
Body: {
  "ricambio_id": 5,
  "tipo": "scarico",
  "quantita": 3,
  "causale": "Manutenzione FRE-001",
  "operatore": "mario"
}
→ Transazione:
   1. INSERT INTO magazzino_movimenti (...)
   2. UPDATE magazzino_ricambi 
      SET quantita_attuale = quantita_attuale - 3 
      WHERE id = 5
   3. Se quantita_attuale < quantita_minima:
        INSERT INTO alert (tipo='scorta_minima', ...)
# Linee 335, 189
```

---

### 16-19. Sistema Telegram

#### telegram_config
**Scopo**: Configurazione bot

```sql
CREATE TABLE telegram_config (
    id INTEGER PRIMARY KEY,
    bot_token TEXT NOT NULL,
    bot_name TEXT,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### telegram_chats
**Scopo**: Chat/gruppi registrati per notifiche

```sql
CREATE TABLE telegram_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    chat_id TEXT UNIQUE NOT NULL,
    alert_types TEXT,                  -- JSON array
    civici_filter TEXT,                -- JSON array
    asset_types TEXT,                  -- JSON array
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Esempio Filtri**:
```json
{
  "alert_types": ["scadenza", "non_conformita"],
  "civici_filter": ["001", "002"],
  "asset_types": ["Frigorifero", "Camino"]
}
```

#### telegram_logs
**Scopo**: Log messaggi inviati

```sql
CREATE TABLE telegram_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',        -- sent|failed
    sent_at TIMESTAMP,
    alert_id INTEGER
);
```

---

### 20-21. Rubrica

#### rubrica_contatti
**Scopo**: Contatti/fornitori

```sql
-- Campi principali (da verificare struttura esatta):
- id, nome, cognome, azienda
- telefono, email, indirizzo
- categoria_id, note
```

#### rubrica_categorie
**Scopo**: Categorie rubrica

```sql
- id, nome, colore
```

---

<a name="flussi-dati"></a>
## 🔄 FLUSSI DATI PRINCIPALI

### Flusso 1: Alert da Scadenza Scaduta

```mermaid
Scheduler (ogni ora)
  ↓
Verifica alert_scheduler_config.enabled = 1
  ↓
Query: SELECT * FROM scadenze_calendario 
       WHERE data_prossima_scadenza <= oggi 
       AND completata = 0
  ↓
Per ogni scadenza scaduta:
  INSERT INTO alert (tipo='scadenza', titolo=..., civico=..., asset=...)
  ↓
Frontend AlertScreen visualizza in tab "Scadenze"
```

**File**: `scheduler_worker.py`, `calendario.py`, `alert_manager.py`

---

### Flusso 2: Completamento Scadenza con Ricalcolo

```
User: Click "Completa" su scadenza calendario
  ↓
POST /api/calendario/scadenze/:id/completa
  ↓
Backend (calendario.py):
  1. Recupera scadenza da DB
  2. data_esecuzione = oggi
  3. Calcola: nuova_data = data_esecuzione + intervallo(frequenza)
     es: mensile → +30 giorni
  4. UPDATE scadenze_calendario SET 
       data_prossima_scadenza = nuova_data,
       data_ultima_esecuzione = data_esecuzione
  5. INSERT INTO scadenze_storico_esecuzioni (log)
  6. Se esiste alert correlato → chiudi alert
  ↓
Response: nuova data prossima scadenza
  ↓
Frontend aggiorna calendario
```

**File**: `calendario.py` (linee 1410-1543)

---

### Flusso 3: Form Dinamico → Alert

```
User: Compila form "Rapportino Manutenzione"
  ↓
POST /api/dynamic-forms/submissions
Body: {
  template_id: 3,
  civico_numero: "001",
  asset_id: "FRE-001",
  submission_data: { temperatura: "-15", note: "Temperatura anomala" }
}
  ↓
Backend (dynamic_forms.py):
  1. INSERT INTO form_submissions (...)
  2. Verifica: form_templates.has_alert = 1?
  3. Se TRUE:
     INSERT INTO alert (
       tipo='non_conformita',
       titolo='Rapportino Manutenzione',
       descrizione=submission_data,
       civico='001',
       asset='FRE-001'
     )
  4. Se Telegram configurato:
     Invia notifica a chat filtrate
  ↓
Alert appare in AlertScreen → tab "Non Conformità"
```

**File**: `dynamic_forms.py` (linee 478-663)

---

### Flusso 4: Generazione Documento PDF

```
User: Crea documento in DocumentBuilder
  ↓
Aggiunge blocchi (title, table, text)
  ↓
Click "Genera PDF"
  ↓
POST /api/docs/generate-document
Body: {
  blocks: [...],
  variables: { user: "sandro", date: "2026-03-10" },
  generated_by: "sandro",
  metadata: {
    title: "Rapporto Mensile Marzo",
    civico_numero: "001",
    periodo_inizio: "2026-03-01",
    periodo_fine: "2026-03-31"
  }
}
  ↓
Backend (docs.py):
  1. Genera PDF con ReportLab
  2. filename = "document_sandro_20260310_143522.pdf"
  3. Salva file: uploads/documents/filename
  4. file_size = len(pdf_bytes)
  5. INSERT INTO document_history (
       filename, generated_by, title,
       civico_numero, periodo_inizio, periodo_fine,
       parameters_json, file_size_bytes
     )
  6. history_id = cursor.lastrowid
  ↓
Response: PDF file (download)
  ↓
Frontend: Scarica PDF + mostra alert "Salvato nello storico"
  ↓
User: Va in tab "Storico" → vede documento nella lista
```

**File**: `docs.py` (linee 1061-1350)

---

### Flusso 5: Movimento Magazzino

```
User: Registra scarico ricambio
  ↓
POST /api/magazzino/movimenti
Body: {
  ricambio_id: 5,
  tipo: "scarico",
  quantita: 3,
  causale: "Sostituzione filtro FRE-001"
}
  ↓
Backend (magazzino.py):
  BEGIN TRANSACTION
    1. INSERT INTO magazzino_movimenti (...)
    2. UPDATE magazzino_ricambi 
       SET quantita_attuale = quantita_attuale - 3,
           updated_at = now()
       WHERE id = 5
    3. Query: SELECT quantita_attuale, quantita_minima FROM magazzino_ricambi WHERE id=5
    4. Se quantita_attuale < quantita_minima:
         INSERT INTO alert (
           tipo='scorta_minima',
           titolo='Scorta minima ricambio',
           descrizione='Codice: XYZ123, Quantità: 2 pz'
         )
  COMMIT
  ↓
Response: movimento registrato
  ↓
Frontend: Aggiorna tabella ricambi + mostra alert se scorta minima
```

**File**: `magazzino.py` (linee 189, 335)

---

### Flusso 6: Chiusura Multipla Alert

```
User: Seleziona checkboxes su 3 alert
  ↓
Click "✓ Chiudi selezionati"
  ↓
Conferma dialog: "Chiudere 3 alert?"
  ↓
POST /api/alert/bulk-close
Body: { alert_ids: [12, 34, 56] }
  ↓
Backend (alert_manager.py):
  1. Valida array non vuoto
  2. placeholders = "?,?,?"
  3. query = "UPDATE alert 
             SET stato='chiuso', data_chiusura=datetime('now','localtime') 
             WHERE id IN (?,?,?)"
  4. Execute(query, [12,34,56])
  5. closed_count = cursor.rowcount
  ↓
Response: { success: true, closed_count: 3 }
  ↓
Frontend:
  1. Deseleziona checkboxes
  2. Ricarica lista alert (GET /api/alert)
  3. Alert chiusi spariscono da tab "Attivi"
```

**File**: `alert_manager.py` (linee 254-285), `AlertScreen.jsx`

---

<a name="mapping-api"></a>
## 📡 MAPPING API → DATABASE

### Lettura (GET)

| Endpoint | DB | Tabelle | File Backend |
|----------|----|---------| -------------|
| `/api/civici` | gestman.db | civici | civici.py |
| `/api/civici/:numero/assets` | gestman.db | assets (WHERE civico_numero=:numero) | server.py |
| `/api/assets` | gestman.db | assets | server.py |
| `/api/assets/:id` | gestman.db | assets (WHERE id_aziendale=:id) | server.py |
| `/api/asset-types` | gestman.db | asset_types | asset_types.py |
| `/api/users` | gestman.db | users | server.py |
| `/api/users/:username/notes` | gestman.db | user_notes (JOIN users) | server.py |
| `/api/users/:username/widgets` | gestman.db | user_widgets (JOIN users) | server.py |
| `/api/alert` | compilazioni.db | alert | alert_manager.py |
| `/api/calendario/scadenze` | compilazioni.db | scadenze_calendario, manutenzione_tipologie (JOIN) | calendario.py |
| `/api/calendario/tipologie` | compilazioni.db | manutenzione_tipologie | calendario.py |
| `/api/dynamic-forms/templates` | compilazioni.db | form_templates, form_fields (JOIN) | dynamic_forms.py |
| `/api/dynamic-forms/submissions` | compilazioni.db | form_submissions (JOIN form_templates) | dynamic_forms.py |
| `/api/docs/history` | compilazioni.db | document_history | docs.py |
| `/api/docs/templates` | gestman.db | document_templates | docs.py |
| `/api/magazzino/ricambi` | compilazioni.db | magazzino_ricambi | magazzino.py |
| `/api/magazzino/movimenti` | compilazioni.db | magazzino_movimenti (JOIN magazzino_ricambi) | magazzino.py |
| `/api/telegram/chats` | compilazioni.db | telegram_chats | telegram_manager.py |
| `/api/rubrica/contatti` | compilazioni.db | rubrica_contatti | rubrica.py |

---

### Scrittura (POST/PUT/PATCH/DELETE)

| Endpoint | Operazione | Tabelle Coinvolte | File |
|----------|-----------|-------------------|------|
| `POST /api/civici` | INSERT | civici | civici.py |
| `PATCH /api/civici/:numero` | UPDATE | civici | civici.py |
| `POST /api/assets` | INSERT | assets | server.py:243 |
| `PUT /api/assets/:id` | UPDATE | assets | server.py:272-327 |
| `DELETE /api/assets/orfani` | DELETE | assets (WHERE civico NOT EXISTS) | server.py |
| `POST /api/asset-types` | INSERT | asset_types | asset_types.py:187 |
| `PUT /api/asset-types/:id` | UPDATE + cleanup | asset_types, assets (update JSON) | asset_types.py:272-290 |
| `POST /api/register` | INSERT | users | server.py:444 |
| `PATCH /api/users/:id` | UPDATE | users | server.py:483 |
| `POST /api/users/:username/notes` | UPSERT | user_notes | server.py:654-660 |
| `POST /api/users/:username/widgets` | INSERT | user_widgets | server.py:818 |
| `POST /api/alert` | INSERT | alert | alert_manager.py:90 |
| `PATCH /api/alert/:id/close` | UPDATE | alert (SET stato='chiuso') | alert_manager.py:219 |
| `PATCH /api/alert/:id/take` | UPDATE | alert (SET stato='in_carico') | alert_manager.py:241 |
| `POST /api/alert/bulk-close` | UPDATE | alert (bulk WHERE IN) | alert_manager.py:274 |
| `POST /api/calendario/scadenze` | INSERT | scadenze_calendario | calendario.py:1159 |
| `POST /api/calendario/scadenze/:id/completa` | UPDATE + INSERT | scadenze_calendario, scadenze_storico_esecuzioni, alert (close) | calendario.py:1410-1543 |
| `POST /api/calendario/scadenze/:id/completa-checklist` | UPDATE + INSERT | scadenze_calendario, manutenzione_checklist_risultati, scadenze_storico_esecuzioni, alert (crea se critico) | calendario.py:533-590 |
| `POST /api/calendario/tipologie` | INSERT | manutenzione_tipologie | calendario.py:256 |
| `POST /api/calendario/tipologie/:id/checklist` | INSERT | manutenzione_checklist_template | calendario.py:273 |
| `POST /api/calendario/scheduler/toggle` | UPDATE | alert_scheduler_config | calendario.py |
| `POST /api/dynamic-forms/templates` | INSERT | form_templates | dynamic_forms.py:156 |
| `POST /api/dynamic-forms/templates/:id/fields` | INSERT | form_fields | dynamic_forms.py:193, 347 |
| `POST /api/dynamic-forms/submissions` | INSERT | form_submissions, alert (se has_alert) | dynamic_forms.py:478, 663 |
| `POST /api/docs/generate-document` | INSERT + file | document_history, filesystem (uploads/documents/) | docs.py:1311 |
| `DELETE /api/docs/history/:id` | DELETE + file | document_history, filesystem | docs.py |
| `POST /api/docs/templates` | INSERT | document_templates | docs.py:876 |
| `PUT /api/docs/templates/:id` | UPDATE | document_templates | docs.py:925 |
| `POST /api/magazzino/ricambi` | INSERT | magazzino_ricambi | magazzino.py:162 |
| `POST /api/magazzino/movimenti` | INSERT + UPDATE | magazzino_movimenti, magazzino_ricambi (quantita), alert (se scorta minima) | magazzino.py:335, 189 |
| `POST /api/telegram/config` | INSERT/UPDATE | telegram_config | telegram_manager.py:120 |
| `POST /api/telegram/chats` | INSERT | telegram_chats | telegram_manager.py:179 |
| `POST /api/rubrica/contatti` | INSERT | rubrica_contatti | rubrica.py:123 |
| `POST /api/rubrica/categorie` | INSERT | rubrica_categorie | rubrica.py:235 |

---

<a name="relazioni"></a>
## 🔗 RELAZIONI TRA TABELLE

### Grafo Relazioni gestman.db
```
civici (PK: numero)
  └─→ assets.civico_numero (FK soft)

asset_types (PK: id)
  → Schema definisce assets.dati (JSON)

users (PK: id)
  ├─→ user_notes.user_id (FK)
  ├─→ user_sections.user_id (FK)
  └─→ user_widgets.user_id (FK)
```

### Grafo Relazioni compilazioni.db

```
CALENDARIO:
manutenzione_tipologie (PK: id)
  └─→ scadenze_calendario.tipologia_id (FK)
        ├─→ manutenzione_programmata_checklist.scadenza_id (FK)
        │     └─→ manutenzione_checklist_template.id (FK)
        ├─→ manutenzione_checklist_risultati.scadenza_id (FK)
        └─→ scadenze_storico_esecuzioni.scadenza_id (FK)

FORM:
form_templates (PK: id)
  ├─→ form_fields.template_id (FK)
  └─→ form_submissions.template_id (FK)

template_categories (PK: name)
  └─→ form_templates.category (FK soft)

MAGAZZINO:
magazzino_ricambi (PK: id)
  └─→ magazzino_movimenti.ricambio_id (FK)

TELEGRAM:
telegram_config (singleton)
telegram_chats (PK: id)
telegram_logs.chat_id → telegram_chats.chat_id (soft)

RUBRICA:
rubrica_categorie (PK: id)
  └─→ rubrica_contatti.categoria_id (FK)

ALERT:
alert (standalone, no FK enforce)
  - Soft references to:
    - civici.numero (alert.civico)
    - assets.id_aziendale (alert.asset)
    - users.username (alert.operatore)
```

### Relazioni Cross-Database (Soft FK)

| Tabella (compilazioni.db) | Campo | Riferimento (gestman.db) | Note |
|---------------------------|-------|--------------------------|------|
| alert | civico | civici.numero | TEXT, no constraint |
| alert | asset | assets.id_aziendale | TEXT, no constraint |
| alert | operatore | users.username | TEXT, no constraint |
| scadenze_calendario | civico | civici.numero | TEXT, no constraint |
| scadenze_calendario | asset_id | assets.id_aziendale | TEXT, no constraint |
| form_submissions | civico_numero | civici.numero | TEXT, no constraint |
| form_submissions | asset_id | assets.id_aziendale | TEXT, no constraint |
| document_history | generated_by | users.username | TEXT, no constraint |
| document_history | civico_numero | civici.numero | TEXT, no constraint |
| document_history | asset_id | assets.id_aziendale | TEXT, no constraint |

**Motivo Soft FK**: SQLite ha limitazioni su FK cross-database, quindi si usano join manuali in query.

---

<a name="scripts"></a>
## 🛠️ SCRIPTS E POPOLAMENTO

### Inizializzazione Automatica (Startup)

**File**: `server.py`, `calendario.py`, `alert_manager.py`, etc.

Ogni modulo crea le proprie tabelle se non esistono (IF NOT EXISTS):

```python
# calendario.py (linee 28-213)
def init_calendario_tables():
    conn = get_db_connection('compilazioni')
    cursor = conn.cursor()
    
    # Crea tabelle
    cursor.execute("CREATE TABLE IF NOT EXISTS manutenzione_tipologie (...)")
    cursor.execute("CREATE TABLE IF NOT EXISTS scadenze_calendario (...)")
    # ... altre tabelle
    
    # Popola tipologie default
    tipologie_default = [
        (1, 'Manutenzione Ordinaria', ..., '#2ecc71', '🔧'),
        (2, 'Manutenzione Straordinaria', ..., '#e74c3c', '⚙️'),
        ...
    ]
    cursor.executemany("INSERT OR IGNORE INTO manutenzione_tipologie (...) VALUES (...)", tipologie_default)
    
    conn.commit()

# Chiamato all'import modulo
init_calendario_tables()
```

### Scripts Manuali

#### 1. Crea document_history
```bash
cd backend
python create_document_history.py
```
Esegue: `create_document_history_table.sql`

#### 2. Crea categorie template
```bash
python create_categories_table.py
```
Popola: `template_categories`

#### 3. Verifica database
```bash
# Check struttura compilazioni.db
python check_compilazioni_db.py

# Check tabelle generali
python check_database_tables.py

# Analizza struttura form
python analyze_compilazioni_structure.py
```

### Popolamento Dati Test

Non esistono seeder automatici. Dati test vanno inseriti via API o manualmente:

```sql
-- Esempio popolamento civici
INSERT INTO civici (numero, descrizione) VALUES ('001', 'Palazzo A');
INSERT INTO civici (numero, descrizione) VALUES ('002', 'Palazzo B');

-- Esempio asset
INSERT INTO assets (id_aziendale, tipo, civico_numero, dati) 
VALUES ('FRE-001', 'Frigorifero', '001', '{"marca":"Whirlpool","modello":"WX5000"}');
```

### Backup Database

```bash
# Backup completo
sqlite3 gestman.db ".backup gestman_backup_$(date +%Y%m%d).db"
sqlite3 compilazioni.db ".backup compilazioni_backup_$(date +%Y%m%d).db"

# Backup compresso
tar -czf gestman_backup_$(date +%Y%m%d).tar.gz gestman.db compilazioni.db uploads/
```

### Restore Database

```bash
# Restore da backup
cp gestman_backup_20260310.db gestman.db
cp compilazioni_backup_20260310.db compilazioni.db

# Verifica integrità
sqlite3 gestman.db "PRAGMA integrity_check;"
sqlite3 compilazioni.db "PRAGMA integrity_check;"
```

---

## 📊 STATISTICHE E PERFORMANCE

### Dimensioni Attese

| Database | Tabelle | Record Tipici | Dimensione File |
|----------|---------|---------------|-----------------|
| gestman.db | 8 | ~500-5000 | 5-50 MB |
| └ civici | - | 10-100 | - |
| └ assets | - | 100-1000 | - |
| └ users | - | 5-50 | - |
| compilazioni.db | 21 | ~10000-100000 | 10-100 MB |
| └ alert | - | 500-5000 | - |
| └ form_submissions | - | 1000-10000 | - |
| └ scadenze_calendario | - | 50-500 | - |
| └ document_history | - | 100-1000 | - |

### Indici Critici

```sql
-- alert: filtri tab frontend
CREATE INDEX idx_alert_stato_tipo ON alert(stato, tipo);
CREATE INDEX idx_alert_date ON alert(data_creazione);

-- scadenze: scheduler query
CREATE INDEX idx_scadenze_data ON scadenze_calendario(data_prossima_scadenza, completata);

-- document_history: filtri storico
CREATE INDEX idx_documents_user ON document_history(generated_by);
CREATE INDEX idx_documents_civico ON document_history(civico_numero);
CREATE INDEX idx_documents_date ON document_history(generated_at);

-- form_submissions: report
CREATE INDEX idx_submissions_template ON form_submissions(template_id);
CREATE INDEX idx_submissions_civico ON form_submissions(civico_numero);
```

### Query Pesanti

```sql
-- Query 1: Alert con join multipli (AlertScreen.jsx)
SELECT a.*, 
       c.descrizione as civico_desc,
       ast.tipo as asset_tipo
FROM alert a
LEFT JOIN civici c ON a.civico = c.numero
LEFT JOIN assets ast ON a.asset = ast.id_aziendale
WHERE a.stato != 'chiuso'
ORDER BY a.data_creazione DESC;

-- Query 2: Storico documenti con filtri
SELECT * FROM document_history
WHERE generated_by = ?
  AND civico_numero = ?
  AND generated_at BETWEEN ? AND ?
ORDER BY generated_at DESC
LIMIT 20 OFFSET 0;

-- Query 3: Scadenze con tipologie
SELECT s.*, t.nome as tipologia_nome, t.colore, t.icona
FROM scadenze_calendario s
LEFT JOIN manutenzione_tipologie t ON s.tipologia_id = t.id
WHERE s.completata = 0
  AND s.data_prossima_scadenza <= date('now', '+7 days')
ORDER BY s.data_prossima_scadenza ASC;
```

### Ottimizzazioni Suggerite

- [ ] Aggiungere indice composito su `alert(stato, tipo, data_creazione)`
- [ ] Implementare paginazione lazy su DocumentHistory
- [ ] Cache Redis per `user_sections` e `user_widgets`
- [ ] Vacuum periodico database: `PRAGMA auto_vacuum = FULL;`
- [ ] Archive old alerts: spostare alert chiusi >6 mesi in tabella `alert_archive`
- [ ] Compressione documenti vecchi PDF (>1 anno)

---

## 🔒 SICUREZZA

### Autenticazione
- Password hashate con bcrypt (`werkzeug.security`)
- Session management via Flask
- Token-based auth (da implementare JWT)

### SQL Injection Protection
- Prepared statements con `?` placeholders in tutte le query
- Nessuna concatenazione diretta SQL con input utente

### File Upload Security
- `secure_filename()` per sanitizzare nomi file
- Whitelist estensioni permesse (PDF, immagini)
- Limite dimensione upload (configurabile)

### Permessi
- `users.is_admin`: controllo features admin
- `user_sections`: limita sezioni menu visibili
- TODO: Implementare RBAC (Role-Based Access Control)

---

## 📚 RIFERIMENTI RAPIDI

### File Backend Chiave
| File | Descrizione | Righe |
|------|-------------|-------|
| `server.py` | Main server + API civici/assets/users | 1112 |
| `alert_manager.py` | Gestione alert completa | ~285 |
| `calendario.py` | Scadenze + checklist + tipologie | ~2500 |
| `docs.py` | Generazione documenti + storico | ~1627 |
| `dynamic_forms.py` | Form builder + submissions | ~900 |
| `magazzino.py` | Gestione ricambi | ~400 |
| `telegram_manager.py` | Integrazione Telegram | ~700 |
| `asset_types.py` | Tipi asset dinamici | ~350 |
| `rubrica.py` | Rubrica contatti | ~250 |
| `civici.py` | API civici | ~100 |

### Blueprint Registrati (server.py)
1. `civici_bp` → `/api/civici`
2. `rubrica_bp` → `/api/rubrica`
3. `alert_bp` → `/api/compilazioni` (legacy compatibility)
4. `docs_bp` → `/api/docs`
5. `calendario_bp` → `/api/calendario`
6. `telegram_bp` → `/api/telegram`
7. `dynamic_forms_bp` → `/api/dynamic-forms`
8. `asset_types_bp` → `/api/asset-types`
9. `magazzino_bp` → `/api/magazzino`

### Documentazione Correlata
- [DOCUMENT-HISTORY-IMPLEMENTATION.md](DOCUMENT-HISTORY-IMPLEMENTATION.md) - Sistema tracciabilità documenti PDF
- [PROJECT-ARCHITECTURE-ANALYSIS.md](PROJECT-ARCHITECTURE-ANALYSIS.md) - Architettura generale progetto
- [DEPLOYMENT-GUIDE-24.04.md](DEPLOYMENT-GUIDE-24.04.md) - Deploy Ubuntu 24.04
- [SCHEDULER-DEPLOYMENT-NOTES.md](SCHEDULER-DEPLOYMENT-NOTES.md) - Scheduler alert automatici

---

**Documento generato**: 10 Marzo 2026  
**Versione**: 2.0  
**Autore**: GESTMAN Analysis System  
**Ultima modifica**: 2026-03-10 21:30 UTC

---

## 🎯 CONCLUSIONI

Questo documento fornisce una **mappa completa** di:
✅ Struttura 29 tabelle (8 gestman.db + 21 compilazioni.db)
✅ Popolamento dati via API e scripts
✅ Flussi dati principali end-to-end
✅ Relazioni tra tabelle (FK e soft references)
✅ Mapping completo endpoint → database

Utilizzare come riferimento per:
- Debugging problemi dati
- Pianificazione nuove feature
- Ottimizzazioni performance
- Onboarding nuovi sviluppatori
- Documentazione tecnica sistema
