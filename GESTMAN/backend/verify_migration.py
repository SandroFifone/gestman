"""Verifica che la migration document_history sia completata"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute('PRAGMA table_info(document_history)')
columns = [col[1] for col in cursor.fetchall()]

print("=" * 60)
print("VERIFICA MIGRATION DOCUMENT_HISTORY")
print("=" * 60)
print(f"\nColonne presenti in document_history ({len(columns)}):")
for col in columns:
    print(f"  - {col}")

print("\n" + "-" * 60)
print("STATO MIGRATION:")
print("-" * 60)

if 'related_submission_ids' in columns:
    print("✓ related_submission_ids: PRESENTE")
else:
    print("✗ related_submission_ids: MANCANTE")

if 'related_scadenza_ids' in columns:
    print("✓ related_scadenza_ids: PRESENTE")
else:
    print("✗ related_scadenza_ids: MANCANTE")

# Verifica indici
cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='document_history'")
indices = [idx[0] for idx in cursor.fetchall()]
print(f"\nIndici su document_history ({len(indices)}):")
for idx in indices:
    print(f"  - {idx}")

# Conta documenti
cursor.execute("SELECT COUNT(*) FROM document_history")
count = cursor.fetchone()[0]
print(f"\nTotale documenti in history: {count}")

conn.close()

if 'related_submission_ids' in columns and 'related_scadenza_ids' in columns:
    print("\n" + "=" * 60)
    print("✓✓✓ MIGRATION COMPLETATA CON SUCCESSO ✓✓✓")
    print("=" * 60)
else:
    print("\n" + "=" * 60)
    print("✗✗✗ MIGRATION INCOMPLETA ✗✗✗")
    print("=" * 60)
