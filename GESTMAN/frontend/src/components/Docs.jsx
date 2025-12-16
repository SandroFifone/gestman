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

  // Imposta date predefinite (ultimo mese)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setFilters(prev => ({
      ...prev,
      date_from: lastMonth.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0]
    }));
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

  const loadRelationships = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/relationships`);
      const data = await response.json();
      if (response.ok) {
        // Il backend restituisce un oggetto con chiavi, convertiamo in array
        if (Array.isArray(data)) {
          setRelationships(data);
        } else if (data && typeof data === 'object') {
          // Combina tutti gli array di relazioni
          const allRelations = [];
          Object.values(data).forEach(relations => {
            if (Array.isArray(relations)) {
              allRelations.push(...relations);
            }
          });
          setRelationships(allRelations);
        } else {
          setRelationships([]);
        }
      } else {
        setRelationships([]);
      }
    } catch (err) {
      console.error('Errore caricamento relazioni:', err);
      setRelationships([]);
    }
  };

  const loadDatabases = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.DOCS}/analyze-databases`);
      const data = await response.json();
      if (response.ok) {
        setDatabases(data);
      } else {
        setError(data.error || 'Errore caricamento database');
      }
    } catch (err) {
      setError('Errore connessione backend');
    } finally {
      setLoading(false);
    }
  };

  const queryTableData = async (dbType, tableName) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.DOCS}/query-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: dbType,
          table: tableName,
          limit: 10
        })
      });
      const data = await response.json();
      if (response.ok) {
        setQueryData(data);
        setSelectedTable({ db: dbType, table: tableName });
      } else {
        setError(data.error || 'Errore query dati');
      }
    } catch (err) {
      setError('Errore query dati');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedQuery = async () => {
    if (!reportConfig.type || loading) return;  // Evita chiamate multiple mentre una è in corso
    
    setLoading(true);
    setError(null);
    
    // Prepara i dati per il backend secondo il formato atteso
    const queryData = {
      type: reportConfig.type, // Il backend si aspetta 'type'
      asset_id: reportConfig.asset_id || null,
      civico: reportConfig.civico || null,
      date_from: reportConfig.date_from || null,
      date_to: reportConfig.date_to || null
    };
    
    console.log('Sending query data:', queryData);
    
    try {
      const response = await fetch(`${API_URLS.DOCS}/advanced-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        console.log('Report data received:', data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
        setError(errorData.error || `Errore ${response.status}: ${response.statusText}`);
        console.error('API Error:', errorData);
      }
    } catch (err) {
      if (err.name === 'SyntaxError') {
        setError('Errore nel formato della risposta del server');
      } else {
        setError('Errore di connessione al server');
      }
      console.error('Errore advanced query:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format = 'json') => {
    if (!reportData) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `report_${reportConfig.type}_${timestamp}.${format}`;
    
    let content, type;
    
    if (format === 'json') {
      content = JSON.stringify(reportData, null, 2);
      type = 'application/json';
    } else if (format === 'csv') {
      // Converti in CSV (basic implementation)
      if (reportData.assets) {
        const headers = Object.keys(reportData.assets[0] || {}).join(',');
        const rows = reportData.assets.map(asset => 
          Object.values(asset).map(val => `"${val || ''}"`).join(',')
        ).join('\n');
        content = headers + '\n' + rows;
      } else {
        content = JSON.stringify(reportData, null, 2);
      }
      type = 'text/csv';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderDatabaseExplorer = () => (
    <div className="database-explorer">
      <div className="explorer-header">
        <h3>🗄️ Esplora Database</h3>
        <p>Analisi dinamica delle strutture dati disponibili</p>
      </div>

      {loading && <div className="loading">Caricamento in corso...</div>}
      {error && <div className="error">⚠️ {error}</div>}

      {databases && (
        <div className="databases-grid">
          {Object.entries(databases.databases).map(([dbName, dbInfo]) => (
            <div key={dbName} className="database-card">
              <h4>📊 {dbName}.db</h4>
              <div className="tables-list">
                {dbInfo.tables.map(table => (
                  <div 
                    key={table.table_name} 
                    className="table-item"
                    onClick={() => queryTableData(dbName, table.table_name)}
                  >
                    <div className="table-name">📋 {table.table_name}</div>
                    <div className="table-info">
                      {table.row_count} righe • {table.columns?.length} colonne
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {queryData && (
        <div className="query-results">
          <h4>📄 Dati: {selectedTable.db}.{selectedTable.table}</h4>
          <div className="results-info">
            {queryData.count} risultati mostrati (limite: 10)
          </div>
          <div className="data-table">
            {queryData.data.length > 0 && (
              <table>
                <thead>
                  <tr>
                    {Object.keys(queryData.data[0]).map(col => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryData.data.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i}>{String(val || '—').substring(0, 50)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderQueryBuilder = () => {
    // Rimuovi log eccessivo che causa rendering multipli
    return (
    <div className="query-builder">
      <div className="query-header">
        <h3>🔍 Generatore di Report Avanzati</h3>
        <p>Crea report dinamici utilizzando relazioni tra i database</p>
      </div>

      <div className="query-config">
        <div className="config-section">
          <label>Tipo di Report:</label>
          <select 
            value={reportConfig.type} 
            onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}
          >
            <option value="asset_summary">Riepilogo Asset</option>
            <option value="maintenance_report">Report Manutenzione</option>
            <option value="alert_analysis">Analisi Alert</option>
          </select>
        </div>

        <div className="config-filters">
          {reportConfig.type === 'asset_summary' && (
            <>
              <div className="filter-group">
                <label>Asset ID (opzionale):</label>
                <input 
                  type="text" 
                  value={reportConfig.asset_id}
                  onChange={(e) => setReportConfig({...reportConfig, asset_id: e.target.value})}
                  placeholder="ID specifico asset"
                />
              </div>
              <div className="filter-group">
                <label>Civico (opzionale):</label>
                <input 
                  type="text" 
                  value={reportConfig.civico}
                  onChange={(e) => setReportConfig({...reportConfig, civico: e.target.value})}
                  placeholder="Numero civico"
                />
              </div>
            </>
          )}

          <div className="filter-group">
            <label>Data inizio:</label>
            <input 
              type="date" 
              value={reportConfig.date_from}
              onChange={(e) => setReportConfig({...reportConfig, date_from: e.target.value})}
            />
          </div>
          
          <div className="filter-group">
            <label>Data fine:</label>
            <input 
              type="date" 
              value={reportConfig.date_to}
              onChange={(e) => setReportConfig({...reportConfig, date_to: e.target.value})}
            />
          </div>
        </div>

        <button 
          className="query-execute-btn"
          onClick={handleAdvancedQuery}
          disabled={loading || !reportConfig.type}
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '⏳ Generazione in corso...' : '📊 Genera Report'}
        </button>
      </div>

      {/* Relazioni database */}
      <div className="relationships-info">
        <h4>🔗 Relazioni Database Rilevate:</h4>
        {relationships && Array.isArray(relationships) && relationships.length > 0 ? (
          <div className="relationships-list">
            {relationships.map((rel, idx) => (
              <div key={idx} className="relationship-item">
                <div className="rel-main">
                  <strong>{rel.from_db}.{rel.from_table}</strong> 
                  <span className="arrow">→</span>
                  <strong>{rel.to_db}.{rel.to_table}</strong>
                </div>
                <div className="rel-details">
                  <em>{rel.relationship_type}</em>
                  <span className="rel-desc">({rel.description})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-relationships">
            <p>📊 Le relazioni verranno mostrate qui quando caricate dal backend...</p>
            <button onClick={loadRelationships} className="reload-btn">
              🔄 Ricarica Relazioni
            </button>
          </div>
        )}
      </div>

      {reportData && (
        <div className="report-results">
          <div className="report-header-actions">
            <h4>📈 Risultati Report</h4>
            <div className="export-buttons">
              <button 
                className="export-btn json-btn"
                onClick={() => downloadReport('json')}
                title="Download JSON"
              >
                📄 JSON
              </button>
              <button 
                className="export-btn csv-btn"
                onClick={() => downloadReport('csv')}
                title="Download CSV"
              >
                📊 CSV
              </button>
            </div>
          </div>
          <div className="report-content">
            {reportConfig.type === 'asset_summary' && (
              <div className="asset-summary">
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Totale Asset:</span>
                    <span className="stat-value">{reportData.asset_count || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Interventi:</span>
                    <span className="stat-value">{reportData.total_interventions || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Alert Attivi:</span>
                    <span className="stat-value">{reportData.active_alerts || 0}</span>
                  </div>
                </div>
                
                {reportData.assets && (
                  <div className="assets-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nome</th>
                          <th>Civico</th>
                          <th>Tipo</th>
                          <th>Interventi</th>
                          <th>Alert</th>
                          <th>Scadenze</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.assets.map((asset, idx) => (
                          <tr key={idx}>
                            <td>{asset.id_aziendale || asset.id || '—'}</td>
                            <td>{asset.nome || asset.descrizione || '—'}</td>
                            <td>{asset.civico_numero || asset.civico || '—'}</td>
                            <td>{asset.tipo_asset || asset.tipo || '—'}</td>
                            <td>{asset.interventi_count || 0}</td>
                            <td>{asset.alert_count || 0}</td>
                            <td>{asset.scadenze_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportConfig.type === 'maintenance_report' && reportData.maintenance && (
              <div className="maintenance-report">
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(reportData.maintenance[0] || {}).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.maintenance.map((row, idx) => (
                        <tr key={idx}>
                          {Object.values(row).map((val, i) => (
                            <td key={i}>{String(val || '—')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportConfig.type === 'alert_analysis' && reportData.alerts && (
              <div className="alert-analysis">
                <div className="alert-stats">
                  <div className="stat-item critical">
                    <span className="stat-label">Critici:</span>
                    <span className="stat-value">{reportData.critical_count || 0}</span>
                  </div>
                  <div className="stat-item warning">
                    <span className="stat-label">Warning:</span>
                    <span className="stat-value">{reportData.warning_count || 0}</span>
                  </div>
                  <div className="stat-item info">
                    <span className="stat-label">Info:</span>
                    <span className="stat-value">{reportData.info_count || 0}</span>
                  </div>
                </div>
                
                <div className="alerts-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Messaggio</th>
                        <th>Criticità</th>
                        <th>Data</th>
                        <th>Asset ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.alerts.map((alert, idx) => (
                        <tr key={idx} className={`alert-${alert.criticita?.toLowerCase()}`}>
                          <td>{alert.tipo}</td>
                          <td>{alert.messaggio}</td>
                          <td>{alert.criticita}</td>
                          <td>{alert.timestamp}</td>
                          <td>{alert.asset_id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documentazione e Report</h2>
        <p>Sistema di generazione documenti dinamici per l'amministrazione aziendale</p>
      </div>

      <div className="section-content">
        <div className="docs-navigation">
          <button 
            className={`nav-btn ${activeView === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveView('explorer')}
          >
            🗄️ Esplora Database
          </button>
          <button 
            className={`nav-btn ${activeView === 'query' ? 'active' : ''}`}
            onClick={() => setActiveView('query')}
          >
            🔍 Report Avanzati
          </button>
        </div>
        {activeView === 'explorer' && renderDatabaseExplorer()}
        {activeView === 'query' && renderQueryBuilder()}
      </div>
    </div>
  );
};

export default Docs;