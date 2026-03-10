-- PRIORITÀ 4: Miglioramenti document_history
-- Eseguire in compilazioni.db

-- 1. Aggiungi colonna related_submission_ids (se non esiste)
ALTER TABLE document_history ADD COLUMN related_submission_ids TEXT;

-- 2. Aggiungi related_scadenza_ids (se non esiste)
ALTER TABLE document_history ADD COLUMN related_scadenza_ids TEXT;

-- 3. Indici per nuove colonne
CREATE INDEX IF NOT EXISTS idx_document_history_submission
ON document_history(related_submission_ids);

CREATE INDEX IF NOT EXISTS idx_document_history_scadenza
ON document_history(related_scadenza_ids);

-- 4. Query test
SELECT COUNT(*) FROM document_history;
SELECT * FROM document_history LIMIT 5;
