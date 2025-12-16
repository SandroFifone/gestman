import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './DocsSimple.css';

const Docs = ({ username, isAdmin }) => {
  const [activeView, setActiveView] = useState('explorer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Stati per database explorer
  const [databases, setDatabases] = useState(null);
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
        setDatabases(data);
        console.log('Database caricati:', data);
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

  // Query dati tabella specifica
  const queryTableData = async (dbName, tableName) => {
    setLoading(true);
    setError(null);
    setSelectedTable({ db: dbName, table: tableName });
    
    try {
      const response = await fetch(`${API_URLS.DOCS}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: dbName,
          table: tableName,
          limit: 10
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueryData(data);
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

  // Download report in vari formati
  const downloadReport = (format = 'json') => {
    if (!reportData) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `report_${reportConfig.type}_${timestamp}.${format}`;
    
    let content, type;
    
    if (format === 'json') {
      content = JSON.stringify(reportData, null, 2);
      type = 'application/json';
    } else if (format === 'csv') {
      // Converti in CSV
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
        <p>Analisi delle strutture dati di gestman.db e compilazioni.db</p>
      </div>

      {loading && <div className="loading">⏳ Caricamento in corso...</div>}
      {error && <div className="error">⚠️ {error}</div>}

      {databases && (
        <div className="databases-grid">
          {Object.entries(databases.databases).map(([dbName, dbInfo]) => (
            <div key={dbName} className="database-card">
              <h4>📊 {dbName}.db</h4>
              <div className="db-info">
                <span className="table-count">{dbInfo.tables.length} tabelle</span>
                <span className="size-info">{dbInfo.size || 'N/A'}</span>
              </div>
              <div className="tables-list">
                {dbInfo.tables.map(table => (
                  <div 
                    key={table.table_name} 
                    className="table-item"
                    onClick={() => queryTableData(dbName, table.table_name)}
                  >
                    <div className="table-name">📋 {table.table_name}</div>
                    <div className="table-info">
                      <span className="row-count">{table.row_count} righe</span>
                      <span className="col-count">{table.columns?.length} colonne</span>
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
          <div className="results-header">
            <h4>📄 Dati: {selectedTable.db}.{selectedTable.table}</h4>
            <div className="results-info">
              Mostrando {queryData.data?.length || 0} di {queryData.count} risultati
            </div>
          </div>
          
          {queryData.data && queryData.data.length > 0 && (
            <div className="data-table">
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
                        <td key={i}>
                          {String(val || '—').length > 50 
                            ? String(val).substring(0, 50) + '...'
                            : String(val || '—')
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderReportBuilder = () => (
    <div className="report-builder">
      <div className="builder-header">
        <h3>📊 Generatore Report Documenti</h3>
        <p>Crea report avanzati combinando dati dai database</p>
      </div>

      <div className="report-config">
        <div className="config-section">
          <label>📝 Tipo di Documento:</label>
          <select 
            value={reportConfig.type} 
            onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}
          >
            <option value="asset_summary">📋 Riepilogo Asset per Civico</option>
            <option value="maintenance_report">🔧 Report Manutenzione</option>
            <option value="alert_analysis">⚠️ Analisi Alert Sistema</option>
            <option value="inventory_report">📦 Report Inventario</option>
            <option value="compliance_report">✅ Report Conformità</option>
          </select>
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