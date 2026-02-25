
from flask import Flask, request, jsonify, g
import sqlite3
import sys
import os
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger


app = Flask(__name__)
CORS(app)

# Blueprint civici
from civici import bp as civici_bp
app.register_blueprint(civici_bp)

# Blueprint rubrica
try:
    from rubrica import bp as rubrica_bp
    app.register_blueprint(rubrica_bp, url_prefix='/api/rubrica')
    print("Rubrica blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint rubrica: {e}")

# Blueprint alert manager (sostituisce parte di compilazioni)
try:
    from alert_manager import bp as alert_bp
    app.register_blueprint(alert_bp, url_prefix='/api/compilazioni')  # Mantiene stesso URL per compatibilità
    print("Alert manager blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint alert manager: {e}")

# Blueprint docs
try:
    from docs import bp as docs_bp
    app.register_blueprint(docs_bp, url_prefix='/api/docs')
    print("Docs blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint docs: {e}")

# Route dirette per /api/alert 
@app.route('/api/alert', methods=['GET', 'POST'])
def handle_alert():
    """Handle alert requests"""
    try:
        if request.method == 'GET':
            from alert_manager import get_alerts
            return get_alerts()
        elif request.method == 'POST':
            from alert_manager import create_alert
            return create_alert()
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alert/<int:alert_id>/close', methods=['PATCH'])
def handle_alert_close(alert_id):
    """Handle alert close requests"""
    try:
        from alert_manager import close_alert
        return close_alert(alert_id)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/alert/<int:alert_id>/take', methods=['PATCH'])
def handle_alert_take(alert_id):
    """Handle alert take requests"""
    try:
        from alert_manager import take_alert
        return take_alert(alert_id)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Blueprint calendario
try:
    from calendario import bp as calendario_bp
    app.register_blueprint(calendario_bp, url_prefix='/api/calendario')
    print("Calendario blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint calendario: {e}")

# Blueprint telegram
try:
    from telegram_manager import bp as telegram_bp
    app.register_blueprint(telegram_bp, url_prefix='/api/telegram')
    print("Telegram blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint telegram: {e}")

# Blueprint dynamic forms
try:
    from dynamic_forms import bp as dynamic_forms_bp
    app.register_blueprint(dynamic_forms_bp, url_prefix='/api/dynamic-forms')
    print("Dynamic Forms blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint dynamic forms: {e}")

# Blueprint asset types
try:
    from asset_types import bp as asset_types_bp
    app.register_blueprint(asset_types_bp, url_prefix='/api/asset-types')
    print("Asset Types blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint asset types: {e}")

# Blueprint docs
try:
    from docs import bp as docs_bp
    app.register_blueprint(docs_bp, url_prefix='/api/docs')
    print("Docs blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint docs: {e}")

# Blueprint magazzino
try:
    from magazzino import bp as magazzino_bp
    app.register_blueprint(magazzino_bp, url_prefix='/api/magazzino')
    print("Magazzino blueprint registrato")
except Exception as e:
    print(f"ERRORE blueprint magazzino: {e}")

DB_PATH = os.path.join(os.path.dirname(__file__), "gestman.db")


# API per eliminare asset orfani (senza civico associato)
@app.route("/api/assets/orfani", methods=["DELETE"])
def delete_orphan_assets():
    conn = get_db()
    # Elimina asset il cui civico_numero non esiste più nella tabella civici
    conn.execute("DELETE FROM assets WHERE civico_numero NOT IN (SELECT numero FROM civici)")
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# --- API gestione assets ---
ASSETS_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(ASSETS_UPLOAD_FOLDER, exist_ok=True)

@app.route("/api/assets", methods=["GET"])
def list_assets():
    civico = request.args.get("civico")
    tipo = request.args.get("tipo")
    conn = get_db()
    
    # Costruisci la query con i filtri
    query = "SELECT * FROM assets WHERE 1=1"
    params = []
    
    if civico:
        query += " AND civico_numero = ?"
        params.append(civico)
    
    if tipo:
        query += " AND tipo = ?"
        params.append(tipo)
    
    rows = conn.execute(query, params).fetchall()
    assets = []
    for r in rows:
        dati = json.loads(r["dati"]) if r["dati"] else {}
        asset = {
            "tipo": r["tipo"], 
            "Id Aziendale": r["id_aziendale"],  # Mantengo la compatibilità con Asset Manager
            "id_aziendale": r["id_aziendale"],  # Aggiungo per il calendario
            "id": r["id_aziendale"],  # Per la pianta interattiva
            "civico_numero": r["civico_numero"],
            "marca": dati.get("Costruttore", ""),  # Per il calendario
            "modello": dati.get("Modello", ""),   # Per il calendario
            "posizione_x": r["posizione_x"],  # Per la pianta interattiva
            "posizione_y": r["posizione_y"],  # Per la pianta interattiva
            **dati
        }
        asset["doc_tecnica"] = r["doc_tecnica"]
        assets.append(asset)
    conn.close()
    return jsonify({"assets": assets})

@app.route("/api/assets", methods=["POST"])
def add_asset():
    print(f"[DEBUG] POST /api/assets - Form data: {dict(request.form)}", file=sys.stderr)
    
    tipo = request.form.get("tipo")
    # Gestisce diversi formati del campo ID aziendale per compatibilità
    id_aziendale = (request.form.get("id_aziendale") or 
                   request.form.get("Id Aziendale") or 
                   request.form.get("ID_AZIENDALE"))
    civico_numero = request.form.get("civico_numero")
    
    print(f"[DEBUG] Parsed data - tipo: {tipo}, id_aziendale: {id_aziendale}, civico_numero: {civico_numero}", file=sys.stderr)
    
    # Validazione campi obbligatori
    if not tipo:
        print("[ERROR] Tipo mancante", file=sys.stderr)
        return jsonify({"error": "Campo 'tipo' obbligatorio"}), 400
    if not id_aziendale:
        print("[ERROR] ID aziendale mancante", file=sys.stderr)
        return jsonify({"error": "Campo 'Id Aziendale' obbligatorio"}), 400
    if not civico_numero:
        print("[ERROR] Civico numero mancante", file=sys.stderr)
        return jsonify({"error": "Campo 'civico_numero' obbligatorio"}), 400
    
    doc_tecnica = None
    # Raccogli tutti i campi dinamici
    dati = {}
    for k in request.form:
        if k not in ("tipo", "id_aziendale", "Id Aziendale", "ID_AZIENDALE", "civico_numero"):
            try:
                v = json.loads(request.form[k])
            except Exception:
                v = request.form[k]
            dati[k] = v
    # Gestione upload file
    if "documentazione_file" in request.files:
        file = request.files["documentazione_file"]
        if file and file.filename:
            filename = secure_filename(file.filename)
            filepath = os.path.join(ASSETS_UPLOAD_FOLDER, filename)
            file.save(filepath)
            doc_tecnica = filename
    dati_json = json.dumps(dati)
    print(f"[DEBUG] Trying to insert - dati: {dati}", file=sys.stderr)
    
    conn = get_db()
    try:
        conn.execute("INSERT INTO assets (tipo, id_aziendale, dati, doc_tecnica, civico_numero) VALUES (?, ?, ?, ?, ?)",
                     (tipo, id_aziendale, dati_json, doc_tecnica, civico_numero))
        conn.commit()
        print(f"[DEBUG] Asset inserted successfully", file=sys.stderr)
    except sqlite3.IntegrityError as e:
        print(f"[ERROR] IntegrityError: {e}", file=sys.stderr)
        conn.close()
        return jsonify({"error": "Id Aziendale già esistente"}), 400
    except Exception as e:
        print(f"[ERROR] Unexpected error: {e}", file=sys.stderr)
        conn.close()
        return jsonify({"error": f"Errore database: {str(e)}"}), 500
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/assets/<id_aziendale>", methods=["DELETE"])
def delete_asset(id_aziendale):
    conn = get_db()
    cur = conn.execute("DELETE FROM assets WHERE id_aziendale = ?", (id_aziendale,))
    conn.commit()
    deleted = cur.rowcount
    conn.close()
    if deleted:
        return jsonify({"ok": True})
    else:
        return jsonify({"error": "Asset non trovato"}), 404

# Endpoint PATCH per aggiornare un asset esistente
@app.route("/api/assets/<id_aziendale>", methods=["PATCH", "PUT"])
def update_asset(id_aziendale):
    import sys
    print("PATCH /api/assets/", id_aziendale, file=sys.stderr)
    data = request.form.to_dict() if request.form else (request.json if request.is_json else {})
    print("Dati ricevuti:", data, file=sys.stderr)
    if not data and not request.files:
        print("Nessun dato fornito", file=sys.stderr)
        return jsonify({"error": "Nessun dato fornito."}), 400
    fields = {}
    # Campi base
    if "tipo" in data:
        fields["tipo"] = data["tipo"]
    if "civico_numero" in data:
        fields["civico_numero"] = data["civico_numero"]
    
    # Campi posizione per la pianta interattiva
    if "posizione_x" in data:
        try:
            fields["posizione_x"] = int(data["posizione_x"]) if data["posizione_x"] != '' else None
        except (ValueError, TypeError):
            fields["posizione_x"] = None
    if "posizione_y" in data:
        try:
            fields["posizione_y"] = int(data["posizione_y"]) if data["posizione_y"] != '' else None
        except (ValueError, TypeError):
            fields["posizione_y"] = None
    
    # Campi dinamici: tutto ciò che non è tipo, Id Aziendale, civico_numero, posizione_x, posizione_y
    dati = {}
    for k, v in data.items():
        if k not in ("tipo", "Id Aziendale", "civico_numero", "posizione_x", "posizione_y"):
            try:
                dati[k] = json.loads(v) if isinstance(v, str) and v not in ("", "null") else v
            except Exception:
                dati[k] = v
    # Se ci sono dati dinamici, aggiorna il campo dati
    if dati:
        fields["dati"] = json.dumps(dati)
    # Gestione upload file
    if "documentazione_file" in request.files:
        file = request.files["documentazione_file"]
        if file and file.filename:
            filename = secure_filename(file.filename)
            filepath = os.path.join(ASSETS_UPLOAD_FOLDER, filename)
            file.save(filepath)
            fields["doc_tecnica"] = filename
    if not fields:
        print("Nessun campo da aggiornare", file=sys.stderr)
        return jsonify({"error": "Nessun campo da aggiornare."}), 400
    set_clause = ", ".join([f"{k} = ?" for k in fields.keys()])
    values = list(fields.values())
    values.append(id_aziendale)
    print("Query:", f"UPDATE assets SET {set_clause} WHERE id_aziendale = ?", file=sys.stderr)
    print("Valori:", values, file=sys.stderr)
    conn = get_db()
    cur = conn.execute(f"UPDATE assets SET {set_clause} WHERE id_aziendale = ?", values)
    conn.commit()
    updated = cur.rowcount
    print("Righe aggiornate:", updated, file=sys.stderr)
    conn.close()
    if updated:
        return jsonify({"ok": True})
    else:
        return jsonify({"error": "Asset non trovato o nessuna modifica"}), 404

# --- API gestione civici ---
# NOTA: Gli endpoint /api/civici sono gestiti dal blueprint in civici.py
os.makedirs(ASSETS_UPLOAD_FOLDER, exist_ok=True)

# --- API gestione piante civici ---
FLOOR_PLANS_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "floor_plans")
os.makedirs(FLOOR_PLANS_FOLDER, exist_ok=True)

@app.route("/api/civici/<civico_numero>/pianta", methods=["GET"])
def get_floor_plan(civico_numero):
    """Serve la pianta per un civico specifico"""
    from flask import send_file
    import glob
    
    # Cerca file con diversi formati
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.webp']
    for ext in extensions:
        pattern = os.path.join(FLOOR_PLANS_FOLDER, f"{civico_numero}.{ext[2:]}")
        files = glob.glob(pattern)
        if files:
            return send_file(files[0])
    
    # Se non trova nessun file, restituisce 404
    return jsonify({"error": "Pianta non trovata"}), 404

@app.route("/api/civici/<civico_numero>/pianta", methods=["POST"])
def upload_floor_plan(civico_numero):
    """Carica una pianta per un civico specifico"""
    if 'file' not in request.files:
        return jsonify({"error": "Nessun file fornito"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nessun file selezionato"}), 400
    
    if file:
        # Ottieni l'estensione del file
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1].lower()
        
        # Verifica che sia un'immagine
        allowed_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'}
        if file_ext not in allowed_extensions:
            return jsonify({"error": "Formato file non supportato. Usa: PNG, JPG, GIF, SVG, WebP"}), 400
        
        # Salva con il nome del civico
        new_filename = f"{civico_numero}{file_ext}"
        filepath = os.path.join(FLOOR_PLANS_FOLDER, new_filename)
        
        # Rimuovi eventuali piante esistenti per questo civico
        import glob
        for ext in allowed_extensions:
            old_files = glob.glob(os.path.join(FLOOR_PLANS_FOLDER, f"{civico_numero}{ext}"))
            for old_file in old_files:
                if os.path.exists(old_file):
                    os.remove(old_file)
        
        file.save(filepath)
        return jsonify({"ok": True, "filename": new_filename})

@app.route("/api/civici/<civico_numero>/pianta", methods=["DELETE"])
def delete_floor_plan(civico_numero):
    """Elimina la pianta per un civico specifico"""
    import glob
    
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.svg', '*.webp']
    deleted = False
    
    for ext in extensions:
        pattern = os.path.join(FLOOR_PLANS_FOLDER, f"{civico_numero}.{ext[2:]}")
        files = glob.glob(pattern)
        for file_path in files:
            if os.path.exists(file_path):
                os.remove(file_path)
                deleted = True
    
    if deleted:
        return jsonify({"ok": True})
    else:
        return jsonify({"error": "Pianta non trovata"}), 404

# --- API gestione utenti (solo admin, senza autenticazione reale) ---

@app.route("/api/users", methods=["GET"])
def list_users():
    conn = get_db()
    users = conn.execute("SELECT id, username, password_clear as password, is_admin, nome FROM users").fetchall()
    conn.close()
    return jsonify({"users": [dict(u) for u in users]})

# Endpoint per aggiungere un nuovo utente (solo admin)
@app.route("/api/users", methods=["POST"])
def add_user():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    nome = data.get("nome", "").strip()
    is_admin = int(bool(data.get("is_admin", False)))
    if not username or not password:
        return jsonify({"error": "Compila tutti i campi."}), 400
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Nome utente già esistente."}), 400
    hashed = generate_password_hash(password)
    conn.execute(
        "INSERT INTO users (username, password, is_admin, password_clear, nome) VALUES (?, ?, ?, ?, ?)",
        (username, hashed, is_admin, password, nome)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "is_admin": bool(is_admin), "username": username})

@app.route("/api/users/<int:user_id>", methods=["PATCH"])
def update_user(user_id):
    data = request.json
    conn = get_db()
    updates = []
    params = []
    if "is_admin" in data:
        updates.append("is_admin = ?")
        params.append(int(bool(data["is_admin"])))
    if "username" in data:
        username = data["username"].strip()
        if not username:
            return jsonify({"error": "Il nome utente non può essere vuoto."}), 400
        # Verifica che non esista già
        existing = conn.execute("SELECT id FROM users WHERE username = ? AND id != ?", (username, user_id)).fetchone()
        if existing:
            return jsonify({"error": "Nome utente già esistente."}), 400
        updates.append("username = ?")
        params.append(username)
    if "nome" in data:
        nome = data["nome"].strip()
        updates.append("nome = ?")
        params.append(nome)
    if "password" in data and data["password"]:
        updates.append("password = ?")
        updates.append("password_clear = ?")
        params.append(generate_password_hash(data["password"]))
        params.append(data["password"])  # Salva anche in chiaro
    if not updates:
        conn.close()
        return jsonify({"error": "Nessun campo da aggiornare."}), 400
    params.append(user_id)
    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Endpoint per aggiornare l'utente corrente tramite username
@app.route("/api/users/<username>/update", methods=["PUT"])
def update_user_by_username(username):
    data = request.json
    conn = get_db()
    
    # Verifica che l'utente esista
    user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Utente non trovato."}), 404
    
    user_id = user["id"]
    updates = []
    params = []
    
    # Aggiorna nome se fornito
    if "nome" in data:
        nome = data["nome"].strip()
        updates.append("nome = ?")
        params.append(nome)
    
    # Aggiorna password se fornita (supporta sia 'password' che 'newPassword')
    new_password = data.get("newPassword") or data.get("password")
    if new_password:
        password = new_password.strip()
        if password:
            # Se viene fornita currentPassword, verifichiamola
            if "currentPassword" in data:
                current_user = conn.execute("SELECT password FROM users WHERE username = ?", (username,)).fetchone()
                if current_user and not check_password_hash(current_user["password"], data["currentPassword"]):
                    conn.close()
                    return jsonify({"error": "Password attuale non corretta."}), 400
            
            updates.append("password = ?")
            updates.append("password_clear = ?")
            params.append(generate_password_hash(password))
            params.append(password)  # Salva anche in chiaro
    
    if not updates:
        conn.close()
        return jsonify({"error": "Nessun campo valido da aggiornare."}), 400
    
    params.append(user_id)
    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Dati utente aggiornati con successo."})

# --- INIZIALIZZAZIONE TABELLE ---

def init_user_notes_table():
    """Inizializza la tabella per le note personali degli utenti"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS user_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

def init_user_sections_table():
    """Inizializza la tabella per i permessi sezioni utenti"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS user_sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            section TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, section)
        )
    ''')
    conn.commit()
    conn.close()

def init_user_widgets_table():
    """Inizializza la tabella per i widget personalizzati nella dashboard"""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS user_widgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            section TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()

# Inizializza le tabelle all'avvio
init_user_notes_table()
init_user_sections_table()
init_user_widgets_table()

# --- API GESTIONE NOTE UTENTE ---

@app.route("/api/users/<int:user_id>/notes", methods=["GET"])
def get_user_notes(user_id):
    """Ottiene le note personali di un utente"""
    try:
        conn = get_db()
        
        # Verifica che l'utente esista
        user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        # Ottieni le note dell'utente
        notes_row = conn.execute(
            "SELECT notes FROM user_notes WHERE user_id = ?", 
            (user_id,)
        ).fetchone()
        
        conn.close()
        
        notes = notes_row["notes"] if notes_row else ""
        return jsonify({"notes": notes})
        
    except Exception as e:
        return jsonify({"error": f"Errore recupero note: {str(e)}"}), 500

@app.route("/api/users/<int:user_id>/notes", methods=["POST", "PUT"])
def save_user_notes(user_id):
    """Salva le note personali di un utente"""
    try:
        data = request.get_json()
        notes = data.get("notes", "")
        
        conn = get_db()
        
        # Verifica che l'utente esista
        user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        # Controlla se esistono già note per questo utente
        existing = conn.execute(
            "SELECT id FROM user_notes WHERE user_id = ?", 
            (user_id,)
        ).fetchone()
        
        now = datetime.now().isoformat()
        
        if existing:
            # Aggiorna note esistenti
            conn.execute(
                "UPDATE user_notes SET notes = ?, updated_at = ? WHERE user_id = ?",
                (notes, now, user_id)
            )
        else:
            # Crea nuove note
            conn.execute(
                "INSERT INTO user_notes (user_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, notes, now, now)
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "message": "Note salvate con successo"})
        
    except Exception as e:
        return jsonify({"error": f"Errore salvataggio note: {str(e)}"}), 500

# Endpoint alternativo per username invece di user_id
@app.route("/api/users/<username>/notes", methods=["GET"])
def get_user_notes_by_username(username):
    """Ottiene le note personali di un utente tramite username"""
    try:
        conn = get_db()
        
        # Trova l'user_id dal username
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        user_id = user["id"]
        
        # Ottieni le note dell'utente
        notes_row = conn.execute(
            "SELECT notes FROM user_notes WHERE user_id = ?", 
            (user_id,)
        ).fetchone()
        
        conn.close()
        
        notes = notes_row["notes"] if notes_row else ""
        return jsonify({"notes": notes})
        
    except Exception as e:
        return jsonify({"error": f"Errore recupero note: {str(e)}"}), 500

@app.route("/api/users/<username>/notes", methods=["POST", "PUT"])
def save_user_notes_by_username(username):
    """Salva le note personali di un utente tramite username"""
    try:
        data = request.get_json()
        notes = data.get("notes", "")
        
        conn = get_db()
        
        # Trova l'user_id dal username
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        user_id = user["id"]
        
        # Controlla se esistono già note per questo utente
        existing = conn.execute(
            "SELECT id FROM user_notes WHERE user_id = ?", 
            (user_id,)
        ).fetchone()
        
        now = datetime.now().isoformat()
        
        if existing:
            # Aggiorna note esistenti
            conn.execute(
                "UPDATE user_notes SET notes = ?, updated_at = ? WHERE user_id = ?",
                (notes, now, user_id)
            )
        else:
            # Crea nuove note
            conn.execute(
                "INSERT INTO user_notes (user_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?)",
                (user_id, notes, now, now)
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "message": "Note salvate con successo"})
        
    except Exception as e:
        return jsonify({"error": f"Errore salvataggio note: {str(e)}"}), 500

# --- API GESTIONE WIDGETS DASHBOARD ---

@app.route("/api/users/<username>/widgets", methods=["GET"])
def get_user_widgets(username):
    """Ottiene i widget personalizzati di un utente"""
    try:
        conn = get_db()
        
        # Trova l'user_id dal username
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        user_id = user["id"]
        
        # Ottieni i widget dell'utente ordinati per position
        widgets = conn.execute(
            "SELECT id, section, position FROM user_widgets WHERE user_id = ? ORDER BY position",
            (user_id,)
        ).fetchall()
        
        conn.close()
        
        widgets_list = [{"id": w["id"], "section": w["section"], "position": w["position"]} for w in widgets]
        return jsonify({"widgets": widgets_list})
        
    except Exception as e:
        return jsonify({"error": f"Errore recupero widget: {str(e)}"}), 500

@app.route("/api/users/<username>/widgets", methods=["POST"])
def add_user_widget(username):
    """Aggiunge un widget alla dashboard dell'utente"""
    try:
        data = request.get_json()
        section = data.get("section", "").strip()
        
        if not section:
            return jsonify({"error": "Sezione richiesta"}), 400
        
        conn = get_db()
        
        # Trova l'user_id dal username
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        user_id = user["id"]
        
        # Verifica che l'utente non abbia già questo widget
        existing = conn.execute(
            "SELECT id FROM user_widgets WHERE user_id = ? AND section = ?",
            (user_id, section)
        ).fetchone()
        
        if existing:
            conn.close()
            return jsonify({"error": "Widget già presente"}), 400
        
        # Ottieni la posizione massima
        max_pos = conn.execute(
            "SELECT MAX(position) as max_pos FROM user_widgets WHERE user_id = ?",
            (user_id,)
        ).fetchone()
        
        position = (max_pos["max_pos"] or -1) + 1
        now = datetime.now().isoformat()
        
        # Inserisci il nuovo widget
        cursor = conn.execute(
            "INSERT INTO user_widgets (user_id, section, position, created_at) VALUES (?, ?, ?, ?)",
            (user_id, section, position, now)
        )
        
        widget_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({"success": True, "id": widget_id, "section": section, "position": position})
        
    except Exception as e:
        return jsonify({"error": f"Errore aggiunta widget: {str(e)}"}), 500

@app.route("/api/users/<username>/widgets/<int:widget_id>", methods=["DELETE"])
def delete_user_widget(username, widget_id):
    """Rimuove un widget dalla dashboard dell'utente"""
    try:
        conn = get_db()
        
        # Trova l'user_id dal username
        user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
        if not user:
            conn.close()
            return jsonify({"error": "Utente non trovato"}), 404
        
        user_id = user["id"]
        
        # Elimina il widget solo se appartiene all'utente
        conn.execute(
            "DELETE FROM user_widgets WHERE id = ? AND user_id = ?",
            (widget_id, user_id)
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({"success": True})
        
    except Exception as e:
        return jsonify({"error": f"Errore rimozione widget: {str(e)}"}), 500

# --- API gestione permessi sezioni utenti ---

@app.route("/api/users/<int:user_id>/sections", methods=["GET"])
def get_user_sections(user_id):
    """Ottieni le sezioni accessibili per un utente"""
    conn = get_db()
    
    # Controlla se l'utente è admin
    user = conn.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Utente non trovato"}), 404
    
    if user["is_admin"]:
        # Admin ha accesso a tutto
        all_sections = ['dashboard', 'assets', 'compilazioni', 'calendario', 'rubrica', 'alert', 'docs', 'tickets', 'magazzino', 'users', 'assets-manager', 'form-templates', 'telegram']
        conn.close()
        return jsonify({"sections": all_sections, "is_admin": True})
    
    # Utente normale - ottieni sezioni dal database
    sections = conn.execute(
        "SELECT section FROM user_sections WHERE user_id = ?", 
        (user_id,)
    ).fetchall()
    
    section_list = [s["section"] for s in sections]
    
    conn.close()
    return jsonify({"sections": section_list, "is_admin": False})

@app.route("/api/users/<int:user_id>/sections", methods=["POST"])
def update_user_sections(user_id):
    """Aggiorna le sezioni accessibili per un utente (solo admin)"""
    data = request.json
    sections = data.get("sections", [])
    
    # TODO: Aggiungere validazione admin qui
    
    conn = get_db()
    
    # Controlla se l'utente esiste e non è admin
    user = conn.execute("SELECT is_admin FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Utente non trovato"}), 404
    
    if user["is_admin"]:
        conn.close()
        return jsonify({"error": "Non è possibile modificare i permessi di un admin"}), 400
    
    # Sezioni permesse per utenti normali (esclude sezioni admin-only)
    allowed_sections = ['dashboard', 'assets', 'compilazioni', 'calendario', 'rubrica', 'alert', 'docs', 'tickets', 'magazzino']
    valid_sections = [s for s in sections if s in allowed_sections]
    
    # Rimuovi tutte le sezioni esistenti
    conn.execute("DELETE FROM user_sections WHERE user_id = ?", (user_id,))
    
    # Aggiungi le nuove sezioni
    for section in valid_sections:
        conn.execute(
            "INSERT INTO user_sections (user_id, section) VALUES (?, ?)",
            (user_id, section)
        )
    
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "sections": valid_sections})

@app.route("/api/sections", methods=["GET"])
def get_available_sections():
    """Ottieni tutte le sezioni disponibili del sistema"""
    sections = {
        "user_sections": [
            {"key": "dashboard", "label": "Dashboard", "icon": "🏠", "description": "Panoramica generale"},
            {"key": "assets", "label": "Assets", "icon": "⚙️", "description": "Gestione beni e attrezzature"},
            {"key": "compilazioni", "label": "Compilazioni", "icon": "📋", "description": "Form dinamici e compilazioni"},
            {"key": "calendario", "label": "Calendario", "icon": "📅", "description": "Pianificazione e scadenze"},
            {"key": "rubrica", "label": "Rubrica", "icon": "📇", "description": "Contatti e fornitori"},
            {"key": "alert", "label": "Alert", "icon": "🚨", "description": "Notifiche e avvisi sistema"},
            {"key": "docs", "label": "Documentazione", "icon": "📚", "description": "Reportistica e documentazione"},
            {"key": "tickets", "label": "Tickets", "icon": "🎫", "description": "Sistema di ticketing"},
            {"key": "magazzino", "label": "Magazzino", "icon": "📦", "description": "Gestione inventario e magazzino"}
        ],
        "admin_only_sections": [
            {"key": "users", "label": "Gestione Utenti", "icon": "👤", "description": "Amministrazione utenti"},
            {"key": "assets-manager", "label": "Assets Manager", "icon": "🏭", "description": "Gestione avanzata assets"},
            {"key": "form-templates", "label": "Template Form", "icon": "📝", "description": "Gestione template dinamici"},
            {"key": "telegram", "label": "Telegram", "icon": "📱", "description": "Integrazione Telegram"}
        ]
    }
    return jsonify(sections)

# Helper per query
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Compila tutti i campi."}), 400
    is_admin = 0
    # Se lo username inizia con 'imadmin', crea l'utente come admin se non esiste
    if username.startswith("imadmin"):
        real_username = username[len("imadmin"):]
        if not real_username:
            return jsonify({"error": "Inserisci uno username dopo 'imadmin'."}), 400
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (real_username,)).fetchone()
        if user:
            # Utente già esistente, verifica password e ruolo admin
            if check_password_hash(user["password"], password):
                if user["is_admin"]:
                    conn.close()
                    return jsonify({"success": True, "is_admin": True, "username": real_username, "nome": user["nome"]})
                else:
                    conn.close()
                    return jsonify({"error": "L'utente non ha permessi admin."}), 403
            else:
                conn.close()
                return jsonify({"error": "Credenziali non valide."}), 401
        else:
            # Crea utente admin
            hashed = generate_password_hash(password)
            try:
                conn.execute(
                    "INSERT INTO users (username, password, is_admin, password_clear) VALUES (?, ?, 1, ?)",
                    (real_username, hashed, password)
                )
                conn.commit()
                conn.close()
                return jsonify({"success": True, "is_admin": True, "username": real_username, "nome": real_username})
            except sqlite3.IntegrityError:
                conn.close()
                return jsonify({"error": "Nome utente già esistente."}), 400
    else:
        # Login normale
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()
        if user and check_password_hash(user["password"], password):
            return jsonify({"success": True, "is_admin": bool(user["is_admin"]), "username": username, "nome": user["nome"]})
        return jsonify({"error": "Credenziali non valide."}), 401
# Endpoint di test per verificare la connessione
@app.route("/api/test-connection", methods=["GET"])
def test_connection():
    """Endpoint semplice per testare la connessione al backend"""
    import datetime
    return jsonify({
        "status": "ok",
        "message": "Backend raggiungibile",
        "timestamp": datetime.datetime.now().isoformat(),
        "server": "Flask/GESTMAN"
    })

# --- SCHEDULER ALERT AUTOMATICI ---
def scheduled_alert_check():
    """
    Funzione eseguita ogni giorno alle 7:00 AM.
    Controlla se lo scheduler è abilitato e genera gli alert.
    """
    try:
        print("[SCHEDULER] Esecuzione controllo alert schedulato...")
        
        # Verifica se lo scheduler è abilitato
        db_path = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        c.execute("SELECT enabled FROM alert_scheduler_config WHERE id = 1")
        result = c.fetchone()
        
        if result and result[0]:
            print("[SCHEDULER] Alert automatici ABILITATI - Generazione in corso...")
            
            # Importa e chiama la funzione di generazione alert
            from calendario import genera_alert_scadenze
            alert_generati = genera_alert_scadenze()
            
            # Aggiorna last_run
            c.execute("""
                UPDATE alert_scheduler_config 
                SET last_run = ?
                WHERE id = 1
            """, (datetime.now().isoformat(),))
            conn.commit()
            
            print(f"[SCHEDULER] Completato. Generati {alert_generati} alert")
        else:
            print("[SCHEDULER] Alert automatici DISABILITATI - Nessuna azione")
        
        conn.close()
        
    except Exception as e:
        print(f"[SCHEDULER] ERRORE durante controllo alert: {e}")
        import traceback
        traceback.print_exc()

# Inizializza lo scheduler SOLO se non siamo in un worker Gunicorn
# In produzione con Gunicorn, lo scheduler dovrebbe girare in un processo separato
# oppure solo nel processo principale
def init_scheduler():
    """
    Inizializza lo scheduler solo se appropriato.
    - In development (python server.py): sempre attivo
    - In production (Gunicorn): solo se ENABLE_SCHEDULER=true
    """
    import os
    
    # Controlla se siamo in Gunicorn (variabile settata automaticamente)
    is_gunicorn = "gunicorn" in os.environ.get("SERVER_SOFTWARE", "").lower()
    enable_scheduler = os.environ.get("ENABLE_SCHEDULER", "false").lower() == "true"
    
    # In development, sempre attivo
    # In production, solo se esplicitamente abilitato
    should_start = not is_gunicorn or enable_scheduler
    
    if should_start:
        try:
            scheduler = BackgroundScheduler(daemon=True)
            scheduler.add_job(
                func=scheduled_alert_check,
                trigger=CronTrigger(hour=7, minute=0),  # Ogni giorno alle 7:00 AM
                id='alert_scadenze_check',
                name='Controllo Alert Scadenze Giornaliero',
                replace_existing=True
            )
            scheduler.start()
            print("[SCHEDULER] ✓ Scheduler alert inizializzato - esecuzione giornaliera alle 7:00 AM")
        except Exception as e:
            print(f"[SCHEDULER] ✗ Errore inizializzazione scheduler: {e}")
    else:
        print("[SCHEDULER] ⚠ Scheduler disabilitato (worker Gunicorn). Avviare con ENABLE_SCHEDULER=true in un processo separato.")

# Avvia scheduler
init_scheduler()

if __name__ == "__main__":
    # Configura il server per accettare connessioni remote
    # host='0.0.0.0' permette connessioni da qualsiasi IP della rete
    # threaded=True per gestire meglio le connessioni multiple (mobile)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
