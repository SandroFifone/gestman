import React from 'react';

const StatisticsConfig = ({ config, onChange }) => {
  return (
    <div className="statistics-config">
      <div className="config-info">
        📈 Le statistiche verranno calcolate automaticamente dai dati delle tabelle presenti nel documento.
      </div>

      <div className="config-section">
        <label>Calcoli da Mostrare:</label>
        <div className="calculations-list">
          {(config.calculations || []).map((calc, index) => (
            <div key={index} className="calculation-item">
              <input
                type="text"
                value={calc.label || ''}
                onChange={(e) => {
                  const newCalcs = [...config.calculations];
                  newCalcs[index].label = e.target.value;
                  onChange({ ...config, calculations: newCalcs });
                }}
                placeholder="Nome calcolo..."
              />
              <select
                value={calc.type || 'count'}
                onChange={(e) => {
                  const newCalcs = [...config.calculations];
                  newCalcs[index].type = e.target.value;
                  onChange({ ...config, calculations: newCalcs });
                }}
              >
                <option value="count">Conteggio</option>
                <option value="sum">Somma</option>
                <option value="avg">Media</option>
                <option value="min">Minimo</option>
                <option value="max">Massimo</option>
              </select>
              <button
                onClick={() => {
                  const newCalcs = config.calculations.filter((_, i) => i !== index);
                  onChange({ ...config, calculations: newCalcs });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newCalcs = [...(config.calculations || []), { label: '', type: 'count' }];
              onChange({ ...config, calculations: newCalcs });
            }}
            className="btn-add-calculation"
          >
            + Aggiungi Calcolo
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatisticsConfig;
