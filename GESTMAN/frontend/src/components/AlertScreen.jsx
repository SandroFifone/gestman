import React, { useEffect, useState } from "react";
import CustomModal from './CustomModal';
import TextWithRicambiLinks from './TextWithRicambiLinks';
import { useCustomModal } from '../hooks/useCustomModal';
import { API_URLS } from '../config/api';
import './AlertScreen.css';

const AlertTabs = [
  { key: "non_conformita", label: "Non Conformità" },
  { key: "scadenza", label: "Scadenze" },
  { key: "Tickets", label: "Tickets" },
];

const AlertScreen = () => {
  const [activeTab, setActiveTab] = useState("non_conformita");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlertMobile, setSelectedAlertMobile] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [selectedAlerts, setSelectedAlerts] = useState([]); // Stato per selezione multipla
  
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

  // Resetta selezione quando cambia tab
  useEffect(() => {
    setSelectedAlerts([]);
  }, [activeTab]);

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

  // Funzione per gestire selezione singola
  const toggleSelectAlert = (id) => {
    setSelectedAlerts(prev => 
      prev.includes(id) 
        ? prev.filter(alertId => alertId !== id)
        : [...prev, id]
    );
  };

  // Funzione per selezionare/deselezionare tutti gli alert attivi
  const toggleSelectAll = () => {
    if (selectedAlerts.length === attivi.length) {
      setSelectedAlerts([]);
    } else {
      setSelectedAlerts(attivi.map(a => a.id));
    }
  };

  // Funzione per chiusura multipla
  const bulkCloseAlerts = async () => {
    if (selectedAlerts.length === 0) {
      showError('Nessun alert selezionato');
      return;
    }

    showConfirm(
      `Vuoi davvero chiudere ${selectedAlerts.length} alert selezionati?`,
      async () => {
        try {
          const response = await fetch(`${API_URLS.alerts}/bulk-close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alert_ids: selectedAlerts })
          });

          if (!response.ok) {
            throw new Error('Errore durante la chiusura multipla');
          }

          const result = await response.json();
          showAlert(`${result.closed_count} alert chiusi con successo`, 'Successo');
          
          // Resetta selezione e ricarica
          setSelectedAlerts([]);
          loadAlerts();
        } catch (err) {
          showError('Errore durante la chiusura multipla degli alert');
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
    <div className="section-container">
      <div className="section-header">
        <h1>🚨 Alert</h1>
        <p>Gestione alert e notifiche - Non conformità, scadenze e tickets</p>
      </div>

      <div className="section-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
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
          <div className="alert-tabs">
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
                      
                      {/* Barra selezione multipla */}
                      {selectedAlerts.length > 0 && (
                        <div style={{
                          background: 'var(--primary-color)',
                          color: '#fff',
                          padding: 'var(--spacing-md)',
                          borderRadius: 'var(--border-radius)',
                          marginBottom: 'var(--spacing-md)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: 'var(--shadow-md)'
                        }}>
                          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                            {selectedAlerts.length} alert selezionati
                          </span>
                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button 
                              onClick={() => setSelectedAlerts([])}
                              className="btn btn-outline"
                              style={{ background: 'white', color: 'var(--primary-color)', borderColor: 'white' }}
                            >
                              Deseleziona tutto
                            </button>
                            <button 
                              onClick={bulkCloseAlerts}
                              className="btn btn-primary"
                              style={{ background: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                            >
                              ✓ Chiudi selezionati
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Tabella desktop */}
                      <div className="alert-table-desktop">
                        <table className="table">
                          <thead>
                            <tr>
                              <th style={{ width: '40px' }}>
                                <input 
                                  type="checkbox"
                                  checked={attivi.length > 0 && selectedAlerts.length === attivi.length}
                                  onChange={toggleSelectAll}
                                  style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                />
                              </th>
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
                                <td>
                                  <input 
                                    type="checkbox"
                                    checked={selectedAlerts.includes(alert.id)}
                                    onChange={() => toggleSelectAlert(alert.id)}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                                  />
                                </td>
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
                      </div>

                      {/* Card mobile compatte */}
                      <div className="alert-cards-mobile">
                        {attivi.map(alert => (
                          <div 
                            key={alert.id}
                            className={`alert-card-mobile ${activeTab}`}
                            style={{ 
                              display: 'flex',
                              gap: 'var(--spacing-sm)',
                              alignItems: 'flex-start'
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={selectedAlerts.includes(alert.id)}
                              onChange={() => toggleSelectAlert(alert.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ 
                                cursor: 'pointer', 
                                width: '20px', 
                                height: '20px',
                                marginTop: '8px',
                                flexShrink: 0
                              }}
                            />
                            <div 
                              style={{ flex: 1 }}
                              onClick={() => setSelectedAlertMobile(alert)}
                            >
                            <div className="alert-card-header">
                              <span className="alert-card-date">{getDataPerScadenze(alert)}</span>
                              <span className={`alert-card-stato ${alert.stato}`}>
                                {getStatoLabel(alert.stato)}
                              </span>
                            </div>
                            <div className="alert-card-body">
                              <p className={`alert-card-descrizione ${!expandedDescriptions[alert.id] ? 'truncated' : ''}`}>
                                {alert.descrizione}
                              </p>
                              <div className="alert-card-info">
                                {activeTab !== 'scadenza' && (
                                  <div className="alert-card-info-row">
                                    <span className="alert-card-info-label">{activeTab === 'Tickets' ? 'Utente:' : 'Operatore:'}</span>
                                    <span className="alert-card-info-value">{alert.operatore || 'N/A'}</span>
                                  </div>
                                )}
                                <div className="alert-card-info-row">
                                  <span className="alert-card-info-label">Civico:</span>
                                  <span className="alert-card-info-value">{alert.civico}</span>
                                </div>
                                <div className="alert-card-info-row">
                                  <span className="alert-card-info-label">Asset:</span>
                                  <span className="alert-card-info-value">{alert.asset}</span>
                                </div>
                              </div>
                            </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
                      
                      {/* Tabella desktop */}
                      <div className="alert-table-desktop">
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
                      </div>

                      {/* Card mobile compatte per chiusi */}
                      <div className="alert-cards-mobile">
                        {chiusi.map(alert => (
                          <div 
                            key={alert.id}
                            className={`alert-card-mobile ${activeTab}`}
                            onClick={() => setSelectedAlertMobile(alert)}
                          >
                            <div className="alert-card-header">
                              <span className="alert-card-date">{getDataPerScadenze(alert)}</span>
                              <span className={`alert-card-stato ${alert.stato}`}>
                                {getStatoLabel(alert.stato)}
                              </span>
                            </div>
                            <div className="alert-card-body">
                              <p className="alert-card-descrizione truncated">
                                {alert.descrizione}
                              </p>
                              <div className="alert-card-info">
                                {activeTab !== 'scadenza' && (
                                  <div className="alert-card-info-row">
                                    <span className="alert-card-info-label">{activeTab === 'Tickets' ? 'Utente:' : 'Operatore:'}</span>
                                    <span className="alert-card-info-value">{alert.operatore || 'N/A'}</span>
                                  </div>
                                )}
                                <div className="alert-card-info-row">
                                  <span className="alert-card-info-label">Civico:</span>
                                  <span className="alert-card-info-value">{alert.civico}</span>
                                </div>
                                <div className="alert-card-info-row">
                                  <span className="alert-card-info-label">Asset:</span>
                                  <span className="alert-card-info-value">{alert.asset}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal dettaglio alert mobile */}
      {selectedAlertMobile && (
        <div className="contatto-detail-modal" onClick={() => setSelectedAlertMobile(null)}>
          <div className="contatto-detail-content" onClick={(e) => e.stopPropagation()}>
            <div className="contatto-detail-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', color: 'var(--gray-900)' }}>
                  {activeTab === 'non_conformita' ? 'Non Conformità' : activeTab === 'scadenza' ? 'Scadenza' : 'Ticket'}
                </h3>
                <span className={`alert-card-stato ${selectedAlertMobile.stato}`} style={{ display: 'inline-block', marginTop: '8px' }}>
                  {getStatoLabel(selectedAlertMobile.stato)}
                </span>
              </div>
              <button 
                className="btn-icon-only" 
                onClick={() => setSelectedAlertMobile(null)}
                style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                ×
              </button>
            </div>
            
            <div className="contatto-detail-body">
              <div className="contatto-detail-section">
                <label className="contatto-detail-label">Data:</label>
                <p className="contatto-detail-value">{getDataPerScadenze(selectedAlertMobile)}</p>
              </div>

              <div className="contatto-detail-section">
                <label className="contatto-detail-label">Descrizione:</label>
                <p className="contatto-detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedAlertMobile.descrizione}
                </p>
              </div>

              {activeTab !== 'scadenza' && (
                <div className="contatto-detail-section">
                  <label className="contatto-detail-label">{activeTab === 'Tickets' ? 'Utente:' : 'Operatore:'}</label>
                  <p className="contatto-detail-value">{selectedAlertMobile.operatore || 'N/A'}</p>
                </div>
              )}

              <div className="contatto-detail-section">
                <label className="contatto-detail-label">Civico:</label>
                <p className="contatto-detail-value">{selectedAlertMobile.civico}</p>
              </div>

              <div className="contatto-detail-section">
                <label className="contatto-detail-label">Asset:</label>
                <p className="contatto-detail-value">{selectedAlertMobile.asset}</p>
              </div>

              {activeTab !== 'Tickets' && selectedAlertMobile.note && (
                <div className="contatto-detail-section">
                  <label className="contatto-detail-label">Note:</label>
                  <div className="contatto-detail-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    <TextWithRicambiLinks text={selectedAlertMobile.note} />
                  </div>
                </div>
              )}

              {/* Azioni disponibili solo per alert attivi */}
              {selectedAlertMobile.stato !== 'chiuso' && (
                <div className="contatto-detail-actions" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                  {activeTab === 'Tickets' ? (
                    <>
                      {selectedAlertMobile.stato === 'aperto' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            takeTicket(selectedAlertMobile.id);
                            setSelectedAlertMobile(null);
                          }}
                          className="btn btn-outline"
                          style={{ width: '100%', color: 'var(--warning-color)', borderColor: 'var(--warning-color)' }}
                        >
                          Prendi in carico
                        </button>
                      )}
                      {(selectedAlertMobile.stato === 'in_carico' || selectedAlertMobile.stato === 'aperto') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            closeAlert(selectedAlertMobile.id);
                            setSelectedAlertMobile(null);
                          }}
                          className="btn btn-primary"
                          style={{ width: '100%' }}
                        >
                          Chiudi Ticket
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        closeAlert(selectedAlertMobile.id);
                        setSelectedAlertMobile(null);
                      }}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      Chiudi Alert
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
    </div>
  );
};

export default AlertScreen;
