#!/usr/bin/env python3

import sys
sys.path.append('.')
from docs import bp
from flask import Flask
import json

# Crea una app di test
app = Flask(__name__)
app.register_blueprint(bp, url_prefix='/api/docs')

# Testa l'endpoint alert
with app.test_client() as client:
    response = client.get('/api/docs/alert')
    data = response.get_json()
    print(f'Alert GET Status: {response.status_code}')
    if data:
        print(f'Total alert records: {data.get("total", 0)}')
        
        # Testa la generazione PDF per alert
        response = client.post('/api/docs/print-report', 
                              json={'section': 'alert', 'format': 'landscape'},
                              content_type='application/json')
        
        print(f'Alert PDF Status: {response.status_code}')
        if response.status_code == 200:
            print(f'PDF content length: {len(response.data)} bytes')
            print('Alert PDF generated successfully!')
        else:
            print(f'Alert PDF generation failed: {response.data}')
    else:
        print('No alert data returned')