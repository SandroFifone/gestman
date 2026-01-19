import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './DocsAdvanced.css';
import './QuickAccess.css';

const Docs = ({ username, isAdmin }) => {
  const [activeView, setActiveView] = useState('quick');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Stati per database explorer
  const [databases, setDatabases] = useState({});
  const [queryData, setQueryData] = useState(null);
  const [selectedTable, setSelectedTable] = useState({ db: '', table: '' });
  
  // Stati per report builder
  const [reportConfig, setReportConfig] = useState({
    type: 'asset_summary',
    civico: '',
    asset_id: '',
    date_from: '',
    date_to: ''
  });
  const [reportData, setReportData] = useState(null);
  const [relationships, setRelationships] = useState([]);

  // Carica struttura database all'avvio
  useEffect(() => {
    loadDatabases();
    loadRelationships();
  }, []);

  // Carica database disponibili
  const loadDatabases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_URLS.DOCS}/databases`;
      console.log('Chiamando API:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Struttura completa response:', JSON.stringify(data, null, 2));
        
        // Il backend restituisce {databases: {...}}, quindi estraiamo solo databases
        const databasesData = data.databases || data;
        console.log('Databases estratti:', databasesData);
        
        if (databasesData && typeof databasesData === 'object') {
          console.log('Chiavi databases:', Object.keys(databasesData));
          
          // Verifica struttura per ogni database
          Object.keys(databasesData).forEach(dbName => {
          console.log(`Database ${dbName}:`, databasesData[dbName]);
          console.log(`Tabelle in ${dbName}:`, databasesData[dbName]?.tables?.length || 0);
          if (databasesData[dbName]?.tables?.length > 0) {
            console.log(`Prima tabella di ${dbName}:`, databasesData[dbName].tables[0]);
          }
        });
        }
        
        setDatabases(databasesData || {});
        console.log('Database caricati:', databasesData);
      } else {
        const errorText = await response.text();
        console.error('Errore response:', response.status, errorText);
        throw new Error(`Errore ${response.status}: ${errorText}`);
      }
    } catch (err) {
      console.error('Errore caricamento database:', err);
      setError(`Impossibile caricare database: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Carica relazioni tra tabelle
  const loadRelationships = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/relationships`);
      if (response.ok) {
        const data = await response.json();
        setRelationships(data.relationships || []);
      }
    } catch (err) {
      console.error('Errore caricamento relazioni:', err);
    }
  };

  // Query dati tabella specifica con paginazione
  const queryTableData = async (dbName, tableName, page = 1) => {
    setLoading(true);
    setError(null);
    setSelectedTable({ db: dbName, table: tableName });
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetch(`${API_URLS.DOCS}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: dbName,
          table: tableName,
          limit: itemsPerPage,
          offset: offset,
          page: page
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueryData(data);
        setCurrentPage(page);
      } else {
        throw new Error('Errore nella query');
      }
    } catch (err) {
      console.error('Errore query:', err);
      setError('Errore nel recupero dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Genera report avanzato
  const handleAdvancedQuery = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URLS.DOCS}/advanced-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig)
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
        console.log('Report generato:', data);
      } else {
        throw new Error('Errore nella generazione del report');
      }
    } catch (err) {
      console.error('Errore report:', err);
      setError('Errore nella generazione del report');
    } finally {
      setLoading(false);
    }
  };

  // Genera PDF professionale
  const generatePDF = async () => {
    if (!reportData) return;
    
    setLoading(true);
    try {
      // Prepara i dati per il PDF backend
      const pdfRequest = {
        config: {
          orientation: templateConfig.orientation || 'portrait',
          database: selectedDatabase || 'gestman'
        },
        queryResult: {
          database: selectedDatabase || 'gestman',
          table: selectedTable || 'N/A',
          data: reportData?.data || queryData || []
        },
        templateConfig: {
          title: templateConfig.title || 'Report Database',
          showFooter: templateConfig.showFooter !== false
        }
      };
      
      const response = await fetch(`${API_URLS.DOCS}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfRequest)
      });
      
      if (response.ok) {
        // Scarica il PDF generato
        const blob = await response.blob();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `${templateConfig.title.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Errore nella generazione PDF');
      }
    } catch (err) {
      console.error('Errore PDF:', err);
      setError('Impossibile generare il PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download dati raw per debug  
  const downloadRawData = (format = 'json') => {
    if (!reportData) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `dati_${reportConfig.type}_${timestamp}.${format}`;
    
    let content, type;
    
    if (format === 'json') {
      content = JSON.stringify(reportData, null, 2);
      type = 'application/json';
    } else if (format === 'csv') {
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedDatabase2, setSelectedDatabase2] = useState('');
  const [selectedTable2, setSelectedTable2] = useState('');
  const [selectedTableDetail, setSelectedTableDetail] = useState(null);
  
  // Vista accesso rapido
  const renderQuickAccess = () => (
    <div className="quick-access-panel">
      <div className="quick-header">
        <h3>⚡ Generazione PDF Rapida</h3>
        <p>Seleziona database e tabella per generare immediatamente un PDF</p>
      </div>
      
      <div className="quick-form">
        {!databases || Object.keys(databases).length === 0 ? (
          <div className="form-row">
            <div style={{textAlign: 'center', padding: '20px', color: 'gray'}}>
              Caricamento database in corso...
            </div>
          </div>
        ) : (
          <>
        <div className="form-row">
          <label>Titolo Documento:</label>
          <input 
            type="text"
            value={templateConfig.title || ''}
            onChange={(e) => setTemplateConfig(prev => ({...prev, title: e.target.value}))}
            placeholder="Es: Report Asset Mensile, Analisi Manutenzioni..."
            className="title-input"
          />
        </div>
        
        <div className="form-row">
          <label>Database:</label>
          <select 
            value={selectedDatabase} 
            onChange={(e) => {
              console.log('Selecting database:', e.target.value);
              console.log('Available databases:', databases);
              setSelectedDatabase(e.target.value);
              setSelectedTable(''); // Reset table selection
            }}
          >
            <option value="">Seleziona database</option>
            <option value="gestman">gestman.db</option>
            <option value="compilazioni">compilazioni.db</option>
          </select>
          {databases && (
            <small style={{color: 'gray', marginTop: '4px'}}>
              Debug: Caricati {Object.keys(databases || {}).length} database
            </small>
          )}
        </div>
        
        <div className="form-row">
          <label>Database Secondario (opzionale):</label>
          <select 
            value={selectedDatabase2 || ''} 
            onChange={(e) => setSelectedDatabase2(e.target.value)}
          >
            <option value="">Nessuno (solo tabella principale)</option>
            <option value="gestman" disabled={selectedDatabase === 'gestman'}>gestman.db</option>
            <option value="compilazioni" disabled={selectedDatabase === 'compilazioni'}>compilazioni.db</option>
          </select>
        </div>
        
        {selectedDatabase && (
          <div className="form-row">
            <label>Tabella Principale:</label>
            <select 
              value={selectedTable} 
              onChange={(e) => {
                console.log('Selecting table:', e.target.value);
                setSelectedTable(e.target.value);
              }}
            >
              <option value="">Seleziona tabella</option>
              {(() => {
                console.log('Rendering tables for database:', selectedDatabase);
                console.log('Database object:', databases?.[selectedDatabase]);
                console.log('Tables array:', databases?.[selectedDatabase]?.tables);
                
                const tables = databases?.[selectedDatabase]?.tables;
                if (!tables || tables.length === 0) {
                  return <option disabled>Nessuna tabella trovata</option>;
                }
                
                return tables.map(table => (
                  <option key={table.table_name} value={table.table_name}>
                    {table.table_name} ({table.row_count} righe)
                  </option>
                ));
              })()}
            </select>
            {databases && selectedDatabase && (
              <small style={{color: 'gray', marginTop: '4px'}}>
                Debug: {databases[selectedDatabase]?.tables?.length || 0} tabelle disponibili
              </small>
            )}
          </div>
        )}
        
        {selectedDatabase2 && (
          <div className="form-row">
            <label>Tabella Secondaria:</label>
            <select 
              value={selectedTable2 || ''} 
              onChange={(e) => setSelectedTable2(e.target.value)}
            >
              <option value="">Seleziona tabella</option>
              {databases?.[selectedDatabase2]?.tables.map(table => (
                <option key={table.table_name} value={table.table_name}>
                  {table.table_name} ({table.row_count} righe)
                </option>
              ))}
            </select>
          </div>
        )}
        
        {selectedDatabase && selectedTable && (
          <div className="quick-actions">
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  // Carica i dati della tabella principale
                  const response = await fetch(`${API_URLS.DOCS}/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      database: selectedDatabase,
                      table: selectedTable,
                      limit: 100
                    })
                  });
                  const data = await response.json();
                  
                  let combinedData = data.data || [];
                  let reportSections = [{
                    database: selectedDatabase,
                    table: selectedTable,
                    data: combinedData
                  }];
                  
                  // Se c'è un secondo database, carica anche i suoi dati
                  if (selectedDatabase2 && selectedTable2) {
                    const response2 = await fetch(`${API_URLS.DOCS}/query`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        database: selectedDatabase2,
                        table: selectedTable2,
                        limit: 100
                      })
                    });
                    const data2 = await response2.json();
                    reportSections.push({
                      database: selectedDatabase2,
                      table: selectedTable2,
                      data: data2.data || []
                    });
                  }
                  
                  setQueryData(combinedData);
                  setReportData({
                    ...data,
                    sections: reportSections,
                    multiDb: !!selectedDatabase2
                  });
                  
                  // Genera PDF direttamente
                  await generatePDF();
                } catch (err) {
                  setError('Errore nel caricamento dati: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="primary-export"
              disabled={loading}
            >
              {loading ? (
                <div className="pdf-loading">
                  <div className="loading-spinner"></div>
                  Generazione PDF...
                </div>
              ) : (
                <>📄 Genera PDF Immediato</>
              )}
            </button>
            
            <button 
              onClick={() => setActiveView('reports')}
              className="export-btn secondary"
            >
              🔧 Opzioni Avanzate
            </button>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );

  const renderDatabaseExplorer = () => (
    <div className="database-explorer">
      <div className="explorer-header">
        <div className="header-content">
          <h3>🗄️ Esplorazione Dettagliata Database</h3>
          <p>Naviga e analizza tutti i dati di gestman.db e compilazioni.db</p>
        </div>
        
        {databases && (
          <div className="db-selector">
            <label>Database:</label>
            <select 
              value={selectedDatabase} 
              onChange={(e) => {
                setSelectedDatabase(e.target.value);
                setSelectedTableDetail(null);
                setQueryData(null);
              }}
            >
              <option value="">Seleziona Database</option>
              {databases && typeof databases === 'object' && Object.keys(databases).map(dbName => (
                <option key={dbName} value={dbName}>{dbName}.db</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Caricamento dati...</p>
        </div>
      )}
      
      {error && (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h4>Errore di connessione</h4>
            <p>{error}</p>
            <button onClick={loadDatabases} className="retry-btn">🔄 Riprova</button>
          </div>
        </div>
      )}

      {databases && Object.keys(databases).length > 0 && !selectedDatabase && (
        <div className="databases-overview">
          <h4>📊 Database Disponibili</h4>
          <div className="databases-grid">
            {Object.entries(databases).map(([dbName, dbInfo]) => (
              <div 
                key={dbName} 
                className="database-card clickable"
                onClick={() => setSelectedDatabase(dbName)}
              >
                <div className="card-header">
                  <h5>📊 {dbName}.db</h5>
                  <div className="db-stats">
                    <span className="tables">{dbInfo.tables.length} tabelle</span>
                    <span className="size">{dbInfo.size || 'N/A'}</span>
                  </div>
                </div>
                <div className="tables-preview">
                  {dbInfo.tables.slice(0, 3).map(table => (
                    <div key={table.table_name} className="table-preview">
                      <span className="name">{table.table_name}</span>
                      <span className="count">{table.row_count} righe</span>
                    </div>
                  ))}
                  {dbInfo.tables.length > 3 && (
                    <div className="more-tables">+{dbInfo.tables.length - 3} altre</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {databases && selectedDatabase && (
        <div className="database-detail">
          <div className="detail-header">
            <button 
              className="back-btn"
              onClick={() => {
                setSelectedDatabase('');
                setSelectedTableDetail(null);
                setQueryData(null);
              }}
            >← Indietro</button>
            <h4>📊 {selectedDatabase}.db - Tabelle</h4>
          </div>
          
          <div className="tables-grid">
            {databases.databases[selectedDatabase].tables.map(table => (
              <div 
                key={table.table_name} 
                className={`table-card ${selectedTableDetail?.table_name === table.table_name ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTableDetail(table);
                  queryTableData(selectedDatabase, table.table_name);
                }}
              >
                <div className="table-header">
                  <h6>📋 {table.table_name}</h6>
                  <div className="table-stats">
                    <span className="rows">{table.row_count} righe</span>
                    <span className="cols">{table.columns?.length || 0} colonne</span>
                  </div>
                </div>
                
                {table.columns && (
                  <div className="columns-preview">
                    <strong>Colonne:</strong>
                    <div className="columns-list">
                      {table.columns.slice(0, 4).map((col, idx) => (
                        <span key={idx} className="column-tag">
                          {col.name} ({col.type})
                        </span>
                      ))}
                      {table.columns.length > 4 && (
                        <span className="more-cols">+{table.columns.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {queryData && selectedTableDetail && (
        <div className="table-data-viewer">
          <div className="viewer-header">
            <div className="table-info">
              <h5>📄 {selectedDatabase}.{selectedTableDetail.table_name}</h5>
              <div className="data-stats">
                <span>Totale: {queryData.count} record</span>
                <span>Visualizzati: {queryData.data?.length || 0}</span>
              </div>
            </div>
            
            <div className="view-controls">
              <div className="items-per-page">
                <label>Righe per pagina:</label>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                    queryTableData(selectedDatabase, selectedTableDetail.table_name);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              
              <button 
                className="refresh-btn"
                onClick={() => queryTableData(selectedDatabase, selectedTableDetail.table_name)}
              >
                🔄 Aggiorna
              </button>
            </div>
          </div>
          
          {queryData.data && queryData.data.length > 0 ? (
            <div className="data-table-container">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="row-number">#</th>
                      {queryData?.data?.[0] && Object.keys(queryData.data[0]).map(col => (
                        <th key={col} className="column-header">
                          <div className="column-info">
                            <span className="column-name">{col}</span>
                            <span className="column-type">
                              {selectedTableDetail.columns?.find(c => c.name === col)?.type || 'TEXT'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryData.data.map((row, idx) => (
                      <tr key={idx} className="data-row">
                        <td className="row-number">{idx + 1}</td>
                        {row && Object.entries(row).map(([key, val], i) => (
                          <td key={i} className="data-cell">
                            <div className="cell-content">{val === null || val === undefined ? (
                                <span className="null-value">NULL</span>
                              ) : String(val).length > 100 ? (
                                <>
                                  <span className="truncated">
                                    {String(val).substring(0, 100)}...
                                  </span>
                                  <button 
                                    className="expand-btn"
                                    onClick={() => alert(val)}
                                    title="Vedi tutto"
                                  >
                                    👁️
                                  </button>
                                </>
                              ) : (
                                <span className="full-value">{String(val)}</span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {queryData.count > itemsPerPage && (
                <div className="pagination">
                  <button 
                    className="page-btn"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      setCurrentPage(prev => prev - 1);
                      // Implement pagination logic here
                    }}
                  >
                    ← Precedente
                  </button>
                  
                  <span className="page-info">
                    Pagina {currentPage} di {Math.ceil(queryData.count / itemsPerPage)}
                  </span>
                  
                  <button 
                    className="page-btn"
                    disabled={currentPage >= Math.ceil(queryData.count / itemsPerPage)}
                    onClick={() => {
                      setCurrentPage(prev => prev + 1);
                      // Implement pagination logic here  
                    }}
                  >
                    Successiva →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-table">
              <div className="empty-icon">📭</div>
              <h5>Tabella Vuota</h5>
              <p>Questa tabella non contiene dati</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const [templateConfig, setTemplateConfig] = useState({
    title: 'Documento GESTMAN',
    logo: true,
    header: '',
    footer: 'Generato automaticamente da GESTMAN',
    pageNumbers: true,
    dateTime: true,
    fontSize: '12',
    margins: 'normal',
    orientation: 'portrait',
    columns: 'auto'
  });
  
  const [customTemplate, setCustomTemplate] = useState('');
  const [templateMode, setTemplateMode] = useState('wizard'); // wizard | custom
  
  const renderReportBuilder = () => (
    <div className="report-builder">
      <div className="builder-header">
        <div className="header-content">
          <h3>📄 Creatore Documenti Avanzato</h3>
          <p>Genera documenti personalizzati dai database con template e impaginazione</p>
        </div>
        
        <div className="template-mode-switch">
          <button 
            className={`mode-btn ${templateMode === 'wizard' ? 'active' : ''}`}
            onClick={() => setTemplateMode('wizard')}
          >
            🎯 Guidato
          </button>
          <button 
            className={`mode-btn ${templateMode === 'custom' ? 'active' : ''}`}
            onClick={() => setTemplateMode('custom')}
          >
            🔧 Personalizzato
          </button>
        </div>
      </div>

      {templateMode === 'wizard' && (
        <div className="wizard-mode">
          <div className="config-sections">
            {/* Configurazione Report */}
            <div className="config-section">
              <h4>📊 Tipo di Report</h4>
              <div className="report-types">
                {[
                  { value: 'asset_summary', label: '📋 Riepilogo Asset', desc: 'Asset per civico con dettagli' },
                  { value: 'maintenance_report', label: '🔧 Report Manutenzione', desc: 'Cronologia interventi' },
                  { value: 'alert_analysis', label: '⚠️ Analisi Alert', desc: 'Analisi criticità sistema' },
                  { value: 'inventory_report', label: '📦 Inventario', desc: 'Stato magazzino materiali' },
                  { value: 'compliance_report', label: '✅ Conformità', desc: 'Certificazioni e controlli' },
                  { value: 'custom_query', label: '🔍 Query Personalizzata', desc: 'Query SQL personalizzata' }
                ].map(type => (
                  <div 
                    key={type.value}
                    className={`report-type-card ${reportConfig.type === type.value ? 'selected' : ''}`}
                    onClick={() => setReportConfig({...reportConfig, type: type.value})}
                  >
                    <div className="type-header">
                      <span className="type-label">{type.label}</span>
                    </div>
                    <div className="type-description">{type.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Configurazione Impaginazione */}
            <div className="config-section">
              <h4>📄 Impaginazione e Stile</h4>
              <div className="layout-config">
                <div className="config-row">
                  <div className="config-group">
                    <label>📰 Titolo Documento:</label>
                    <input 
                      type="text"
                      value={templateConfig.title}
                      onChange={(e) => setTemplateConfig({...templateConfig, title: e.target.value})}
                      placeholder="Titolo del documento"
                    />
                  </div>
                  
                  <div className="config-group">
                    <label>📏 Orientamento:</label>
                    <select 
                      value={templateConfig.orientation}
                      onChange={(e) => setTemplateConfig({...templateConfig, orientation: e.target.value})}
                    >
                      <option value="portrait">📄 Verticale</option>
                      <option value="landscape">📄 Orizzontale</option>
                    </select>
                  </div>
                </div>
                
                <div className="config-row">
                  <div className="config-group">
                    <label>📝 Intestazione:</label>
                    <textarea 
                      value={templateConfig.header}
                      onChange={(e) => setTemplateConfig({...templateConfig, header: e.target.value})}
                      placeholder="Testo intestazione personalizzata"
                      rows={2}
                    />
                  </div>
                  
                  <div className="config-group">
                    <label>📝 Piè di pagina:</label>
                    <input 
                      type="text"
                      value={templateConfig.footer}
                      onChange={(e) => setTemplateConfig({...templateConfig, footer: e.target.value})}
                      placeholder="Testo piè di pagina"
                    />
                  </div>
                </div>
                
                <div className="config-row">
                  <div className="config-group">
                    <label>🔤 Dimensione Font:</label>
                    <select 
                      value={templateConfig.fontSize}
                      onChange={(e) => setTemplateConfig({...templateConfig, fontSize: e.target.value})}
                    >
                      <option value="10">Piccolo (10pt)</option>
                      <option value="12">Normale (12pt)</option>
                      <option value="14">Grande (14pt)</option>
                      <option value="16">Molto Grande (16pt)</option>
                    </select>
                  </div>
                  
                  <div className="config-group">
                    <label>📐 Margini:</label>
                    <select 
                      value={templateConfig.margins}
                      onChange={(e) => setTemplateConfig({...templateConfig, margins: e.target.value})}
                    >
                      <option value="narrow">Stretti</option>
                      <option value="normal">Normali</option>
                      <option value="wide">Larghi</option>
                    </select>
                  </div>
                </div>
                
                <div className="config-row">
                  <div className="config-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={templateConfig.logo}
                        onChange={(e) => setTemplateConfig({...templateConfig, logo: e.target.checked})}
                      />
                      🏢 Logo aziendale
                    </label>
                  </div>
                  
                  <div className="config-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={templateConfig.pageNumbers}
                        onChange={(e) => setTemplateConfig({...templateConfig, pageNumbers: e.target.checked})}
                      />
                      📄 Numerazione pagine
                    </label>
                  </div>
                  
                  <div className="config-group checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={templateConfig.dateTime}
                        onChange={(e) => setTemplateConfig({...templateConfig, dateTime: e.target.checked})}
                      />
                      📅 Data e ora generazione
                    </label>
                  </div>
                </div>
              </div>
            </div>

        <div className="config-filters">
          {reportConfig.type === 'asset_summary' && (
            <>
              <div className="filter-group">
                <label>📍 Civico (opzionale):</label>
                <input 
                  type="text" 
                  value={reportConfig.civico}
                  onChange={(e) => setReportConfig({...reportConfig, civico: e.target.value})}
                  placeholder="es. 142"
                />
              </div>
              <div className="filter-group">
                <label>🏷️ Asset ID (opzionale):</label>
                <input 
                  type="text" 
                  value={reportConfig.asset_id}
                  onChange={(e) => setReportConfig({...reportConfig, asset_id: e.target.value})}
                  placeholder="ID specifico asset"
                />
              </div>
            </>
          )}

          <div className="filter-row">
            <div className="filter-group">
              <label>📅 Data inizio:</label>
              <input 
                type="date" 
                value={reportConfig.date_from}
                onChange={(e) => setReportConfig({...reportConfig, date_from: e.target.value})}
              />
            </div>
            
            <div className="filter-group">
              <label>📅 Data fine:</label>
              <input 
                type="date" 
                value={reportConfig.date_to}
                onChange={(e) => setReportConfig({...reportConfig, date_to: e.target.value})}
              />
            </div>
          </div>
        </div>

        <button 
          className="generate-report-btn"
          onClick={handleAdvancedQuery}
          disabled={loading || !reportConfig.type}
        >
          {loading ? '⏳ Generazione...' : '📄 Genera Documento'}
        </button>
      </div>

      {/* Relazioni Database */}
      <div className="relationships-section">
        <h4>🔗 Relazioni Database Rilevate:</h4>
        {relationships && relationships.length > 0 ? (
          <div className="relationships-grid">
            {relationships.map((rel, idx) => (
              <div key={idx} className="relationship-card">
                <div className="rel-connection">
                  <span className="rel-from">{rel.from_db}.{rel.from_table}</span>
                  <span className="rel-arrow">→</span>
                  <span className="rel-to">{rel.to_db}.{rel.to_table}</span>
                </div>
                <div className="rel-type">{rel.relationship_type}</div>
                <div className="rel-description">{rel.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-relationships">
            <p>🔍 Nessuna relazione rilevata automaticamente</p>
            <button onClick={loadRelationships} className="reload-btn">
              🔄 Ricarica
            </button>
          </div>
        )}
      </div>

      {/* Risultati Report */}
      {reportData && (
        <div className="report-results">
          <div className="results-header">
            <h4>📄 Documento Generato</h4>
            <div className="export-actions">
              <button 
                onClick={generatePDF} 
                className="export-btn primary-export"
                disabled={loading}
              >
                {loading ? '⏳ Generando PDF...' : '📑 Scarica PDF'}
              </button>
              
              <div className="secondary-exports">
                <button onClick={() => downloadRawData('json')} className="export-btn secondary">
                  📄 Dati JSON
                </button>
                <button onClick={() => downloadRawData('csv')} className="export-btn secondary">
                  📊 Dati CSV
                </button>
              </div>
            </div>
          </div>
          
          <div className="report-content">
            {reportConfig.type === 'asset_summary' && (
              <div className="asset-summary-report">
                <div className="summary-header">
                  <h5>📋 Riepilogo Asset</h5>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="label">Totale Asset:</span>
                      <span className="value">{reportData.asset_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Interventi:</span>
                      <span className="value">{reportData.total_interventions || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Alert Attivi:</span>
                      <span className="value">{reportData.active_alerts || 0}</span>
                    </div>
                  </div>
                </div>
                
                {reportData.assets && (
                  <div className="assets-detail">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>ID Aziendale</th>
                          <th>Nome</th>
                          <th>Civico</th>
                          <th>Tipo</th>
                          <th>Stato</th>
                          <th>Interventi</th>
                          <th>Alert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.assets.map((asset, idx) => (
                          <tr key={idx}>
                            <td>{asset.id_aziendale || '—'}</td>
                            <td>{asset.nome || asset.descrizione || '—'}</td>
                            <td>{asset.civico_numero || '—'}</td>
                            <td>{asset.tipo_asset || '—'}</td>
                            <td>
                              <span className={`status ${asset.stato?.toLowerCase()}`}>
                                {asset.stato || '—'}
                              </span>
                            </td>
                            <td>{asset.interventi_count || 0}</td>
                            <td>{asset.alert_count || 0}</td>
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
                <h5>🔧 Report Manutenzione</h5>
                <div className="report-table">
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
              <div className="alert-analysis-report">
                <h5>⚠️ Analisi Alert</h5>
                <div className="alert-summary">
                  <div className="alert-stats">
                    <div className="stat critical">Critici: {reportData.critical_count || 0}</div>
                    <div className="stat warning">Warning: {reportData.warning_count || 0}</div>
                    <div className="stat info">Info: {reportData.info_count || 0}</div>
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
                        <th>Asset</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.alerts.map((alert, idx) => (
                        <tr key={idx} className={`alert-${alert.criticita?.toLowerCase()}`}>
                          <td>{alert.tipo}</td>
                          <td>{alert.messaggio}</td>
                          <td>
                            <span className={`priority ${alert.criticita?.toLowerCase()}`}>
                              {alert.criticita}
                            </span>
                          </td>
                          <td>{new Date(alert.timestamp).toLocaleDateString('it-IT')}</td>
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
      
      {/* Configurazione Impaginazione */}
      <div className="config-section">
        <h4>📄 Impaginazione e Stile</h4>
        <div className="layout-config">
          <div className="config-row">
            <div className="config-group">
              <label>📰 Titolo Documento:</label>
              <input 
                type="text"
                value={templateConfig.title}
                onChange={(e) => setTemplateConfig({...templateConfig, title: e.target.value})}
                placeholder="Titolo del documento"
              />
            </div>
            
            <div className="config-group">
              <label>📏 Orientamento:</label>
              <select 
                value={templateConfig.orientation}
                onChange={(e) => setTemplateConfig({...templateConfig, orientation: e.target.value})}
              >
                <option value="portrait">📄 Verticale</option>
                <option value="landscape">📄 Orizzontale</option>
              </select>
            </div>
          </div>
          
          <div className="config-row">
            <div className="config-group">
              <label>📝 Intestazione:</label>
              <textarea 
                value={templateConfig.header}
                onChange={(e) => setTemplateConfig({...templateConfig, header: e.target.value})}
                placeholder="Testo intestazione personalizzata"
                rows={2}
              />
            </div>
            
            <div className="config-group">
              <label>📝 Piè di pagina:</label>
              <input 
                type="text"
                value={templateConfig.footer}
                onChange={(e) => setTemplateConfig({...templateConfig, footer: e.target.value})}
                placeholder="Testo piè di pagina"
              />
            </div>
          </div>
          
          <div className="config-row">
            <div className="config-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={templateConfig.logo}
                  onChange={(e) => setTemplateConfig({...templateConfig, logo: e.target.checked})}
                />
                🏢 Logo aziendale
              </label>
            </div>
            
            <div className="config-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={templateConfig.pageNumbers}
                  onChange={(e) => setTemplateConfig({...templateConfig, pageNumbers: e.target.checked})}
                />
                📄 Numerazione pagine
              </label>
            </div>
            
            <div className="config-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={templateConfig.dateTime}
                  onChange={(e) => setTemplateConfig({...templateConfig, dateTime: e.target.checked})}
                />
                📅 Data e ora generazione
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filtri Dati */}
      <div className="config-section">
        <h4>🎯 Filtri e Parametri</h4>
        <div className="filters-config">
          {reportConfig.type === 'asset_summary' && (
            <>
              <div className="filter-group">
                <label>📍 Civico:</label>
                <input 
                  type="text" 
                  value={reportConfig.civico}
                  onChange={(e) => setReportConfig({...reportConfig, civico: e.target.value})}
                  placeholder="es. 142"
                />
              </div>
              <div className="filter-group">
                <label>🏷️ Asset ID:</label>
                <input 
                  type="text" 
                  value={reportConfig.asset_id}
                  onChange={(e) => setReportConfig({...reportConfig, asset_id: e.target.value})}
                  placeholder="ID specifico asset"
                />
              </div>
            </>
          )}
          
          {reportConfig.type === 'custom_query' && (
            <div className="filter-group full-width">
              <label>🔍 Query SQL:</label>
              <textarea 
                value={reportConfig.customQuery || ''}
                onChange={(e) => setReportConfig({...reportConfig, customQuery: e.target.value})}
                placeholder="SELECT * FROM assets WHERE civico_numero = '142'"
                rows={4}
              />
            </div>
          )}

          <div className="filter-row">
            <div className="filter-group">
              <label>📅 Da:</label>
              <input 
                type="date" 
                value={reportConfig.date_from}
                onChange={(e) => setReportConfig({...reportConfig, date_from: e.target.value})}
              />
            </div>
            
            <div className="filter-group">
              <label>📅 A:</label>
              <input 
                type="date" 
                value={reportConfig.date_to}
                onChange={(e) => setReportConfig({...reportConfig, date_to: e.target.value})}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="generate-section">
        <button 
          className="generate-report-btn primary"
          onClick={handleAdvancedQuery}
          disabled={loading || !reportConfig.type}
        >
          {loading ? '⏳ Generazione...' : '🚀 Genera Documento'}
        </button>
      </div>
      
      {reportData && (
        <div className="report-results">
          <div className="results-header">
            <h4>📄 Documento Generato</h4>
            <div className="export-actions">
              <button onClick={() => downloadReport('json')} className="export-btn">
                📄 JSON
              </button>
              <button onClick={() => downloadReport('csv')} className="export-btn">
                📊 CSV
              </button>
            </div>
          </div>
          
          <div className="report-content">
            {reportConfig.type === 'asset_summary' && (
              <div className="asset-summary-report">
                <div className="summary-header">
                  <h5>📋 Riepilogo Asset</h5>
                  <div className="summary-stats">
                    <div className="stat">
                      <span className="label">Totale Asset:</span>
                      <span className="value">{reportData.asset_count || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Interventi:</span>
                      <span className="value">{reportData.total_interventions || 0}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Alert Attivi:</span>
                      <span className="value">{reportData.active_alerts || 0}</span>
                    </div>
                  </div>
                </div>
                
                {reportData.assets && (
                  <div className="assets-detail">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>ID Aziendale</th>
                          <th>Nome</th>
                          <th>Civico</th>
                          <th>Tipo</th>
                          <th>Stato</th>
                          <th>Interventi</th>
                          <th>Alert</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.assets.map((asset, idx) => (
                          <tr key={idx}>
                            <td>{asset.id_aziendale || '—'}</td>
                            <td>{asset.nome || asset.descrizione || '—'}</td>
                            <td>{asset.civico_numero || '—'}</td>
                            <td>{asset.tipo_asset || '—'}</td>
                            <td>
                              <span className={`status ${asset.stato?.toLowerCase()}`}>
                                {asset.stato || '—'}
                              </span>
                            </td>
                            <td>{asset.interventi_count || 0}</td>
                            <td>{asset.alert_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      )}
      
      {templateMode === 'custom' && (
        <div className="custom-mode">
          <div className="custom-editor">
            <h4>🛠️ Template Personalizzato</h4>
            <p>Crea il tuo template usando variabili dinamiche</p>
            
            <div className="editor-toolbar">
              <div className="variables-help">
                <strong>Variabili disponibili:</strong>
                <div className="variable-buttons">
                  <button onClick={() => setCustomTemplate(prev => prev + '{{civico}}')}>{'{{civico}}'}</button>
                  <button onClick={() => setCustomTemplate(prev => prev + '{{data_oggi}}')}>{'{{data_oggi}}'}</button>
                  <button onClick={() => setCustomTemplate(prev => prev + '{{operatore}}')}>{'{{operatore}}'}</button>
                  <button onClick={() => setCustomTemplate(prev => prev + '{{#assets}}...{{/assets}}')}>{'{{#assets}}'}</button>
                </div>
              </div>
            </div>
            
            <div className="template-editor">
              <div className="editor-section">
                <label>📝 Template Markdown:</label>
                <textarea
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  placeholder="# {{title}}&#10;&#10;**Data:** {{data_oggi}}&#10;**Civico:** {{civico}}&#10;&#10;## Asset&#10;{{#assets}}&#10;- **{{nome}}** ({{id_aziendale}})&#10;  - Tipo: {{tipo_asset}}&#10;  - Stato: {{stato}}&#10;{{/assets}}"
                  rows={15}
                  className="template-textarea"
                />
              </div>
              
              <div className="editor-section">
                <label>👀 Anteprima Live:</label>
                <div className="template-preview">
                  {customTemplate ? (
                    <pre className="preview-content">
                      {customTemplate
                        .replace(/{{title}}/g, templateConfig.title)
                        .replace(/{{data_oggi}}/g, new Date().toLocaleDateString('it-IT'))
                        .replace(/{{civico}}/g, reportConfig.civico || '[civico]')
                        .replace(/{{operatore}}/g, username || '[operatore]')
                        .replace(/{{#assets}}([\s\S]*?){{\/assets}}/g, '- Asset Example\n  - Tipo: Esempio\n  - Stato: Attivo')
                      }
                    </pre>
                  ) : (
                    <div className="empty-preview">
                      <p>Inizia a scrivere il template per vedere l'anteprima</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="custom-actions">
              <button 
                className="save-template-btn"
                onClick={() => {
                  alert('Template personalizzato salvato!');
                }}
                disabled={!customTemplate}
              >
                💾 Salva Template
              </button>
              
              <button 
                className="generate-custom-btn"
                onClick={() => {
                  handleAdvancedQuery();
                }}
                disabled={!customTemplate || loading}
              >
                {loading ? '⏳ Generazione...' : '📄 Genera da Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documenti da Database</h2>
        <p>Genera documentazione automatica dai dati gestman.db e compilazioni.db</p>
      </div>

      <div className="section-content">
        <div className="docs-navigation">
          <button 
            className={`nav-btn ${activeView === 'quick' ? 'active' : ''}`}
            onClick={() => setActiveView('quick')}
          >
            ⚡ PDF Rapido
          </button>
          <button 
            className={`nav-btn ${activeView === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveView('explorer')}
          >
            🗄️ Esplora Database
          </button>
          <button 
            className={`nav-btn ${activeView === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveView('reports')}
          >
            📊 Genera Documenti
          </button>
        </div>

        {activeView === 'quick' && renderQuickAccess()}
        {activeView === 'explorer' && renderDatabaseExplorer()}
        {activeView === 'reports' && renderReportBuilder()}
        
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