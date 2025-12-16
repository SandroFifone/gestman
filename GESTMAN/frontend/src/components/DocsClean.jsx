import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './DocsSimple.css';

const Docs = ({ username, isAdmin }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Stati per template
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Rapporto Manutenzione Civico",
      description: "Template per rapporti di manutenzione per civico specifico",
      content: "# Rapporto Manutenzione - Civico {{civico}}\n\n**Data:** {{data_oggi}}\n**Operatore:** {{operatore}}\n\n## Asset Installati\n{{#assets}}\n- **{{nome}}** (ID: {{id_aziendale}})\n  - Tipo: {{tipo_asset}}\n  - Stato: {{stato}}\n  - Interventi: {{interventi_count}}\n  - Alert: {{alert_count}}\n{{/assets}}\n\n## Riepilogo Interventi\nTotale interventi nel periodo: {{total_interventi}}",
      variables: ['civico', 'data_oggi', 'operatore', 'assets'],
      created: '2025-12-16'
    },
    {
      id: 2, 
      name: "Certificato Asset",
      description: "Certificato di conformità per singolo asset",
      content: "# CERTIFICATO DI CONFORMITÀ\n\n**Asset:** {{asset.nome}}\n**ID Aziendale:** {{asset.id_aziendale}}\n**Civico:** {{asset.civico_numero}}\n**Tipo:** {{asset.tipo_asset}}\n\n## Controlli Effettuati\n**Data ultimo controllo:** {{ultimo_controllo}}\n**Operatore:** {{operatore}}\n**Esito:** {{esito}}\n\n## Note\n{{note}}\n\n---\n*Documento generato automaticamente il {{data_oggi}}*",
      variables: ['asset', 'ultimo_controllo', 'operatore', 'esito', 'note', 'data_oggi'],
      created: '2025-12-15'
    }
  ]);
  
  const [currentTemplate, setCurrentTemplate] = useState({
    name: '',
    description: '',
    content: '',
    variables: []
  });
  
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [templateData, setTemplateData] = useState({});

  // useEffect per inizializzazione se necessario
  useEffect(() => {
    // Inizializzazione del componente
  }, []);

  // Salva template
  const saveTemplate = () => {
    if (!currentTemplate.name || !currentTemplate.content) {
      setError('Nome e contenuto del template sono obbligatori');
      return;
    }
    
    const newTemplate = {
      id: Date.now(),
      ...currentTemplate,
      created: new Date().toISOString().split('T')[0],
      variables: extractVariables(currentTemplate.content)
    };
    
    setTemplates([...templates, newTemplate]);
    setCurrentTemplate({ name: '', description: '', content: '', variables: [] });
    setActiveTab('templates');
    console.log('Template salvato:', newTemplate);
  };

  // Estrai variabili dal template
  const extractVariables = (content) => {
    const matches = content.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
  };

  // Genera documento da template
  const generateDocument = async (template) => {
    setLoading(true);
    setError(null);
    
    try {
      // Ottieni dati reali dal backend se necessario
      let realData = {};
      
      if (templateData.civico) {
        const response = await fetch(`${API_URLS.DOCS}/advanced-query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'asset_summary',
            civico: templateData.civico,
            date_from: null,
            date_to: null,
            asset_id: null
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          realData.assets = data.assets || [];
          realData.total_interventi = data.total_interventions || 0;
        }
      }
      
      // Combina dati template con dati reali
      const allData = {
        ...templateData,
        ...realData,
        data_oggi: new Date().toLocaleDateString('it-IT'),
        operatore: username || 'Sistema'
      };
      
      // Sostituisci variabili nel template
      let processedContent = template.content;
      
      // Sostituzioni semplici
      Object.entries(allData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          processedContent = processedContent.replace(regex, value);
        }
      });
      
      // Sostituzioni per array ({{#assets}})
      if (allData.assets && Array.isArray(allData.assets)) {
        const assetsRegex = /\{\{#assets\}\}([\s\S]*?)\{\{\/assets\}\}/g;
        processedContent = processedContent.replace(assetsRegex, (match, itemTemplate) => {
          return allData.assets.map(asset => {
            let itemContent = itemTemplate;
            Object.entries(asset).forEach(([key, value]) => {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
              itemContent = itemContent.replace(regex, value || '—');
            });
            return itemContent;
          }).join('');
        });
      }
      
      setGeneratedDoc({
        template: template.name,
        content: processedContent,
        data: allData,
        generated_at: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Errore generazione documento:', err);
      setError('Errore nella generazione del documento');
    } finally {
      setLoading(false);
    }
  };

  // Esporta documento
  const exportDocument = (format = 'md') => {
    if (!generatedDoc) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `documento_${generatedDoc.template}_${timestamp}.${format}`;
    
    let content = generatedDoc.content;
    let type = 'text/markdown';
    
    if (format === 'txt') {
      content = content.replace(/[#*_`]/g, '').replace(/\n\n+/g, '\n\n');
      type = 'text/plain';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div className="header-content">
          <h2>📝 Creatore Template Documenti</h2>
          <p>Crea template personalizzati per documenti automatici con dati GESTMAN</p>
        </div>
      </div>

      <div className="section-content">
        <div className="docs-tabs">
          <button 
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            📝 I Miei Template
          </button>
          <button 
            className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            ➕ Crea Nuovo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            📄 Genera Documento
          </button>
        </div>

        {/* Lista Template Esistenti */}
        {activeTab === 'templates' && (
          <div className="templates-section">
            <div className="section-header-actions">
              <h3>📝 I Tuoi Template</h3>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('create')}
              >
                ➕ Nuovo Template
              </button>
            </div>
            
            <div className="templates-grid">
              {templates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <h4>📄 {template.name}</h4>
                    <div className="template-actions">
                      <button 
                        className="btn-edit"
                        onClick={() => {
                          setCurrentTemplate(template);
                          setActiveTab('create');
                        }}
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-generate"
                        onClick={() => {
                          setCurrentTemplate(template);
                          setActiveTab('generate');
                        }}
                        title="Genera Documento"
                      >
                        🚀
                      </button>
                    </div>
                  </div>
                  
                  <p className="template-description">{template.description}</p>
                  
                  <div className="template-meta">
                    <div className="variables-list">
                      <strong>Variabili:</strong>
                      <div className="variable-tags">
                        {template.variables.slice(0, 3).map(variable => (
                          <span key={variable} className="variable-tag">
                            {variable}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="variable-tag more">
                            +{template.variables.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="template-date">
                      Creato: {template.created}
                    </div>
                  </div>
                  
                  <div className="template-preview">
                    <strong>Anteprima:</strong>
                    <div className="preview-content">
                      {template.content.substring(0, 100)}...
                    </div>
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h4>Nessun template creato</h4>
                  <p>Crea il tuo primo template personalizzato per generare documenti automatici</p>
                  <button 
                    className="btn-primary"
                    onClick={() => setActiveTab('create')}
                  >
                    ➕ Crea Primo Template
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor Template */}
        {activeTab === 'create' && (
          <div className="create-section">
            <h3>✨ {currentTemplate.id ? 'Modifica Template' : 'Crea Nuovo Template'}</h3>
            
            <div className="template-form">
              <div className="form-row">
                <div className="form-group">
                  <label>📝 Nome Template:</label>
                  <input
                    type="text"
                    placeholder="es. Rapporto Manutenzione Civico"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>📄 Descrizione:</label>
                  <input
                    type="text"
                    placeholder="Breve descrizione del template"
                    value={currentTemplate.description}
                    onChange={(e) => setCurrentTemplate({...currentTemplate, description: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>📃 Contenuto Template:</label>
                <div className="template-help">
                  <strong>Variabili disponibili:</strong>
                  <div className="help-variables">
                    <code>{'{{civico}}'}</code> - Numero civico
                    <code>{'{{data_oggi}}'}</code> - Data di oggi
                    <code>{'{{operatore}}'}</code> - Nome operatore
                    <code>{'{{#assets}} ... {{/assets}}'}</code> - Lista asset
                  </div>
                </div>
                <textarea
                  placeholder="# Il Mio Documento&#10;&#10;**Civico:** {{civico}}&#10;**Data:** {{data_oggi}}&#10;**Operatore:** {{operatore}}&#10;&#10;## Asset&#10;{{#assets}}&#10;- **{{nome}}** ({{id_aziendale}})&#10;  - Tipo: {{tipo_asset}}&#10;  - Interventi: {{interventi_count}}&#10;{{/assets}}"
                  value={currentTemplate.content}
                  onChange={(e) => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                  rows={15}
                />
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setCurrentTemplate({ name: '', description: '', content: '', variables: [] });
                    setActiveTab('templates');
                  }}
                >
                  ❌ Annulla
                </button>
                <button 
                  className="btn-primary"
                  onClick={saveTemplate}
                  disabled={!currentTemplate.name || !currentTemplate.content}
                >
                  💾 Salva Template
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generatore Documenti */}
        {activeTab === 'generate' && (
          <div className="generate-section">
            <h3>🚀 Genera Documento</h3>
            
            {currentTemplate.id ? (
              <div className="generate-form">
                <div className="template-info">
                  <h4>📄 Template: {currentTemplate.name}</h4>
                  <p>{currentTemplate.description}</p>
                </div>
                
                <div className="data-inputs">
                  <h4>🎯 Dati per il Documento</h4>
                  <div className="inputs-grid">
                    <div className="input-group">
                      <label>📍 Civico:</label>
                      <input
                        type="text"
                        placeholder="es. 142"
                        value={templateData.civico || ''}
                        onChange={(e) => setTemplateData({...templateData, civico: e.target.value})}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>👤 Operatore:</label>
                      <input
                        type="text"
                        placeholder="Nome operatore"
                        value={templateData.operatore || ''}
                        onChange={(e) => setTemplateData({...templateData, operatore: e.target.value})}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>📝 Note:</label>
                      <textarea
                        placeholder="Note aggiuntive per il documento"
                        value={templateData.note || ''}
                        onChange={(e) => setTemplateData({...templateData, note: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  <div className="generate-actions">
                    <button 
                      className="btn-primary generate-btn"
                      onClick={() => generateDocument(currentTemplate)}
                      disabled={loading}
                    >
                      {loading ? '⏳ Generazione...' : '🚀 Genera Documento'}
                    </button>
                  </div>
                </div>
                
                {generatedDoc && (
                  <div className="document-result">
                    <div className="result-header">
                      <h4>📄 Documento Generato</h4>
                      <div className="export-actions">
                        <button 
                          className="btn-export"
                          onClick={() => exportDocument('md')}
                        >
                          📄 Markdown
                        </button>
                        <button 
                          className="btn-export"
                          onClick={() => exportDocument('txt')}
                        >
                          📝 Testo
                        </button>
                      </div>
                    </div>
                    
                    <div className="document-preview">
                      <pre>{generatedDoc.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-template">
                <div className="empty-icon">📄</div>
                <h4>Seleziona un Template</h4>
                <p>Scegli un template dalla lista per generare un documento</p>
                <button 
                  className="btn-primary"
                  onClick={() => setActiveTab('templates')}
                >
                  📝 Vai ai Template
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Docs;