import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import './AssetsManager.css'; // Riutilizziamo lo stesso stile

const AssetTypesManager = () => {
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [viewingType, setViewingType] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({
    name: '',
    fields_template: {}
  });
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState(''); // Per le opzioni select

  const fieldTypes = [
    { value: 'text', label: 'Testo' },
    { value: 'number', label: 'Numero' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Data' },
    { value: 'textarea', label: 'Area di testo' },
    { value: 'list', label: 'Elenco puntato' },
    { value: 'select', label: 'Selezione' },
    { value: 'select_rubrica', label: 'Rubrica Contatti' }
  ];

  useEffect(() => {
    loadAssetTypes();
  }, []);

  const loadAssetTypes = async () => {
    try {
      const response = await fetch('/api/asset-types');
      if (response.ok) {
        const data = await response.json();
        setAssetTypes(data.asset_types);
      } else {
        throw new Error('Errore nel caricamento dei tipi asset');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = () => {
    console.log('handleCreateType called');
    setEditingType(null);
    setTypeForm({
      name: '',
      fields_template: {}  // Inizia vuoto, id_aziendale verrà aggiunto automaticamente dal backend
    });
    setShowModal(true);
    console.log('Modal should be shown, showModal:', true);
  };

  const handleViewFields = (assetType) => {
    setViewingType(assetType);
    setShowFieldsModal(true);
  };

  const handleEditType = (assetType) => {
    setEditingType(assetType);
    
    // Ricostruisci fields_template nell'ordine corretto usando fields_order
    const originalTemplate = assetType.fields_template || {};
    const fieldsOrder = assetType.fields_order || Object.keys(originalTemplate);
    
    // Ricostruisci l'oggetto nell'ordine specificato da fields_order
    let orderedTemplate = {};
    fieldsOrder.forEach(fieldName => {
      if (originalTemplate[fieldName]) {
        orderedTemplate[fieldName] = originalTemplate[fieldName];
      }
    });
    
    // Se non c'è id_aziendale, lo aggiungiamo come primo
    if (!orderedTemplate.id_aziendale) {
      const idAziendaleField = {
        type: 'text',
        required: true
      };
      // Ricostruisci con id_aziendale primo
      orderedTemplate = {
        id_aziendale: idAziendaleField,
        ...orderedTemplate
      };
    }
    
    setTypeForm({
      name: assetType.name,
      fields_template: orderedTemplate
    });
    setShowModal(true);
  };

  const addField = () => {
    if (!newFieldName.trim()) return;
    
    // Impedisce l'aggiunta duplicata del campo id_aziendale
    if (newFieldName.toLowerCase() === 'id_aziendale') {
      alert('Il campo "Id Aziendale" è già presente di default.');
      return;
    }

    // Validazione per campi select
    if (newFieldType === 'select' && !newFieldOptions.trim()) {
      alert('Per i campi di tipo "Selezione" devi specificare le opzioni separate da virgole.');
      return;
    }
    
    setTypeForm(prev => {
      // Manteniamo id_aziendale sempre come primo campo
      const currentTemplate = prev.fields_template;
      const idAziendaleField = currentTemplate.id_aziendale;
      const otherFields = { ...currentTemplate };
      delete otherFields.id_aziendale;
      
      // Prepara la configurazione del campo
      const fieldConfig = {
        type: newFieldType,
        required: false
      };

      // Aggiungi opzioni se è un campo select
      if (newFieldType === 'select' && newFieldOptions.trim()) {
        const options = newFieldOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
        fieldConfig.options = options;
      }
      
      return {
        ...prev,
        fields_template: {
          id_aziendale: idAziendaleField, // Sempre primo
          ...otherFields, // Altri campi esistenti
          [newFieldName]: fieldConfig // Nuovo campo
        }
      };
    });
    
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldOptions(''); // Reset opzioni
  };

  const removeField = (fieldName) => {
    // Impedisce la rimozione del campo id_aziendale
    if (fieldName === 'id_aziendale') {
      alert('Il campo "Id Aziendale" è obbligatorio e non può essere rimosso.');
      return;
    }
    
    setTypeForm(prev => {
      const newTemplate = { ...prev.fields_template };
      delete newTemplate[fieldName];
      
      // Riorganizza mantenendo id_aziendale sempre primo
      const idAziendaleField = newTemplate.id_aziendale;
      const otherFields = { ...newTemplate };
      delete otherFields.id_aziendale;
      
      return {
        ...prev,
        fields_template: {
          id_aziendale: idAziendaleField,
          ...otherFields
        }
      };
    });
  };

  const toggleFieldRequired = (fieldName) => {
    setTypeForm(prev => ({
      ...prev,
      fields_template: {
        ...prev.fields_template,
        [fieldName]: {
          ...prev.fields_template[fieldName],
          required: !prev.fields_template[fieldName].required
        }
      }
    }));
  };

  const editFieldOptions = (fieldName) => {
    const fieldConfig = typeForm.fields_template[fieldName];
    if (fieldConfig.type !== 'select') {
      alert('Solo i campi di tipo "Selezione" possono avere opzioni modificabili.');
      return;
    }

    const currentOptions = fieldConfig.options ? fieldConfig.options.join(', ') : '';
    const newOptions = prompt('Inserisci le opzioni separate da virgole:', currentOptions);
    
    if (newOptions !== null) { // null se l'utente annulla
      const optionsArray = newOptions.split(',').map(opt => opt.trim()).filter(opt => opt);
      
      setTypeForm(prev => ({
        ...prev,
        fields_template: {
          ...prev.fields_template,
          [fieldName]: {
            ...prev.fields_template[fieldName],
            options: optionsArray
          }
        }
      }));
    }
  };

  // Funzioni per riordinare i campi (escludendo id_aziendale)
  const moveFieldUp = (fieldName) => {
    setTypeForm(prev => {
      // Lavoriamo solo sui campi visibili (escluso id_aziendale)
      const visibleFields = Object.entries(prev.fields_template).filter(([name]) => name !== 'id_aziendale');
      const currentIndex = visibleFields.findIndex(([name]) => name === fieldName);
      
      if (currentIndex <= 0) return prev; // Già in cima o non trovato
      
      // Scambia con l'elemento precedente
      [visibleFields[currentIndex - 1], visibleFields[currentIndex]] = 
      [visibleFields[currentIndex], visibleFields[currentIndex - 1]];
      
      // Ricostruisci l'oggetto: id_aziendale sempre primo, poi i campi riordinati
      const reorderedFields = {};
      if (prev.fields_template.id_aziendale) {
        reorderedFields.id_aziendale = prev.fields_template.id_aziendale;
      }
      visibleFields.forEach(([name, config]) => {
        reorderedFields[name] = config;
      });
      
      return {
        ...prev,
        fields_template: reorderedFields
      };
    });
  };

  const moveFieldDown = (fieldName) => {
    setTypeForm(prev => {
      // Lavoriamo solo sui campi visibili (escluso id_aziendale)
      const visibleFields = Object.entries(prev.fields_template).filter(([name]) => name !== 'id_aziendale');
      const currentIndex = visibleFields.findIndex(([name]) => name === fieldName);
      
      if (currentIndex >= visibleFields.length - 1 || currentIndex === -1) return prev; // Già in fondo o non trovato
      
      // Scambia con l'elemento successivo
      [visibleFields[currentIndex], visibleFields[currentIndex + 1]] = 
      [visibleFields[currentIndex + 1], visibleFields[currentIndex]];
      
      // Ricostruisci l'oggetto: id_aziendale sempre primo, poi i campi riordinati
      const reorderedFields = {};
      if (prev.fields_template.id_aziendale) {
        reorderedFields.id_aziendale = prev.fields_template.id_aziendale;
      }
      visibleFields.forEach(([name, config]) => {
        reorderedFields[name] = config;
      });
      
      return {
        ...prev,
        fields_template: reorderedFields
      };
    });
  };

  const handleSaveType = async () => {
    try {
      const url = editingType 
        ? `/api/asset-types/${editingType.id}`
        : '/api/asset-types';
      
      const method = editingType ? 'PUT' : 'POST';
      
      // Convertiamo fields_template in un formato che preservi l'ordine
      const fieldsArray = Object.entries(typeForm.fields_template).map(([name, config]) => ({
        name,
        ...config
      }));
      
      const payload = {
        ...typeForm,
        fields_template: typeForm.fields_template, // Manteniamo l'oggetto originale
        fields_order: fieldsArray // Aggiungiamo l'array ordinato
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const responseData = await response.json();
        setShowModal(false);
        loadAssetTypes();
        setError('');
        
        // Mostra messaggi informativi sui campi rimossi
        if (responseData.removed_fields && responseData.removed_fields.length > 0) {
          const removedFieldsText = responseData.removed_fields.join(', ');
          const assetsUpdated = responseData.assets_updated || 0;
          alert(`✅ Tipo asset aggiornato!\n\n📋 Campi rimossi: ${removedFieldsText}\n🔄 Asset aggiornati: ${assetsUpdated}\n\nI campi rimossi sono stati eliminati da tutti gli asset esistenti di questo tipo.`);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      setError('Errore nella comunicazione con il server');
    }
  };

  const handleDeleteType = async (typeId, typeName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare il tipo asset "${typeName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/asset-types/${typeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadAssetTypes();
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      setError('Errore nella comunicazione con il server');
    }
  };

  if (loading) return <div className="loading">Caricamento tipi asset...</div>;

  return (
    <div className="assets-manager">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        🏷️ Gestione Tipi Asset
      </h2>

      {error && (
        <div style={{ background: 'var(--error-light)', color: 'var(--error-dark)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-md)', marginBottom: 'var(--spacing-lg)' }}>
          ❌ {error}
        </div>
      )}

      {/* Lista tipi asset */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏷️ Tipi Asset Configurati ({assetTypes.length})</h3>
          <button onClick={handleCreateType} className="btn btn-primary">
            + Nuovo Tipo Asset
          </button>
        </div>
        
        {assetTypes.length === 0 ? (
          <div style={{ 
            color: 'var(--gray-600)', 
            fontStyle: 'italic', 
            textAlign: 'center', 
            padding: 'var(--spacing-4xl)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--border-radius-lg)'
          }}>
            Nessun tipo asset configurato
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome Tipo</th>
                    <th>Campi Configurati</th>
                    <th>Data Creazione</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {assetTypes.map(type => (
                    <tr key={type.id}>
                      <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                        {type.name}
                      </td>
                      <td>
                        {(() => {
                          const fieldsOrder = type.fields_order || Object.keys(type.fields_template);
                          const fieldsCount = fieldsOrder.filter(fieldName => fieldName !== 'id_aziendale').length;
                          return (
                            <span style={{ color: 'var(--primary-color)', fontWeight: 'var(--font-weight-medium)' }}>
                              {fieldsCount} {fieldsCount === 1 ? 'campo' : 'campi'}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)' }}>
                        {new Date(type.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                          <button 
                            onClick={() => handleViewFields(type)}
                            className="btn btn-info btn-sm"
                            title="Visualizza campi configurati"
                          >
                            👁️ Vedi
                          </button>
                          <button 
                            onClick={() => handleEditType(type)}
                            className="btn btn-secondary btn-sm"
                            title="Modifica tipo asset"
                          >
                            ✏️ Modifica
                          </button>
                          <button 
                            onClick={() => handleDeleteType(type.id, type.name)}
                            className="btn btn-danger btn-sm"
                            title="Elimina tipo asset"
                          >
                            🗑️ Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-only">
              {assetTypes.map(type => (
                <div key={type.id} className="card-item mobile-card">
                  <div className="card-item-header">
                    <span className="card-item-title">{type.name}</span>
                  </div>
                  <div className="card-item-body">
                    <div className="card-item-info">
                      <span className="info-label">Campi:</span>
                      <span className="info-value">
                        {(() => {
                          const fieldsOrder = type.fields_order || Object.keys(type.fields_template);
                          const fieldsCount = fieldsOrder.filter(fieldName => fieldName !== 'id_aziendale').length;
                          return `${fieldsCount} ${fieldsCount === 1 ? 'campo' : 'campi'}`;
                        })()}
                      </span>
                    </div>
                    <div className="card-item-info">
                      <span className="info-label">Creato:</span>
                      <span className="info-value">{new Date(type.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="card-item-actions">
                    <button 
                      onClick={() => handleViewFields(type)}
                      className="btn btn-info btn-sm"
                    >
                      👁️ Vedi
                    </button>
                    <button 
                      onClick={() => handleEditType(type)}
                      className="btn btn-secondary btn-sm"
                    >
                      ✏️ Modifica
                    </button>
                    <button 
                      onClick={() => handleDeleteType(type.id, type.name)}
                      className="btn btn-danger btn-sm"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal per creazione/modifica */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <h3>{editingType ? 'Modifica Tipo Asset' : 'Nuovo Tipo Asset'}</h3>
          
          <div className="form-group">
            <label>Nome Tipo *</label>
            <input
              type="text"
              value={typeForm.name}
              onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="es: Frese, Torni, Gru..."
              required
            />
          </div>

          <div className="form-group">
            <label>Campi Dinamici</label>
            
            {/* Aggiungi nuovo campo */}
            <div className="add-field-section">
              <div className="add-field-inputs">
                <input
                  type="text"
                  placeholder="Nome campo"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                />
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                >
                  {fieldTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                
                {/* Campo opzioni per select */}
                {newFieldType === 'select' && (
                  <input
                    type="text"
                    placeholder="Separa con ,"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    style={{ 
                      gridColumn: '1 / -1', 
                      marginTop: '8px',
                      fontSize: '0.9rem',
                      padding: '8px'
                    }}
                  />
                )}
                
                <button 
                  type="button"
                  onClick={addField}
                  className="btn btn-sm btn-primary"
                >
                  + Aggiungi
                </button>
              </div>
            </div>

            {/* Lista campi esistenti */}
            <div className="existing-fields">
              {Object.keys(typeForm.fields_template).filter(name => name !== 'id_aziendale').length > 0 ? (
                Object.entries(typeForm.fields_template)
                  .filter(([fieldName]) => fieldName !== 'id_aziendale') // Nascondi id_aziendale dall'interfaccia
                  .map(([fieldName, fieldConfig]) => (
                  <div key={fieldName} className="field-item">
                    <div className="field-info">
                      <strong>{fieldName}</strong>
                      <span className="field-type">({fieldConfig.type})</span>
                      {fieldConfig.type === 'select' && fieldConfig.options && (
                        <div className="field-options">
                          <small>Opzioni: {fieldConfig.options.join(', ')}</small>
                        </div>
                      )}
                    </div>
                    <div className="field-controls">
                      <div className="reorder-buttons">
                        <button
                          type="button"
                          onClick={() => moveFieldUp(fieldName)}
                          className="btn btn-sm btn-secondary"
                          disabled={Object.keys(typeForm.fields_template).filter(name => name !== 'id_aziendale').indexOf(fieldName) === 0}
                          title="Sposta su"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFieldDown(fieldName)}
                          className="btn btn-sm btn-secondary"
                          disabled={Object.keys(typeForm.fields_template).filter(name => name !== 'id_aziendale').indexOf(fieldName) === Object.keys(typeForm.fields_template).filter(name => name !== 'id_aziendale').length - 1}
                          title="Sposta giù"
                        >
                          ↓
                        </button>
                      </div>
                      <label className="checkbox-inline">
                        <input
                          type="checkbox"
                          checked={fieldConfig.required}
                          onChange={() => toggleFieldRequired(fieldName)}
                        />
                        Obbligatorio
                      </label>
                      
                      {/* Pulsante per modificare opzioni select */}
                      {fieldConfig.type === 'select' && (
                        <button
                          type="button"
                          onClick={() => editFieldOptions(fieldName)}
                          className="btn btn-sm btn-info"
                          title="Modifica opzioni"
                        >
                          📝 Opzioni
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => removeField(fieldName)}
                        className="btn btn-sm btn-danger"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-fields">Nessun campo configurato</p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={() => setShowModal(false)} className="btn btn-secondary">
              Annulla
            </button>
            <button onClick={handleSaveType} className="btn btn-primary">
              {editingType ? 'Aggiorna' : 'Crea'} Tipo Asset
            </button>
          </div>
        </Modal>

      {/* Modal per visualizzazione campi */}
      <Modal open={showFieldsModal} onClose={() => setShowFieldsModal(false)}>
        <h3>📋 Campi configurati per: {viewingType?.name}</h3>
        
        <div className="fields-view">
          {viewingType && (() => {
            const fieldsOrder = viewingType.fields_order || Object.keys(viewingType.fields_template);
            const fieldsTemplate = viewingType.fields_template;
            const fieldsToShow = fieldsOrder.filter(fieldName => fieldName !== 'id_aziendale');
            
            if (fieldsToShow.length === 0) {
              return (
                <div className="no-fields-message">
                  <p>ℹ️ Nessun campo aggiuntivo configurato per questo tipo di asset.</p>
                  <p><small>Questo tipo di asset utilizza solo il campo ID Aziendale standard.</small></p>
                </div>
              );
            }
            
            return (
              <div className="fields-details">
                <div className="fields-header">
                  <p><strong>Campi configurati:</strong> {fieldsToShow.length}</p>
                </div>
                
                <div className="fields-list-detailed">
                  {fieldsToShow.map((fieldName, index) => {
                    const fieldConfig = fieldsTemplate[fieldName];
                    if (!fieldConfig) return null;
                    
                    return (
                      <div key={fieldName} className="field-detail-item">
                        <div className="field-number">{index + 1}</div>
                        <div className="field-detail-content">
                          <div className="field-name-section">
                            <strong className="field-name">{fieldName}</strong>
                            <span className="field-type-badge">{fieldConfig.type}</span>
                            {fieldConfig.required && (
                              <span className="required-badge">Obbligatorio</span>
                            )}
                          </div>
                          
                          {fieldConfig.type === 'select' && fieldConfig.options && (
                            <div className="field-options-detail">
                              <span className="options-label">Opzioni disponibili:</span>
                              <div className="options-list">
                                {fieldConfig.options.map((option, optIndex) => (
                                  <span key={optIndex} className="option-item">
                                    {option}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {fieldConfig.type === 'select_rubrica' && (
                            <div className="field-info-detail">
                              <span className="info-text">Campo collegato alla rubrica contatti</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        
        <div className="modal-actions">
          <button onClick={() => setShowFieldsModal(false)} className="btn btn-primary">
            Chiudi
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AssetTypesManager;
