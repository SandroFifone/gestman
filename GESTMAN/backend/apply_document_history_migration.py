"""
Script per applicare la migration document_history
Aggiunge colonne related_submission_ids e related_scadenza_ids
"""
import sqlite3
import os

def apply_migration():
    db_path = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
    
    if not os.path.exists(db_path):
        print(f"ERRORE: Database non trovato: {db_path}")
        return False
    
    print(f"Connessione a: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Verifica se le colonne esistono già
        cursor.execute("PRAGMA table_info(document_history)")
        columns = [col[1] for col in cursor.fetchall()]
        
        print(f"Colonne attuali in document_history: {columns}")
        
        # Aggiungi related_submission_ids se non esiste
        if 'related_submission_ids' not in columns:
            print("Aggiunta colonna related_submission_ids...")
            cursor.execute("ALTER TABLE document_history ADD COLUMN related_submission_ids TEXT")
            print("✓ Colonna related_submission_ids aggiunta")
        else:
            print("⊙ Colonna related_submission_ids già esistente")
        
        # Aggiungi related_scadenza_ids se non esiste
        if 'related_scadenza_ids' not in columns:
            print("Aggiunta colonna related_scadenza_ids...")
            cursor.execute("ALTER TABLE document_history ADD COLUMN related_scadenza_ids TEXT")
            print("✓ Colonna related_scadenza_ids aggiunta")
        else:
            print("⊙ Colonna related_scadenza_ids già esistente")
        
        # Crea indici
        print("Creazione indici...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_document_history_submission
            ON document_history(related_submission_ids)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_document_history_scadenza
            ON document_history(related_scadenza_ids)
        """)
        print("✓ Indici creati")
        
        conn.commit()
        
        # Verifica finale
        cursor.execute("PRAGMA table_info(document_history)")
        columns_after = [col[1] for col in cursor.fetchall()]
        print(f"\nColonne finali: {columns_after}")
        
        # Conta record
        cursor.execute("SELECT COUNT(*) FROM document_history")
        count = cursor.fetchone()[0]
        print(f"Totale documenti in history: {count}")
        
        print("\n✓✓✓ MIGRATION COMPLETATA CON SUCCESSO ✓✓✓")
        return True
        
    except Exception as e:
        print(f"ERRORE durante migration: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    apply_migration()
