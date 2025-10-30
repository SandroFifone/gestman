import React, { useState } from 'react';
import { API_URLS } from '../config/api';
import './FileUpload.css';

const FileUpload = ({ 
  fieldKey, 
  fieldLabel, 
  fieldTitle, // Questo sarà il nome/titolo principale del campo (da field_key)
  compilationId, 
  value = [], 
  onChange, 
  acceptedTypes = '', 
  maxSizeMb = 5,
  required = false 
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;

    const file = files[0]; // Per ora supportiamo un file alla volta
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    if (!compilationId) {
      setError('ID compilazione non disponibile');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field_label', fieldTitle || fieldKey); // Usa fieldTitle (da field_key) per il nome della cartella
      formData.append('compilation_id', compilationId);
      
      if (acceptedTypes) {
        formData.append('accepted_types', acceptedTypes);
      }
      
      if (maxSizeMb) {
        formData.append('max_size_mb', maxSizeMb.toString());
      }

      const response = await fetch(`${API_URLS.dynamicForms}/upload-file`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        // Aggiungi il file alla lista
        const newFiles = [...(value || []), data.file_info];
        onChange(newFiles);
      } else {
        setError(data.error || 'Errore durante l\'upload');
      }
    } catch (err) {
      setError('Errore di connessione durante l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (fileIndex, fileInfo) => {
    try {
      // Rimuovi dal server se il file è già stato caricato
      if (fileInfo.folder && fileInfo.filename) {
        await fetch(`${API_URLS.dynamicForms}/delete-file/${fileInfo.folder}/${fileInfo.filename}`, {
          method: 'DELETE'
        });
      }

      // Rimuovi dalla lista locale
      const newFiles = value.filter((_, index) => index !== fileIndex);
      onChange(newFiles);
    } catch (err) {
      console.error('Errore nella rimozione file:', err);
      // Rimuovi comunque dalla lista locale
      const newFiles = value.filter((_, index) => index !== fileIndex);
      onChange(newFiles);
    }
  };

  const downloadFile = (fileInfo) => {
    if (fileInfo.folder && fileInfo.filename) {
      const downloadUrl = `${API_URLS.dynamicForms}/download-file/${fileInfo.folder}/${fileInfo.filename}`;
      window.open(downloadUrl, '_blank');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload-field">
        <label className="file-upload-label">
          {fieldTitle || fieldKey} {required && <span className="required">*</span>}
        </label>
        {fieldLabel && (
          <div className="field-description">
            {fieldLabel}
          </div>
        )}

        {/* Area di upload */}
        <div 
          className={`file-upload-area ${dragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={acceptedTypes}
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={uploading}
            className="file-input"
            id={`file-${fieldKey}`}
          />
          
          <label htmlFor={`file-${fieldKey}`} className="file-upload-content">
            {uploading ? (
              <div className="upload-progress">
                <div className="spinner"></div>
                <span>Caricamento in corso...</span>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">📎</div>
                <div className="upload-text">
                  <strong>Clicca per selezionare</strong> o trascina qui il file
                </div>
                {acceptedTypes && (
                  <div className="upload-hint">
                    Tipi accettati: {acceptedTypes}
                  </div>
                )}
                {maxSizeMb && (
                  <div className="upload-hint">
                    Dimensione massima: {maxSizeMb}MB
                  </div>
                )}
              </div>
            )}
          </label>
        </div>

        {/* Messaggio di errore */}
        {error && (
          <div className="file-upload-error">
            ⚠️ {error}
          </div>
        )}

        {/* Lista file caricati */}
        {value && value.length > 0 && (
          <div className="uploaded-files">
            <h4>File caricati:</h4>
            {value.map((fileInfo, index) => (
              <div key={index} className="uploaded-file">
                <div className="file-info">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <div className="file-name">{fileInfo.original_name || fileInfo.filename}</div>
                    <div className="file-meta">
                      {formatFileSize(fileInfo.size)} • Caricato
                    </div>
                  </div>
                </div>
                <div className="file-actions">
                  <button
                    type="button"
                    onClick={() => downloadFile(fileInfo)}
                    className="btn-download"
                    title="Scarica file"
                  >
                    📥
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(index, fileInfo)}
                    className="btn-remove"
                    title="Rimuovi file"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;