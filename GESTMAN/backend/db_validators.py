# coding: utf-8
"""
Modulo per validazione riferimenti soft-FK tra database
Verifica l'esistenza di civici, assets, users prima di INSERT/UPDATE
"""

import sqlite3
import os

# Percorsi database
GESTMAN_DB = os.path.join(os.path.dirname(__file__), 'gestman.db')
COMPILAZIONI_DB = os.path.join(os.path.dirname(__file__), 'compilazioni.db')


def get_db_connection(db_name='gestman'):
    """Connessione dinamica ai database"""
    db_path = GESTMAN_DB if db_name == 'gestman' else COMPILAZIONI_DB
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def validate_reference(db_name, table, column, value):
    """
    Valida un singolo riferimento soft-FK
    
    Args:
        db_name: 'gestman' o 'compilazioni'
        table: nome tabella
        column: nome colonna
        value: valore da verificare
    
    Returns:
        bool: True se esiste o value è None/vuoto, False altrimenti
    """
    if not value or value == '':
        return True
    
    try:
        conn = get_db_connection(db_name)
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM {table} WHERE {column} = ? LIMIT 1", (value,))
        exists = cursor.fetchone() is not None
        conn.close()
        return exists
    except Exception as e:
        print(f"[ERROR] validate_reference: {e}")
        return False


def validate_civico(civico_numero):
    """
    Valida esistenza civico in gestman.civici
    
    Args:
        civico_numero: numero civico da verificare
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not civico_numero or civico_numero == '':
        return True, None
    
    if validate_reference('gestman', 'civici', 'numero', civico_numero):
        return True, None
    else:
        return False, f"Civico '{civico_numero}' non trovato"


def validate_asset(asset_id):
    """
    Valida esistenza asset in gestman.assets
    
    Args:
        asset_id: ID aziendale asset da verificare
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not asset_id or asset_id == '':
        return True, None
    
    if validate_reference('gestman', 'assets', 'id_aziendale', asset_id):
        return True, None
    else:
        return False, f"Asset '{asset_id}' non esiste"


def validate_user(username):
    """
    Valida esistenza utente in gestman.users
    
    Args:
        username: username da verificare
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not username or username == '':
        return True, None
    
    if validate_reference('gestman', 'users', 'username', username):
        return True, None
    else:
        return False, f"Utente '{username}' non trovato"


def validate_alert_references(civico=None, asset=None, operatore=None):
    """
    Valida tutti i riferimenti per un alert
    
    Args:
        civico: numero civico (opzionale)
        asset: ID asset (opzionale)
        operatore: username operatore (opzionale)
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    errors = []
    
    # Valida civico
    if civico:
        is_valid, error = validate_civico(civico)
        if not is_valid:
            errors.append(error)
    
    # Valida asset
    if asset:
        is_valid, error = validate_asset(asset)
        if not is_valid:
            errors.append(error)
    
    # Valida operatore
    if operatore:
        is_valid, error = validate_user(operatore)
        if not is_valid:
            errors.append(error)
    
    return len(errors) == 0, errors


def validate_form_submission_references(civico_numero=None, asset_id=None, operatore=None):
    """
    Valida tutti i riferimenti per una form submission
    
    Args:
        civico_numero: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        operatore: username operatore (opzionale)
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico_numero, asset_id, operatore)


def validate_scadenza_references(civico=None, asset_id=None, operatore_assegnato=None):
    """
    Valida tutti i riferimenti per una scadenza calendario
    
    Args:
        civico: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        operatore_assegnato: username operatore (opzionale)
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico, asset_id, operatore_assegnato)


def validate_document_references(civico_numero=None, asset_id=None, generated_by=None):
    """
    Valida tutti i riferimenti per document_history
    
    Args:
        civico_numero: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        generated_by: username generatore (opzionale)
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico_numero, asset_id, generated_by)


def validate_template_exists(template_id, db_name='compilazioni', table='form_templates'):
    """
    Valida esistenza template (form o document)
    
    Args:
        template_id: ID template
        db_name: database ('gestman' per document_templates, 'compilazioni' per form_templates)
        table: nome tabella template
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not template_id:
        return True, None
    
    if validate_reference(db_name, table, 'id', template_id):
        return True, None
    else:
        return False, f"Template ID {template_id} non trovato in {db_name}.{table}"
