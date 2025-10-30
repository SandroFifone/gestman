#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import format_column_name

# Testa la formattazione del nome colonna
print("Test mappatura colonne:")
print(f"'operatore' -> '{format_column_name('operatore')}'")
print(f"'operatore_completamento' -> '{format_column_name('operatore_completamento')}'")
print(f"'operatore_esecuzione' -> '{format_column_name('operatore_esecuzione')}'")
print(f"'tipo' -> '{format_column_name('tipo')}'")
print(f"'civico' -> '{format_column_name('civico')}'")

print("\nTutte le colonne con 'operatore' ora dovrebbero mostrare 'Utente'")