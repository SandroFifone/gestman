import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './Docs.css';

const Docs = ({ username, isAdmin }) => {
  const [activeView, setActiveView] = useState('explorer'); // 'explorer', 'query', 'reports'
  const [databases, setDatabases] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [queryData, setQueryData] = useState(null);
  const [relationships, setRelationships] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    type: 'asset_summary',
    asset_id: '',
    date_from: '',
    date_to: '',
    civico: ''
  });
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    loadDatabases();
    loadRelationships();
    // Imposta date predefinite per l'ultimo mese
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    setReportConfig(prev => ({
      ...prev,
      date_from: lastMonth.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0]
    }));
  }, []);

  const loadRelationships = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/relationships`);
      const data = await response.json();
      if (response.ok) {
        setRelationships(data);
      }
    } catch (err) {
      console.error('Errore caricamento relazioni:', err);
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
    if (!reportConfig.type) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.DOCS}/advanced_query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfig)
      });
      
      const data = await response.json();
      if (response.ok) {
        setReportData(data);
        setError(null); // Reset errore precedente
      } else {
        setError(data.error || 'Errore nella query avanzata');
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error(err);
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

  const renderQueryBuilder = () => (
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
        >
          {loading ? 'Generazione...' : '📊 Genera Report'}
        </button>
      </div>

      {relationships && (
        <div className="relationships-info">
          <h4>🔗 Relazioni Database Rilevate:</h4>
          <div className="relationships-list">
            {relationships.map((rel, idx) => (
              <div key={idx} className="relationship-item">
                <strong>{rel.from_db}.{rel.from_table}</strong> 
                → <em>{rel.relationship_type}</em> → 
                <strong>{rel.to_db}.{rel.to_table}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

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
                            <td>{asset.id}</td>
                            <td>{asset.nome}</td>
                            <td>{asset.civico}</td>
                            <td>{asset.tipo}</td>
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

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documentazione e Report</h2>
        <p>Sistema di generazione documenti dinamici per l'amministrazione aziendale</p>
        
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
      </div>

      <div className="section-content">
        {activeView === 'explorer' && renderDatabaseExplorer()}
        {activeView === 'query' && renderQueryBuilder()}
      </div>
    </div>
  );
};

export default Docs;