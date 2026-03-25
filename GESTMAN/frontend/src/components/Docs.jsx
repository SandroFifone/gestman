import React, { useState } from 'react';
import ReportDinamico from './ReportDinamico';
import DocumentHistory from './DocumentHistory';
import './DocsAdvanced.css';

const Docs = ({ username, isAdmin }) => {
  const [activeView, setActiveView] = useState('report'); // 'report' o 'history'

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Report e Documenti</h2>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className={`btn ${activeView === 'report' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('report')}
          >
            🎯 Report Dinamico
          </button>
          <button 
            className={`btn ${activeView === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveView('history')}
          >
            📚 Storico Documenti
          </button>
        </div>
      </div>

      <div className="section-content">
        {activeView === 'report' ? (
          <ReportDinamico username={username} />
        ) : (
          <DocumentHistory currentUser={{ username }} />
        )}
      </div>
    </div>
  );
};

export default Docs;
