import sqlite3
import json

def analyze_compilazioni_db():
    """Analizza la struttura completa del database compilazioni.db"""
    conn = sqlite3.connect('compilazioni.db')
    c = conn.cursor()
    
    # Lista tutte le tabelle
    c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in c.fetchall() if row[0] != 'sqlite_sequence']
    
    print("=" * 80)
    print("ANALISI STRUTTURA DATABASE compilazioni.db")
    print("=" * 80)
    print(f"\nTotale tabelle: {len(tables)}\n")
    
    for table in tables:
        print(f"\n{'=' * 80}")
        print(f"TABELLA: {table}")
        print('=' * 80)
        
        # Schema della tabella
        c.execute(f"PRAGMA table_info({table})")
        columns = c.fetchall()
        
        print("\nCOLONNE:")
        for col in columns:
            col_id, name, col_type, not_null, default, pk = col
            constraints = []
            if pk:
                constraints.append("PRIMARY KEY")
            if not_null:
                constraints.append("NOT NULL")
            if default:
                constraints.append(f"DEFAULT {default}")
            
            constraint_str = f" [{', '.join(constraints)}]" if constraints else ""
            print(f"  - {name:30} {col_type:15} {constraint_str}")
        
        # Foreign keys
        c.execute(f"PRAGMA foreign_key_list({table})")
        fks = c.fetchall()
        if fks:
            print("\nFOREIGN KEYS:")
            for fk in fks:
                print(f"  - {fk[3]} → {fk[2]}.{fk[4]}")
        
        # Indici
        c.execute(f"PRAGMA index_list({table})")
        indexes = c.fetchall()
        if indexes:
            print("\nINDICI:")
            for idx in indexes:
                print(f"  - {idx[1]} (unique: {bool(idx[2])})")
        
        # Conteggio record
        c.execute(f"SELECT COUNT(*) FROM {table}")
        count = c.fetchone()[0]
        print(f"\nRECORD TOTALI: {count}")
        
        # Esempi di dati (primi 2 record)
        if count > 0:
            c.execute(f"SELECT * FROM {table} LIMIT 2")
            sample_rows = c.fetchall()
            print("\nESEMPI DI DATI (primi 2 record):")
            for i, row in enumerate(sample_rows, 1):
                print(f"\n  Record {i}:")
                for col, value in zip(columns, row):
                    col_name = col[1]
                    # Tronca valori JSON lunghi
                    if isinstance(value, str) and len(value) > 100:
                        value = value[:100] + "..."
                    print(f"    {col_name:25} = {value}")
    
    conn.close()

if __name__ == "__main__":
    analyze_compilazioni_db()
