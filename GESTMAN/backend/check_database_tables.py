import sqlite3

def check_database_tables():
    conn = sqlite3.connect('gestman.db')
    c = conn.cursor()
    
    # Lista tutte le tabelle
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print('Tabelle nel database:')
    for table in tables:
        print(f'  {table[0]}')
    
    conn.close()

if __name__ == "__main__":
    check_database_tables()
