
from flask import Blueprint, request, jsonify
import sqlite3
import os

bp = Blueprint('civici', __name__, url_prefix='/api/civici')

DB_PATH = os.path.join(os.path.dirname(__file__), "gestman.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@bp.route('/<numero>', methods=['PATCH'])
def update_civico(numero):
    db = get_db()
    data = request.get_json()
    descrizione = data.get('descrizione')
    if descrizione is None:
        return jsonify({"error": "Descrizione richiesta"}), 400
    db.execute('UPDATE civici SET descrizione = ? WHERE numero = ?', (descrizione, numero))
    db.commit()
    return jsonify({"ok": True})

@bp.route('', methods=['GET'])
def get_civici():
    db = get_db()
    
    # Parametro di filtro per ID asset
    asset_id = request.args.get("asset_id")
    
    if asset_id:
        # Filtro: mostra solo civici che contengono l'asset con l'ID specificato (case-insensitive)
        rows = db.execute("""
            SELECT DISTINCT c.numero, c.descrizione 
            FROM civici c
            INNER JOIN assets a ON c.numero = a.civico_numero
            WHERE UPPER(a.id_aziendale) LIKE UPPER(?)
            ORDER BY c.numero
        """, (f"%{asset_id}%",)).fetchall()
    else:
        # Tutti i civici (comportamento originale)
        rows = db.execute('SELECT numero, descrizione FROM civici ORDER BY numero').fetchall()
    
    civici = []
    for row in rows:
        civici.append({
            'numero': row['numero'],
            'descrizione': row['descrizione']
        })
    
    # Debug per verificare che il codice funzioni
    result = {"civici": civici}
    if asset_id:
        result["debug_message"] = f"FILTRO APPLICATO PER: {asset_id}"
    else:
        result["debug_message"] = "NESSUN FILTRO"
        
    return jsonify(result)

@bp.route('', methods=['POST'])
def add_civico():
    data = request.get_json()
    numero = data.get('numero')
    descrizione = data.get('descrizione', '')
    if not numero:
        return jsonify({"error": "Numero civico richiesto"}), 400
    db = get_db()
    db.execute('INSERT INTO civici (numero, descrizione) VALUES (?, ?)', (numero, descrizione))
    db.commit()
    return jsonify({"ok": True})

@bp.route('/<numero>', methods=['DELETE'])
def delete_civico(numero):
    db = get_db()
    
    try:
        # Prima elimina tutti gli asset associati al civico
        assets_deleted = db.execute('DELETE FROM assets WHERE civico_numero = ?', (numero,)).rowcount
        
        # Poi elimina il civico
        civico_deleted = db.execute('DELETE FROM civici WHERE numero = ?', (numero,)).rowcount
        
        db.commit()
        
        if civico_deleted == 0:
            return jsonify({"error": f"Civico {numero} non trovato"}), 404
            
        return jsonify({
            "ok": True, 
            "message": f"Civico {numero} eliminato con {assets_deleted} asset associati"
        })
        
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Errore durante l'eliminazione: {str(e)}"}), 500
