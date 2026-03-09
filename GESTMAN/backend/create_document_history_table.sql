-- Tabella per tracciare la storia dei documenti generati
-- Database: compilazioni.db

CREATE TABLE IF NOT EXISTS document_history (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    filename            TEXT NOT NULL,
    title               TEXT,
    generated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by        TEXT NOT NULL,           -- username
    civico_numero       TEXT,
    asset_id            TEXT,                    -- es. FRE-001
    periodo_inizio      DATE,
    periodo_fine        DATE,
    related_type        TEXT,                    -- 'submission', 'scadenza', 'alert', 'multi', 'manual'
    related_ids         TEXT,                    -- JSON array o CSV di id collegati
    template_id         INTEGER,
    parameters_json     TEXT,                    -- JSON dei parametri passati dall'utente
    file_size_bytes     INTEGER,
    notes               TEXT
);

-- Indici per query più veloci
CREATE INDEX IF NOT EXISTS idx_document_history_generated_by ON document_history(generated_by);
CREATE INDEX IF NOT EXISTS idx_document_history_civico ON document_history(civico_numero);
CREATE INDEX IF NOT EXISTS idx_document_history_asset ON document_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_document_history_date ON document_history(generated_at);
CREATE INDEX IF NOT EXISTS idx_document_history_related ON document_history(related_type, related_ids);
CREATE INDEX IF NOT EXISTS idx_document_history_periodo ON document_history(periodo_inizio, periodo_fine);
