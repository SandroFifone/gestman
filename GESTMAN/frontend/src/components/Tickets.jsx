import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Riutilizziamo gli stili della dashboard per consistenza

const Tickets = ({ username }) => {
  const [tickets, setTickets] = useState([]);
  const [civici, setCivici] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroStato, setFiltroStato] = useState('tutti');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form per nuovo ticket
  const [nuovoTicket, setNuovoTicket] = useState({
    civico_id: '',
    asset_id: '',
    note: ''
  });

  useEffect(() => {
    caricaDati();
  }, [username]);

  const caricaDati = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica tickets, civici e assets in parallelo
      const [ticketsRes, civiciRes, assetsRes] = await Promise.all([
        fetch('/api/alert'),
        fetch('/api/civici'),
        fetch('/api/assets')
      ]);

      if (!ticketsRes.ok || !civiciRes.ok || !assetsRes.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const [ticketsData, civiciData, assetsData] = await Promise.all([
        ticketsRes.json(),
        civiciRes.json(),
        assetsRes.json()
      ]);

      // Filtra solo i tickets dell'utente corrente
      // L'API restituisce direttamente l'array di alert
      const userTickets = ticketsData?.filter(alert => {
        if (!alert || !alert.tipo || !alert.operatore) return false;
        return alert.tipo === 'Tickets' && alert.operatore === username;
      }) || [];
      
      setTickets(userTickets);
      setCivici(Array.isArray(civiciData.civici) ? civiciData.civici : []);
      setAssets(Array.isArray(assetsData.assets) ? assetsData.assets : []);

    } catch (err) {
      setError(err.message);
      console.error('Errore caricamento dati:', err);
    } finally {
      setLoading(false);
    }
  };

  const creaTicket = async (e) => {
    e.preventDefault();
    
    if (!nuovoTicket.note.trim()) {
      alert('Le note sono obbligatorie per creare un ticket');
      return;
    }

    try {
      const ticketData = {
        tipo: 'Tickets',
        operatore: username,  // Usa 'operatore' invece di 'utente'
        descrizione: nuovoTicket.note.trim(),
        civico: nuovoTicket.civico_id || null,
        asset: nuovoTicket.asset_id || null,
        stato: 'aperto'
      };

      const response = await fetch('/api/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore nella creazione del ticket');
      }

      // Reset form e ricarica tickets
      setNuovoTicket({ civico_id: '', asset_id: '', note: '' });
      setShowCreateForm(false);
      caricaDati();
      
      alert('Ticket creato con successo!');

    } catch (err) {
      console.error('Errore creazione ticket:', err);
      alert(`Errore nella creazione del ticket: ${err.message}`);
    }
  };

  const cambiaStatoTicket = async (ticketId, nuovoStato) => {
    try {
      const response = await fetch(`/api/alert/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stato: nuovoStato }),
      });

      if (!response.ok) {
        throw new Error('Errore nell\'aggiornamento del ticket');
      }

      // Ricarica i tickets
      caricaDati();
    } catch (err) {
      console.error('Errore aggiornamento ticket:', err);
      alert('Errore nell\'aggiornamento del ticket');
    }
  };

  const getCivicoNome = (civicoId) => {
    if (!civicoId) return null;
    if (!civici || civici.length === 0) return `Civico: ${civicoId}`;
    
    const civico = civici.find(c => {
      if (!c || c.numero === undefined) return false;
      return c.numero === civicoId || c.numero.toString() === civicoId.toString();
    });
    return civico ? `${civico.numero} - ${civico.descrizione || ''}`.trim() : `Civico: ${civicoId}`;
  };

  const getAssetNome = (assetId) => {
    if (!assetId) return null;
    if (!assets || assets.length === 0) return `Asset: ${assetId}`;
    
    const asset = assets.find(a => {
      if (!a || a.id_aziendale === undefined) return false;
      return a.id_aziendale === assetId || a.id_aziendale.toString() === assetId.toString();
    });
    return asset ? `${asset.id_aziendale} (${asset.tipo || 'N/A'})` : `Asset: ${assetId}`;
  };

  const getStatoColor = (stato) => {
    switch (stato) {
      case 'aperto': return 'red';
      case 'in_carico': return 'orange';
      case 'chiuso': return 'blue';
      default: return 'blue';
    }
  };

  const getStatoLabel = (stato) => {
    switch (stato) {
      case 'aperto': return 'Aperto';
      case 'in_carico': return 'In Carico';
      case 'chiuso': return 'Chiuso';
      default: return stato;
    }
  };

  const ticketsFiltrati = tickets.filter(ticket => {
    if (filtroStato === 'tutti') return true;
    return ticket.stato === filtroStato;
  });

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>🎫 I Miei Tickets</h1>
          <p>Caricamento tickets...</p>
        </div>
        <div className="loading-spinner">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>🎫 I Miei Tickets</h1>
          <div className="error-message">
            ❌ Errore: {error}
            <button onClick={caricaDati} className="retry-button">
              🔄 Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🎫 I Miei Tickets</h1>
        <p>Crea e gestisci le tue richieste</p>
        <div className="tickets-buttons-container">
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)} 
            className={`tickets-button primary-button ${showCreateForm ? 'cancel' : ''}`}
          >
            {showCreateForm ? '❌ Annulla' : '➕ Nuovo Ticket'}
          </button>
          <button onClick={caricaDati} className="tickets-button refresh-button">
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* Form Creazione Ticket */}
      {showCreateForm && (
        <div className="dashboard-section">
          <h2>➕ Crea Nuovo Ticket</h2>
          <form onSubmit={creaTicket} style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Selezione Civico */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  🏢 Civico (facoltativo)
                </label>
                <select
                  value={nuovoTicket.civico_id}
                  onChange={(e) => setNuovoTicket({...nuovoTicket, civico_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Seleziona civico...</option>
                  {civici && civici.map(civico => (
                    civico && civico.numero ? (
                      <option key={`civico-${civico.numero}`} value={civico.numero}>
                        {civico.numero} - {civico.descrizione || ''}
                      </option>
                    ) : null
                  ))}
                </select>
              </div>

              {/* Selezione Asset */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  ⚙️ Asset (facoltativo)
                </label>
                <select
                  value={nuovoTicket.asset_id}
                  onChange={(e) => setNuovoTicket({...nuovoTicket, asset_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Seleziona asset...</option>
                  {assets && assets
                    .filter(asset => {
                      if (!asset || asset.id_aziendale === undefined) return false;
                      if (!nuovoTicket.civico_id) return true;
                      return asset.civico_numero === nuovoTicket.civico_id;
                    })
                    .map(asset => (
                      <option key={`asset-${asset.id_aziendale}`} value={asset.id_aziendale}>
                        {asset.id_aziendale} ({asset.tipo || 'N/A'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Note */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                📝 Note *
              </label>
              <textarea
                value={nuovoTicket.note}
                onChange={(e) => setNuovoTicket({...nuovoTicket, note: e.target.value})}
                placeholder="Descrivi il problema o la richiesta..."
                required
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: '#059669',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              >
                🎫 Crea Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtri */}
      <div className="dashboard-section">
        <h2>🔍 Filtri</h2>
        <div className="filtri-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['tutti', 'aperto', 'in_carico', 'chiuso'].map(stato => (
            <button
              key={stato}
              onClick={() => setFiltroStato(stato)}
              style={{
                padding: '6px 12px',
                border: filtroStato === stato ? '2px solid #2563eb' : '1px solid #e5e7eb',
                background: filtroStato === stato ? '#eff6ff' : 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                textTransform: 'capitalize'
              }}
            >
              {stato === 'tutti' ? 'Tutti' : getStatoLabel(stato)}
            </button>
          ))}
        </div>
      </div>

      {/* Lista Tickets */}
      <div className="dashboard-section">
        <h2>📋 I Miei Tickets ({ticketsFiltrati.length})</h2>
        
        {ticketsFiltrati.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            {filtroStato === 'tutti' ? 
              '🎫 Non hai ancora creato alcun ticket' : 
              `🎫 Nessun ticket con stato "${getStatoLabel(filtroStato)}"`
            }
          </div>
        ) : (
          <div className="tickets-list" style={{ display: 'grid', gap: '12px' }}>
            {ticketsFiltrati.map(ticket => {
              // Controllo di sicurezza per evitare errori
              if (!ticket || !ticket.id) {
                console.warn('Ticket non valido:', ticket);
                return null;
              }
              
              return (
                <div 
                  key={`ticket-${ticket.id}`}
                  className={`stat-card stat-card-${getStatoColor(ticket.stato)}`}
                  style={{ padding: '16px' }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                      Ticket #{ticket.id}
                    </h3>
                    <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#6b7280' }}>
                      Creato: {new Date(ticket.data_creazione).toLocaleString('it-IT')}
                    </p>
                  </div>
                  <span 
                    style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      backgroundColor: getStatoColor(ticket.stato) === 'red' ? '#fee2e2' : 
                                      getStatoColor(ticket.stato) === 'orange' ? '#fef3c7' :
                                      '#dbeafe',
                      color: getStatoColor(ticket.stato) === 'red' ? '#dc2626' : 
                             getStatoColor(ticket.stato) === 'orange' ? '#d97706' :
                             '#2563eb'
                    }}
                  >
                    {getStatoLabel(ticket.stato)}
                  </span>
                </div>
                
                {ticket.descrizione && (
                  <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#374151', lineHeight: '1.4' }}>
                    {ticket.descrizione}
                  </p>
                )}
                
                {/* Informazioni Civico e Asset */}
                <div style={{ margin: '8px 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  {getCivicoNome(ticket.civico) && (
                    <p style={{ margin: '2px 0' }}>
                      🏢 {getCivicoNome(ticket.civico)}
                    </p>
                  )}
                  {getAssetNome(ticket.asset) && (
                    <p style={{ margin: '2px 0' }}>
                      ⚙️ {getAssetNome(ticket.asset)}
                    </p>
                  )}
                </div>

                {/* Nota: Gli utenti normali non possono cambiare stato */}
                {ticket.stato !== 'aperto' && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic' }}>
                    ℹ️ Lo stato del ticket viene gestito dagli amministratori
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <p>Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}</p>
      </div>
    </div>
  );
};

export default Tickets;
