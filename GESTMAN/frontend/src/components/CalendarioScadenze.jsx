import React, { useState, useEffect } from "react";
import FormScadenzaDinamica from "./FormScadenzaDinamica";

const CalendarioScadenze = ({ username }) => {
  const [activeTab, setActiveTab] = useState('scadenze');
  const [scadenze, setScadenze] = useState([]);
  const [tipologie, setTipologie] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScadenza, setSelectedScadenza] = useState(null);
  const [message, setMessage] = useState("");

  // Stati per gestione tipologie
  const [showAddTipologiaModal, setShowAddTipologiaModal] = useState(false);
  const [newTipologia, setNewTipologia] = useState({
    asset_tipo: '',
    nome_manutenzione: '',
    descrizione: '',
    frequenza_mesi: '',
    giorni_preavviso: ''
  });

  // Stati per nuova scadenza
  const [showAddScadenzaModal, setShowAddScadenzaModal] = useState(false);
  const [newScadenza, setNewScadenza] = useState({
    manutenzione_id: '',
    civico: '',
    asset: '',
    asset_tipo: '',
    data_scadenza: ''
  });

  const tabs = [
    { key: 'scadenze', label: 'Scadenze Programmate', icon: '📅' },
    { key: 'tipologie', label: 'Gestione Tipologie', icon: '⚙️' },
    { key: 'nuova-scadenza', label: 'Nuova Scadenza', icon: '➕' }
  ];

  useEffect(() => {
    caricaDati();
  }, [activeTab]);

  const caricaDati = async () => {
    if (activeTab === 'scadenze') {
      await caricaScadenze();
    } else if (activeTab === 'tipologie') {
      await caricaTipologie();
      await caricaAssetTypes();
    } else if (activeTab === 'nuova-scadenza') {
      await caricaTipologie();
      await caricaAssetTypes();
    }
  };

  const caricaScadenze = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/calendario/scadenze-prossime?giorni=60");
      const data = await response.json();
      
      if (response.ok) {
        setScadenze(data.scadenze || []);
      } else {
        setError(data.error || "Errore nel caricamento scadenze");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    } finally {
      setLoading(false);
    }
  };

  const caricaTipologie = async () => {
    try {
      const response = await fetch("/api/calendario/manutenzioni/tipologie");
      const data = await response.json();
      
      if (response.ok) {
        setTipologie(data.tipologie || []);
      } else {
        setError(data.error || "Errore nel caricamento tipologie");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const caricaAssetTypes = async () => {
    try {
      const response = await fetch("/api/calendario/manutenzioni/asset-types");
      const data = await response.json();
      
      if (response.ok) {
        setAssetTypes(data.asset_types || []);
      } else {
        setError(data.error || "Errore nel caricamento tipi asset");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const salvaTipologia = async () => {
    try {
      const response = await fetch("/api/calendario/manutenzioni/tipologie", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTipologia)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage("Tipologia salvata con successo");
        setShowAddTipologiaModal(false);
        setNewTipologia({
          asset_tipo: '',
          nome_manutenzione: '',
          descrizione: '',
          frequenza_mesi: '',
          giorni_preavviso: ''
        });
        await caricaTipologie();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || "Errore nel salvataggio tipologia");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const salvaScadenza = async () => {
    try {
      const response = await fetch("/api/calendario/scadenze", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScadenza)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage("Scadenza programmata con successo");
        setShowAddScadenzaModal(false);
        setNewScadenza({
          manutenzione_id: '',
          civico: '',
          asset: '',
          asset_tipo: '',
          data_scadenza: ''
        });
        await caricaScadenze();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || "Errore nel salvataggio scadenza");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const eliminaTipologia = async (tipologiaId) => {
    if (!confirm("Sei sicuro di voler eliminare questa tipologia?")) return;
    
    try {
      const response = await fetch(`/api/calendario/manutenzioni/tipologie/${tipologiaId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage("Tipologia eliminata con successo");
        await caricaTipologie();
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Errore nell'eliminazione tipologia");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const getStatoColor = (scadenza) => {
    if (scadenza.scaduta) return "#dc3545"; // Rosso scaduto
    if (scadenza.urgente) return "#fd7e14"; // Arancione urgente
    return "#28a745"; // Verde normale
  };

  const getStatoText = (scadenza) => {
    if (scadenza.scaduta) return "SCADUTA";
    if (scadenza.urgente) return "URGENTE";
    return "IN PROGRAMMA";
  };

  const apriFormScadenza = (scadenza) => {
    setSelectedScadenza(scadenza);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scadenze':
        return renderScadenze();
      case 'tipologie':
        return renderTipologie();
      case 'nuova-scadenza':
        return renderNuovaScadenza();
      default:
        return null;
    }
  };

  const renderScadenze = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Scadenze Programmate</h3>
        <button 
          onClick={caricaScadenze}
          style={{
            background: '#1a237e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          🔄 Aggiorna
        </button>
      </div>

      {scadenze.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div>
          <p>Nessuna scadenza programmata</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {scadenze.map(scadenza => (
            <div
              key={scadenza.id}
              onClick={() => apriFormScadenza(scadenza)}
              style={{
                border: `2px solid ${getStatoColor(scadenza)}`,
                borderRadius: '8px',
                padding: '15px',
                background: 'white',
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: getStatoColor(scadenza),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {getStatoText(scadenza)}
                    </span>
                    <span style={{ color: '#6c757d', fontSize: '14px' }}>
                      📅 {new Date(scadenza.data_scadenza).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1a237e' }}>
                    {scadenza.nome_manutenzione}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', color: '#6c757d' }}>
                    📍 {scadenza.civico} - {scadenza.asset}
                  </p>
                  {scadenza.descrizione && (
                    <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                      {scadenza.descrizione}
                    </p>
                  )}
                </div>
                <div style={{ color: '#1a237e', fontSize: '20px' }}>➡️</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTipologie = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Tipologie di Manutenzione</h3>
        <button 
          onClick={() => setShowAddTipologiaModal(true)}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ➕ Nuova Tipologia
        </button>
      </div>

      {tipologie.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚙️</div>
          <p>Nessuna tipologia di manutenzione configurata</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {tipologie.map(tipologia => (
            <div
              key={tipologia.id}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '15px',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: '#1a237e',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {tipologia.asset_tipo}
                    </span>
                    <span style={{ color: '#6c757d', fontSize: '14px' }}>
                      🔄 Ogni {tipologia.frequenza_mesi} mesi
                    </span>
                    <span style={{ color: '#6c757d', fontSize: '14px' }}>
                      ⚠️ {tipologia.giorni_preavviso} gg preavviso
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1a237e' }}>
                    {tipologia.nome_manutenzione}
                  </h4>
                  {tipologia.descrizione && (
                    <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                      {tipologia.descrizione}
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => eliminaTipologia(tipologia.id)}
                  style={{
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderNuovaScadenza = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Programma Nuova Scadenza</h3>
      </div>
      
      <button 
        onClick={() => setShowAddScadenzaModal(true)}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '15px 30px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          margin: '0 auto'
        }}
      >
        ➕ Nuova Scadenza di Manutenzione
      </button>
      
      <div style={{ 
        textAlign: 'center', 
        padding: '50px',
        background: '#f8f9fa',
        borderRadius: '8px',
        color: '#6c757d',
        marginTop: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
        <p>Clicca il pulsante sopra per programmare una nuova scadenza di manutenzione</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <div>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>📅 Calendario Manutenzioni</h2>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e9ecef', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? '#1a237e' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#1a237e',
                border: 'none',
                padding: '12px 20px',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messaggi */}
      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {message}
        </div>
      )}

      {/* Contenuto per tab */}
      {renderTabContent()}

      {scadenze.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          📅 Nessuna scadenza nei prossimi 60 giorni
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {scadenze.map((scadenza) => (
            <div 
              key={scadenza.id}
              style={{
                border: `2px solid ${getStatoColor(scadenza)}`,
                borderRadius: '8px',
                padding: '16px',
                background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0px)'}
              onClick={() => apriFormScadenza(scadenza)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{
                      background: getStatoColor(scadenza),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {getStatoText(scadenza)}
                    </span>
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#6c757d',
                      fontWeight: '500'
                    }}>
                      {scadenza.giorni_rimanenti >= 0 
                        ? `Tra ${scadenza.giorni_rimanenti} giorni`
                        : `Scaduta da ${Math.abs(scadenza.giorni_rimanenti)} giorni`
                      }
                    </span>
                  </div>

                  <h4 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#1a237e',
                    fontSize: '18px'
                  }}>
                    🏗️ {scadenza.civico} - {scadenza.asset}
                  </h4>

                  <div style={{ marginBottom: '8px' }}>
                    <strong>Manutenzione:</strong> {scadenza.nome_manutenzione}
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <strong>Tipo Asset:</strong> {scadenza.asset_tipo}
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <strong>Data Scadenza:</strong> {scadenza.data_scadenza}
                  </div>

                  {scadenza.descrizione && (
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#6c757d',
                      fontStyle: 'italic'
                    }}>
                      {scadenza.descrizione}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <button
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      apriFormScadenza(scadenza);
                    }}
                  >
                    ✏️ Compila Form
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default CalendarioScadenze;
