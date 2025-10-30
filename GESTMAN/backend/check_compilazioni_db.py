import sqlite3

def check_compilazioni_database():
    conn = sqlite3.connect('compilazioni.db')
    c = conn.cursor()
    
    # Lista tutte le tabelle
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print('Tabelle in compilazioni.db:')
    for table in tables:
        print(f'  {table[0]}')
    
    print('\n' + '='*50 + '\n')
    
    # Controlla se esiste scadenze_calendario
    if 'scadenze_calendario' in [t[0] for t in tables]:
        print('Struttura tabella scadenze_calendario:')
        c.execute('PRAGMA table_info(scadenze_calendario)')
        columns = c.fetchall()
        for col in columns:
            print(f'  {col[1]} ({col[2]})')
        
        print('\nPrime 3 righe di scadenze_calendario:')
        c.execute('SELECT * FROM scadenze_calendario LIMIT 3')
        rows = c.fetchall()
        for row in rows:
            print(row)
    else:
        print('Tabella scadenze_calendario NON trovata in compilazioni.db')
    
    conn.close()

if __name__ == "__main__":
    check_compilazioni_database()
