#!/usr/bin/env python3
"""
Script per creare la tabella document_history nel database compilazioni.db
Eseguire: python create_document_history.py
"""

import sqlite3
import os

def create_document_history_table():
    """Crea la tabella document_history e i relativi indici"""
    db_path = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
    
    if not os.path.exists(db_path):
        print(f"ERRORE: Database {db_path} non trovato!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Leggi e esegui SQL
        sql_file = os.path.join(os.path.dirname(__file__), 'create_document_history_table.sql')
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        cursor.executescript(sql_script)
        conn.commit()
        
        # Verifica creazione
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_history'")
        if cursor.fetchone():
            print("✓ Tabella document_history creata con successo")
            
            # Conta indici
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name='document_history'")
            index_count = cursor.fetchone()[0]
            print(f"✓ {index_count} indici creati")
            
            return True
        else:
            print("✗ Errore: tabella non creata")
            return False
            
    except Exception as e:
        print(f"✗ Errore durante la creazione: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    print("=== Creazione tabella document_history ===")
    success = create_document_history_table()
    exit(0 if success else 1)
