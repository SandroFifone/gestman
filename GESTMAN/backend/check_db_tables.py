import sqlite3

# Controllo gestman.db
print("=== GESTMAN.DB TABLES ===")
conn = sqlite3.connect('gestman.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(f"- {table[0]}")
conn.close()

print("\n=== COMPILAZIONI.DB TABLES ===")
conn = sqlite3.connect('compilazioni.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(f"- {table[0]}")
conn.close()
