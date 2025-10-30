# coding: utf-8
from flask import Blueprint, request, jsonify
import sqlite3
import os
import datetime
import requests
import json

bp = Blueprint('telegram', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'gestman.db')

# --- CREAZIONE TABELLE TELEGRAM ---
def init_telegram_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Configurazione bot
    c.execute('''
    CREATE TABLE IF NOT EXISTS telegram_config (
        id INTEGER PRIMARY KEY,
        bot_token TEXT,
        bot_name TEXT,
        active INTEGER DEFAULT 0,
        created_at TEXT
    )
    ''')
    
    # Chat disponibili
    c.execute('''
    CREATE TABLE IF NOT EXISTS telegram_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        alert_types TEXT DEFAULT '',
        civici_filter TEXT DEFAULT '',
        asset_types TEXT DEFAULT '',
        active INTEGER DEFAULT 1,
        created_at TEXT
    )
    ''')
    
    # Regole di assegnazione alert
    c.execute('''
    CREATE TABLE IF NOT EXISTS telegram_assignment_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_name TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        asset_type TEXT,
        civico_filter TEXT,
        chat_id TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TEXT
    )
    ''')
    
    # Log invii
    c.execute('''
    CREATE TABLE IF NOT EXISTS telegram_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id INTEGER,
        chat_id TEXT,
        message TEXT,
        status TEXT,
        response TEXT,
        sent_at TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

# --- API CONFIGURAZIONE BOT ---
@bp.route('/config', methods=['GET', 'POST'])
def telegram_config():
    if request.method == 'GET':
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT bot_token, bot_name, active FROM telegram_config ORDER BY id DESC LIMIT 1")
            config = c.fetchone()
            conn.close()
            
            if config:
                return jsonify({
                    'bot_token': config[0] or '',
                    'bot_name': config[1] or '',
                    'active': bool(config[2])
                })
            else:
                return jsonify({'bot_token': '', 'bot_name': '', 'active': False})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            bot_token = data.get('bot_token', '').strip()
            
            if not bot_token:
                return jsonify({'error': 'Bot token richiesto'}), 400
            
            # Test bot token
            test_url = f"https://api.telegram.org/bot{bot_token}/getMe"
            response = requests.get(test_url, timeout=10)
            
            if response.status_code != 200:
                return jsonify({'error': 'Token bot non valido'}), 400
            
            bot_info = response.json()
            if not bot_info.get('ok'):
                return jsonify({'error': 'Token bot non valido'}), 400
            
            bot_name = bot_info['result']['first_name']
            
            # Salva configurazione
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("DELETE FROM telegram_config")  # Una sola config
            c.execute("""
                INSERT INTO telegram_config (bot_token, bot_name, active, created_at)
                VALUES (?, ?, ?, ?)
            """, (bot_token, bot_name, 1, datetime.datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'bot_name': bot_name,
                'message': f'Bot "{bot_name}" configurato con successo'
            })
            
        except requests.exceptions.RequestException:
            return jsonify({'error': 'Errore di connessione a Telegram'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# --- API GESTIONE CHAT ---
@bp.route('/chats', methods=['GET', 'POST'])
def telegram_chats():
    if request.method == 'GET':
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("SELECT id, name, chat_id, alert_types, civici_filter, asset_types, active FROM telegram_chats ORDER BY name")
            rows = c.fetchall()
            conn.close()
            
            chats = [{
                'id': r[0], 
                'name': r[1], 
                'chat_id': r[2], 
                'alert_types': r[3].split(',') if r[3] else [],
                'civici_filter': r[4],
                'asset_types': r[5].split(',') if r[5] else [],
                'active': bool(r[6])
            } for r in rows]
            return jsonify({'chats': chats})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            name = data.get('name', '').strip()
            chat_id = data.get('chat_id', '').strip()
            alert_types = data.get('alert_types', '')
            civici_filter = data.get('civici_filter', '').strip()
            asset_types = data.get('asset_types', '')
            
            if not name or not chat_id:
                return jsonify({'error': 'Nome e Chat ID richiesti'}), 400
            
            if not alert_types:
                return jsonify({'error': 'Seleziona almeno un tipo di alert'}), 400
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("""
                INSERT INTO telegram_chats (name, chat_id, alert_types, civici_filter, asset_types, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (name, chat_id, alert_types, civici_filter, asset_types, 1, datetime.datetime.now().isoformat()))
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'Chat aggiunta con successo'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# --- FUNZIONE INVIO MESSAGGIO ---
def send_telegram_message(chat_id, message):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT bot_token FROM telegram_config WHERE active = 1 ORDER BY id DESC LIMIT 1")
        config = c.fetchone()
        conn.close()
        
        if not config or not config[0]:
            return False, "Bot non configurato"
        
        bot_token = config[0]
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        payload = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': 'HTML'
        }
        
        response = requests.post(url, json=payload, timeout=10)
        
        if response.status_code == 200 and response.json().get('ok'):
            return True, "Messaggio inviato"
        else:
            return False, f"Errore API: {response.text}"
            
    except Exception as e:
        return False, f"Errore: {str(e)}"

# --- API TEST INVIO ---
@bp.route('/test', methods=['POST'])
def test_send():
    try:
        data = request.get_json()
        chat_id = data.get('chat_id', '').strip()
        
        if not chat_id:
            return jsonify({'error': 'Chat ID richiesto'}), 400
        
        test_message = "🤖 Test messaggio da GESTMAN\n📅 " + datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
        
        success, message = send_telegram_message(chat_id, test_message)
        
        if success:
            return jsonify({'success': True, 'message': 'Messaggio di test inviato'})
        else:
            return jsonify({'error': message}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- API DETTAGLI CHAT SINGOLA ---
@bp.route('/chats/<int:chat_id>', methods=['GET'])
def get_chat_details(chat_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, name, chat_id, alert_types, civici_filter, asset_types, active FROM telegram_chats WHERE id = ?", (chat_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Chat non trovata'}), 404
        
        chat = {
            'id': row[0],
            'name': row[1],
            'chat_id': row[2],
            'alert_types': row[3].split(',') if row[3] else [],
            'civici_filter': row[4],
            'asset_types': row[5].split(',') if row[5] else [],
            'active': bool(row[6])
        }
        
        return jsonify({'chat': chat})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- API MODIFICA/ELIMINA CHAT ---
@bp.route('/chats/<int:chat_id>', methods=['PUT', 'DELETE'])
def manage_chat(chat_id):
    if request.method == 'PUT':
        try:
            data = request.get_json()
            name = data.get('name', '').strip()
            chat_id_value = data.get('chat_id', '').strip()
            alert_types = data.get('alert_types', '')
            civici_filter = data.get('civici_filter', '').strip()
            asset_types = data.get('asset_types', '')
            active = data.get('active', True)
            
            if not name or not chat_id_value:
                return jsonify({'error': 'Nome e Chat ID richiesti'}), 400
            
            if not alert_types:
                return jsonify({'error': 'Seleziona almeno un tipo di alert'}), 400
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            
            # Verifica che la chat esista
            c.execute("SELECT id FROM telegram_chats WHERE id = ?", (chat_id,))
            if not c.fetchone():
                conn.close()
                return jsonify({'error': 'Chat non trovata'}), 404
            
            # Aggiorna la chat
            c.execute("""
                UPDATE telegram_chats 
                SET name = ?, chat_id = ?, alert_types = ?, civici_filter = ?, asset_types = ?, active = ?
                WHERE id = ?
            """, (name, chat_id_value, alert_types, civici_filter, asset_types, 1 if active else 0, chat_id))
            
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': 'Chat aggiornata con successo'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    elif request.method == 'DELETE':
        try:
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            
            # Verifica che la chat esista
            c.execute("SELECT name FROM telegram_chats WHERE id = ?", (chat_id,))
            chat = c.fetchone()
            
            if not chat:
                conn.close()
                return jsonify({'error': 'Chat non trovata'}), 404
            
            # Elimina la chat
            c.execute("DELETE FROM telegram_chats WHERE id = ?", (chat_id,))
            conn.commit()
            conn.close()
            
            return jsonify({'success': True, 'message': f'Chat "{chat[0]}" eliminata'})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

# --- INIZIALIZZAZIONE ---
init_telegram_db()

# --- FUNZIONE DI INTEGRAZIONE AUTOMATICA ---
def send_alert_to_telegram(alert_data):
    """
    Invia automaticamente un alert su Telegram agli utenti configurati
    alert_data: dict con 'tipo', 'titolo', 'descrizione', 'civico', 'asset', 'operatore'
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica se il bot è configurato
        c.execute("SELECT bot_token FROM telegram_config WHERE active = 1 ORDER BY id DESC LIMIT 1")
        config = c.fetchone()
        if not config or not config[0]:
            print("[TELEGRAM] Bot non configurato, alert non inviato")
            return False
        
        bot_token = config[0]
        
        # Trova gli utenti che devono ricevere questo tipo di alert
        # Pattern flessibile per scadenza/scadenze
        if alert_data['tipo'] in ['scadenza', 'scadenze']:
            search_pattern = f"%scaden%"  # Trova sia 'scadenza' che 'scadenze'
        else:
            search_pattern = f"%{alert_data['tipo']}%"
        print(f"[DEBUG TELEGRAM] Cercando utenti con pattern: {search_pattern}")
        
        c.execute("""
            SELECT chat_id, name, alert_types, civici_filter, asset_types 
            FROM telegram_chats 
            WHERE active = 1 AND alert_types LIKE ?
        """, (search_pattern,))
        
        users = c.fetchall()
        print(f"[DEBUG TELEGRAM] Query risultati: {len(users)} utenti trovati")
        for user in users:
            print(f"[DEBUG TELEGRAM] User: {user[1]}, Alert Types: '{user[2]}'")
        
        conn.close()
        
        if not users:
            print(f"[TELEGRAM] Nessun utente configurato per alert tipo '{alert_data['tipo']}'")
            return False
        
        # Prepara il messaggio
        if alert_data['tipo'] == 'non_conformita':
            emoji = "🚨"
        elif alert_data['tipo'] == 'Tickets':
            emoji = "🎫"
        else:
            emoji = "⏰"
        
        # Costruisci il messaggio in base al tipo
        if alert_data['tipo'] == 'scadenza':
            # Messaggio speciale per le scadenze con formatting pulito
            message = f"{emoji} <b>Alert GESTMAN</b>\n\n"
            message += f"<b>Tipo:</b> Scadenze\n"
            
            if alert_data.get('civico'):
                message += f"<b>Civico:</b> {alert_data['civico']}\n"
            if alert_data.get('asset'):
                message += f"<b>Asset:</b> {alert_data['asset']}\n"
            if alert_data.get('operazione'):
                message += f"<b>Operazione:</b> {alert_data['operazione']}\n"
            if alert_data.get('note'):
                message += f"<b>Info:</b> {alert_data['note']}\n"
            
            message += f"\n📅 {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
        elif alert_data['tipo'] == 'Tickets':
            # Messaggio speciale per i tickets
            message = f"{emoji} <b>Nuovo Ticket GESTMAN</b>\n\n"
            
            if alert_data.get('operatore'):
                message += f"<b>Richiesto da:</b> {alert_data['operatore']}\n"
            if alert_data.get('civico'):
                message += f"<b>Civico:</b> {alert_data['civico']}\n"
            if alert_data.get('asset'):
                message += f"<b>Asset:</b> {alert_data['asset']}\n"
            if alert_data.get('descrizione'):
                message += f"<b>Descrizione:</b> {alert_data['descrizione']}\n"
            if alert_data.get('note') and alert_data['note'] != alert_data.get('descrizione'):
                message += f"<b>Note:</b> {alert_data['note']}\n"
            
            message += f"\n📅 {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
            message += f"\n\n💡 <i>Nuovo ticket da gestire nella sezione Alert</i>"
        else:
            # Messaggio standard per altri tipi di alert
            message = f"{emoji} <b>Alert GESTMAN</b>\n\n"
            message += f"<b>Tipo:</b> {alert_data['tipo'].replace('_', ' ').title()}\n"
            
            if alert_data.get('operatore'):
                message += f"<b>Operatore:</b> {alert_data['operatore']}\n"
            if alert_data.get('civico'):
                message += f"<b>Civico:</b> {alert_data['civico']}\n"
            if alert_data.get('asset'):
                message += f"<b>Asset:</b> {alert_data['asset']}\n"
            message += f"<b>Descrizione:</b> {alert_data['descrizione']}\n"
            if alert_data.get('note'):
                message += f"<b>Note:</b> {alert_data['note']}\n"
            message += f"\n📅 {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}"
        
        # DEBUG: Log di tutti i dati ricevuti
        print(f"[DEBUG TELEGRAM] Alert data ricevuti: {alert_data}")
        print(f"[DEBUG TELEGRAM] Messaggio costruito: {message}")
        
        sent_count = 0
        
        # Invia a ogni utente configurato (applicando filtri)
        for user in users:
            chat_id, name, alert_types, civici_filter, asset_types = user
            
            print(f"[DEBUG TELEGRAM] Processando utente: {name}")
            print(f"[DEBUG TELEGRAM] - Chat ID: {chat_id}")
            print(f"[DEBUG TELEGRAM] - Civici filter: '{civici_filter}'")
            print(f"[DEBUG TELEGRAM] - Asset types: '{asset_types}'")
            print(f"[DEBUG TELEGRAM] - Alert civico: '{alert_data.get('civico')}'")
            print(f"[DEBUG TELEGRAM] - Alert asset: '{alert_data.get('asset')}'")
            
            # Controlla filtro civici
            if civici_filter and alert_data.get('civico'):
                civici_allowed = [c.strip() for c in civici_filter.split(',')]
                print(f"[DEBUG TELEGRAM] - Civici allowed: {civici_allowed}")
                if alert_data['civico'] not in civici_allowed:
                    print(f"[DEBUG TELEGRAM] - SKIP: Civico {alert_data['civico']} non in lista allowed")
                    continue
            
            # Controlla filtro tipi asset
            if asset_types and alert_data.get('asset'):
                asset_allowed = [a.strip() for a in asset_types.split(',')]
                print(f"[DEBUG TELEGRAM] - Asset allowed: {asset_allowed}")
                print(f"[DEBUG TELEGRAM] - Asset: '{alert_data.get('asset')}'")
                print(f"[DEBUG TELEGRAM] - Asset tipo dal DB: '{alert_data.get('asset_tipo')}'")
                
                # Usa il tipo di asset dal database invece del matching testuale
                asset_tipo_db = alert_data.get('asset_tipo', '')
                
                if asset_tipo_db:
                    # Controlla se il tipo di asset dal DB è nella lista allowed
                    asset_match = asset_tipo_db in asset_allowed
                    print(f"[DEBUG TELEGRAM] - Match diretto tipo DB: {asset_match}")
                    
                    if not asset_match:
                        # Fallback: controlla variazioni case-insensitive
                        asset_tipo_lower = asset_tipo_db.lower()
                        asset_match = any(allowed.lower() == asset_tipo_lower for allowed in asset_allowed)
                        print(f"[DEBUG TELEGRAM] - Match case-insensitive: {asset_match}")
                    
                    if not asset_match:
                        # Controlla variazioni singolare/plurale
                        for allowed in asset_allowed:
                            allowed_lower = allowed.lower()
                            
                            # Test: asset_tipo vs allowed (es. "fresa" vs "frese")
                            if asset_tipo_lower == allowed_lower:
                                asset_match = True
                                break
                            
                            # Test: plurale italiano -> singolare (es. "frese" -> "fresa")
                            if allowed_lower.endswith('se') and asset_tipo_lower == allowed_lower[:-1] + 'a':
                                asset_match = True
                                print(f"[DEBUG TELEGRAM] - Match plurale->singolare: '{allowed}' -> '{asset_tipo_db}'")
                                break
                            
                            # Test: singolare -> plurale (es. "fresa" -> "frese")  
                            if asset_tipo_lower.endswith('a') and allowed_lower == asset_tipo_lower[:-1] + 'e':
                                asset_match = True
                                print(f"[DEBUG TELEGRAM] - Match singolare->plurale: '{asset_tipo_db}' -> '{allowed}'")
                                break
                            
                            # Test: plurale maschile (es. "torno" vs "torni")
                            if allowed_lower.endswith('i') and asset_tipo_lower == allowed_lower[:-1] + 'o':
                                asset_match = True
                                print(f"[DEBUG TELEGRAM] - Match plurale maschile->singolare: '{allowed}' -> '{asset_tipo_db}'")
                                break
                            
                            # Test: singolare maschile -> plurale (es. "torno" -> "torni")
                            if asset_tipo_lower.endswith('o') and allowed_lower == asset_tipo_lower[:-1] + 'i':
                                asset_match = True
                                print(f"[DEBUG TELEGRAM] - Match singolare maschile->plurale: '{asset_tipo_db}' -> '{allowed}'")
                                break
                else:
                    # Fallback al vecchio sistema se asset_tipo non è disponibile
                    print(f"[DEBUG TELEGRAM] - Asset tipo non disponibile, usando fallback testuale")
                    titolo_lower = alert_data['titolo'].lower()
                    descrizione_lower = alert_data['descrizione'].lower()
                    
                    asset_match = False
                    for asset_type in asset_allowed:
                        asset_lower = asset_type.lower()
                        if asset_lower in titolo_lower or asset_lower in descrizione_lower:
                            asset_match = True
                            print(f"[DEBUG TELEGRAM] - Match testuale per '{asset_type}'")
                            break
                
                print(f"[DEBUG TELEGRAM] - Asset match found: {asset_match}")
                if not asset_match:
                    print(f"[DEBUG TELEGRAM] - SKIP: Asset type non matching")
                    continue
            
            print(f"[DEBUG TELEGRAM] - Invio messaggio a {name}...")
            
            # Invia il messaggio
            success, result = send_telegram_message(chat_id, message)
            if success:
                sent_count += 1
                print(f"[TELEGRAM] Alert inviato a {name} ({chat_id})")
                
                # Log dell'invio
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("""
                    INSERT INTO telegram_logs (chat_id, message, status, sent_at)
                    VALUES (?, ?, ?, ?)
                """, (chat_id, message, 'sent', datetime.datetime.now().isoformat()))
                conn.commit()
                conn.close()
            else:
                print(f"[TELEGRAM] Errore invio a {name} ({chat_id}): {result}")
        
        print(f"[TELEGRAM] Alert inviato a {sent_count} utenti")
        return sent_count > 0
        
    except Exception as e:
        print(f"[TELEGRAM] Errore durante invio alert: {str(e)}")
        return False

# --- FUNZIONE INVIO NOTIFICA TICKET ---
def send_ticket_notification(alert_id, titolo, descrizione, operatore, civico=None, asset=None):
    """Invia notifica Telegram per nuovo ticket"""
    try:
        # Crea il messaggio
        message = f"🎫 <b>NUOVO TICKET</b>\n"
        message += f"📌 <b>ID:</b> #{alert_id}\n"
        message += f"👤 <b>Operatore:</b> {operatore}\n\n"
        
        if civico:
            message += f"🏠 <b>Civico:</b> {civico}\n"
        if asset:
            message += f"🔧 <b>Asset:</b> {asset}\n"
            
        message += f"\n📝 <b>Descrizione:</b>\n{descrizione}\n"
        message += f"\n📅 <i>{datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}</i>"
        
        # Trova le chat che hanno "Tickets" nei loro alert_types
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""
            SELECT name, chat_id FROM telegram_chats 
            WHERE active = 1 AND (alert_types LIKE '%Tickets%' OR alert_types = '')
        """)
        
        chats = c.fetchall()
        conn.close()
        
        sent_count = 0
        
        for name, chat_id in chats:
            success, result = send_telegram_message(chat_id, message)
            if success:
                sent_count += 1
                print(f"[TELEGRAM] Ticket inviato a {name} ({chat_id})")
                
                # Log dell'invio
                conn = sqlite3.connect(DB_PATH)
                c = conn.cursor()
                c.execute("""
                    INSERT INTO telegram_logs (chat_id, message, status, sent_at, alert_id)
                    VALUES (?, ?, ?, ?, ?)
                """, (chat_id, message, 'sent', datetime.datetime.now().isoformat(), alert_id))
                conn.commit()
                conn.close()
            else:
                print(f"[TELEGRAM] Errore invio ticket a {name} ({chat_id}): {result}")
        
        print(f"[TELEGRAM] Ticket inviato a {sent_count} utenti")
        return sent_count > 0
        
    except Exception as e:
        print(f"[TELEGRAM] Errore durante invio ticket: {str(e)}")
        return False

@bp.route('/asset-types', methods=['GET'])
def get_asset_types_for_telegram():
    """Ottiene tutti i tipi di asset disponibili dal database per configurazione Telegram"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Estrae i tipi di asset dalla tabella assets
        c.execute("SELECT DISTINCT tipo FROM assets WHERE tipo IS NOT NULL AND tipo != '' ORDER BY tipo")
        rows = c.fetchall()
        conn.close()
        
        asset_types = [{'key': row[0], 'label': row[0]} for row in rows if row[0]]
        
        # Aggiungi l'opzione "Seleziona tutti" in cima
        asset_types.insert(0, {'key': 'ALL', 'label': '🔄 Seleziona tutti asset'})
        
        return jsonify({'asset_types': asset_types})
        
    except Exception as e:
        print(f"[TELEGRAM] Errore recupero tipi asset: {e}")
        return jsonify({'error': f'Errore recupero tipi asset: {e}'}), 500

@bp.route('/messages/<username>', methods=['GET'])
def get_user_messages(username):
    """Recupera gli ultimi messaggi Telegram per un utente specifico"""
    try:
        # Limit di messaggi da recuperare (default 10, max 50)
        limit = min(int(request.args.get('limit', 10)), 50)
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Prima trova il chat_id dell'utente
        c.execute("""
            SELECT chat_id FROM telegram_chats 
            WHERE name = ? AND active = 1
        """, (username,))
        
        user_chat = c.fetchone()
        if not user_chat:
            conn.close()
            return jsonify({'messages': [], 'enabled': False})
        
        chat_id = user_chat[0]
        
        # Recupera gli ultimi messaggi inviati a questo utente
        c.execute("""
            SELECT id, alert_id, message, sent_at, status
            FROM telegram_logs 
            WHERE chat_id = ? AND status = 'sent'
            ORDER BY sent_at DESC
            LIMIT ?
        """, (chat_id, limit))
        
        rows = c.fetchall()
        conn.close()
        
        messages = []
        for row in rows:
            log_id, alert_id, message, sent_at, status = row
            
            # Parse del messaggio per estrarre info
            message_type = 'alert'
            if '🎫' in message:
                message_type = 'ticket'
            elif '⏰' in message or 'Scadenz' in message:
                message_type = 'scadenza'
            elif '🚨' in message:
                message_type = 'non_conformita'
            
            # Rimuovi HTML tags per il display nel widget
            clean_message = message.replace('<b>', '').replace('</b>', '')
            clean_message = clean_message.replace('<i>', '').replace('</i>', '')
            
            # Tronca il messaggio se troppo lungo per il widget
            if len(clean_message) > 100:
                clean_message = clean_message[:97] + '...'
            
            messages.append({
                'id': log_id,
                'alert_id': alert_id,
                'message': clean_message,
                'timestamp': sent_at,
                'type': message_type
            })
        
        return jsonify({
            'messages': messages,
            'enabled': True
        })
        
    except Exception as e:
        print(f"[TELEGRAM] Errore recupero messaggi utente {username}: {e}")
        return jsonify({'error': str(e)}, 500)

@bp.route('/message/<int:message_id>/full', methods=['GET'])
def get_full_message(message_id):
    """Recupera il messaggio Telegram completo per ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("""
            SELECT id, alert_id, message, sent_at, status, chat_id
            FROM telegram_logs 
            WHERE id = ? AND status = 'sent'
        """, (message_id,))
        
        row = c.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Messaggio non trovato'}), 404
        
        log_id, alert_id, message, sent_at, status, chat_id = row
        
        # Parse del messaggio per estrarre info
        message_type = 'alert'
        if '🎫' in message:
            message_type = 'ticket'
        elif '⏰' in message or 'Scadenz' in message:
            message_type = 'scadenza'
        elif '🚨' in message:
            message_type = 'non_conformita'
        
        # Rimuovi HTML tags per il display
        clean_message = message.replace('<b>', '').replace('</b>', '')
        clean_message = clean_message.replace('<i>', '').replace('</i>', '')
        
        return jsonify({
            'id': log_id,
            'alert_id': alert_id,
            'message': clean_message,  # Messaggio completo senza troncature
            'full_message': message,   # Messaggio originale con HTML tags
            'timestamp': sent_at,
            'type': message_type
        })
        
    except Exception as e:
        print(f"[TELEGRAM] Errore recupero messaggio completo {message_id}: {e}")
        return jsonify({'error': str(e)}), 500

# Force reload# reload 08/19/2025 09:53:04
