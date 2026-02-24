# 📊 ANALISI STRUTTURA DATABASE `compilazioni.db`

**Data Analisi:** 24 Febbraio 2026  
**Database:** compilazioni.db  
**Tabelle Totali:** 14

---

## 🏗️ ARCHITETTURA ATTUALE

### **1. SISTEMA FORM DINAMICI** (Core della generazione documenti)

#### **form_templates** - Template Form Configurabili
```sql
Colonne:
- id (PK)
- nome (UNIQUE, NOT NULL)        -- Nome identificativo template
- descrizione                     -- Descrizione uso template
- tipo_categoria (NOT NULL)       -- ordinario/straordinario/esterno/manutenzione
- asset_types (JSON)              -- Array tipi asset compatibili ["Fresa", "Camino"]
- is_active (DEFAULT 1)           -- Soft delete
- created_at, updated_at

Record attuali: 3 template
```

#### **form_fields** - Campi Dinamici dei Template
```sql
Colonne:
- id (PK)
- template_id (FK → form_templates.id, NOT NULL)
- field_key (NOT NULL)            -- Chiave programmatica (es: livello_olio_guide)
- field_label (NOT NULL)          -- Etichetta visualizzata
- field_type (NOT NULL)           -- text/number/date/textarea/select/checkbox/file/time/rubrica
- field_options (JSON)            -- Configurazioni campo (options, placeholder, readonly, etc)
- is_required (DEFAULT 0)         -- Campo obbligatorio
- display_order (DEFAULT 0)       -- Ordine visualizzazione
- is_active (DEFAULT 1)           -- Soft delete

Record attuali: 11 campi
Esempio field_options: {"readonly": true, "auto_fill": true}
```

#### **form_submissions** - Compilazioni Form Salvate
```sql
Colonne:
- id (PK)
- template_id (FK → form_templates.id, NOT NULL)
- civico_numero (NOT NULL)        -- Riferimento civico (gestman.db)
- asset_id (NOT NULL)             -- ID asset (gestman.db)
- operatore (NOT NULL)            -- Username operatore
- data_intervento (NOT NULL)      -- Data intervento
- form_data (JSON, NOT NULL)      -- Tutti i dati compilati in JSON
- created_at

Record attuali: 2 compilazioni
Esempio form_data: {"data_intervento": "2025-10-23", "operatore": "sandro", "Olio guide": "negativo"}
```

**⚠️ PROBLEMA CRITICO:** Non c'è collegamento tra `form_submissions` e `document_templates` (DocumentBuilder)

---

### **2. SISTEMA CALENDARIO E MANUTENZIONI**

#### **manutenzione_tipologie** - Tipi Manutenzione Programmata
```sql
Colonne:
- id (PK)
- asset_tipo (NOT NULL)           -- Tipo asset (Fresa/Scaffalature/Generico)
- nome_manutenzione (NOT NULL)    -- Nome manutenzione
- descrizione
- frequenza_mesi (NOT NULL)       -- Frequenza in mesi
- giorni_preavviso (DEFAULT 7)
- attiva (DEFAULT 1)
- created_at, updated_at

Record: 13 tipologie (frese, scaffalature, generico)
```

#### **scadenze_calendario** - Scadenze Generate
```sql
Colonne:
- id (PK)
- manutenzione_id (FK → manutenzione_tipologie, NOT NULL)
- civico, asset, asset_tipo (NOT NULL)
- data_scadenza (NOT NULL)
- stato (DEFAULT 'programmata')   -- programmata/completata/annullata
- data_completamento, operatore_completamento, note_completamento
- data_prossima_scadenza
- checklist_voce_id
- frequenza_tipo
- giorni_preavviso (DEFAULT 10)
- created_at, updated_at

Record: 0 (nessuna scadenza attiva)
```

#### **manutenzione_programmata_checklist** - Voci Checklist per Asset
```sql
Colonne:
- id (PK)
- asset_tipo (NOT NULL)
- nome_voce (NOT NULL)
- descrizione
- ordine_visualizzazione (DEFAULT 0)
- attiva (DEFAULT 1)
- created_at, updated_at

Record: 8 voci (Frese)
```

#### **manutenzione_checklist_risultati** - Risultati Completamento Checklist
```sql
Colonne:
- id (PK)
- scadenza_id (FK → scadenze_calendario, NOT NULL)
- codice_voce (NOT NULL)
- esito (NOT NULL)                -- eseguito/non_eseguito/n/a
- note_voce
- created_at

Record: 8 risultati
```

#### **scadenze_storico_esecuzioni** - Storico Esecuzioni
```sql
Colonne:
- id (PK)
- civico, asset, asset_tipo (NOT NULL)
- checklist_voce_id (FK, NOT NULL)
- nome_voce (NOT NULL)
- data_scadenza_originale, data_esecuzione (NOT NULL)
- operatore_esecuzione (NOT NULL)
- note_esecuzione
- esito (NOT NULL)
- created_at (NOT NULL)

Record: 0
```

---

### **3. SISTEMA ALERT**

#### **alert** - Alert e Tickets
```sql
Colonne:
- id (PK)
- tipo                            -- non_conformita/scadenza/Tickets
- titolo, descrizione
- data_creazione
- civico, asset
- stato (DEFAULT 'aperto')        -- aperto/chiuso
- note
- operatore
- data_chiusura

Record: 4 alert attivi
```

---

### **4. MAGAZZINO**

#### **magazzino_ricambi** - Ricambi e Scorte
```sql
Colonne:
- id (PK)
- asset_tipo (NOT NULL)
- id_ricambio (NOT NULL)          -- Codice ricambio
- costruttore, modello, codice_produttore, fornitore
- unita_misura (DEFAULT 'pz')
- quantita_disponibile (DEFAULT 0)
- quantita_minima (DEFAULT 1)
- prezzo_unitario (DEFAULT 0.0)
- note
- attivo (DEFAULT 1)
- created_at, updated_at

UNIQUE(asset_tipo, id_ricambio)
Indici: asset_tipo, attivo

Record: 2 ricambi
```

#### **magazzino_movimenti** - Storico Movimenti
```sql
Colonne:
- id (PK)
- ricambio_id (FK → magazzino_ricambi, NOT NULL)
- tipo_movimento (NOT NULL)       -- carico/scarico/carico_iniziale/rettifica
- quantita (NOT NULL)
- quantita_precedente, quantita_attuale (NOT NULL)
- operatore (NOT NULL)
- motivo
- data_movimento (NOT NULL)
- created_at

Indici: ricambio_id, data_movimento

Record: 3 movimenti
```

---

### **5. SISTEMA TICKETS**

#### **tickets** - Tickets Generici
```sql
Colonne:
- id (PK)
- titolo, descrizione (NOT NULL)
- civico_numero, asset_id, tipo_asset
- operatore (NOT NULL)
- stato (DEFAULT 'aperto')
- priorita (DEFAULT 'media')      -- alta/media/bassa
- note
- data_creazione (NOT NULL)
- data_chiusura
- data_aggiornamento

Record: 0
```

---

## 🔗 RELAZIONI TRA DATI

### **Flusso Documenti Attuali:**

```
1. FORM DINAMICI (Controlli Ordinari/Straordinari)
   form_templates (definisce struttura)
        ↓
   form_fields (definisce campi)
        ↓
   form_submissions (dati compilati)
        ↓
   [NESSUN LINK A document_templates!]

2. MANUTENZIONI PROGRAMMATE
   manutenzione_tipologie (definisce frequenza)
        ↓
   scadenze_calendario (genera scadenze)
        ↓
   manutenzione_checklist_risultati (risultati completamento)
        ↓
   scadenze_storico_esecuzioni (storico)
        ↓
   [NESSUN LINK A DOCUMENTI!]

3. DOCUMENT BUILDER (PDF Personalizzati)
   document_templates
        ↓
   [DEVE QUERYARE MANUALMENTE form_submissions, alert, scadenze, etc]
```

### **Collegamenti Mancanti:**
- ❌ `form_submissions` ↔ `document_templates` (nessun link tra compilazioni e documenti generati)
- ❌ `scadenze_calendario` ↔ documenti PDF generati
- ❌ `alert` ↔ documenti di non conformità
- ❌ Nessuna tabella per storico documenti generati
- ❌ Nessun metadato su quali dati sono stati inclusi in quale documento

---

## 🚨 PROBLEMI IDENTIFICATI

### **1. ASSENZA DI TRACCIABILITÀ DOCUMENTI**
- Non esiste una tabella che registra quali documenti PDF sono stati generati
- Non c'è storico di quale compilazione è stata usata per quale documento
- Impossibile risalire da un PDF ai dati sorgente

### **2. DATI SCOLLEGATI**
- `form_submissions` contiene dati ma non sa se sono stati documentati
- `document_templates` genera PDF ma non registra da dove prendono i dati
- Nessun link tra alert → documenti di non conformità

### **3. MANCANO METADATI DOCUMENTI**
- Non c'è versioning dei documenti
- Non c'è firma digitale/timestamp certificato
- Non c'è tracking di chi ha generato quale documento

### **4. DUPLICAZIONE LOGICA**
- `form_submissions.form_data` (JSON) contiene dati
- `document_templates.blocks` (JSON) contiene query per estrarre dati
- Nessuna relazione esplicita tra i due

### **5. NESSUN WORKFLOW**
- Non c'è un flusso: compilazione → revisione → approvazione → documento
- Gli stati esistono (alert.stato, scadenze.stato) ma non sono collegati ai documenti

---

## ✅ SUGGERIMENTI PER MIGLIORARE IL DATABASE

### **MODIFICA 1: Tabella Storico Documenti Generati**

```sql
CREATE TABLE IF NOT EXISTS document_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Metadati documento
    document_template_id INTEGER,              -- FK a document_templates (può essere NULL se generato senza template)
    document_name TEXT NOT NULL,               -- Nome documento generato
    document_type TEXT NOT NULL,               -- report/certificato/non_conformita/manutenzione/custom
    
    -- Dati sorgente
    source_type TEXT NOT NULL,                 -- form_submission/scadenza/alert/manual/mixed
    source_ids TEXT,                           -- JSON array di ID sorgente: ["form_submissions:50", "alert:167"]
    
    -- Contesto generazione
    civico_numero TEXT,
    asset_id TEXT,
    asset_tipo TEXT,
    operatore_generazione TEXT NOT NULL,
    data_generazione TEXT NOT NULL,
    
    -- File generato
    pdf_filename TEXT NOT NULL,                -- Nome file PDF salvato
    pdf_path TEXT,                             -- Path relativo o URL
    pdf_size_bytes INTEGER,
    pdf_hash TEXT,                             -- SHA256 per integrità
    
    -- Metadata
    blocks_snapshot TEXT,                      -- JSON snapshot blocchi usati
    data_snapshot TEXT,                        -- JSON snapshot dati al momento generazione
    version INTEGER DEFAULT 1,                 -- Versioning documento
    
    -- Workflow
    stato TEXT DEFAULT 'generato',             -- generato/inviato/archiviato/annullato
    destinatari TEXT,                          -- JSON array email/contatti
    note TEXT,
    
    created_at TEXT NOT NULL,
    updated_at TEXT,
    
    FOREIGN KEY (document_template_id) REFERENCES document_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_doc_history_operatore ON document_history(operatore_generazione);
CREATE INDEX IF NOT EXISTS idx_doc_history_data ON document_history(data_generazione);
CREATE INDEX IF NOT EXISTS idx_doc_history_civico ON document_history(civico_numero);
CREATE INDEX IF NOT EXISTS idx_doc_history_asset ON document_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_doc_history_type ON document_history(document_type);
CREATE INDEX IF NOT EXISTS idx_doc_history_source ON document_history(source_type);
```

**Benefici:**
- ✅ Tracciabilità completa: sapere quale documento è stato generato da quali dati
- ✅ Storico: ricostruire documenti passati
- ✅ Integrità: hash PDF per verificare manomissioni
- ✅ Workflow: aggiungere stati come "approvato", "firmato", "inviato"
- ✅ Versioning: tenere traccia di ristampe/correzioni

---

### **MODIFICA 2: Link form_submissions → documenti**

```sql
-- Aggiungere colonna a form_submissions per collegare ai documenti generati
ALTER TABLE form_submissions ADD COLUMN document_history_ids TEXT;
-- JSON array: ["123", "124"] - ID documenti generati da questa compilazione

-- Aggiungere stato workflow
ALTER TABLE form_submissions ADD COLUMN stato TEXT DEFAULT 'compilato';
-- compilato/documentato/approvato/archiviato

ALTER TABLE form_submissions ADD COLUMN data_approvazione TEXT;
ALTER TABLE form_submissions ADD COLUMN approvato_da TEXT;
```

**Benefici:**
- ✅ Sapere se una compilazione è già stata documentata
- ✅ Workflow: compilazione → documento → approvazione
- ✅ Evitare duplicati: "questo intervento ha già un documento?"

---

### **MODIFICA 3: Metadati Template (document_templates)**

```sql
-- Aggiungere a document_templates per categorizzare meglio
ALTER TABLE document_templates ADD COLUMN document_type TEXT DEFAULT 'custom';
-- report/certificato/non_conformita/manutenzione/riepilogo

ALTER TABLE document_templates ADD COLUMN auto_trigger TEXT;
-- JSON: {"when": "form_submission", "template_ids": [8, 11], "conditions": {...}}
-- Per generazione automatica quando si compila un form specifico

ALTER TABLE document_templates ADD COLUMN default_filename_pattern TEXT;
-- Pattern: "Report_{asset_tipo}_{civico}_{year}{month}{day}.pdf"

ALTER TABLE document_templates ADD COLUMN tags TEXT;
-- JSON array: ["manutenzione", "frese", "mensile"]
```

**Benefici:**
- ✅ Generazione automatica documenti dopo compilazione form
- ✅ Naming consistente dei PDF generati
- ✅ Categorizzazione e ricerca template

---

### **MODIFICA 4: Tabella Approvazioni e Firme**

```sql
CREATE TABLE IF NOT EXISTS document_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_history_id INTEGER NOT NULL,
    
    -- Approvazione
    approvatore TEXT NOT NULL,                 -- Username
    ruolo_approvatore TEXT,                    -- responsabile/direttore/cliente
    esito TEXT NOT NULL,                       -- approvato/rifiutato/in_revisione
    note_approvazione TEXT,
    data_approvazione TEXT NOT NULL,
    
    -- Firma digitale (opzionale)
    firma_digitale_hash TEXT,
    firma_timestamp TEXT,
    
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (document_history_id) REFERENCES document_history(id)
);

CREATE INDEX IF NOT EXISTS idx_doc_approvals_document ON document_approvals(document_history_id);
CREATE INDEX IF NOT EXISTS idx_doc_approvals_approvatore ON document_approvals(approvatore);
```

**Benefici:**
- ✅ Workflow approvazione formale
- ✅ Multi-firma (più persone possono approvare)
- ✅ Audit trail completo
- ✅ Certificazione documenti

---

### **MODIFICA 5: Tabella Allegati Documenti**

```sql
CREATE TABLE IF NOT EXISTS document_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_history_id INTEGER NOT NULL,
    
    -- Allegato
    attachment_type TEXT NOT NULL,             -- image/pdf/spreadsheet/other
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,
    
    -- Provenienza
    source_type TEXT,                          -- form_field/manual/external
    source_field_id INTEGER,                   -- FK a form_fields se da form
    
    -- Metadata
    description TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (document_history_id) REFERENCES document_history(id)
);

CREATE INDEX IF NOT EXISTS idx_doc_attachments_document ON document_attachments(document_history_id);
```

**Benefici:**
- ✅ Collegare file caricati nei form ai documenti PDF
- ✅ Allegati multipli per documento
- ✅ Tracciabilità file

---

### **MODIFICA 6: Relazioni Intelligenti con Alert**

```sql
-- Aggiungere a alert per collegamento documenti
ALTER TABLE alert ADD COLUMN related_form_submission_id INTEGER;
-- FK virtuale a form_submissions

ALTER TABLE alert ADD COLUMN related_document_id INTEGER;
-- FK a document_history per documento di non conformità

ALTER TABLE alert ADD COLUMN risoluzione_document_id INTEGER;
-- FK a document_history per documento che chiude l'alert
```

**Benefici:**
- ✅ Collegare alert a compilazioni che li hanno generati
- ✅ Collegare alert a documenti di non conformità
- ✅ Documentare chiusura alert con PDF risoluzione

---

### **MODIFICA 7: Template Variabili e Blocchi Intelligenti**

```sql
CREATE TABLE IF NOT EXISTS document_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Variabile
    variable_key TEXT NOT NULL UNIQUE,         -- {{company_name}}, {{logo_url}}
    variable_label TEXT NOT NULL,
    variable_type TEXT NOT NULL,               -- text/number/date/query/computed
    
    -- Valore
    default_value TEXT,
    query_source TEXT,                         -- Per variabili da query: "SELECT ... FROM ..."
    computation TEXT,                          -- Per variabili calcolate: "SUM(field1, field2)"
    
    -- Categoria
    category TEXT,                             -- global/asset/civico/user/custom
    requires_input BOOLEAN DEFAULT 0,          -- Richiede input utente a generazione
    
    created_at TEXT NOT NULL
);

-- Esempi variabili globali:
INSERT INTO document_variables VALUES 
(NULL, '{{company_name}}', 'Nome Azienda', 'text', 'La Tua Azienda S.r.l.', NULL, NULL, 'global', 0, datetime('now')),
(NULL, '{{company_address}}', 'Indirizzo Azienda', 'text', 'Via Example, 123', NULL, NULL, 'global', 0, datetime('now')),
(NULL, '{{company_vat}}', 'P.IVA', 'text', '12345678901', NULL, NULL, 'global', 0, datetime('now')),
(NULL, '{{total_assets}}', 'Totale Asset', 'query', NULL, 'SELECT COUNT(*) FROM assets', NULL, 'global', 0, datetime('now'));
```

**Benefici:**
- ✅ Variabili globali riutilizzabili in tutti i documenti
- ✅ Variabili da query dinamiche
- ✅ Variabili calcolate (somme, medie, percentuali)
- ✅ Gestione centralizzata valori azienda

---

### **MODIFICA 8: Document Templates - Blocchi Riutilizzabili**

```sql
CREATE TABLE IF NOT EXISTS document_blocks_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Blocco
    block_name TEXT NOT NULL,
    block_type TEXT NOT NULL,                  -- title/text/table/statistics/separator/custom
    block_config TEXT NOT NULL,                -- JSON configurazione blocco
    
    -- Categorizzazione
    category TEXT,                             -- header/footer/manutenzione/non_conformita
    tags TEXT,                                 -- JSON array
    
    -- Riutilizzo
    is_shared BOOLEAN DEFAULT 1,
    created_by TEXT,
    usage_count INTEGER DEFAULT 0,             -- Quante volte usato
    
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Tabella per collegare blocchi ai template
CREATE TABLE IF NOT EXISTS document_template_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_template_id INTEGER NOT NULL,
    block_id INTEGER,                          -- NULL se blocco inline
    block_order INTEGER NOT NULL,
    block_config_override TEXT,                -- JSON per override config blocco
    
    FOREIGN KEY (document_template_id) REFERENCES document_templates(id),
    FOREIGN KEY (block_id) REFERENCES document_blocks_library(id)
);
```

**Benefici:**
- ✅ Blocchi riutilizzabili tra template diversi
- ✅ Libreria blocchi predefiniti (header azienda, footer, disclaimer)
- ✅ Aggiornamento centralizzato (cambio header → si aggiorna in tutti i template)

---

### **MODIFICA 9: Schedulazione Documenti Automatici**

```sql
CREATE TABLE IF NOT EXISTS document_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Template e trigger
    document_template_id INTEGER NOT NULL,
    schedule_name TEXT NOT NULL,
    
    -- Trigger
    trigger_type TEXT NOT NULL,                -- time_based/event_based/manual
    trigger_config TEXT,                       -- JSON: {"frequency": "monthly", "day": 1, "hour": 8}
    
    -- Filtri dati
    data_filters TEXT,                         -- JSON: {"asset_tipo": "Fresa", "last_days": 30}
    
    -- Destinazione
    auto_send BOOLEAN DEFAULT 0,
    recipients TEXT,                           -- JSON array email
    
    -- Stato
    is_active BOOLEAN DEFAULT 1,
    last_execution TEXT,
    next_execution TEXT,
    
    created_at TEXT NOT NULL,
    updated_at TEXT,
    
    FOREIGN KEY (document_template_id) REFERENCES document_templates(id)
);
```

**Benefici:**
- ✅ Report mensili automatici
- ✅ Documenti scadenze settimanali
- ✅ Email automatiche con PDF allegato

---

### **MODIFICA 10: Asset → Form → Documento (Relazione Completa)**

```sql
-- Aggiungere colonna a form_submissions per tipo documento suggerito
ALTER TABLE form_submissions ADD COLUMN suggested_document_type TEXT;
-- "certificato_manutenzione", "report_non_conformita", etc

-- Aggiungere asset_tipo a form_submissions per query più veloci
ALTER TABLE form_submissions ADD COLUMN asset_tipo TEXT;
-- Attualmente manca! Serve per filtrare form per tipo asset

-- Aggiungere esito a form_submissions
ALTER TABLE form_submissions ADD COLUMN esito_complessivo TEXT;
-- positivo/negativo/parziale - calcolato dai campi

ALTER TABLE form_submissions ADD COLUMN priorita TEXT DEFAULT 'normale';
-- urgente/alta/normale/bassa

ALTER TABLE form_submissions ADD COLUMN richiedente TEXT;
-- Chi ha richiesto l'intervento
```

---

## 🎯 PIANO DI IMPLEMENTAZIONE CONSIGLIATO

### **FASE 1 - TRACCIABILITÀ ESSENZIALE (PRIORITÀ ALTA)**
```sql
-- 1. Crea document_history
-- 2. Aggiungi asset_tipo a form_submissions
-- 3. Aggiungi document_history_ids a form_submissions
-- 4. Modifica generatePDF in docs.py per salvare in document_history
```

### **FASE 2 - VARIABILI GLOBALI (PRIORITÀ MEDIA)**
```sql
-- 1. Crea document_variables
-- 2. Popola con dati azienda
-- 3. Modifica DocumentBuilder per supportare variabili globali
-- 4. Aggiorna replaceVars() nel frontend
```

### **FASE 3 - APPROVAZIONI E WORKFLOW (PRIORITÀ MEDIA)**
```sql
-- 1. Crea document_approvals
-- 2. Aggiungi stati workflow a form_submissions
-- 3. UI per approvazioni admin
```

### **FASE 4 - AUTOMAZIONE (PRIORITÀ BASSA)**
```sql
-- 1. Crea document_schedules
-- 2. Crea script Python per schedulazione (cron job)
-- 3. Integra invio email
```

---

## 📝 SCRIPT IMPLEMENTAZIONE FASE 1

```python
# backend/upgrade_compilazioni_db.py
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

def upgrade_database():
    """Applica miglioramenti al database compilazioni.db"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    print("Inizio upgrade database...")
    
    # 1. Crea document_history
    print("\n1. Creando tabella document_history...")
    c.execute('''
    CREATE TABLE IF NOT EXISTS document_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_template_id INTEGER,
        document_name TEXT NOT NULL,
        document_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_ids TEXT,
        civico_numero TEXT,
        asset_id TEXT,
        asset_tipo TEXT,
        operatore_generazione TEXT NOT NULL,
        data_generazione TEXT NOT NULL,
        pdf_filename TEXT NOT NULL,
        pdf_path TEXT,
        pdf_size_bytes INTEGER,
        pdf_hash TEXT,
        blocks_snapshot TEXT,
        data_snapshot TEXT,
        version INTEGER DEFAULT 1,
        stato TEXT DEFAULT 'generato',
        destinatari TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (document_template_id) REFERENCES document_templates(id)
    )
    ''')
    
    # Indici per performance
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_history_operatore ON document_history(operatore_generazione)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_history_data ON document_history(data_generazione)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_history_civico ON document_history(civico_numero)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_history_asset ON document_history(asset_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_doc_history_type ON document_history(document_type)')
    
    # 2. Aggiungi colonne a form_submissions
    print("\n2. Aggiungendo colonne a form_submissions...")
    
    try:
        c.execute('ALTER TABLE form_submissions ADD COLUMN asset_tipo TEXT')
        print("   ✓ Aggiunta colonna asset_tipo")
    except sqlite3.OperationalError:
        print("   - Colonna asset_tipo già esistente")
    
    try:
        c.execute('ALTER TABLE form_submissions ADD COLUMN document_history_ids TEXT')
        print("   ✓ Aggiunta colonna document_history_ids")
    except sqlite3.OperationalError:
        print("   - Colonna document_history_ids già esistente")
    
    try:
        c.execute('ALTER TABLE form_submissions ADD COLUMN stato TEXT DEFAULT "compilato"')
        print("   ✓ Aggiunta colonna stato")
    except sqlite3.OperationalError:
        print("   - Colonna stato già esistente")
    
    try:
        c.execute('ALTER TABLE form_submissions ADD COLUMN esito_complessivo TEXT')
        print("   ✓ Aggiunta colonna esito_complessivo")
    except sqlite3.OperationalError:
        print("   - Colonna esito_complessivo già esistente")
    
    try:
        c.execute('ALTER TABLE form_submissions ADD COLUMN priorita TEXT DEFAULT "normale"')
        print("   ✓ Aggiunta colonna priorita")
    except sqlite3.OperationalError:
        print("   - Colonna priorita già esistente")
    
    # 3. Popola asset_tipo retroattivamente per form_submissions esistenti
    print("\n3. Popolando asset_tipo per form_submissions esistenti...")
    # Richiederebbe JOIN con gestman.db.assets, skip per ora
    
    # 4. Aggiungi colonne a document_templates
    print("\n4. Aggiungendo colonne a document_templates...")
    
    try:
        c.execute('ALTER TABLE document_templates ADD COLUMN document_type TEXT DEFAULT "custom"')
        print("   ✓ Aggiunta colonna document_type")
    except sqlite3.OperationalError:
        print("   - Colonna document_type già esistente")
    
    try:
        c.execute('ALTER TABLE document_templates ADD COLUMN auto_trigger TEXT')
        print("   ✓ Aggiunta colonna auto_trigger")
    except sqlite3.OperationalError:
        print("   - Colonna auto_trigger già esistente")
    
    try:
        c.execute('ALTER TABLE document_templates ADD COLUMN default_filename_pattern TEXT')
        print("   ✓ Aggiunta colonna default_filename_pattern")
    except sqlite3.OperationalError:
        print("   - Colonna default_filename_pattern già esistente")
    
    try:
        c.execute('ALTER TABLE document_templates ADD COLUMN tags TEXT')
        print("   ✓ Aggiunta colonna tags")
    except sqlite3.OperationalError:
        print("   - Colonna tags già esistente")
    
    # 5. Aggiungi collegamenti alert → documents
    print("\n5. Aggiungendo colonne a alert...")
    
    try:
        c.execute('ALTER TABLE alert ADD COLUMN related_form_submission_id INTEGER')
        print("   ✓ Aggiunta colonna related_form_submission_id")
    except sqlite3.OperationalError:
        print("   - Colonna related_form_submission_id già esistente")
    
    try:
        c.execute('ALTER TABLE alert ADD COLUMN related_document_id INTEGER')
        print("   ✓ Aggiunta colonna related_document_id")
    except sqlite3.OperationalError:
        print("   - Colonna related_document_id già esistente")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Upgrade database completato!")
    print("\nPROSSIMI PASSI:")
    print("1. Modifica docs.py per salvare in document_history quando genera PDF")
    print("2. Modifica dynamic_forms.py per aggiornare asset_tipo in form_submissions")
    print("3. Crea UI per visualizzare storico documenti")
    print("4. Implementa workflow approvazioni (FASE 2)")

if __name__ == '__main__':
    upgrade_database()
```

---

## 📋 VANTAGGI COMPLESSIVI DOPO LE MODIFICHE

### **Prima:**
- ❌ Nessuna traccia dei PDF generati
- ❌ Dati scollegati tra form, scadenze, alert
- ❌ Impossibile sapere "questo intervento è già documentato?"
- ❌ Nessun workflow approvazione
- ❌ Difficile generare report aggregati (es: "tutti gli interventi del mese")

### **Dopo:**
- ✅ Storico completo documenti generati con hash integrità
- ✅ Relazioni: form_submission → document → approval
- ✅ Alert collegati a documenti di non conformità
- ✅ Workflow: compilazione → documento → approvazione → archiviazione
- ✅ Generazione automatica documenti schedulata
- ✅ Query aggregate facilitata con indici ottimizzati
- ✅ Variabili globali riutilizzabili ({{company_name}}, etc)

---

## 🚀 COME APPLICARE LE MODIFICHE

**Opzione A - Upgrade Incrementale (CONSIGLIATO):**
```bash
cd backend
python upgrade_compilazioni_db.py
```

**Opzione B - Manuale con SQLite:**
```bash
cd backend
sqlite3 compilazioni.db < upgrade_schema.sql
```

**Opzione C - Integrato in server.py:**
Aggiungi chiamata a `upgrade_database()` al boot del server.

---

Vuoi che implementi lo script di upgrade e modifichi docs.py per usare la nuova tabella document_history?
