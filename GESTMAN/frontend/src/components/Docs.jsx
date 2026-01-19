import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import DocumentBuilder from './DocumentBuilder';
import './DocsAdvanced.css';

const Docs = ({ username, isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState({});

  // Carica struttura database all'avvio
  useEffect(() => {
    loadDatabases();
  }, []);

  // Carica database disponibili
  const loadDatabases = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URLS.DOCS}/databases`);
      
      if (response.ok) {
        const data = await response.json();
        const databasesData = data.databases || data;
        setDatabases(databasesData || {});
      }
    } catch (err) {
      console.error('Errore caricamento database:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documenti da Database</h2>
        <p>Crea documenti personalizzati con drag & drop</p>
      </div>

      <div className="section-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Caricamento database...</p>
          </div>
        ) : (
          <DocumentBuilder username={username} databases={databases} />
        )}
      </div>
    </div>
  );
};

export default Docs;
