# coding: utf-8
from flask import Blueprint, request, jsonify
import sqlite3
import os
import datetime
import traceback

bp = Blueprint('magazzino', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

# --- CREAZIONE TABELLE MAGAZZINO ---
def init_magazzino_db():
    """Inizializza le tabelle del magazzino nel database compilazioni.db"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Tabella principale ricambi magazzino
    c.execute('''
    CREATE TABLE IF NOT EXISTS magazzino_ricambi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_tipo TEXT NOT NULL,
        id_ricambio TEXT NOT NULL,
        costruttore TEXT,
        modello TEXT,
        codice_produttore TEXT,
        fornitore TEXT,
        unita_misura TEXT DEFAULT 'pz',
        quantita_disponibile INTEGER DEFAULT 0,
        quantita_minima INTEGER DEFAULT 1,
        prezzo_unitario REAL DEFAULT 0.0,
        note TEXT,
        attivo BOOLEAN DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(asset_tipo, id_ricambio)
    )
    ''')
    
    # Tabella storico movimentazioni magazzino
    c.execute('''
    CREATE TABLE IF NOT EXISTS magazzino_movimenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ricambio_id INTEGER NOT NULL,
        tipo_movimento TEXT NOT NULL,
        quantita INTEGER NOT NULL,
        quantita_precedente INTEGER NOT NULL,
        quantita_attuale INTEGER NOT NULL,
        operatore TEXT NOT NULL,
        motivo TEXT,
        data_movimento TEXT NOT NULL,
        created_at TEXT,
        FOREIGN KEY (ricambio_id) REFERENCES magazzino_ricambi(id)
    )
    ''')
    
    # Indici per ottimizzare le query
    c.execute('CREATE INDEX IF NOT EXISTS idx_magazzino_asset_tipo ON magazzino_ricambi(asset_tipo)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_magazzino_attivo ON magazzino_ricambi(attivo)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_movimenti_ricambio ON magazzino_movimenti(ricambio_id)')
    c.execute('CREATE INDEX IF NOT EXISTS idx_movimenti_data ON magazzino_movimenti(data_movimento)')
    
    conn.commit()
    conn.close()
    print("[DEBUG] Database magazzino inizializzato")

# --- API RICAMBI ---

@bp.route('/ricambi', methods=['GET'])
def get_ricambi():
    """Ottiene tutti i ricambi del magazzino con filtri opzionali"""
    try:
        asset_tipo = request.args.get('asset_tipo')
        attivi_only = request.args.get('attivi_only', 'true').lower() == 'true'  # Mantenuto per compatibilità, ma ignorato
        scorte_basse = request.args.get('scorte_basse', 'false').lower() == 'true'
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Query semplificata: tutti i ricambi sono "attivi" dato che quelli eliminati non esistono più
        query = """
            SELECT id, asset_tipo, id_ricambio, costruttore, modello, codice_produttore,
                   fornitore, unita_misura, quantita_disponibile, quantita_minima,
                   prezzo_unitario, note, attivo, created_at, updated_at
            FROM magazzino_ricambi
            WHERE 1=1
        """
        params = []
        
        if asset_tipo:
            query += " AND asset_tipo = ?"
            params.append(asset_tipo)
            
        # Rimosso il filtro attivi_only dato che eliminiamo definitivamente i ricambi
            
        if scorte_basse:
            query += " AND quantita_disponibile <= quantita_minima"
        
        query += " ORDER BY asset_tipo, id_ricambio"
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        ricambi = []
        for row in rows:
            ricambio = {
                'id': row[0],
                'asset_tipo': row[1],
                'id_ricambio': row[2],
                'costruttore': row[3],
                'modello': row[4],
                'codice_produttore': row[5],
                'fornitore': row[6],
                'unita_misura': row[7],
                'quantita_disponibile': row[8],
                'quantita_minima': row[9],
                'prezzo_unitario': row[10],
                'note': row[11],
                'attivo': bool(row[12]),
                'created_at': row[13],
                'updated_at': row[14],
                'scorta_bassa': row[8] <= row[9]  # Flag per evidenziare scorte basse
            }
            ricambi.append(ricambio)
        
        print(f"[DEBUG] Trovati {len(ricambi)} ricambi per asset_tipo={asset_tipo}")
        return jsonify({'ricambi': ricambi})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET RICAMBI] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nel recupero ricambi'}), 500

@bp.route('/ricambi', methods=['POST'])
def add_ricambio():
    """Aggiunge un nuovo ricambio al magazzino"""
    try:
        data = request.get_json()
        
        # Campi obbligatori
        required_fields = ['asset_tipo', 'id_ricambio']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo {field} obbligatorio'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che non esista già un ricambio con stesso asset_tipo e id_ricambio
        c.execute("""
            SELECT COUNT(*) FROM magazzino_ricambi 
            WHERE asset_tipo = ? AND id_ricambio = ?
        """, (data['asset_tipo'], data['id_ricambio']))
        
        if c.fetchone()[0] > 0:
            conn.close()
            return jsonify({'error': 'Ricambio già esistente per questo tipo di asset'}), 400
        
        # Inserisci nuovo ricambio
        now = datetime.datetime.now().isoformat()
        c.execute("""
            INSERT INTO magazzino_ricambi 
            (asset_tipo, id_ricambio, costruttore, modello, codice_produttore, 
             fornitore, unita_misura, quantita_disponibile, quantita_minima, 
             prezzo_unitario, note, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data['asset_tipo'],
            data['id_ricambio'],
            data.get('costruttore', ''),
            data.get('modello', ''),
            data.get('codice_produttore', ''),
            data.get('fornitore', ''),
            data.get('unita_misura', 'pz'),
            int(data.get('quantita_disponibile', 0)),
            int(data.get('quantita_minima', 1)),
            float(data.get('prezzo_unitario', 0.0)),
            data.get('note', ''),
            now,
            now
        ))
        
        ricambio_id = c.lastrowid
        
        # Registra movimento iniziale se c'è quantità
        quantita = int(data.get('quantita_disponibile', 0))
        if quantita > 0:
            c.execute("""
                INSERT INTO magazzino_movimenti
                (ricambio_id, tipo_movimento, quantita, quantita_precedente, 
                 quantita_attuale, operatore, motivo, data_movimento, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ricambio_id,
                'carico_iniziale',
                quantita,
                0,
                quantita,
                'SISTEMA',
                'Carico iniziale ricambio',
                now,
                now
            ))
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Creato nuovo ricambio ID: {ricambio_id}")
        return jsonify({'ok': True, 'ricambio_id': ricambio_id})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE ADD RICAMBIO] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nell\'inserimento ricambio'}), 500

@bp.route('/ricambi/<int:ricambio_id>', methods=['PUT'])
def update_ricambio(ricambio_id):
    """Aggiorna un ricambio esistente"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che il ricambio esista
        c.execute("SELECT quantita_disponibile FROM magazzino_ricambi WHERE id = ?", (ricambio_id,))
        ricambio_esistente = c.fetchone()
        if not ricambio_esistente:
            conn.close()
            return jsonify({'error': 'Ricambio non trovato'}), 404
        
        # Prepara i campi da aggiornare
        updates = []
        params = []
        
        campos_aggiornabili = [
            'costruttore', 'modello', 'codice_produttore', 'fornitore', 
            'unita_misura', 'quantita_minima', 'prezzo_unitario', 'note'
        ]
        
        for campo in campos_aggiornabili:
            if campo in data:
                updates.append(f"{campo} = ?")
                if campo in ['quantita_minima']:
                    params.append(int(data[campo]))
                elif campo == 'prezzo_unitario':
                    params.append(float(data[campo]))
                else:
                    params.append(data[campo])
        
        if not updates:
            conn.close()
            return jsonify({'error': 'Nessun campo da aggiornare'}), 400
        
        updates.append("updated_at = ?")
        params.append(datetime.datetime.now().isoformat())
        params.append(ricambio_id)
        
        c.execute(f"""
            UPDATE magazzino_ricambi 
            SET {', '.join(updates)}
            WHERE id = ?
        """, params)
        
        conn.commit()
        conn.close()
        
        return jsonify({'ok': True, 'message': 'Ricambio aggiornato con successo'})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE UPDATE RICAMBIO] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nell\'aggiornamento ricambio'}), 500

@bp.route('/ricambi/<int:ricambio_id>/quantita', methods=['PATCH'])
def update_quantita_ricambio(ricambio_id):
    """Aggiorna la quantità di un ricambio con registrazione movimento"""
    try:
        data = request.get_json()
        
        required_fields = ['operazione', 'quantita', 'operatore']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Campo {field} obbligatorio'}), 400
        
        operazione = data['operazione']  # 'carico', 'scarico', 'correzione'
        quantita = int(data['quantita'])
        operatore = data['operatore']
        motivo = data.get('motivo', '')
        
        if operazione not in ['carico', 'scarico', 'correzione']:
            return jsonify({'error': 'Operazione non valida'}), 400
        
        if quantita <= 0:
            return jsonify({'error': 'La quantità deve essere positiva'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Ottieni la quantità attuale
        c.execute("SELECT quantita_disponibile FROM magazzino_ricambi WHERE id = ?", (ricambio_id,))
        result = c.fetchone()
        if not result:
            conn.close()
            return jsonify({'error': 'Ricambio non trovato'}), 404
        
        quantita_precedente = result[0]
        
        # Calcola nuova quantità
        if operazione == 'carico':
            quantita_attuale = quantita_precedente + quantita
            tipo_movimento = 'carico'
        elif operazione == 'scarico':
            quantita_attuale = quantita_precedente - quantita
            if quantita_attuale < 0:
                conn.close()
                return jsonify({'error': 'Quantità insufficiente in magazzino'}), 400
            tipo_movimento = 'scarico'
        else:  # correzione
            quantita_attuale = quantita
            tipo_movimento = 'correzione'
            quantita = quantita_attuale - quantita_precedente  # Delta per il movimento
        
        now = datetime.datetime.now().isoformat()
        
        # Aggiorna quantità ricambio
        c.execute("""
            UPDATE magazzino_ricambi 
            SET quantita_disponibile = ?, updated_at = ?
            WHERE id = ?
        """, (quantita_attuale, now, ricambio_id))
        
        # Registra movimento
        c.execute("""
            INSERT INTO magazzino_movimenti
            (ricambio_id, tipo_movimento, quantita, quantita_precedente, 
             quantita_attuale, operatore, motivo, data_movimento, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ricambio_id,
            tipo_movimento,
            quantita,
            quantita_precedente,
            quantita_attuale,
            operatore,
            motivo,
            now,
            now
        ))
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Aggiornata quantità ricambio {ricambio_id}: {quantita_precedente} -> {quantita_attuale}")
        return jsonify({
            'ok': True,
            'quantita_precedente': quantita_precedente,
            'quantita_attuale': quantita_attuale,
            'message': f'Quantità aggiornata: {quantita_precedente} -> {quantita_attuale}'
        })
        
    except Exception as e:
        print(f"[DEBUG][ERRORE UPDATE QUANTITA] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nell\'aggiornamento quantità'}), 500

@bp.route('/ricambi/<int:ricambio_id>', methods=['DELETE'])
def delete_ricambio(ricambio_id):
    """Elimina definitivamente un ricambio dal database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che il ricambio esista
        c.execute("SELECT id, id_ricambio FROM magazzino_ricambi WHERE id = ?", (ricambio_id,))
        ricambio = c.fetchone()
        if not ricambio:
            conn.close()
            return jsonify({'error': 'Ricambio non trovato'}), 404
        
        ricambio_nome = ricambio[1]  # id_ricambio per il messaggio
        
        # Elimina prima i movimenti associati (per integrità referenziale)
        c.execute("DELETE FROM magazzino_movimenti WHERE ricambio_id = ?", (ricambio_id,))
        movimenti_eliminati = c.rowcount
        
        # Elimina il ricambio definitivamente
        c.execute("DELETE FROM magazzino_ricambi WHERE id = ?", (ricambio_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Errore nell\'eliminazione del ricambio'}), 500
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Eliminato definitivamente ricambio ID: {ricambio_id} ({ricambio_nome}) e {movimenti_eliminati} movimenti associati")
        return jsonify({
            'ok': True, 
            'message': f'Ricambio "{ricambio_nome}" eliminato definitivamente dal database'
        })
        
    except Exception as e:
        print(f"[DEBUG][ERRORE DELETE RICAMBIO] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nell\'eliminazione ricambio'}), 500

# --- API MOVIMENTI ---

@bp.route('/movimenti/<int:ricambio_id>', methods=['GET'])
def get_movimenti_ricambio(ricambio_id):
    """Ottiene lo storico movimenti di un ricambio"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("""
            SELECT m.id, m.tipo_movimento, m.quantita, m.quantita_precedente,
                   m.quantita_attuale, m.operatore, m.motivo, m.data_movimento,
                   r.id_ricambio, r.asset_tipo
            FROM magazzino_movimenti m
            JOIN magazzino_ricambi r ON m.ricambio_id = r.id
            WHERE m.ricambio_id = ?
            ORDER BY m.data_movimento DESC
        """, (ricambio_id,))
        
        rows = c.fetchall()
        conn.close()
        
        movimenti = []
        for row in rows:
            movimento = {
                'id': row[0],
                'tipo_movimento': row[1],
                'quantita': row[2],
                'quantita_precedente': row[3],
                'quantita_attuale': row[4],
                'operatore': row[5],
                'motivo': row[6],
                'data_movimento': row[7],
                'id_ricambio': row[8],
                'asset_tipo': row[9]
            }
            movimenti.append(movimento)
        
        return jsonify({'movimenti': movimenti})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET MOVIMENTI] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nel recupero movimenti'}), 500

# --- API STATISTICHE ---

@bp.route('/statistiche', methods=['GET'])
def get_statistiche_magazzino():
    """Ottiene statistiche del magazzino"""
    try:
        asset_tipo = request.args.get('asset_tipo')
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Statistiche generali
        stats = {}
        
        # Query base per le statistiche (rimosso filtro attivi dato che eliminiamo definitivamente)
        where_clause = "WHERE 1=1"
        params = []
        
        if asset_tipo:
            where_clause += " AND asset_tipo = ?"
            params.append(asset_tipo)
        
        # Totale ricambi
        c.execute(f"SELECT COUNT(*) FROM magazzino_ricambi {where_clause}", params)
        stats['totale_ricambi'] = c.fetchone()[0]
        
        # Ricambi con scorte basse
        c.execute(f"""
            SELECT COUNT(*) FROM magazzino_ricambi 
            {where_clause} AND quantita_disponibile <= quantita_minima
        """, params)
        stats['scorte_basse'] = c.fetchone()[0]
        
        # Valore totale magazzino
        c.execute(f"""
            SELECT COALESCE(SUM(quantita_disponibile * prezzo_unitario), 0) 
            FROM magazzino_ricambi {where_clause}
        """, params)
        stats['valore_totale'] = round(c.fetchone()[0], 2)
        
        # Ricambi per asset tipo (rimosso filtro attivi)
        c.execute("""
            SELECT asset_tipo, COUNT(*), SUM(quantita_disponibile)
            FROM magazzino_ricambi 
            WHERE 1=1
            GROUP BY asset_tipo
            ORDER BY asset_tipo
        """)
        
        per_asset = []
        for row in c.fetchall():
            per_asset.append({
                'asset_tipo': row[0],
                'num_ricambi': row[1],
                'quantita_totale': row[2]
            })
        
        stats['per_asset_tipo'] = per_asset
        
        conn.close()
        
        return jsonify({'statistiche': stats})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET STATISTICHE] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nel recupero statistiche'}), 500

# --- API ASSET TYPES ---

@bp.route('/asset-types', methods=['GET'])
def get_asset_types_magazzino():
    """Ottiene tutti i tipi di asset dal database principale"""
    try:
        # Connessione al database principale gestman.db
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        c = conn.cursor()
        
        # Estrae i tipi di asset dalla tabella assets
        c.execute("SELECT DISTINCT tipo FROM assets WHERE tipo IS NOT NULL ORDER BY tipo")
        rows = c.fetchall()
        conn.close()
        
        asset_types = [row[0] for row in rows if row[0].strip()]
        return jsonify({'asset_types': asset_types})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET ASSET TYPES MAGAZZINO] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nel recupero tipi asset'}), 500

# --- API VALIDAZIONE E INFO RICAMBI ---

@bp.route('/ricambi/validate', methods=['POST'])
def validate_ricambi_ids():
    """Valida una lista di ID ricambi e restituisce info per tooltip"""
    try:
        data = request.get_json()
        ids_to_check = data.get('ids', [])
        
        if not ids_to_check:
            return jsonify({'ricambi_info': {}})
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Crea placeholder per la query IN
        placeholders = ','.join(['?' for _ in ids_to_check])
        
        c.execute(f"""
            SELECT id_ricambio, asset_tipo, costruttore, fornitore, 
                   quantita_disponibile, quantita_minima, unita_misura, prezzo_unitario
            FROM magazzino_ricambi
            WHERE id_ricambio IN ({placeholders})
        """, ids_to_check)
        
        rows = c.fetchall()
        conn.close()
        
        # Crea dizionario con info ricambi
        ricambi_info = {}
        for row in rows:
            id_ricambio = row[0]
            ricambi_info[id_ricambio] = {
                'asset_tipo': row[1],
                'costruttore': row[2],
                'fornitore': row[3],
                'quantita_disponibile': row[4],
                'quantita_minima': row[5],
                'unita_misura': row[6],
                'prezzo_unitario': row[7],
                'scorta_bassa': row[4] <= row[5]
            }
        
        print(f"[DEBUG] Validati {len(ricambi_info)} ricambi su {len(ids_to_check)} richiesti")
        return jsonify({'ricambi_info': ricambi_info})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE VALIDATE RICAMBI] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nella validazione ricambi'}), 500

@bp.route('/ricambi/all-ids', methods=['GET'])
def get_all_ricambi_ids():
    """Ottiene tutti gli ID ricambi per cache client-side"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("SELECT id_ricambio FROM magazzino_ricambi ORDER BY id_ricambio")
        rows = c.fetchall()
        conn.close()
        
        ids = [row[0] for row in rows]
        return jsonify({'ricambi_ids': ids})
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET ALL IDS] {e}")
        traceback.print_exc()
        return jsonify({'error': 'Errore nel recupero ID ricambi'}), 500

# --- INIZIALIZZAZIONE ---
if __name__ == '__main__':
    init_magazzino_db()
else:
    # Inizializza quando il modulo viene importato
    init_magazzino_db()