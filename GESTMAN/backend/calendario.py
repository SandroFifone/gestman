# coding: utf-8
from flask import Blueprint, request, jsonify
import sqlite3
import os
import datetime
import json
import traceback
from telegram_manager import send_alert_to_telegram

# Prova a importare dateutil, con fallback se non disponibile
try:
    from dateutil.relativedelta import relativedelta
    HAS_DATEUTIL = True
except ImportError:
    HAS_DATEUTIL = False
    relativedelta = None

bp = Blueprint('calendario', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'compilazioni.db')

# --- CREAZIONE TABELLE CALENDARIO ---
def init_calendario_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Tabella per le tipologie di manutenzione per asset
    c.execute('''
    CREATE TABLE IF NOT EXISTS manutenzione_tipologie (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_tipo TEXT NOT NULL,
        nome_manutenzione TEXT NOT NULL,
        descrizione TEXT,
        frequenza_mesi INTEGER NOT NULL,
        giorni_preavviso INTEGER DEFAULT 7,
        attiva BOOLEAN DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
    )
    ''')
    
    # Tabella per le scadenze programmate
    c.execute('''
    CREATE TABLE IF NOT EXISTS scadenze_calendario (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manutenzione_id INTEGER NOT NULL,
        civico TEXT NOT NULL,
        asset TEXT NOT NULL,
        asset_tipo TEXT NOT NULL,
        data_scadenza TEXT NOT NULL,
        stato TEXT DEFAULT 'programmata',
        data_completamento TEXT,
        operatore_completamento TEXT,
        note_completamento TEXT,
        data_prossima_scadenza TEXT,
        created_at TEXT,
        updated_at TEXT,
        checklist_voce_id INTEGER,
        frequenza_tipo TEXT,
        giorni_preavviso INTEGER DEFAULT 7,
        nome_manutenzione TEXT,
        FOREIGN KEY (manutenzione_id) REFERENCES manutenzione_tipologie(id)
    )
    ''')
    
    # Tabella template checklist per tipologie di manutenzione
    c.execute('''
    CREATE TABLE IF NOT EXISTS manutenzione_checklist_template (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        manutenzione_id INTEGER NOT NULL,
        voce_checklist TEXT NOT NULL,
        codice_voce TEXT NOT NULL,
        ordine_visualizzazione INTEGER DEFAULT 0,
        obbligatoria BOOLEAN DEFAULT 1,
        created_at TEXT,
        FOREIGN KEY (manutenzione_id) REFERENCES manutenzione_tipologie(id)
    )
    ''')
    
    # Tabella per le checklist dinamiche SOLO PER MANUTENZIONI PROGRAMMATE (NON per controlli ordinari)
    c.execute('''
    CREATE TABLE IF NOT EXISTS manutenzione_programmata_checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_tipo TEXT NOT NULL,
        nome_voce TEXT NOT NULL,
        descrizione TEXT,
        ordine_visualizzazione INTEGER DEFAULT 0,
        attiva BOOLEAN DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
    )
    ''')
    
    # Tabella per i risultati delle checklist completate
    c.execute('''
    CREATE TABLE IF NOT EXISTS manutenzione_checklist_risultati (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scadenza_id INTEGER NOT NULL,
        codice_voce TEXT NOT NULL,
        esito TEXT NOT NULL,
        note_voce TEXT,
        created_at TEXT,
        FOREIGN KEY (scadenza_id) REFERENCES scadenze_calendario(id)
    )
    ''')
    
    # Tabella per lo storico delle esecuzioni delle scadenze
    c.execute('''
    CREATE TABLE IF NOT EXISTS scadenze_storico_esecuzioni (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        civico TEXT NOT NULL,
        asset TEXT NOT NULL,
        asset_tipo TEXT NOT NULL,
        checklist_voce_id INTEGER NOT NULL,
        nome_voce TEXT NOT NULL,
        data_scadenza_originale TEXT NOT NULL,
        data_esecuzione TEXT NOT NULL,
        operatore_esecuzione TEXT NOT NULL,
        note_esecuzione TEXT,
        esito TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (checklist_voce_id) REFERENCES manutenzione_programmata_checklist(id)
    )
    ''')
    
    # Inserimento dati iniziali per le frese (se non esistono già)
    c.execute("SELECT COUNT(*) FROM manutenzione_tipologie WHERE asset_tipo = 'fresa'")
    if c.fetchone()[0] == 0:
        manutenzioni_frese = [
            ('fresa', 'Cambio olio centralina idraulica', 'Sostituzione completa olio centralina idraulica', 12, 7),
            ('fresa', 'Cambio filtri lubrorefrigerante', 'Sostituzione filtri del circuito lubrorefrigerante', 6, 5),
            ('fresa', 'Verifica sistema elettrico', 'Controllo completo quadro elettrico e cablaggi', 12, 10),
            ('fresa', 'Taratura mandrino', 'Controllo e taratura precisione mandrino', 6, 7),
            ('fresa', 'Sostituzione grasso guide lineari', 'Pulizia e ingrassaggio guide lineari', 4, 5),
        ]
        
        for tipologia in manutenzioni_frese:
            c.execute("""
                INSERT INTO manutenzione_tipologie 
                (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, tipologia + (datetime.datetime.now().isoformat(),))
        
        print("[DEBUG] Inserite tipologie di manutenzione iniziali per frese")

    # Inserimento dati iniziali per Frese (con F maiuscola)
    c.execute("SELECT COUNT(*) FROM manutenzione_tipologie WHERE asset_tipo = 'Frese'")
    if c.fetchone()[0] == 0:
        manutenzioni_frese_caps = [
            ('Frese', 'Manutenzione Programmata Mensile', 'Controllo generale e manutenzione ordinaria', 1, 7),
            ('Frese', 'Manutenzione Trimestrale', 'Controllo approfondito e sostituzioni programmate', 3, 10),
            ('Frese', 'Manutenzione Semestrale', 'Controllo completo sistema e componenti critici', 6, 14),
        ]
        
        for tipologia in manutenzioni_frese_caps:
            c.execute("""
                INSERT INTO manutenzione_tipologie 
                (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, tipologia + (datetime.datetime.now().isoformat(),))
        
        print("[DEBUG] Inserite tipologie di manutenzione iniziali per Frese")

    # Inserimento dati iniziali per Scaffalature
    c.execute("SELECT COUNT(*) FROM manutenzione_tipologie WHERE asset_tipo = 'Scaffalature'")
    if c.fetchone()[0] == 0:
        manutenzioni_scaffalature = [
            ('Scaffalature', 'Ispezione Strutturale', 'Controllo integrità struttura e fissaggi', 6, 7),
            ('Scaffalature', 'Controllo Sicurezza', 'Verifica conformità normative sicurezza', 12, 14),
            ('Scaffalature', 'Manutenzione Preventiva', 'Controllo e manutenzione generale', 3, 7),
        ]
        
        for tipologia in manutenzioni_scaffalature:
            c.execute("""
                INSERT INTO manutenzione_tipologie 
                (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, tipologia + (datetime.datetime.now().isoformat(),))
        
        print("[DEBUG] Inserite tipologie di manutenzione iniziali per Scaffalature")

    # Inserimento dati iniziali per asset generici
    c.execute("SELECT COUNT(*) FROM manutenzione_tipologie WHERE asset_tipo = 'Generico'")
    if c.fetchone()[0] == 0:
        manutenzioni_generiche = [
            ('Generico', 'Controllo Generale', 'Ispezione e controllo generale asset', 3, 7),
            ('Generico', 'Manutenzione Ordinaria', 'Manutenzione ordinaria programmata', 6, 10),
        ]
        
        for tipologia in manutenzioni_generiche:
            c.execute("""
                INSERT INTO manutenzione_tipologie 
                (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, tipologia + (datetime.datetime.now().isoformat(),))
        
        print("[DEBUG] Inserite tipologie di manutenzione iniziali per asset generici")
    
    conn.commit()
    
    # Inizializza voci frese se non esistono
    init_frese_checklist(conn)
    
    conn.close()

def init_frese_checklist(conn):
    """Inizializza le voci checklist per le frese se non esistono"""
    c = conn.cursor()
    
    # Voci per manutenzione programmata frese
    frese_voci = [
        ('ingrassaggio_asse_b', 'Ingrassaggio asse B'),
        ('controllo_pulizia_canali_ventilazione_motori', 'Controllo e pulizia canali di ventilazione Motori'),
        ('smontaggio_pulizia_evacuatore_trucioli', 'Smontaggio e pulizia evacuatore trucioli'),
        ('pulizia_vasca_refrigerante', 'Pulizia vasca refrigerante'),
        ('controllo_filtro_lubrorefrigerante', 'Controllo filtro lubrorefrigerante'),
        ('controllo_stato_connettori_cavi', 'Controllo stato connettori e cavi'),
        ('rumori_vibrazioni_viti_sfere_assi', 'Rumori e vibrazioni viti a sfere assi'),
        ('rumori_vibrazioni_temperature_motori', 'Rumori vibrazioni e temperature motori'),
        ('livellamento_macchina', 'Livellamento macchina'),
        ('verifica_cono_mandrino_presa_utensile', 'Verifica cono mandrino e presa utensile'),
        ('controllo_utenze_idrauliche_pneumatiche', 'Controllo utenze idrauliche e pneumatiche'),
        ('perpendicolarita_mandrino', 'Perpendicolarità mandrino'),
        ('verifica_lubrificazione_guide', 'Verifica lubrificazione guide'),
        ('sostituzione_olio_centraline_idrauliche', 'Sostituzione olio centraline idrauliche'),
        ('pulizia_viti_sfere_assi', 'Pulizia viti a sfere assi'),
        ('pulizia_guide_assi', 'Pulizia guide assi'),
        ('controllo_cinghie_assi_mandrino', 'Controllo cinghie assi e mandrino'),
        ('sostituzione_liquido_refrigerante_testa', 'Sostituzione liquido refrigerante testa')
    ]
    
    # Controlla se esistono già tipologie per frese
    c.execute("SELECT id FROM manutenzione_tipologie WHERE asset_tipo = 'Frese' LIMIT 1")
    if not c.fetchone():
        # Crea tipologia di manutenzione programmata per frese
        c.execute("""
            INSERT INTO manutenzione_tipologie 
            (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            'Frese', 
            'Manutenzione Programmata Completa',
            'Manutenzione programmata con checklist completa per frese',
            1,  # Mensile di default
            7,  # 7 giorni di preavviso
            datetime.datetime.now().isoformat()
        ))
        
        manutenzione_id = c.lastrowid
        
        # Inserisci tutte le voci checklist
        for i, (codice, descrizione) in enumerate(frese_voci):
            c.execute("""
                INSERT INTO manutenzione_checklist_template 
                (manutenzione_id, voce_checklist, codice_voce, ordine_visualizzazione, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                manutenzione_id,
                descrizione,
                codice,
                i + 1,
                datetime.datetime.now().isoformat()
            ))
        
        print(f"[DEBUG] Inizializzate {len(frese_voci)} voci checklist per frese")

def init_asset_checklist():
    """Inizializza le checklist per tipo di asset nella nuova tabella"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # La tabella asset_checklist_template sarà popolata tramite interfaccia
    # Non più inizializzazione automatica delle voci
    
    conn.commit()
    conn.close()

# --- ENDPOINT PER FORM DINAMICI ---
@bp.route('/form-scadenza/<int:scadenza_id>', methods=['GET'])
def get_form_scadenza(scadenza_id):
    """Genera form dinamico per una scadenza specifica - supporta gruppi di scadenze"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Prima ottieni i dettagli base della scadenza
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza, 
                   s.manutenzione_id, s.checklist_voce_id, s.frequenza_tipo, c.nome_voce
            FROM scadenze_calendario s
            JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            WHERE s.id = ?
        """, (scadenza_id,))
        
        scadenza_row = c.fetchone()
        if not scadenza_row:
            return jsonify({'error': 'Scadenza non trovata'}), 404
        
        scadenza_id, civico, asset, asset_tipo, data_scadenza, manutenzione_id, checklist_voce_id, frequenza_tipo, nome_voce = scadenza_row
        
        # Verifica se ci sono altre scadenze dello stesso asset nella stessa data (gruppo)
        c.execute("""
            SELECT s.id, s.checklist_voce_id, s.frequenza_tipo, s.giorni_preavviso,
                   COALESCE(mpc.nome_voce, mt.nome_manutenzione) as nome_voce,
                   COALESCE(mpc.descrizione, mt.descrizione) as descrizione_voce
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist mpc ON s.checklist_voce_id = mpc.id
            LEFT JOIN manutenzione_tipologie mt ON s.manutenzione_id = mt.id
            WHERE s.civico = ? AND s.asset = ? AND s.data_scadenza = ? AND s.stato = 'programmata'
            ORDER BY COALESCE(mpc.nome_voce, mt.nome_manutenzione)
        """, (civico, asset, data_scadenza))
        
        scadenze_gruppo = c.fetchall()
        
        if len(scadenze_gruppo) > 1:
            # GRUPPO DI SCADENZE: crea form combinato
            nome_manutenzione = f"Manutenzione {asset_tipo} ({len(scadenze_gruppo)} voci)"
            voci_nomi = [s[4] for s in scadenze_gruppo[:3]]
            if len(scadenze_gruppo) > 3:
                voci_nomi.append(f"... (+{len(scadenze_gruppo)-3} altre)")
            descrizione = f"Controlli programmati: {', '.join(voci_nomi)}"
            
            checklist_items = []
            for i, (s_id, voce_id, freq_tipo, giorni_prev, nome_voce, desc_voce) in enumerate(scadenze_gruppo):
                checklist_items.append({
                    'scadenza_id': s_id,  # ID della scadenza individuale
                    'codice': f'ITEM_{voce_id or s_id}',
                    'voce': nome_voce or f"Controllo {i+1}",
                    'descrizione': desc_voce,
                    'frequenza_tipo': freq_tipo,
                    'giorni_preavviso': giorni_prev,
                    'obbligatoria': True,
                    'ordine': i + 1
                })
        
        elif manutenzione_id and manutenzione_id > 0:
            # Formato VECCHIO: usa manutenzione_tipologie
            c.execute("""
                SELECT nome_manutenzione, descrizione
                FROM manutenzione_tipologie
                WHERE id = ?
            """, (manutenzione_id,))
            
            manutenzione_info = c.fetchone()
            if not manutenzione_info:
                return jsonify({'error': 'Tipologia manutenzione non trovata'}), 404
            
            nome_manutenzione, descrizione = manutenzione_info
            
            # Ottieni checklist template per il vecchio formato
            c.execute("""
                SELECT codice_voce, voce_checklist, obbligatoria, ordine_visualizzazione
                FROM manutenzione_checklist_template
                WHERE manutenzione_id = ?
                ORDER BY ordine_visualizzazione
            """, (manutenzione_id,))
            
            checklist = c.fetchall()
            checklist_items = [
                {
                    'scadenza_id': scadenza_id,
                    'codice': row[0],
                    'voce': row[1],
                    'obbligatoria': bool(row[2]),
                    'ordine': row[3]
                } for row in checklist
            ]
            
        elif checklist_voce_id:
            # Formato NUOVO: singola voce checklist
            c.execute("""
                SELECT nome_voce, descrizione
                FROM manutenzione_programmata_checklist
                WHERE id = ?
            """, (checklist_voce_id,))
            
            voce_info = c.fetchone()
            if not voce_info:
                return jsonify({'error': 'Voce checklist non trovata'}), 404
            
            nome_voce, descrizione_voce = voce_info
            nome_manutenzione = nome_voce or f"Manutenzione ({frequenza_tipo})"
            descrizione = descrizione_voce or f"Controllo {nome_voce} con frequenza {frequenza_tipo}"
            
            # Per il formato singolo
            checklist_items = [
                {
                    'scadenza_id': scadenza_id,
                    'codice': f'ITEM_{checklist_voce_id}',
                    'voce': nome_voce,
                    'descrizione': descrizione_voce,
                    'frequenza_tipo': frequenza_tipo,
                    'obbligatoria': True,
                    'ordine': 1
                }
            ]
            
        else:
            return jsonify({'error': 'Scadenza malformata: manca manutenzione_id e checklist_voce_id'}), 400
        
        conn.close()
        
        return jsonify({
            'scadenza': {
                'id': scadenza_id,
                'civico': civico,
                'asset': asset,
                'asset_tipo': asset_tipo,
                'data_scadenza': data_scadenza,
                'nome_manutenzione': nome_manutenzione,
                'descrizione': descrizione
            },
            'checklist': checklist_items
        })
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET FORM SCADENZA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero form: {e}'}), 500

@bp.route('/completa-scadenza', methods=['POST'])
def completa_scadenza_con_checklist():
    """Completa una scadenza con i risultati della checklist"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Dati mancanti'}), 400
        
        scadenza_id = data.get('scadenza_id')
        operatore = data.get('operatore')
        note_generali = data.get('note', '')
        checklist_risultati = data.get('checklist', [])
        
        if not scadenza_id or not operatore:
            return jsonify({'error': 'scadenza_id e operatore sono obbligatori'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Aggiorna scadenza come completata
        c.execute("""
            UPDATE scadenze_calendario 
            SET stato = 'completata', 
                data_completamento = ?, 
                operatore_completamento = ?,
                note_completamento = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            operatore,
            note_generali,
            datetime.datetime.now().isoformat(),
            scadenza_id
        ))
        
        # Salva risultati checklist
        for risultato in checklist_risultati:
            c.execute("""
                INSERT INTO manutenzione_checklist_risultati
                (scadenza_id, codice_voce, esito, note_voce, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                scadenza_id,
                risultato.get('codice'),
                risultato.get('esito', 'eseguito'),
                risultato.get('note', ''),
                datetime.datetime.now().isoformat()
            ))
        
        # Ottieni dettagli scadenza completata per creare la prossima
        c.execute("""
            SELECT s.civico, s.asset, s.asset_tipo, s.data_scadenza, s.checklist_voce_id, 
                   s.frequenza_tipo, s.giorni_preavviso, 
                   COALESCE(mpc.nome_voce, 'Manutenzione') as nome_manutenzione,
                   COALESCE(mpc.descrizione, '') as descrizione
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist mpc ON s.checklist_voce_id = mpc.id
            WHERE s.id = ?
        """, (scadenza_id,))
        
        scadenza_completata = c.fetchone()
        
        # Genera alert se ci sono note generali
        if note_generali.strip() and scadenza_completata:
            c.execute("""
                INSERT INTO alert (tipo, titolo, descrizione, data_creazione, civico, asset, stato, note, operatore)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                'non_conformita',
                f"Note manutenzione programmata: {scadenza_completata[1]}",
                f"Manutenzione programmata {scadenza_completata[2]}",
                datetime.datetime.now().isoformat(),
                scadenza_completata[0],
                scadenza_completata[1],
                'aperto',
                note_generali,
                operatore
            ))
            
            # Invia alert su Telegram
            alert_data = {
                'tipo': 'non_conformita',
                'titolo': f"Note manutenzione programmata: {scadenza_completata[1]}",
                'descrizione': f"Manutenzione programmata {scadenza_completata[2]}",
                'civico': scadenza_completata[0],
                'asset': scadenza_completata[1],
                'note': note_generali,
                'operatore': operatore
            }
            send_alert_to_telegram(alert_data)
        
        # Crea la prossima scadenza ricorrente
        if scadenza_completata:
            civico, asset, asset_tipo, data_scadenza_str, checklist_voce_id, frequenza_tipo, giorni_preavviso, nome_manutenzione, descrizione = scadenza_completata
            
            # Calcola la prossima data di scadenza - gestisce diversi formati di data
            try:
                # Prova prima con formato ISO completo
                if 'T' in data_scadenza_str:
                    data_attuale = datetime.datetime.fromisoformat(data_scadenza_str).date()
                else:
                    # Formato solo data
                    data_attuale = datetime.datetime.strptime(data_scadenza_str, '%Y-%m-%d').date()
            except ValueError:
                # Fallback: usa data odierna
                data_attuale = datetime.date.today()
                print(f"[WARNING] Formato data non riconosciuto: {data_scadenza_str}, usando data odierna")
            
            if frequenza_tipo == "settimanale":
                prossima_data = data_attuale + datetime.timedelta(weeks=1)
            elif frequenza_tipo == "bisettimanale":
                prossima_data = data_attuale + datetime.timedelta(weeks=2)
            elif frequenza_tipo == "mensile":
                # Aggiungi un mese
                if data_attuale.month == 12:
                    prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
                else:
                    prossima_data = data_attuale.replace(month=data_attuale.month + 1)
            elif frequenza_tipo == "bimestrale":
                # Aggiungi 2 mesi
                new_month = data_attuale.month + 2
                new_year = data_attuale.year
                if new_month > 12:
                    new_month -= 12
                    new_year += 1
                prossima_data = data_attuale.replace(year=new_year, month=new_month)
            elif frequenza_tipo == "trimestrale":
                # Aggiungi 3 mesi
                new_month = data_attuale.month + 3
                new_year = data_attuale.year
                if new_month > 12:
                    new_month -= 12
                    new_year += 1
                prossima_data = data_attuale.replace(year=new_year, month=new_month)
            elif frequenza_tipo == "semestrale":
                # Aggiungi 6 mesi
                new_month = data_attuale.month + 6
                new_year = data_attuale.year
                if new_month > 12:
                    new_month -= 12
                    new_year += 1
                prossima_data = data_attuale.replace(year=new_year, month=new_month)
            elif frequenza_tipo == "annuale":
                prossima_data = data_attuale.replace(year=data_attuale.year + 1)
            elif frequenza_tipo == "biennale":
                prossima_data = data_attuale.replace(year=data_attuale.year + 2)
            else:
                # Default mensile
                if data_attuale.month == 12:
                    prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
                else:
                    prossima_data = data_attuale.replace(month=data_attuale.month + 1)
            
            # Crea la nuova scadenza ricorrente
            c.execute("""
                INSERT INTO scadenze_calendario 
                (manutenzione_id, civico, asset, asset_tipo, data_scadenza, checklist_voce_id, 
                 frequenza_tipo, giorni_preavviso, 
                 stato, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                -1,  # Placeholder per compatibilità con constraint NOT NULL
                civico,
                asset,
                asset_tipo,
                prossima_data.isoformat(),
                checklist_voce_id,
                frequenza_tipo,
                giorni_preavviso,
                'programmata',
                datetime.datetime.now().isoformat(),
                datetime.datetime.now().isoformat()
            ))
            
            print(f"[DEBUG] Creata nuova scadenza ricorrente per {asset} - prossima data: {prossima_data}")
        
        conn.commit()
        conn.close()
        
        return jsonify({'ok': True, 'message': 'Manutenzione completata con successo'})
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        import traceback
        print("[DEBUG][ERRORE COMPLETA SCADENZA CHECKLIST]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore completamento: {e}'}), 500

# --- API TIPOLOGIE MANUTENZIONE ---

@bp.route('/manutenzioni/tipologie', methods=['GET'])
def get_tipologie_manutenzione():
    """Ottiene tutte le tipologie di manutenzione disponibili"""
    try:
        asset_tipo = request.args.get('asset_tipo')
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        if asset_tipo:
            # Prova prima con le nuove colonne, fallback alle vecchie se non esistono
            try:
                c.execute("""
                    SELECT id, asset_tipo, nome_manutenzione, descrizione, 
                           frequenza_mesi, giorni_preavviso, attiva,
                           frequenza_tipo, frequenza_valore
                    FROM manutenzione_tipologie 
                    WHERE asset_tipo = ? AND attiva = 1
                    ORDER BY nome_manutenzione
                """, (asset_tipo,))
            except sqlite3.OperationalError:
                # Fallback alle colonne vecchie se le nuove non esistono
                c.execute("""
                    SELECT id, asset_tipo, nome_manutenzione, descrizione, 
                           frequenza_mesi, giorni_preavviso, attiva
                    FROM manutenzione_tipologie 
                    WHERE asset_tipo = ? AND attiva = 1
                    ORDER BY nome_manutenzione
                """, (asset_tipo,))
        else:
            try:
                c.execute("""
                    SELECT id, asset_tipo, nome_manutenzione, descrizione, 
                           frequenza_mesi, giorni_preavviso, attiva,
                           frequenza_tipo, frequenza_valore
                    FROM manutenzione_tipologie 
                    WHERE attiva = 1
                    ORDER BY asset_tipo, nome_manutenzione
                """)
            except sqlite3.OperationalError:
                # Fallback alle colonne vecchie se le nuove non esistono
                c.execute("""
                    SELECT id, asset_tipo, nome_manutenzione, descrizione, 
                           frequenza_mesi, giorni_preavviso, attiva
                    FROM manutenzione_tipologie 
                    WHERE attiva = 1
                    ORDER BY asset_tipo, nome_manutenzione
                """)
        
        rows = c.fetchall()
        conn.close()
        
        tipologie = []
        for row in rows:
            # Gestisce sia il vecchio formato che il nuovo
            frequenza_tipo = row[7] if len(row) > 7 and row[7] else "mensile"
            frequenza_valore = row[8] if len(row) > 8 and row[8] else row[4]  # fallback a frequenza_mesi
            
            tipologie.append({
                'id': row[0],
                'asset_tipo': row[1],
                'nome_manutenzione': row[2],
                'descrizione': row[3],
                'frequenza_mesi': row[4],  # Mantieni per compatibilità
                'giorni_preavviso': row[5],
                'attiva': bool(row[6]),
                'frequenza_tipo': frequenza_tipo,
                'frequenza_valore': frequenza_valore
            })
        
        return jsonify({'tipologie': tipologie})
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET TIPOLOGIE]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero tipologie: {e}'}), 500

@bp.route('/manutenzioni/tipologie', methods=['POST'])
def add_tipologia_manutenzione():
    """Aggiunge una nuova tipologia di manutenzione"""
    try:
        data = request.get_json()
        required_fields = ['asset_tipo', 'nome_manutenzione', 'frequenza_mesi', 'giorni_preavviso']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Campo richiesto mancante: {field}'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che non esista già una tipologia con lo stesso nome per lo stesso asset
        c.execute("""
            SELECT COUNT(*) FROM manutenzione_tipologie 
            WHERE asset_tipo = ? AND nome_manutenzione = ?
        """, (data['asset_tipo'], data['nome_manutenzione']))
        
        if c.fetchone()[0] > 0:
            conn.close()
            return jsonify({'error': 'Esiste già una tipologia con questo nome per questo tipo di asset'}), 400
        
        c.execute("""
            INSERT INTO manutenzione_tipologie 
            (asset_tipo, nome_manutenzione, descrizione, frequenza_mesi, giorni_preavviso, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data['asset_tipo'],
            data['nome_manutenzione'],
            data.get('descrizione', ''),
            int(data['frequenza_mesi']),
            int(data['giorni_preavviso']),
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        tipologia_id = c.lastrowid
        conn.close()
        
        print(f"[DEBUG] Creata nuova tipologia manutenzione ID: {tipologia_id}")
        return jsonify({'ok': True, 'tipologia_id': tipologia_id})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE ADD TIPOLOGIA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore creazione tipologia: {e}'}), 500

@bp.route('/manutenzioni/tipologie/<int:tipologia_id>', methods=['DELETE'])
def delete_tipologia_manutenzione(tipologia_id):
    """Rimuove una tipologia di manutenzione"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che non ci siano scadenze associate a questa tipologia
        c.execute("""
            SELECT COUNT(*) FROM scadenze_calendario 
            WHERE manutenzione_id = ? AND stato = 'programmata'
        """, (tipologia_id,))
        
        scadenze_attive = c.fetchone()[0]
        if scadenze_attive > 0:
            conn.close()
            return jsonify({'error': f'Non è possibile eliminare questa tipologia. Ci sono {scadenze_attive} scadenze programmate associate.'}), 400
        
        # Elimina la tipologia
        c.execute("DELETE FROM manutenzione_tipologie WHERE id = ?", (tipologia_id,))
        
        if c.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Tipologia non trovata'}), 404
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Eliminata tipologia manutenzione ID: {tipologia_id}")
        return jsonify({'ok': True})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE DELETE TIPOLOGIA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore eliminazione tipologia: {e}'}), 500

@bp.route('/manutenzioni/asset-types', methods=['GET'])
def get_asset_types():
    """Ottiene tutti i tipi di asset disponibili dal database principale gestman.db"""
    try:
        # Connessione al database principale gestman.db
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        conn = sqlite3.connect(gestman_db_path)
        c = conn.cursor()
        
        # Estrae i tipi di asset dalla tabella assets
        c.execute("SELECT DISTINCT tipo FROM assets ORDER BY tipo")
        rows = c.fetchall()
        conn.close()
        
        asset_types = [row[0] for row in rows if row[0]]  # Filtra eventuali valori nulli
        return jsonify({'asset_types': asset_types})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET ASSET TYPES]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero tipi asset: {e}'}), 500

# --- API GESTIONE VOCI CHECKLIST ---

@bp.route('/manutenzioni/checklist-items/<asset_tipo>', methods=['GET'])
def get_checklist_items(asset_tipo):
    """Ottiene tutte le voci checklist per MANUTENZIONI PROGRAMMATE (NON controlli ordinari)"""
    try:
        print(f"[DEBUG] GET checklist-items MANUTENZIONI PROGRAMMATE per asset_tipo: {asset_tipo}")
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("""
            SELECT id, asset_tipo, nome_voce, descrizione, ordine_visualizzazione, attiva
            FROM manutenzione_programmata_checklist
            WHERE asset_tipo = ? AND attiva = 1
            ORDER BY ordine_visualizzazione
        """, (asset_tipo,))
        
        rows = c.fetchall()
        print(f"[DEBUG] Trovate {len(rows)} checklist per {asset_tipo}")
        conn.close()
        
        items = []
        for row in rows:
            items.append({
                'id': row[0],
                'asset_tipo': row[1],
                'nome_manutenzione': row[2],  # Cambiato da nome_voce per compatibilità frontend
                'nome_voce': row[2],
                'descrizione': row[3],
                'ordine_visualizzazione': row[4],
                'attiva': row[5]
            })
        
        print(f"[DEBUG] Restituendo checklist_items: {items}")
        return jsonify({'checklist_items': items})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET CHECKLIST ITEMS]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero voci checklist: {e}'}), 500

@bp.route('/manutenzioni/checklist-items', methods=['POST'])
def add_checklist_item():
    """Aggiunge una nuova voce alla checklist per MANUTENZIONI PROGRAMMATE (NON controlli ordinari)"""
    try:
        data = request.get_json()
        
        required_fields = ['asset_tipo', 'nome_voce']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Campo {field} richiesto'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che il tipo di asset esista nel database principale
        gestman_db_path = os.path.join(os.path.dirname(__file__), 'gestman.db')
        gestman_conn = sqlite3.connect(gestman_db_path)
        gestman_c = gestman_conn.cursor()
        gestman_c.execute("SELECT COUNT(*) FROM assets WHERE tipo = ?", (data['asset_tipo'],))
        if gestman_c.fetchone()[0] == 0:
            gestman_conn.close()
            conn.close()
            return jsonify({'error': f'Tipo di asset "{data["asset_tipo"]}" non trovato nel sistema'}), 404
        gestman_conn.close()
        
        # Calcola il prossimo ordine
        c.execute("""
            SELECT COALESCE(MAX(ordine_visualizzazione), 0) + 1 
            FROM manutenzione_programmata_checklist 
            WHERE asset_tipo = ?
        """, (data['asset_tipo'],))
        ordine = c.fetchone()[0]
        
        c.execute("""
            INSERT INTO manutenzione_programmata_checklist 
            (asset_tipo, nome_voce, descrizione, ordine_visualizzazione, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data['asset_tipo'],
            data['nome_voce'],
            data.get('descrizione', ''),
            ordine,
            datetime.datetime.now().isoformat()
        ))
        
        item_id = c.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({'id': item_id, 'message': 'Voce checklist aggiunta con successo'})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE ADD CHECKLIST ITEM]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore aggiunta voce checklist: {e}'}), 500

@bp.route('/manutenzioni/checklist-items/<int:item_id>', methods=['DELETE'])
def delete_checklist_item(item_id):
    """Elimina una voce dalla checklist MANUTENZIONI PROGRAMMATE (marca come non attiva)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che l'item esista
        c.execute("SELECT id FROM manutenzione_programmata_checklist WHERE id = ?", (item_id,))
        if not c.fetchone():
            conn.close()
            return jsonify({'error': 'Voce checklist non trovata'}), 404
        
        # Marca come non attiva invece di eliminare
        c.execute("""
            UPDATE manutenzione_programmata_checklist 
            SET attiva = 0, updated_at = ?
            WHERE id = ?
        """, (datetime.datetime.now().isoformat(), item_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Voce checklist eliminata con successo'})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE DELETE CHECKLIST ITEM]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore eliminazione voce checklist: {e}'}), 500

@bp.route('/manutenzioni/checklist-items/<int:item_id>', methods=['PATCH'])
def update_checklist_item(item_id):
    """Modifica una voce della checklist MANUTENZIONI PROGRAMMATE"""
    try:
        data = request.get_json()
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che l'item esista
        c.execute("SELECT id FROM manutenzione_programmata_checklist WHERE id = ?", (item_id,))
        if not c.fetchone():
            conn.close()
            return jsonify({'error': 'Voce checklist non trovata'}), 404
        
        # Prepara i campi da aggiornare
        updates = []
        params = []
        
        if 'nome_voce' in data:
            updates.append("nome_voce = ?")
            params.append(data['nome_voce'])
        
        if 'descrizione' in data:
            updates.append("descrizione = ?")
            params.append(data['descrizione'])
        
        if 'ordine_visualizzazione' in data:
            updates.append("ordine_visualizzazione = ?")
            params.append(data['ordine_visualizzazione'])
        
        if not updates:
            conn.close()
            return jsonify({'error': 'Nessun campo da aggiornare'}), 400
        
        updates.append("updated_at = ?")
        params.append(datetime.datetime.now().isoformat())
        params.append(item_id)
        
        c.execute(f"""
            UPDATE manutenzione_programmata_checklist 
            SET {', '.join(updates)}
            WHERE id = ?
        """, params)
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Voce checklist aggiornata con successo'})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE UPDATE CHECKLIST ITEM]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore aggiornamento voce checklist: {e}'}), 500

# --- API SCADENZE CALENDARIO ---

@bp.route('/scadenze', methods=['GET'])
def get_scadenze_calendario():
    """Ottiene tutte le scadenze programmate"""
    try:
        civico = request.args.get('civico')
        asset_tipo = request.args.get('asset_tipo')
        stato = request.args.get('stato', 'programmata')
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Query per formato nuovo con fallback per compatibilità
        query = """
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza, s.stato, 
                   s.data_completamento, s.operatore_completamento, s.note_completamento,
                   s.data_prossima_scadenza, s.frequenza_tipo, s.giorni_preavviso,
                   COALESCE(c.nome_voce, m.nome_manutenzione) as nome_manutenzione,
                   COALESCE(c.descrizione, m.descrizione) as descrizione,
                   COALESCE(s.giorni_preavviso, m.giorni_preavviso) as giorni_preavviso_final
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE 1=1
        """
        params = []
        
        if civico:
            query += " AND s.civico = ?"
            params.append(civico)
        
        if asset_tipo:
            query += " AND s.asset_tipo = ?"
            params.append(asset_tipo)
            
        if stato:
            query += " AND s.stato = ?"
            params.append(stato)
        
        query += " ORDER BY s.data_scadenza ASC"
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        scadenze = []
        for row in rows:
            # Calcola giorni rimanenti
            try:
                data_scadenza = datetime.datetime.fromisoformat(row[4])
                giorni_rimanenti = (data_scadenza - datetime.datetime.now()).days
                data_scadenza_formatted = data_scadenza.strftime('%d/%m/%Y')
            except:
                giorni_rimanenti = None
                data_scadenza_formatted = row[4]
            
            scadenze.append({
                'id': row[0],
                'civico': row[1],
                'asset': row[2],
                'asset_tipo': row[3],
                'data_scadenza': data_scadenza_formatted,
                'giorni_rimanenti': giorni_rimanenti,
                'stato': row[5],
                'data_completamento': row[6],
                'operatore_completamento': row[7],
                'note_completamento': row[8],
                'data_prossima_scadenza': row[9],
                'frequenza_tipo': row[10],
                'giorni_preavviso': row[11],
                'nome_manutenzione': row[12],
                'descrizione': row[13],
                'giorni_preavviso_final': row[14]
            })
        
        print(f"[DEBUG] Trovate {len(scadenze)} scadenze")
        return jsonify({'scadenze': scadenze})
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET SCADENZE]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero scadenze: {e}'}), 500

@bp.route('/scadenze', methods=['POST'])
def add_scadenza_calendario():
    """Aggiunge una nuova scadenza al calendario con nuovo formato (checklist_voce_id + frequenza separata)"""
    try:
        print("[DEBUG] POST /scadenze ricevuto")
        data = request.get_json()
        print(f"[DEBUG] Dati ricevuti: {data}")
        
        # Nuovo formato: campi richiesti aggiornati
        required_fields = ['checklist_voce_id', 'civico', 'asset', 'asset_tipo', 'data_scadenza', 'frequenza_tipo', 'giorni_preavviso']
        
        for field in required_fields:
            if not data.get(field):
                print(f"[DEBUG] Campo mancante: {field}")
                return jsonify({'error': f'Campo richiesto mancante: {field}'}), 400
        
        # Verifica che la data sia valida
        try:
            data_scadenza = datetime.datetime.strptime(data['data_scadenza'], '%Y-%m-%d')
            print(f"[DEBUG] Data scadenza parsata: {data_scadenza}")
        except ValueError:
            print("[DEBUG] Formato data non valido")
            return jsonify({'error': 'Formato data non valido. Utilizzare YYYY-MM-DD'}), 400
        
        # Verifica che la voce checklist esista
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("SELECT nome_voce FROM manutenzione_programmata_checklist WHERE id = ?", (data['checklist_voce_id'],))
        voce_checklist = c.fetchone()
        if not voce_checklist:
            conn.close()
            print(f"[DEBUG] Voce checklist non trovata: {data['checklist_voce_id']}")
            return jsonify({'error': 'Voce checklist non trovata'}), 404
        
        print(f"[DEBUG] Voce checklist trovata: {voce_checklist[0]}")
        
        # Calcola frequenza in mesi basata sul tipo
        frequenza_mesi_map = {
            'settimanale': 0.25,  # ~1 settimana = 1/4 di mese
            'bisettimanale': 0.5,  # 2 settimane = 1/2 mese
            'mensile': 1,
            'bimestrale': 2,
            'trimestrale': 3,
            'semestrale': 6,
            'annuale': 12,
            'biennale': 24
        }
        
        frequenza_tipo = data['frequenza_tipo'].lower()
        if frequenza_tipo not in frequenza_mesi_map:
            conn.close()
            print(f"[DEBUG] Tipo frequenza non valido: {frequenza_tipo}")
            return jsonify({'error': f'Tipo frequenza non valido: {frequenza_tipo}'}), 400
        
        frequenza_mesi = frequenza_mesi_map[frequenza_tipo]
        print(f"[DEBUG] Frequenza calcolata: {frequenza_mesi} mesi per tipo '{frequenza_tipo}'")
        
        # Calcola data prossima scadenza con fallback robusto
        if HAS_DATEUTIL:
            if frequenza_mesi < 1:
                # Per frequenze sotto il mese, usa giorni
                giorni = int(frequenza_mesi * 30)
                prossima_scadenza = data_scadenza + datetime.timedelta(days=giorni)
            else:
                prossima_scadenza = data_scadenza + relativedelta(months=int(frequenza_mesi))
            data_prossima = prossima_scadenza.isoformat()
            print(f"[DEBUG] Prossima scadenza calcolata con dateutil: {data_prossima}")
        else:
            print("[DEBUG] Dateutil non disponibile, uso fallback")
            # Fallback - approssimazione con 30 giorni per mese
            giorni_da_aggiungere = int(frequenza_mesi * 30)
            prossima_scadenza = data_scadenza + datetime.timedelta(days=giorni_da_aggiungere)
            data_prossima = prossima_scadenza.isoformat()
            print(f"[DEBUG] Prossima scadenza calcolata con fallback: {data_prossima}")
        
        print(f"[DEBUG] Inserendo scadenza nel database...")
        # Aggiornamento query per nuovo formato - salvo i nuovi campi + manutenzione_id placeholder
        c.execute("""
            INSERT INTO scadenze_calendario 
            (manutenzione_id, checklist_voce_id, frequenza_tipo, giorni_preavviso, civico, asset, asset_tipo, data_scadenza, data_prossima_scadenza, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            -1,  # Placeholder per compatibilità con constraint NOT NULL
            data['checklist_voce_id'],
            data['frequenza_tipo'],
            data['giorni_preavviso'],
            data['civico'],
            data['asset'],
            data['asset_tipo'],
            data_scadenza.isoformat(),
            data_prossima,
            datetime.datetime.now().isoformat()
        ))
        
        conn.commit()
        scadenza_id = c.lastrowid
        conn.close()
        
        print(f"[DEBUG] Creata nuova scadenza calendario ID: {scadenza_id}")
        return jsonify({'ok': True, 'scadenza_id': scadenza_id})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE ADD SCADENZA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore creazione scadenza: {e}'}), 500

@bp.route('/scadenze-raggruppate', methods=['GET'])
def get_scadenze_raggruppate():
    """Ottiene le scadenze raggruppate per asset e data per la visualizzazione"""
    try:
        civico = request.args.get('civico')
        asset_tipo = request.args.get('asset_tipo')
        stato = request.args.get('stato', 'programmata')
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Query per ottenere tutte le scadenze
        query = """
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza, s.stato, 
                   s.data_completamento, s.operatore_completamento, s.note_completamento,
                   s.data_prossima_scadenza, s.frequenza_tipo, s.giorni_preavviso,
                   s.checklist_voce_id,
                   COALESCE(c.nome_voce, m.nome_manutenzione) as nome_manutenzione,
                   COALESCE(c.descrizione, m.descrizione) as descrizione,
                   COALESCE(s.giorni_preavviso, m.giorni_preavviso) as giorni_preavviso_final
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE 1=1
        """
        params = []
        
        if civico:
            query += " AND s.civico = ?"
            params.append(civico)
        
        if asset_tipo:
            query += " AND s.asset_tipo = ?"
            params.append(asset_tipo)
            
        if stato:
            query += " AND s.stato = ?"
            params.append(stato)
        
        query += " ORDER BY s.data_scadenza ASC, s.asset ASC"
        
        c.execute(query, params)
        rows = c.fetchall()
        conn.close()
        
        # Raggruppa le scadenze per (civico, asset, data_scadenza)
        gruppi = {}
        for row in rows:
            chiave_gruppo = (row[1], row[2], row[4])  # civico, asset, data_scadenza
            
            if chiave_gruppo not in gruppi:
                gruppi[chiave_gruppo] = {
                    'civico': row[1],
                    'asset': row[2],
                    'asset_tipo': row[3],
                    'data_scadenza': row[4],
                    'stato': row[5],  # Prende lo stato della prima scadenza
                    'scadenze_individuali': [],
                    'giorni_rimanenti': None,
                    'giorni_preavviso': row[11] or 7
                }
            
            # Calcola giorni rimanenti
            try:
                data_scadenza = datetime.datetime.fromisoformat(row[4])
                giorni_rimanenti = (data_scadenza - datetime.datetime.now()).days
                data_scadenza_formatted = data_scadenza.strftime('%d/%m/%Y')
                gruppi[chiave_gruppo]['giorni_rimanenti'] = giorni_rimanenti
                gruppi[chiave_gruppo]['data_scadenza_formatted'] = data_scadenza_formatted
            except:
                gruppi[chiave_gruppo]['data_scadenza_formatted'] = row[4]
            
            # Aggiungi la scadenza individuale al gruppo
            gruppi[chiave_gruppo]['scadenze_individuali'].append({
                'id': row[0],
                'checklist_voce_id': row[12],
                'nome_manutenzione': row[13],
                'descrizione': row[14],
                'frequenza_tipo': row[10],
                'giorni_preavviso': row[15],
                'data_completamento': row[6],
                'operatore_completamento': row[7],
                'note_completamento': row[8],
                'data_prossima_scadenza': row[9]
            })
        
        # Converte in lista e aggiunge metadati per ogni gruppo
        scadenze_raggruppate = []
        for gruppo in gruppi.values():
            num_voci = len(gruppo['scadenze_individuali'])
            
            if num_voci == 1:
                # Gruppo singolo: usa il nome della voce
                nome_gruppo = gruppo['scadenze_individuali'][0]['nome_manutenzione']
                descrizione_gruppo = gruppo['scadenze_individuali'][0]['descrizione']
            else:
                # Gruppo multiplo: nome combinato
                nome_gruppo = f"Manutenzione {gruppo['asset_tipo']} ({num_voci} voci)"
                voci_nomi = [s['nome_manutenzione'] for s in gruppo['scadenze_individuali'][:3]]
                if num_voci > 3:
                    voci_nomi.append(f"... (+{num_voci-3} altre)")
                descrizione_gruppo = f"Controlli: {', '.join(voci_nomi)}"
            
            gruppo.update({
                'nome_gruppo': nome_gruppo,
                'descrizione_gruppo': descrizione_gruppo,
                'num_voci': num_voci,
                'is_gruppo': num_voci > 1
            })
            
            scadenze_raggruppate.append(gruppo)
        
        # Ordina per data scadenza
        scadenze_raggruppate.sort(key=lambda x: x['data_scadenza'])
        
        print(f"[DEBUG] Trovate {len(scadenze_raggruppate)} gruppi di scadenze")
        return jsonify({'scadenze': scadenze_raggruppate})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET SCADENZE RAGGRUPPATE]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero scadenze raggruppate: {e}'}), 500

@bp.route('/test-accorpamento', methods=['GET'])
def test_accorpamento():
    """Endpoint di test per verificare il funzionamento delle scadenze accorpate"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Conta scadenze totali
        c.execute("SELECT COUNT(*) FROM scadenze_calendario")
        total_scadenze = c.fetchone()[0]
        
        # Conta scadenze accorpate
        c.execute("""
            SELECT COUNT(DISTINCT scadenza_id) 
            FROM scadenze_checklist_voci
        """)
        scadenze_accorpate = c.fetchone()[0]
        
        # Mostra esempi di scadenze accorpate
        c.execute("""
            SELECT s.id, s.asset, s.data_scadenza, COUNT(scv.checklist_voce_id) as num_voci
            FROM scadenze_calendario s
            JOIN scadenze_checklist_voci scv ON s.id = scv.scadenza_id
            GROUP BY s.id
            ORDER BY num_voci DESC
            LIMIT 5
        """)
        esempi = c.fetchall()
        
        conn.close()
        
        return jsonify({
            'total_scadenze': total_scadenze,
            'scadenze_accorpate': scadenze_accorpate,
            'esempi_accorpamento': [
                {
                    'scadenza_id': e[0],
                    'asset': e[1], 
                    'data_scadenza': e[2],
                    'num_voci_checklist': e[3]
                } for e in esempi
            ]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/scadenze/<int:scadenza_id>/completa', methods=['PATCH'])
def completa_scadenza(scadenza_id):
    """Segna una scadenza come completata e programma la successiva - gestisce gruppi di scadenze"""
    try:
        data = request.get_json()
        operatore = data.get('operatore', '')
        note = data.get('note', '')
        is_gruppo = data.get('is_gruppo', False)  # Indica se stiamo completando un gruppo
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        if is_gruppo:
            # COMPLETAMENTO GRUPPO: trova tutte le scadenze dello stesso asset nella stessa data
            c.execute("""
                SELECT s1.civico, s1.asset, s1.data_scadenza 
                FROM scadenze_calendario s1 
                WHERE s1.id = ?
            """, (scadenza_id,))
            
            scadenza_base = c.fetchone()
            if not scadenza_base:
                conn.close()
                return jsonify({'error': 'Scadenza non trovata'}), 404
            
            civico, asset, data_scadenza = scadenza_base
            
            # Trova tutte le scadenze del gruppo
            c.execute("""
                SELECT s.id, s.manutenzione_id, s.checklist_voce_id, s.frequenza_tipo, 
                       s.giorni_preavviso, s.asset_tipo
                FROM scadenze_calendario s
                WHERE s.civico = ? AND s.asset = ? AND s.data_scadenza = ? AND s.stato = 'programmata'
            """, (civico, asset, data_scadenza))
            
            scadenze_gruppo = c.fetchall()
            nuove_scadenze = []
            
            now = datetime.datetime.now()
            
            # Completa ogni scadenza del gruppo e riprogramma secondo la sua periodicità
            for s_id, manutenzione_id, checklist_voce_id, frequenza_tipo, giorni_preavviso, asset_tipo in scadenze_gruppo:
                
                # Marca come completata
                c.execute("""
                    UPDATE scadenze_calendario 
                    SET stato = 'completata', 
                        data_completamento = ?, 
                        operatore_completamento = ?, 
                        note_completamento = ?,
                        updated_at = ?
                    WHERE id = ?
                """, (now.isoformat(), operatore, note, now.isoformat(), s_id))
                
                # Calcola prossima scadenza secondo la periodicità specifica di questa voce
                if frequenza_tipo:
                    frequenza_mesi_map = {
                        'settimanale': 0.25, 'bisettimanale': 0.5, 'mensile': 1,
                        'bimestrale': 2, 'trimestrale': 3, 'semestrale': 6, 'annuale': 12, 'biennale': 24
                    }
                    frequenza_mesi = frequenza_mesi_map.get(frequenza_tipo.lower(), 1)
                    
                    try:
                        data_scadenza_dt = datetime.datetime.fromisoformat(data_scadenza)
                    except:
                        data_scadenza_dt = now
                    
                    if HAS_DATEUTIL:
                        if frequenza_mesi < 1:
                            giorni = int(frequenza_mesi * 30)
                            prossima_scadenza = data_scadenza_dt + datetime.timedelta(days=giorni)
                        else:
                            prossima_scadenza = data_scadenza_dt + relativedelta(months=int(frequenza_mesi))
                    else:
                        giorni_da_aggiungere = int(frequenza_mesi * 30)
                        prossima_scadenza = data_scadenza_dt + datetime.timedelta(days=giorni_da_aggiungere)
                    
                    # Calcola scadenza successiva
                    if HAS_DATEUTIL:
                        if frequenza_mesi < 1:
                            giorni = int(frequenza_mesi * 30)
                            data_successiva = prossima_scadenza + datetime.timedelta(days=giorni)
                        else:
                            data_successiva = prossima_scadenza + relativedelta(months=int(frequenza_mesi))
                    else:
                        giorni_da_aggiungere = int(frequenza_mesi * 30)
                        data_successiva = prossima_scadenza + datetime.timedelta(days=giorni_da_aggiungere)
                    
                    # Crea nuova scadenza individuale
                    c.execute("""
                        INSERT INTO scadenze_calendario 
                        (manutenzione_id, checklist_voce_id, civico, asset, asset_tipo, 
                         data_scadenza, data_prossima_scadenza, frequenza_tipo, 
                         giorni_preavviso, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        manutenzione_id or -1, checklist_voce_id,
                        civico, asset, asset_tipo,
                        prossima_scadenza.isoformat(), data_successiva.isoformat(),
                        frequenza_tipo, giorni_preavviso or 7, now.isoformat()
                    ))
                    
                    nuova_scadenza_id = c.lastrowid
                    nuove_scadenze.append({
                        'id': nuova_scadenza_id,
                        'data_scadenza': prossima_scadenza.isoformat(),
                        'frequenza_tipo': frequenza_tipo
                    })
            
            conn.commit()
            conn.close()
            
            print(f"[DEBUG] Gruppo di {len(scadenze_gruppo)} scadenze completato, create {len(nuove_scadenze)} nuove scadenze")
            return jsonify({
                'ok': True, 
                'gruppo_completato': True,
                'scadenze_completate': len(scadenze_gruppo),
                'nuove_scadenze': nuove_scadenze
            })
        
        else:
            # COMPLETAMENTO SINGOLO: gestione legacy
            c.execute("""
                SELECT s.manutenzione_id, s.civico, s.asset, s.asset_tipo, s.data_prossima_scadenza, 
                       s.frequenza_tipo, s.giorni_preavviso, s.nome_manutenzione, s.checklist_voce_id
                FROM scadenze_calendario s
                WHERE s.id = ?
            """, (scadenza_id,))
            
            scadenza_data = c.fetchone()
            if not scadenza_data:
                conn.close()
                return jsonify({'error': 'Scadenza non trovata'}), 404
            
            manutenzione_id, civico, asset, asset_tipo, data_prossima_str, frequenza_tipo, giorni_preavviso, nome_manutenzione, checklist_voce_id_legacy = scadenza_data
            
            now = datetime.datetime.now()
            
            # Marca come completata
            c.execute("""
                UPDATE scadenze_calendario 
                SET stato = 'completata', 
                    data_completamento = ?, 
                    operatore_completamento = ?, 
                    note_completamento = ?,
                    updated_at = ?
                WHERE id = ?
            """, (now.isoformat(), operatore, note, now.isoformat(), scadenza_id))
            
            # Calcola prossima scadenza
            if data_prossima_str:
                try:
                    data_prossima = datetime.datetime.fromisoformat(data_prossima_str)
                except:
                    data_prossima = now + datetime.timedelta(days=30)
            else:
                data_prossima = now + datetime.timedelta(days=30)
            
            # Calcola frequenza per la scadenza successiva
            if frequenza_tipo:
                frequenza_mesi_map = {
                    'settimanale': 0.25, 'bisettimanale': 0.5, 'mensile': 1,
                    'bimestrale': 2, 'trimestrale': 3, 'semestrale': 6, 'annuale': 12, 'biennale': 24
                }
                frequenza_mesi = frequenza_mesi_map.get(frequenza_tipo.lower(), 1)
                
                if HAS_DATEUTIL:
                    if frequenza_mesi < 1:
                        giorni = int(frequenza_mesi * 30)
                        data_successiva = data_prossima + datetime.timedelta(days=giorni)
                    else:
                        data_successiva = data_prossima + relativedelta(months=int(frequenza_mesi))
                else:
                    giorni_da_aggiungere = int(frequenza_mesi * 30)
                    data_successiva = data_prossima + datetime.timedelta(days=giorni_da_aggiungere)
            else:
                data_successiva = data_prossima + datetime.timedelta(days=30)
            
            # Crea nuova scadenza
            c.execute("""
                INSERT INTO scadenze_calendario 
                (manutenzione_id, checklist_voce_id, civico, asset, asset_tipo, 
                 data_scadenza, data_prossima_scadenza, frequenza_tipo, 
                 giorni_preavviso, nome_manutenzione, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                manutenzione_id or -1, checklist_voce_id_legacy,
                civico, asset, asset_tipo,
                data_prossima.isoformat(), data_successiva.isoformat(),
                frequenza_tipo, giorni_preavviso, nome_manutenzione,
                now.isoformat()
            ))
            
            nuova_scadenza_id = c.lastrowid
            
            conn.commit()
            conn.close()
            
            print(f"[DEBUG] Scadenza singola {scadenza_id} completata, creata nuova scadenza {nuova_scadenza_id}")
            return jsonify({'ok': True, 'nuova_scadenza_id': nuova_scadenza_id})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE COMPLETA SCADENZA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore completamento scadenza: {e}'}), 500

# --- SISTEMA ALERT AUTOMATICI ---

def genera_alert_scadenze():
    """
    Funzione che controlla le scadenze in avvicinamento e genera alert.
    Deve essere chiamata periodicamente (es. daily cron job)
    Supporta sia il formato nuovo (checklist_voce_id) che quello vecchio (manutenzione_id)
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        now = datetime.datetime.now()
        
        # Trova scadenze che necessitano alert (formato nuovo con checklist_voce_id)
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza,
                   COALESCE(cl.nome_voce, m.nome_manutenzione) as nome_manutenzione,
                   COALESCE(cl.descrizione, m.descrizione) as descrizione,
                   COALESCE(s.giorni_preavviso, m.giorni_preavviso, 7) as giorni_preavviso,
                   s.frequenza_tipo
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist cl ON s.checklist_voce_id = cl.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE s.stato = 'programmata'
              AND (s.checklist_voce_id IS NOT NULL OR s.manutenzione_id IS NOT NULL)
        """)
        
        scadenze = c.fetchall()
        alert_generati = 0
        
        print(f"[DEBUG] Controllo alert per {len(scadenze)} scadenze programmate")
        
        for scadenza in scadenze:
            scadenza_id, civico, asset, asset_tipo, data_scadenza_str, nome_manutenzione, descrizione, giorni_preavviso, frequenza_tipo = scadenza
            
            try:
                data_scadenza = datetime.datetime.fromisoformat(data_scadenza_str)
                giorni_rimanenti = (data_scadenza - now).days
                
                print(f"[DEBUG] Scadenza {scadenza_id}: {nome_manutenzione} per {asset} - giorni rimanenti: {giorni_rimanenti}, preavviso: {giorni_preavviso}")
                
                # Genera alert se:
                # 1. Oggi è il giorno della scadenza (giorni_rimanenti = 0)  
                # 2. Siamo dentro il range di preavviso (giorni_rimanenti <= giorni_preavviso e giorni_rimanenti > 0)
                # 3. La scadenza è passata (giorni_rimanenti < 0)
                deve_generare_alert = False
                tipo_alert = ""
                
                if giorni_rimanenti < 0:
                    deve_generare_alert = True
                    tipo_alert = "scaduta"
                    print(f"[DEBUG] -> SCADUTA: {giorni_rimanenti} giorni in ritardo")
                elif giorni_rimanenti == 0:
                    deve_generare_alert = True
                    tipo_alert = "oggi"
                    print(f"[DEBUG] -> OGGI: scadenza oggi")
                elif giorni_rimanenti > 0 and giorni_rimanenti <= giorni_preavviso:
                    deve_generare_alert = True
                    tipo_alert = "preavviso"
                    print(f"[DEBUG] -> PREAVVISO: {giorni_rimanenti} giorni <= {giorni_preavviso}")
                else:
                    print(f"[DEBUG] -> NO ALERT: {giorni_rimanenti} giorni > {giorni_preavviso} (preavviso)")
                
                if deve_generare_alert:
                    # Controlla se esiste già un alert attivo per questa scadenza
                    # Usa un controllo più specifico per prevenire duplicati
                    c.execute("""
                        SELECT COUNT(*) FROM alert 
                        WHERE tipo = 'scadenza' 
                        AND civico = ? AND asset = ? 
                        AND titolo LIKE ?
                        AND stato = 'aperto'
                        AND date(data_creazione) = date('now')
                    """, (
                        civico, asset, f'%{nome_manutenzione}%'
                    ))
                    
                    alert_oggi = c.fetchone()[0]
                    
                    # Controllo aggiuntivo per alert nelle ultime ore
                    c.execute("""
                        SELECT COUNT(*) FROM alert 
                        WHERE tipo = 'scadenza' 
                        AND civico = ? AND asset = ? 
                        AND titolo LIKE ?
                        AND stato = 'aperto'
                        AND datetime(data_creazione) > datetime('now', '-2 hours')
                    """, (
                        civico, asset, f'%{nome_manutenzione}%'
                    ))
                    
                    alert_recenti = c.fetchone()[0]
                    
                    print(f"[DEBUG] Controllo duplicati per {asset}/{nome_manutenzione}: trovati {alert_oggi} alert oggi, {alert_recenti} alert recenti")
                    
                    if alert_oggi == 0 and alert_recenti == 0:  # Nessun alert duplicato
                        # Crea un titolo semplificato e uniforme
                        titolo = f"Manutenzione {asset_tipo} programmata"
                        
                        # Crea la descrizione in base al tipo di alert
                        if tipo_alert == "scaduta":
                            desc_alert = f"Manutenzione programmata {asset_tipo}"
                        elif tipo_alert == "oggi":
                            desc_alert = f"Manutenzione programmata {asset_tipo}"
                        else:  # preavviso
                            if giorni_rimanenti == 1:
                                desc_alert = f"Manutenzione programmata {asset_tipo}"
                            else:
                                desc_alert = f"Manutenzione programmata {asset_tipo}"
                        
                        # Recupera i dettagli delle voci per le note
                        # Verifica se ci sono altre scadenze dello stesso asset nella stessa data
                        c.execute("""
                            SELECT s.id, 
                                   COALESCE(mpc.nome_voce, mt.nome_manutenzione) as nome_voce,
                                   COALESCE(mpc.descrizione, mt.descrizione) as descrizione_voce
                            FROM scadenze_calendario s
                            LEFT JOIN manutenzione_programmata_checklist mpc ON s.checklist_voce_id = mpc.id
                            LEFT JOIN manutenzione_tipologie mt ON s.manutenzione_id = mt.id
                            WHERE s.civico = ? AND s.asset = ? AND s.data_scadenza = ? AND s.stato = 'programmata'
                            ORDER BY COALESCE(mpc.nome_voce, mt.nome_manutenzione)
                        """, (civico, asset, data_scadenza_str))
                        
                        voci_scadenza = c.fetchall()
                        
                        # Costruisce le note con i titoli e descrizioni delle voci
                        note_parts = []
                        for _, nome_voce, descrizione_voce in voci_scadenza:
                            if nome_voce:
                                # Titolo e descrizione separati e a capo
                                note_part = nome_voce
                                if descrizione_voce:
                                    note_part += f"\n{descrizione_voce}"
                                note_parts.append(note_part)
                        
                        note_alert = "\n\n".join(note_parts) if note_parts else ""
                        
                        # Inserisci alert nel database
                        c.execute("""
                            INSERT INTO alert (tipo, titolo, descrizione, data_creazione, civico, asset, stato, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            'scadenza', titolo, desc_alert, now.isoformat(),
                            civico, asset, 'aperto', note_alert
                        ))
                        
                        # Invia alert su Telegram con dati strutturati
                        alert_data = {
                            'tipo': 'scadenza',
                            'titolo': titolo,
                            'descrizione': descrizione or f"Manutenzione {nome_manutenzione}",
                            'operazione': nome_manutenzione,  # Nome della voce/operazione
                            'civico': civico,
                            'asset': asset,
                            'asset_tipo': asset_tipo,  # Aggiungiamo il tipo di asset dal database
                            'note': f'Scadenza: {data_scadenza.strftime("%d/%m/%Y")} - Frequenza: {frequenza_tipo or "Non specificata"}',
                            'giorni_rimanenti': giorni_rimanenti,
                            'tipo_alert': tipo_alert
                        }
                        print(f"[DEBUG] Inviando dati Telegram: {alert_data}")
                        telegram_result = send_alert_to_telegram(alert_data)
                        print(f"[DEBUG] Risultato invio Telegram: {telegram_result}")
                        
                        alert_generati += 1
                        print(f"[DEBUG] Generato alert scadenza ({tipo_alert}) per {asset} - {nome_manutenzione}")
                        
            except Exception as e:
                print(f"[DEBUG] Errore elaborazione scadenza {scadenza_id}: {e}")
                continue
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Processo alert scadenze completato. Generati {alert_generati} alert")
        return alert_generati
        
    except Exception as e:
        print(f"[DEBUG] Errore generale nella generazione alert scadenze: {e}")
        return 0
        return 0

@bp.route('/genera-alert', methods=['POST'])
def trigger_genera_alert():
    """Endpoint per triggerare manualmente la generazione di alert scadenze"""
    try:
        alert_generati = genera_alert_scadenze()
        return jsonify({'ok': True, 'alert_generati': alert_generati})
    except Exception as e:
        return jsonify({'error': f'Errore generazione alert: {e}'}), 500

# --- INIZIALIZZAZIONE ---
init_calendario_db()

# --- ENDPOINT DEBUG ---
@bp.route('/debug/tipologie', methods=['GET'])
def debug_tipologie():
    """Endpoint di debug per controllare le tipologie presenti"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        c.execute("SELECT asset_tipo, nome_manutenzione, id FROM manutenzione_tipologie ORDER BY asset_tipo, nome_manutenzione")
        tipologie = c.fetchall()
        conn.close()
        
        return jsonify({
            'count': len(tipologie),
            'tipologie': [{'id': t[2], 'asset_tipo': t[0], 'nome_manutenzione': t[1]} for t in tipologie]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- ENDPOINT SCADENZE IN ARRIVO ---
@bp.route('/scadenze-prossime', methods=['GET'])
def get_scadenze_prossime():
    """Ottieni scadenze in arrivo nei prossimi giorni (sia vecchio che nuovo formato)"""
    try:
        giorni_anticipo = request.args.get('giorni', 30, type=int)
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        data_limite = (datetime.datetime.now() + datetime.timedelta(days=giorni_anticipo)).isoformat()
        
        # Query aggiornata per gestire sia nuovo che vecchio formato
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza,
                   COALESCE(c.nome_voce, m.nome_manutenzione) as nome_manutenzione,
                   COALESCE(c.descrizione, m.descrizione) as descrizione,
                   COALESCE(s.giorni_preavviso, m.giorni_preavviso) as giorni_preavviso,
                   s.stato, s.frequenza_tipo
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE s.stato = 'programmata' 
              AND s.data_scadenza <= ?
              AND (s.checklist_voce_id IS NOT NULL OR s.manutenzione_id IS NOT NULL)
            ORDER BY s.data_scadenza ASC
        """, (data_limite,))
        
        scadenze = c.fetchall()
        conn.close()
        
        print(f"[DEBUG] Scadenze prossime trovate: {len(scadenze)}")
        for scadenza in scadenze:
            print(f"[DEBUG] Scadenza: ID={scadenza[0]}, Asset={scadenza[2]}, Nome={scadenza[5]}")
        
        scadenze_list = []
        for row in scadenze:
            try:
                data_scadenza = datetime.datetime.fromisoformat(row[4])
                giorni_rimanenti = (data_scadenza - datetime.datetime.now()).days
                giorni_preavviso = row[7] if row[7] is not None else 7  # Default a 7 giorni
                
                scadenze_list.append({
                    'id': row[0],
                    'civico': row[1],
                    'asset': row[2],
                    'asset_tipo': row[3],
                    'data_scadenza': data_scadenza.strftime('%d/%m/%Y'),
                    'nome_manutenzione': row[5] or 'Manutenzione Programmata',
                    'descrizione': row[6] or '',
                    'giorni_preavviso': giorni_preavviso,
                    'giorni_rimanenti': giorni_rimanenti,
                    'urgente': giorni_rimanenti <= giorni_preavviso,
                    'scaduta': giorni_rimanenti < 0,
                    'stato': row[8],
                    'frequenza_tipo': row[9]
                })
            except Exception as e:
                print(f"[DEBUG] Errore processando scadenza {row[0]}: {e}")
                continue
        
        print(f"[DEBUG] Scadenze processate: {len(scadenze_list)}")
        return jsonify({'scadenze': scadenze_list})
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE GET SCADENZE PROSSIME]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore recupero scadenze: {e}'}), 500

# --- ENDPOINT ELIMINAZIONE SCADENZA ---
@bp.route('/scadenze/<int:scadenza_id>', methods=['DELETE'])
def elimina_scadenza(scadenza_id):
    """Elimina una scadenza programmata"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Verifica che la scadenza esista usando la stessa query JOIN del GET
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo,
                   COALESCE(c.nome_voce, m.nome_manutenzione) as nome_manutenzione
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE s.id = ?
        """, (scadenza_id,))
        scadenza = c.fetchone()
        
        if not scadenza:
            conn.close()
            return jsonify({'error': 'Scadenza non trovata'}), 404
        
        # Elimina la scadenza
        c.execute("DELETE FROM scadenze_calendario WHERE id = ?", (scadenza_id,))
        
        conn.commit()
        conn.close()
        
        print(f"[DEBUG] Scadenza eliminata: ID={scadenza_id}, Asset={scadenza[2]}, Nome={scadenza[4]}")
        
        return jsonify({
            'ok': True, 
            'message': f'Scadenza "{scadenza[4]}" eliminata con successo per {scadenza[2]} ({scadenza[1]})'
        })
        
    except Exception as e:
        import traceback
        print("[DEBUG][ERRORE ELIMINA SCADENZA]", e)
        traceback.print_exc()
        return jsonify({'error': f'Errore eliminazione scadenza: {e}'}), 500

# --- ENDPOINT ALERT SCADENZE ---
@bp.route('/alert/genera-scadenze', methods=['POST'])
def genera_alert_scadenze_endpoint():
    """Endpoint per generare manualmente gli alert delle scadenze"""
    try:
        alert_generati = genera_alert_scadenze()
        return jsonify({
            'ok': True,
            'message': f'Processo completato. Generati {alert_generati} alert',
            'alert_generati': alert_generati
        })
    except Exception as e:
        print(f"[DEBUG] Errore endpoint genera alert: {e}")
        return jsonify({'error': f'Errore nella generazione alert: {e}'}), 500

@bp.route('/alert/test-scadenze', methods=['GET'])  
def test_alert_scadenze():
    """Endpoint per testare il sistema di alert delle scadenze"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        now = datetime.datetime.now()
        
        # Mostra tutte le scadenze e il loro stato rispetto agli alert
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza,
                   COALESCE(cl.nome_voce, m.nome_manutenzione) as nome_manutenzione,
                   COALESCE(s.giorni_preavviso, m.giorni_preavviso, 7) as giorni_preavviso,
                   s.stato, s.frequenza_tipo
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist cl ON s.checklist_voce_id = cl.id
            LEFT JOIN manutenzione_tipologie m ON s.manutenzione_id = m.id
            WHERE s.stato = 'programmata'
              AND (s.checklist_voce_id IS NOT NULL OR s.manutenzione_id IS NOT NULL)
            ORDER BY s.data_scadenza ASC
        """)
        
        scadenze = c.fetchall()
        scadenze_info = []
        
        for scadenza in scadenze:
            scadenza_id, civico, asset, asset_tipo, data_scadenza_str, nome_manutenzione, giorni_preavviso, stato, frequenza_tipo = scadenza
            
            try:
                data_scadenza = datetime.datetime.fromisoformat(data_scadenza_str)
                giorni_rimanenti = (data_scadenza - now).days
                
                # Verifica se esistono alert per questa scadenza
                c.execute("""
                    SELECT COUNT(*) FROM alert 
                    WHERE tipo = 'scadenza' 
                    AND civico = ? AND asset = ? 
                    AND titolo LIKE ?
                """, (civico, asset, f'%{nome_manutenzione}%'))
                
                alert_esistenti = c.fetchone()[0]
                
                # Determina se dovrebbe avere un alert
                dovrebbe_avere_alert = (
                    giorni_rimanenti < 0 or  # Scaduta
                    giorni_rimanenti == 0 or  # Oggi
                    giorni_rimanenti <= giorni_preavviso  # Preavviso (range completo)
                )
                
                stato_alert = "No alert necessario"
                if dovrebbe_avere_alert:
                    if alert_esistenti > 0:
                        stato_alert = f"Alert presente ({alert_esistenti})"
                    else:
                        stato_alert = "Alert MANCANTE!"
                
                scadenze_info.append({
                    'id': scadenza_id,
                    'civico': civico,
                    'asset': asset,
                    'nome_manutenzione': nome_manutenzione,
                    'data_scadenza': data_scadenza.strftime('%d/%m/%Y'),
                    'giorni_rimanenti': giorni_rimanenti,
                    'giorni_preavviso': giorni_preavviso,
                    'dovrebbe_avere_alert': dovrebbe_avere_alert,
                    'alert_esistenti': alert_esistenti,
                    'stato_alert': stato_alert,
                    'frequenza_tipo': frequenza_tipo
                })
                
            except Exception as e:
                print(f"[DEBUG] Errore elaborazione scadenza test {scadenza_id}: {e}")
                continue
        
        conn.close()
        
        return jsonify({
            'ok': True,
            'data_corrente': now.strftime('%d/%m/%Y %H:%M'),
            'scadenze_totali': len(scadenze_info),
            'scadenze': scadenze_info
        })
        
    except Exception as e:
        print(f"[DEBUG] Errore test alert scadenze: {e}")
        return jsonify({'error': f'Errore nel test alert: {e}'}), 500

@bp.route('/form-gruppo', methods=['GET'])
def get_form_gruppo():
    """Ottieni il form per un gruppo di scadenze dello stesso asset e data"""
    try:
        civico = request.args.get('civico')
        asset = request.args.get('asset')
        data_scadenza = request.args.get('data_scadenza')
        
        if not civico or not asset or not data_scadenza:
            return jsonify({'error': 'Parametri mancanti: civico, asset, data_scadenza'}), 400
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        print(f"[DEBUG] Richiesta form gruppo per civico='{civico}', asset='{asset}', data_scadenza='{data_scadenza}'")
        
        # Converte la data dal formato italiano (dd/mm/yyyy) al formato ISO se necessario
        data_scadenza_iso = data_scadenza
        data_scadenza_iso_alt = data_scadenza  # Formato alternativo
        
        if '/' in data_scadenza:
            try:
                # Converte da "05/09/2025" a "2025-09-05T00:00:00"
                day, month, year = data_scadenza.split('/')
                data_scadenza_iso = f"{year}-{month.zfill(2)}-{day.zfill(2)}T00:00:00"
                data_scadenza_iso_alt = f"{year}-{month.zfill(2)}-{day.zfill(2)}"  # Senza ora
                print(f"[DEBUG] Data convertita da '{data_scadenza}' a '{data_scadenza_iso}' o '{data_scadenza_iso_alt}'")
            except ValueError:
                print(f"[DEBUG] Errore nella conversione della data: {data_scadenza}")
        
        # Prima verifichiamo cosa c'è nella tabella per questi parametri
        c.execute("""
            SELECT s.civico, s.asset, s.data_scadenza, COUNT(*) as num_scadenze
            FROM scadenze_calendario s
            WHERE s.civico = ? AND s.asset = ?
            GROUP BY s.civico, s.asset, s.data_scadenza
            ORDER BY s.data_scadenza
        """, (civico, asset))
        
        debug_rows = c.fetchall()
        print(f"[DEBUG] Scadenze trovate per civico={civico}, asset={asset}:")
        for row in debug_rows:
            print(f"  - {row}")
        
        # Ottieni tutte le scadenze del gruppo usando ENTRAMBI i formati di data
        c.execute("""
            SELECT s.id, s.civico, s.asset, s.asset_tipo, s.data_scadenza, 
                   s.manutenzione_id, s.checklist_voce_id, s.frequenza_tipo, 
                   c.nome_voce, c.descrizione
            FROM scadenze_calendario s
            JOIN manutenzione_programmata_checklist c ON s.checklist_voce_id = c.id
            WHERE s.civico = ? AND s.asset = ? AND (s.data_scadenza = ? OR s.data_scadenza = ?)
            ORDER BY c.nome_voce
        """, (civico, asset, data_scadenza_iso, data_scadenza_iso_alt))
        
        scadenze_rows = c.fetchall()
        if not scadenze_rows:
            return jsonify({'error': 'Gruppo di scadenze non trovato'}), 404
        
        # Prepara i dati del gruppo
        scadenze_gruppo = []
        
        for row in scadenze_rows:
            scadenza_id, civico, asset, asset_tipo, data_scadenza, manutenzione_id, checklist_voce_id, frequenza_tipo, nome_voce, descrizione = row
            
            scadenza_data = {
                'id': scadenza_id,
                'civico': civico,
                'asset': asset,
                'asset_tipo': asset_tipo,
                'data_scadenza': data_scadenza,
                'manutenzione_id': manutenzione_id,
                'checklist_voce_id': checklist_voce_id,
                'frequenza_tipo': frequenza_tipo,
                'nome_voce': nome_voce,
                'descrizione': descrizione,
                'campi': []  # Per ora campi vuoti, da implementare se necessario
            }
            
            scadenze_gruppo.append(scadenza_data)
        
        conn.close()
        
        # Dati comuni del gruppo
        primo_elemento = scadenze_gruppo[0]
        
        response_data = {
            'is_gruppo': True,
            'civico': primo_elemento['civico'],
            'asset': primo_elemento['asset'],
            'asset_tipo': primo_elemento['asset_tipo'],
            'data_scadenza': primo_elemento['data_scadenza'],
            'nome_gruppo': f"Gruppo manutenzione {primo_elemento['asset']}",
            'scadenze': scadenze_gruppo,
            'num_scadenze': len(scadenze_gruppo)
        }
        
        print(f"[DEBUG] Form gruppo preparato con {len(scadenze_gruppo)} scadenze")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[DEBUG][ERRORE GET FORM GRUPPO] {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Errore nel recupero del form gruppo: {str(e)}'}), 500

@bp.route('/completa-gruppo', methods=['POST'])
def completa_gruppo():
    """Completa un gruppo di scadenze"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dati non ricevuti'}), 400
        
        scadenze = data.get('scadenze', [])
        operatore = data.get('operatore', '')
        note_generali = data.get('note', '')
        
        if not scadenze or not operatore:
            return jsonify({'error': 'Parametri mancanti: scadenze e operatore sono obbligatori'}), 400
        
        print(f"[DEBUG] Completamento gruppo di {len(scadenze)} scadenze per operatore: {operatore}")
        print(f"[DEBUG] Dati ricevuti: {data}")
        
        # Raggruppa per checklist_voce_id per evitare duplicati
        scadenze_per_voce = {}
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Prima raccogli informazioni su tutte le scadenze del gruppo per evitare duplicati
        for scad_data in scadenze:
            scadenza_id = scad_data.get('scadenza_id')
            if not scadenza_id:
                continue
                
            # Ottieni dettagli della scadenza
            c.execute("""
                SELECT checklist_voce_id, civico, asset, asset_tipo, data_scadenza, 
                       frequenza_tipo, giorni_preavviso
                FROM scadenze_calendario 
                WHERE id = ?
            """, (scadenza_id,))
            
            row = c.fetchone()
            if row:
                checklist_voce_id, civico, asset, asset_tipo, data_scadenza, frequenza_tipo, giorni_preavviso = row
                
                # Raggruppa per tipo di voce - solo la prima scadenza di ogni tipo viene processata
                if checklist_voce_id not in scadenze_per_voce:
                    scadenze_per_voce[checklist_voce_id] = {
                        'scadenza_id': scadenza_id,
                        'civico': civico,
                        'asset': asset,
                        'asset_tipo': asset_tipo,
                        'data_scadenza': data_scadenza,
                        'frequenza_tipo': frequenza_tipo,
                        'giorni_preavviso': giorni_preavviso,
                        'esito': scad_data.get('esito', 'eseguito')
                    }
        
        # Ora processa tutte le scadenze del gruppo stesso civico/asset/data
        if scadenze_per_voce:
            primo_elemento = next(iter(scadenze_per_voce.values()))
            civico = primo_elemento['civico']
            asset = primo_elemento['asset']
            data_scadenza = primo_elemento['data_scadenza']
            
            print(f"[DEBUG] Completamento di tutte le scadenze per {civico}/{asset} del {data_scadenza}")
            
        # Processa ogni tipo di voce per aggiornare le date e salvare nello storico
        for checklist_voce_id, scad_info in scadenze_per_voce.items():
            # Usa la logica esistente per creare la prossima scadenza
            single_payload = {
                'scadenza_id': scad_info['scadenza_id'],  # Questo è solo per il log, la scadenza è già completata
                'operatore': operatore,
                'note': note_generali,
                'checklist': [{'codice': f'scadenza_{scad_info["scadenza_id"]}', 'esito': scad_info['esito'], 'note': ''}]
            }
            
            # Crea direttamente la nuova scadenza ricorrente
            result = crea_nuova_scadenza_ricorrente(scad_info, operatore, c)
            if not result.get('success'):
                return jsonify({'error': f'Errore nella creazione della scadenza ricorrente per voce {checklist_voce_id}: {result.get("error")}'}), 500
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Gruppo completato con successo - processate {len(scadenze_per_voce)} tipologie di manutenzione'
        })
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"[DEBUG][ERRORE COMPLETA GRUPPO] {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'Errore nel completamento del gruppo: {str(e)}'}), 500

def completa_scadenza_internal(data):
    """Funzione interna per completare una singola scadenza (riutilizzabile)"""
    try:
        scadenza_id = data.get('scadenza_id')
        operatore = data.get('operatore')
        note_generali = data.get('note', '')
        checklist_risultati = data.get('checklist', [])
        
        if not scadenza_id or not operatore:
            return {'success': False, 'error': 'scadenza_id e operatore sono obbligatori'}
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        print(f"[DEBUG] Completamento scadenza {scadenza_id} per operatore {operatore}")
        
        # Aggiorna scadenza come completata
        c.execute("""
            UPDATE scadenze_calendario 
            SET stato = 'completata', 
                data_completamento = ?, 
                operatore_completamento = ?,
                note_completamento = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            datetime.datetime.now().isoformat(),
            operatore,
            note_generali,
            datetime.datetime.now().isoformat(),
            scadenza_id
        ))
        
        # Salva risultati checklist (se la tabella esiste)
        try:
            for risultato in checklist_risultati:
                c.execute("""
                    INSERT INTO manutenzione_checklist_risultati
                    (scadenza_id, codice_voce, esito, note_voce, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    scadenza_id,
                    risultato.get('codice'),
                    risultato.get('esito', 'eseguito'),
                    risultato.get('note', ''),
                    datetime.datetime.now().isoformat()
                ))
        except sqlite3.OperationalError as e:
            print(f"[DEBUG] Tabella manutenzione_checklist_risultati non esiste: {e}")
        
        # Ottieni dettagli scadenza completata per creare la prossima
        c.execute("""
            SELECT s.civico, s.asset, s.asset_tipo, s.data_scadenza, s.checklist_voce_id, 
                   s.frequenza_tipo, s.giorni_preavviso, 
                   COALESCE(mpc.nome_voce, 'Manutenzione') as nome_manutenzione,
                   COALESCE(mpc.descrizione, '') as descrizione
            FROM scadenze_calendario s
            LEFT JOIN manutenzione_programmata_checklist mpc ON s.checklist_voce_id = mpc.id
            WHERE s.id = ?
        """, (scadenza_id,))
        
        scadenza_completata = c.fetchone()
        
        if scadenza_completata:
            civico, asset, asset_tipo, data_scadenza_str, checklist_voce_id, frequenza_tipo, giorni_preavviso, nome_manutenzione, descrizione = scadenza_completata
            
            # Calcola la prossima data di scadenza
            try:
                if 'T' in data_scadenza_str:
                    data_attuale = datetime.datetime.fromisoformat(data_scadenza_str).date()
                else:
                    data_attuale = datetime.datetime.strptime(data_scadenza_str, '%Y-%m-%d').date()
            except ValueError:
                data_attuale = datetime.date.today()
                print(f"[WARNING] Formato data non riconosciuto: {data_scadenza_str}, usando data odierna")
            
            # Calcola prossima data basata sulla frequenza
            if frequenza_tipo == "settimanale":
                prossima_data = data_attuale + datetime.timedelta(weeks=1)
            elif frequenza_tipo == "bisettimanale":
                prossima_data = data_attuale + datetime.timedelta(weeks=2)
            elif frequenza_tipo == "mensile":
                if data_attuale.month == 12:
                    prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
                else:
                    prossima_data = data_attuale.replace(month=data_attuale.month + 1)
            elif frequenza_tipo == "annuale":
                prossima_data = data_attuale.replace(year=data_attuale.year + 1)
            elif frequenza_tipo == "biennale":
                prossima_data = data_attuale.replace(year=data_attuale.year + 2)
            else:
                # Default mensile
                if data_attuale.month == 12:
                    prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
                else:
                    prossima_data = data_attuale.replace(month=data_attuale.month + 1)
            
            # Crea la nuova scadenza ricorrente
            c.execute("""
                INSERT INTO scadenze_calendario 
                (manutenzione_id, civico, asset, asset_tipo, data_scadenza, checklist_voce_id, 
                 frequenza_tipo, giorni_preavviso, 
                 stato, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                -1,  # Placeholder per compatibilità
                civico,
                asset,
                asset_tipo,
                prossima_data.isoformat(),
                checklist_voce_id,
                frequenza_tipo,
                giorni_preavviso,
                'programmata',
                datetime.datetime.now().isoformat(),
                datetime.datetime.now().isoformat()
            ))
            
            print(f"[DEBUG] Creata nuova scadenza ricorrente per {asset} - prossima data: {prossima_data}")
        
        conn.commit()
        conn.close()
        
        return {'success': True}
        
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        print(f"[DEBUG] Errore completamento scadenza {scadenza_id}: {e}")
        return {'success': False, 'error': str(e)}

def crea_nuova_scadenza_ricorrente(scad_info, operatore, cursor):
    """Aggiorna la data della scadenza esistente e salva l'esecuzione nello storico"""
    try:
        civico = scad_info['civico']
        asset = scad_info['asset'] 
        asset_tipo = scad_info['asset_tipo']
        data_scadenza_str = scad_info['data_scadenza']
        frequenza_tipo = scad_info['frequenza_tipo']
        giorni_preavviso = scad_info['giorni_preavviso']
        scadenza_id = scad_info['scadenza_id']
        esito = scad_info.get('esito', 'eseguito')
        
        # Ottieni l'ID e il nome della voce checklist
        cursor.execute("""
            SELECT checklist_voce_id FROM scadenze_calendario 
            WHERE id = ? LIMIT 1
        """, (scadenza_id,))
        
        row = cursor.fetchone()
        if not row:
            return {'success': False, 'error': 'Scadenza non trovata'}
            
        checklist_voce_id = row[0]
        
        # Ottieni il nome della voce per lo storico
        cursor.execute("""
            SELECT nome_voce FROM manutenzione_programmata_checklist 
            WHERE id = ? LIMIT 1
        """, (checklist_voce_id,))
        
        voce_row = cursor.fetchone()
        if not voce_row:
            return {'success': False, 'error': 'Voce checklist non trovata'}
            
        nome_voce = voce_row[0]
        
        # Calcola la prossima data di scadenza
        try:
            if 'T' in data_scadenza_str:
                data_attuale = datetime.datetime.fromisoformat(data_scadenza_str).date()
            else:
                data_attuale = datetime.datetime.strptime(data_scadenza_str, '%Y-%m-%d').date()
        except ValueError:
            data_attuale = datetime.date.today()
            print(f"[WARNING] Formato data non riconosciuto: {data_scadenza_str}, usando data odierna")
        
        # Calcola prossima data basata sulla frequenza
        if frequenza_tipo == "settimanale":
            prossima_data = data_attuale + datetime.timedelta(weeks=1)
        elif frequenza_tipo == "bisettimanale":
            prossima_data = data_attuale + datetime.timedelta(weeks=2)
        elif frequenza_tipo == "mensile":
            if data_attuale.month == 12:
                prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
            else:
                prossima_data = data_attuale.replace(month=data_attuale.month + 1)
        elif frequenza_tipo == "annuale":
            prossima_data = data_attuale.replace(year=data_attuale.year + 1)
        elif frequenza_tipo == "biennale":
            prossima_data = data_attuale.replace(year=data_attuale.year + 2)
        else:
            # Default mensile
            if data_attuale.month == 12:
                prossima_data = data_attuale.replace(year=data_attuale.year + 1, month=1)
            else:
                prossima_data = data_attuale.replace(month=data_attuale.month + 1)
        
        # 1. SALVA L'ESECUZIONE NELLO STORICO
        cursor.execute("""
            INSERT INTO scadenze_storico_esecuzioni 
            (civico, asset, asset_tipo, checklist_voce_id, nome_voce, 
             data_scadenza_originale, data_esecuzione, operatore_esecuzione, 
             note_esecuzione, esito, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            civico,
            asset,
            asset_tipo,
            checklist_voce_id,
            nome_voce,
            data_scadenza_str,
            datetime.datetime.now().isoformat(),
            operatore,
            '',  # Note esecuzione (potremmo passarle come parametro)
            esito,
            datetime.datetime.now().isoformat()
        ))
        
        # 2. AGGIORNA LA DATA DELLA SCADENZA ESISTENTE (non creare nuova)
        cursor.execute("""
            UPDATE scadenze_calendario 
            SET data_scadenza = ?,
                stato = 'programmata',
                updated_at = ?
            WHERE id = ?
        """, (
            prossima_data.isoformat(),
            datetime.datetime.now().isoformat(),
            scadenza_id
        ))
        
        print(f"[DEBUG] Scadenza {scadenza_id} aggiornata: {data_attuale} -> {prossima_data} - voce: {nome_voce}")
        print(f"[DEBUG] Esecuzione salvata nello storico per {asset} - operatore: {operatore}")
        
        return {'success': True}
        
    except Exception as e:
        print(f"[DEBUG] Errore aggiornamento scadenza ricorrente: {e}")
        return {'success': False, 'error': str(e)}

# --- INIZIALIZZAZIONE ---
if __name__ == '__main__':
    init_calendario_db()
    init_asset_checklist()
else:
    # Inizializza quando il modulo viene importato
    init_calendario_db()
    init_asset_checklist()
