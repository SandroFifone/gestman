# coding: utf-8
"""
Blueprint per la gestione dinamica dei tipi asset
"""
from flask import Blueprint, request, jsonify
import sqlite3
import os
import json
from datetime import datetime

bp = Blueprint('asset_types', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'gestman.db')

def get_db_connection():
    """Connessione al database con foreign keys abilitate"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row
    return conn

def validate_admin(request):
    """Placeholder per validazione admin"""
    return True

def update_assets_remove_fields(cursor, asset_type_name, removed_fields):
    """Rimuove i campi specificati da tutti gli asset del tipo indicato"""
    if not removed_fields:
        return 0
    
    # Ottieni tutti gli asset di questo tipo
    cursor.execute('SELECT id_aziendale, dati FROM assets WHERE tipo = ?', (asset_type_name,))
    assets = cursor.fetchall()
    
    assets_updated = 0
    
    for asset in assets:
        id_aziendale, dati_raw = asset
        
        if not dati_raw:
            continue
            
        try:
            # Parse dei dati JSON
            dati = json.loads(dati_raw)
            
            # Rimuovi i campi obsoleti
            fields_removed = False
            for field_name in removed_fields:
                if field_name in dati:
                    del dati[field_name]
                    fields_removed = True
                    print(f"[INFO] Rimosso campo '{field_name}' dall'asset {id_aziendale}")
            
            # Aggiorna l'asset solo se ci sono state modifiche
            if fields_removed:
                cursor.execute(
                    'UPDATE assets SET dati = ? WHERE id_aziendale = ?',
                    (json.dumps(dati), id_aziendale)
                )
                assets_updated += 1
                
        except json.JSONDecodeError as e:
            print(f"[ERROR] Errore parsing dati asset {id_aziendale}: {e}")
            continue
    
    return assets_updated

@bp.route('', methods=['GET'])
def get_asset_types():
    """Recupera tutti i tipi asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, description, fields_template, fields_order, is_active, created_at, updated_at
            FROM asset_types 
            WHERE is_active = 1
            ORDER BY name
        ''')
        
        asset_types = []
        for row in cursor.fetchall():
            fields_template_raw = row['fields_template']
            fields_template_parsed = json.loads(fields_template_raw) if fields_template_raw else {}
            
            # Leggi l'ordine dei campi se disponibile
            fields_order_raw = row['fields_order']
            fields_order = json.loads(fields_order_raw) if fields_order_raw else None
            
            asset_type = {
                'id': row['id'],
                'name': row['name'],
                'description': row['description'],
                'fields_template': fields_template_parsed,
                'fields_order': fields_order,  # Aggiungi l'ordine esplicito
                'is_active': row['is_active'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            }
            asset_types.append(asset_type)
        
        conn.close()
        return jsonify({'asset_types': asset_types}), 200
        
    except Exception as e:
        print(f"[ERROR] get_asset_types: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_asset_type():
    """Crea un nuovo tipo asset o riattiva uno esistente"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Nome tipo asset richiesto'}), 400
        
        # Gestione ordine campi: usa fields_order se disponibile, altrimenti fields_template
        fields_template = data.get('fields_template', {})
        fields_order = data.get('fields_order', [])
        
        # Assicuriamoci sempre che id_aziendale sia presente e sia il primo
        id_aziendale_field = {
            'type': 'text',
            'required': True
        }
        
        # Se abbiamo l'array ordinato, ricostruiamo l'oggetto nell'ordine corretto
        if fields_order:
            ordered_template = {'id_aziendale': id_aziendale_field}  # Sempre primo
            for field_data in fields_order:
                field_name = field_data['name']
                if field_name != 'id_aziendale':  # Salta id_aziendale se presente nell'array
                    field_config = {k: v for k, v in field_data.items() if k != 'name'}
                    ordered_template[field_name] = field_config
        else:
            # Fallback: ricostruisci con id_aziendale sempre primo
            ordered_template = {'id_aziendale': id_aziendale_field}
            for field_name, field_config in fields_template.items():
                if field_name != 'id_aziendale':
                    ordered_template[field_name] = field_config
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Controlla se esiste già un tipo asset con lo stesso nome
        cursor.execute('SELECT id, is_active FROM asset_types WHERE name = ?', (data['name'],))
        existing = cursor.fetchone()
        
        now = datetime.now().isoformat()
        
        if existing:
            # Se esiste ma è disattivato, riattivalo e aggiorna
            if not existing['is_active']:
                cursor.execute('''
                    UPDATE asset_types 
                    SET description = ?, fields_template = ?, fields_order = ?, is_active = 1, updated_at = ?
                    WHERE id = ?
                ''', (
                    data.get('description', ''),
                    json.dumps(ordered_template),
                    json.dumps(list(ordered_template.keys())),  # Aggiorna anche l'ordine
                    now,
                    existing['id']
                ))
                
                conn.commit()
                
                return jsonify({
                    'message': f'Tipo asset "{data["name"]}" riattivato con successo',
                    'id': existing['id'],
                    'reactivated': True
                }), 200
            else:
                # Se esiste ed è attivo, errore
                return jsonify({'error': f'Tipo asset "{data["name"]}" già esistente'}), 409
        
        # Se non esiste, crealo nuovo
        # Crea l'array ordinato dei campi (sempre con id_aziendale primo)
        fieldsOrderArray = list(ordered_template.keys())
        
        cursor.execute('''
            INSERT INTO asset_types (name, description, fields_template, fields_order, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['name'],
            data.get('description', ''),
            json.dumps(ordered_template),
            json.dumps(fieldsOrderArray),  # Salva l'ordine come array JSON
            1,
            now,
            now
        ))
        
        asset_type_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Tipo asset creato con successo',
            'id': asset_type_id
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Tipo asset già esistente'}), 409
    except Exception as e:
        print(f"[ERROR] create_asset_type: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:type_id>', methods=['PUT'])
def update_asset_type(type_id):
    """Aggiorna un tipo asset esistente"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        data = request.get_json()
        
        # Gestione ordine campi: usa fields_order se disponibile, altrimenti fields_template
        fields_template = data.get('fields_template', {})
        fields_order = data.get('fields_order', [])
        
        # Assicuriamoci sempre che id_aziendale sia presente e sia il primo
        id_aziendale_field = {
            'type': 'text',
            'required': True
        }
        
        # Se abbiamo l'array ordinato, ricostruiamo l'oggetto nell'ordine corretto
        if fields_order:
            ordered_template = {'id_aziendale': id_aziendale_field}  # Sempre primo
            for field_data in fields_order:
                field_name = field_data['name']
                if field_name != 'id_aziendale':  # Salta id_aziendale se presente nell'array
                    field_config = {k: v for k, v in field_data.items() if k != 'name'}
                    ordered_template[field_name] = field_config
        else:
            # Fallback: ricostruisci con id_aziendale sempre primo
            ordered_template = {'id_aziendale': id_aziendale_field}
            for field_name, field_config in fields_template.items():
                if field_name != 'id_aziendale':
                    ordered_template[field_name] = field_config
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Prima di aggiornare, ottieni il template attuale per confrontare i campi
        cursor.execute('SELECT name, fields_template FROM asset_types WHERE id = ?', (type_id,))
        current_type = cursor.fetchone()
        
        if not current_type:
            conn.close()
            return jsonify({'error': 'Tipo asset non trovato'}), 404
        
        current_template = json.loads(current_type['fields_template']) if current_type['fields_template'] else {}
        current_fields = set(current_template.keys())
        new_fields = set(ordered_template.keys())
        
        # Identifica i campi rimossi
        removed_fields = current_fields - new_fields
        
        print(f"[INFO] Aggiornamento tipo '{current_type['name']}': campi rimossi = {list(removed_fields)}")
        
        # Crea l'array ordinato dei campi
        fieldsOrderArray = list(ordered_template.keys())
        
        cursor.execute('''
            UPDATE asset_types 
            SET name = ?, description = ?, fields_template = ?, fields_order = ?, updated_at = ?
            WHERE id = ?
        ''', (
            data.get('name'),
            data.get('description', ''),
            json.dumps(ordered_template),
            json.dumps(fieldsOrderArray),  # Salva anche l'ordine
            datetime.now().isoformat(),
            type_id
        ))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Tipo asset non trovato'}), 404
        
        # Se ci sono campi rimossi, aggiorna tutti gli asset di questo tipo
        if removed_fields:
            assets_updated = update_assets_remove_fields(cursor, current_type['name'], removed_fields)
            print(f"[INFO] Aggiornati {assets_updated} asset rimuovendo campi obsoleti")
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Tipo asset aggiornato con successo',
            'removed_fields': list(removed_fields),
            'assets_updated': assets_updated if removed_fields else 0
        }), 200
        
    except Exception as e:
        print(f"[ERROR] update_asset_type: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:type_id>', methods=['DELETE'])
def delete_asset_type(type_id):
    """Elimina un tipo asset (soft delete)"""
    try:
        if not validate_admin(request):
            return jsonify({'error': 'Accesso negato'}), 403
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verifica se ci sono asset che usano questo tipo
        cursor.execute('SELECT COUNT(*) FROM assets WHERE tipo = (SELECT name FROM asset_types WHERE id = ?)', (type_id,))
        asset_count = cursor.fetchone()[0]
        
        if asset_count > 0:
            conn.close()
            return jsonify({'error': f'Impossibile eliminare: {asset_count} asset utilizzano questo tipo'}), 409
        
        # Soft delete
        cursor.execute('''
            UPDATE asset_types 
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), type_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Tipo asset non trovato'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Tipo asset eliminato con successo'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_asset_type: {e}")
        return jsonify({'error': str(e)}), 500
