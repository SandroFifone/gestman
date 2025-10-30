#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask
import json

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa l'endpoint con template_nome ripristinato
with app.test_client() as client:
    response = client.get('/api/docs/compilazioni')
    data = response.get_json()
    print(f'Status: {response.status_code}')
    if data:
        print(f'Total records: {data.get("total", 0)}')
        if 'data' in data and data['data']:
            print('Sample record (ordine colonne):')
            sample = data['data'][0]
            for key, value in sample.items():
                print(f'  {key}: {value}')
        print(f'Filters available: {list(data.get("filters", {}).keys())}')
        
        # Testa il filtro template
        if 'filters' in data and 'template_nome' in data['filters']:
            templates = data['filters']['template_nome']
            print(f'Templates disponibili: {templates[:3]}...' if len(templates) > 3 else f'Templates disponibili: {templates}')
    else:
        print('No data returned')