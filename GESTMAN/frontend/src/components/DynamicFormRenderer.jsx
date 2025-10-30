import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import FileUpload from './FileUpload';

const DynamicFormRenderer = ({ 
  templateId, 
  onSubmit, 
  username, 
  civicoNumero, 
  assetId,
  assetType,
  initialData = {} 
}) => {
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rubricaContacts, setRubricaContacts] = useState([]);

  useEffect(() => {
    if (templateId) {
      loadTemplateAndFields();
      loadRubricaContacts();
    }
  }, [templateId]);

  const loadRubricaContacts = async () => {
    try {
      console.log('Loading rubrica contacts from:', API_URLS.RUBRICA_CONTATTI); // Debug
      const response = await fetch(API_URLS.RUBRICA_CONTATTI);
      if (response.ok) {
        const contacts = await response.json();
        console.log('Loaded contacts:', contacts); // Debug
        setRubricaContacts(contacts);
      } else {
        console.error('Failed to load contacts:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Errore caricamento contatti rubrica:', error);
    }
  };

  useEffect(() => {
    // Inizializza form data con valori predefiniti e dati iniziali
    if (fields.length > 0) {
      const defaultData = {};
      
      fields.forEach(field => {
        const fieldKey = field.field_key;
        
        if (fieldKey === 'operatore') {
          defaultData[fieldKey] = username || '';
        } else if (fieldKey === 'data_intervento') {
          defaultData[fieldKey] = new Date().toISOString().split('T')[0];
        } else if (field.field_type === 'checkbox') {
          defaultData[fieldKey] = '';
        } else if (field.field_type === 'file') {
          defaultData[fieldKey] = []; // Array di file per gestire multipli file
        } else {
          defaultData[fieldKey] = '';
        }
      });
      
      console.log('Default form data:', defaultData); // Debug log
      
      // Solo se formData è vuoto o non ha tutte le chiavi necessarie
      const hasAllKeys = Object.keys(defaultData).every(key => key in formData);
      if (Object.keys(formData).length === 0 || !hasAllKeys) {
        setFormData({ ...defaultData, ...initialData });
      }
    }
  }, [fields]); // Rimosso username e initialData dalle dipendenze per evitare loop

  const loadTemplateAndFields = async () => {
    try {
      setLoading(true);
      setError('');

      // Carica template info
      const templateResponse = await fetch(`${API_URLS.dynamicForms}/templates`);
      const templateData = await templateResponse.json();
      
      if (templateResponse.ok) {
        const currentTemplate = templateData.templates.find(t => t.id === templateId);
        if (currentTemplate) {
          setTemplate(currentTemplate);
        } else {
          setError('Template non trovato');
          return;
        }
      } else {
        setError('Errore nel caricamento template');
        return;
      }

      // Carica campi template
      const fieldsResponse = await fetch(`${API_URLS.dynamicForms}/templates/${templateId}/fields`);
      const fieldsData = await fieldsResponse.json();
      
      console.log('Fields response:', fieldsResponse.ok, fieldsData); // Debug log
      
      if (fieldsResponse.ok) {
        // Trasforma i dati dei campi per compatibilità
        const processedFields = (fieldsData.fields || []).map(field => {
          console.log('Processing field:', field); // Debug log
          
          const processedField = {
            ...field,
            field_key: field.field_key || field.nome,
            field_label: field.field_label || field.etichetta,
            field_type: field.field_type || field.tipo_campo,
            is_required: field.is_required || field.obbligatorio || false,
            display_order: field.display_order || field.ordine_visualizzazione || 0
          };
          
          if (field.field_type === 'select' && field.field_options) {
            try {
              // Parse delle opzioni JSON
              const optionsData = typeof field.field_options === 'string' 
                ? JSON.parse(field.field_options) 
                : field.field_options;
              
              console.log('Parsed options data:', optionsData); // Debug log
              
              // Se le opzioni sono già nella struttura corretta {options: [...]}
              if (optionsData.options) {
                processedField.field_options = optionsData;
              } else {
                // Se sono direttamente un array
                processedField.field_options = {
                  options: Array.isArray(optionsData) ? optionsData : []
                };
              }
            } catch (e) {
              console.error('Errore parsing opzioni select:', e);
              processedField.field_options = { options: [] };
            }
          } else {
            processedField.field_options = {};
          }
          
          console.log('Processed field result:', processedField); // Debug log
          return processedField;
        });
        
        console.log('Processed fields:', processedFields); // Debug log
        setFields(processedFields);
      } else {
        setError('Errore nel caricamento campi');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione campi richiesti
    const requiredFields = fields.filter(field => field.is_required);
    const missingFields = requiredFields.filter(field => 
      !formData[field.field_key] || formData[field.field_key].toString().trim() === ''
    );
    
    if (missingFields.length > 0) {
      setError(`Campi obbligatori mancanti: ${missingFields.map(f => f.field_label).join(', ')}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Prepara i dati per il salvataggio
      console.log('[DEBUG] assetType prop:', assetType); // Debug
      
      const submissionData = {
        template_id: templateId,
        civico_numero: civicoNumero,
        asset_id: assetId,
        asset_type: assetType, // Aggiungiamo il tipo di asset
        operatore: username, // Forza sempre l'username corrente
        data_intervento: formData.data_intervento,
        form_data: {
          ...formData,
          operatore: username // Assicura che l'operatore sia sempre l'username corrente
        }
      };
      
      console.log('[DEBUG] submissionData completa:', submissionData); // Debug

      // Salva nel nuovo sistema dinamico
      const response = await fetch(`${API_URLS.dynamicForms}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      if (response.ok) {
        // Callback con i dati per il sistema esistente (se necessario)
        if (onSubmit) {
          onSubmit(formData);
        }
        
        // Reset form
        setFormData({});
        loadTemplateAndFields(); // Ricarica per resettare valori predefiniti
        
        // Mostra messaggio di successo temporaneo
        setError('');
        alert('Form compilato con successo!');
      } else {
        setError(result.error || 'Errore nel salvataggio');
      }
    } catch (err) {
      setError('Errore di connessione durante il salvataggio');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    console.log('Rendering field:', field); // Debug log
    console.log('Field type:', field.field_type); // Debug specific per il tipo
    
    const { field_key, field_label, field_type, field_options, is_required } = field;
    const value = formData[field_key] || '';

    const baseProps = {
      id: field_key,
      name: field_key,
      required: is_required,
      disabled: submitting
    };

    // Campo operatore readonly e auto-popolato
    if (field_key === 'operatore') {
      return (
        <input
          type="text"
          {...baseProps}
          value={username || ''}
          readOnly
          className="readonly-field"
          placeholder="Auto-popolato con utente corrente"
        />
      );
    }

    console.log('About to switch on field_type:', field_type); // Debug switch
    
    switch (field_type) {
      case 'text':
        return (
          <input
            type="text"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
            placeholder={field_options?.placeholder || ''}
          />
        );

      case 'textarea':
        // Per le textarea, convertiamo i ';' in a capo per la visualizzazione
        const displayValue = value ? value.split(';').join('\n') : '';
        
        return (
          <textarea
            {...baseProps}
            value={displayValue}
            onChange={(e) => {
              // Quando l'utente modifica, riconvertiamo i \n in ;
              const inputValue = e.target.value.replace(/\n/g, ';');
              handleFieldChange(field_key, inputValue);
            }}
            placeholder="Usa ';' per separare le righe. Es: Punto 1;Punto 2;Punto 3"
            rows={field_options?.rows || 4}
          />
        );

      case 'list':
        // Campo elenco puntato con gestione automatica dei bullet points
        const listValue = value ? value.split(';').join('\n') : '';
        
        return (
          <div className="list-field-container">
            <textarea
              {...baseProps}
              value={listValue}
              onChange={(e) => {
                const inputValue = e.target.value.replace(/\n/g, ';');
                handleFieldChange(field_key, inputValue);
              }}
              placeholder="Inserisci ogni elemento su una riga separata"
              rows={field_options?.rows || 5}
              className="list-field"
            />
            <div className="list-preview">
              <strong>Anteprima:</strong>
              <ul>
                {value && value.split(';').filter(item => item.trim()).map((item, index) => (
                  <li key={index}>{item.trim()}</li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="checkbox-group">
            <label className="checkbox-option">
              <input
                type="radio"
                name={field_key}
                value="positivo"
                checked={value === 'positivo'}
                onChange={(e) => handleFieldChange(field_key, e.target.value)}
                disabled={submitting}
              />
              <span className="checkbox-label">Positivo</span>
            </label>
            <label className="checkbox-option">
              <input
                type="radio"
                name={field_key}
                value="negativo"
                checked={value === 'negativo'}
                onChange={(e) => handleFieldChange(field_key, e.target.value)}
                disabled={submitting}
              />
              <span className="checkbox-label">Negativo</span>
            </label>
          </div>
        );

      case 'select':
        let selectOptions = [];
        
        // Gestisce diverse strutture delle opzioni
        if (field.field_options?.options) {
          selectOptions = field.field_options.options;
        } else if (field.field_options) {
          try {
            selectOptions = typeof field.field_options === 'string' 
              ? JSON.parse(field.field_options) 
              : field.field_options;
          } catch (e) {
            console.error('Errore parsing opzioni select:', e);
            selectOptions = [];
          }
        }
        
        console.log('Select options for', field.field_key, ':', selectOptions); // Debug log
        
        return (
          <select
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
          >
            <option value="">Seleziona...</option>
            {selectOptions.map((option, index) => {
              // Gestisce sia oggetti {value, label} che stringhe semplici
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <option key={index} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}
          </select>
        );

      case 'select_rubrica':
        console.log('SELECT RUBRICA CASE TRIGGERED!', 'Contacts:', rubricaContacts); // Debug
        return (
          <select
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
          >
            <option value="">Seleziona contatto...</option>
            {rubricaContacts.map((contact) => (
              <option key={contact.id} value={contact.nome}>
                {contact.nome} ({contact.categoria_nome}) - {contact.email || contact.telefono}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
            min={field_options?.min}
            max={field_options?.max}
            step={field_options?.step}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
            placeholder={field_options?.placeholder || 'email@example.com'}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
            placeholder={field_options?.placeholder || 'https://example.com'}
          />
        );

      case 'file':
        return (
          <FileUpload
            fieldKey={field_key}
            fieldTitle={field_key} // Il titolo principale del campo (nome)
            fieldLabel={field_label} // La descrizione/spiegazione del campo
            compilationId={`temp_${Date.now()}`} // Temporary ID for compilation
            value={value || []}
            onChange={(files) => handleFieldChange(field_key, files)}
            acceptedTypes={field_options?.accepted_types || ''}
            maxSizeMb={field_options?.max_size_mb || 5}
            required={field.is_required}
          />
        );

      default:
        console.log('UNRECOGNIZED FIELD TYPE:', field_type, 'for field:', field_key); // Debug
        return (
          <input
            type="text"
            {...baseProps}
            value={value}
            onChange={(e) => handleFieldChange(field_key, e.target.value)}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="dynamic-form-loading">
        <p>Caricamento form...</p>
      </div>
    );
  }

  if (error && !template) {
    return (
      <div className="dynamic-form-error">
        <p>Errore: {error}</p>
        <button onClick={loadTemplateAndFields}>Riprova</button>
      </div>
    );
  }

  if (!template || fields.length === 0) {
    return (
      <div className="dynamic-form-empty">
        <p>Nessun campo configurato per questo form</p>
      </div>
    );
  }

  return (
    <div className="dynamic-form-container">
      <div className="form-header">
        <h3>{template.descrizione}</h3>
        <span className={`form-category badge-${template.tipo_categoria}`}>
          {template.tipo_categoria}
        </span>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="dynamic-form">
        {fields
          .sort((a, b) => (a.display_order || a.ordine_visualizzazione || 0) - (b.display_order || b.ordine_visualizzazione || 0))
          .map((field, index) => (
            <div key={field.id || index} className="form-group">
              {/* I campi file gestiscono autonomamente titolo e descrizione */}
              {field.field_type !== 'file' && (
                <>
                  <label htmlFor={field.field_key}>
                    {field.field_key}
                    {field.is_required && <span className="required">*</span>}
                  </label>
                  {field.field_label && (
                    <div className="field-description">
                      {field.field_label}
                    </div>
                  )}
                </>
              )}
              {renderField(field)}
            </div>
          ))}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Salvando...' : 'Salva Compilazione'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DynamicFormRenderer;
