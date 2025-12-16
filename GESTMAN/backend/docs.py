# coding: utf-8
"""
Blueprint per la documentazione dinamica - Sistema intelligente
Analizza le strutture DB e genera documenti adattivi
"""

from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime

bp = Blueprint('docs', __name__)

# Percorsi database
GESTMAN_DB = os.path.join(os.path.dirname(__file__), 'gestman.db')
COMPILAZIONI_DB = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

def get_db_connection(db_type='gestman'):
    """Connessione dinamica ai database"""
    db_path = GESTMAN_DB if db_type == 'gestman' else COMPILAZIONI_DB
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def analyze_table_structure(db_type, table_name):
    """Analizza la struttura di una tabella dinamicamente"""
    try:
        conn = get_db_connection(db_type)
        cursor = conn.cursor()
        
        # Ottieni info colonne
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        # Ottieni conteggio righe
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        row_count = cursor.fetchone()['count']
        
        # Ottieni sample data per capire i tipi di contenuto
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
        sample_data = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return {
            'table_name': table_name,
            'database': db_type,
            'columns': [{'name': col[1], 'type': col[2], 'not_null': col[3]} for col in columns],
            'row_count': row_count,
            'sample_data': sample_data
        }
        
    except Exception as e:
        return {'error': f"Errore analisi tabella {table_name}: {str(e)}"}

@bp.route('/analyze-databases', methods=['GET'])
def analyze_databases():
    """Endpoint che analizza entrambi i database e restituisce le strutture"""
    try:
        result = {
            'timestamp': datetime.now().isoformat(),
            'databases': {}
        }
        
        # Analizza gestman.db
        gestman_conn = get_db_connection('gestman')
        cursor = gestman_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        gestman_tables = [row[0] for row in cursor.fetchall()]
        gestman_conn.close()
        
        result['databases']['gestman'] = {
            'tables': [],
            'path': GESTMAN_DB
        }
        
        for table in gestman_tables:
            table_info = analyze_table_structure('gestman', table)
            result['databases']['gestman']['tables'].append(table_info)
        
        # Analizza compilazioni.db
        comp_conn = get_db_connection('compilazioni')
        cursor = comp_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        comp_tables = [row[0] for row in cursor.fetchall()]
        comp_conn.close()
        
        result['databases']['compilazioni'] = {
            'tables': [],
            'path': COMPILAZIONI_DB
        }
        
        for table in comp_tables:
            table_info = analyze_table_structure('compilazioni', table)
            result['databases']['compilazioni']['tables'].append(table_info)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f"Errore analisi database: {str(e)}"}), 500

@bp.route('/query-data', methods=['POST'])
def query_data():
    """Endpoint per query dinamiche sui dati"""
    try:
        query_config = request.get_json()
        
        db_type = query_config.get('database', 'gestman')
        table_name = query_config.get('table')
        columns = query_config.get('columns', ['*'])
        filters = query_config.get('filters', {})
        limit = query_config.get('limit', 100)
        
        if not table_name:
            return jsonify({'error': 'Nome tabella richiesto'}), 400
        
        conn = get_db_connection(db_type)
        cursor = conn.cursor()
        
        # Costruisci query dinamica
        select_cols = ', '.join(columns) if columns != ['*'] else '*'
        query = f"SELECT {select_cols} FROM {table_name}"
        params = []
        
        # Applica filtri dinamici
        if filters:
            where_conditions = []
            for field, value in filters.items():
                if isinstance(value, dict) and 'operator' in value:
                    # Filtro avanzato: {"field": {"operator": "LIKE", "value": "%test%"}}
                    op = value['operator']
                    where_conditions.append(f"{field} {op} ?")
                    params.append(value['value'])
                else:
                    # Filtro semplice: {"field": "value"}
                    where_conditions.append(f"{field} = ?")
                    params.append(value)
            
            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
        
        query += f" LIMIT {limit}"
        
        cursor.execute(query, params)
        data = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'data': data,
            'query': query,
            'count': len(data),
            'database': db_type,
            'table': table_name
        }), 200
        
    except Exception as e:
        return jsonify({'error': f"Errore query: {str(e)}"}), 500

@bp.route('/relationships', methods=['GET'])
def get_relationships():
    """Analizza e suggerisce relazioni tra tabelle"""
    try:
        relationships = {
            'asset_relationships': [
                {
                    'name': 'Asset → Compilazioni',
                    'description': 'Interventi su asset specifici',
                    'join': {
                        'gestman.assets.id_aziendale': 'compilazioni.form_submissions.asset_id'
                    }
                },
                {
                    'name': 'Asset → Alert',
                    'description': 'Segnalazioni per asset',
                    'join': {
                        'gestman.assets.id_aziendale': 'compilazioni.alert.asset'
                    }
                },
                {
                    'name': 'Asset → Scadenze',
                    'description': 'Manutenzioni programmate',
                    'join': {
                        'gestman.assets.id_aziendale': 'compilazioni.scadenze_calendario.asset'
                    }
                }
            ],
            'civico_relationships': [
                {
                    'name': 'Civici → Assets',
                    'description': 'Asset per ubicazione',
                    'join': {
                        'gestman.civici.numero': 'gestman.assets.civico_numero'
                    }
                },
                {
                    'name': 'Civici → Compilazioni',
                    'description': 'Interventi per ubicazione',
                    'join': {
                        'gestman.civici.numero': 'compilazioni.form_submissions.civico_numero'
                    }
                }
            ],
            'maintenance_relationships': [
                {
                    'name': 'Compilazioni → Alert',
                    'description': 'Interventi che generano alert',
                    'join': {
                        'compilazioni.form_submissions.asset_id': 'compilazioni.alert.asset',
                        'compilazioni.form_submissions.civico_numero': 'compilazioni.alert.civico'
                    }
                }
            ]
        }
        
        return jsonify(relationships), 200
        
    except Exception as e:
        return jsonify({'error': f"Errore relazioni: {str(e)}"}), 500

@bp.route('/advanced-query', methods=['POST'])
def advanced_query():
    """Query avanzate con JOIN tra database e aggregazioni"""
    try:
        config = request.get_json()
        query_type = config.get('type')
        
        if query_type == 'asset_summary':
            return asset_summary_query(config)
        elif query_type == 'maintenance_report':
            return maintenance_report_query(config)
        elif query_type == 'alert_analysis':
            return alert_analysis_query(config)
        else:
            return jsonify({'error': 'Tipo query non supportato'}), 400
            
    except Exception as e:
        return jsonify({'error': f"Errore query avanzata: {str(e)}"}), 500

def asset_summary_query(config):
    """Genera report riassuntivo per asset (specifico o generale)"""
    asset_id = config.get('asset_id')
    civico = config.get('civico')
    date_from = config.get('date_from')
    date_to = config.get('date_to')
    
    # Dati asset da gestman.db
    gestman_conn = get_db_connection('gestman')
    cursor = gestman_conn.cursor()
    
    # Query dinamica basata sui filtri
    where_conditions = []
    params = []
    
    if asset_id:
        where_conditions.append("a.id = ?")
        params.append(asset_id)
    
    if civico:
        where_conditions.append("a.civico = ?")
        params.append(civico)
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    query = f"""
        SELECT a.* 
        FROM assets a 
        {where_clause}
        LIMIT 100
    """
    
    cursor.execute(query, params)
    assets_data = [dict(row) for row in cursor.fetchall()]
    gestman_conn.close()
    
    if not assets_data:
        return jsonify({'error': 'Nessun asset trovato con i criteri specificati'}), 404
    
    # Aggiungi statistiche per ogni asset da compilazioni.db
    comp_conn = get_db_connection('compilazioni')
    
    for asset in assets_data:
        asset_id_val = asset['id']
        cursor = comp_conn.cursor()
        
        # Interventi per questo asset
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM form_submissions 
            WHERE asset_id = ?
        """, [asset_id_val])
        result = cursor.fetchone()
        asset['interventi_count'] = result[0] if result else 0
        
        # Alert per questo asset
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM alert 
            WHERE asset = ?
        """, [asset_id_val])
        result = cursor.fetchone()
        asset['alert_count'] = result[0] if result else 0
        
        # Scadenze per questo asset
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM scadenze 
            WHERE asset_id = ?
        """, [asset_id_val])
        result = cursor.fetchone()
        asset['scadenze_count'] = result[0] if result else 0
    
    comp_conn.close()
    
    # Calcola statistiche generali
    total_interventi = sum(asset.get('interventi_count', 0) for asset in assets_data)
    total_alerts = sum(asset.get('alert_count', 0) for asset in assets_data)
    total_scadenze = sum(asset.get('scadenze_count', 0) for asset in assets_data)
    
    return jsonify({
        'asset_count': len(assets_data),
        'total_interventions': total_interventi,
        'active_alerts': total_alerts,
        'total_scadenze': total_scadenze,
        'assets': assets_data,
        'query_time': datetime.now().isoformat()
    }), 200

def maintenance_report_query(config):
    """Report manutenzioni per periodo"""
    date_from = config.get('date_from')
    date_to = config.get('date_to')
    civico = config.get('civico')
    
    comp_conn = get_db_connection('compilazioni')
    cursor = comp_conn.cursor()
    
    query = """
        SELECT 
            fs.asset_id,
            fs.civico_numero,
            fs.operatore,
            fs.created_at,
            COUNT(*) as interventi_count,
            GROUP_CONCAT(DISTINCT ft.nome) as tipi_intervento
        FROM form_submissions fs
        LEFT JOIN form_templates ft ON fs.template_id = ft.id
        WHERE 1=1
    """
    params = []
    
    if date_from:
        query += " AND date(fs.created_at) >= ?"
        params.append(date_from)
    
    if date_to:
        query += " AND date(fs.created_at) <= ?"
        params.append(date_to)
        
    if civico:
        query += " AND fs.civico_numero = ?"
        params.append(civico)
    
    query += " GROUP BY fs.asset_id, fs.civico_numero ORDER BY fs.created_at DESC"
    
    cursor.execute(query, params)
    data = [dict(row) for row in cursor.fetchall()]
    comp_conn.close()
    
    return jsonify({
        'report_type': 'maintenance_summary',
        'filters': {'date_from': date_from, 'date_to': date_to, 'civico': civico},
        'data': data,
        'count': len(data)
    }), 200

def alert_analysis_query(config):
    """Analisi alert per identificare criticità"""
    comp_conn = get_db_connection('compilazioni')
    cursor = comp_conn.cursor()
    
    # Alert per asset
    cursor.execute("""
        SELECT 
            asset,
            civico,
            tipo,
            COUNT(*) as alert_count,
            COUNT(CASE WHEN stato = 'aperto' THEN 1 END) as alert_aperti,
            AVG(CASE WHEN data_chiusura IS NOT NULL 
                THEN julianday(data_chiusura) - julianday(data_creazione) END) as tempo_medio_risoluzione
        FROM alert 
        GROUP BY asset, civico, tipo
        HAVING alert_count > 1
        ORDER BY alert_count DESC
    """)
    
    data = [dict(row) for row in cursor.fetchall()]
    comp_conn.close()
    
    return jsonify({
        'analysis_type': 'alert_criticality',
        'data': data,
        'insights': {
            'total_assets_with_multiple_alerts': len(data),
            'most_problematic_asset': data[0]['asset'] if data else None
        }
    }), 200