import sqlite3

def check_table_structure():
    conn = sqlite3.connect('gestman.db')
    c = conn.cursor()
    
    # Controlla struttura tabella scadenze_calendario
    c.execute('PRAGMA table_info(scadenze_calendario)')
    columns = c.fetchall()
    print('Colonne nella tabella scadenze_calendario:')
    for col in columns:
        print(f'  {col[1]} ({col[2]})')
    
    print('\n' + '='*50 + '\n')
    
    # Controlla alcune righe di esempio
    c.execute('SELECT * FROM scadenze_calendario LIMIT 3')
    rows = c.fetchall()
    print('Prime 3 righe:')
    for row in rows:
        print(row)
    
    conn.close()

if __name__ == "__main__":
    check_table_structure()
