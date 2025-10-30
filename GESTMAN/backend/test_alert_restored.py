#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask
import json

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa l'endpoint alert ripristinato
with app.test_client() as client:
    response = client.get('/api/docs/alert')
    data = response.get_json()
    print(f'Alert GET Status: {response.status_code}')
    if data:
        print(f'Total alert records: {data.get("total", 0)}')
        print(f'Filters available: {list(data.get("filters", {}).keys())}')
        if 'data' in data and data['data']:
            print('Sample record (colonne disponibili):')
            sample = data['data'][0]
            for key, value in sample.items():
                print(f'  {key}: {value}')
    else:
        print('No alert data returned')
        print(f'Error: {data}')