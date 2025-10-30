import React, { useEffect, useState } from "react";
import CustomModal from './CustomModal';
import TextWithRicambiLinks from './TextWithRicambiLinks';
import { useCustomModal } from '../hooks/useCustomModal';
import { API_URLS } from '../config/api';

const AlertTabs = [
  { key: "non_conformita", label: "Non Conformità" },
  { key: "scadenza", label: "Scadenze" },
  { key: "Tickets", label: "Tickets" },
];

const AlertScreen = () => {
  const [activeTab, setActiveTab] = useState("non_conformita");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Hook per i modali personalizzati
  const { modalState, showAlert, showConfirm, showError, closeModal } = useCustomModal();

  const loadAlerts = () => {
    setLoading(true);
    fetch(API_URLS.alerts)
      .then(res => res.json())
      .then(data => {
        console.log('Alert data ricevuti:', data); // Debug
        const alertsArray = Array.isArray(data) ? data : [];
        setAlerts(alertsArray);
        
        // Debug: mostra tutti i tipi presenti
        const tipiPresenti = [...new Set(alertsArray.map(a => a.tipo))];
        console.log('Tipi di alert presenti:', tipiPresenti);
        
        // Debug: mostra quanti tickets ci sono
        const tickets = alertsArray.filter(a => a.tipo === 'Tickets');
        console.log(`Trovati ${tickets.length} tickets:`, tickets);
        
        // Debug: mostra alcuni esempi di alert
        console.log('Primi 3 alert:', alertsArray.slice(0, 3));
      })
      .catch(err => {
        console.error('Errore caricamento alert:', err);
        setAlerts([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = alerts.filter(a => a.tipo === activeTab);

  // Conteggi alert attivi per badge
  const countByType = type => alerts.filter(a => a.tipo === type && (a.stato === 'aperto' || a.stato === 'in_carico')).length;

  // Funzione per chiudere alert
  const closeAlert = async (id) => {
    showConfirm(
      "Vuoi davvero chiudere questo alert?",
      async () => {
        try {
          await fetch(`${API_URLS.alerts}/${id}/close`, { method: 'PATCH' });
          // Ricarica i dati
          loadAlerts();
        } catch (err) {
          showError('Errore durante la chiusura dell\'alert');
        }
      }
    );
  };

  // Funzione per prendere in carico un ticket
  const takeTicket = async (id) => {
    showConfirm(
      "Vuoi prendere in carico questo ticket?",
      async () => {
        try {
          await fetch(`${API_URLS.alerts}/${id}/take`, { method: 'PATCH' });
          // Ricarica i dati
          loadAlerts();
        } catch (err) {
          showError('Errore durante la presa in carico del ticket');
        }
      }
    );
  };

  // Funzione per mostrare note in modale con ricambi links
  const showNote = (note) => {
    const content = (
      <div className="alert-message">
        <TextWithRicambiLinks text={note || "Nessuna nota"} />
      </div>
    );
    showAlert(content, "Note");
  };

  // Funzione per estrarre e formattare la data di scadenza per gli alert di tipo scadenza
  const getDataPerScadenze = (alert) => {
    if (activeTab !== 'scadenza') {
      return alert.data_creazione;
    }
    
    // Per gli alert di scadenza, usa data_scadenza se disponibile
    if (alert.data_scadenza) {
      return new Date(alert.data_scadenza).toLocaleDateString('it-IT');
    }
    
    // Fallback: prova a estrarre la data dalla descrizione
    if (alert.descrizione) {
      // Cerca pattern come "prevista per il 05/09/2025" o "era prevista il 05/09/2025"
      const dateMatch = alert.descrizione.match(/(?:prevista|era prevista).*?(\d{2}\/\d{2}\/\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        return dateMatch[1];
      }
    }
    
    // Ultimo fallback alla data di creazione formattata
    return new Date(alert.data_creazione).toLocaleDateString('it-IT');
  };

  // Funzione per ottenere il colore dello stato
  const getStatoColor = (stato) => {
    switch (stato) {
      case 'aperto': return 'var(--error-color)';
      case 'in_carico': return 'var(--warning-color)';
      case 'chiuso': return 'var(--success-color)';
      default: return 'var(--color-text-secondary)';
    }
  };

  // Funzione per ottenere il label dello stato
  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'aperto': return 'Aperto';
      case 'in_carico': return 'In Carico';
      case 'chiuso': return 'Chiuso';
      default: return stato || 'N/A';
    }
  };

  // Separazione alert attivi e chiusi
  const attivi = filtered.filter(a => a.stato === 'aperto' || a.stato === 'in_carico');
  const chiusi = filtered.filter(a => a.stato === 'chiuso');

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ color: 'var(--primary-color)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
          🚨 Gestione Alert
        </h2>
        <button 
          className="btn btn-outline"
          onClick={loadAlerts}
          disabled={loading}
        >
          {loading ? '🔄 Caricamento...' : '🔄 Ricarica'}
        </button>
      </div>
      
      <div className="card">
        <div className="card-content">
          <div style={{ display: "flex", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)" }}>
            {AlertTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
                style={{ position: 'relative' }}
              >
                {tab.label}
                {countByType(tab.key) > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: 'var(--error-color)',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: 'var(--font-size-xs)',
                    minWidth: 20,
                    height: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'var(--font-weight-bold)',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    {countByType(tab.key)}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <div className="card" style={{ background: "var(--color-bg-primary)", minHeight: 300 }}>
            <div className="card-content">
              {attivi.length === 0 && chiusi.length === 0 ? (
                <div className="text-muted text-center">
                  Nessun alert presente in questa categoria.
                </div>
              ) : (
                <>
                  {attivi.length > 0 && (
                    <>
                      <h3 style={{ 
                        fontWeight: 'var(--font-weight-semibold)', 
                        color: 'var(--error-color)', 
                        marginBottom: 'var(--spacing-md)',
                        fontSize: 'var(--font-size-lg)'
                      }}>
                        {activeTab === 'Tickets' ? 'Tickets attivi' : 'Alert attivi'}
                      </h3>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrizione</th>
                            {activeTab !== 'scadenza' && <th>{activeTab === 'Tickets' ? 'Utente' : 'Operatore'}</th>}
                            <th>Civico</th>
                            <th>Asset</th>
                            <th>Stato</th>
                            {activeTab !== 'Tickets' && <th>Note</th>}
                            <th>Azioni</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attivi.map(alert => (
                            <tr key={alert.id}>
                              <td>{getDataPerScadenze(alert)}</td>
                              <td style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                {activeTab === 'Tickets' ? (
                                  <button 
                                    onClick={() => showNote(alert.descrizione)} 
                                    className="btn btn-sm btn-info"
                                  >
                                    👁️ Vedi
                                  </button>
                                ) : (
                                  alert.descrizione
                                )}
                              </td>
                              {activeTab !== 'scadenza' && (
                                <td style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--primary-color)' }}>
                                  {alert.operatore || 'N/A'}
                                </td>
                              )}
                              <td>{alert.civico}</td>
                              <td>{alert.asset}</td>
                              <td>
                                <span style={{ 
                                  color: getStatoColor(alert.stato),
                                  fontWeight: 'var(--font-weight-semibold)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: `${getStatoColor(alert.stato)}15`,
                                  fontSize: '0.875rem'
                                }}>
                                  {getStatoLabel(alert.stato)}
                                </span>
                              </td>
                              {activeTab !== 'Tickets' && (
                                <td>
                                  <button 
                                    onClick={() => showNote(alert.note)} 
                                    className="btn btn-sm btn-info"
                                  >
                                    👁️ Vedi
                                  </button>
                                </td>
                              )}
                              <td>
                                {activeTab === 'Tickets' ? (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    {alert.stato === 'aperto' && (
                                      <button 
                                        onClick={() => takeTicket(alert.id)} 
                                        className="btn btn-sm btn-outline"
                                        style={{ color: 'var(--warning-color)', borderColor: 'var(--warning-color)' }}
                                      >
                                        Prendi in carico
                                      </button>
                                    )}
                                    {(alert.stato === 'in_carico' || alert.stato === 'aperto') && (
                                      <button 
                                        onClick={() => closeAlert(alert.id)} 
                                        className="btn btn-sm btn-primary"
                                      >
                                        Chiudi
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => closeAlert(alert.id)} 
                                    className="btn btn-sm btn-primary"
                                  >
                                    Chiudi
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  
                  {chiusi.length > 0 && (
                    <>
                      <h3 style={{ 
                        fontWeight: 'var(--font-weight-semibold)', 
                        color: 'var(--color-text-secondary)', 
                        marginBottom: 'var(--spacing-md)',
                        fontSize: 'var(--font-size-lg)',
                        marginTop: attivi.length > 0 ? 'var(--spacing-xl)' : 0
                      }}>
                        Alert chiusi (ultimi 30gg)
                      </h3>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrizione</th>
                            {activeTab !== 'scadenza' && <th>{activeTab === 'Tickets' ? 'Utente' : 'Operatore'}</th>}
                            <th>Civico</th>
                            <th>Asset</th>
                            <th>Stato</th>
                            {activeTab !== 'Tickets' && <th>Note</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {chiusi.map(alert => (
                            <tr key={alert.id}>
                              <td>{getDataPerScadenze(alert)}</td>
                              <td style={{ fontWeight: 'var(--font-weight-medium)' }}>
                                {activeTab === 'Tickets' ? (
                                  <button 
                                    onClick={() => showNote(alert.descrizione)} 
                                    className="btn btn-sm btn-info"
                                  >
                                    👁️ Vedi
                                  </button>
                                ) : (
                                  alert.descrizione
                                )}
                              </td>
                              {activeTab !== 'scadenza' && (
                                <td style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
                                  {alert.operatore || 'N/A'}
                                </td>
                              )}
                              <td>{alert.civico}</td>
                              <td>{alert.asset}</td>
                              <td>
                                <span style={{ 
                                  color: getStatoColor(alert.stato),
                                  fontWeight: 'var(--font-weight-semibold)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: `${getStatoColor(alert.stato)}15`,
                                  fontSize: '0.875rem'
                                }}>
                                  {getStatoLabel(alert.stato)}
                                </span>
                              </td>
                              {activeTab !== 'Tickets' && (
                                <td>
                                  <button 
                                    onClick={() => showNote(alert.note)} 
                                    className="btn btn-sm btn-info"
                                  >
                                    👁️ Vedi
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal personalizzato */}
      <CustomModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
      />
    </div>
  );
};

export default AlertScreen;
