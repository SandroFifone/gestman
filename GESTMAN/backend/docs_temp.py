@bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Errore interno del server'}), 500