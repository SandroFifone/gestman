#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask
import json

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa l'endpoint alert con i nuovi filtri
with app.test_client() as client:
    response = client.get('/api/docs/alert')
    data = response.get_json()
    print(f'Status: {response.status_code}')
    if data:
        print(f'Total records: {data.get("total", 0)}')
        if 'data' in data and data['data']:
            print('Sample record (campi disponibili):')
            sample = data['data'][0]
            for key, value in sample.items():
                print(f'  {key}: {value}')
        print(f'Filters available: {list(data.get("filters", {}).keys())}')
        
        # Mostra i valori dei filtri
        if 'filters' in data:
            for filter_name, values in data['filters'].items():
                print(f'  {filter_name}: {values[:3]}{"..." if len(values) > 3 else ""}')
    else:
        print('No data returned')