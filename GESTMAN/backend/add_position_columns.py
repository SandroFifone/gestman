import sqlite3

# Controllo struttura tabella assets
print("=== STRUTTURA TABELLA ASSETS ===")
conn = sqlite3.connect('gestman.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(assets);")
columns = cursor.fetchall()
print("Colonne esistenti:")
for col in columns:
    print(f"  {col[1]} ({col[2]}) - {'NOT NULL' if col[3] else 'NULL'} - Default: {col[4]} - PK: {col[5]}")

# Verifica se esistono già le colonne posizione
cursor.execute("SELECT COUNT(*) FROM pragma_table_info('assets') WHERE name IN ('posizione_x', 'posizione_y')")
position_cols = cursor.fetchone()[0]
print(f"\nColonne posizione esistenti: {position_cols}")

if position_cols == 0:
    print("\nAggiungo le colonne posizione...")
    cursor.execute("ALTER TABLE assets ADD COLUMN posizione_x INTEGER")
    cursor.execute("ALTER TABLE assets ADD COLUMN posizione_y INTEGER")
    conn.commit()
    print("Colonne posizione_x e posizione_y aggiunte con successo!")
else:
    print("Le colonne posizione sono già presenti.")

conn.close()
