import sqlite3

# Test per vedere la struttura della tabella assets
try:
    conn = sqlite3.connect('gestman.db')
    c = conn.cursor()
    
    # Prima vediamo la struttura della tabella
    c.execute('PRAGMA table_info(assets)')
    columns = c.fetchall()
    print('Struttura tabella assets:')
    for col in columns:
        print(f'  {col}')
    
    # Ora proviamo a vedere tutti i dati (prime 5 righe)
    c.execute('SELECT * FROM assets LIMIT 5')
    rows = c.fetchall()
    print(f'\nPrime 5 righe della tabella assets:')
    for row in rows:
        print(f'  {row}')
    
    conn.close()
    
except Exception as e:
    print(f'Errore: {e}')