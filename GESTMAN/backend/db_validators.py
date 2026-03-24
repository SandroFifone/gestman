# coding: utf-8
"""
Modulo per validazione riferimenti soft-FK tra database
Verifica l'esistenza di civici, assets, users prima di INSERT/UPDATE

Parametro strict:
- strict=True (default): validazione bloccante, ritorna False se fallisce
- strict=False: validazione soft, logga warning ma permette operazione
"""

import sqlite3
import os
import logging

# Configura logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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


def validate_civico(civico_numero, strict=True):
    """
    Valida esistenza civico in gestman.civici
    
    Args:
        civico_numero: numero civico da verificare
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not civico_numero or civico_numero == '':
        return True, None
    
    if validate_reference('gestman', 'civici', 'numero', civico_numero):
        logger.info(f"[VALIDATION] civico={civico_numero} → OK")
        return True, None
    else:
        error_msg = f"Civico '{civico_numero}' non trovato"
        if strict:
            logger.warning(f"[VALIDATION] {error_msg} (BLOCK)")
            return False, error_msg
        else:
            logger.warning(f"[VALIDATION] {error_msg} (ALLOW - strict=False)")
            return True, None


def validate_asset(asset_id, strict=True):
    """
    Valida esistenza asset in gestman.assets
    
    Args:
        asset_id: ID aziendale asset da verificare
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not asset_id or asset_id == '':
        return True, None
    
    if validate_reference('gestman', 'assets', 'id_aziendale', asset_id):
        logger.info(f"[VALIDATION] asset={asset_id} → OK")
        return True, None
    else:
        error_msg = f"Asset '{asset_id}' non esiste"
        if strict:
            logger.warning(f"[VALIDATION] {error_msg} (BLOCK)")
            return False, error_msg
        else:
            logger.warning(f"[VALIDATION] {error_msg} (ALLOW - strict=False)")
            return True, None


def validate_user(username, strict=True):
    """
    Valida esistenza utente in gestman.users
    
    Args:
        username: username da verificare
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not username or username == '':
        return True, None
    
    if validate_reference('gestman', 'users', 'username', username):
        logger.info(f"[VALIDATION] user={username} → OK")
        return True, None
    else:
        error_msg = f"Utente '{username}' non trovato"
        if strict:
            logger.warning(f"[VALIDATION] {error_msg} (BLOCK)")
            return False, error_msg
        else:
            logger.warning(f"[VALIDATION] {error_msg} (ALLOW - strict=False)")
            return True, None


def validate_alert_references(civico=None, asset=None, operatore=None, strict=True):
    """
    Valida tutti i riferimenti per un alert
    
    Args:
        civico: numero civico (opzionale)
        asset: ID asset (opzionale)
        operatore: username operatore (opzionale)
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    errors = []
    
    # Valida civico
    if civico:
        is_valid, error = validate_civico(civico, strict=strict)
        if not is_valid and error:
            errors.append(error)
    
    # Valida asset
    if asset:
        is_valid, error = validate_asset(asset, strict=strict)
        if not is_valid and error:
            errors.append(error)
    
    # Valida operatore
    if operatore:
        is_valid, error = validate_user(operatore, strict=strict)
        if not is_valid and error:
            errors.append(error)
    
    if len(errors) == 0:
        logger.info(f"[VALIDATION] alert_references → OK (civico={civico}, asset={asset}, operatore={operatore})")
    
    return len(errors) == 0, errors


def validate_form_submission_references(civico_numero=None, asset_id=None, operatore=None, strict=True):
    """
    Valida tutti i riferimenti per una form submission
    
    Args:
        civico_numero: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        operatore: username operatore (opzionale)
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico_numero, asset_id, operatore, strict=strict)


def validate_scadenza_references(civico=None, asset_id=None, operatore_assegnato=None, strict=True):
    """
    Valida tutti i riferimenti per una scadenza calendario
    
    Args:
        civico: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        operatore_assegnato: username operatore (opzionale)
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico, asset_id, operatore_assegnato, strict=strict)


def validate_document_references(civico_numero=None, asset_id=None, generated_by=None, strict=True):
    """
    Valida tutti i riferimenti per document_history
    
    Args:
        civico_numero: numero civico (opzionale)
        asset_id: ID asset (opzionale)
        generated_by: username generatore (opzionale)
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_messages: list)
    """
    # Stessa logica degli alert
    return validate_alert_references(civico_numero, asset_id, generated_by, strict=strict)


def validate_template_exists(template_id, db_name='compilazioni', table='form_templates', strict=True):
    """
    Valida esistenza template (form o document)
    
    Args:
        template_id: ID template
        db_name: database ('gestman' per document_templates, 'compilazioni' per form_templates)
        table: nome tabella template
        strict: se False, logga warning ma non blocca
    
    Returns:
        tuple: (is_valid: bool, error_message: str|None)
    """
    if not template_id:
        return True, None
    
    if validate_reference(db_name, table, 'id', template_id):
        logger.info(f"[VALIDATION] template_id={template_id} in {db_name}.{table} → OK")
        return True, None
    else:
        error_msg = f"Template ID {template_id} non trovato in {db_name}.{table}"
        if strict:
            logger.warning(f"[VALIDATION] {error_msg} (BLOCK)")
            return False, error_msg
        else:
            logger.warning(f"[VALIDATION] {error_msg} (ALLOW - strict=False)")
            return True, None
