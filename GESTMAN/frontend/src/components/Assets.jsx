import React, { useState, useEffect } from 'react';
import AssetsManager from './AssetsManager';
import './CiviciManager.css';

const Assets = ({ isAdmin }) => {
  const [civici, setCivici] = useState([]);
  const [selectedCivico, setSelectedCivico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchAssetId, setSearchAssetId] = useState('');
  const [activeFilter, setActiveFilter] = useState(''); // Il filtro attualmente applicato

  // Carica la lista dei civici
  useEffect(() => {
    loadCivici();
  }, []);

  const loadCivici = async (assetIdFilter = '') => {
    try {
      setLoading(true);
      const url = assetIdFilter 
        ? `/api/civici?asset_id=${encodeURIComponent(assetIdFilter)}`
        : '/api/civici';
      
      console.log('🔍 Caricamento civici con URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Errore nel caricamento civici');
      
      const data = await response.json();
      console.log('📊 Civici ricevuti:', data.civici.length);
      setCivici(data.civici);
    } catch (err) {
      setError('Errore nel caricamento dei civici: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Gestisce la ricerca quando si preme ENTER
  const handleSearch = () => {
    const trimmedSearch = searchAssetId.trim();
    setActiveFilter(trimmedSearch);
    loadCivici(trimmedSearch);
  };

  // Gestisce reset della ricerca
  const handleResetSearch = () => {
    setSearchAssetId('');
    setActiveFilter('');
    loadCivici('');
  };

  const handleCivicoClick = (civico) => {
    setSelectedCivico(civico);
  };

  const handleBackToCivici = () => {
    setSelectedCivico(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Caricamento civici...</p>
        </div>
      </div>
    );
  }

  // Se è selezionato un civico, mostra la gestione degli asset
  if (selectedCivico) {
    return (
      <div>
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <button 
            onClick={handleBackToCivici}
            className="btn btn-secondary"
            style={{ marginBottom: 'var(--spacing-md)' }}
          >
            ← Torna ai civici
          </button>
          <h3 style={{ color: 'var(--primary-color)', margin: 0 }}>
            ⚙️ Assets del civico {selectedCivico.numero}
          </h3>
          <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', margin: '0.5rem 0 0 0' }}>
            {selectedCivico.descrizione}
          </p>
        </div>
        <AssetsManager civicoNumero={selectedCivico.numero} isAdmin={isAdmin} />
      </div>
    );
  }

  // Mostra la lista dei civici (solo lettura)
  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        ⚙️ Assets
      </h2>
      
      {error && (
        <div style={{ background: 'var(--error-light)', color: 'var(--error-dark)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-md)', marginBottom: 'var(--spacing-lg)' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏢 Civici Disponibili ({civici.length})</h3>
          <p style={{ color: 'var(--gray-600)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
            Seleziona un civico per gestire i suoi asset
          </p>
        </div>

        {/* Filtro per ID Asset */}
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--gray-200)' }}>
          <div style={{ maxWidth: '500px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: 'var(--font-size-sm)', 
              fontWeight: 'var(--font-weight-medium)', 
              marginBottom: 'var(--spacing-sm)', 
              color: 'var(--gray-700)' 
            }}>
              🔍 Filtra per ID Asset
            </label>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <input
                type="text"
                placeholder="Inserisci ID asset e premi ENTER..."
                value={searchAssetId}
                onChange={(e) => setSearchAssetId(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--gray-300)'}
              />
              <button
                onClick={handleSearch}
                className="btn btn-primary btn-sm"
                style={{ whiteSpace: 'nowrap' }}
              >
                🔍 Cerca
              </button>
              {activeFilter && (
                <button
                  onClick={handleResetSearch}
                  className="btn btn-secondary btn-sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  ✕ Reset
                </button>
              )}
            </div>
            {activeFilter && (
              <p style={{ 
                fontSize: 'var(--font-size-xs)', 
                color: 'var(--primary-color)', 
                marginTop: 'var(--spacing-xs)', 
                marginBottom: 0,
                fontWeight: 'var(--font-weight-medium)'
              }}>
                🔎 Filtro attivo per asset ID: "<strong>{activeFilter}</strong>" • {civici.length} civici trovati
              </p>
            )}
          </div>
        </div>
        
        {civici.length === 0 ? (
          <div className="card-body">
            <div style={{ 
              color: 'var(--gray-600)', 
              fontStyle: 'italic', 
              textAlign: 'center', 
              padding: 'var(--spacing-4xl)',
              background: 'var(--gray-50)',
              borderRadius: 'var(--border-radius-lg)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-lg)' }}>🏗️</div>
              <p style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-md)' }}>
                Nessun civico configurato
              </p>
              <p style={{ fontSize: 'var(--font-size-sm)' }}>
                I civici devono essere creati dalla sezione Assets Manager (solo admin)
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Numero</th>
                    <th>Descrizione</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {civici.map(civico => (
                    <tr key={civico.numero}>
                      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-semibold)' }}>
                        {civico.numero}
                      </td>
                      <td>{civico.descrizione}</td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleCivicoClick(civico)}
                        >
                           Gestisci Assets
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-only">
              {civici.map(civico => (
                <div key={civico.numero} className="card-item mobile-card">
                  <div className="card-item-header">
                    <span className="card-item-number">{civico.numero}</span>
                  </div>
                  <div className="card-item-body">
                    <p className="card-item-description">{civico.descrizione}</p>
                  </div>
                  <div className="card-item-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleCivicoClick(civico)}
                    >
                       Assets
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Assets;
