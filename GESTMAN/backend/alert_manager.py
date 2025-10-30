# coding: utf-8
"""
Blueprint per la gestione degli alert
Separato dal vecchio sistema di compilazioni hardcoded
"""
from flask import Blueprint, request, jsonify
import sqlite3
import os

# Import per notifiche Telegram
try:
    from telegram_manager import send_alert_to_telegram
except ImportError:
    send_alert_to_telegram = None

bp = Blueprint('alerts', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

def init_alert_db():
    """Inizializza la tabella alert se non esiste"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Tabella alert per non conformità
    c.execute('''
    CREATE TABLE IF NOT EXISTS alert (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        titolo TEXT,
        descrizione TEXT,
        data_creazione TEXT,
        civico TEXT,
        asset TEXT,
        stato TEXT DEFAULT 'aperto',
        note TEXT,
        operatore TEXT,
        data_chiusura TEXT
    )
    ''')
    
    # Aggiungi la colonna data_chiusura se non esiste (per retrocompatibilità)
    try:
        c.execute('ALTER TABLE alert ADD COLUMN data_chiusura TEXT')
    except sqlite3.OperationalError:
        # La colonna esiste già
        pass
    
    conn.commit()
    conn.close()

@bp.route('/alert', methods=['POST'])
def create_alert():
    """Crea un nuovo alert"""
    try:
        data = request.json
        
        # Validazione campi obbligatori
        if not data.get('tipo'):
            return jsonify({'error': 'Campo tipo obbligatorio'}), 400
        if not data.get('messaggio') and not data.get('descrizione'):
            return jsonify({'error': 'Campo messaggio o descrizione obbligatorio'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Prepara i dati per l'inserimento
        tipo = data.get('tipo')
        messaggio = data.get('messaggio', '')
        descrizione = data.get('descrizione', messaggio)  # Backward compatibility
        civico = data.get('civico_numero', data.get('civico', ''))
        asset = data.get('asset_id', data.get('asset', ''))
        operatore = data.get('utente', data.get('operatore', 'Sistema'))
        note = data.get('note', '')
        
        # Per i tickets, creiamo un titolo automatico
        if tipo == 'Tickets':
            if civico and asset:
                titolo = f"Ticket per asset {asset} (civico {civico})"
            elif civico:
                titolo = f"Ticket per civico {civico}"
            elif asset:
                titolo = f"Ticket per asset {asset}"
            else:
                titolo = f"Ticket generale"
        else:
            titolo = data.get('titolo', f"Alert {tipo}")
        
        # Inserisci nel database
        c.execute('''
            INSERT INTO alert (tipo, titolo, descrizione, civico, asset, operatore, note, data_creazione, stato)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), 'aperto')
        ''', (tipo, titolo, descrizione, civico, asset, operatore, note))
        
        alert_id = c.lastrowid
        conn.commit()
        conn.close()
        
        # Se è un ticket, invia notifica Telegram
        if tipo == 'Tickets' and send_alert_to_telegram:
            try:
                # Recupera il tipo di asset dal database per le notifiche Telegram
                asset_tipo = None
                if asset:
                    # Usa gestman.db per la tabella assets
                    gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
                    conn_assets = sqlite3.connect(gestman_db_path)
                    c_assets = conn_assets.cursor()
                    c_assets.execute('SELECT tipo FROM assets WHERE id_aziendale = ?', (asset,))
                    asset_row = c_assets.fetchone()
                    asset_tipo = asset_row[0] if asset_row and asset_row[0] else None
                    conn_assets.close()
                    print(f"[DEBUG ALERT] Asset {asset} ha tipo: {asset_tipo}")
                
                # Prepara i dati per Telegram
                alert_data = {
                    'tipo': 'Tickets',
                    'titolo': titolo,
                    'descrizione': descrizione,
                    'operatore': operatore,
                    'civico': civico,
                    'asset': asset,
                    'asset_tipo': asset_tipo,  # Aggiunto il tipo di asset
                    'note': note
                }
                send_alert_to_telegram(alert_data)
                print(f"[INFO] Notifica Telegram inviata per ticket ID {alert_id}")
            except Exception as e:
                print(f"[WARNING] Errore invio notifica Telegram per ticket: {e}")
        
        return jsonify({
            'success': True,
            'id': alert_id,
            'message': f'Alert {tipo} creato con successo'
        })
        
    except Exception as e:
        print(f"[ERROR] create_alert: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/alert', methods=['GET'])
def get_alerts():
    """Recupera tutti gli alert attivi (aperti e in carico)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Filtro per tipo se specificato
        tipo_filter = request.args.get('tipo')
        
        if tipo_filter:
            c.execute('''
                SELECT a.id, a.tipo, a.titolo, a.descrizione, a.data_creazione, 
                       a.civico, a.asset, a.stato, a.note, a.operatore, a.data_chiusura,
                       CASE 
                         WHEN a.tipo = 'scadenza' THEN (
                           SELECT s.data_scadenza 
                           FROM scadenze_calendario s 
                           WHERE s.civico = a.civico AND s.asset = a.asset 
                           ORDER BY s.data_scadenza DESC LIMIT 1
                         )
                         ELSE NULL 
                       END as data_scadenza
                FROM alert a
                WHERE (a.stato IN ('aperto', 'in_carico') OR 
                       (a.stato = 'chiuso' AND a.data_chiusura >= datetime('now', '-30 days', 'localtime'))) 
                AND a.tipo = ?
                ORDER BY a.data_creazione DESC
            ''', (tipo_filter,))
        else:
            c.execute('''
                SELECT a.id, a.tipo, a.titolo, a.descrizione, a.data_creazione, 
                       a.civico, a.asset, a.stato, a.note, a.operatore, a.data_chiusura,
                       CASE 
                         WHEN a.tipo = 'scadenza' THEN (
                           SELECT s.data_scadenza 
                           FROM scadenze_calendario s 
                           WHERE s.civico = a.civico AND s.asset = a.asset 
                           ORDER BY s.data_scadenza DESC LIMIT 1
                         )
                         ELSE NULL 
                       END as data_scadenza
                FROM alert a
                WHERE (a.stato IN ('aperto', 'in_carico') OR 
                       (a.stato = 'chiuso' AND a.data_chiusura >= datetime('now', '-30 days', 'localtime')))
                ORDER BY a.data_creazione DESC
            ''')
        
        alerts = []
        for row in c.fetchall():
            alerts.append({
                'id': row[0],
                'tipo': row[1],
                'titolo': row[2],
                'descrizione': row[3],
                'data_creazione': row[4],
                'civico': row[5],
                'asset': row[6],
                'stato': row[7],
                'note': row[8],
                'operatore': row[9],
                'data_chiusura': row[10] if len(row) > 10 else None,
                'data_scadenza': row[11] if len(row) > 11 and row[11] else None
            })
        
        conn.close()
        return jsonify(alerts)
        
    except Exception as e:
        print(f"[ERROR] get_alerts: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/alert/<int:alert_id>/close', methods=['PATCH'])
def close_alert(alert_id):
    """Chiude un alert specifico"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('UPDATE alert SET stato = ?, data_chiusura = datetime(\'now\', \'localtime\') WHERE id = ?', ('chiuso', alert_id))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Alert non trovato'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Alert {alert_id} chiuso con successo'})
        
    except Exception as e:
        print(f"[ERROR] close_alert: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/alert/<int:alert_id>/take', methods=['PATCH'])
def take_alert(alert_id):
    """Prende in carico un ticket"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute('UPDATE alert SET stato = ? WHERE id = ? AND tipo = ?', ('in_carico', alert_id, 'Tickets'))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Ticket non trovato'}), 404
            
        conn.commit()
        conn.close()
        
        return jsonify({'message': f'Ticket {alert_id} preso in carico con successo'})
        
    except Exception as e:
        print(f"[ERROR] take_alert: {e}")
        return jsonify({'error': str(e)}), 500

# Inizializza il database al caricamento del modulo
init_alert_db()
