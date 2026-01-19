import React from 'react';

const TitleConfig = ({ config, onChange }) => {
  return (
    <div className="title-config">
      <div className="config-section">
        <label>Testo Titolo:</label>
        <input
          type="text"
          value={config.text || ''}
          onChange={(e) => onChange({ ...config, text: e.target.value })}
          placeholder="Inserisci titolo..."
        />
        <small>Usa variabili: {'{'}{'{'}}month{'}'}{'}'}, {'{'}{'{'}}year{'}'}{'}'}, {'{'}{'{'}}user{'}'}{'}'}  </small>
      </div>

      <div className="config-section">
        <label>Livello:</label>
        <select
          value={config.level || 'h1'}
          onChange={(e) => onChange({ ...config, level: e.target.value })}
        >
          <option value="h1">H1 - Principale</option>
          <option value="h2">H2 - Secondario</option>
          <option value="h3">H3 - Terziario</option>
        </select>
      </div>

      <div className="config-section">
        <label>Allineamento:</label>
        <div className="alignment-buttons">
          <button
            className={config.align === 'left' ? 'active' : ''}
            onClick={() => onChange({ ...config, align: 'left' })}
          >
            ⬅️ Sinistra
          </button>
          <button
            className={config.align === 'center' ? 'active' : ''}
            onClick={() => onChange({ ...config, align: 'center' })}
          >
            ⬛ Centro
          </button>
          <button
            className={config.align === 'right' ? 'active' : ''}
            onChange={() => onChange({ ...config, align: 'right' })}
          >
            ➡️ Destra
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleConfig;
