# coding: utf-8
"""
Blueprint per la documentazione dinamica - Sistema intelligente
Analizza le strutture DB e genera documenti adattivi
"""

from flask import Blueprint, request, jsonify
import sqlite3
import os
import logging
from datetime import datetime
import db_validators

# Configura logging
logger = logging.getLogger(__name__)

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

@bp.route('/databases', methods=['GET'])
def get_databases():
    """Endpoint per ottenere struttura database - compatibile con frontend"""
    try:
        databases = {}
        
        # Analizza gestman.db
        print(f"Checking gestman.db at: {GESTMAN_DB}")
        print(f"File exists: {os.path.exists(GESTMAN_DB)}")
        
        if os.path.exists(GESTMAN_DB):
            conn = get_db_connection('gestman')
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"Found {len(tables)} tables in gestman.db: {[t[0] for t in tables]}")
            
            gestman_tables = []
            for table in tables:
                table_info = analyze_table_structure('gestman', table[0])
                gestman_tables.append(table_info)
                print(f"Table {table[0]} has {table_info.get('row_count', 0)} rows")
            
            databases['gestman'] = {
                'tables': gestman_tables,
                'size': 'N/A'
            }
            conn.close()
        else:
            print("gestman.db not found!")
            databases['gestman'] = {'tables': [], 'size': 'N/A'}
        
        # Analizza compilazioni.db
        print(f"Checking compilazioni.db at: {COMPILAZIONI_DB}")
        print(f"File exists: {os.path.exists(COMPILAZIONI_DB)}")
        
        if os.path.exists(COMPILAZIONI_DB):
            conn = get_db_connection('compilazioni')
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"Found {len(tables)} tables in compilazioni.db: {[t[0] for t in tables]}")
            
            comp_tables = []
            for table in tables:
                table_info = analyze_table_structure('compilazioni', table[0])
                comp_tables.append(table_info)
                print(f"Table {table[0]} has {table_info.get('row_count', 0)} rows")
            
            databases['compilazioni'] = {
                'tables': comp_tables,
                'size': 'N/A'
            }
            conn.close()
        else:
            print("compilazioni.db not found!")
            databases['compilazioni'] = {'tables': [], 'size': 'N/A'}
        
        return jsonify({
            'databases': databases,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/query', methods=['POST'])
def query_table_data():
    """Query dati da tabella specifica"""
    try:
        data = request.get_json()
        database = data.get('database')
        table = data.get('table')
        limit = data.get('limit', 10)
        
        conn = get_db_connection(database)
        cursor = conn.cursor()
        
        # Query con limit
        cursor.execute(f"SELECT * FROM {table} LIMIT ?", (limit,))
        rows = [dict(row) for row in cursor.fetchall()]
        
        # Conta totale righe
        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        total_count = cursor.fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'data': rows,
            'count': total_count,
            'table': table,
            'database': database
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        
        # Trasforma in array piatto per il frontend
        flat_relationships = []
        for category_name, rels in relationships.items():
            for rel in rels:
                join_info = list(rel['join'].items())[0]  # Prendi il primo join
                from_parts = join_info[0].split('.')
                to_parts = join_info[1].split('.')
                
                flat_relationships.append({
                    'from_db': from_parts[0],
                    'from_table': from_parts[1],
                    'from_column': from_parts[2] if len(from_parts) > 2 else 'id',
                    'to_db': to_parts[0],
                    'to_table': to_parts[1],
                    'to_column': to_parts[2] if len(to_parts) > 2 else 'id',
                    'relationship_type': rel['name'],
                    'description': rel['description']
                })
        
        return jsonify(flat_relationships), 200
        
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
    print(f"[DEBUG] asset_summary_query chiamata con config: {config}")
    
    asset_id = config.get('asset_id')
    civico = config.get('civico')
    date_from = config.get('date_from')
    date_to = config.get('date_to')
    
    # Dati asset da gestman.db - prima verifichiamo la struttura
    gestman_conn = get_db_connection('gestman')
    cursor = gestman_conn.cursor()  # CREO IL CURSOR SUBITO DOPO LA CONNESSIONE
    
    # Verifica struttura tabella assets
    try:
        cursor.execute("PRAGMA table_info(assets)")
        columns_info = cursor.fetchall()
        column_names = [col[1] for col in columns_info]
        print(f"[DEBUG] Colonne tabella assets: {column_names}")
        
        # Determina i nomi delle colonne corretti
        id_col = 'id_aziendale' if 'id_aziendale' in column_names else ('id' if 'id' in column_names else column_names[0])
        civico_col = 'civico_numero' if 'civico_numero' in column_names else ('civico' if 'civico' in column_names else None)
        print(f"[DEBUG] Usando colonne: id_col={id_col}, civico_col={civico_col}")
    except Exception as e:
        gestman_conn.close()
        return jsonify({'error': f'Errore verifica struttura tabella: {str(e)}'}), 500
    
    # Query dinamica basata sui filtri
    where_conditions = []
    params = []
    
    if asset_id:
        where_conditions.append(f"{id_col} = ?")
        params.append(asset_id)
    
    if civico and civico_col:
        where_conditions.append(f"{civico_col} = ?")
        params.append(civico)
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    query = f"""
        SELECT * 
        FROM assets 
        {where_clause}
        LIMIT 100
    """
    
    try:
        cursor.execute(query, params)
        assets_data = [dict(row) for row in cursor.fetchall()]
        print(f"[DEBUG] Query eseguita, trovati {len(assets_data)} assets")
    except Exception as e:
        gestman_conn.close()
        return jsonify({'error': f'Errore query assets: {str(e)}'}), 500
    
    if not assets_data:
        return jsonify({'error': 'Nessun asset trovato con i criteri specificati'}), 404
    
    # Aggiungi statistiche per ogni asset da compilazioni.db
    comp_conn = get_db_connection('compilazioni')
    
    comp_cursor = comp_conn.cursor()
    
    for asset in assets_data:
        # Usa la colonna corretta identificata precedentemente  
        asset_id_val = asset.get(id_col) or asset.get('id') or asset.get('id_aziendale')
        print(f"[DEBUG] Processando asset con ID: {asset_id_val}")
        
        # Interventi per questo asset - usando il cursor corretto
        try:
            comp_cursor.execute("""
                SELECT COUNT(*) as count
                FROM form_submissions 
                WHERE asset_id = ?
            """, [asset_id_val])
            result = comp_cursor.fetchone()
            asset['interventi_count'] = result[0] if result else 0
        except Exception as e:
            print(f"[DEBUG] Errore conteggio interventi: {e}")
            asset['interventi_count'] = 0
        
        # Alert per questo asset - usando nome tabella corretto 'alert' (non alert_manager)
        try:
            comp_cursor.execute("""
                SELECT COUNT(*) as count
                FROM alert 
                WHERE asset = ?
            """, [str(asset_id_val)])  # asset field è TEXT, non INTEGER
            result = comp_cursor.fetchone()
            asset['alert_count'] = result[0] if result else 0
        except Exception as e:
            print(f"[DEBUG] Errore conteggio alert: {e}")
            asset['alert_count'] = 0
        
        # Scadenze per questo asset - verificando nome tabella  
        try:
            comp_cursor.execute("""
                SELECT COUNT(*) as count
                FROM scadenze_calendario 
                WHERE asset = ?
            """, [str(asset_id_val)])
            result = comp_cursor.fetchone()
            asset['scadenze_count'] = result[0] if result else 0
        except Exception as e:
            print(f"[DEBUG] Errore conteggio scadenze: {e}")
            asset['scadenze_count'] = 0
    
    comp_conn.close()
    gestman_conn.close()  # Chiudo anche la connessione gestman
    
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

@bp.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    """Genera un PDF professionale dai dati della query"""
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from flask import send_file
        import io
        
        data = request.get_json()
        print(f"PDF Request Data: {data}")  # Debug
        
        # Parametri configurazione
        config = data.get('config', {})
        query_result = data.get('queryResult', {})
        template_config = data.get('templateConfig', {})
        
        print(f"Query result data: {query_result.get('data', [])[:2]}")  # Debug primi 2 record
        
        # Configurazione documento
        orientation = config.get('orientation', 'portrait')
        page_size = A4 if orientation == 'portrait' else (A4[1], A4[0])
        
        # Buffer per il PDF
        buffer = io.BytesIO()
        
        # Crea documento
        doc = SimpleDocTemplate(
            buffer,
            pagesize=page_size,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Stili
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            textColor=colors.HexColor('#2c3e50'),
            alignment=1  # Center
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=colors.HexColor('#34495e')
        )
        
        # Contenuto del documento
        story = []
        
        # Titolo
        title = template_config.get('title', 'Report Database')
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 12))
        
        # Sottotitolo con informazioni
        subtitle = f"Database: {query_result.get('database', 'N/A')} - Tabella: {query_result.get('table', 'N/A')}"
        story.append(Paragraph(subtitle, subtitle_style))
        story.append(Spacer(1, 12))
        
        # Data generazione
        date_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        story.append(Paragraph(f"Generato il: {date_str}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Gestisce sia dati singoli che multi-sezione
        sections = query_result.get('sections', [])
        table_data = query_result.get('data', [])
        
        if sections:
            # Report multi-database
            for i, section in enumerate(sections):
                if i > 0:
                    story.append(PageBreak())
                
                # Titolo sezione
                section_title = f"Database: {section['database']} - Tabella: {section['table']}"
                story.append(Paragraph(section_title, subtitle_style))
                story.append(Spacer(1, 12))
                
                section_data = section.get('data', [])
                if section_data:
                    # Headers
                    headers = list(section_data[0].keys()) if section_data else []
                    
                    # Prepara dati per la tabella
                    pdf_table_data = [headers]
                    
                    for row in section_data:
                        pdf_row = []
                        for header in headers:
                            value = row.get(header, '')
                            # Gestisci valori None e lunghi
                            if value is None:
                                value = ''
                            elif isinstance(value, str) and len(value) > 50:
                                value = value[:47] + '...'
                            pdf_row.append(str(value))
                        pdf_table_data.append(pdf_row)
                    
                    # Crea tabella sezione
                    table = Table(pdf_table_data)
                    
                    # Stile tabella sezione
                    table_style = TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('FONTSIZE', (0, 0), (-1, 0), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                        ('FONTSIZE', (0, 1), (-1, -1), 8),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ])
                    
                    # Applica stile alternato per le righe
                    for j in range(1, len(pdf_table_data)):
                        if j % 2 == 0:
                            table_style.add('BACKGROUND', (0, j), (-1, j), colors.HexColor('#f8f9fa'))
                    
                    table.setStyle(table_style)
                    story.append(table)
                    
                    # Statistiche sezione
                    story.append(Spacer(1, 12))
                    stats_text = f"Record in {section['table']}: {len(section_data)}"
                    story.append(Paragraph(stats_text, styles['Normal']))
                    story.append(Spacer(1, 20))
                else:
                    story.append(Paragraph("Nessun dato disponibile per questa sezione", styles['Normal']))
        
        elif table_data:
            # Report singola tabella (backward compatibility)
            # Headers
            headers = list(table_data[0].keys()) if table_data else []
            
            # Prepara dati per la tabella
            pdf_table_data = [headers]
            
            for row in table_data:
                pdf_row = []
                for header in headers:
                    value = row.get(header, '')
                    # Gestisci valori None e lunghi
                    if value is None:
                        value = ''
                    elif isinstance(value, str) and len(value) > 50:
                        value = value[:47] + '...'
                    pdf_row.append(str(value))
                pdf_table_data.append(pdf_row)
            
            # Crea tabella
            table = Table(pdf_table_data)
            
            # Stile tabella
            table_style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ])
            
            # Applica stile alternato per le righe
            for i in range(1, len(pdf_table_data)):
                if i % 2 == 0:
                    table_style.add('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f8f9fa'))
            
            table.setStyle(table_style)
            story.append(table)
            
            # Statistiche
            story.append(Spacer(1, 20))
            stats_text = f"Totale record: {len(table_data)}"
            story.append(Paragraph(stats_text, styles['Normal']))
        
        else:
            story.append(Paragraph("Nessun dato disponibile", styles['Normal']))
        
        # Footer con configurazione
        if template_config.get('showFooter', True):
            story.append(Spacer(1, 30))
            footer_text = f"Report generato da GestMan - {config.get('database', 'Sistema')}"
            story.append(Paragraph(footer_text, styles['Italic']))
        
        # Genera PDF
        doc.build(story)
        
        # Prepara risposta
        buffer.seek(0)
        
        filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except ImportError:
        return jsonify({
            'error': 'Libreria ReportLab non installata. Eseguire: pip install reportlab'
        }), 500
        
    except Exception as e:
        return jsonify({
            'error': f'Errore generazione PDF: {str(e)}'
        }), 500


# ===== DOCUMENT BUILDER ENDPOINTS =====

@bp.route('/templates', methods=['GET'])
def get_templates():
    """Recupera tutti i template salvati"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # Crea tabella se non esiste
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_by TEXT,
                shared INTEGER DEFAULT 0,
                blocks TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            SELECT id, name, created_by, shared, blocks, created_at, updated_at
            FROM document_templates
            ORDER BY updated_at DESC
        """)
        
        templates = []
        for row in cursor.fetchall():
            import json
            blocks_data = json.loads(row[4]) if row[4] else []
            templates.append({
                'id': row[0],
                'name': row[1],
                'created_by': row[2],
                'shared': bool(row[3]),
                'blocks': blocks_data,
                'block_count': len(blocks_data),
                'created_at': row[5],
                'updated_at': row[6]
            })
        
        conn.close()
        return jsonify(templates), 200
        
    except Exception as e:
        return jsonify({'error': f'Errore recupero templates: {str(e)}'}), 500


@bp.route('/templates', methods=['POST'])
def save_template():
    """Salva un nuovo template"""
    try:
        data = request.get_json()
        name = data.get('name')
        blocks = data.get('blocks', [])
        created_by = data.get('created_by', 'admin')
        shared = data.get('shared', False)
        
        if not name:
            return jsonify({'error': 'Nome template richiesto'}), 400
        
        import json
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # Crea tabella se non esiste
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS document_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                created_by TEXT,
                shared INTEGER DEFAULT 0,
                blocks TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO document_templates (name, created_by, shared, blocks)
            VALUES (?, ?, ?, ?)
        """, (name, created_by, 1 if shared else 0, json.dumps(blocks)))
        
        template_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': template_id,
            'name': name,
            'message': 'Template salvato con successo'
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Errore salvataggio template: {str(e)}'}), 500


@bp.route('/templates/<int:template_id>', methods=['PUT'])
def update_template(template_id):
    """Aggiorna un template esistente"""
    try:
        data = request.get_json()
        name = data.get('name')
        blocks = data.get('blocks')
        shared = data.get('shared')
        
        import json
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if name:
            updates.append('name = ?')
            params.append(name)
        
        if blocks is not None:
            updates.append('blocks = ?')
            params.append(json.dumps(blocks))
        
        if shared is not None:
            updates.append('shared = ?')
            params.append(1 if shared else 0)
        
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(template_id)
        
        query = f"UPDATE document_templates SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Template aggiornato con successo'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Errore aggiornamento template: {str(e)}'}), 500


@bp.route('/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Elimina un template"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM document_templates WHERE id = ?', (template_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Template eliminato con successo'}), 200
        
    except Exception as e:
        return jsonify({'error': f'Errore eliminazione template: {str(e)}'}), 500


@bp.route('/preview-document', methods=['POST'])
def preview_document():
    """Genera anteprima del documento basata sui blocchi configurati"""
    try:
        data = request.get_json()
        blocks = data.get('blocks', [])
        
        result = {
            'tables': {},
            'statistics': {}
        }
        
        for block in blocks:
            block_id = block.get('id')
            block_type = block.get('type')
            config = block.get('config', {})
            
            if block_type == 'table':
                # Esegui query per tabella
                database = config.get('database')
                table = config.get('table')
                columns = config.get('columns', [])
                filters = config.get('filters', [])
                order_by = config.get('orderBy', {})
                
                if not database or not table:
                    continue
                
                conn = get_db_connection(database)
                cursor = conn.cursor()
                
                # Costruisci query
                select_cols = ', '.join(columns) if columns else '*'
                query = f"SELECT {select_cols} FROM {table}"
                params = []
                
                # Applica filtri
                if filters:
                    where_conditions = []
                    for filt in filters:
                        field = filt.get('field')
                        operator = filt.get('operator', '=')
                        value = filt.get('value')
                        
                        if field and value:
                            where_conditions.append(f"{field} {operator} ?")
                            params.append(value)
                    
                    if where_conditions:
                        query += " WHERE " + " AND ".join(where_conditions)
                
                # Applica ordinamento
                if order_by.get('field'):
                    direction = order_by.get('direction', 'ASC')
                    query += f" ORDER BY {order_by['field']} {direction}"
                
                # Limita risultati per anteprima
                query += " LIMIT 50"
                
                cursor.execute(query, params)
                rows = [dict(row) for row in cursor.fetchall()]
                conn.close()
                
                result['tables'][block_id] = {
                    'rows': rows,
                    'count': len(rows)
                }
            
            elif block_type == 'statistics':
                # Calcola statistiche
                calculations = config.get('calculations', [])
                stats = {}
                
                for calc in calculations:
                    label = calc.get('label')
                    calc_type = calc.get('type')
                    database = calc.get('database')
                    table = calc.get('table')
                    field = calc.get('field')
                    
                    if not all([database, table, label]):
                        continue
                    
                    conn = get_db_connection(database)
                    cursor = conn.cursor()
                    
                    if calc_type == 'count':
                        query = f"SELECT COUNT(*) as value FROM {table}"
                    elif calc_type in ['sum', 'avg', 'min', 'max']:
                        if not field:
                            continue
                        query = f"SELECT {calc_type.upper()}({field}) as value FROM {table}"
                    else:
                        continue
                    
                    cursor.execute(query)
                    row = cursor.fetchone()
                    stats[label] = row['value'] if row else 0
                    conn.close()
                
                result['statistics'][block_id] = stats
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': f'Errore generazione anteprima: {str(e)}'}), 500


@bp.route('/generate-document', methods=['POST'])
def generate_document():
    """Genera il documento finale PDF dai blocchi configurati"""
    conn = None
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from flask import send_file
        import io
        import json
        
        data = request.get_json()
        blocks = data.get('blocks', [])
        template_vars = data.get('variables', {})
        
        # Buffer per il PDF
        buffer = io.BytesIO()
        
        # Crea documento
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Stili
        styles = getSampleStyleSheet()
        
        # Contenuto del documento
        story = []
        
        # Processa ogni blocco
        for block in blocks:
            block_type = block.get('type')
            config = block.get('config', {})
            
            if block_type == 'title':
                # Titolo
                text = config.get('text', '')
                level = config.get('level', 'h1')
                align = config.get('align', 'left')
                
                # Sostituisci variabili
                for var, value in template_vars.items():
                    text = text.replace(f'{{{{{var}}}}}', str(value))
                
                # Determina stile
                if level == 'h1':
                    style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=24, spaceAfter=20)
                elif level == 'h2':
                    style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=18, spaceAfter=15)
                else:
                    style = ParagraphStyle('H3', parent=styles['Heading3'], fontSize=14, spaceAfter=12)
                
                # Allineamento
                if align == 'center':
                    style.alignment = 1
                elif align == 'right':
                    style.alignment = 2
                
                story.append(Paragraph(text, style))
            
            elif block_type == 'text':
                # Testo
                content = config.get('content', '')
                align = config.get('align', 'left')
                
                # Sostituisci variabili
                for var, value in template_vars.items():
                    content = content.replace(f'{{{{{var}}}}}', str(value))
                
                text_style = ParagraphStyle('Text', parent=styles['Normal'], fontSize=11)
                
                if align == 'center':
                    text_style.alignment = 1
                elif align == 'right':
                    text_style.alignment = 2
                elif align == 'justify':
                    text_style.alignment = 4
                
                story.append(Paragraph(content, text_style))
                story.append(Spacer(1, 12))
            
            elif block_type == 'table':
                # Tabella con dati dal database
                database = config.get('database')
                table_name = config.get('table')
                columns = config.get('columns', [])
                filters = config.get('filters', [])
                order_by = config.get('orderBy', {})
                style_config = config.get('style', {})
                
                if database and table_name:
                    conn = get_db_connection(database)
                    cursor = conn.cursor()
                    
                    # Costruisci query
                    select_cols = ', '.join(columns) if columns else '*'
                    query = f"SELECT {select_cols} FROM {table_name}"
                    params = []
                    
                    # Applica filtri
                    if filters:
                        where_conditions = []
                        for filt in filters:
                            field = filt.get('field')
                            operator = filt.get('operator', '=')
                            value = filt.get('value')
                            
                            if field and value:
                                where_conditions.append(f"{field} {operator} ?")
                                params.append(value)
                        
                        if where_conditions:
                            query += " WHERE " + " AND ".join(where_conditions)
                    
                    # Applica ordinamento
                    if order_by.get('field'):
                        direction = order_by.get('direction', 'ASC')
                        query += f" ORDER BY {order_by['field']} {direction}"
                    
                    cursor.execute(query, params)
                    rows = [dict(row) for row in cursor.fetchall()]
                    conn.close()
                    
                    if rows:
                        # Funzione per formattare valori in modo leggibile
                        def format_value(value):
                            if value is None:
                                return '-'
                            
                            # Se è un JSON/dict, formattalo
                            if isinstance(value, str):
                                # Prova a parsare JSON
                                try:
                                    import json
                                    parsed = json.loads(value)
                                    if isinstance(parsed, dict):
                                        # Mostra solo campi chiave (es: {"nome": "...", "tipo": "..."})
                                        items = []
                                        for k, v in list(parsed.items())[:3]:  # Max 3 campi
                                            items.append(f"{k}: {v}")
                                        result = ", ".join(items)
                                        if len(parsed) > 3:
                                            result += "..."
                                        return result
                                    elif isinstance(parsed, list):
                                        return f"Lista ({len(parsed)} elementi)"
                                except:
                                    pass
                                
                                # Tronca stringhe lunghe
                                if len(value) > 50:
                                    return value[:47] + '...'
                                return value
                            
                            # Numeri
                            if isinstance(value, (int, float)):
                                return str(value)
                            
                            # Altri tipi
                            return str(value)
                        
                        # Prepara dati tabella
                        headers = columns if columns else list(rows[0].keys())
                        table_data = [headers]
                        
                        for row in rows:
                            table_row = []
                            for col in headers:
                                value = row.get(col, '')
                                table_row.append(format_value(value))
                            table_data.append(table_row)
                        
                        # Crea tabella PDF
                        pdf_table = Table(table_data)
                        
                        # Applica stile
                        font_size = style_config.get('fontSize', 9)
                        table_style_list = [
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), font_size + 1),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                            ('FONTSIZE', (0, 1), (-1, -1), font_size),
                            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                        ]
                        
                        if style_config.get('borders', True):
                            table_style_list.append(('GRID', (0, 0), (-1, -1), 1, colors.black))
                        
                        if style_config.get('alternateRows', True):
                            for i in range(1, len(table_data)):
                                if i % 2 == 0:
                                    table_style_list.append(
                                        ('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f8f9fa'))
                                    )
                        
                        pdf_table.setStyle(TableStyle(table_style_list))
                        story.append(pdf_table)
                        story.append(Spacer(1, 20))
            
            elif block_type == 'separator':
                # Separatore
                style_sep = config.get('style', 'solid')
                thickness = config.get('thickness', 1)
                
                # Crea linea separatrice con HTML/Paragraph
                sep_html = f'<para><hr width="100%" size="{thickness}" /></para>'
                story.append(Paragraph(sep_html, styles['Normal']))
                story.append(Spacer(1, 12))
            
            elif block_type == 'pageBreak':
                # Interruzione pagina
                story.append(PageBreak())
        
        # Genera PDF
        doc.build(story)
        buffer.seek(0)
        
        # Determina nome file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        username = data.get('generated_by', 'unknown')
        filename = f"document_{username}_{timestamp}.pdf"
        
        # Salva file fisicamente
        documents_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'documents')
        os.makedirs(documents_dir, exist_ok=True)
        filepath = os.path.join(documents_dir, filename)
        
        pdf_content = buffer.getvalue()
        file_size = len(pdf_content)
        
        with open(filepath, 'wb') as f:
            f.write(pdf_content)
        
        # VALIDAZIONE RIFERIMENTI (Priorità 2) - SOFT MODE per permettere generazione
        metadata = data.get('metadata', {})
        is_valid, errors = db_validators.validate_document_references(
            civico_numero=metadata.get('civico_numero'),
            asset_id=metadata.get('asset_id'),
            generated_by=username,
            strict=False  # Permette generazione documento anche con riferimenti invalidi
        )
        if not is_valid:
            logger.warning(f"[DOCUMENT GENERATE] Riferimenti non validi (soft mode): {errors}")
        else:
            logger.info(f"[DOCUMENT GENERATE] Validazione riferimenti OK")
        
        # PRIORITÀ 4: Estrai related submission/scadenza IDs (opzionali)
        related_submission_ids = metadata.get('related_submission_ids', [])
        related_scadenza_ids = metadata.get('related_scadenza_ids', [])
        
        # Validazione leggera (warning ma non bloccare - come richiesto)
        if related_submission_ids:
            conn_temp = get_db_connection('compilazioni')
            cursor_temp = conn_temp.cursor()
            for sub_id in related_submission_ids:
                cursor_temp.execute("SELECT id FROM form_submissions WHERE id = ?", (sub_id,))
                if not cursor_temp.fetchone():
                    logger.warning(f"[DOCUMENT GENERATE] related_submission_id {sub_id} non trovato (documento generato comunque)")
            conn_temp.close()
        
        if related_scadenza_ids:
            conn_temp = get_db_connection('compilazioni')
            cursor_temp = conn_temp.cursor()
            for scad_id in related_scadenza_ids:
                cursor_temp.execute("SELECT id FROM scadenze_calendario WHERE id = ?", (scad_id,))
                if not cursor_temp.fetchone():
                    logger.warning(f"[DOCUMENT GENERATE] related_scadenza_id {scad_id} non trovato (documento generato comunque)")
            conn_temp.close()
        
        # Inserisci record in document_history
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # INIZIO TRANSAZIONE (Priorità 1)
        cursor.execute('BEGIN TRANSACTION')
        
        cursor.execute("""
            INSERT INTO document_history (
                filename, title, generated_by, civico_numero, asset_id,
                periodo_inizio, periodo_fine, related_type, related_ids,
                template_id, parameters_json, file_size_bytes, notes,
                related_submission_ids, related_scadenza_ids
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            filename,
            metadata.get('title'),
            username,
            metadata.get('civico_numero'),
            metadata.get('asset_id'),
            metadata.get('periodo_inizio'),
            metadata.get('periodo_fine'),
            metadata.get('related_type', 'manual'),
            json.dumps(metadata.get('related_ids', [])) if metadata.get('related_ids') else None,
            metadata.get('template_id'),
            json.dumps({
                'variables': template_vars,
                'blocks_count': len(blocks),
                **metadata.get('extra_params', {})
            }),
            file_size,
            metadata.get('notes'),
            json.dumps(related_submission_ids) if related_submission_ids else None,
            json.dumps(related_scadenza_ids) if related_scadenza_ids else None
        ))
        
        history_id = cursor.lastrowid
        logger.info(f"[DOCUMENT CREATED] ID={history_id} filename={filename} title={metadata.get('title')} civico={metadata.get('civico_numero')} asset={metadata.get('asset_id')} generated_by={username}")
        
        # COMMIT TRANSAZIONE
        conn.commit()
        
        # Restituisci PDF + metadati
        buffer.seek(0)
        return send_file(
            buffer,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except ImportError:
        return jsonify({
            'error': 'Libreria ReportLab non installata. Eseguire: pip install reportlab'
        }), 500
        
    except Exception as e:
        # ROLLBACK in caso di errore
        if conn:
            try:
                conn.rollback()
                print("[DEBUG] Transaction rolled back")
            except:
                pass
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Errore generazione documento',
            'details': str(e)
        }), 500
    finally:
        if conn:
            conn.close()


# =========================================
# ENDPOINTS PER DOCUMENT HISTORY
# =========================================

@bp.route('/history', methods=['GET'])
def get_document_history():
    """
    Ottiene la lista dei documenti generati con filtri opzionali e paginazione
    Query params: civico, from, to, generated_by, related_type, page, limit, sort
    """
    try:
        # PAGINAZIONE (Priorità 3)
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 200)  # Max 200
        offset = (page - 1) * limit
        
        # SORT (colonne permesse per sicurezza)
        sort_param = request.args.get('sort', 'generated_at:desc')
        allowed_columns = ['id', 'filename', 'title', 'generated_at', 'generated_by', 'civico_numero', 'asset_id']
        
        if ':' in sort_param:
            sort_col, sort_dir = sort_param.split(':')
            if sort_col not in allowed_columns:
                sort_col = 'generated_at'
            if sort_dir.upper() not in ['ASC', 'DESC']:
                sort_dir = 'DESC'
        else:
            sort_col = 'generated_at'
            sort_dir = 'DESC'
        
        # Parametri filtro
        civico = request.args.get('civico')
        date_from = request.args.get('from')
        date_to = request.args.get('to')
        generated_by = request.args.get('generated_by')
        related_type = request.args.get('related_type')
        
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # Conteggio totale (per paginazione)
        count_query = "SELECT COUNT(*) FROM document_history WHERE 1=1"
        count_params = []
        
        if civico:
            count_query += " AND civico_numero = ?"
            count_params.append(civico)
        if date_from:
            count_query += " AND generated_at >= ?"
            count_params.append(date_from)
        if date_to:
            count_query += " AND generated_at <= ?"
            count_params.append(date_to)
        if generated_by:
            count_query += " AND generated_by = ?"
            count_params.append(generated_by)
        if related_type:
            count_query += " AND related_type = ?"
            count_params.append(related_type)
        
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()[0]
        
        # Costruisci query dinamica con paginazione
        query = """
            SELECT 
                id, filename, title, generated_at, generated_by,
                civico_numero, asset_id, periodo_inizio, periodo_fine,
                related_type, related_ids, template_id, file_size_bytes, notes
            FROM document_history
            WHERE 1=1
        """
        params = []
        
        if civico:
            query += " AND civico_numero = ?"
            params.append(civico)
        
        if date_from:
            query += " AND generated_at >= ?"
            params.append(date_from)
        
        if date_to:
            query += " AND generated_at <= ?"
            params.append(date_to)
        
        if generated_by:
            query += " AND generated_by = ?"
            params.append(generated_by)
        
        if related_type:
            query += " AND related_type = ?"
            params.append(related_type)
        
        query += f" ORDER BY {sort_col} {sort_dir} LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        conn.close()
        
        documents = [dict(row) for row in rows]
        
        # Parse JSON fields
        import json
        for doc in documents:
            if doc.get('related_ids'):
                try:
                    doc['related_ids'] = json.loads(doc['related_ids'])
                except:
                    pass
            if doc.get('parameters_json'):
                try:
                    doc['parameters'] = json.loads(doc['parameters_json'])
                    del doc['parameters_json']
                except:
                    pass
        
        return jsonify({
            'data': documents,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero storico: {str(e)}'}), 500


@bp.route('/history/<int:history_id>', methods=['GET'])
def get_document_detail(history_id):
    """Ottiene dettaglio singolo documento + link al file se esiste"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM document_history WHERE id = ?
        """, (history_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Documento non trovato'}), 404
        
        doc = dict(row)
        
        # Parse JSON
        import json
        if doc.get('related_ids'):
            try:
                doc['related_ids'] = json.loads(doc['related_ids'])
            except:
                pass
        if doc.get('parameters_json'):
            try:
                doc['parameters'] = json.loads(doc['parameters_json'])
                del doc['parameters_json']
            except:
                pass
        
        # Verifica esistenza file
        documents_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'documents')
        filepath = os.path.join(documents_dir, doc['filename'])
        doc['file_exists'] = os.path.exists(filepath)
        doc['download_url'] = f"/api/docs/download/{history_id}" if doc['file_exists'] else None
        
        return jsonify(doc)
        
    except Exception as e:
        return jsonify({'error': f'Errore recupero documento: {str(e)}'}), 500


@bp.route('/history/by-submission/<int:submission_id>', methods=['GET'])
def get_documents_by_submission(submission_id):
    """Ottiene tutti i documenti collegati a una specifica form submission (PRIORITÀ 4)"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # Cerca documenti dove related_submission_ids contiene submission_id
        # Uso LIKE per cercare nel JSON array (es: "[45,67,89]" contiene "45")
        cursor.execute("""
            SELECT * FROM document_history
            WHERE related_submission_ids LIKE ?
            ORDER BY generated_at DESC
        """, (f'%{submission_id}%',))
        
        rows = cursor.fetchall()
        conn.close()
        
        documents = []
        for row in rows:
            doc = dict(row)
            
            # Parse JSON fields
            import json
            if doc.get('related_submission_ids'):
                try:
                    doc['related_submission_ids'] = json.loads(doc['related_submission_ids'])
                except:
                    pass
            if doc.get('related_scadenza_ids'):
                try:
                    doc['related_scadenza_ids'] = json.loads(doc['related_scadenza_ids'])
                except:
                    pass
            if doc.get('related_ids'):
                try:
                    doc['related_ids'] = json.loads(doc['related_ids'])
                except:
                    pass
            
            documents.append(doc)
        
        return jsonify({
            'submission_id': submission_id,
            'documents': documents,
            'count': len(documents)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero documenti: {str(e)}'}), 500


@bp.route('/download/<int:history_id>', methods=['GET'])
def download_document(history_id):
    """Scarica il PDF di un documento dallo storico"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        cursor.execute("SELECT filename FROM document_history WHERE id = ?", (history_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({'error': 'Documento non trovato'}), 404
        
        filename = row['filename']
        documents_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'documents')
        filepath = os.path.join(documents_dir, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File non trovato sul server'}), 404
        
        from flask import send_file
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({'error': f'Errore download: {str(e)}'}), 500


@bp.route('/history/<int:history_id>', methods=['DELETE'])
def delete_document(history_id):
    """Elimina record storico e file associato"""
    try:
        conn = get_db_connection('compilazioni')
        cursor = conn.cursor()
        
        # Recupera filename prima di eliminare
        cursor.execute("SELECT filename FROM document_history WHERE id = ?", (history_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Documento non trovato'}), 404
        
        filename = row['filename']
        
        # Elimina record
        cursor.execute("DELETE FROM document_history WHERE id = ?", (history_id,))
        conn.commit()
        conn.close()
        
        # Elimina file fisico se esiste
        documents_dir = os.path.join(os.path.dirname(__file__), 'uploads', 'documents')
        filepath = os.path.join(documents_dir, filename)
        
        if os.path.exists(filepath):
            os.remove(filepath)
        
        return jsonify({'success': True, 'message': 'Documento eliminato'})
        
    except Exception as e:
        return jsonify({'error': f'Errore eliminazione: {str(e)}'}), 500


@bp.route('/templates', methods=['GET'])
def get_document_templates():
    """Ottiene i template predefiniti per documenti ricorrenti"""
    try:
        templates_file = os.path.join(os.path.dirname(__file__), 'document_templates.json')
        
        if not os.path.exists(templates_file):
            return jsonify({'templates': []})
        
        import json
        with open(templates_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        return jsonify(data)
        
    except Exception as e:
        return jsonify({'error': f'Errore caricamento template: {str(e)}'}), 500


@bp.route('/templates/<int:template_id>', methods=['GET'])
def get_template_detail(template_id):
    """Ottiene dettaglio di un singolo template"""
    try:
        templates_file = os.path.join(os.path.dirname(__file__), 'document_templates.json')
        
        if not os.path.exists(templates_file):
            return jsonify({'error': 'File template non trovato'}), 404
        
        import json
        with open(templates_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        template = next((t for t in data.get('templates', []) if t['id'] == template_id), None)
        
        if not template:
            return jsonify({'error': 'Template non trovato'}), 404
        
        return jsonify(template)
        
    except Exception as e:
        return jsonify({'error': f'Errore caricamento template: {str(e)}'}), 500


# ============================================================================
# NUOVO SISTEMA: REPORT DINAMICO SEMPLIFICATO
# ============================================================================

@bp.route('/dynamic-report', methods=['POST'])
def dynamic_report():
    """
    Endpoint per generare anteprima dati per Report Dinamico
    
    Body:
    {
        "source": "form_submissions" | "alert" | "scadenze_calendario" | "magazzino" | "assets",
        "filters": [
            {"field": "civico", "operator": "equals", "value": "123"},
            {"field": "data_creazione", "operator": "between", "value": "2026-01-01", "value2": "2026-03-31"}
        ],
        "limit": 20  // Per anteprima
    }
    
    Returns:
    {
        "columns": ["id", "civico", "asset", ...],
        "data": [
            {"id": 1, "civico": "123", ...},
            ...
        ],
        "total": 127  // Totale record senza limit
    }
    """
    try:
        data = request.json
        source = data.get('source')
        filters = data.get('filters', [])
        limit = data.get('limit', 20)
        
        if not source:
            return jsonify({'error': 'Campo source obbligatorio'}), 400
        
        # Determina database e validazione nome tabella
        allowed_sources = {
            'form_submissions': ('compilazioni', 'form_submissions'),
            'alert': ('compilazioni', 'alert'),
            'scadenze_calendario': ('compilazioni', 'scadenze_calendario'),
            'magazzino': ('gestman', 'magazzino'),
            'assets': ('gestman', 'assets')
        }
        
        if source not in allowed_sources:
            return jsonify({'error': f'Fonte dati non valida: {source}'}), 400
        
        db_type, table_name = allowed_sources[source]
        
        # Costruisci query con filtri
        query = f"SELECT * FROM {table_name}"
        params = []
        
        if filters:
            where_clauses = []
            for f in filters:
                field = f.get('field')
                operator = f.get('operator')
                value = f.get('value')
                value2 = f.get('value2')
                
                # SQL injection protection: valida field name
                # TODO: implementare whitelist completa dei campi per tabella
                if not field or not operator:
                    continue
                
                # Costruisci clausola WHERE sicura
                if operator == 'equals':
                    where_clauses.append(f"{field} = ?")
                    params.append(value)
                elif operator == 'not_equals':
                    where_clauses.append(f"{field} != ?")
                    params.append(value)
                elif operator == 'contains':
                    where_clauses.append(f"{field} LIKE ?")
                    params.append(f"%{value}%")
                elif operator == 'not_contains':
                    where_clauses.append(f"{field} NOT LIKE ?")
                    params.append(f"%{value}%")
                elif operator == 'starts_with':
                    where_clauses.append(f"{field} LIKE ?")
                    params.append(f"{value}%")
                elif operator == 'ends_with':
                    where_clauses.append(f"{field} LIKE ?")
                    params.append(f"%{value}")
                elif operator == 'greater_than':
                    where_clauses.append(f"{field} > ?")
                    params.append(value)
                elif operator == 'less_than':
                    where_clauses.append(f"{field} < ?")
                    params.append(value)
                elif operator == 'before':
                    where_clauses.append(f"{field} < ?")
                    params.append(value)
                elif operator == 'after':
                    where_clauses.append(f"{field} > ?")
                    params.append(value)
                elif operator == 'between':
                    where_clauses.append(f"{field} BETWEEN ? AND ?")
                    params.append(value)
                    params.append(value2)
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
        
        # Aggiungi limit per anteprima
        query += f" LIMIT {int(limit)}"
        
        logger.info(f"[DYNAMIC REPORT] Query: {query}, Params: {params}")
        
        # Esegui query
        conn = get_db_connection(db_type)
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        # Estrai nomi colonne
        columns = [description[0] for description in cursor.description] if rows else []
        
        # Converti in dict
        data_list = [dict(row) for row in rows]
        
        # Count totale (senza limit)
        count_query = f"SELECT COUNT(*) as total FROM {table_name}"
        if filters and where_clauses:
            count_query += " WHERE " + " AND ".join(where_clauses)
        
        cursor.execute(count_query, params[:-2] if 'LIMIT' in query else params)
        total = cursor.fetchone()['total']
        
        conn.close()
        
        logger.info(f"[DYNAMIC REPORT] Trovati {len(data_list)} record (totale: {total})")
        
        return jsonify({
            'columns': columns,
            'data': data_list,
            'total': total
        })
        
    except Exception as e:
        logger.error(f"[DYNAMIC REPORT ERROR] {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Errore generazione report: {str(e)}'}), 500


@bp.route('/dynamic-report/pdf', methods=['POST'])
def dynamic_report_pdf():
    """
    Genera PDF da Report Dinamico
    
    TODO: Implementare generazione PDF con ReportLab
    Per ora ritorna stub che può essere completato
    """
    try:
        data = request.json
        source = data.get('source')
        filters = data.get('filters', [])
        
        # TODO: Implementare generazione PDF vera
        # 1. Eseguire query completa (senza limit)
        # 2. Generare PDF con ReportLab
        # 3. Salvare in document_history
        # 4. Ritornare file PDF
        
        return jsonify({
            'error': 'Generazione PDF in sviluppo',
            'message': 'Questa funzionalità sarà completata a breve'
        }), 501  # Not Implemented
        
    except Exception as e:
        logger.error(f"[PDF GENERATION ERROR] {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/dynamic-report/excel', methods=['POST'])
def dynamic_report_excel():
    """
    Esporta Excel da Report Dinamico
    
    TODO: Implementare export Excel con openpyxl o xlsxwriter
    """
    try:
        data = request.json
        source = data.get('source')
        filters = data.get('filters', [])
        
        # TODO: Implementare export Excel vero
        # 1. Eseguire query completa
        # 2. Generare file Excel
        # 3. Ritornare file per download
        
        return jsonify({
            'error': 'Esportazione Excel in sviluppo',
            'message': 'Questa funzionalità sarà completata a breve'
        }), 501  # Not Implemented
        
    except Exception as e:
        logger.error(f"[EXCEL EXPORT ERROR] {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/report-configs', methods=['POST'])
def save_report_config():
    """
    Salva configurazione report per riutilizzo futuro
    
    Body:
    {
        "name": "Report Mensile Non Conformità",
        "source": "alert",
        "filters": [...]
    }
    
    TODO: Implementare salvataggio in database
    Per ora ritorna successo ma non salva realmente
    """
    try:
        data = request.json
        name = data.get('name')
        source = data.get('source')
        filters = data.get('filters')
        username = request.headers.get('X-Username', 'unknown')
        
        if not name or not source:
            return jsonify({'error': 'Nome e fonte obbligatori'}), 400
        
        # TODO: Salvare in tabella report_configurations
        # CREATE TABLE IF NOT EXISTS report_configurations (
        #     id INTEGER PRIMARY KEY AUTOINCREMENT,
        #     name TEXT NOT NULL,
        #     source TEXT NOT NULL,
        #     filters TEXT,  -- JSON
        #     created_by TEXT,
        #     created_at TEXT DEFAULT CURRENT_TIMESTAMP
        # )
        
        logger.info(f"[REPORT CONFIG] Configurazione '{name}' salvata da {username}")
        
        return jsonify({
            'success': True,
            'message': f'Configurazione "{name}" salvata con successo',
            'note': 'Funzionalità in sviluppo - non ancora persistente'
        })
        
    except Exception as e:
        logger.error(f"[SAVE CONFIG ERROR] {e}")
        return jsonify({'error': str(e)}), 500

