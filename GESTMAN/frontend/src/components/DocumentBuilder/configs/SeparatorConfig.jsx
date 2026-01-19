import React from 'react';

const SeparatorConfig = ({ config, onChange }) => {
  return (
    <div className="separator-config">
      <div className="config-section">
        <label>Stile Linea:</label>
        <select
          value={config.style || 'solid'}
          onChange={(e) => onChange({ ...config, style: e.target.value })}
        >
          <option value="solid">Solida</option>
          <option value="dashed">Tratteggiata</option>
          <option value="dotted">Punteggiata</option>
        </select>
      </div>

      <div className="config-section">
        <label>Spessore:</label>
        <input
          type="number"
          min="1"
          max="5"
          value={config.thickness || 1}
          onChange={(e) => onChange({ ...config, thickness: parseInt(e.target.value) })}
        />
        px
      </div>
    </div>
  );
};

export default SeparatorConfig;
