import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './DocumentHistory.css';

const DocumentHistory = ({ currentUser }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    civico: '',
    dateFrom: '',
    dateTo: '',
    generatedBy: '',
    relatedType: ''
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchDocuments();
  }, [filters, page]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),  // API usa page 1-based, frontend usa 0-based
        limit: limit.toString()
      });
      
      if (filters.civico) params.append('civico', filters.civico);
      if (filters.dateFrom) params.append('from', filters.dateFrom);
      if (filters.dateTo) params.append('to', filters.dateTo);
      if (filters.generatedBy) params.append('generated_by', filters.generatedBy);
      if (filters.relatedType) params.append('related_type', filters.relatedType);
      
      const response = await fetch(`${API_URLS.DOCS}/history?${params}`);
      
      if (!response.ok) {
        throw new Error('Errore caricamento storico documenti');
      }
      
      const data = await response.json();
      // Fix paginazione API: ora formato {data: [...], pagination: {...}}
      setDocuments(data.data || data.documents || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch (err) {
      setError(err.message);
      console.error('Errore fetch documenti:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0); // Reset alla prima pagina
  };

  const handleResetFilters = () => {
    setFilters({
      civico: '',
      dateFrom: '',
      dateTo: '',
      generatedBy: '',
      relatedType: ''
    });
    setPage(0);
  };

  const handleDownload = async (historyId, filename) => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/download/${historyId}`);
      
      if (!response.ok) {
        throw new Error('Errore download documento');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Errore download: ${err.message}`);
    }
  };

  const handleDelete = async (historyId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URLS.DOCS}/history/${historyId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Errore eliminazione documento');
      }
      
      // Ricarica lista
      fetchDocuments();
    } catch (err) {
      alert(`Errore eliminazione: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('it-IT');
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const getRelatedTypeLabel = (type) => {
    const labels = {
      'submission': 'Compilazione',
      'scadenza': 'Scadenza',
      'alert': 'Alert',
      'multi': 'Multiplo',
      'manual': 'Manuale'
    };
    return labels[type] || type || 'N/A';
  };

  return (
    <div className="document-history">
      <div className="document-history-header">
        <h2>Storico Documenti Generati</h2>
        <button 
          className="btn btn-primary"
          onClick={fetchDocuments}
          disabled={loading}
        >
          {loading ? 'Caricamento...' : '🔄 Aggiorna'}
        </button>
      </div>

      {/* Filtri */}
      <div className="document-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Civico"
            value={filters.civico}
            onChange={(e) => handleFilterChange('civico', e.target.value)}
          />
          
          <input
            type="text"
            placeholder="Generato da (username)"
            value={filters.generatedBy}
            onChange={(e) => handleFilterChange('generatedBy', e.target.value)}
          />
          
          <select
            value={filters.relatedType}
            onChange={(e) => handleFilterChange('relatedType', e.target.value)}
          >
            <option value="">Tutti i tipi</option>
            <option value="submission">Compilazione</option>
            <option value="scadenza">Scadenza</option>
            <option value="alert">Alert</option>
            <option value="multi">Multiplo</option>
            <option value="manual">Manuale</option>
          </select>
        </div>
        
        <div className="filter-row">
          <label>
            Da:
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </label>
          
          <label>
            A:
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </label>
          
          <button 
            className="btn btn-secondary"
            onClick={handleResetFilters}
          >
            Reimposta filtri
          </button>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* Tabella documenti */}
      {!loading && documents.length === 0 ? (
        <div className="no-documents">
          Nessun documento trovato
        </div>
      ) : (
        <>
          <div className="documents-table-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Data Generazione</th>
                  <th>Titolo</th>
                  <th>Generato da</th>
                  <th>Civico</th>
                  <th>Asset</th>
                  <th>Periodo</th>
                  <th>Tipo</th>
                  <th>Dimensione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>{formatDate(doc.generated_at)}</td>
                    <td>{doc.title || doc.filename}</td>
                    <td>{doc.generated_by}</td>
                    <td>{doc.civico_numero || '-'}</td>
                    <td>{doc.asset_id || '-'}</td>
                    <td>
                      {doc.periodo_inizio && doc.periodo_fine
                        ? `${doc.periodo_inizio} - ${doc.periodo_fine}`
                        : '-'}
                    </td>
                    <td>{getRelatedTypeLabel(doc.related_type)}</td>
                    <td>{formatFileSize(doc.file_size_bytes)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleDownload(doc.id, doc.filename)}
                          title="Scarica PDF"
                        >
                          📄 Apri
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(doc.id)}
                          title="Elimina documento"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginazione */}
          <div className="pagination">
            <span>
              Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, total)} di {total}
            </span>
            <div className="pagination-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ← Precedente
              </button>
              <span>Pagina {page + 1}</span>
              <button
                className="btn btn-secondary"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= total}
              >
                Successiva →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentHistory;
