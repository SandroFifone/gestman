import React, { useState, useRef } from 'react';
import './FloorPlanUpload.css';

const FloorPlanUpload = ({ civicoNumero, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Il file deve essere più piccolo di 10MB');
      return;
    }

    // Verifica estensione
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato non supportato. Usa: PNG, JPG, GIF, SVG, WebP');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/civici/${civicoNumero}/pianta`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Pianta caricata con successo!');
        onUploadSuccess && onUploadSuccess();
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.error || 'Errore durante il caricamento');
      }
    } catch (err) {
      setError('Errore di connessione: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare la pianta di questo civico?')) {
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/civici/${civicoNumero}/pianta`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Pianta eliminata con successo!');
        onUploadSuccess && onUploadSuccess();
      } else {
        setError(data.error || 'Errore durante l\'eliminazione');
      }
    } catch (err) {
      setError('Errore di connessione: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="floor-plan-upload">
      <div className="upload-section">
        <h4>📋 Gestione Pianta Civico</h4>
        
        <div className="upload-info">
          <p><strong>Formati supportati:</strong> PNG, JPG, GIF, SVG, WebP</p>
          <p><strong>Dimensione massima:</strong> 10MB</p>
        </div>

        <div className="upload-controls">
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.gif,.svg,.webp"
            onChange={handleFileUpload}
            disabled={uploading}
            className="file-input"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn btn-primary upload-btn"
          >
            {uploading ? '⏳ Caricamento...' : '📁 Scegli Pianta'}
          </button>

          <button
            onClick={handleDeletePlan}
            disabled={uploading}
            className="btn btn-danger delete-btn"
          >
            🗑️ Elimina Pianta
          </button>
        </div>

        {error && (
          <div className="upload-message error">
            ❌ {error}
          </div>
        )}

        {success && (
          <div className="upload-message success">
            ✅ {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default FloorPlanUpload;
