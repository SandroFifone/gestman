# coding: utf-8
"""
Blueprint per la gestione della Rubrica contatti
"""
from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime

bp = Blueprint('rubrica', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'gestman.db')

def get_db_connection():
    """Connessione al database con foreign keys abilitate"""
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.row_factory = sqlite3.Row
    return conn

@bp.route('/categorie', methods=['GET'])
def get_categorie():
    """Recupera tutte le categorie della rubrica"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, nome, descrizione, icona, colore, ordinamento, is_active
            FROM rubrica_categorie 
            WHERE is_active = 1
            ORDER BY ordinamento, nome
        ''')
        
        categorie = []
        for row in cursor.fetchall():
            categoria = {
                'id': row['id'],
                'nome': row['nome'],
                'descrizione': row['descrizione'],
                'icona': row['icona'],
                'colore': row['colore'],
                'ordinamento': row['ordinamento'],
                'is_active': row['is_active']
            }
            categorie.append(categoria)
        
        conn.close()
        return jsonify({'categorie': categorie}), 200
        
    except Exception as e:
        print(f"[ERROR] get_categorie: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/contatti', methods=['GET'])
def get_contatti():
    """Recupera tutti i contatti, opzionalmente filtrati per categoria"""
    try:
        categoria_id = request.args.get('categoria_id')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if categoria_id:
            cursor.execute('''
                SELECT c.*, cat.nome as categoria_nome, cat.icona as categoria_icona
                FROM rubrica_contatti c
                JOIN rubrica_categorie cat ON c.categoria_id = cat.id
                WHERE c.categoria_id = ? AND c.is_active = 1
                ORDER BY c.priorita DESC, c.nome
            ''', (categoria_id,))
        else:
            cursor.execute('''
                SELECT c.*, cat.nome as categoria_nome, cat.icona as categoria_icona
                FROM rubrica_contatti c
                JOIN rubrica_categorie cat ON c.categoria_id = cat.id
                WHERE c.is_active = 1
                ORDER BY cat.ordinamento, c.priorita DESC, c.nome
            ''')
        
        contatti = []
        for row in cursor.fetchall():
            contatto = {
                'id': row['id'],
                'categoria_id': row['categoria_id'],
                'categoria_nome': row['categoria_nome'],
                'categoria_icona': row['categoria_icona'],
                'nome': row['nome'],
                'azienda': row['azienda'],
                'ruolo': row['ruolo'],
                'telefono': row['telefono'],
                'email': row['email'],
                'indirizzo': row['indirizzo'],
                'note': row['note'],
                'priorita': row['priorita'],
                'is_active': row['is_active']
            }
            contatti.append(contatto)
        
        conn.close()
        return jsonify({'contatti': contatti}), 200
        
    except Exception as e:
        print(f"[ERROR] get_contatti: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/contatti', methods=['POST'])
def create_contatto():
    """Crea un nuovo contatto"""
    try:
        data = request.get_json()
        
        required_fields = ['categoria_id', 'nome']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Campo {field} obbligatorio'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO rubrica_contatti 
            (categoria_id, nome, azienda, ruolo, telefono, email, indirizzo, note, priorita, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['categoria_id'],
            data['nome'],
            data.get('azienda', ''),
            data.get('ruolo', ''),
            data.get('telefono', ''),
            data.get('email', ''),
            data.get('indirizzo', ''),
            data.get('note', ''),
            data.get('priorita', 1),
            now,
            now
        ))
        
        contatto_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Contatto creato con successo',
            'id': contatto_id
        }), 201
        
    except Exception as e:
        print(f"[ERROR] create_contatto: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/contatti/<int:contatto_id>', methods=['PUT'])
def update_contatto(contatto_id):
    """Aggiorna un contatto esistente"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE rubrica_contatti 
            SET categoria_id = ?, nome = ?, azienda = ?, ruolo = ?, telefono = ?, 
                email = ?, indirizzo = ?, note = ?, priorita = ?, updated_at = ?
            WHERE id = ?
        ''', (
            data.get('categoria_id'),
            data.get('nome'),
            data.get('azienda', ''),
            data.get('ruolo', ''),
            data.get('telefono', ''),
            data.get('email', ''),
            data.get('indirizzo', ''),
            data.get('note', ''),
            data.get('priorita', 1),
            datetime.now().isoformat(),
            contatto_id
        ))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Contatto non trovato'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Contatto aggiornato con successo'}), 200
        
    except Exception as e:
        print(f"[ERROR] update_contatto: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/contatti/<int:contatto_id>', methods=['DELETE'])
def delete_contatto(contatto_id):
    """Elimina un contatto (soft delete)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE rubrica_contatti 
            SET is_active = 0, updated_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), contatto_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Contatto non trovato'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Contatto eliminato con successo'}), 200
        
    except Exception as e:
        print(f"[ERROR] delete_contatto: {e}")
        return jsonify({'error': str(e)}), 500

@bp.route('/categorie', methods=['POST'])
def create_categoria():
    """Crea una nuova categoria (solo admin)"""
    try:
        data = request.get_json()
        
        if not data.get('nome'):
            return jsonify({'error': 'Nome categoria obbligatorio'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        
        cursor.execute('''
            INSERT INTO rubrica_categorie 
            (nome, descrizione, icona, colore, ordinamento, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['nome'],
            data.get('descrizione', ''),
            data.get('icona', '📁'),
            data.get('colore', '#007bff'),
            data.get('ordinamento', 0),
            now,
            now
        ))
        
        categoria_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Categoria creata con successo',
            'id': categoria_id
        }), 201
        
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Categoria già esistente'}), 409
    except Exception as e:
        print(f"[ERROR] create_categoria: {e}")
        return jsonify({'error': str(e)}), 500
