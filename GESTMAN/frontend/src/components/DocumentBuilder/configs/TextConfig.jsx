import React from 'react';

const TextConfig = ({ config, onChange }) => {
  return (
    <div className="config-form">
      <div className="form-group">
        <label>Contenuto Testo</label>
        <textarea
          value={config.content || ''}
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          placeholder="Inserisci il contenuto del paragrafo..."
          rows={8}
        />
        <div className="form-hint">Variabili disponibili: {'{{'} month {'}} {{'} year {'}} {{'} user {'}}'}</div>
      </div>

      <div className="form-group">
        <label>Allineamento</label>
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
