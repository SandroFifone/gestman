import React, { useState, useEffect } from "react";

const CalendarioManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState("scadenze");
  const [scadenze, setScadenze] = useState([]);
  const [tipologie, setTipologie] = useState([]);
  const [tipologiePerScadenza, setTipologiePerScadenza] = useState([]); // Per il dropdown nel modal scadenza
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  // Stato per nuova scadenza
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScadenza, setNewScadenza] = useState({
    manutenzione_id: "",
    civico: "",
    asset: "",
    asset_tipo: "",
    data_scadenza: ""
  });

  // Stato per nuova tipologia
  const [showAddTipologiaModal, setShowAddTipologiaModal] = useState(false);
  const [newTipologia, setNewTipologia] = useState({
    asset_tipo: "",
    nome_manutenzione: "",
    descrizione: "",
    frequenza_mesi: "",
    giorni_preavviso: ""
  });

  const CalendarioTabs = [
    { key: "scadenze", label: "Scadenze Programmate" },
    { key: "tipologie", label: "Tipologie Manutenzione" }
  ];

  useEffect(() => {
    loadData();
    loadAssetTypes();
    loadAllTipologie(); // Per il dropdown nel modal scadenza
  }, []);

  useEffect(() => {
    if (selectedAssetType) {
      loadTipologieByAsset(selectedAssetType);
    }
  }, [selectedAssetType]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const scadenzeRes = await fetch("/api/calendario/scadenze");
      
      if (scadenzeRes.ok) {
        const scadenzeData = await scadenzeRes.json();
        setScadenze(scadenzeData.scadenze || []);
      } else {
        setError("Errore nel caricamento delle scadenze");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
    setLoading(false);
  };

  const loadAllTipologie = async () => {
    try {
      const res = await fetch("/api/calendario/manutenzioni/tipologie");
      if (res.ok) {
        const data = await res.json();
        setTipologiePerScadenza(data.tipologie || []);
      }
    } catch (err) {
      console.error("Errore caricamento tutte le tipologie:", err);
    }
  };

  const loadAssetTypes = async () => {
    try {
      const res = await fetch("/api/calendario/manutenzioni/asset-types");
      if (res.ok) {
        const data = await res.json();
        setAssetTypes(data.asset_types || []);
        if (data.asset_types && data.asset_types.length > 0) {
          setSelectedAssetType(data.asset_types[0]);
        }
      }
    } catch (err) {
      console.error("Errore caricamento tipi asset:", err);
    }
  };

  const loadTipologieByAsset = async (assetType) => {
    try {
      const res = await fetch(`/api/calendario/manutenzioni/tipologie?asset_tipo=${encodeURIComponent(assetType)}`);
      if (res.ok) {
        const data = await res.json();
        setTipologie(data.tipologie || []);
      }
    } catch (err) {
      console.error("Errore caricamento tipologie:", err);
    }
  };

  const addScadenza = async () => {
    if (!newScadenza.manutenzione_id || !newScadenza.civico || !newScadenza.asset || !newScadenza.data_scadenza) {
      setError("Tutti i campi sono richiesti");
      return;
    }

    try {
      const res = await fetch("/api/calendario/scadenze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newScadenza)
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("Scadenza aggiunta correttamente");
        setShowAddModal(false);
        setNewScadenza({
          manutenzione_id: "",
          civico: "",
          asset: "",
          asset_tipo: "",
          data_scadenza: ""
        });
        loadData();
        loadAllTipologie(); // Ricarica le tipologie per il dropdown
      } else {
        setError(data.error || "Errore nell'aggiunta della scadenza");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
  };

  const addTipologia = async () => {
    if (!newTipologia.asset_tipo || !newTipologia.nome_manutenzione || !newTipologia.frequenza_mesi || !newTipologia.giorni_preavviso) {
      setError("Tutti i campi obbligatori devono essere compilati");
      return;
    }

    try {
      const res = await fetch("/api/calendario/manutenzioni/tipologie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTipologia)
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("Tipologia aggiunta correttamente");
        setShowAddTipologiaModal(false);
        setNewTipologia({
          asset_tipo: "",
          nome_manutenzione: "",
          descrizione: "",
          frequenza_mesi: "",
          giorni_preavviso: ""
        });
        loadTipologieByAsset(selectedAssetType);
        loadAssetTypes(); // Ricarica i tipi asset nel caso sia stato aggiunto un nuovo tipo
        loadAllTipologie(); // Ricarica tutte le tipologie per il dropdown
      } else {
        setError(data.error || "Errore nell'aggiunta della tipologia");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
  };

  const deleteTipologia = async (tipologiaId, nomeTipologia) => {
    if (!window.confirm(`Vuoi davvero eliminare la tipologia "${nomeTipologia}"?\n\nATTENZIONE: Non sarà possibile eliminarla se ci sono scadenze programmate associate.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/calendario/manutenzioni/tipologie/${tipologiaId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("Tipologia eliminata correttamente");
        loadTipologieByAsset(selectedAssetType);
      } else {
        setError(data.error || "Errore nell'eliminazione della tipologia");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
  };

  const completaScadenza = async (scadenzaId) => {
    if (!window.confirm("Vuoi segnare questa manutenzione come completata? Verrà automaticamente programmata la prossima scadenza.")) {
      return;
    }

    try {
      const res = await fetch(`/api/calendario/scadenze/${scadenzaId}/completa`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatore: user?.username || "Sconosciuto",
          note: `Completata il ${new Date().toLocaleDateString()}`
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage("Manutenzione completata e prossima scadenza programmata");
        loadData();
      } else {
        setError(data.error || "Errore nel completamento");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
  };

  const generaAlert = async () => {
    try {
      const res = await fetch("/api/calendario/genera-alert", {
        method: "POST"
      });

      const data = await res.json();
      
      if (res.ok) {
        setMessage(`Controllo scadenze completato. Generati ${data.alert_generati} alert`);
      } else {
        setError(data.error || "Errore nella generazione alert");
      }
    } catch (err) {
      setError("Errore connessione server");
    }
  };

  const getStatoBadge = (scadenza) => {
    const oggi = new Date();
    const dataScadenza = new Date(scadenza.data_scadenza.split('/').reverse().join('-'));
    const giorniRimanenti = Math.ceil((dataScadenza - oggi) / (1000 * 60 * 60 * 24));

    if (giorniRimanenti < 0) {
      return <span style={{background: '#dc3545', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12}}>SCADUTA</span>;
    } else if (giorniRimanenti === 0) {
      return <span style={{background: '#fd7e14', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12}}>OGGI</span>;
    } else if (giorniRimanenti <= 7) {
      return <span style={{background: '#ffc107', color: '#000', padding: '2px 8px', borderRadius: 12, fontSize: 12}}>URGENTE</span>;
    } else if (giorniRimanenti <= 30) {
      return <span style={{background: '#17a2b8', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12}}>PROSSIMA</span>;
    } else {
      return <span style={{background: '#28a745', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 12}}>OK</span>;
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-content">
            <div className="text-center">Caricamento...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        📅 Calendario Manutenzioni
      </h2>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {error}
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div className="card-content">
          <div style={{ display: "flex", gap: "var(--spacing-md)", marginBottom: "var(--spacing-lg)" }}>
            {CalendarioTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
              >
                {tab.label}
              </button>
            ))}
            
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn btn-primary"
              >
                ➕ Nuova Scadenza
              </button>
              <button
                onClick={generaAlert}
                className="btn btn-outline"
              >
                🔔 Controlla Scadenze
              </button>
              {activeTab === "tipologie" && (
                <button
                  onClick={() => {
                    setNewTipologia({
                      asset_tipo: selectedAssetType || "",
                      nome_manutenzione: "",
                      descrizione: "",
                      frequenza_mesi: "",
                      giorni_preavviso: ""
                    });
                    setShowAddTipologiaModal(true);
                  }}
                  className="btn btn-success"
                >
                  ➕ Nuova Tipologia
                </button>
              )}
            </div>
          </div>

          {activeTab === "scadenze" && (
            <div className="card" style={{ background: "var(--color-bg-primary)" }}>
              <div className="card-content">
                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Scadenze Programmate</h3>
                
                {scadenze.length === 0 ? (
                  <div className="text-muted text-center">
                    Nessuna scadenza programmata.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Data Scadenza</th>
                          <th>Stato</th>
                          <th>Civico</th>
                          <th>Asset</th>
                          <th>Tipo Asset</th>
                          <th>Manutenzione</th>
                          <th>Descrizione</th>
                          <th>Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scadenze
                          .filter(s => s.stato === 'programmata')
                          .sort((a, b) => new Date(a.data_scadenza.split('/').reverse().join('-')) - new Date(b.data_scadenza.split('/').reverse().join('-')))
                          .map(scadenza => (
                          <tr key={scadenza.id}>
                            <td style={{ fontWeight: 'var(--font-weight-medium)' }}>
                              {scadenza.data_scadenza}
                            </td>
                            <td>
                              {getStatoBadge(scadenza)}
                            </td>
                            <td>{scadenza.civico}</td>
                            <td>{scadenza.asset}</td>
                            <td>{scadenza.asset_tipo}</td>
                            <td style={{ fontWeight: 'var(--font-weight-medium)' }}>
                              {scadenza.nome_manutenzione}
                            </td>
                            <td style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                              {scadenza.descrizione}
                            </td>
                            <td>
                              <button
                                onClick={() => completaScadenza(scadenza.id)}
                                className="btn btn-sm btn-primary"
                              >
                                ✅ Completa
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tipologie" && (
            <div className="card" style={{ background: "var(--color-bg-primary)" }}>
              <div className="card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ margin: 0 }}>Tipologie di Manutenzione</h3>
                  
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <label style={{ fontWeight: 'var(--font-weight-medium)' }}>Tipo Asset:</label>
                    <select
                      value={selectedAssetType}
                      onChange={(e) => setSelectedAssetType(e.target.value)}
                      className="form-control"
                      style={{ minWidth: '150px' }}
                    >
                      {assetTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {tipologie.length === 0 ? (
                  <div className="text-muted text-center">
                    {selectedAssetType ? 
                      `Nessuna tipologia configurata per ${selectedAssetType}.` : 
                      "Seleziona un tipo di asset per visualizzare le tipologie."
                    }
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {tipologie.map(tipologia => (
                      <div key={tipologia.id} className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid var(--gray-200)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 4px 0', color: 'var(--primary-color)' }}>
                              {tipologia.nome_manutenzione}
                            </h4>
                            {tipologia.descrizione && (
                              <p style={{ margin: '4px 0', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                {tipologia.descrizione}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', marginTop: '8px' }}>
                              <span style={{ padding: '2px 6px', background: 'var(--primary-color)', color: '#fff', borderRadius: 4 }}>
                                <strong>Frequenza:</strong> {tipologia.frequenza_mesi} mesi
                              </span>
                              <span style={{ padding: '2px 6px', background: 'var(--info-color)', color: '#fff', borderRadius: 4 }}>
                                <strong>Preavviso:</strong> {tipologia.giorni_preavviso} giorni
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => deleteTipologia(tipologia.id, tipologia.nome_manutenzione)}
                            className="btn btn-sm btn-danger"
                            style={{ marginLeft: 'var(--spacing-md)' }}
                          >
                            🗑️ Elimina
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal per aggiungere nuova scadenza */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>➕ Nuova Scadenza</h3>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Tipologia Manutenzione</label>
              <select
                value={newScadenza.manutenzione_id}
                onChange={(e) => {
                  const selected = tipologie.find(t => t.id === parseInt(e.target.value));
                  setNewScadenza({
                    ...newScadenza,
                    manutenzione_id: e.target.value,
                    asset_tipo: selected ? selected.asset_tipo : ""
                  });
                }}
                className="form-control"
              >
                <option value="">Seleziona tipologia...</option>
                {tipologiePerScadenza.map(tip => (
                  <option key={tip.id} value={tip.id}>
                    {tip.asset_tipo} - {tip.nome_manutenzione}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Civico</label>
              <input
                type="text"
                value={newScadenza.civico}
                onChange={(e) => setNewScadenza({...newScadenza, civico: e.target.value})}
                className="form-control"
                placeholder="Es. 123"
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Asset</label>
              <input
                type="text"
                value={newScadenza.asset}
                onChange={(e) => setNewScadenza({...newScadenza, asset: e.target.value})}
                className="form-control"
                placeholder="Es. Fresa CNC-001"
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Data Scadenza</label>
              <input
                type="date"
                value={newScadenza.data_scadenza}
                onChange={(e) => setNewScadenza({...newScadenza, data_scadenza: e.target.value})}
                className="form-control"
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-outline"
              >
                Annulla
              </button>
              <button
                onClick={addScadenza}
                className="btn btn-primary"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal per aggiungere nuova tipologia */}
      {showAddTipologiaModal && (
        <div className="modal-overlay" onClick={() => setShowAddTipologiaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>➕ Nuova Tipologia Manutenzione</h3>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Tipo Asset</label>
              <input
                type="text"
                value={newTipologia.asset_tipo}
                onChange={(e) => setNewTipologia({...newTipologia, asset_tipo: e.target.value})}
                className="form-control"
                placeholder="Es. fresa, scaffalatura, tornio..."
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Nome Manutenzione *</label>
              <input
                type="text"
                value={newTipologia.nome_manutenzione}
                onChange={(e) => setNewTipologia({...newTipologia, nome_manutenzione: e.target.value})}
                className="form-control"
                placeholder="Es. Cambio olio centralina idraulica"
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label>Descrizione</label>
              <textarea
                value={newTipologia.descrizione}
                onChange={(e) => setNewTipologia({...newTipologia, descrizione: e.target.value})}
                className="form-control"
                rows="3"
                placeholder="Descrizione dettagliata della manutenzione..."
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ flex: 1 }}>
                <label>Frequenza (mesi) *</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={newTipologia.frequenza_mesi}
                  onChange={(e) => setNewTipologia({...newTipologia, frequenza_mesi: e.target.value})}
                  className="form-control"
                  placeholder="Es. 12"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Giorni Preavviso *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newTipologia.giorni_preavviso}
                  onChange={(e) => setNewTipologia({...newTipologia, giorni_preavviso: e.target.value})}
                  className="form-control"
                  placeholder="Es. 7"
                />
              </div>
            </div>

            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              <strong>* Campi obbligatori</strong>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddTipologiaModal(false)}
                className="btn btn-outline"
              >
                Annulla
              </button>
              <button
                onClick={addTipologia}
                className="btn btn-primary"
              >
                Aggiungi Tipologia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioManager;
