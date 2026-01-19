import React from 'react';

const TitleConfig = ({ config, onChange }) => {
  return (
    <div className="config-form">
      <div className="form-group">
        <label>Testo Titolo</label>
        <input
          type="text"
          value={config.text || ''}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          placeholder="Inserisci il titolo..."
        />
        <div className="form-hint">Variabili disponibili: {'{{'} month {'}} {{'} year {'}} {{'} user {'}}'}</div>
      </div>

      <div className="form-group">
        <label>Livello</label>
        <select
          value={config.level || 'h1'}
          onChange={(e) => onChange({ ...config, level: e.target.value })}
        >
          <option value="h1">H1 - Principale</option>
          <option value="h2">H2 - Secondario</option>
          <option value="h3">H3 - Terziario</option>
        </select>
      </div>

      <div className="form-group">
        <label>Allineamento</label>
        <div className="button-group">
          <button
            type="button"
            className={config.align === 'left' ? 'active' : ''}
            onClick={() => onChange({ ...config, align: 'left' })}
          >
            ⬅️ Sinistra
          </button>
          <button
            type="button"
            className={config.align === 'center' ? 'active' : ''}
            onClick={() => onChange({ ...config, align: 'center' })}
          >
            ⬛ Centro
          </button>
          <button
            type="button"
            className={config.align === 'right' ? 'active' : ''}
            onClick={() => onChange({ ...config, align: 'right' })}
          >
            ➡️ Destra
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleConfig;
