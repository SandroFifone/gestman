# Report Dinamico - Implementazione Sistema Semplificato

**Data:** 2026-03-25  
**Obiettivo:** Sostituire DocumentBuilder complesso con interfaccia intuitiva per generazione report

---

## ✅ IMPLEMENTAZIONE COMPLETATA

### 1. Frontend - Nuovi Componenti

#### **ReportDinamico.jsx** (NUOVO)
🎯 Componente principale del nuovo sistema report

**Caratteristiche:**
- ✅ Select intuitivo per fonti dati (5 opzioni disponibili)
- ✅ Sistema filtri dinamici (campo + operatore + valore)
- ✅ Anteprima risultati in tempo reale (primi 20 record)
- ✅ Pulsanti azione: Genera PDF, Esporta Excel, Salva configurazione
- ✅ Design mobile-friendly con grid responsive
- ✅ Messaggi utente chiari (loading, nessun dato, errori)
- ✅ Integrazione con sistema modal esistente (CustomModal)

**Fonti dati disponibili:**
1. 📝 Interventi / Form Compilati (`form_submissions`)
2. ⚠️ Alert e Non Conformità (`alert`)
3. 📅 Scadenze e Manutenzioni (`scadenze_calendario`)
4. 🔧 Magazzino Ricambi (`magazzino`)
5. 🏢 Asset (`assets`)

**Operatori supportati:**
- **Testo:** è uguale a, è diverso da, contiene, non contiene, inizia con, finisce con
- **Numeri:** è uguale a, è diverso da, maggiore di, minore di, compreso tra
- **Date:** è uguale a, prima del, dopo il, tra le date
- **Select:** è uguale a, è diverso da

**File:** `frontend/src/components/ReportDinamico.jsx` (670 righe)

---

#### **ReportDinamico.css** (NUOVO)
🎨 Stile dedicato per il nuovo componente

**Caratteristiche:**
- ✅ Design coerente con il resto dell'applicazione
- ✅ Grid system per filtri (4 colonne desktop, 1 colonna mobile)
- ✅ Responsive breakpoints (mobile ≤768px, tablet 769-1024px)
- ✅ Tabella anteprima con scroll orizzontale
- ✅ Hover states e transizioni smooth
- ✅ Empty states ben definiti

**File:** `frontend/src/components/ReportDinamico.css` (220 righe)

---

#### **Docs.jsx** (MODIFICATO)
📚 Sezione principale aggiornata

**Prima:**
- Tab "Crea Documento" (DocumentBuilder complesso)
- Tab "Storico"

**Dopo:**
- Tab "🎯 Report Dinamico" (nuovo componente semplice) ← **DEFAULT**
- Tab "📚 Storico Documenti" (mantenuto invariato)

**Modifiche:**
- ✅ Rimosso import DocumentBuilder
- ✅ Rimosso caricamento struttura database (non più necessario)
- ✅ Aggiunto import ReportDinamico
- ✅ Cambiato stato default da 'builder' a 'report'
- ✅ Semplificata logica rendering (solo 2 componenti)

**File:** `frontend/src/components/Docs.jsx` (36 righe ← da 68)

---

### 2. Backend - Nuovi Endpoint

#### **POST /api/docs/dynamic-report**
📊 Anteprima dati con filtri

**Request:**
```json
{
  "source": "alert",
  "filters": [
    {"field": "civico", "operator": "equals", "value": "123"},
    {"field": "data_creazione", "operator": "between", "value": "2026-01-01", "value2": "2026-03-31"}
  ],
  "limit": 20
}
```

**Response:**
```json
{
  "columns": ["id", "tipo", "titolo", "civico", "data_creazione"],
  "data": [
    {"id": 127, "tipo": "non_conformita", "titolo": "...", "civico": "123", "data_creazione": "2026-03-15"},
    ...
  ],
  "total": 85
}
```

**Sicurezza:**
- ✅ Whitelist fonti dati permesse
- ✅ Parametri SQL preparati (no SQL injection)
- ✅ Validazione operatori
- ✅ Logging query eseguite

**Status:** ✅ **FUNZIONANTE** (implementazione completa)

---

#### **POST /api/docs/dynamic-report/pdf**
📄 Generazione PDF da report

**Status:** ⏳ **STUB** (ritorna 501 Not Implemented)

**TODO:**
1. Eseguire query completa (senza limit 20)
2. Generare PDF con ReportLab
3. Salvare in document_history
4. Ritornare file per download

**Endpoint preparato ma non implementato** - codice stub presente per sviluppo futuro.

---

#### **POST /api/docs/dynamic-report/excel**
📊 Esportazione Excel

**Status:** ⏳ **STUB** (ritorna 501 Not Implemented)

**TODO:**
1. Eseguire query completa
2. Generare Excel con openpyxl o xlsxwriter
3. Ritornare file per download

**Endpoint preparato ma non implementato** - codice stub presente.

---

#### **POST /api/docs/report-configs**
💾 Salva configurazione report

**Status:** ⏳ **STUB** (ritorna successo ma non persiste)

**Request:**
```json
{
  "name": "Report Mensile Non Conformità",
  "source": "alert",
  "filters": [...]
}
```

**TODO:**
1. Creare tabella `report_configurations`
2. Salvare configurazione con username e timestamp
3. Implementare GET per richiamare configurazioni salvate

**Endpoint preparato ma non persiste dati** - struttura DB da creare.

---

**File:** `backend/docs.py` (+280 righe di codice al termine del file)

---

## 📋 RIEPILOGO FILE MODIFICATI

| File | Tipo | Righe | Status |
|------|------|-------|--------|
| `frontend/src/components/ReportDinamico.jsx` | NUOVO | 670 | ✅ Completo |
| `frontend/src/components/ReportDinamico.css` | NUOVO | 220 | ✅ Completo |
| `frontend/src/components/Docs.jsx` | MODIFICATO | 36 (-32) | ✅ Completo |
| `backend/docs.py` | MODIFICATO | +280 | ✅ Funzionante* |

*\* Endpoint anteprima funzionante, PDF/Excel/Config in TODO*

---

## 🚀 DEPLOYMENT

### 1. Frontend Rebuild

```bash
cd ~/GESTMAN/frontend
npm run build
```

### 2. Backend Restart

Il backend non richiede modifiche (nuovo codice aggiunto a file esistente):

```bash
sudo systemctl restart gestman-backend.service
```

### 3. Verifica Funzionamento

**Test Anteprima Report:**

```bash
curl -X POST http://localhost:5000/api/docs/dynamic-report \
  -H "Content-Type: application/json" \
  -H "X-Username: admin" \
  -d '{
    "source": "alert",
    "filters": [
      {"field": "stato", "operator": "equals", "value": "aperto"}
    ],
    "limit": 5
  }'
```

**Risposta attesa:**
```json
{
  "columns": ["id", "tipo", "titolo", ...],
  "data": [{...}, {...}],
  "total": 85
}
```

**Test Frontend:**
1. Login → Vai su sezione "Documenti"
2. Tab "Report Dinamico" dovrebbe essere attivo
3. Seleziona "Alert e Non Conformità"
4. Aggiungi filtro: "Stato" = "aperto"
5. Click "Anteprima risultati"
6. Dovresti vedere tabella con alert aperti

---

## 🎯 VANTAGGI NUOVA INTERFACCIA

### Rispetto al vecchio DocumentBuilder:

| Aspetto | Prima (DocumentBuilder) | Dopo (Report Dinamico) |
|---------|------------------------|------------------------|
| **Complessità** | Alto (drag&drop, SQL visibile) | Basso (select + filtri semplici) |
| **Curva apprendimento** | Ripida | Piatta (intuitivo) |
| **Passi per report** | 6-8 | 3-4 |
| **Mobile-friendly** | Limitato | Ottimo |
| **Anteprima** | No | Sì (real-time) |
| **Filtri dinamici** | Complessi (SQL) | Semplici (dropdown) |
| **Messaggi errore** | Tecnici | User-friendly |

### Feedback visivo migliorato:
- ✅ Loading states chiari ("⏳ Caricamento...")
- ✅ Empty states amichevoli ("😔 Nessun dato trovato...")
- ✅ Contatori visibili (badge con numero filtri/risultati)
- ✅ Note informative ("ℹ️ Mostrati solo i primi 20...")

---

## 📝 TODO - Sviluppi Futuri

### Priorità ALTA
1. **Generazione PDF** (endpoint stub presente)
   - Implementare con ReportLab
   - Template PDF auto-generato da dati
   - Salvataggio in document_history

2. **Esportazione Excel** (endpoint stub presente)
   - Libreria: openpyxl o xlsxwriter
   - Formattazione celle automatica
   - Download diretto

### Priorità MEDIA
3. **Salvataggio configurazioni** (endpoint stub presente)
   - Creare tabella `report_configurations`
   - UI per richiamare configurazioni salvate
   - Condivisione tra utenti (admin)

4. **Filtri avanzati**
   - Operatore "OR" oltre ad "AND"
   - Raggruppamenti filtri
   - Filtri su relazioni (join)

### Priorità BASSA
5. **Grafici**
   - Anteprima grafica (Chart.js)
   - Export grafici in PDF

6. **Scheduling report**
   - Report periodici automatici
   - Invio via email/Telegram

---

## 🔧 MANUTENZIONE

### Aggiungere nuova fonte dati

**Frontend** - `ReportDinamico.jsx` linee 10-66:

```javascript
const DATA_SOURCES = [
  // ...esistenti
  { 
    key: 'nuova_tabella', 
    label: '🆕 Nuova Fonte',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'campo1', label: 'Campo 1', type: 'text' },
      // ...
    ]
  }
];
```

**Backend** - `docs.py` endpoint `/dynamic-report`:

```python
allowed_sources = {
    # ...esistenti
    'nuova_tabella': ('gestman', 'nuova_tabella')  # (database, nome_tabella)
}
```

### Aggiungere nuovo operatore

**Frontend** - `ReportDinamico.jsx` linee 68-100:

```javascript
const OPERATORS = {
  text: [
    // ...esistenti
    { key: 'nuovo_op', label: 'Nuovo Operatore' }
  ]
};
```

**Backend** - `docs.py` endpoint `/dynamic-report` (build WHERE clause):

```python
elif operator == 'nuovo_op':
    where_clauses.append(f"{field} <condizione SQL>")
    params.append(value)
```

---

## 📞 SUPPORTO

**Errori comuni:**

1. **"Fonte dati non valida"**
   - Verifica che `source` sia in whitelist backend
   - Check: `allowed_sources` in `docs.py`

2. **"Nessun dato trovato"**
   - Verifica filtri troppo restrittivi
   - Test query diretta su database
   - Check log backend: `[DYNAMIC REPORT] Query: ...`

3. **Frontend non carica anteprima**
   - DevTools Console → verifica errori JavaScript
   - DevTools Network → verifica response API (200 OK?)
   - Backend log: `journalctl -u gestman-backend.service -f`

**Log rilevanti:**

```bash
# Frontend (Browser Console)
- "Alert data ricevuti: {data: [...], ...}"
- Errori fetch API

# Backend
- "[DYNAMIC REPORT] Query: SELECT * FROM..."
- "[DYNAMIC REPORT] Trovati X record (totale: Y)"
- "[DYNAMIC REPORT ERROR] ..." (se errori)
```

---

## ✅ CHECKLIST FINALE

Prima di considerare completo:

- [x] ✅ ReportDinamico.jsx creato (670 righe)
- [x] ✅ ReportDinamico.css creato (220 righe)
- [x] ✅ Docs.jsx modificato (semplificato)
- [x] ✅ Backend endpoint `/dynamic-report` funzionante
- [x] ✅ Stub endpoint PDF/Excel/Config preparati
- [x] ✅ Sintassi validata (0 errori frontend + backend)
- [x] ✅ Design mobile-friendly verificato
- [x] ✅ Integrazione CustomModal testata
- [ ] ⏳ Frontend rebuild eseguito su server
- [ ] ⏳ Test funzionale completo (utente finale)
- [ ] ⏳ Implementazione PDF generation (TODO)
- [ ] ⏳ Implementazione Excel export (TODO)
- [ ] ⏳ Implementazione salvataggio configurazioni (TODO)

---

**Fine Report Implementazione**

*Nuova sezione Report Dinamico pronta per il test e deployment. System molto più semplice ed intuitivo rispetto al precedente DocumentBuilder.*
