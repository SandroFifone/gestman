import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';

const FormSelector = ({ 
  civicoNumero, 
  assetType, 
  assetId, 
  onFormSelect, 
  selectedTemplateId 
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (assetType) {
      loadCompatibleTemplates();
    }
  }, [assetType]);

  const loadCompatibleTemplates = async () => {
    try {
      setLoading(true);
      setError('');

      // Usiamo query parameter invece di path parameter per evitare problemi con caratteri speciali
      const response = await fetch(`${API_URLS.dynamicForms}/templates/by-asset-type?asset_type=${encodeURIComponent(assetType)}`);
      const data = await response.json();
      
      if (response.ok) {
        setTemplates(data.templates || []);
      } else {
        setError(data.error || 'Errore nel caricamento template');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (onFormSelect) {
      onFormSelect(templateId, selectedTemplate);
    }
  };

  if (loading) {
    return (
      <div className="form-selector-loading">
        <p>Caricamento form disponibili...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-selector-error">
        <p>Errore: {error}</p>
        <button onClick={loadCompatibleTemplates}>Riprova</button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="form-selector-empty">
        <p>Nessun form disponibile per il tipo di asset: <strong>{assetType}</strong></p>
        <p>Contatta l'amministratore per configurare i form.</p>
      </div>
    );
  }

  return (
    <div className="form-selector-container">
      <div className="selector-header">
        <h3>Seleziona il tipo di form</h3>
        <p>
          Asset: <strong>{assetId}</strong> - Tipo: <strong>{assetType}</strong>
        </p>
      </div>

      <div className="templates-grid">
        {templates.map((template) => (
          <div 
            key={template.id}
            className={`template-option ${selectedTemplateId === template.id ? 'selected' : ''}`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <div className="template-info">
              <h4>{template.nome.replace(/_/g, ' ').toUpperCase()}</h4>
              <p>{template.descrizione}</p>
              <span className={`template-category badge-${template.tipo_categoria}`}>
                {template.tipo_categoria}
              </span>
            </div>
            <div className="template-assets">
              <small>Compatibile con: {template.asset_types.join(', ')}</small>
            </div>
          </div>
        ))}
      </div>

      {selectedTemplateId && (
        <div className="selection-summary">
          <p>
            ✅ Form selezionato: 
            <strong>
              {templates.find(t => t.id === selectedTemplateId)?.nome.replace(/_/g, ' ')}
            </strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default FormSelector;
