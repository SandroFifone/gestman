# coding: utf-8
"""
Blueprint per la gestione dei form dinamici
Gestisce template, campi e compilazioni dei form configurabili
"""

from flask import Blueprint, request, jsonify, send_from_directory
import sqlite3
import os
import json
import uuid
import mimetypes
import shutil
from datetime import datetime
from werkzeug.utils import secure_filename

bp = Blueprint('dynamic_forms', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')

# Configurazione upload
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    '.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', 
    '.zip', '.rar', '.xls', '.xlsx', '.ppt', '.pptx'
}

# === UTILITY FUNCTIONS ===

def get_db_connection():
    """Connessione al database con foreign keys abilitate"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row  # Per accedere alle colonne per nome
    return conn

def validate_admin(request):
    """Placeholder per validazione admin - temporaneamente disabilitata per test"""
    # TODO: Implementare validazione sessione utente
    # Per ora ritorna sempre True per permettere i test
    return True

def create_field_folder(field_label):
    """Crea una cartella per il campo specificato"""
    # Sanifica il nome della cartella
    folder_name = secure_filename(field_label.replace(' ', '_'))
    folder_path = os.path.join(UPLOAD_FOLDER, folder_name)
    
    # Crea la cartella se non esiste
    os.makedirs(folder_path, exist_ok=True)
    
    return folder_path, folder_name

def allowed_file(filename, accepted_types=None):
    """Verifica se il file è di un tipo consentito"""
    if not filename:
        return False
        
    # Ottieni l'estensione del file
    _, ext = os.path.splitext(filename.lower())
    
    # Se sono specificati tipi accettati, usa quelli
    if accepted_types:
        accepted_list = [t.strip().lower() for t in accepted_types.split(',')]
        return ext in accepted_list
    
    # Altrimenti usa la lista predefinita
    return ext in ALLOWED_EXTENSIONS

def save_uploaded_file(file, field_label, compilation_id):
    """Salva un file caricato nella cartella appropriata"""
    if not file or file.filename == '':
        return None, "Nessun file selezionato"
    
    # Verifica dimensione file
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        return None, f"File troppo grande. Max {MAX_FILE_SIZE // (1024*1024)}MB"
    
    # Crea cartella per il campo
    folder_path, folder_name = create_field_folder(field_label)
    
    # Genera nome file unico
    filename = secure_filename(file.filename)
    name, ext = os.path.splitext(filename)
    unique_filename = f"{compilation_id}_{uuid.uuid4().hex[:8]}_{name}{ext}"
    
    # Percorso completo del file
    file_path = os.path.join(folder_path, unique_filename)
    
    try:
        # Salva il file
        file.save(file_path)
        
        # Ritorna info del file salvato
        return {
            'filename': unique_filename,
            'original_name': filename,
            'folder': folder_name,
            'size': file_size,
            'path': file_path
        }, None
        
    except Exception as e:
        return None, f"Errore nel salvataggio: {str(e)}"

# === FORM TEMPLATES ENDPOINTS ===

@bp.route('/templates', methods=['GET'])
def get_templates():
    """Ottieni tutti i template form disponibili"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            SELECT id, nome, descrizione, tipo_categoria, asset_types, is_active, created_at, updated_at
            FROM form_templates 
            WHERE is_active = 1
            ORDER BY nome
        ''')
        
        templates = []
        for row in c.fetchall():
            template = dict(row)
            template['asset_types'] = json.loads(template['asset_types']) if template['asset_types'] else []
            templates.append(template)
        
        conn.close()
        return jsonify({'templates': templates}), 200
        
    except Exception as e:
        print(f"[ERROR] get_templates: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates', methods=['POST'])
def create_template():
    """Crea un nuovo template form (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        if not data or not data.get('nome'):
            return jsonify({'error': 'Nome template richiesto'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        now = datetime.now().isoformat()
        
        c.execute('''
            INSERT INTO form_templates 
            (nome, descrizione, tipo_categoria, asset_types, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['nome'],
            data.get('descrizione', ''),
            data.get('tipo_categoria', 'ordinario'),
            json.dumps(data.get('asset_types', [])),
            1,
            now,
            now
        ))
        
        template_id = c.lastrowid
        
        # Aggiungi automaticamente i campi standard per ogni template
        standard_fields = [
            {
                'field_key': 'data_intervento',
                'field_label': 'Data intervento',
                'field_type': 'date',
                'is_required': 1,
                'display_order': 0,
                'field_options': json.dumps({})
            },
            {
                'field_key': 'operatore',
                'field_label': 'Operatore',
                'field_type': 'text',
                'is_required': 1,
                'display_order': 1,
                'field_options': json.dumps({'readonly': True, 'auto_fill': True})
            }
        ]
        
        for field in standard_fields:
            c.execute('''
                INSERT INTO form_fields 
                (template_id, field_key, field_label, field_type, field_options, 
                 is_required, display_order, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                template_id,
                field['field_key'],
                field['field_label'],
                field['field_type'],
                field['field_options'],
                field['is_required'],
                field['display_order'],
                1
            ))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Template creato con successo',
            'template_id': template_id
        }), 201
        
    except Exception as e:
        print(f"[ERROR] create_template: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    """Aggiorna un template esistente (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dati richiesti'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        now = datetime.now().isoformat()
        
        c.execute('''
            UPDATE form_templates 
            SET nome = ?, descrizione = ?, tipo_categoria = ?, asset_types = ?, updated_at = ?
            WHERE id = ?
        ''', (
            data.get('nome'),
            data.get('descrizione', ''),
            data.get('tipo_categoria', 'ordinario'),
            json.dumps(data.get('asset_types', [])),
            now,
            template_id
        ))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Template non trovato'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Template aggiornato con successo'}), 200
        
    except Exception as e:
        print(f"[ERROR] update_template: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Elimina completamente un template (hard delete) (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verifica se il template esiste
        c.execute('SELECT id FROM form_templates WHERE id = ?', (template_id,))
        if not c.fetchone():
            conn.close()
            return jsonify({'error': 'Template non trovato'}), 404
        
        # Elimina prima tutte le compilazioni associate (se esistono)
        c.execute('DELETE FROM form_submissions WHERE template_id = ?', (template_id,))
        
        # Elimina tutti i campi associati (CASCADE dovrebbe farlo automaticamente, ma per sicurezza)
        c.execute('DELETE FROM form_fields WHERE template_id = ?', (template_id,))
        
        # Elimina il template
        c.execute('DELETE FROM form_templates WHERE id = ?', (template_id,))
        
        deleted_count = c.rowcount
        conn.commit()
        conn.close()
        
        if deleted_count == 0:
            return jsonify({'error': 'Template non trovato'}), 404
        
        return jsonify({'message': 'Template eliminato definitivamente'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_template: {e}")
        return jsonify({'error': str(e)}), 500

# === FORM FIELDS ENDPOINTS ===

@bp.route('/templates/<int:template_id>/fields', methods=['GET'])
def get_template_fields(template_id):
    """Ottieni tutti i campi di un template"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            SELECT id, field_key, field_label, field_type, field_options, 
                   is_required, display_order, is_active
            FROM form_fields 
            WHERE template_id = ? AND is_active = 1
            ORDER BY display_order, field_key
        ''', (template_id,))
        
        fields = []
        for row in c.fetchall():
            field = dict(row)
            field['field_options'] = json.loads(field['field_options']) if field['field_options'] else {}
            field['is_required'] = bool(field['is_required'])
            field['is_active'] = bool(field['is_active'])
            fields.append(field)
        
        conn.close()
        return jsonify({'fields': fields}), 200
        
    except Exception as e:
        print(f"[ERROR] get_template_fields: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/<int:template_id>/fields', methods=['POST'])
def create_field(template_id):
    """Crea un nuovo campo per un template (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        if not data or not data.get('field_key') or not data.get('field_label'):
            return jsonify({'error': 'field_key e field_label richiesti'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            INSERT INTO form_fields 
            (template_id, field_key, field_label, field_type, field_options, 
             is_required, display_order, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            template_id,
            data['field_key'],
            data['field_label'],
            data.get('field_type', 'text'),
            json.dumps(data.get('field_options', {})),
            1 if data.get('is_required') else 0,
            data.get('display_order', 0),
            1
        ))
        
        field_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Campo creato con successo',
            'field_id': field_id
        }), 201
        
    except Exception as e:
        print(f"[ERROR] create_field: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/fields/<int:field_id>', methods=['PUT'])
def update_field(field_id):
    """Aggiorna un campo esistente (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dati richiesti'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            UPDATE form_fields 
            SET field_key = ?, field_label = ?, field_type = ?, field_options = ?,
                is_required = ?, display_order = ?
            WHERE id = ?
        ''', (
            data.get('field_key'),
            data.get('field_label'),
            data.get('field_type', 'text'),
            json.dumps(data.get('field_options', {})),
            1 if data.get('is_required') else 0,
            data.get('display_order', 0),
            field_id
        ))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Campo non trovato'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Campo aggiornato con successo'}), 200
        
    except Exception as e:
        print(f"[ERROR] update_field: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/fields/<int:field_id>', methods=['DELETE'])
def delete_field(field_id):
    """Elimina completamente un campo (hard delete) (solo admin)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Verifica che il campo non sia uno dei campi standard (data_intervento, operatore)
        c.execute('SELECT field_key FROM form_fields WHERE id = ?', (field_id,))
        field_row = c.fetchone()
        
        if not field_row:
            conn.close()
            return jsonify({'error': 'Campo non trovato'}), 404
        
        field_key = field_row['field_key']
        if field_key in ['data_intervento', 'operatore']:
            conn.close()
            return jsonify({'error': 'I campi standard (data/operatore) non possono essere eliminati'}), 400
        
        # Elimina il campo
        c.execute('DELETE FROM form_fields WHERE id = ?', (field_id,))
        
        deleted_count = c.rowcount
        conn.commit()
        conn.close()
        
        if deleted_count == 0:
            return jsonify({'error': 'Campo non trovato'}), 404
        
        return jsonify({'message': 'Campo eliminato definitivamente'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_field: {e}")
        return jsonify({'error': str(e)}), 500

# === FORM SUBMISSIONS ENDPOINTS ===

@bp.route('/submissions', methods=['POST'])
def submit_form():
    """Salva una compilazione form e controlla alert per non conformità"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dati richiesti'}), 400
        
        required_fields = ['template_id', 'civico_numero', 'asset_id', 'operatore', 'data_intervento', 'form_data']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo {field} richiesto'}), 400
        
        conn = get_db_connection()
        c = conn.cursor()
        
        now = datetime.now().isoformat()
        
        # Salva la submission
        c.execute('''
            INSERT INTO form_submissions 
            (template_id, civico_numero, asset_id, operatore, data_intervento, form_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['template_id'],
            data['civico_numero'],
            data['asset_id'],
            data['operatore'],
            data['data_intervento'],
            json.dumps(data['form_data']),
            now
        ))
        
        submission_id = c.lastrowid
        
        # Controlla campi select per alert di non conformità
        print(f"[DEBUG] Checking alerts for template_id: {data['template_id']}")
        print(f"[DEBUG] Form data: {data['form_data']}")
        print(f"[DEBUG] Submission data completa: {data}")  # Debug completo
        
        alert_issues = check_select_fields_for_alerts(
            c, data['template_id'], data['form_data'], data
        )
        
        print(f"[DEBUG] Alert issues found: {alert_issues}")
        
        conn.commit()
        conn.close()
        
        # Se ci sono problemi di conformità, invia alert
        if alert_issues:
            print(f"[DEBUG] Creating alert for {len(alert_issues)} issues")
            alert_created = send_non_conformity_alerts(alert_issues, data)
            print(f"[DEBUG] Alert created: {alert_created}")
        else:
            print("[DEBUG] No alert issues found")
        
        return jsonify({
            'message': 'Form compilato con successo',
            'submission_id': submission_id,
            'alerts_generated': len(alert_issues) if alert_issues else 0
        }), 201
        
    except Exception as e:
        print(f"[ERROR] submit_form: {e}")
        return jsonify({'error': str(e)}), 500

def check_select_fields_for_alerts(cursor, template_id, form_data, submission_data):
    """Controlla i campi select, checkbox e textarea per condizioni che generano alert"""
    try:
        print(f"[DEBUG] Checking fields for alerts in template {template_id}")
        
        # Ottieni tutti i campi del template (select, checkbox, textarea)
        cursor.execute('''
            SELECT id, field_key, field_type, field_options 
            FROM form_fields 
            WHERE template_id = ? AND field_type IN ('select', 'checkbox', 'textarea')
        ''', (template_id,))
        
        fields = cursor.fetchall()
        print(f"[DEBUG] Found {len(fields)} fields to check")
        
        alert_issues = []
        
        for field in fields:
            field_id, field_name, field_type, field_options_json = field
            
            print(f"[DEBUG] Processing field: {field_name} (type: {field_type})")
            
            # Controlla se questo campo è stato compilato
            field_value = form_data.get(field_name)
            print(f"[DEBUG] Field {field_name} value: {field_value}")
            
            if not field_value:
                continue
                
            # GESTIONE CAMPI SELECT
            if field_type == 'select' and field_options_json:
                try:
                    select_options_data = json.loads(field_options_json)
                    # Le opzioni potrebbero essere in {"options": [...]} o direttamente un array
                    if isinstance(select_options_data, dict) and 'options' in select_options_data:
                        select_options = select_options_data['options']
                    else:
                        select_options = select_options_data if isinstance(select_options_data, list) else []
                    
                    print(f"[DEBUG] Parsed select options: {select_options}")
                    
                    # Cerca l'opzione selezionata che genera alert
                    for option in select_options:
                        if option.get('value') == field_value and option.get('generates_alert'):
                            print(f"[DEBUG] Alert triggered for select {field_name} = {field_value}")
                            alert_issues.append({
                                'field_name': field_name,
                                'field_value': field_value,
                                'option_label': option.get('label', field_value)
                            })
                            break
                            
                except Exception as parse_error:
                    print(f"[DEBUG] Error parsing select options: {parse_error}")
                    continue
                    
            # GESTIONE CAMPI CHECKBOX 
            elif field_type == 'checkbox':
                # Alert se checkbox è "No" o "Negativo" (valori che indicano non conformità)
                if field_value.lower() in ['no', 'negativo', 'false', '0']:
                    print(f"[DEBUG] Alert triggered for checkbox {field_name} = {field_value}")
                    alert_issues.append({
                        'field_name': field_name,
                        'field_value': field_value,
                        'option_label': field_name  # Solo il nome del campo, non il valore negativo
                    })
                    
            # GESTIONE CAMPI TEXTAREA
            elif field_type == 'textarea':
                # Alert solo se textarea ha il flag generates_alert attivato E è compilata
                if field_value.strip() and field_options_json:
                    try:
                        textarea_options_data = json.loads(field_options_json)
                        generates_alert = textarea_options_data.get('generates_alert', False)
                        
                        if generates_alert:
                            print(f"[DEBUG] Alert triggered for textarea {field_name} (text present and alert enabled)")
                            alert_issues.append({
                                'field_name': field_name,
                                'field_value': field_value,
                                'option_label': field_name,  # Solo il nome del campo nella descrizione
                                'is_note': True  # Indica che questo contenuto va nelle note
                            })
                        else:
                            print(f"[DEBUG] Textarea {field_name} has text but alert disabled")
                    except Exception as parse_error:
                        print(f"[DEBUG] Error parsing textarea options: {parse_error}")
                        # Se non riesce a parsare le opzioni, non genera alert per sicurezza
                else:
                    print(f"[DEBUG] Textarea {field_name} empty or no options configured")
        
        print(f"[DEBUG] Total alert issues: {len(alert_issues)}")
        return alert_issues
        
    except Exception as e:
        print(f"[ERROR] check_select_fields_for_alerts: {e}")
        return []

def send_non_conformity_alerts(alert_issues, submission_data):
    """Genera alert nella tabella alert per non conformità rilevate e invia messaggio Telegram"""
    try:
        # Connessione al database compilazioni.db dove si trova la tabella alert
        compilazioni_db_path = os.path.join(os.path.dirname(__file__), 'compilazioni.db')
        conn = sqlite3.connect(compilazioni_db_path)
        c = conn.cursor()
        
        # Prepara descrizione (solo i campi con problemi, escluse le textarea che vanno nelle note)
        issues_text = []
        note_contents = []
        
        for issue in alert_issues:
            if issue.get('is_note') and issue['field_name'].lower() != 'note':
                # Se è un campo textarea (note), raccogli il contenuto per le note (escluso il campo "note" principale)
                note_contents.append(f"{issue['field_name']}: {issue['field_value']}")
            else:
                # Se è select o checkbox, va nella descrizione
                issues_text.append(f"• {issue['option_label']}")
        
        alert_description = f"Rilevate {len(alert_issues)} non conformità nel form dinamico:\n" + "\n".join(issues_text)
        
        # Nelle note mettiamo il campo note del form + i contenuti delle textarea che generano alert
        alert_note = ""
        
        # Prima aggiungi il campo "note" del form se presente
        for field_name, field_value in submission_data.get('form_data', {}).items():
            if field_name.lower() == 'note' and field_value:
                alert_note = field_value
                break
                
        # Poi aggiungi i contenuti delle textarea che hanno generato alert
        if note_contents:
            if alert_note:
                alert_note += "\n\n" + "\n".join(note_contents)
            else:
                alert_note = "\n".join(note_contents)
        
        # Inserisce l'alert nella tabella
        c.execute('''
            INSERT INTO alert (tipo, titolo, descrizione, data_creazione, civico, asset, stato, note, operatore)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'non_conformita',
            'Non conformità rilevata (Form Dinamico)',
            alert_description,
            datetime.now().isoformat(),
            submission_data.get('civico_numero', ''),
            submission_data.get('asset_id', ''),
            'aperto',
            alert_note,
            submission_data.get('operatore', '')
        ))
        
        alert_id = c.lastrowid
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Alert creato con ID: {alert_id} in compilazioni.db")
        
        # Ora invia il messaggio Telegram automaticamente
        try:
            import telegram_manager
            
            # Determina il tipo di asset dall'ID (logica temporanea)
            asset_type = "Frese" if submission_data.get('asset_id', '').startswith('G') else "Unknown"
            
            # Costruisce titolo e descrizione come nel vecchio sistema
            alert_title = f"Non conformità form dinamico {asset_type.lower()}: {submission_data.get('asset_id', '')}"
            # Solo i campi select/checkbox nella descrizione, non le textarea
            description_issues = [issue['option_label'] for issue in alert_issues if not issue.get('is_note')]
            alert_description = ", ".join(description_issues)
            
            # Nelle note: campo note del form + contenuti textarea
            telegram_note_contents = []
            telegram_note = ""
            
            # Prima il campo "note" del form se presente
            for field_name, field_value in submission_data.get('form_data', {}).items():
                if field_name.lower() == 'note' and field_value:
                    telegram_note = field_value
                    break
                    
            # Poi i contenuti delle textarea che hanno generato alert (escluso il campo "note" principale)
            for issue in alert_issues:
                if issue.get('is_note') and issue['field_name'].lower() != 'note':
                    telegram_note_contents.append(f"{issue['field_name']}: {issue['field_value']}")
                    
            if telegram_note_contents:
                if telegram_note:
                    telegram_note += "\n\n" + "\n".join(telegram_note_contents)
                else:
                    telegram_note = "\n".join(telegram_note_contents)
            
            # Recupera il tipo dell'asset dal database per i filtri Telegram
            asset_tipo = None
            try:
                gestman_conn = sqlite3.connect('gestman.db')
                gestman_c = gestman_conn.cursor()
                gestman_c.execute("SELECT tipo FROM assets WHERE id_aziendale = ?", (submission_data.get('asset_id', ''),))
                tipo_row = gestman_c.fetchone()
                if tipo_row:
                    asset_tipo = tipo_row[0]
                    print(f"[DEBUG] Asset tipo recuperato dal DB: '{asset_tipo}' per asset '{submission_data.get('asset_id', '')}'")
                else:
                    print(f"[DEBUG] Asset non trovato nel DB: '{submission_data.get('asset_id', '')}'")
                gestman_conn.close()
            except Exception as db_error:
                print(f"[ERROR] Errore recupero tipo asset: {db_error}")

            alert_data = {
                'tipo': 'non_conformita',
                'titolo': alert_title,  # Titolo con tipo asset come nel vecchio sistema
                'descrizione': alert_description,
                'civico': submission_data.get('civico_numero', ''),
                'asset': submission_data.get('asset_id', ''),
                'asset_tipo': asset_tipo,  # Aggiunto il tipo dell'asset
                'operatore': submission_data.get('operatore', ''),
                'note': telegram_note
            }
            
            print(f"[DEBUG] Alert data per Telegram: {alert_data}")
            print(f"[DEBUG] Inviando messaggio Telegram per alert ID: {alert_id}")
            telegram_sent = telegram_manager.send_alert_to_telegram(alert_data)
            print(f"[DEBUG] Messaggio Telegram inviato: {telegram_sent}")
            
        except Exception as telegram_error:
            print(f"[ERROR] Errore invio Telegram: {telegram_error}")
            # Non fallire se il Telegram non funziona, l'alert è comunque creato
        
        return True
        
    except Exception as e:
        print(f"[ERROR] send_non_conformity_alerts: {e}")
        return False

@bp.route('/submissions', methods=['GET'])
def get_submissions():
    """Ottieni le compilazioni form con filtri opzionali"""
    try:
        # Parametri di filtro opzionali
        template_id = request.args.get('template_id', type=int)
        civico_numero = request.args.get('civico_numero')
        asset_id = request.args.get('asset_id')
        limit = request.args.get('limit', 50, type=int)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        query = '''
            SELECT s.id, s.template_id, s.civico_numero, s.asset_id, s.operatore, 
                   s.data_intervento, s.form_data, s.created_at,
                   t.nome as template_nome, t.descrizione as template_descrizione
            FROM form_submissions s
            JOIN form_templates t ON s.template_id = t.id
            WHERE 1=1
        '''
        params = []
        
        if template_id:
            query += ' AND s.template_id = ?'
            params.append(template_id)
        
        if civico_numero:
            query += ' AND s.civico_numero = ?'
            params.append(civico_numero)
            
        if asset_id:
            query += ' AND s.asset_id = ?'
            params.append(asset_id)
        
        query += ' ORDER BY s.created_at DESC LIMIT ?'
        params.append(limit)
        
        c.execute(query, params)
        
        submissions = []
        for row in c.fetchall():
            submission = dict(row)
            submission['form_data'] = json.loads(submission['form_data']) if submission['form_data'] else {}
            submissions.append(submission)
        
        conn.close()
        return jsonify({'submissions': submissions}), 200
        
    except Exception as e:
        print(f"[ERROR] get_submissions: {e}")
        return jsonify({'error': str(e)}), 500

# === UTILITY ENDPOINTS ===

@bp.route('/asset-types', methods=['GET'])
def get_available_asset_types():
    """Ottieni tutti i tipi di asset disponibili dal database assets"""
    try:
        # Connessione al database gestman.db per leggere gli asset
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Ottieni tutti i tipi di asset distinti
        c.execute('SELECT DISTINCT tipo FROM assets WHERE tipo IS NOT NULL AND tipo != ""')
        
        asset_types = []
        for row in c.fetchall():
            if row['tipo'].strip():  # Escludi valori vuoti o solo spazi
                asset_types.append(row['tipo'].strip())
        
        conn.close()
        
        # Ordina alfabeticamente
        asset_types.sort()
        
        return jsonify({'asset_types': asset_types}), 200
        
    except Exception as e:
        print(f"[ERROR] get_available_asset_types: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/categories', methods=['GET'])
def get_categories():
    """Ottieni tutte le categorie template disponibili"""
    try:
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('SELECT * FROM template_categories ORDER BY label')
        categories = []
        for row in c.fetchall():
            categories.append({
                'id': row['id'],
                'name': row['name'],
                'label': row['label']
            })
        
        conn.close()
        return jsonify({'categories': categories}), 200
        
    except Exception as e:
        print(f"[ERROR] get_categories: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/categories', methods=['POST'])
def add_category():
    """Aggiungi una nuova categoria"""
    try:
        from flask import request
        data = request.get_json()
        
        if not data or not data.get('name') or not data.get('label'):
            return jsonify({'error': 'Nome e label categoria sono obbligatori'}), 400
        
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        c = conn.cursor()
        
        # Verifica che il nome non esista già
        c.execute('SELECT id FROM template_categories WHERE name = ?', (data['name'].lower(),))
        if c.fetchone():
            conn.close()
            return jsonify({'error': 'Categoria già esistente'}), 400
        
        # Inserisci la nuova categoria
        c.execute(
            'INSERT INTO template_categories (name, label) VALUES (?, ?)',
            (data['name'].lower(), data['label'])
        )
        
        conn.commit()
        category_id = c.lastrowid
        conn.close()
        
        return jsonify({
            'success': True, 
            'category': {
                'id': category_id,
                'name': data['name'].lower(),
                'label': data['label']
            }
        }), 201
        
    except Exception as e:
        print(f"[ERROR] add_category: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Elimina una categoria"""
    try:
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        c = conn.cursor()
        
        # Verifica che la categoria non sia usata in template esistenti
        c.execute('SELECT COUNT(*) FROM form_templates WHERE tipo_categoria = (SELECT name FROM template_categories WHERE id = ?)', (category_id,))
        usage_count = c.fetchone()[0]
        
        if usage_count > 0:
            conn.close()
            return jsonify({'error': f'Impossibile eliminare: categoria usata in {usage_count} template'}), 400
        
        # Elimina la categoria
        c.execute('DELETE FROM template_categories WHERE id = ?', (category_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Categoria non trovata'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Categoria eliminata'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_category: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/templates/by-asset-type', methods=['GET'])
def get_templates_by_asset_type():
    """Ottieni template compatibili con un tipo di asset"""
    try:
        from flask import request
        asset_type = request.args.get('asset_type', '')
        print(f"[DEBUG] get_templates_by_asset_type chiamato con asset_type: '{asset_type}'")
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute('''
            SELECT id, nome, descrizione, tipo_categoria, asset_types
            FROM form_templates 
            WHERE is_active = 1
        ''')
        
        compatible_templates = []
        all_templates = c.fetchall()
        print(f"[DEBUG] Trovati {len(all_templates)} template attivi nel database")
        
        for row in all_templates:
            template = dict(row)
            asset_types = json.loads(template['asset_types']) if template['asset_types'] else []
            print(f"[DEBUG] Template '{template['nome']}' ha asset_types: {asset_types}")
            
            # Controlla se il tipo asset è compatibile
            asset_type_lower = asset_type.lower()
            compatible_asset_types = [t.lower() for t in asset_types]
            print(f"[DEBUG] Confronto '{asset_type_lower}' con {compatible_asset_types}")
            
            if asset_type_lower in compatible_asset_types:
                print(f"[DEBUG] MATCH trovato! Template '{template['nome']}' è compatibile")
                template['asset_types'] = asset_types
                compatible_templates.append(template)
            else:
                print(f"[DEBUG] Nessun match per template '{template['nome']}'")
        
        print(f"[DEBUG] Totale template compatibili trovati: {len(compatible_templates)}")
        conn.close()
        return jsonify({'templates': compatible_templates}), 200
        
    except Exception as e:
        print(f"[ERROR] get_templates_by_asset_type: {e}")
        return jsonify({'error': str(e)}), 500

# === FILE UPLOAD ENDPOINTS ===

@bp.route('/upload-file', methods=['POST'])
def upload_file():
    """Upload di un file per un campo di tipo file"""
    try:
        # Verifica che ci sia un file nella richiesta
        if 'file' not in request.files:
            return jsonify({'error': 'Nessun file nella richiesta'}), 400
        
        file = request.files['file']
        field_label = request.form.get('field_label')
        compilation_id = request.form.get('compilation_id')
        accepted_types = request.form.get('accepted_types')
        max_size_mb = request.form.get('max_size_mb')
        
        if not field_label:
            return jsonify({'error': 'field_label richiesto'}), 400
            
        if not compilation_id:
            return jsonify({'error': 'compilation_id richiesto'}), 400
        
        # Verifica tipo file se specificato
        if accepted_types and not allowed_file(file.filename, accepted_types):
            return jsonify({'error': f'Tipo file non consentito. Tipi accettati: {accepted_types}'}), 400
        elif not accepted_types and not allowed_file(file.filename):
            return jsonify({'error': 'Tipo file non consentito'}), 400
        
        # Verifica dimensione se specificata
        if max_size_mb:
            max_bytes = int(max_size_mb) * 1024 * 1024
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > max_bytes:
                return jsonify({'error': f'File troppo grande. Max {max_size_mb}MB'}), 400
        
        # Salva il file
        file_info, error = save_uploaded_file(file, field_label, compilation_id)
        
        if error:
            return jsonify({'error': error}), 400
            
        return jsonify({
            'success': True,
            'file_info': file_info,
            'message': 'File caricato con successo'
        }), 200
        
    except Exception as e:
        print(f"[ERROR] upload_file: {e}")
        return jsonify({'error': f'Errore durante l\'upload: {str(e)}'}), 500

@bp.route('/download-file/<folder>/<filename>')
def download_file(folder, filename):
    """Download di un file caricato"""
    try:
        folder_path = os.path.join(UPLOAD_FOLDER, secure_filename(folder))
        
        if not os.path.exists(folder_path):
            return jsonify({'error': 'Cartella non trovata'}), 404
            
        file_path = os.path.join(folder_path, secure_filename(filename))
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File non trovato'}), 404
            
        return send_from_directory(folder_path, filename)
        
    except Exception as e:
        print(f"[ERROR] download_file: {e}")
        return jsonify({'error': f'Errore durante il download: {str(e)}'}), 500

@bp.route('/list-files/<folder>')
def list_files(folder):
    """Lista i file in una cartella specifica"""
    try:
        folder_path = os.path.join(UPLOAD_FOLDER, secure_filename(folder))
        
        if not os.path.exists(folder_path):
            return jsonify({'files': []}), 200
            
        files = []
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return jsonify({'files': files}), 200
        
    except Exception as e:
        print(f"[ERROR] list_files: {e}")
        return jsonify({'error': f'Errore nella lista file: {str(e)}'}), 500

@bp.route('/delete-file/<folder>/<filename>', methods=['DELETE'])
def delete_file(folder, filename):
    """Elimina un file caricato"""
    try:
        folder_path = os.path.join(UPLOAD_FOLDER, secure_filename(folder))
        file_path = os.path.join(folder_path, secure_filename(filename))
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'File non trovato'}), 404
            
        os.remove(file_path)
        
        return jsonify({'success': True, 'message': 'File eliminato'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_file: {e}")
        return jsonify({'error': f'Errore nell\'eliminazione: {str(e)}'}), 500

# === ERROR HANDLERS ===

@bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint non trovato'}), 404

@bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Errore interno del server'}), 500
