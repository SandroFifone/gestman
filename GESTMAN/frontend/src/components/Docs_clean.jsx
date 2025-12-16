import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import './Docs.css';

const Docs = ({ username, isAdmin }) => {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'builder', 'templates', 'generator'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Nuove sezioni per il sistema di documenti
  const documentSections = [
    {
      key: 'templates',
      label: 'Template Documenti',
      icon: '📄',
      description: 'Crea e gestisci template per documenti amministrativi'
    },
    {
      key: 'generator',
      label: 'Generatore Documenti',
      icon: '🏗️',
      description: 'Genera documenti utilizzando dati dinamici dell\'app'
    },
    {
      key: 'reports',
      label: 'Report Automatici',
      icon: '📊',
      description: 'Report pre-configurati per manutenzioni, asset e costi'
    },
    {
      key: 'archive',
      label: 'Archivio Documenti',
      icon: '🗄️',
      description: 'Documenti generati e salvati automaticamente'
    }
  ];

  const handleSectionClick = (sectionKey) => {
    setActiveView(sectionKey);
  };

  const renderOverview = () => (
    <div className="docs-overview">
      <div className="overview-grid">
        {documentSections.map(section => (
          <div 
            key={section.key}
            className="section-card"
            onClick={() => handleSectionClick(section.key)}
          >
            <div className="section-icon">{section.icon}</div>
            <h3>{section.label}</h3>
            <p>{section.description}</p>
            <button className="btn btn-primary">
              Apri Sezione
            </button>
          </div>
        ))}
      </div>
      
      <div className="coming-soon-notice">
        <h4>🚧 Sezione in Sviluppo</h4>
        <p>Il nuovo sistema di generazione documenti dinamici è in fase di sviluppo. 
           Presto potrai creare template personalizzabili e generare documenti amministrativi 
           utilizzando i dati dell'applicazione.</p>
      </div>
    </div>
  );

  const renderPlaceholder = (sectionKey) => (
    <div className="section-placeholder">
      <button 
        className="btn btn-secondary mb-4"
        onClick={() => setActiveView('overview')}
      >
        ← Torna alla panoramica
      </button>
      
      <div className="placeholder-content">
        <h3>🚧 {documentSections.find(s => s.key === sectionKey)?.label}</h3>
        <p>Questa sezione sarà presto disponibile con le seguenti funzionalità:</p>
        
        {sectionKey === 'templates' && (
          <ul>
            <li>Editor drag & drop per layout documenti</li>
            <li>Campi dinamici collegati ai dati dell'app</li>
            <li>Template pre-configurati per documenti amministrativi</li>
            <li>Anteprima in tempo reale</li>
          </ul>
        )}
        
        {sectionKey === 'generator' && (
          <ul>
            <li>Selezione dati da compilazioni, asset, magazzino</li>
            <li>Filtri avanzati e aggregazioni</li>
            <li>Generazione PDF con formattazione professionale</li>
            <li>Stampa diretta e invio email</li>
          </ul>
        )}
        
        {sectionKey === 'reports' && (
          <ul>
            <li>Rapporti mensili manutenzioni</li>
            <li>Certificati di conformità asset</li>
            <li>Registri controlli periodici</li>
            <li>Analisi costi e KPI</li>
          </ul>
        )}
        
        {sectionKey === 'archive' && (
          <ul>
            <li>Storico documenti generati</li>
            <li>Ricerca avanzata per data, tipo, contenuto</li>
            <li>Versioning e cronologia modifiche</li>
            <li>Backup automatico su cloud</li>
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documentazione e Report</h2>
        <p>Sistema di generazione documenti dinamici per l'amministrazione aziendale</p>
      </div>

      <div className="section-content">
        {activeView === 'overview' ? renderOverview() : renderPlaceholder(activeView)}
      </div>
    </div>
  );
};

export default Docs;