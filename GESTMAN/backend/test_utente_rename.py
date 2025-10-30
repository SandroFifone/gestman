#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa l'endpoint alert con la colonna rinominata
with app.test_client() as client:
    response = client.get('/api/docs/alert')
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        data = response.get_json()
        print(f'Total records: {data.get("total", 0)}')
        if 'data' in data and data['data']:
            print('Colonne nel primo record:')
            sample = data['data'][0]
            for key, value in sample.items():
                print(f'  {key}: {value}')
                
            # Verifica se 'operatore' è stato sostituito con 'utente'
            if 'utente' in sample:
                print('\n✅ SUCCESS: Colonna "operatore" rinominata in "utente"')
            if 'operatore' in sample:
                print('\n❌ ERROR: Colonna "operatore" ancora presente')
    else:
        print(f'ERROR: {response.get_data(as_text=True)}')