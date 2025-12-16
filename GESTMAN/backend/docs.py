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