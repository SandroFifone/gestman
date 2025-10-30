# main.py

from flask import Flask
from flask_cors import CORS
from alert_manager import bp, init_alert_db

app = Flask(__name__)
CORS(app)  # Abilita CORS
app.register_blueprint(bp, url_prefix='/api')

# Importa il server principale che registra tutti i blueprint
try:
    import server
    print("Server blueprint registrato")
except Exception as e:
    print(f"ERRORE server: {e}")

init_alert_db()

if __name__ == "__main__":
    import os
    # Configurazione basata su ambiente
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 5000))
    
    app.run(host=host, port=port, debug=debug_mode)
