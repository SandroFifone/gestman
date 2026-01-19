import React, { useState, useEffect } from 'react';

const TableConfig = ({ config, databases, onChange }) => {
  const [selectedColumns, setSelectedColumns] = useState(config.columns || []);
  const [filters, setFilters] = useState(config.filters || []);
  const [availableColumns, setAvailableColumns] = useState([]);

  // Quando cambia la tabella, aggiorna le colonne disponibili
  useEffect(() => {
    if (config.database && config.table && databases[config.database]) {
      const tableInfo = databases[config.database].tables?.find(
        t => t.table_name === config.table
      );
      if (tableInfo) {
        setAvailableColumns(tableInfo.columns || []);
      }
    }
  }, [config.database, config.table, databases]);

  const handleDatabaseChange = (dbName) => {
    onChange({
      database: dbName,
      table: '',
      columns: [],
      filters: []
    });
  };

  const handleTableChange = (tableName) => {
    onChange({
      ...config,
      table: tableName,
      columns: [],
      filters: []
    });
    setSelectedColumns([]);
    setFilters([]);
  };

  const toggleColumn = (columnName) => {
    const newColumns = selectedColumns.includes(columnName)
      ? selectedColumns.filter(c => c !== columnName)
      : [...selectedColumns, columnName];
    
    setSelectedColumns(newColumns);
    onChange({ ...config, columns: newColumns });
  };

  const addFilter = () => {
    const newFilters = [...filters, { field: '', operator: '=', value: '' }];
    setFilters(newFilters);
    onChange({ ...config, filters: newFilters });
  };

  const updateFilter = (index, field, value) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
    onChange({ ...config, filters: newFilters });
  };

  const removeFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    onChange({ ...config, filters: newFilters });
  };

  return (
    <div className="table-config">
      <div className="config-section">
        <label>Database:</label>
        <select 
          value={config.database || ''} 
          onChange={(e) => handleDatabaseChange(e.target.value)}
        >
          <option value="">Seleziona database</option>
          {databases && Object.keys(databases).map(dbName => (
            <option key={dbName} value={dbName}>{dbName}</option>
          ))}
        </select>
      </div>

      {config.database && (
        <div className="config-section">
          <label>Tabella:</label>
          <select 
            value={config.table || ''} 
            onChange={(e) => handleTableChange(e.target.value)}
          >
            <option value="">Seleziona tabella</option>
            {databases[config.database]?.tables?.map(table => (
              <option key={table.table_name} value={table.table_name}>
                {table.table_name} ({table.row_count} righe)
              </option>
            ))}
          </select>
        </div>
      )}

      {config.table && availableColumns.length > 0 && (
        <>
          <div className="config-section">
            <label>Colonne da Mostrare:</label>
            <div className="columns-checklist">
              {availableColumns.map(col => (
                <label key={col.name} className="column-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.name)}
                    onChange={() => toggleColumn(col.name)}
                  />
                  <span>{col.name}</span>
                  <span className="column-type">({col.type || 'TEXT'})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="config-section">
            <label>Filtri:</label>
            <div className="filters-list">
              {filters.map((filter, index) => (
                <div key={index} className="filter-row">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, 'field', e.target.value)}
                    className="filter-field"
                  >
                    <option value="">Campo...</option>
                    {availableColumns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    className="filter-operator"
                  >
                    <option value="=">=</option>
                    <option value="!=">≠</option>
                    <option value=">">{'>'}</option>
                    <option value="<">{'<'}</option>
                    <option value=">=">≥</option>
                    <option value="<=">≤</option>
                    <option value="LIKE">LIKE</option>
                    <option value="IN">IN</option>
                  </select>

                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, 'value', e.target.value)}
                    placeholder="Valore..."
                    className="filter-value"
                  />

                  <button 
                    onClick={() => removeFilter(index)}
                    className="filter-remove"
                    title="Rimuovi filtro"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={addFilter} className="btn-add-filter">
                + Aggiungi Filtro
              </button>
            </div>
          </div>

          <div className="config-section">
            <label>Ordinamento:</label>
            <div className="order-config">
              <select
                value={config.orderBy?.field || ''}
                onChange={(e) => onChange({
                  ...config,
                  orderBy: { ...config.orderBy, field: e.target.value }
                })}
              >
                <option value="">Nessun ordinamento</option>
                {availableColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>

              {config.orderBy?.field && (
                <select
                  value={config.orderBy?.direction || 'ASC'}
                  onChange={(e) => onChange({
                    ...config,
                    orderBy: { ...config.orderBy, direction: e.target.value }
                  })}
                >
                  <option value="ASC">Crescente (A-Z)</option>
                  <option value="DESC">Decrescente (Z-A)</option>
                </select>
              )}
            </div>
          </div>

          <div className="config-section">
            <label>Stile Tabella:</label>
            <div className="style-options">
              <label>
                <input
                  type="checkbox"
                  checked={config.style?.alternateRows !== false}
                  onChange={(e) => onChange({
                    ...config,
                    style: { ...config.style, alternateRows: e.target.checked }
                  })}
                />
                Righe alternate
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={config.style?.borders !== false}
                  onChange={(e) => onChange({
                    ...config,
                    style: { ...config.style, borders: e.target.checked }
                  })}
                />
                Bordi
              </label>

              <label>
                Font size:
                <input
                  type="number"
                  min="8"
                  max="14"
                  value={config.style?.fontSize || 10}
                  onChange={(e) => onChange({
                    ...config,
                    style: { ...config.style, fontSize: parseInt(e.target.value) }
                  })}
                />
                pt
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TableConfig;
