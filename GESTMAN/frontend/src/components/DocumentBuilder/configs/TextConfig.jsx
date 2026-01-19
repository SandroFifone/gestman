import React from 'react';

const TextConfig = ({ config, onChange }) => {
  return (
    <div className="text-config">
      <div className="config-section">
        <label>Contenuto Testo:</label>
        <textarea
          value={config.content || ''}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          placeholder="Inserisci testo..."
          rows={8}
        />
        <small>Supporta variabili: {'{'}{'{'}}month{'}'}{'}'}, {'{'}{'{'}}year{'}'}{'}'}, {'{'}{'{'}}user{'}'}{'}'}  </small>
      </div>

      <div className="config-section">
        <label>Allineamento:</label>
        <select
          value={config.align || 'left'}
          onChange={(e) => onChange({ ...config, align: e.target.value })}
        >
          <option value="left">Sinistra</option>
          <option value="center">Centro</option>
          <option value="right">Destra</option>
          <option value="justify">Giustificato</option>
        </select>
      </div>
    </div>
  );
};

export default TextConfig;
