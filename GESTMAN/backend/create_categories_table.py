import sqlite3
import os

def create_categories_table():
    """Crea la tabella template_categories se non esiste"""
    
    db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Crea la tabella template_categories
    c.execute('''
        CREATE TABLE IF NOT EXISTS template_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50) UNIQUE NOT NULL,
            label VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Inserisci le categorie default se la tabella è vuota
    c.execute('SELECT COUNT(*) FROM template_categories')
    count = c.fetchone()[0]
    
    if count == 0:
        default_categories = [
            ('ordinario', 'Ordinario'),
            ('straordinario', 'Straordinario'),
            ('esterno', 'Esterno')
        ]
        
        c.executemany(
            'INSERT INTO template_categories (name, label) VALUES (?, ?)',
            default_categories
        )
        print(f"Inserite {len(default_categories)} categorie default")
    
    conn.commit()
    conn.close()
    print("Tabella template_categories creata con successo!")

if __name__ == '__main__':
    create_categories_table()