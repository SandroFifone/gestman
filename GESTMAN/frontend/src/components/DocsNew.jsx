import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './DocsSimple.css';

const Docs = ({ username, isAdmin }) => {
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Filtri semplificati
  const [filters, setFilters] = useState({
    civico: '',
    date_from: '',
    date_to: ''
  });

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

  // Genera report semplificato
  const generateReport = async (reportType) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryData = {
        type: reportType,
        civico: filters.civico || null,
        date_from: filters.date_from,
        date_to: filters.date_to,
        asset_id: null
      };
      
      console.log('Generazione report:', reportType, queryData);
      
      const response = await fetch(`${API_URLS.DOCS}/advanced-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setReportData({ type: reportType, data });
        console.log('Report generato:', data);
      } else {
        setError(data.error || 'Errore nella generazione del report');
      }
    } catch (err) {
      console.error('Errore API:', err);
      setError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const exportToJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportData.type}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div className="header-content">
          <h2>📊 Sistema Documentazione</h2>
          <p>Genera report e analisi dai dati GESTMAN</p>
        </div>
      </div>

      <div className="section-content">
        {/* Tabs semplificati */}
        <div className="docs-tabs">
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📈 Report Rapidi
          </button>
          <button 
            className={`tab-btn ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            🔍 Filtri
          </button>
        </div>

        {/* Filtri globali */}
        {activeTab === 'filters' && (
          <div className="filters-section">
            <h3>🎯 Filtri Report</h3>
            <div className="filters-grid">
              <div className="filter-item">
                <label>📍 Civico:</label>
                <input
                  type="text"
                  placeholder="es. 142"
                  value={filters.civico}
                  onChange={(e) => setFilters({...filters, civico: e.target.value})}
                />
              </div>
              
              <div className="filter-item">
                <label>📅 Data da:</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                />
              </div>
              
              <div className="filter-item">
                <label>📅 Data a:</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {/* Report rapidi */}
        {activeTab === 'reports' && (
          <div className="reports-section">
            <h3>📊 Report Disponibili</h3>
            
            {/* Cards dei report */}
            <div className="reports-grid">
              <div className="report-card">
                <div className="card-icon">🏢</div>
                <h4>Riepilogo Asset</h4>
                <p>Panoramica completa degli asset con statistiche interventi, alert e scadenze</p>
                <button 
                  className="report-btn primary"
                  onClick={() => generateReport('asset_summary')}
                  disabled={loading}
                >
                  {loading ? '⏳' : '📊'} Genera
                </button>
              </div>
              
              <div className="report-card">
                <div className="card-icon">🔧</div>
                <h4>Manutenzioni</h4>
                <p>Report degli interventi di manutenzione nel periodo selezionato</p>
                <button 
                  className="report-btn primary"
                  onClick={() => generateReport('maintenance_report')}
                  disabled={loading}
                >
                  {loading ? '⏳' : '🔧'} Genera
                </button>
              </div>
              
              <div className="report-card">
                <div className="card-icon">⚠️</div>
                <h4>Analisi Alert</h4>
                <p>Statistiche e analisi degli alert e segnalazioni</p>
                <button 
                  className="report-btn primary"
                  onClick={() => generateReport('alert_analysis')}
                  disabled={loading}
                >
                  {loading ? '⏳' : '⚠️'} Genera
                </button>
              </div>
            </div>

            {/* Errori */}
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            {/* Risultati */}
            {reportData && (
              <div className="results-section">
                <div className="results-header">
                  <h3>📈 Risultati Report: {reportData.type}</h3>
                  <button className="export-btn" onClick={exportToJSON}>
                    💾 Esporta JSON
                  </button>
                </div>

                {/* Riepilogo Asset */}
                {reportData.type === 'asset_summary' && reportData.data && (
                  <div className="asset-summary">
                    <div className="stats-cards">
                      <div className="stat-card">
                        <div className="stat-number">{reportData.data.asset_count || 0}</div>
                        <div className="stat-label">Asset Totali</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{reportData.data.active_alerts || 0}</div>
                        <div className="stat-label">Alert Attivi</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{reportData.data.total_interventions || 0}</div>
                        <div className="stat-label">Interventi</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{reportData.data.total_scadenze || 0}</div>
                        <div className="stat-label">Scadenze</div>
                      </div>
                    </div>

                    {/* Tabella Asset */}
                    {reportData.data.assets && reportData.data.assets.length > 0 && (
                      <div className="data-table-container">
                        <h4>📋 Dettaglio Asset</h4>
                        <div className="data-table">
                          <table>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Descrizione</th>
                                <th>Civico</th>
                                <th>Tipo</th>
                                <th>Interventi</th>
                                <th>Alert</th>
                                <th>Scadenze</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reportData.data.assets.map((asset, idx) => (
                                <tr key={idx}>
                                  <td>{asset.id_aziendale || asset.id || '—'}</td>
                                  <td>{asset.descrizione || asset.nome || '—'}</td>
                                  <td>{asset.civico_numero || asset.civico || '—'}</td>
                                  <td>{asset.tipo_asset || asset.tipo || '—'}</td>
                                  <td>
                                    <span className={asset.interventi_count > 0 ? 'badge success' : 'badge gray'}>
                                      {asset.interventi_count || 0}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={asset.alert_count > 0 ? 'badge warning' : 'badge gray'}>
                                      {asset.alert_count || 0}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={asset.scadenze_count > 0 ? 'badge info' : 'badge gray'}>
                                      {asset.scadenze_count || 0}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Altri tipi di report */}
                {reportData.type !== 'asset_summary' && (
                  <div className="generic-report">
                    <pre>{JSON.stringify(reportData.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Docs;