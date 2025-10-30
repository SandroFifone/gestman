#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa tutti gli endpoint per verificare la trasformazione 'operatore' -> 'utente'
with app.test_client() as client:
    print("=== TEST TRASFORMAZIONE OPERATORE -> UTENTE ===\n")
    
    # Test Alert
    print("1. ALERT:")
    response = client.get('/api/docs/alert')
    if response.status_code == 200:
        data = response.get_json()
        if data['data']:
            sample = data['data'][0]
            has_operatore = 'operatore' in sample
            has_utente = 'utente' in sample
            print(f"   - Ha 'operatore': {has_operatore}")
            print(f"   - Ha 'utente': {has_utente}")
            print(f"   - Colonne: {list(sample.keys())}")
        else:
            print("   - Nessun dato")
    else:
        print(f"   - ERROR: {response.status_code}")
    
    print()
    
    # Test Compilazioni  
    print("2. COMPILAZIONI:")
    response = client.get('/api/docs/compilazioni')
    if response.status_code == 200:
        data = response.get_json()
        if data['data']:
            sample = data['data'][0]
            has_operatore = 'operatore' in sample
            has_utente = 'utente' in sample
            print(f"   - Ha 'operatore': {has_operatore}")
            print(f"   - Ha 'utente': {has_utente}")
            print(f"   - Colonne: {list(sample.keys())}")
        else:
            print("   - Nessun dato")
    else:
        print(f"   - ERROR: {response.status_code}")
    
    print()
    
    # Test Scadenze
    print("3. SCADENZE:")
    response = client.get('/api/docs/scadenze')
    if response.status_code == 200:
        data = response.get_json()
        if data['data']:
            sample = data['data'][0]
            has_operatore = 'operatore' in sample
            has_utente = 'utente' in sample
            print(f"   - Ha 'operatore': {has_operatore}")
            print(f"   - Ha 'utente': {has_utente}")
            print(f"   - Colonne: {list(sample.keys())}")
        else:
            print("   - Nessun dato")
    else:
        print(f"   - ERROR: {response.status_code}")
        
    print("\n=== RISULTATO ===")
    print("Tutte le sezioni dovrebbero avere 'utente' invece di 'operatore'")