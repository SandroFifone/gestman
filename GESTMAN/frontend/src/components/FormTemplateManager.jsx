import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import Modal from './Modal';
import './FormTemplateManager.css';

const FormTemplateManager = ({ isAdmin }) => {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' o 'checklist'
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateFields, setTemplateFields] = useState([]);
  const [availableAssetTypes, setAvailableAssetTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categorieTemplate, setCategorieTemplate] = useState([]);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', label: '' });

  // Checklist states (spostati da CalendarioCompleto)
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState({
    asset_tipo: '',
    nome_voce: '',
    descrizione: ''
  });
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingChecklistItem, setEditingChecklistItem] = useState(null);

  // Modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingField, setEditingField] = useState(null);

  // Form states
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    descrizione: '',
    tipo_categoria: 'ordinario',
    asset_types: []
  });
  
  const [fieldForm, setFieldForm] = useState({
    field_key: '',
    field_label: '',
    field_type: 'text',
    is_required: false,
    display_order: 0,
    field_options: {}
  });

  const [selectOptions, setSelectOptions] = useState([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  const [newAssetType, setNewAssetType] = useState('');

  // Field types disponibili
  const fieldTypes = [
    { value: 'text', label: 'Testo' },
    { value: 'textarea', label: 'Area di testo' },
    { value: 'list', label: 'Elenco puntato' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'select', label: 'Select' },
    { value: 'date', label: 'Data' },
    { value: 'file', label: 'Carica File' }
  ];

  // Categorie template ora sono dinamiche - caricate da API

  useEffect(() => {
    loadTemplates();
    loadAvailableAssetTypes();
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateFields(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  // === LOAD DATA ===
  const loadTemplates = async () => {
    try {
      setLoading(true);
      console.log('Loading templates from:', `${API_URLS.dynamicForms}/templates`);
      const response = await fetch(`${API_URLS.dynamicForms}/templates`);
      const data = await response.json();
      
      console.log('Templates response:', response.ok, data);
      
      if (response.ok) {
        setTemplates(data.templates || []);
        console.log('Templates loaded:', (data.templates || []).length);
      } else {
        setError(data.error || 'Errore nel caricamento template');
        console.error('Error loading templates:', data);
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableAssetTypes = async () => {
    try {
      // Usa lo stesso endpoint di Assets Manager per consistenza
      const response = await fetch('/api/asset-types');
      const data = await response.json();
      
      if (response.ok) {
        setAvailableAssetTypes(data.asset_types || []);
        console.log('Available asset types:', data.asset_types);
      } else {
        console.error('Error loading asset types:', data);
      }
    } catch (err) {
      console.error('Connection error loading asset types:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_URLS.dynamicForms}/categories`);
      const data = await response.json();
      
      if (response.ok) {
        setCategorieTemplate(data.categories || []);
        console.log('Available categories:', data.categories);
      } else {
        console.error('Error loading categories:', data);
      }
    } catch (err) {
      console.error('Connection error loading categories:', err);
    }
  };

  const addCategory = async () => {
    if (!newCategory.name.trim() || !newCategory.label.trim()) {
      setError('Nome e label categoria sono obbligatori');
      return;
    }

    try {
      const response = await fetch(`${API_URLS.dynamicForms}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Categoria aggiunta con successo');
        setNewCategory({ name: '', label: '' });
        loadCategories();
      } else {
        setError(data.error || 'Errore nell\'aggiunta della categoria');
      }
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Errore di connessione');
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

    try {
      const response = await fetch(`${API_URLS.dynamicForms}/categories/${categoryId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Categoria eliminata con successo');
        loadCategories();
      } else {
        setError(data.error || 'Errore nell\'eliminazione della categoria');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Errore di connessione');
    }
  };

  const loadTemplateFields = async (templateId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URLS.dynamicForms}/templates/${templateId}/fields`);
      const data = await response.json();
      
      if (response.ok) {
        setTemplateFields(data.fields || []);
      } else {
        setError(data.error || 'Errore nel caricamento campi');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  // === TEMPLATE MANAGEMENT ===
  const handleCreateTemplate = () => {
    console.log('Creating new template...');
    setEditingTemplate(null);
    setTemplateForm({
      nome: '',
      descrizione: '',
      tipo_categoria: 'ordinario',
      asset_types: []
    });
    setShowTemplateModal(true);
    console.log('Template modal should be visible now');
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateForm({
      nome: template.nome,
      descrizione: template.descrizione,
      tipo_categoria: template.tipo_categoria,
      asset_types: template.asset_types || []
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    try {
      setLoading(true);
      const url = editingTemplate 
        ? `${API_URLS.dynamicForms}/templates/${editingTemplate.id}`
        : `${API_URLS.dynamicForms}/templates`;
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(editingTemplate ? 'Template aggiornato!' : 'Template creato!');
        setShowTemplateModal(false);
        loadTemplates();
      } else {
        // Gestione errori specifici
        let errorMessage = data.error || 'Errore nel salvataggio';
        
        if (errorMessage.includes('UNIQUE constraint failed: form_templates.nome')) {
          errorMessage = `Il nome "${templateForm.nome}" è già utilizzato. Scegli un nome diverso.`;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Sei sicuro di voler disattivare questo template?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URLS.dynamicForms}/templates/${templateId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Template disattivato!');
        loadTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
          setTemplateFields([]);
        }
      } else {
        setError(data.error || 'Errore nella cancellazione');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  // === FIELD MANAGEMENT ===
  const handleCreateField = () => {
    setEditingField(null);
    setFieldForm({
      field_key: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      display_order: templateFields.length,
      field_options: {}
    });
    setSelectOptions([]);
    setNewOptionLabel('');
    setNewOptionValue('');
    setShowFieldModal(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFieldForm({
      field_key: field.field_key,
      field_label: field.field_label,
      field_type: field.field_type,
      is_required: field.is_required,
      display_order: field.display_order,
      field_options: field.field_options || {}
    });
    
    // Se è un campo select, carica le opzioni esistenti
    if (field.field_type === 'select' && field.field_options?.options) {
      // Assicurati che ogni opzione abbia la proprietà generates_alert
      const optionsWithAlert = field.field_options.options.map(opt => ({
        ...opt,
        generates_alert: opt.generates_alert || false
      }));
      setSelectOptions(optionsWithAlert);
    } else {
      setSelectOptions([]);
    }
    
    setShowFieldModal(true);
  };

  // Funzioni per gestire le opzioni del select
  const addSelectOption = () => {
    if (!newOptionLabel.trim() || !newOptionValue.trim()) {
      setError('Inserisci sia etichetta che valore per l\'opzione');
      return;
    }
    
    if (selectOptions.some(opt => opt.value === newOptionValue)) {
      setError('Valore opzione già esistente');
      return;
    }
    
    setSelectOptions(prev => [...prev, {
      label: newOptionLabel.trim(),
      value: newOptionValue.trim(),
      generates_alert: false
    }]);
    
    setNewOptionLabel('');
    setNewOptionValue('');
    setError('');
  };

  const removeSelectOption = (index) => {
    setSelectOptions(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAlert = (index) => {
    setSelectOptions(prev => prev.map((opt, i) => 
      i === index ? { ...opt, generates_alert: !opt.generates_alert } : opt
    ));
  };

  const handleSaveField = async () => {
    if (!selectedTemplate) return;
    
    // Se è un campo select, deve avere almeno un'opzione
    if (fieldForm.field_type === 'select' && selectOptions.length === 0) {
      setError('I campi select devono avere almeno un\'opzione');
      return;
    }
    
    try {
      setLoading(true);
      const url = editingField 
        ? `${API_URLS.dynamicForms}/fields/${editingField.id}`
        : `${API_URLS.dynamicForms}/templates/${selectedTemplate.id}/fields`;
      
      const method = editingField ? 'PUT' : 'POST';
      
      // Prepara i dati del campo, includendo le opzioni select se necessario
      const fieldData = {
        ...fieldForm,
        field_options: fieldForm.field_type === 'select' 
          ? { ...fieldForm.field_options, options: selectOptions }
          : fieldForm.field_options
      };
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fieldData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(editingField ? 'Campo aggiornato!' : 'Campo creato!');
        setShowFieldModal(false);
        loadTemplateFields(selectedTemplate.id);
      } else {
        setError(data.error || 'Errore nel salvataggio');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!confirm('Sei sicuro di voler rimuovere questo campo?')) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URLS.dynamicForms}/fields/${fieldId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Campo rimosso!');
        loadTemplateFields(selectedTemplate.id);
      } else {
        setError(data.error || 'Errore nella rimozione');
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  // === CHECKLIST FUNCTIONS ===
  const caricaChecklistItems = async (assetTipo) => {
    if (!assetTipo) {
      setChecklistItems([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/calendario/manutenzioni/checklist-items/${assetTipo}`);
      const data = await response.json();
      
      if (response.ok) {
        setChecklistItems(data.checklist_items || []);
      } else {
        setError(data.error || "Errore nel caricamento voci checklist");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const salvaChecklistItem = async () => {
    try {
      const response = await fetch("/api/calendario/manutenzioni/checklist-items", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChecklistItem)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Voce checklist aggiunta con successo");
        setShowAddItemModal(false);
        setNewChecklistItem({
          asset_tipo: '',
          nome_voce: '',
          descrizione: ''
        });
        await caricaChecklistItems(selectedAssetType);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Errore nel salvataggio voce checklist");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const eliminaChecklistItem = async (itemId) => {
    if (!confirm("Sei sicuro di voler eliminare questa voce?")) return;
    
    try {
      const response = await fetch(`/api/calendario/manutenzioni/checklist-items/${itemId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSuccess("Voce checklist eliminata con successo");
        await caricaChecklistItems(selectedAssetType);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Errore nell'eliminazione voce checklist");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const editaChecklistItem = (item) => {
    setEditingChecklistItem(item);
    setNewChecklistItem({
      asset_tipo: item.asset_tipo,
      nome_voce: item.nome_voce,
      descrizione: item.descrizione || ''
    });
    setShowAddItemModal(true);
  };

  const modificaChecklistItem = async () => {
    try {
      const response = await fetch(`/api/calendario/manutenzioni/checklist-items/${editingChecklistItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_voce: newChecklistItem.nome_voce,
          descrizione: newChecklistItem.descrizione
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Voce checklist modificata con successo");
        setShowAddItemModal(false);
        setEditingChecklistItem(null);
        setNewChecklistItem({
          asset_tipo: '',
          nome_voce: '',
          descrizione: ''
        });
        await caricaChecklistItems(selectedAssetType);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || "Errore nella modifica voce checklist");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  // === UTILITY FUNCTIONS ===
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  return (
    <div className="form-template-manager">
      <div className="header">
        <h2>🔧 Gestione Form Template</h2>
        <p>Configura i form dinamici per le compilazioni e le checklist di manutenzione</p>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e9ecef', 
        marginBottom: '20px',
        background: '#f8f9fa'
      }}>
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'templates' ? '#007bff' : 'transparent',
            color: activeTab === 'templates' ? 'white' : '#495057',
            cursor: 'pointer',
            borderBottom: activeTab === 'templates' ? '3px solid #007bff' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: activeTab === 'templates' ? 'bold' : 'normal'
          }}
        >
          📋 Form Templates
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'checklist' ? '#007bff' : 'transparent',
            color: activeTab === 'checklist' ? 'white' : '#495057',
            cursor: 'pointer',
            borderBottom: activeTab === 'checklist' ? '3px solid #007bff' : '3px solid transparent',
            fontSize: '16px',
            fontWeight: activeTab === 'checklist' ? 'bold' : 'normal'
          }}
        >
          📅 Forms Scadenze
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={clearMessages} className="close-btn">×</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'templates' && (
        <div className="content-grid">
          {/* Templates List */}
        <div className="templates-panel">
          <div className="card-header">
            <h2 className="card-title">📋 Template Form ({templates.length})</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {isAdmin && (
                <button onClick={handleCreateTemplate} className="btn btn-primary">
                  + Nuovo Template
                </button>
              )}
            </div>
          </div>

          <div className="card-content">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>⏳ Caricamento...</div>}

          {/* Desktop Table */}
          <div className="desktop-only" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome Template</th>
                  <th>Descrizione</th>
                  <th>Tipo Categoria</th>
                  <th>Asset Types</th>
                  <th style={{ textAlign: 'left', minWidth: '200px' }}>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id} className={selectedTemplate?.id === template.id ? 'selected' : ''}>
                    <td style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {template.nome}
                    </td>
                    <td>{template.descrizione}</td>
                    <td>
                      <span className={`badge badge-${template.tipo_categoria}`}>
                        {template.tipo_categoria}
                      </span>
                    </td>
                    <td>{template.asset_types?.join(', ') || 'N/A'}</td>
                    <td>
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexWrap: 'wrap'
                      }}>
                        <button 
                          onClick={() => setSelectedTemplate(template)}
                          className="btn btn-sm btn-primary"
                        >
                          Visualizza
                        </button>
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => handleEditTemplate(template)}
                              className="btn btn-sm btn-outline"
                            >
                              Modifica
                            </button>
                            <button 
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="btn btn-sm btn-danger"
                            >
                              Elimina
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan="5" className="table-empty">
                      Nessun template configurato
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only">
            {templates.map(template => (
              <div key={template.id} className="card-item mobile-card">
                <div className="card-item-header">
                  <span className="card-item-title">{template.nome}</span>
                </div>
                <div className="card-item-body">
                  <p className="card-item-description">{template.descrizione}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    <span className={`badge badge-${template.tipo_categoria}`}>
                      {template.tipo_categoria}
                    </span>
                    {template.asset_types?.length > 0 && (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--gray-600)' }}>
                        {template.asset_types.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="card-item-actions">
                  <button 
                    onClick={() => setSelectedTemplate(template)}
                    className="btn btn-sm btn-primary"
                  >
                    👁️ Visualizza
                  </button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => handleEditTemplate(template)}
                        className="btn btn-sm btn-outline"
                      >
                        ✏️ Modifica
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="btn btn-sm btn-danger"
                      >
                        🗑️ Elimina
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fields Panel */}
        <div className="fields-panel">
          {selectedTemplate ? (
            <>
              <div className="panel-header">
                <h3>⚙️ Campi: {selectedTemplate.nome}</h3>
                <button onClick={handleCreateField} className="btn btn-primary">
                  + Nuovo Campo
                </button>
              </div>

              <div className="fields-list">
                {templateFields.map(field => (
                  <div key={field.id} className="field-card">
                    <div className="field-info">
                      <h4>{field.field_label}</h4>
                      <div className="field-meta">
                        <span className="field-key">Key: {field.field_key}</span>
                        <span className={`badge badge-type-${field.field_type}`}>
                          {field.field_type}
                        </span>
                        {field.is_required && <span className="badge badge-required">Richiesto</span>}
                        <span className="field-order">Ordine: {field.display_order}</span>
                      </div>
                    </div>
                    <div className="field-actions">
                      <button 
                        onClick={() => handleEditField(field)}
                        className="btn btn-sm btn-secondary"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteField(field.id)}
                        className="btn btn-sm btn-danger"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Seleziona un template per vedere i suoi campi</p>
            </div>
          )}
        </div>
        </div>
      </div>
      )}

      {/* Checklist Management Tab */}
      {activeTab === 'checklist' && (
        <Modal
          open={showTemplateModal}
          title={editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
          onClose={() => setShowTemplateModal(false)}
        >
          <div className="form-group">
            <label>Nome Template *</label>
            <input
              type="text"
              value={templateForm.nome}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="es: ordinario_frese"
              required
            />
          </div>

          <div className="form-group">
            <label>Descrizione</label>
            <textarea
              value={templateForm.descrizione}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, descrizione: e.target.value }))}
              placeholder="Descrizione del template"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Categoria *</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <select
                style={{ flex: 1 }}
                value={templateForm.tipo_categoria}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, tipo_categoria: e.target.value }))}
              >
                {categorieTemplate.length > 0 ? (
                  categorieTemplate.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.label}</option>
                  ))
                ) : (
                  <>
                    <option value="ordinario">Ordinario</option>
                    <option value="straordinario">Straordinario</option>
                    <option value="esterno">Esterno</option>
                  </>
                )}
              </select>
              {/* DEBUG: isAdmin = {String(isAdmin)} */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowCategoriesModal(true)}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  Gestisci Categorie
                </button>
              )}
              {/* TEMP: Mostra sempre per test */}
              <button
                type="button"
                onClick={() => setShowCategoriesModal(true)}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: '#007bff', color: 'white' }}
              >
                🔧 Gestisci Categorie (Test)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Tipi Asset Compatibili *</label>
            <div className="asset-types-selector">
              <select
                multiple
                value={templateForm.asset_types}
                onChange={(e) => {
                  const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                  setTemplateForm(prev => ({ ...prev, asset_types: selectedOptions }));
                }}
                size="5"
                className="asset-types-multiselect"
              >
                {availableAssetTypes.map(type => (
                  <option key={type.name} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
              <small>Tieni premuto Ctrl (Windows) o Cmd (Mac) per selezionare più tipi</small>
            </div>
            <div className="selected-asset-types">
              <strong>Selezionati:</strong>
              {templateForm.asset_types.length > 0 ? (
                <div className="asset-types-list">
                  {templateForm.asset_types.map(type => (
                    <span key={type} className="asset-type-tag">
                      {type}
                      <button 
                        type="button"
                        onClick={() => {
                          setTemplateForm(prev => ({
                            ...prev,
                            asset_types: prev.asset_types.filter(t => t !== type)
                          }));
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="no-selection">Nessun tipo selezionato</span>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={() => setShowTemplateModal(false)} className="btn btn-secondary">
              Annulla
            </button>
            <button onClick={handleSaveTemplate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </Modal>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <Modal
          open={showFieldModal}
          title={editingField ? 'Modifica Campo' : 'Nuovo Campo'}
          onClose={() => setShowFieldModal(false)}
        >
          <div className="form-group">
            <label>Chiave Campo *</label>
            <input
              type="text"
              value={fieldForm.field_key}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_key: e.target.value }))}
              placeholder="es: livello_olio_guide"
              required
            />
            <small>Usata per salvare i dati (solo lettere, numeri e underscore)</small>
          </div>

          <div className="form-group">
            <label>Etichetta Campo *</label>
            <textarea
              value={fieldForm.field_label}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_label: e.target.value }))}
              placeholder="Testo che verrà mostrato all'utente"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Tipo Campo *</label>
            <select
              value={fieldForm.field_type}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_type: e.target.value }))}
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ordine Visualizzazione</label>
            <input
              type="number"
              value={fieldForm.display_order}
              onChange={(e) => setFieldForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={fieldForm.is_required}
                onChange={(e) => setFieldForm(prev => ({ ...prev, is_required: e.target.checked }))}
              />
              Campo obbligatorio
            </label>
          </div>

          {/* Gestione opzioni per campo select */}
          {fieldForm.field_type === 'select' && (
            <div className="form-group">
              <label>Opzioni Select *</label>
              <small className="help-text">
                💡 Spunta "🚨 Alert" per le opzioni che devono generare notifiche di non conformità (es: "Negativo", "Critico", "Non Conforme")
              </small>
              
              {/* Aggiunta nuova opzione */}
              <div className="select-option-input">
                <div className="option-inputs">
                  <input
                    type="text"
                    placeholder="Etichetta (mostrata all'utente)"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Valore (salvato nel database)"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={addSelectOption}
                    className="btn btn-sm btn-outline"
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
              
              {/* Lista opzioni esistenti */}
              {selectOptions.length > 0 && (
                <div className="select-options-list">
                  <small>Opzioni configurate:</small>
                  {selectOptions.map((option, index) => (
                    <div key={index} className="option-item">
                      <div className="option-info">
                        <span className="option-label">{option.label}</span>
                        <span className="option-value">({option.value})</span>
                      </div>
                      <div className="option-controls">
                        <label className="alert-checkbox">
                          <input
                            type="checkbox"
                            checked={option.generates_alert || false}
                            onChange={() => toggleAlert(index)}
                          />
                          <span className="alert-label">🚨 Alert</span>
                        </label>
                        <button 
                          type="button"
                          onClick={() => removeSelectOption(index)}
                          className="btn btn-sm btn-danger"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectOptions.length === 0 && (
                <small className="text-muted">Aggiungi almeno un'opzione per il campo select</small>
              )}
            </div>
          )}

          {/* Gestione alert per campo textarea */}
          {fieldForm.field_type === 'textarea' && (
            <div className="form-group">
              <label className="checkbox-group">
                <input
                  type="checkbox"
                  checked={fieldForm.field_options?.generates_alert || false}
                  onChange={(e) => setFieldForm(prev => ({ 
                    ...prev, 
                    field_options: { 
                      ...prev.field_options, 
                      generates_alert: e.target.checked 
                    } 
                  }))}
                />
                🚨 Genera alert quando compilata
              </label>
              <small className="help-text">
                💡 Attiva questa opzione se il campo textarea deve generare un alert di non conformità quando viene compilato (es: "Note problemi", "Osservazioni negative")
              </small>
            </div>
          )}

          {/* Gestione opzioni per campo file */}
          {fieldForm.field_type === 'file' && (
            <div className="form-group">
              <label>Tipi File Accettati</label>
              <input
                type="text"
                placeholder="es: .pdf,.doc,.docx,.jpg,.png"
                value={fieldForm.field_options?.accepted_types || ''}
                onChange={(e) => setFieldForm(prev => ({ 
                  ...prev, 
                  field_options: { 
                    ...prev.field_options, 
                    accepted_types: e.target.value 
                  } 
                }))}
              />
              <small className="help-text">
                💡 Specifica i tipi di file accettati separati da virgola (lascia vuoto per accettare tutti i tipi)
              </small>
              
              <label style={{ marginTop: '10px' }}>Dimensione Massima (MB)</label>
              <input
                type="number"
                min="1"
                max="50"
                placeholder="5"
                value={fieldForm.field_options?.max_size_mb || ''}
                onChange={(e) => setFieldForm(prev => ({ 
                  ...prev, 
                  field_options: { 
                    ...prev.field_options, 
                    max_size_mb: e.target.value 
                  } 
                }))}
              />
              <small className="help-text">
                📁 I file verranno salvati in una sottocartella con il nome del campo nella cartella 'uploads'
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={() => setShowFieldModal(false)} className="btn btn-secondary">
              Annulla
            </button>
            <button onClick={handleSaveField} className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </Modal>
      )}

      {/* Checklist Management Tab */}
      {activeTab === 'checklist' && (
        <div>
          {/* Selezione Tipo Asset */}
          <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#1a237e' }}>
              🎯 Seleziona Tipo Asset per Gestire le Voci Checklist MANUTENZIONI PROGRAMMATE
            </h4>
            <p style={{ margin: '0 0 15px 0', color: '#dc3545', fontSize: '14px' }}>
              ⚠️ Questi controlli sono solo per manutenzioni programmate, non per controlli ordinari
            </p>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <select
                value={selectedAssetType}
                onChange={(e) => {
                  setSelectedAssetType(e.target.value);
                  caricaChecklistItems(e.target.value);
                }}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  borderRadius: '6px', 
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              >
                <option key="" value="">Seleziona un tipo di asset</option>
                {availableAssetTypes.map(type => (
                  <option key={type.name} value={type.name}>{type.name}</option>
                ))}
              </select>
              {selectedAssetType && (
                <button 
                  onClick={() => {
                    setNewChecklistItem({
                      asset_tipo: selectedAssetType,
                      nome_voce: '',
                      descrizione: ''
                    });
                    setShowAddItemModal(true);
                  }}
                  style={{
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  ➕ Aggiungi Voce
                </button>
              )}
            </div>
          </div>

          {/* Voci Checklist per Asset Selezionato */}
          {selectedAssetType && (
            <div style={{ marginBottom: '30px', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#1a237e' }}>
                📋 Voci Checklist MANUTENZIONI PROGRAMMATE per: {selectedAssetType}
              </h4>
              {checklistItems.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '30px',
                  color: '#6c757d'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📝</div>
                  <p>Nessuna voce checklist configurata per questo tipo di asset</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {checklistItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '6px',
                        padding: '12px',
                        background: '#f8f9fa',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#1a237e' }}>{item.nome_voce}</strong>
                        {item.descrizione && (
                          <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
                            {item.descrizione}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => editaChecklistItem(item)}
                          style={{
                            background: '#ffc107',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => eliminaChecklistItem(item.id)}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Aggiungi/Modifica Voce Checklist */}
          {showAddItemModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '8px',
                width: '500px',
                maxWidth: '90vw'
              }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#1a237e' }}>
                  {editingChecklistItem ? 'Modifica Voce Checklist' : 'Nuova Voce Checklist'}
                </h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Nome Voce *
                  </label>
                  <input
                    type="text"
                    value={newChecklistItem.nome_voce}
                    onChange={(e) => setNewChecklistItem({...newChecklistItem, nome_voce: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd' 
                    }}
                    placeholder="es: Pulizia canali di ventilazione"
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Descrizione
                  </label>
                  <textarea
                    value={newChecklistItem.descrizione}
                    onChange={(e) => setNewChecklistItem({...newChecklistItem, descrizione: e.target.value})}
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      borderRadius: '4px', 
                      border: '1px solid #ddd',
                      minHeight: '80px'
                    }}
                    placeholder="Descrizione opzionale della procedura"
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => {
                      setShowAddItemModal(false);
                      setEditingChecklistItem(null);
                      setNewChecklistItem({
                        asset_tipo: '',
                        nome_voce: '',
                        descrizione: ''
                      });
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={editingChecklistItem ? modificaChecklistItem : salvaChecklistItem}
                    disabled={!newChecklistItem.nome_voce.trim()}
                    style={{
                      background: newChecklistItem.nome_voce.trim() ? '#007bff' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: newChecklistItem.nome_voce.trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {editingChecklistItem ? 'Salva Modifiche' : 'Aggiungi Voce'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <Modal
          open={showTemplateModal}
          title={editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
          onClose={() => setShowTemplateModal(false)}
        >
          <div className="form-group">
            <label>Nome Template *</label>
            <input
              type="text"
              value={templateForm.nome}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="es: Controllo Ordinario Fresa"
              required
            />
          </div>

          <div className="form-group">
            <label>Descrizione</label>
            <textarea
              value={templateForm.descrizione}
              onChange={(e) => setTemplateForm(prev => ({ ...prev, descrizione: e.target.value }))}
              placeholder="Descrizione del template..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Categoria *</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <select
                style={{ flex: 1 }}
                value={templateForm.tipo_categoria}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, tipo_categoria: e.target.value }))}
              >
                {categorieTemplate.length > 0 ? (
                  categorieTemplate.map(cat => (
                    <option key={cat.name} value={cat.name}>{cat.label}</option>
                  ))
                ) : (
                  <>
                    <option value="ordinario">Ordinario</option>
                    <option value="straordinario">Straordinario</option>
                    <option value="esterno">Esterno</option>
                  </>
                )}
              </select>
              {/* DEBUG: isAdmin = {String(isAdmin)} */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowCategoriesModal(true)}
                  className="btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '14px' }}
                >
                  Gestisci Categorie
                </button>
              )}
              {/* TEMP: Mostra sempre per test */}
              <button
                type="button"
                onClick={() => {
                  console.log('🔧 Pulsante test cliccato!');
                  console.log('showCategoriesModal prima:', showCategoriesModal);
                  setShowCategoriesModal(true);
                  console.log('setShowCategoriesModal(true) chiamato');
                  setTimeout(() => {
                    console.log('showCategoriesModal dopo 100ms:', showCategoriesModal);
                  }, 100);
                }}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '14px', backgroundColor: '#007bff', color: 'white' }}
              >
                🔧 Gestisci Categorie (Test)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Tipi Asset Compatibili</label>
            <div className="asset-types-selector">
              <div className="selected-types">
                {templateForm.asset_types.map(type => (
                  <span key={type} className="asset-type-tag">
                    {type}
                    <button
                      type="button"
                      onClick={() => setTemplateForm(prev => ({
                        ...prev,
                        asset_types: prev.asset_types.filter(t => t !== type)
                      }))}
                      className="remove-type"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="add-type-section">
                <select
                  value={newAssetType}
                  onChange={(e) => setNewAssetType(e.target.value)}
                  className="asset-type-select"
                >
                  <option value="">Seleziona tipo asset...</option>
                  {availableAssetTypes
                    .filter(type => !templateForm.asset_types.includes(type.name))
                    .map(type => (
                      <option key={type.name} value={type.name}>
                        {type.name}
                      </option>
                    ))
                  }
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (newAssetType.trim() && !templateForm.asset_types.includes(newAssetType.trim())) {
                      setTemplateForm(prev => ({
                        ...prev,
                        asset_types: [...prev.asset_types, newAssetType.trim()]
                      }));
                      setNewAssetType('');
                    }
                  }}
                  className="btn btn-sm btn-secondary"
                  disabled={!newAssetType.trim()}
                >
                  Aggiungi
                </button>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button onClick={() => setShowTemplateModal(false)} className="btn btn-secondary">
              Annulla
            </button>
            <button onClick={handleSaveTemplate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </Modal>
      )}

      {/* Field Modal */}
      {showFieldModal && (
        <Modal
          open={showFieldModal}
          title={editingField ? 'Modifica Campo' : 'Nuovo Campo'}
          onClose={() => setShowFieldModal(false)}
        >
          <div className="form-group">
            <label>Chiave Campo *</label>
            <input
              type="text"
              value={fieldForm.field_key}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_key: e.target.value }))}
              placeholder="es: livello_olio_guide"
              required
            />
            <small>Usata per salvare i dati (solo lettere, numeri e underscore)</small>
          </div>

          <div className="form-group">
            <label>Etichetta Campo *</label>
            <textarea
              value={fieldForm.field_label}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_label: e.target.value }))}
              placeholder="Testo che verrà mostrato all'utente"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Tipo Campo *</label>
            <select
              value={fieldForm.field_type}
              onChange={(e) => setFieldForm(prev => ({ ...prev, field_type: e.target.value }))}
            >
              {fieldTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ordine Visualizzazione</label>
            <input
              type="number"
              value={fieldForm.display_order}
              onChange={(e) => setFieldForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={fieldForm.is_required}
                onChange={(e) => setFieldForm(prev => ({ ...prev, is_required: e.target.checked }))}
              />
              Campo obbligatorio
            </label>
          </div>

          {fieldForm.field_type === 'select' && (
            <div className="form-group">
              <label>Opzioni Select</label>
              <div className="select-options">
                <div className="existing-options">
                  {selectOptions.map((option, index) => (
                    <div key={index} className="option-item">
                      <span>{option.label} = {option.value}</span>
                      <button
                        type="button"
                        onClick={() => setSelectOptions(options => options.filter((_, i) => i !== index))}
                        className="btn btn-sm btn-danger"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="add-option">
                  <input
                    type="text"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    placeholder="Etichetta (mostrata all'utente)"
                  />
                  <input
                    type="text"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    placeholder="Valore (salvato nel database)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newOptionLabel.trim() && newOptionValue.trim()) {
                        setSelectOptions(options => [
                          ...options,
                          { label: newOptionLabel.trim(), value: newOptionValue.trim() }
                        ]);
                        setNewOptionLabel('');
                        setNewOptionValue('');
                      }
                    }}
                    className="btn btn-sm btn-secondary"
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            </div>
          )}

          {fieldForm.field_type === 'textarea' && (
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={fieldForm.field_options?.generates_alert || false}
                  onChange={(e) => setFieldForm(prev => ({ 
                    ...prev, 
                    field_options: { 
                      ...prev.field_options, 
                      generates_alert: e.target.checked 
                    } 
                  }))}
                />
                🚨 Genera alert quando compilata
              </label>
              <small className="help-text">
                💡 Attiva questa opzione se il campo textarea deve generare un alert di non conformità quando viene compilato (es: "Note problemi", "Osservazioni negative")
              </small>
            </div>
          )}

          <div className="modal-actions">
            <button onClick={() => setShowFieldModal(false)} className="btn btn-secondary">
              Annulla
            </button>
            <button onClick={handleSaveField} className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Gestione Categorie */}
      {showCategoriesModal && (
        <Modal
          open={showCategoriesModal}
          title="Gestisci Categorie Template"
          onClose={() => setShowCategoriesModal(false)}
        >
          <div className="categories-management">
            <h4>Aggiungi Nuova Categoria</h4>
            <div className="form-group">
              <label>Nome (identificativo)</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                placeholder="es: sicurezza"
              />
              <small>Identificativo interno (solo lettere minuscole, numeri, underscore)</small>
            </div>
            
            <div className="form-group">
              <label>Etichetta (visualizzata)</label>
              <input
                type="text"
                value={newCategory.label}
                onChange={(e) => setNewCategory(prev => ({ ...prev, label: e.target.value }))}
                placeholder="es: Controllo Sicurezza"
              />
              <small>Nome mostrato all'utente</small>
            </div>

            <button 
              onClick={addCategory} 
              className="btn btn-primary"
              style={{ marginBottom: '20px' }}
            >
              Aggiungi Categoria
            </button>

            <h4>Categorie Esistenti</h4>
            <div className="categories-list">
              {categorieTemplate.map(category => (
                <div key={category.id} className="category-item" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <div>
                    <strong>{category.label}</strong>
                    <br />
                    <small style={{ color: '#666' }}>ID: {category.name}</small>
                  </div>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 8px' }}
                  >
                    Elimina
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button onClick={() => setShowCategoriesModal(false)} className="btn btn-secondary">
              Chiudi
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FormTemplateManager;
