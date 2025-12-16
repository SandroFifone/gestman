import React, { useState } from 'react';
import './Docs.css';

const Docs = ({ username, isAdmin }) => {
  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documentazione e Report</h2>
        <p>Sistema di generazione documenti dinamici per l'amministrazione aziendale</p>
      </div>

      <div className="section-content">
        <div className="docs-placeholder">
          <h3>🚧 Sezione in Costruzione</h3>
          <p>Pronto per essere sviluppato step by step</p>
        </div>
      </div>
    </div>
  );
};

export default Docs;