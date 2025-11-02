# coding: utf-8
"""
Blueprint per la gestione della documentazione e report
Permette di consultare e esportare tutti i dati del gestionale
"""

from flask import Blueprint, request, jsonify, make_response, send_file, send_from_directory
import sqlite3
import os
import json
from datetime import datetime
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
# Temporaneamente disabilitato per problemi ambiente virtuale 
# import pandas as pd

bp = Blueprint('docs', __name__)

# Percorsi database
GESTMAN_DB = os.path.join(os.path.dirname(__file__), 'gestman.db')
COMPILAZIONI_DB = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

def get_gestman_connection():
    """Connessione al database gestman.db"""
    conn = sqlite3.connect(GESTMAN_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_compilazioni_connection():
    """Connessione al database compilazioni.db"""
    conn = sqlite3.connect(COMPILAZIONI_DB)
    conn.row_factory = sqlite3.Row
    return conn

def get_filter_options(section):
    """Genera opzioni di filtro per una sezione specifica"""
    try:
        if section == 'compilazioni':
            conn = get_compilazioni_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Template (da form_templates + nome_voce da storico)
            c.execute("SELECT DISTINCT t.nome FROM form_templates t JOIN form_submissions s ON t.id = s.template_id ORDER BY t.nome")
            templates = [row[0] for row in c.fetchall()]
            
            c.execute("SELECT DISTINCT nome_voce FROM scadenze_storico_esecuzioni WHERE nome_voce IS NOT NULL ORDER BY nome_voce")
            templates.extend([row[0] for row in c.fetchall()])
            filters['template_nome'] = sorted(list(set(templates)))
            
            # Operatore (da entrambe le tabelle)
            c.execute("SELECT DISTINCT operatore FROM form_submissions WHERE operatore IS NOT NULL ORDER BY operatore")
            operatori = [row[0] for row in c.fetchall()]
            
            c.execute("SELECT DISTINCT operatore_esecuzione FROM scadenze_storico_esecuzioni WHERE operatore_esecuzione IS NOT NULL ORDER BY operatore_esecuzione")
            operatori.extend([row[0] for row in c.fetchall()])
            filters['operatore'] = sorted(list(set(operatori)))
            
            # Civico (da entrambe le tabelle)
            c.execute("SELECT DISTINCT civico_numero FROM form_submissions WHERE civico_numero IS NOT NULL ORDER BY civico_numero")
            civici = [row[0] for row in c.fetchall()]
            
            c.execute("SELECT DISTINCT civico FROM scadenze_storico_esecuzioni WHERE civico IS NOT NULL ORDER BY civico")
            civici.extend([row[0] for row in c.fetchall()])
            filters['civico_numero'] = sorted(list(set(civici)))
            
            # Asset (da entrambe le tabelle)
            c.execute("SELECT DISTINCT asset_id FROM form_submissions WHERE asset_id IS NOT NULL ORDER BY asset_id")
            assets = [row[0] for row in c.fetchall()]
            
            c.execute("SELECT DISTINCT asset FROM scadenze_storico_esecuzioni WHERE asset IS NOT NULL ORDER BY asset")
            assets.extend([row[0] for row in c.fetchall()])
            filters['asset'] = sorted(list(set(assets)))
            
            # Esito (solo da storico esecuzioni)
            c.execute("SELECT DISTINCT esito FROM scadenze_storico_esecuzioni WHERE esito IS NOT NULL ORDER BY esito")
            filters['esito'] = [row[0] for row in c.fetchall()]
            
            conn.close()
            return filters
            
        elif section == 'scadenze':
            conn = get_compilazioni_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Stato
            c.execute("SELECT DISTINCT stato FROM scadenze_calendario WHERE stato IS NOT NULL ORDER BY stato")
            filters['stato'] = [row[0] for row in c.fetchall()]
            
            # Asset tipo
            c.execute("SELECT DISTINCT asset_tipo FROM scadenze_calendario WHERE asset_tipo IS NOT NULL ORDER BY asset_tipo")
            filters['asset_tipo'] = [row[0] for row in c.fetchall()]
            
            # Operatore completamento rimosso
            
            conn.close()
            return filters
            
        elif section == 'alert':
            conn = get_compilazioni_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Tipo
            c.execute("SELECT DISTINCT tipo FROM alert WHERE tipo IS NOT NULL ORDER BY tipo")
            filters['tipo'] = [row[0] for row in c.fetchall()]
            
            # Stato
            c.execute("SELECT DISTINCT stato FROM alert WHERE stato IS NOT NULL ORDER BY stato")
            filters['stato'] = [row[0] for row in c.fetchall()]
            
            # Civico
            c.execute("SELECT DISTINCT civico FROM alert WHERE civico IS NOT NULL ORDER BY civico")
            filters['civico'] = [row[0] for row in c.fetchall()]
            
            # Asset
            c.execute("SELECT DISTINCT asset FROM alert WHERE asset IS NOT NULL ORDER BY asset")
            filters['asset'] = [row[0] for row in c.fetchall()]
            
            conn.close()
            return filters
            
        elif section == 'civici':
            # Per civici non ci sono molti filtri utili, ritorna vuoto
            return {}
            
        elif section == 'asset-types':
            conn = get_gestman_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Nome (per filtro ricerca)
            c.execute("SELECT DISTINCT name FROM asset_types WHERE is_active = 1 AND name IS NOT NULL ORDER BY name")
            filters['nome'] = [row[0] for row in c.fetchall()]
            
            conn.close()
            return filters
            
        elif section == 'assets-inventory':
            conn = get_gestman_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Tipo
            c.execute("SELECT DISTINCT tipo FROM assets WHERE tipo IS NOT NULL ORDER BY tipo")
            filters['tipo'] = [row[0] for row in c.fetchall()]
            
            # Civico
            c.execute("SELECT DISTINCT civico_numero FROM assets WHERE civico_numero IS NOT NULL ORDER BY civico_numero")
            filters['civico_numero'] = [row[0] for row in c.fetchall()]
            
            conn.close()
            return filters
            
        elif section == 'magazzino':
            conn = get_compilazioni_connection()
            c = conn.cursor()
            
            filters = {}
            
            # Asset tipo
            c.execute("SELECT DISTINCT asset_tipo FROM magazzino_ricambi WHERE asset_tipo IS NOT NULL ORDER BY asset_tipo")
            filters['asset_tipo'] = [row[0] for row in c.fetchall()]
            
            # Costruttore
            c.execute("SELECT DISTINCT costruttore FROM magazzino_ricambi WHERE costruttore IS NOT NULL ORDER BY costruttore")
            filters['costruttore'] = [row[0] for row in c.fetchall()]
            
            # Fornitore
            c.execute("SELECT DISTINCT fornitore FROM magazzino_ricambi WHERE fornitore IS NOT NULL ORDER BY fornitore")
            filters['fornitore'] = [row[0] for row in c.fetchall()]
            
            conn.close()
            return filters
            
        else:
            return {}
            
    except Exception as e:
        print(f"[ERROR] get_filter_options for {section}: {e}")
        return {}

def apply_filters(base_query, params, filters, table_alias='', section=''):
    """Applica filtri comuni a tutte le query"""
    where_conditions = []
    
    # Prefisso per le colonne (se c'è un alias)
    prefix = f"{table_alias}." if table_alias else ""
    
    if filters.get('dateFrom'):
        where_conditions.append(f"date({prefix}created_at) >= ?")
        params.append(filters['dateFrom'])
    
    if filters.get('dateTo'):
        where_conditions.append(f"date({prefix}created_at) <= ?")
        params.append(filters['dateTo'])
    
    if filters.get('civico'):
        # Logica specifica per sezione
        if section == 'compilazioni':
            where_conditions.append(f"{prefix}civico_numero = ?")
            params.append(filters['civico'])
        elif section == 'alert':
            where_conditions.append(f"{prefix}civico = ?")
            params.append(filters['civico'])
        elif section == 'scadenze':
            where_conditions.append(f"{prefix}civico = ?")
            params.append(filters['civico'])
        else:
            where_conditions.append(f"({prefix}civico_numero = ? OR {prefix}civico = ?)")
            params.extend([filters['civico'], filters['civico']])
    
    if filters.get('operatore'):
        where_conditions.append(f"{prefix}operatore = ?")
        params.append(filters['operatore'])
    
    if filters.get('asset'):
        # Logica specifica per sezione
        if section == 'compilazioni':
            where_conditions.append(f"{prefix}asset_id = ?")
            params.append(filters['asset'])
        elif section == 'alert':
            where_conditions.append(f"{prefix}asset = ?")
            params.append(filters['asset'])
        elif section == 'scadenze':
            where_conditions.append(f"{prefix}asset = ?")
            params.append(filters['asset'])
        else:
            where_conditions.append(f"({prefix}asset_id = ? OR {prefix}asset = ?)")
            params.extend([filters['asset'], filters['asset']])
    
    if filters.get('tipo'):
        where_conditions.append(f"{prefix}tipo = ?")
        params.append(filters['tipo'])
    
    if filters.get('stato'):
        where_conditions.append(f"{prefix}stato = ?")
        params.append(filters['stato'])
    
    # Filtro specifico per template (solo compilazioni)
    if filters.get('template'):
        where_conditions.append("t.nome = ?")
        params.append(filters['template'])
    
    if where_conditions:
        base_query += " WHERE " + " AND ".join(where_conditions)
    
    return base_query, params

@bp.route('/compilazioni', methods=['GET'])
def get_compilazioni_docs():
    """Ottieni documentazione compilazioni form e storico esecuzioni"""
    try:
        filters = {
            'dateFrom': request.args.get('dateFrom'),
            'dateTo': request.args.get('dateTo'),
            'civico': request.args.get('civico'),
            'operatore': request.args.get('operatore'),
            'asset': request.args.get('asset'),
            'template': request.args.get('template'),
            'tipo_record': request.args.get('tipo_record'),  # 'form' o 'esecuzione' o tutti
            'esito': request.args.get('esito')  # Solo per storico esecuzioni
        }
        
        conn = get_compilazioni_connection()
        c = conn.cursor()
        
        # Unisce i dati da form_submissions e scadenze_storico_esecuzioni
        all_results = []
        
        # 1. FORM SUBMISSIONS - Solo se non filtriamo per 'esecuzione'
        if not filters.get('tipo_record') or filters.get('tipo_record') != 'esecuzione':
            query_forms = '''
                SELECT s.id,
                       s.civico_numero as civico, 
                       s.asset_id as asset, 
                       s.operatore, 
                       s.data_intervento as data_evento,
                       t.nome as template_nome,
                       s.form_data,
                       '' as esito,
                       '' as nome_voce,
                       'form_submission' as record_type
                FROM form_submissions s
                LEFT JOIN form_templates t ON s.template_id = t.id
            '''
            params_forms = []
            
            # Applica filtri per form submissions
            where_conditions = []
            if filters.get('dateFrom'):
                where_conditions.append("date(s.created_at) >= ?")
                params_forms.append(filters['dateFrom'])
            
            if filters.get('dateTo'):
                where_conditions.append("date(s.created_at) <= ?")
                params_forms.append(filters['dateTo'])
            
            if filters.get('civico'):
                where_conditions.append("s.civico_numero = ?")
                params_forms.append(filters['civico'])
            
            if filters.get('operatore'):
                where_conditions.append("s.operatore = ?")
                params_forms.append(filters['operatore'])
            
            if filters.get('asset'):
                where_conditions.append("s.asset_id = ?")
                params_forms.append(filters['asset'])
            
            if filters.get('template'):
                where_conditions.append("t.nome = ?")
                params_forms.append(filters['template'])
            
            if where_conditions:
                query_forms += " WHERE " + " AND ".join(where_conditions)
            
            query_forms += " ORDER BY s.created_at DESC"
            
            c.execute(query_forms, params_forms)
            form_results = [dict(row) for row in c.fetchall()]
            all_results.extend(form_results)
        
        # 2. STORICO ESECUZIONI - Solo se non filtriamo per 'form'
        if not filters.get('tipo_record') or filters.get('tipo_record') != 'form':
            query_esecuzioni = '''
                SELECT se.id,
                       se.civico,
                       se.asset,
                       se.operatore_esecuzione as operatore,
                       se.data_esecuzione as data_evento,
                       se.nome_voce as template_nome,
                       se.note_esecuzione as form_data,
                       se.esito,
                       se.nome_voce,
                       'scadenza_esecuzione' as record_type
                FROM scadenze_storico_esecuzioni se
            '''
            params_esecuzioni = []
            
            # Applica filtri per storico esecuzioni
            where_conditions = []
            if filters.get('dateFrom'):
                where_conditions.append("date(se.data_esecuzione) >= ?")
                params_esecuzioni.append(filters['dateFrom'])
            
            if filters.get('dateTo'):
                where_conditions.append("date(se.data_esecuzione) <= ?")
                params_esecuzioni.append(filters['dateTo'])
            
            if filters.get('civico'):
                where_conditions.append("se.civico = ?")
                params_esecuzioni.append(filters['civico'])
            
            if filters.get('operatore'):
                where_conditions.append("se.operatore_esecuzione = ?")
                params_esecuzioni.append(filters['operatore'])
            
            if filters.get('asset'):
                where_conditions.append("se.asset = ?")
                params_esecuzioni.append(filters['asset'])
            
            # Filtro per template/nome_voce nelle esecuzioni
            if filters.get('template'):
                where_conditions.append("se.nome_voce = ?")
                params_esecuzioni.append(filters['template'])
            
            # Filtro per esito (solo per storico esecuzioni)
            if filters.get('esito'):
                where_conditions.append("se.esito = ?")
                params_esecuzioni.append(filters['esito'])
            
            if where_conditions:
                query_esecuzioni += " WHERE " + " AND ".join(where_conditions)
            
            query_esecuzioni += " ORDER BY se.data_esecuzione DESC"
            
            c.execute(query_esecuzioni, params_esecuzioni)
            esecuzioni_results = [dict(row) for row in c.fetchall()]
            all_results.extend(esecuzioni_results)
        
        # Ordina tutti i risultati per data (più recenti prima)
        all_results.sort(key=lambda x: x.get('data_evento') or x.get('created_at'), reverse=True)
        
        results = all_results
        
        # Formatta i dati per la visualizzazione - rimuoviamo form_data e manteniamo solo preview
        for result in results:
            if result['form_data']:
                try:
                    form_data = json.loads(result['form_data'])
                    # Filtra i campi escludendo le date e prendi solo i primi 3 campi utili
                    preview_items = []
                    date_keywords = ['data', 'date', 'tempo', 'time', 'created', 'updated', 'timestamp', 'intervento']
                    
                    for k, v in form_data.items():
                        # Salta i campi che contengono date o intervento
                        if any(keyword in k.lower() for keyword in date_keywords):
                            continue
                        # Salta valori vuoti o nulli
                        if not v or not str(v).strip():
                            continue
                        
                        # Gestione speciale per campi file (array di file)
                        if isinstance(v, list) and v and isinstance(v[0], dict) and 'original_name' in v[0]:
                            # È un campo file - mostra solo i nomi originali dei file
                            file_names = [file_info.get('original_name', file_info.get('filename', 'File')) 
                                        for file_info in v if isinstance(file_info, dict)]
                            if file_names:
                                if len(file_names) == 1:
                                    preview_items.append(f"{k}: {file_names[0]}")
                                else:
                                    preview_items.append(f"{k}: {', '.join(file_names[:2])}{' +altri' if len(file_names) > 2 else ''}")
                        else:
                            # Campo normale
                            preview_items.append(f"{k}: {v}")
                        
                        # Ferma dopo 3 elementi utili
                        if len(preview_items) >= 3:
                            break
                    
                    result['form_data_preview'] = ', '.join(preview_items)
                    if len([k for k in form_data.keys() if not any(keyword in k.lower() for keyword in date_keywords)]) > 3:
                        result['form_data_preview'] += "..."
                except:
                    result['form_data_preview'] = str(result['form_data'])[:50] + "..."
            else:
                result['form_data_preview'] = "Nessun dato"
            
            # Rimuovi form_data per evitare duplicati nel frontend
            del result['form_data']
            
            # Trasforma 'operatore' in 'utente' per la visualizzazione
            if 'operatore' in result:
                result['utente'] = result.pop('operatore')
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('compilazioni')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_compilazioni_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/scadenze', methods=['GET'])
def get_scadenze_docs():
    """Ottieni documentazione scadenze e manutenzioni"""
    try:
        filters = {
            'dateFrom': request.args.get('dateFrom'),
            'dateTo': request.args.get('dateTo'),
            'civico': request.args.get('civico'),
            'operatore': request.args.get('operatore'),
            'asset': request.args.get('asset'),
            'stato': request.args.get('stato')
        }
        
        # Scadenze table is in compilazioni.db, not gestman.db
        conn = get_compilazioni_connection()
        c = conn.cursor()
        
        query = '''
            SELECT id, civico, asset, asset_tipo, data_scadenza, stato, created_at
            FROM scadenze_calendario
        '''
        params = []
        
        query, params = apply_filters(query, params, filters, section='scadenze')
        query += " ORDER BY data_scadenza DESC"
        
        c.execute(query, params)
        results = [dict(row) for row in c.fetchall()]
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('scadenze')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_scadenze_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/alert', methods=['GET'])
def get_alert_docs():
    """Ottieni documentazione alert e segnalazioni"""
    try:
        filters = {
            'dateFrom': request.args.get('dateFrom'),
            'dateTo': request.args.get('dateTo'),
            'civico': request.args.get('civico'),
            'operatore': request.args.get('operatore'),
            'asset': request.args.get('asset'),
            'tipo': request.args.get('tipo'),
            'stato': request.args.get('stato')
        }
        
        # Alert table is in compilazioni.db, not gestman.db
        conn = get_compilazioni_connection()
        c = conn.cursor()
        
        query = '''
            SELECT id, tipo, titolo, descrizione, data_creazione, civico, asset,
                   stato, note, operatore, data_chiusura
            FROM alert
        '''
        params = []
        
        query, params = apply_filters(query, params, filters, section='alert')
        query += " ORDER BY data_creazione DESC"
        
        c.execute(query, params)
        results = [dict(row) for row in c.fetchall()]
        
        # Trasforma 'operatore' in 'utente' per la visualizzazione
        for result in results:
            if 'operatore' in result:
                result['utente'] = result.pop('operatore')
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('alert')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_alert_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/magazzino', methods=['GET'])
def get_magazzino_docs():
    """Ottieni documentazione magazzino ricambi"""
    try:
        filters = {
            'asset_tipo': request.args.get('asset_tipo'),
            'costruttore': request.args.get('costruttore'),
            'fornitore': request.args.get('fornitore'),
            'id_ricambio': request.args.get('id_ricambio'),
            'disponibilita': request.args.get('disponibilita')  # 'scarsa' per quantità < minima
        }
        
        conn = get_compilazioni_connection()
        c = conn.cursor()
        
        query = '''
            SELECT id, asset_tipo, id_ricambio, costruttore, modello, 
                   codice_produttore, fornitore, unita_misura,
                   quantita_disponibile, quantita_minima, prezzo_unitario,
                   note, attivo, created_at, updated_at
            FROM magazzino_ricambi
            WHERE attivo = 1
        '''
        params = []
        
        # Applica filtri specifici per magazzino
        where_conditions = []
        
        if filters.get('asset_tipo'):
            where_conditions.append("asset_tipo = ?")
            params.append(filters['asset_tipo'])
        
        if filters.get('costruttore'):
            where_conditions.append("costruttore = ?")
            params.append(filters['costruttore'])
        
        if filters.get('fornitore'):
            where_conditions.append("fornitore = ?")
            params.append(filters['fornitore'])
        
        if filters.get('id_ricambio'):
            where_conditions.append("id_ricambio LIKE ?")
            params.append(f"%{filters['id_ricambio']}%")
        
        if filters.get('disponibilita') == 'scarsa':
            where_conditions.append("quantita_disponibile < quantita_minima")
        
        if where_conditions:
            query += " AND " + " AND ".join(where_conditions)
        
        query += " ORDER BY asset_tipo, id_ricambio"
        
        c.execute(query, params)
        results = [dict(row) for row in c.fetchall()]
        
        # Aggiungi informazioni di stato per ogni ricambio
        for result in results:
            # Stato disponibilità - controlla prima se esaurito, poi se scarso
            if result['quantita_disponibile'] == 0:
                result['stato_disponibilita'] = 'Esaurito'
            elif result['quantita_disponibile'] < result['quantita_minima']:
                result['stato_disponibilita'] = 'Scarsa'
            else:
                result['stato_disponibilita'] = 'Disponibile'
            
            # Valore totale stock
            result['valore_stock'] = result['quantita_disponibile'] * result['prezzo_unitario']
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('magazzino')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_magazzino_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<section>/export', methods=['GET'])
def export_data(section):
    """Export dati in Excel o PDF"""
    try:
        format_type = request.args.get('format', 'xlsx')
        
        # Ottieni i dati dalla sezione richiesta
        if section == 'compilazioni':
            response = get_compilazioni_docs()
        elif section == 'scadenze':
            response = get_scadenze_docs()
        elif section == 'alert':
            response = get_alert_docs()
        elif section == 'magazzino':
            response = get_magazzino_docs()
        else:
            return jsonify({'error': 'Sezione non valida'}), 400
        
        data = response[0].get_json()['data']
        
        if format_type == 'xlsx':
            return export_excel(data, section)
        elif format_type == 'pdf':
            return export_pdf(data, section)
        else:
            return jsonify({'error': 'Formato non supportato'}), 400
            
    except Exception as e:
        print(f"[ERROR] export_data: {e}")
        return jsonify({'error': str(e)}), 500

def export_excel(data, section):
    """Esporta dati in Excel - TEMPORANEAMENTE DISABILITATO"""
    return jsonify({'error': 'Export Excel temporaneamente non disponibile. Pandas non disponibile.'}), 501

def export_pdf(data, section):
    """Esporta dati in PDF - TEMPORANEAMENTE DISABILITATO"""
    return jsonify({'error': 'Export PDF temporaneamente non disponibile. Usa Excel.'}), 501

# === CRUD OPERATIONS ===

@bp.route('/<section>/<int:record_id>', methods=['PUT'])
def update_record(section, record_id):
    """Aggiorna un record specifico"""
    try:
        data = request.json
        
        if section == 'compilazioni':
            return update_compilazione(record_id, data)
        elif section == 'alert':
            return update_alert(record_id, data)
        elif section == 'scadenze':
            return update_scadenza(record_id, data)
        elif section == 'civici':
            return update_civico(record_id, data)
        elif section == 'asset-types':
            return update_asset_type(record_id, data)
        elif section == 'assets-inventory':
            return update_asset_inventory(record_id, data)
        else:
            return jsonify({'error': 'Sezione non modificabile'}), 400
            
    except Exception as e:
        print(f"[ERROR] update_record: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<section>/<record_id>', methods=['DELETE', 'OPTIONS'])
def delete_record(section, record_id):
    """Cancella un record specifico"""
    if request.method == 'OPTIONS':
        # Gestisce richieste preflight CORS
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
        
    try:
        if section == 'compilazioni':
            return delete_compilazione(record_id)
        elif section == 'alert':
            return delete_alert(record_id)
        elif section == 'scadenze':
            return delete_scadenza(record_id)
        elif section == 'civici':
            return delete_civico(record_id)
        elif section == 'asset-types':
            return delete_asset_type(record_id)
        elif section == 'assets-inventory':
            return delete_asset_inventory(record_id)
        else:
            return jsonify({'error': 'Sezione non modificabile'}), 400
            
    except Exception as e:
        print(f"[ERROR] delete_record: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/<section>/bulk-delete', methods=['DELETE', 'OPTIONS'])
def bulk_delete_records(section):
    """Cancellazione multipla di record"""
    if request.method == 'OPTIONS':
        # Gestisce richieste preflight CORS
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
        
    try:
        data = request.json
        record_ids = data.get('ids', [])
        
        # DEBUG: Stampa cosa riceve il backend
        print(f"[DEBUG] bulk_delete_records - Section: {section}")
        print(f"[DEBUG] bulk_delete_records - Received IDs: {record_ids}")
        print(f"[DEBUG] bulk_delete_records - ID types: {[type(id) for id in record_ids]}")
        
        if not record_ids:
            return jsonify({'error': 'Nessun ID specificato'}), 400

        deleted_count = 0
        errors = []
        
        # Gestisci tutto in una singola transazione per sezione
        if section == 'compilazioni' or section == 'scadenze' or section == 'alert':
            conn = get_compilazioni_connection()
        else:
            conn = get_gestman_connection()
            
        c = conn.cursor()
        
        try:
            for record_item in record_ids:
                try:
                    # Per compilazioni, gestisci oggetti {id, record_type}
                    if section == 'compilazioni' and isinstance(record_item, dict):
                        record_id = record_item.get('id')
                        record_type = record_item.get('record_type', 'form_submission')
                        print(f"[DEBUG] Attempting to delete ID {record_id} (type: {record_type}) from section {section}")
                        
                        if record_type == 'form_submission':
                            c.execute("DELETE FROM form_submissions WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on form_submissions for ID {record_id}, rowcount: {c.rowcount}")
                        elif record_type == 'scadenza_esecuzione':
                            c.execute("DELETE FROM scadenze_storico_esecuzioni WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on scadenze_storico_esecuzioni for ID {record_id}, rowcount: {c.rowcount}")
                    else:
                        # Per altre sezioni, usa ID semplice
                        record_id = record_item
                        print(f"[DEBUG] Attempting to delete ID {record_id} from section {section}")
                        
                        if section == 'compilazioni':
                            # Fallback per compilazioni con ID semplice
                            c.execute("DELETE FROM form_submissions WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on form_submissions for ID {record_id}, rowcount: {c.rowcount}")
                        elif section == 'alert':
                            c.execute("DELETE FROM alert WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on alert for ID {record_id}, rowcount: {c.rowcount}")
                        elif section == 'scadenze':
                            c.execute("DELETE FROM scadenze_calendario WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on scadenze_calendario for ID {record_id}, rowcount: {c.rowcount}")
                        elif section == 'civici':
                            c.execute("DELETE FROM civici WHERE numero = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on civici for ID {record_id}, rowcount: {c.rowcount}")
                        elif section == 'asset-types':
                            c.execute("DELETE FROM asset_types WHERE id = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on asset_types for ID {record_id}, rowcount: {c.rowcount}")
                        elif section == 'assets-inventory':
                            c.execute("DELETE FROM assets WHERE id_aziendale = ?", (record_id,))
                            print(f"[DEBUG] Executed DELETE on assets for ID {record_id}, rowcount: {c.rowcount}")
                    
                    if c.rowcount > 0:
                        deleted_count += 1
                        print(f"[DEBUG] Successfully marked for deletion: ID {record_id}")
                    else:
                        errors.append(f"ID {record_id}: Record non trovato")
                        print(f"[DEBUG] Record not found: ID {record_id}")
                        
                except Exception as e:
                    errors.append(f"ID {record_id}: {str(e)}")
            
            # Commit di tutte le cancellazioni insieme
            print(f"[DEBUG] About to commit {deleted_count} deletions")
            conn.commit()
            print(f"[DEBUG] Commit successful")
            
        except Exception as e:
            print(f"[DEBUG] Transaction error, rolling back: {str(e)}")
            conn.rollback()
            errors.append(f"Errore transazione: {str(e)}")
        finally:
            conn.close()
            print(f"[DEBUG] Database connection closed")
        
        return jsonify({
            'deleted': deleted_count,
            'errors': errors,
            'success': len(errors) == 0
        }), 200
        
    except Exception as e:
        print(f"[ERROR] bulk_delete_records: {e}")
        return jsonify({'error': str(e)}), 500

# === UPDATE FUNCTIONS ===

def update_compilazione(record_id, data):
    """Aggiorna una compilazione"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    # Campi aggiornabili
    updateable_fields = ['operatore', 'data_intervento', 'form_data']
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE form_submissions SET {', '.join(set_clauses)} WHERE id = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Compilazione aggiornata'}), 200

def update_alert(record_id, data):
    """Aggiorna un alert"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    # Campi aggiornabili
    updateable_fields = ['titolo', 'descrizione', 'stato', 'note', 'operatore']
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    # Se stato diventa 'chiuso', aggiungi data_chiusura
    if data.get('stato') == 'chiuso':
        set_clauses.append("data_chiusura = ?")
        params.append(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE alert SET {', '.join(set_clauses)} WHERE id = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Alert aggiornato'}), 200

def update_scadenza(record_id, data):
    """Aggiorna una scadenza"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    # Campi aggiornabili
    updateable_fields = ['data_scadenza', 'stato', 'data_completamento', 'operatore_completamento', 'note_completamento']
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE scadenze_calendario SET {', '.join(set_clauses)} WHERE id = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Scadenza aggiornata'}), 200

# === DELETE FUNCTIONS ===

def delete_compilazione(record_id):
    """Cancella una compilazione"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM form_submissions WHERE id = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Compilazione cancellata'}), 200

def delete_alert(record_id):
    """Cancella un alert"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM alert WHERE id = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Alert cancellato'}), 200

def delete_scadenza(record_id):
    """Cancella una scadenza"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM scadenze_calendario WHERE id = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Scadenza cancellata'}), 200

# === CLEANUP OPERATIONS ===

@bp.route('/cleanup/<section>', methods=['POST'])
def cleanup_section(section):
    """Operazioni di pulizia automatica per evitare accumulo dati"""
    try:
        data = request.json
        days_old = data.get('days_old', 365)  # Default: records più vecchi di 1 anno
        
        if section == 'alert':
            return cleanup_old_alerts(days_old)
        elif section == 'compilazioni':
            return cleanup_old_compilations(days_old)
        elif section == 'scadenze':
            return cleanup_old_scadenze(days_old)
        else:
            return jsonify({'error': 'Sezione non supportata per la pulizia'}), 400
            
    except Exception as e:
        print(f"[ERROR] cleanup_section: {e}")
        return jsonify({'error': str(e)}), 500

# === NUOVE SEZIONI PER CONFIGURAZIONE ===

@bp.route('/civici', methods=['GET'])
def get_civici_docs():
    """Ottieni documentazione civici"""
    try:
        filters = {
            'numero': request.args.get('numero'),
            'descrizione': request.args.get('descrizione')
        }
        
        conn = get_gestman_connection()
        c = conn.cursor()
        
        query = '''
            SELECT numero, descrizione
            FROM civici
        '''
        params = []
        
        # Filtri specifici per civici
        where_conditions = []
        if filters.get('numero'):
            where_conditions.append("numero LIKE ?")
            params.append(f"%{filters['numero']}%")
        
        if filters.get('descrizione'):
            where_conditions.append("descrizione LIKE ?")
            params.append(f"%{filters['descrizione']}%")
        
        if where_conditions:
            query += " WHERE " + " AND ".join(where_conditions)
        
        query += " ORDER BY numero"
        
        c.execute(query, params)
        results = [dict(row) for row in c.fetchall()]
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('civici')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_civici_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/asset-types', methods=['GET'])
def get_asset_types_docs():
    """Ottieni documentazione tipi di asset"""
    try:
        filters = {
            'nome': request.args.get('nome'),
            'categoria': request.args.get('categoria')
        }
        
        conn = get_gestman_connection()
        c = conn.cursor()
        
        query = '''
            SELECT name, id, is_active, created_at, updated_at
            FROM asset_types
            WHERE is_active = 1
        '''
        params = []
        
        # Filtri aggiuntivi per asset types
        if filters.get('nome'):  # Manteniamo il nome del parametro per compatibilità frontend
            query += " AND name LIKE ?"
            params.append(f"%{filters['nome']}%")
        
        query += " ORDER BY name"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        # Costruisco i risultati con ordine specifico delle colonne
        results = []
        for row in rows:
            result = {
                'name': row['name'],
                'id': row['id'],
                'is_active': row['is_active'],
                'created_at': row['created_at'],
                'updated_at': row['updated_at']
            }
            results.append(result)
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('asset-types')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_asset_types_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/assets-inventory', methods=['GET'])
def get_assets_inventory_docs():
    """Ottieni inventario completo asset"""
    try:
        filters = {
            'civico': request.args.get('civico'),
            'tipo': request.args.get('tipo'),
            'id_aziendale': request.args.get('id_aziendale')
        }
        
        conn = get_gestman_connection()
        c = conn.cursor()
        
        query = '''
            SELECT a.id_aziendale, a.tipo, a.civico_numero, a.dati, 
                   a.doc_tecnica,
                   at.name as tipo_nome, at.description as tipo_descrizione
            FROM assets a
            LEFT JOIN asset_types at ON a.tipo = at.name
        '''
        params = []
        
        # Filtri specifici per assets
        where_conditions = []
        if filters.get('civico'):
            where_conditions.append("a.civico_numero = ?")
            params.append(filters['civico'])
        
        if filters.get('tipo'):
            where_conditions.append("a.tipo = ?")
            params.append(filters['tipo'])
        
        if filters.get('id_aziendale'):
            where_conditions.append("a.id_aziendale LIKE ?")
            params.append(f"%{filters['id_aziendale']}%")
        
        if where_conditions:
            query += " WHERE " + " AND ".join(where_conditions)
        
        query += " ORDER BY a.civico_numero, a.tipo, a.id_aziendale"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        # Costruisco i risultati con ordine specifico delle colonne
        results = []
        for row in rows:
            result = {
                'id_aziendale': row['id_aziendale'],
                'tipo': row['tipo'],
                'civico_numero': row['civico_numero'],
                'dati': row['dati'],
                'doc_tecnica': row['doc_tecnica'],
                'tipo_nome': row['tipo_nome'],
                'tipo_descrizione': row['tipo_descrizione']
            }
            results.append(result)
        
        # Formatta i dati JSON per la visualizzazione
        for result in results:
            if result['dati']:
                try:
                    dati = json.loads(result['dati'])
                    result['dati_preview'] = ', '.join([f"{k}: {v}" for k, v in dati.items()][:3])
                except:
                    result['dati_preview'] = result['dati'][:100] + '...'
        
        conn.close()
        
        # Ottieni opzioni di filtro
        filter_options = get_filter_options('assets-inventory')
        
        return jsonify({
            'data': results,
            'total': len(results),
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_assets_inventory_docs: {e}")
        return jsonify({'error': str(e)}), 500

# === CRUD PER NUOVE SEZIONI ===

def get_civico(record_id):
    """Ottieni dettagli di un civico - usa numero come chiave"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM civici WHERE numero = ?", (record_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    columns = [description[0] for description in c.description]
    record = dict(zip(columns, row))
    
    conn.close()
    return jsonify(record), 200

def create_civico(data):
    """Crea un nuovo civico"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    # Campi obbligatori
    required_fields = ['numero', 'descrizione']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo {field} richiesto'}), 400
    
    try:
        c.execute("""
            INSERT INTO civici (numero, descrizione) 
            VALUES (?, ?)
        """, (data['numero'], data['descrizione']))
        
        conn.commit()
        record_id = data['numero']  # numero è la chiave
        
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': f'Errore di integrità: {str(e)}'}), 400
    
    conn.close()
    return jsonify({'success': True, 'id': record_id, 'message': 'Civico creato'}), 201

def update_civico(record_id, data):
    """Aggiorna un civico - usa numero come chiave"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    updateable_fields = ['descrizione']  # Solo descrizione è modificabile
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE civici SET {', '.join(set_clauses)} WHERE numero = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Civico aggiornato'}), 200

def get_asset_type(record_id):
    """Ottieni dettagli di un tipo di asset"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM tipi_asset WHERE id = ?", (record_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    columns = [description[0] for description in c.description]
    record = dict(zip(columns, row))
    
    conn.close()
    return jsonify(record), 200

def create_asset_type(data):
    """Crea un nuovo tipo di asset"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    required_fields = ['nome', 'schema_json']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo {field} richiesto'}), 400
    
    try:
        c.execute("""
            INSERT INTO tipi_asset (nome, schema_json, created_at) 
            VALUES (?, ?, datetime('now'))
        """, (data['nome'], data['schema_json']))
        
        conn.commit()
        record_id = c.lastrowid
        
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': f'Errore di integrità: {str(e)}'}), 400
    
    conn.close()
    return jsonify({'success': True, 'id': record_id, 'message': 'Tipo asset creato'}), 201

def update_asset_type(record_id, data):
    """Aggiorna un tipo di asset"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    updateable_fields = ['nome', 'icona', 'colore', 'categoria', 'descrizione']
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE asset_types SET {', '.join(set_clauses)} WHERE id = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Tipo asset aggiornato'}), 200

def delete_asset_type(record_id):
    """Cancella un tipo di asset"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM tipi_asset WHERE id = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Tipo asset cancellato'}), 200

def get_asset_inventory(record_id):
    """Ottieni dettagli di un asset dall'inventario"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM assets WHERE id = ?", (record_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    columns = [description[0] for description in c.description]
    record = dict(zip(columns, row))
    
    conn.close()
    return jsonify(record), 200

def create_asset_inventory(data):
    """Crea un nuovo asset nell'inventario"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    required_fields = ['tipo', 'civico_numero']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Campo {field} richiesto'}), 400
    
    try:
        c.execute("""
            INSERT INTO assets (tipo, civico_numero, dati, doc_tecnica, created_at) 
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (data['tipo'], data['civico_numero'], 
              data.get('dati', '{}'), data.get('doc_tecnica', '')))
        
        conn.commit()
        record_id = c.lastrowid
        
    except sqlite3.IntegrityError as e:
        conn.close()
        return jsonify({'error': f'Errore di integrità: {str(e)}'}), 400
    
    conn.close()
    return jsonify({'success': True, 'id': record_id, 'message': 'Asset creato'}), 201

def update_asset_inventory(record_id, data):
    """Aggiorna un asset nell'inventario"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    updateable_fields = ['id_aziendale', 'tipo', 'civico_numero', 'dati', 'doc_tecnica']
    
    set_clauses = []
    params = []
    
    for field in updateable_fields:
        if field in data:
            set_clauses.append(f"{field} = ?")
            params.append(data[field])
    
    if not set_clauses:
        return jsonify({'error': 'Nessun campo da aggiornare'}), 400
    
    params.append(record_id)
    
    query = f"UPDATE assets SET {', '.join(set_clauses)} WHERE id = ?"
    c.execute(query, params)
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Asset aggiornato'}), 200

def delete_asset_inventory(record_id):
    """Cancella un asset dall'inventario usando id_aziendale - COPIA DA SERVER.PY"""
    conn = get_gestman_connection()
    cur = conn.execute("DELETE FROM assets WHERE id_aziendale = ?", (record_id,))
    conn.commit()
    deleted = cur.rowcount
    conn.close()
    
    if deleted:
        return jsonify({'success': True, 'message': 'Asset cancellato dall\'inventario'}), 200
    else:
        return jsonify({'error': 'Asset non trovato'}), 404

def delete_civico(record_id):
    """Cancella un civico - usa numero come chiave"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM civici WHERE numero = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Civico cancellato'}), 200

def delete_asset_type(record_id):
    """Cancella un tipo di asset"""
    conn = get_gestman_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM asset_types WHERE id = ?", (record_id,))
    
    if c.rowcount == 0:
        conn.close()
        return jsonify({'error': 'Record non trovato'}), 404
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': 'Tipo asset cancellato'}), 200

def cleanup_old_alerts(days_old):
    """Pulisce alert chiusi più vecchi di X giorni"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    # Cancella solo alert chiusi più vecchi di X giorni
    c.execute("""
        DELETE FROM alert 
        WHERE stato = 'chiuso' 
        AND data_chiusura IS NOT NULL 
        AND date(data_chiusura) < date('now', '-{} days')
    """.format(days_old))
    
    deleted_count = c.rowcount
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': f'Cancellati {deleted_count} alert chiusi più vecchi di {days_old} giorni'
    }), 200

def cleanup_old_compilations(days_old):
    """Pulisce compilazioni più vecchie di X giorni"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    c.execute("""
        DELETE FROM form_submissions 
        WHERE date(created_at) < date('now', '-{} days')
    """.format(days_old))
    
    deleted_count = c.rowcount
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': f'Cancellate {deleted_count} compilazioni più vecchie di {days_old} giorni'
    }), 200

def cleanup_old_scadenze(days_old):
    """Pulisce scadenze completate più vecchie di X giorni"""
    conn = get_compilazioni_connection()
    c = conn.cursor()
    
    c.execute("""
        DELETE FROM scadenze_calendario 
        WHERE stato = 'completata' 
        AND data_completamento IS NOT NULL 
        AND date(data_completamento) < date('now', '-{} days')
    """.format(days_old))
    
    deleted_count = c.rowcount
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'message': f'Cancellate {deleted_count} scadenze completate più vecchie di {days_old} giorni'
    }), 200

# === ROUTES CRUD PER NUOVE SEZIONI ===

@bp.route('/api/civici/<record_id>', methods=['GET'])
def api_get_civico(record_id):
    return get_civico(record_id)

@bp.route('/api/civici', methods=['POST'])
def api_create_civico():
    data = request.get_json()
    return create_civico(data)

@bp.route('/api/civici/<record_id>', methods=['PUT'])
def api_update_civico(record_id):
    data = request.get_json()
    return update_civico(record_id, data)

@bp.route('/api/civici/<record_id>', methods=['DELETE'])
def api_delete_civico(record_id):
    return delete_civico(record_id)

@bp.route('/api/asset-types/<int:record_id>', methods=['GET'])
def api_get_asset_type(record_id):
    return get_asset_type(record_id)

@bp.route('/api/asset-types', methods=['POST'])
def api_create_asset_type():
    data = request.get_json()
    return create_asset_type(data)

@bp.route('/api/asset-types/<int:record_id>', methods=['PUT'])
def api_update_asset_type(record_id):
    data = request.get_json()
    return update_asset_type(record_id, data)

@bp.route('/api/asset-types/<int:record_id>', methods=['DELETE'])
def api_delete_asset_type(record_id):
    return delete_asset_type(record_id)

@bp.route('/api/assets-inventory/<int:record_id>', methods=['GET'])
def api_get_asset_inventory(record_id):
    return get_asset_inventory(record_id)

@bp.route('/api/assets-inventory', methods=['POST'])
def api_create_asset_inventory():
    data = request.get_json()
    return create_asset_inventory(data)

@bp.route('/api/assets-inventory/<int:record_id>', methods=['PUT'])
def api_update_asset_inventory(record_id):
    data = request.get_json()
    return update_asset_inventory(record_id, data)

@bp.route('/assets-inventory/<record_id>', methods=['DELETE', 'OPTIONS'])
def api_delete_asset_inventory(record_id):
    if request.method == 'OPTIONS':
        # Gestisce richieste preflight CORS
        response = make_response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
        return response
    return delete_asset_inventory(record_id)

def create_pdf_report(data, section_name, selected_records=None):
    """
    Crea un report PDF professionale pronto per la stampa
    Template pulito e ordinato con struttura aziendale
    """
    try:
        # Crea buffer in memoria per il PDF
        buffer = io.BytesIO()
        
        # Configura il documento PDF in orientamento ORIZZONTALE per tabelle con molte colonne
        from reportlab.lib.pagesizes import landscape
        page_size = landscape(A4)  # A4 orizzontale
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=page_size,
            rightMargin=57,   # 2cm
            leftMargin=57,    # 2cm  
            topMargin=85,     # Spazio per header
            bottomMargin=85   # Spazio per footer
        )
        
        # Filtra i dati in base alla selezione
        if not data or len(data) == 0:
            filtered_data = []
            print(f"[DEBUG PDF] Nessun dato disponibile - data: {data}")
        elif selected_records and len(selected_records) > 0:
            # Se ci sono record selezionati, filtra solo quelli
            # Determina quale campo usare come identificativo in base alla sezione
            def get_record_id(row, section):
                if section == 'assets-inventory':
                    return str(row.get('id_aziendale', ''))
                elif section == 'civici':
                    return str(row.get('numero', ''))
                else:
                    return str(row.get('id', ''))
            
            filtered_data = [
                row for row in data 
                if get_record_id(row, section_name) in selected_records
            ]
            print(f"[DEBUG PDF] Record selezionati: {len(selected_records)}, filtrati: {len(filtered_data)}")
            print(f"[DEBUG PDF] Selected records: {selected_records}")
            if len(filtered_data) > 0:
                print(f"[DEBUG PDF] Primo record filtrato: {get_record_id(filtered_data[0], section_name)}")
            else:
                print(f"[DEBUG PDF] Nessun match trovato. Primo record disponibile: {get_record_id(data[0], section_name) if data else 'N/A'}")
        else:
            # Se selected_records è None, [] o vuoto, stampa tutti i dati
            filtered_data = data
            print(f"[DEBUG PDF] Stampa tutti i record: {len(filtered_data)}")
            
        # Classe Canvas professionale per header e footer
        class ProfessionalCanvas(canvas.Canvas):
            def __init__(self, *args, **kwargs):
                canvas.Canvas.__init__(self, *args, **kwargs)
                self._saved_page_states = []

            def showPage(self):
                self._saved_page_states.append(dict(self.__dict__))
                self._startPage()

            def save(self):
                num_pages = len(self._saved_page_states)
                for (page_num, page_state) in enumerate(self._saved_page_states):
                    self.__dict__.update(page_state)
                    self.draw_header_footer(page_num + 1, num_pages)
                    canvas.Canvas.showPage(self)
                canvas.Canvas.save(self)

            def draw_header_footer(self, page_num, total_pages):
                # Ottieni dimensioni pagina (orizzontale)
                page_width, page_height = landscape(A4)
                
                # Font per header/footer
                self.setFont("Helvetica", 9)
                
                # Linea separatrice header
                self.setStrokeColor(colors.grey)
                self.setLineWidth(0.5)
                self.line(57, page_height - 65, page_width - 57, page_height - 65)
                
                # Header - AAModelleria centrato
                self.setFont("Helvetica-Bold", 11)
                header_text = "AAModelleria - Da gestionale manutenzione"
                header_width = self.stringWidth(header_text, "Helvetica-Bold", 11)
                self.drawString((page_width - header_width) / 2, page_height - 55, header_text)
                
                # Footer - Linea separatrice
                self.setFont("Helvetica", 9)
                self.line(57, 65, page_width - 57, 65)
                
                # Footer - Data e ora generazione (sinistra)
                now = datetime.now()
                date_str = f"Generato il {now.strftime('%d/%m/%Y alle %H:%M')}"
                self.drawString(57, 50, date_str)
                
                # Footer - Numero pagina (destra) 
                page_str = f"Pagina {page_num} di {total_pages}"
                page_str_width = self.stringWidth(page_str, "Helvetica", 9)
                self.drawString(page_width - 57 - page_str_width, 50, page_str)
        
        # Stili professionali per documento di stampa
        styles = getSampleStyleSheet()
        
        # Stile titolo principale - pulito e centrato
        main_title_style = ParagraphStyle(
            'MainTitle',
            parent=styles['Normal'],
            fontSize=16,
            fontName='Helvetica-Bold',
            spaceAfter=25,
            alignment=1,  # Centrato
            textColor=colors.black
        )
        
        # Stile sezione - professionale
        section_style = ParagraphStyle(
            'SectionTitle', 
            parent=styles['Normal'],
            fontSize=12,
            fontName='Helvetica-Bold',
            spaceBefore=20,
            spaceAfter=15,
            textColor=colors.black
        )
        
        # Stile testo normale
        normal_style = ParagraphStyle(
            'NormalText',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica',
            spaceAfter=8,
            textColor=colors.black
        )
        
        # Stile data riepilogo
        summary_style = ParagraphStyle(
            'SummaryStyle',
            parent=styles['Normal'],
            fontSize=10,
            fontName='Helvetica-Bold',
            spaceBefore=25,
            spaceAfter=10,
            textColor=colors.black
        )
        
        # Contenuto del documento
        story = []
        
        # Spazio iniziale
        story.append(Spacer(1, 20))
        
        # TITOLO PRINCIPALE - Centrato e in grassetto
        section_titles = {
            'compilazioni': 'REPORT COMPILAZIONI FORM',
            'scadenze': 'REPORT SCADENZE PROGRAMMATE', 
            'alert': 'REPORT ALERT E SEGNALAZIONI',
            'civici': 'REPORT ANAGRAFICA CIVICI',
            'asset-types': 'REPORT TIPOLOGIE ASSET',
            'assets-inventory': 'REPORT INVENTARIO ASSET',
            'magazzino': 'REPORT MAGAZZINO RICAMBI'
        }
        
        section_title = section_titles.get(section_name, section_name.replace('-', ' ').upper())
        story.append(Paragraph(section_title, main_title_style))
        
        # Linea separatrice sotto il titolo
        story.append(Spacer(1, 10))
        
        # Controllo presenza dati
        if not filtered_data or len(filtered_data) == 0:
            story.append(Paragraph("DATI NON DISPONIBILI", section_style))
            if selected_records and len(selected_records) > 0:
                story.append(Paragraph("Nessun dato trovato per i record selezionati.", normal_style))
            else:
                story.append(Paragraph("Nessun dato disponibile per questa sezione.", normal_style))
        else:
            # SEZIONE TABELLA DATI - Professionale e pulita
            story.append(Paragraph("DATI", section_style))
            
            # Preparazione dati per tabella
            headers = list(filtered_data[0].keys()) if filtered_data else []
            
            # Filtra colonne indesiderate e di sistema
            excluded_columns = ['id', 'password', 'token', 'stato_colore']
            display_headers = [h for h in headers if h not in excluded_columns]
            
            # Con layout orizzontale possiamo gestire più colonne
            max_columns = 10  # Aumentato grazie all'orientamento orizzontale
            if len(display_headers) > max_columns:
                # Prendi le colonne più importanti in base alla sezione
                if section_name == 'magazzino':
                    display_headers = ['id_ricambio', 'asset_tipo', 'costruttore', 'modello', 'fornitore', 'quantita_disponibile', 'quantita_minima', 'prezzo_unitario', 'valore_stock', 'stato_disponibilita']
                elif section_name == 'assets-inventory':
                    display_headers = ['id_aziendale', 'tipo', 'civico_numero', 'dati', 'doc_tecnica', 'created_at'][:max_columns]
                elif section_name == 'compilazioni':
                    display_headers = ['template_nome', 'civico_numero', 'asset_id', 'operatore', 'data_intervento', 'form_data_preview', 'created_at'][:max_columns]
                else:
                    display_headers = display_headers[:max_columns]
            
            # Creazione intestazione tabella con stile per l'a capo
            table_data = []
            
            # Crea header con Paragraph per gestire intestazioni lunghe
            header_style = ParagraphStyle(
                'HeaderStyle',
                parent=normal_style,
                fontSize=9,
                fontName='Helvetica-Bold',
                leading=10,
                alignment=1  # Centrato
            )
            
            header_row = []
            for h in display_headers:
                header_text = format_column_name(h)
                # Usa Paragraph anche per header lunghi
                header_paragraph = Paragraph(header_text, header_style)
                header_row.append(header_paragraph)
            
            table_data.append(header_row)
            
            # Aggiungi righe dati (massimo 50 record per pagina per leggibilità)
            max_rows = 50
            for i, row in enumerate(filtered_data[:max_rows]):
                data_row = []
                for header in display_headers:
                    value = row.get(header, '')
                    formatted_value = format_value_for_print(header, value)
                    
                    # Invece di troncare, avvolgiamo il testo in un Paragraph per gestire l'a capo automatico
                    if isinstance(formatted_value, str) and len(formatted_value) > 0:
                        # Crea un Paragraph per permettere l'a capo automatico
                        cell_style = ParagraphStyle(
                            'CellStyle',
                            parent=normal_style,
                            fontSize=8,
                            fontName='Helvetica',
                            leading=9,  # Spaziatura tra righe
                            alignment=0  # Allineamento a sinistra
                        )
                        # Usa Paragraph per testo lungo che può andare a capo
                        paragraph = Paragraph(str(formatted_value), cell_style)
                        data_row.append(paragraph)
                    else:
                        # Per valori vuoti o None
                        data_row.append('')
                table_data.append(data_row)
            
            # Creazione tabella professionale
            if len(table_data) > 1:  # Se ci sono dati oltre all'header
                # Calcola larghezze colonne per layout orizzontale
                page_width = landscape(A4)[0]  # Larghezza pagina orizzontale
                available_width = page_width - 114  # Larghezza disponibile (margini 57+57)
                
                # Calcolo intelligente larghezze colonne in base al contenuto
                if section_name == 'magazzino':
                    # Larghezze ottimizzate per magazzino
                    col_widths = {
                        'id_ricambio': available_width * 0.15,
                        'asset_tipo': available_width * 0.12,
                        'costruttore': available_width * 0.12,
                        'modello': available_width * 0.12,
                        'fornitore': available_width * 0.12,
                        'quantita_disponibile': available_width * 0.08,
                        'quantita_minima': available_width * 0.08,
                        'prezzo_unitario': available_width * 0.08,
                        'valore_stock': available_width * 0.08,
                        'stato_disponibilita': available_width * 0.05
                    }
                    col_widths = [col_widths.get(header, available_width / len(display_headers)) for header in display_headers]
                else:
                    # Larghezze uniformi per altre sezioni
                    col_width = available_width / len(display_headers)
                    col_widths = [col_width] * len(display_headers)
                
                # Crea tabella con altezza automatica delle righe
                table = Table(table_data, colWidths=col_widths, repeatRows=1)
                
                # Stile tabella professionale con altezza automatica righe
                table_style = TableStyle([
                    # Header
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8f9fa')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                    ('ALIGN', (0, 0), (-1, 0), 'CENTER'),  # Header centrato
                    ('ALIGN', (0, 1), (-1, -1), 'LEFT'),   # Corpo a sinistra
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),   # Allineamento verticale in alto
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                    ('TOPPADDING', (0, 0), (-1, 0), 8),
                    
                    # Corpo tabella - padding più generoso per testo multilinea
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 1), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 1), (-1, -1), 6),  # Aumentato per spazio extra
                    ('TOPPADDING', (0, 1), (-1, -1), 6),    # Aumentato per spazio extra
                    ('LEFTPADDING', (0, 0), (-1, -1), 4),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    
                    # Bordi puliti
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                    ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#6c757d')),
                    
                    # Righe alternate per leggibilità
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')])
                ])
                
                table.setStyle(table_style)
                story.append(table)
                
                # Se ci sono più record del limite, aggiungi nota
                if len(filtered_data) > max_rows:
                    story.append(Spacer(1, 10))
                    note_text = f"Nota: Visualizzati primi {max_rows} record di {len(filtered_data)} totali."
                    story.append(Paragraph(note_text, normal_style))
            
        
        # SEZIONE RIEPILOGO FINALE
        story.append(Spacer(1, 30))
        story.append(Paragraph("DATA RIEPILOGO", summary_style))
        
        # Data generazione documento
        now = datetime.now()
        generation_date = now.strftime("%d/%m/%Y alle ore %H:%M")
        story.append(Paragraph(f"Documento generato il: {generation_date}", normal_style))
        
        # Statistiche totali
        total_records = len(filtered_data) if filtered_data else 0
        total_available = len(data) if data else 0
        
        if selected_records and len(selected_records) > 0:
            story.append(Paragraph(f"Record selezionati per stampa: {len(selected_records)}", normal_style))
        
        story.append(Paragraph(f"Totale record visualizzati: {total_records}", normal_style))
        story.append(Paragraph(f"Totale record disponibili: {total_available}", normal_style))
        
        # Sezione informazioni aggiuntive  
        if section_name == 'magazzino' and filtered_data:
            # Calcola statistiche magazzino
            esauriti = sum(1 for item in filtered_data if item.get('quantita_disponibile', 0) == 0)
            scarsi = sum(1 for item in filtered_data if item.get('quantita_disponibile', 0) > 0 and 
                        item.get('quantita_disponibile', 0) < item.get('quantita_minima', 1))
            disponibili = total_records - esauriti - scarsi
            
            story.append(Spacer(1, 10))
            story.append(Paragraph(f"Articoli disponibili: {disponibili}", normal_style))
            story.append(Paragraph(f"Articoli con scorta scarsa: {scarsi}", normal_style))
            story.append(Paragraph(f"Articoli esauriti: {esauriti}", normal_style))
        
        # Genera il PDF con canvas professionale
        doc.build(story, canvasmaker=ProfessionalCanvas)
        
        # Sposta il buffer all'inizio
        buffer.seek(0)
        return buffer
        
    except Exception as e:
        print(f"Errore nella creazione del PDF: {e}")
        raise e

def format_column_name(column_name):
    """Formatta i nomi delle colonne per la stampa"""
    column_map = {
        'id': 'ID',
        'name': 'Nome',
        'nome': 'Nome',
        'numero': 'Numero',
        'data_creazione': 'Data Creazione',
        'data_intervento': 'Data Intervento',
        'data_scadenza': 'Data Scadenza',
        'data_completamento': 'Data Completamento',
        'civico_numero': 'Civico',
        'asset_id': 'Asset ID',
        'id_aziendale': 'ID Aziendale',
        'operatore': 'Utente',
        'utente': 'Utente',
        'tipo': 'Tipo',
        'stato': 'Stato',
        'titolo': 'Titolo',
        'descrizione': 'Descrizione',
        'note': 'Note',
        'template_id': 'Template',
        'form_data': 'Dati Form',
        'created_at': 'Creato il',
        'updated_at': 'Aggiornato il',
        'is_active': 'Attivo',
        'icona': 'Icona',
        'colore': 'Colore',
        'categoria': 'Categoria',
        'schema_json': 'Schema JSON',
        'dati': 'Dettagli Tecnici',
        'doc_tecnica': 'Documentazione Tecnica',
        'tipo_nome': 'Nome Tipo',
        'tipo_descrizione': 'Descrizione Tipo',
        # Scadenze
        'civico': 'Civico',
        'asset': 'Asset',
        'operatore_completamento': 'Utente Completamento',
        'note_completamento': 'Note Completamento',
        # Magazzino
        'asset_tipo': 'Tipo Asset',
        'id_ricambio': 'ID Ricambio',
        'costruttore': 'Costruttore',
        'modello': 'Modello',
        'codice_produttore': 'Codice Produttore',
        'fornitore': 'Fornitore',
        'unita_misura': 'Unità di Misura',
        'quantita_disponibile': 'Quantità Disponibile',
        'quantita_minima': 'Quantità Minima',
        'prezzo_unitario': 'Prezzo Unitario (€)',
        'valore_stock': 'Valore Stock (€)',
        'stato_disponibilita': 'Stato Disponibilità',
        # Nuovi campi per compilazioni unificate
        'tipo_record': 'Tipo Record',
        'data_evento': 'Data Evento',
        'esito': 'Esito',
        'nome_voce': 'Voce Checklist',
        'operatore_esecuzione': 'Utente Esecuzione',
        'note_esecuzione': 'Note Esecuzione',
        'data_esecuzione': 'Data Esecuzione',
        'template_nome': 'Template/Voce'
    }
    return column_map.get(column_name, column_name.replace('_', ' ').title())

def format_value_for_print(column_name, value):
    """Formatta i valori per la stampa"""
    if value is None or value == '':
        return '-'
    
    # Valori booleani
    if column_name == 'is_active':
        return 'Attivo' if value else 'Non attivo'
    
    # Date
    if 'data' in column_name or 'created' in column_name or 'updated' in column_name:
        try:
            if 'T' in str(value):
                dt = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
                return dt.strftime('%d/%m/%Y alle %H:%M')
            else:
                dt = datetime.strptime(str(value), '%Y-%m-%d')
                return dt.strftime('%d/%m/%Y')
        except:
            return str(value)
    
    # Valori monetari
    if column_name in ['prezzo_unitario', 'valore_stock']:
        try:
            return f"€ {float(value):.2f}"
        except:
            return str(value)
    
    # Quantità
    if column_name in ['quantita_disponibile', 'quantita_minima']:
        return f"{int(value)}"
    
    # Per il formato didascalico, non troncare i JSON - verranno gestiti separatamente
    if column_name in ['form_data', 'dati', 'schema_json']:
        return str(value)  # Ritorna il valore completo
    
    # Documentazione tecnica
    if column_name == 'doc_tecnica' and value:
        return str(value)
    
    # Testo normale - tronca solo se molto lungo
    if len(str(value)) > 300:
        return str(value)[:297] + '...'
    
    return str(value)

@bp.route('/print-report', methods=['POST'])
def print_report():
    """
    Endpoint per generare e scaricare un report PDF
    """
    try:
        data = request.get_json()
        section = data.get('section', '')
        selected_records = data.get('selectedRecords', [])
        
        if not section:
            return jsonify({'error': 'Sezione non specificata'}), 400
        
        # Ottieni i dati della sezione
        section_data = []
        
        if section == 'asset-types':
            conn = get_gestman_connection()
            c = conn.cursor()
            c.execute('''
                SELECT name, id, is_active, created_at, updated_at
                FROM asset_types
                WHERE is_active = 1
                ORDER BY name
            ''')
            rows = c.fetchall()
            
            # Costruisco i risultati con ordine specifico delle colonne
            section_data = []
            for row in rows:
                result = {
                    'name': row['name'],
                    'id': row['id'],
                    'is_active': row['is_active'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] asset-types: trovati {len(section_data)} record")
            
        elif section == 'assets-inventory':
            conn = get_gestman_connection()
            c = conn.cursor()
            c.execute('''
                SELECT a.id_aziendale, a.tipo, a.civico_numero, a.dati, 
                       a.doc_tecnica,
                       at.name as tipo_nome, at.description as tipo_descrizione
                FROM assets a
                LEFT JOIN asset_types at ON a.tipo = at.name
                ORDER BY a.civico_numero, a.tipo, a.id_aziendale
            ''')
            rows = c.fetchall()
            
            # Costruisco i risultati con ordine specifico delle colonne (come nell'endpoint di visualizzazione)
            section_data = []
            for row in rows:
                result = {
                    'id_aziendale': row['id_aziendale'],
                    'tipo': row['tipo'],
                    'civico_numero': row['civico_numero'],
                    'dati': row['dati'],
                    'doc_tecnica': row['doc_tecnica'],
                    'tipo_nome': row['tipo_nome'],
                    'tipo_descrizione': row['tipo_descrizione']
                }
                section_data.append(result)
            
            conn.close()
            print(f"[DEBUG] assets-inventory: trovati {len(section_data)} record")
            if len(section_data) > 0:
                print(f"[DEBUG] Primo record: {section_data[0]}")
            
        elif section == 'civici':
            conn = get_gestman_connection()
            c = conn.cursor()
            c.execute('SELECT numero, descrizione FROM civici ORDER BY numero')
            rows = c.fetchall()
            section_data = []
            for row in rows:
                result = {
                    'numero': row['numero'],
                    'descrizione': row['descrizione']
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] civici: trovati {len(section_data)} record")
            
        elif section == 'compilazioni':
            # Compilazioni e storico esecuzioni unificati
            conn = sqlite3.connect(COMPILAZIONI_DB)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            
            section_data = []
            
            # 1. Form submissions
            c.execute('''
                SELECT s.id, 
                       'form' as tipo_record,
                       s.template_id, 
                       t.nome as template_nome, 
                       s.civico_numero as civico, 
                       s.asset_id as asset, 
                       s.operatore, 
                       s.data_intervento as data_evento, 
                       s.form_data, 
                       s.created_at,
                       '' as esito
                FROM form_submissions s
                LEFT JOIN form_templates t ON s.template_id = t.id
            ''')
            form_rows = c.fetchall()
            
            # 2. Storico esecuzioni
            c.execute('''
                SELECT se.id,
                       'esecuzione' as tipo_record,
                       NULL as template_id,
                       se.nome_voce as template_nome,
                       se.civico,
                       se.asset,
                       se.operatore_esecuzione as operatore,
                       se.data_esecuzione as data_evento,
                       se.note_esecuzione as form_data,
                       se.created_at,
                       se.esito
                FROM scadenze_storico_esecuzioni se
            ''')
            esecuzione_rows = c.fetchall()
            
            # Combina tutti i risultati
            all_rows = list(form_rows) + list(esecuzione_rows)
            
            # Ordina per data evento (più recenti prima)
            all_rows.sort(key=lambda x: x['data_evento'] or x['created_at'], reverse=True)
            
            for row in all_rows:
                # Formatta i dati del form per la visualizzazione
                form_data_preview = ""
                if row['form_data']:
                    try:
                        form_data = json.loads(row['form_data'])
                        # Filtra i campi escludendo le date e prendi solo i primi 3 campi utili
                        preview_items = []
                        date_keywords = ['data', 'date', 'tempo', 'time', 'created', 'updated', 'timestamp', 'intervento']
                        
                        for k, v in form_data.items():
                            # Salta i campi che contengono date o intervento
                            if any(keyword in k.lower() for keyword in date_keywords):
                                continue
                            # Salta valori vuoti o nulli
                            if not v or not str(v).strip():
                                continue
                            
                            preview_items.append(f"{k}: {v}")
                            
                            # Ferma dopo 3 elementi utili
                            if len(preview_items) >= 3:
                                break
                        
                        form_data_preview = ', '.join(preview_items)
                        if len([k for k in form_data.keys() if not any(keyword in k.lower() for keyword in date_keywords)]) > 3:
                            form_data_preview += "..."
                    except:
                        form_data_preview = str(row['form_data'])[:50] + "..."
                
                result = {
                    'id': row['id'],
                    'tipo_record': row['tipo_record'],
                    'template_id': row['template_id'],
                    'template_nome': row['template_nome'] or f"Template {row['template_id']}" if row['template_id'] else 'N/A',
                    'form_data_preview': form_data_preview,
                    'operatore': row['operatore'],
                    'data_evento': row['data_evento'],
                    'created_at': row['created_at'],
                    'civico': row['civico'],
                    'asset': row['asset'],
                    'esito': row['esito'] if 'esito' in row.keys() else ''
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] compilazioni: trovati {len(section_data)} record")
            
        elif section == 'scadenze':
            # Scadenze dal database compilazioni.db
            conn = get_compilazioni_connection()
            c = conn.cursor()
            c.execute('''
                SELECT id, civico, asset, asset_tipo, data_scadenza, 
                       data_completamento, operatore_completamento, 
                       note_completamento, stato, created_at, updated_at
                FROM scadenze_calendario
                ORDER BY data_scadenza DESC
            ''')
            rows = c.fetchall()
            section_data = []
            for row in rows:
                result = {
                    'id': row['id'],
                    'civico': row['civico'],
                    'asset': row['asset'],
                    'asset_tipo': row['asset_tipo'],
                    'data_scadenza': row['data_scadenza'],
                    'data_completamento': row['data_completamento'],
                    'operatore_completamento': row['operatore_completamento'],
                    'note_completamento': row['note_completamento'],
                    'stato': row['stato'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] scadenze: trovati {len(section_data)} record")
            
        elif section == 'alert':
            # Alert dal database compilazioni.db
            conn = get_compilazioni_connection()
            c = conn.cursor()
            c.execute('''
                SELECT tipo, titolo, descrizione, data_creazione, civico, asset,
                       stato, note, operatore, data_chiusura
                FROM alert
                ORDER BY data_creazione DESC
            ''')
            rows = c.fetchall()
            section_data = []
            for row in rows:
                result = {
                    'tipo': row['tipo'],
                    'titolo': row['titolo'],
                    'descrizione': row['descrizione'],
                    'data_creazione': row['data_creazione'],
                    'civico': row['civico'],
                    'asset': row['asset'],
                    'stato': row['stato'],
                    'note': row['note'],
                    'utente': row['operatore'],
                    'data_chiusura': row['data_chiusura']
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] alert: trovati {len(section_data)} record")
            
        elif section == 'magazzino':
            # Magazzino dal database compilazioni.db
            conn = get_compilazioni_connection()
            c = conn.cursor()
            c.execute('''
                SELECT id, asset_tipo, id_ricambio, costruttore, modello,
                       codice_produttore, fornitore, unita_misura,
                       quantita_disponibile, quantita_minima, prezzo_unitario,
                       note, created_at, updated_at
                FROM magazzino_ricambi
                WHERE attivo = 1
                ORDER BY asset_tipo, id_ricambio
            ''')
            rows = c.fetchall()
            section_data = []
            for row in rows:
                # Calcola stato e valore - controlla prima se esaurito, poi se scarso
                stato_disponibilita = 'Disponibile'
                if row['quantita_disponibile'] == 0:
                    stato_disponibilita = 'Esaurito'
                elif row['quantita_disponibile'] < row['quantita_minima']:
                    stato_disponibilita = 'Scarsa'
                
                valore_stock = row['quantita_disponibile'] * row['prezzo_unitario']
                
                result = {
                    'id': row['id'],
                    'asset_tipo': row['asset_tipo'],
                    'id_ricambio': row['id_ricambio'],
                    'costruttore': row['costruttore'],
                    'modello': row['modello'],
                    'codice_produttore': row['codice_produttore'],
                    'fornitore': row['fornitore'],
                    'unita_misura': row['unita_misura'],
                    'quantita_disponibile': row['quantita_disponibile'],
                    'quantita_minima': row['quantita_minima'],
                    'prezzo_unitario': row['prezzo_unitario'],
                    'valore_stock': valore_stock,
                    'stato_disponibilita': stato_disponibilita,
                    'note': row['note'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at']
                }
                section_data.append(result)
            conn.close()
            print(f"[DEBUG] magazzino: trovati {len(section_data)} record")
            
        else:
            return jsonify({'error': f'Sezione "{section}" non supportata'}), 400
        
        # Genera il PDF
        pdf_buffer = create_pdf_report(section_data, section, selected_records)
        
        # Crea la risposta con il PDF
        response = make_response(pdf_buffer.getvalue())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename="Report_{section}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf"'
        
        return response
        
    except Exception as e:
        print(f"Errore nella generazione del report: {e}")
        return jsonify({'error': str(e)}), 500

# === GESTIONE FILE CARICATI ===

# Definisce i percorsi delle cartelle upload
UPLOADS_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
DYNAMIC_FORMS_UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
FLOOR_PLANS_FOLDER = os.path.join(os.path.dirname(__file__), 'floor_plans')

@bp.route('/files', methods=['GET'])
def get_files_docs():
    """Ottieni elenco di tutti i file caricati nel sistema"""
    try:
        filters = {
            'tipo_file': request.args.get('tipo_file'),  # 'asset', 'form', 'pianta'
            'estensione': request.args.get('estensione'),  # 'pdf', 'jpg', etc.
            'nome_file': request.args.get('nome_file')
        }
        
        all_files = []
        
        # 1. File degli asset (dalla cartella uploads/)
        if os.path.exists(UPLOADS_FOLDER):
            for root, dirs, files in os.walk(UPLOADS_FOLDER):
                for file in files:
                    if file.startswith('.'):  # Skip file nascosti
                        continue
                        
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, UPLOADS_FOLDER)
                    
                    # Ottieni informazioni file
                    stat = os.stat(file_path)
                    file_size = stat.st_size
                    created_time = datetime.fromtimestamp(stat.st_ctime)
                    modified_time = datetime.fromtimestamp(stat.st_mtime)
                    
                    # Determina il tipo di file in base alla cartella
                    if os.path.dirname(rel_path) in ['Carica_file_bolle_o_rappoertini', 'Rapportino_esterno']:
                        tipo_file = 'form'
                        origine = 'Dynamic Forms'
                    else:
                        tipo_file = 'asset'
                        origine = 'Asset Documentation'
                    
                    file_info = {
                        'id': rel_path.replace('\\', '/'),  # ID univoco usando il path relativo
                        'nome_file': file,
                        'percorso_relativo': rel_path.replace('\\', '/'),
                        'cartella': os.path.dirname(rel_path) or 'root',
                        'estensione': os.path.splitext(file)[1][1:].lower(),  # Rimuove il punto
                        'dimensione_bytes': file_size,
                        'dimensione_mb': round(file_size / (1024 * 1024), 2),
                        'data_creazione': created_time.isoformat(),
                        'data_modifica': modified_time.isoformat(),
                        'tipo_file': tipo_file,
                        'origine': origine,
                        'percorso_completo': file_path,
                        'download_url': f'/api/docs/files/{rel_path.replace(chr(92), "/")}/download'
                    }
                    
                    # Trova l'asset associato (se esiste)
                    if tipo_file == 'asset':
                        file_info['asset_associato'] = find_associated_asset(file)
                    
                    all_files.append(file_info)
        
        # 2. File delle planimetrie (dalla cartella floor_plans/)
        if os.path.exists(FLOOR_PLANS_FOLDER):
            for file in os.listdir(FLOOR_PLANS_FOLDER):
                if file.startswith('.'):  # Skip file nascosti
                    continue
                    
                file_path = os.path.join(FLOOR_PLANS_FOLDER, file)
                if not os.path.isfile(file_path):
                    continue
                    
                # Ottieni informazioni file
                stat = os.stat(file_path)
                file_size = stat.st_size
                created_time = datetime.fromtimestamp(stat.st_ctime)
                modified_time = datetime.fromtimestamp(stat.st_mtime)
                
                file_info = {
                    'id': f'floor_plans/{file}',
                    'nome_file': file,
                    'percorso_relativo': f'floor_plans/{file}',
                    'cartella': 'floor_plans',
                    'estensione': os.path.splitext(file)[1][1:].lower(),
                    'dimensione_bytes': file_size,
                    'dimensione_mb': round(file_size / (1024 * 1024), 2),
                    'data_creazione': created_time.isoformat(),
                    'data_modifica': modified_time.isoformat(),
                    'tipo_file': 'pianta',
                    'origine': 'Planimetrie Civici',
                    'percorso_completo': file_path,
                    'civico_associato': os.path.splitext(file)[0],  # Nome file senza estensione = numero civico
                    'download_url': f'/api/docs/files/floor_plans/{file}/download'
                }
                
                all_files.append(file_info)
        
        # Applica filtri
        filtered_files = all_files
        
        if filters.get('tipo_file'):
            filtered_files = [f for f in filtered_files if f['tipo_file'] == filters['tipo_file']]
        
        if filters.get('estensione'):
            filtered_files = [f for f in filtered_files if f['estensione'] == filters['estensione']]
        
        if filters.get('nome_file'):
            nome_filter = filters['nome_file'].lower()
            filtered_files = [f for f in filtered_files if nome_filter in f['nome_file'].lower()]
        
        # Ordina per data di modifica (più recenti prima)
        filtered_files.sort(key=lambda x: x['data_modifica'], reverse=True)
        
        # Calcola statistiche
        total_size_bytes = sum(f['dimensione_bytes'] for f in filtered_files)
        total_size_mb = round(total_size_bytes / (1024 * 1024), 2)
        
        # Raggruppa per tipo
        by_type = {}
        for f in filtered_files:
            tipo = f['tipo_file']
            if tipo not in by_type:
                by_type[tipo] = {'count': 0, 'size_mb': 0}
            by_type[tipo]['count'] += 1
            by_type[tipo]['size_mb'] += f['dimensione_mb']
        
        # Raggruppa per estensione
        by_extension = {}
        for f in filtered_files:
            ext = f['estensione']
            if ext not in by_extension:
                by_extension[ext] = {'count': 0, 'size_mb': 0}
            by_extension[ext]['count'] += 1
            by_extension[ext]['size_mb'] += f['dimensione_mb']
        
        # Opzioni di filtro
        filter_options = {
            'tipo_file': list(set(f['tipo_file'] for f in all_files)),
            'estensione': list(set(f['estensione'] for f in all_files if f['estensione'])),
            'cartella': list(set(f['cartella'] for f in all_files))
        }
        
        return jsonify({
            'data': filtered_files,
            'total': len(filtered_files),
            'statistiche': {
                'total_files': len(filtered_files),
                'total_size_mb': total_size_mb,
                'by_type': by_type,
                'by_extension': by_extension
            },
            'filters': filter_options
        }), 200
        
    except Exception as e:
        print(f"[ERROR] get_files_docs: {e}")
        return jsonify({'error': str(e)}), 500

def find_associated_asset(filename):
    """Trova l'asset associato a un file di documentazione"""
    try:
        conn = get_gestman_connection()
        c = conn.cursor()
        
        # Cerca negli asset dove doc_tecnica corrisponde al filename
        c.execute("""
            SELECT id_aziendale, tipo, civico_numero 
            FROM assets 
            WHERE doc_tecnica = ?
        """, (filename,))
        
        result = c.fetchone()
        conn.close()
        
        if result:
            return {
                'id_aziendale': result['id_aziendale'],
                'tipo': result['tipo'],
                'civico_numero': result['civico_numero']
            }
        return None
        
    except Exception as e:
        print(f"[ERROR] find_associated_asset: {e}")
        return None

@bp.route('/files/<path:file_path>/download')
def download_file_docs(file_path):
    """Download di un file specifico"""
    try:
        print(f"[DEBUG] Download richiesto per: {file_path}")
        
        # Gestisci i percorsi delle planimetrie
        if file_path.startswith('floor_plans/'):
            # Rimuovi 'floor_plans/' dal path
            filename = file_path[12:]
            file_full_path = os.path.join(FLOOR_PLANS_FOLDER, filename)
            folder = FLOOR_PLANS_FOLDER
        else:
            # File delle altre cartelle (uploads)
            file_full_path = os.path.join(UPLOADS_FOLDER, file_path)
            folder = os.path.dirname(file_full_path)
            filename = os.path.basename(file_path)
        
        print(f"[DEBUG] Path completo: {file_full_path}")
        print(f"[DEBUG] Cartella: {folder}")
        print(f"[DEBUG] Filename: {filename}")
        
        # Verifica che il file esista
        if not os.path.exists(file_full_path):
            print(f"[ERROR] File non trovato: {file_full_path}")
            return jsonify({'error': 'File non trovato'}), 404
        
        # Verifica che sia un file (non una cartella)
        if not os.path.isfile(file_full_path):
            return jsonify({'error': 'Path non valido'}), 400
        
        # Invia il file
        return send_from_directory(
            folder, 
            filename,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        print(f"[ERROR] download_file_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/files/<path:file_path>', methods=['DELETE'])
def delete_file_docs(file_path):
    """Elimina un file specifico"""
    try:
        print(f"[DEBUG] Eliminazione richiesta per: {file_path}")
        
        # Gestisci i percorsi delle planimetrie
        if file_path.startswith('floor_plans/'):
            filename = file_path[12:]
            file_full_path = os.path.join(FLOOR_PLANS_FOLDER, filename)
        else:
            file_full_path = os.path.join(UPLOADS_FOLDER, file_path)
        
        # Verifica che il file esista
        if not os.path.exists(file_full_path):
            return jsonify({'error': 'File non trovato'}), 404
        
        # Verifica che sia un file (non una cartella)
        if not os.path.isfile(file_full_path):
            return jsonify({'error': 'Impossibile eliminare: non è un file'}), 400
        
        # Se è un file di documentazione tecnica di un asset, rimuovi il riferimento dal DB
        filename = os.path.basename(file_path)
        if not file_path.startswith('floor_plans/'):
            try:
                conn = get_gestman_connection()
                c = conn.cursor()
                c.execute("UPDATE assets SET doc_tecnica = NULL WHERE doc_tecnica = ?", (filename,))
                conn.commit()
                conn.close()
                print(f"[DEBUG] Rimosso riferimento da assets per file: {filename}")
            except Exception as e:
                print(f"[WARNING] Errore rimozione riferimento DB: {e}")
        
        # Elimina il file fisico
        os.remove(file_full_path)
        print(f"[DEBUG] File eliminato: {file_full_path}")
        
        return jsonify({
            'success': True, 
            'message': f'File "{filename}" eliminato con successo'
        }), 200
        
    except Exception as e:
        print(f"[ERROR] delete_file_docs: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/files/bulk-delete', methods=['DELETE'])
def bulk_delete_files():
    """Eliminazione multipla di file"""
    try:
        data = request.json
        file_paths = data.get('file_paths', [])
        
        if not file_paths:
            return jsonify({'error': 'Nessun file specificato'}), 400

        deleted_count = 0
        errors = []
        
        for file_path in file_paths:
            try:
                # Gestisci i percorsi delle planimetrie
                if file_path.startswith('floor_plans/'):
                    filename = file_path[12:]
                    file_full_path = os.path.join(FLOOR_PLANS_FOLDER, filename)
                else:
                    file_full_path = os.path.join(UPLOADS_FOLDER, file_path)
                
                if not os.path.exists(file_full_path):
                    errors.append(f"{file_path}: File non trovato")
                    continue
                
                if not os.path.isfile(file_full_path):
                    errors.append(f"{file_path}: Non è un file")
                    continue
                
                # Rimuovi riferimenti dal DB se necessario
                filename = os.path.basename(file_path)
                if not file_path.startswith('floor_plans/'):
                    try:
                        conn = get_gestman_connection()
                        c = conn.cursor()
                        c.execute("UPDATE assets SET doc_tecnica = NULL WHERE doc_tecnica = ?", (filename,))
                        conn.commit()
                        conn.close()
                    except Exception as e:
                        print(f"[WARNING] Errore rimozione riferimento DB per {filename}: {e}")
                
                # Elimina il file fisico
                os.remove(file_full_path)
                deleted_count += 1
                print(f"[DEBUG] File eliminato: {file_full_path}")
                
            except Exception as e:
                errors.append(f"{file_path}: {str(e)}")
        
        return jsonify({
            'deleted': deleted_count,
            'errors': errors,
            'success': len(errors) == 0
        }), 200
        
    except Exception as e:
        print(f"[ERROR] bulk_delete_files: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/files/cleanup', methods=['POST'])
def cleanup_files():
    """Pulizia file orfani (file che non hanno più riferimenti nel DB)"""
    try:
        data = request.json
        dry_run = data.get('dry_run', True)  # Default: solo simulazione
        
        orphaned_files = []
        
        # 1. Controlla file di documentazione asset
        conn = get_gestman_connection()
        c = conn.cursor()
        
        # Ottieni tutti i nomi dei file riferiti nel DB
        c.execute("SELECT DISTINCT doc_tecnica FROM assets WHERE doc_tecnica IS NOT NULL AND doc_tecnica != ''")
        referenced_files = set(row[0] for row in c.fetchall())
        conn.close()
        
        # Controlla tutti i file nella cartella uploads (escludendo sottocartelle form)
        if os.path.exists(UPLOADS_FOLDER):
            for file in os.listdir(UPLOADS_FOLDER):
                file_path = os.path.join(UPLOADS_FOLDER, file)
                if os.path.isfile(file_path) and file not in referenced_files:
                    stat = os.stat(file_path)
                    orphaned_files.append({
                        'path': file,
                        'tipo': 'asset_documentation',
                        'dimensione_mb': round(stat.st_size / (1024 * 1024), 2),
                        'data_modifica': datetime.fromtimestamp(stat.st_mtime).isoformat()
                    })
        
        # 2. TODO: Aggiungere controllo per file delle form che non hanno submission
        
        if not dry_run and orphaned_files:
            # Elimina effettivamente i file orfani
            deleted_count = 0
            for file_info in orphaned_files:
                try:
                    file_path = os.path.join(UPLOADS_FOLDER, file_info['path'])
                    os.remove(file_path)
                    deleted_count += 1
                except Exception as e:
                    print(f"[ERROR] Errore eliminazione {file_info['path']}: {e}")
            
            return jsonify({
                'success': True,
                'deleted_count': deleted_count,
                'orphaned_files': orphaned_files,
                'message': f'Eliminati {deleted_count} file orfani'
            }), 200
        else:
            return jsonify({
                'success': True,
                'orphaned_files': orphaned_files,
                'total_orphaned': len(orphaned_files),
                'total_size_mb': sum(f['dimensione_mb'] for f in orphaned_files),
                'dry_run': dry_run,
                'message': f'Trovati {len(orphaned_files)} file orfani. Usa dry_run=false per eliminarli.'
            }), 200
        
    except Exception as e:
        print(f"[ERROR] cleanup_files: {e}")
        return jsonify({'error': str(e)}), 500

@bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint non trovato'}), 404

@bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Errore interno del server'}), 500
#   T e s t   m o d i f i c a   w o r k f l o w  
 