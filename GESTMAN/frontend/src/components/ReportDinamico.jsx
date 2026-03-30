import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import { useCustomModal } from '../hooks/useCustomModal';
import CustomModal from './CustomModal';
import './ReportDinamico.css';

// Configurazione fonti dati disponibili
const DATA_SOURCES = [
  { 
    key: 'form_submissions', 
    label: '📝 Interventi / Form Compilati',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'template_id', label: 'Tipo Form', type: 'number' },
      { key: 'civico_numero', label: 'Civico', type: 'text' },
      { key: 'asset_id', label: 'Asset', type: 'text' },
      { key: 'operatore', label: 'Operatore', type: 'text' },
      { key: 'created_at', label: 'Data Creazione', type: 'date' },
      { key: 'stato', label: 'Stato', type: 'select', options: ['bozza', 'inviato', 'approvato'] }
    ],
    recommendedColumns: [
      { key: 'civico_numero', label: 'Civico' },
      { key: 'asset_id', label: 'Asset' },
      { key: 'operatore', label: 'Operatore' },
      { key: 'created_at', label: 'Data Creazione' },
      { key: 'stato', label: 'Stato' }
    ]
  },
  { 
    key: 'alert', 
    label: '⚠️ Alert e Non Conformità',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'tipo', label: 'Tipo', type: 'select', options: ['non_conformita', 'scadenza', 'Tickets'] },
      { key: 'titolo', label: 'Titolo', type: 'text' },
      { key: 'civico', label: 'Civico', type: 'text' },
      { key: 'asset', label: 'Asset', type: 'text' },
      { key: 'operatore', label: 'Operatore', type: 'text' },
      { key: 'stato', label: 'Stato', type: 'select', options: ['aperto', 'in_carico', 'chiuso'] },
      { key: 'data_creazione', label: 'Data Creazione', type: 'date' },
      { key: 'data_chiusura', label: 'Data Chiusura', type: 'date' }
    ],
    recommendedColumns: [
      { key: 'tipo', label: 'Tipo Alert' },
      { key: 'titolo', label: 'Titolo' },
      { key: 'civico', label: 'Civico' },
      { key: 'asset', label: 'Asset' },
      { key: 'stato', label: 'Stato' },
      { key: 'operatore', label: 'Operatore' },
      { key: 'data_creazione', label: 'Data Creazione' }
    ]
  },
  { 
    key: 'scadenze_calendario', 
    label: '📅 Scadenze e Manutenzioni',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'civico', label: 'Civico', type: 'text' },
      { key: 'asset', label: 'Asset', type: 'text' },
      { key: 'asset_tipo', label: 'Tipo Asset', type: 'text' },
      { key: 'data_scadenza', label: 'Data Scadenza', type: 'date' },
      { key: 'stato', label: 'Stato', type: 'select', options: ['programmata', 'completata', 'posticipata'] },
      { key: 'frequenza_tipo', label: 'Frequenza', type: 'text' },
      { key: 'operatore_completamento', label: 'Operatore', type: 'text' }
    ],
    recommendedColumns: [
      { key: 'civico', label: 'Civico' },
      { key: 'asset', label: 'Asset' },
      { key: 'asset_tipo', label: 'Tipo Asset' },
      { key: 'data_scadenza', label: 'Data Scadenza' },
      { key: 'stato', label: 'Stato' },
      { key: 'frequenza_tipo', label: 'Frequenza' }
    ]
  },
  { 
    key: 'magazzino', 
    label: '🔧 Magazzino Ricambi',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'asset_tipo', label: 'Tipo Asset', type: 'text' },
      { key: 'id_ricambio', label: 'ID Ricambio', type: 'text' },
      { key: 'costruttore', label: 'Costruttore', type: 'text' },
      { key: 'modello', label: 'Modello', type: 'text' },
      { key: 'codice_produttore', label: 'Codice Produttore', type: 'text' },
      { key: 'fornitore', label: 'Fornitore', type: 'text' },
      { key: 'quantita_disponibile', label: 'Quantità Disponibile', type: 'number' },
      { key: 'quantita_minima', label: 'Quantità Minima', type: 'number' },
      { key: 'prezzo_unitario', label: 'Prezzo Unitario', type: 'number' },
      { key: 'attivo', label: 'Attivo', type: 'select', options: [0, 1] }
    ],
    recommendedColumns: [
      { key: 'asset_tipo', label: 'Tipo Asset' },
      { key: 'id_ricambio', label: 'Codice Ricambio' },
      { key: 'costruttore', label: 'Costruttore' },
      { key: 'modello', label: 'Modello' },
      { key: 'quantita_disponibile', label: 'Quantità' },
      { key: 'fornitore', label: 'Fornitore' }
    ]
  },
  { 
    key: 'assets', 
    label: '🏢 Asset',
    fields: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'id_aziendale', label: 'ID Aziendale', type: 'text' },
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'marca', label: 'Marca', type: 'text' },
      { key: 'modello', label: 'Modello', type: 'text' },
      { key: 'matricola', label: 'Matricola', type: 'text' },
      { key: 'anno_installazione', label: 'Anno Installazione', type: 'number' },
      { key: 'posizione', label: 'Posizione', type: 'text' }
    ],
    recommendedColumns: [
      { key: 'id_aziendale', label: 'ID Aziendale' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'marca', label: 'Marca' },
      { key: 'modello', label: 'Modello' },
      { key: 'matricola', label: 'Matricola' },
      { key: 'posizione', label: 'Posizione' }
    ]
  }
];

// Operatori disponibili per tipo di campo
const OPERATORS = {
  text: [
    { key: 'equals', label: 'È uguale a' },
    { key: 'not_equals', label: 'È diverso da' },
    { key: 'contains', label: 'Contiene' },
    { key: 'not_contains', label: 'Non contiene' },
    { key: 'starts_with', label: 'Inizia con' },
    { key: 'ends_with', label: 'Finisce con' }
  ],
  number: [
    { key: 'equals', label: 'È uguale a' },
    { key: 'not_equals', label: 'È diverso da' },
    { key: 'greater_than', label: 'Maggiore di' },
    { key: 'less_than', label: 'Minore di' },
    { key: 'between', label: 'Compreso tra' }
  ],
  date: [
    { key: 'equals', label: 'È uguale a' },
    { key: 'before', label: 'Prima del' },
    { key: 'after', label: 'Dopo il' },
    { key: 'between', label: 'Tra le date' }
  ],
  select: [
    { key: 'equals', label: 'È uguale a' },
    { key: 'not_equals', label: 'È diverso da' }
  ]
};

const ReportDinamico = ({ username }) => {
  const [selectedSource, setSelectedSource] = useState('');
  const [filters, setFilters] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const { modalState, showAlert, showConfirm, showError, closeModal } = useCustomModal();

  // Ottieni configurazione fonte dati selezionata
  const getSourceConfig = () => DATA_SOURCES.find(s => s.key === selectedSource);

  // Quando cambia fonte dati, inizializza colonne raccomandate
  useEffect(() => {
    setFilters([]);
    setShowPreview(false);
    setPreviewData([]);
    
    if (selectedSource) {
      const sourceConfig = getSourceConfig();
      if (sourceConfig?.recommendedColumns) {
        setSelectedColumns(sourceConfig.recommendedColumns.map(c => c.key));
      }
    } else {
      setSelectedColumns([]);
    }
  }, [selectedSource]);

  // Aggiungi nuovo filtro
  const addFilter = () => {
    const sourceConfig = getSourceConfig();
    if (!sourceConfig) {
      showError('Seleziona prima una fonte dati');
      return;
    }

    const defaultField = sourceConfig.fields[0];
    const defaultOperator = OPERATORS[defaultField.type][0].key;

    setFilters([...filters, {
      id: Date.now(),
      field: defaultField.key,
      operator: defaultOperator,
      value: '',
      value2: '' // Per operatori "between"
    }]);
  };

  // Rimuovi filtro
  const removeFilter = (filterId) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  // Aggiorna filtro
  const updateFilter = (filterId, updates) => {
    setFilters(filters.map(f => f.id === filterId ? { ...f, ...updates } : f));
  };

  // Ottieni campo da key
  const getField = (fieldKey) => {
    const sourceConfig = getSourceConfig();
    return sourceConfig?.fields.find(f => f.key === fieldKey);
  };

  // Toggle selezione colonna
  const toggleColumn = (columnKey) => {
    if (selectedColumns.includes(columnKey)) {
      setSelectedColumns(selectedColumns.filter(c => c !== columnKey));
    } else {
      setSelectedColumns([...selectedColumns, columnKey]);
    }
  };

  // Seleziona tutte le colonne
  const selectAllColumns = () => {
    const sourceConfig = getSourceConfig();
    if (sourceConfig?.recommendedColumns) {
      setSelectedColumns(sourceConfig.recommendedColumns.map(c => c.key));
    }
  };

  // Deseleziona tutte le colonne
  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Ottieni label colonna
  const getColumnLabel = (columnKey) => {
    const sourceConfig = getSourceConfig();
    const column = sourceConfig?.recommendedColumns?.find(c => c.key === columnKey);
    return column?.label || columnKey;
  };

  // Anteprima risultati
  const loadPreview = async () => {
    if (!selectedSource) {
      showError('Seleziona una fonte dati');
      return;
    }

    if (selectedColumns.length === 0) {
      showError('Seleziona almeno una colonna da visualizzare');
      return;
    }

    setLoading(true);
    setShowPreview(false);

    try {
      const response = await fetch(`${API_URLS.DOCS}/dynamic-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({
          source: selectedSource,
          selected_columns: selectedColumns,
          filters: filters.map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value,
            value2: f.value2
          })),
          limit: 20 // Solo anteprima
        })
      });

      // Stop loading IMMEDIATAMENTE anche se c'è errore
      setLoading(false);

      if (!response.ok) {
        // Prova a estrarre messaggio di errore dal backend
        let errorMsg = 'Errore durante il caricamento dei dati';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // Se non riesce a parsare JSON, usa messaggio generico
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      // Imposta anteprima - il backend restituisce già le label umane e date formattate
      setPreviewData(data.data || []);
      setShowPreview(true);

    } catch (err) {
      console.error('Errore anteprima:', err);
      setLoading(false);
      showError(err.message || 'Errore durante il caricamento dell\'anteprima');
    }
  };

  // Genera PDF
  const generatePDF = async () => {
    if (!selectedSource) {
      showError('Seleziona una fonte dati');
      return;
    }

    if (selectedColumns.length === 0) {
      showError('Seleziona almeno una colonna da includere nel PDF');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URLS.DOCS}/dynamic-report/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({
          source: selectedSource,
          selected_columns: selectedColumns,
          filters: filters.map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value,
            value2: f.value2
          }))
        })
      });

      setLoading(false);

      if (!response.ok) {
        let errorMsg = 'Errore durante la generazione del PDF';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      if (data.download_url) {
        // Apri PDF in nuova finestra
        window.open(data.download_url, '_blank');
        showAlert('PDF generato con successo!');
      } else {
        throw new Error('URL di download non ricevuto');
      }

    } catch (err) {
      console.error('Errore generazione PDF:', err);
      setLoading(false);
      showError(err.message || 'Errore durante la generazione del PDF');
    }
  };

  // Esporta Excel
  const exportExcel = async () => {
    if (!selectedSource) {
      showError('Seleziona una fonte dati');
      return;
    }

    if (selectedColumns.length === 0) {
      showError('Seleziona almeno una colonna da esportare');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URLS.DOCS}/dynamic-report/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({
          source: selectedSource,
          selected_columns: selectedColumns,
          filters: filters.map(f => ({
            field: f.field,
            operator: f.operator,
            value: f.value,
            value2: f.value2
          }))
        })
      });

      setLoading(false);

      if (!response.ok) {
        let errorMsg = 'Errore durante l\'esportazione Excel';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      // Download Excel
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${selectedSource}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showAlert('Excel esportato con successo!');

    } catch (err) {
      console.error('Errore esportazione Excel:', err);
      setLoading(false);
      showError(err.message || 'Errore durante l\'esportazione Excel');
    }
  };

  // Salva configurazione
  const saveConfiguration = async () => {
    if (!selectedSource || filters.length === 0) {
      showError('Aggiungi almeno un filtro prima di salvare');
      return;
    }

    const configName = prompt('Dai un nome a questa configurazione:');
    if (!configName) return;

    try {
      const response = await fetch(`${API_URLS.DOCS}/report-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({
          name: configName,
          source: selectedSource,
          selected_columns: selectedColumns,
          filters: filters
        })
      });

      if (!response.ok) {
        throw new Error('Errore durante il salvataggio');
      }

      showAlert('Configurazione salvata con successo!');

    } catch (err) {
      console.error('Errore salvataggio configurazione:', err);
      showError(err.message || 'Errore durante il salvataggio della configurazione');
    }
  };

  return (
    <div className="report-dinamico-container">
      {/* Modal */}
      <CustomModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={modalState.onConfirm}
        onCancel={closeModal}
        onClose={closeModal}
      />

      {/* Header */}
      <div className="report-header">
        <h3>🎯 Report Dinamico</h3>
        <p className="report-subtitle">
          Crea report personalizzati in modo semplice e veloce
        </p>
      </div>

      {/* Selezione fonte dati */}
      <div className="report-section">
        <label className="report-label">
          <strong>Cosa vuoi estrarre?</strong>
        </label>
        <select
          className="report-select"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Seleziona una fonte dati --</option>
          {DATA_SOURCES.map(source => (
            <option key={source.key} value={source.key}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      {/* Selezione colonne */}
      {selectedSource && getSourceConfig()?.recommendedColumns && (
        <div className="report-section">
          <div className="report-filters-header">
            <label className="report-label">
              <strong>Colonne da visualizzare</strong>
              {selectedColumns.length > 0 && (
                <span className="filter-count"> ({selectedColumns.length} selezionate)</span>
              )}
            </label>
            <div>
              <button
                className="btn btn-sm btn-secondary"
                onClick={selectAllColumns}
                disabled={loading}
                style={{ marginRight: '5px' }}
              >
                ✓ Tutte
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={deselectAllColumns}
                disabled={loading}
              >
                ✗ Nessuna
              </button>
            </div>
          </div>

          <div className="columns-grid">
            {getSourceConfig().recommendedColumns.map(column => (
              <label key={column.key} className="column-checkbox">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.key)}
                  onChange={() => toggleColumn(column.key)}
                  disabled={loading}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filtri */}
      {selectedSource && (
        <div className="report-section">
          <div className="report-filters-header">
            <label className="report-label">
              <strong>Filtri</strong>
              {filters.length > 0 && (
                <span className="filter-count"> ({filters.length})</span>
              )}
            </label>
            <button
              className="btn btn-sm btn-secondary"
              onClick={addFilter}
              disabled={loading}
            >
              ➕ Aggiungi filtro
            </button>
          </div>

          {filters.length === 0 ? (
            <p className="report-empty-state">
              Nessun filtro applicato. I dati non saranno filtrati.
            </p>
          ) : (
            <div className="filters-list">
              {filters.map(filter => {
                const field = getField(filter.field);
                const operators = OPERATORS[field?.type || 'text'];

                return (
                  <div key={filter.id} className="filter-row">
                    {/* Campo */}
                    <select
                      className="filter-field"
                      value={filter.field}
                      onChange={(e) => {
                        const newField = getField(e.target.value);
                        const newOperator = OPERATORS[newField.type][0].key;
                        updateFilter(filter.id, {
                          field: e.target.value,
                          operator: newOperator,
                          value: '',
                          value2: ''
                        });
                      }}
                      disabled={loading}
                    >
                      {getSourceConfig().fields.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>

                    {/* Operatore */}
                    <select
                      className="filter-operator"
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                      disabled={loading}
                    >
                      {operators.map(op => (
                        <option key={op.key} value={op.key}>{op.label}</option>
                      ))}
                    </select>

                    {/* Valore */}
                    {field?.type === 'select' ? (
                      <select
                        className="filter-value"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        disabled={loading}
                      >
                        <option value="">-- Seleziona --</option>
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field?.type === 'date' ? 'date' : field?.type === 'number' ? 'number' : 'text'}
                        className="filter-value"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Valore..."
                        disabled={loading}
                      />
                    )}

                    {/* Valore 2 (per operatori "between") */}
                    {(filter.operator === 'between') && (
                      <input
                        type={field?.type === 'date' ? 'date' : 'number'}
                        className="filter-value"
                        value={filter.value2}
                        onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                        placeholder="e..."
                        disabled={loading}
                      />
                    )}

                    {/* Rimuovi */}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => removeFilter(filter.id)}
                      disabled={loading}
                      title="Rimuovi filtro"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Azioni */}
      {selectedSource && (
        <div className="report-actions">
          <button
            className="btn btn-primary"
            onClick={loadPreview}
            disabled={loading || selectedColumns.length === 0}
          >
            {loading ? '⏳ Caricamento...' : '👁️ Anteprima risultati'}
          </button>

          <div className="report-actions-secondary">
            <button
              className="btn btn-success"
              onClick={generatePDF}
              disabled={loading || selectedColumns.length === 0}
            >
              📄 Genera PDF
            </button>
            <button
              className="btn btn-success"
              onClick={exportExcel}
              disabled={loading || selectedColumns.length === 0}
            >
              📊 Esporta Excel
            </button>
            <button
              className="btn btn-secondary"
              onClick={saveConfiguration}
              disabled={loading}
            >
              💾 Salva configurazione
            </button>
          </div>
        </div>
      )}

      {/* Anteprima */}
      {showPreview && (
        <div className="report-preview">
          <h4>
            📊 Anteprima Risultati
            {previewData.length > 0 && (
              <span className="preview-count"> ({previewData.length} record)</span>
            )}
          </h4>

          {previewData.length === 0 ? (
            <div className="report-empty-state">
              <p>😔 Nessun dato trovato con questi filtri</p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                Prova a modificare o rimuovere alcuni filtri
              </p>
            </div>
          ) : (
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    {selectedColumns.map(colKey => (
                      <th key={colKey}>{getColumnLabel(colKey)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx}>
                      {selectedColumns.map(colKey => (
                        <td key={colKey}>
                          {row[colKey] !== null && row[colKey] !== undefined ? String(row[colKey]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length === 20 && (
                <p className="preview-note">
                  ℹ️ Mostrati solo i primi 20 risultati. Il report completo conterrà tutti i dati.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDinamico;
