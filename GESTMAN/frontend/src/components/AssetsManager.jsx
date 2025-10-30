import React, { useState, useEffect } from "react";
import AssetForm from "./AssetForm";
import Modal from "./Modal";
import TextWithRicambiLinks from "./TextWithRicambiLinks";
import InteractiveFloorPlan from "./InteractiveFloorPlan";
import { API_URLS } from "../config/api";

const API = API_URLS.assets;

const AssetsManager = ({ civicoNumero }) => {
  const [assets, setAssets] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]); // Tipi dinamici dal database
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [formTipo, setFormTipo] = useState("");
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState("");
  const [viewAsset, setViewAsset] = useState(null); // asset to view in modal
  const [editAsset, setEditAsset] = useState(null); // asset to edit in modal
  const [loading, setLoading] = useState(true);
  const [contactModal, setContactModal] = useState(null); // contatto da mostrare in modal
  const [selectedFilter, setSelectedFilter] = useState(""); // Filtro per tipo di asset
  const [showFloorPlan, setShowFloorPlan] = useState(false); // Toggle per vista pianta

  // Ottiene i campi per un tipo di asset specifico
  const getFieldsForType = (typeName) => {
    const assetType = assetTypes.find(type => type.name === typeName);
    if (!assetType) return [];
    
    try {
      // Usa fields_order se disponibile, altrimenti usa Object.keys di fields_template
      const fieldsOrder = assetType.fields_order || Object.keys(assetType.fields_template || {});
      
      // Restituisci i campi nell'ordine esatto salvato nel database
      return fieldsOrder;
    } catch (err) {
      console.error('Errore parsing fields_template:', err);
      return [];
    }
  };

  // Ottiene i metadati completi dei campi per un tipo di asset
  const getFieldsMetadataForType = (typeName) => {
    const assetType = assetTypes.find(type => type.name === typeName);
    if (!assetType) return {};
    
    return assetType.fields_template || {};
  };

  // Filtra gli assets in base al tipo selezionato
  const getFilteredAssets = () => {
    if (!selectedFilter || selectedFilter === "") {
      return assets;
    }
    return assets.filter(asset => asset.tipo === selectedFilter);
  };

  // Ottiene la lista dei tipi di asset unici presenti negli assets
  const getAvailableAssetTypes = () => {
    const types = [...new Set(assets.map(asset => asset.tipo))];
    return types.sort();
  };

  // Carica i dettagli di un contatto dalla rubrica
  const loadContactDetails = async (contactName) => {
    console.log('loadContactDetails called with:', contactName); // Debug
    try {
      console.log('Fetching contacts from:', API_URLS.RUBRICA_CONTATTI); // Debug
      const response = await fetch(API_URLS.RUBRICA_CONTATTI);
      if (response.ok) {
        const data = await response.json();
        console.log('Contacts data received:', data); // Debug
        const contacts = data.contatti || [];
        const contact = contacts.find(c => c.nome === contactName);
        
        if (contact) {
          console.log('Contact found, setting modal:', contact); // Debug
          setContactModal(contact);
        } else {
          console.error('Contatto non trovato:', contactName);
          console.log('Available contacts:', contacts.map(c => c.nome)); // Debug
          alert(`Contatto "${contactName}" non trovato nella rubrica`);
        }
      } else {
        console.error('Response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Errore caricamento dettagli contatto:', error);
      alert('Errore nel caricamento dei dettagli del contatto');
    }
  };

  // Renderizza il valore di un campo basandosi sul tipo
  const renderFieldValue = (fieldName, value, assetType) => {
    const fieldsMetadata = getFieldsMetadataForType(assetType);
    const fieldMetadata = fieldsMetadata[fieldName] || {};
    const fieldType = fieldMetadata.type;

    // Campo rubrica - renderizza come link
    if (fieldType === 'select_rubrica' && value) {
      return (
        <span 
          style={{ 
            color: '#1a237e', 
            cursor: 'pointer', 
            textDecoration: 'underline',
            fontWeight: '500'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Clicking on contact:', value); // Debug
            loadContactDetails(value);
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#f0f8ff';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          title="Clicca per vedere dettagli"
        >
          {value}
        </span>
      );
    }

    // Campo elenco puntato - converte ; in lista HTML  
    if (fieldType === 'list' && value) {
      const items = value.split(';').filter(item => item.trim());
      if (items.length > 0) {
        return (
          <ul style={{ margin: '0', paddingLeft: '20px' }}>
            {items.map((item, index) => (
              <li key={index} style={{ marginBottom: '3px' }}>
                <TextWithRicambiLinks 
                  text={item.trim()} 
                  className="asset-description"
                />
              </li>
            ))}
          </ul>
        );
      }
    }

    // Campo normale - usa TextWithRicambiLinks per i campi di testo
    if (value !== undefined && value !== null && value !== "") {
      const displayValue = typeof value === 'object' && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value);
      
      // Per i campi di testo, usa TextWithRicambiLinks per rilevare i ricambi
      if (typeof value === 'string' && value.length > 0) {
        return (
          <TextWithRicambiLinks 
            text={displayValue} 
            className="asset-description"
          />
        );
      }
      
      return displayValue;
    }
    
    return <span className="text-muted">—</span>;
  };

  // Carica i tipi di asset dal database
  const fetchAssetTypes = async () => {
    try {
      console.log('Fetching asset types from /api/asset-types');
      const response = await fetch('/api/asset-types');
      console.log('Asset types response status:', response.status);
      
      if (!response.ok) throw new Error('Errore nel caricamento tipi asset');
      
      const data = await response.json();
      console.log('Asset types data received:', data);
      
      // L'endpoint restituisce {asset_types: [...]}
      setAssetTypes(data.asset_types || []);
    } catch (err) {
      console.error('Errore caricamento tipi asset:', err);
      setError('Errore nel caricamento dei tipi di asset: ' + err.message);
    }
  };

  // Definisco fetchAssets fuori da useEffect per renderla disponibile ovunque
  const fetchAssets = async () => {
    try {
      const res = await fetch(`${API}?civico=${encodeURIComponent(civicoNumero)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setAssets(data.assets);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Carica sempre i tipi di asset
      await fetchAssetTypes();
      
      if (!civicoNumero) {
        setError("Nessun civico selezionato.");
        setAssets([]);
        setLoading(false);
        return;
      }
      
      setError("");
      await fetchAssets();
      setLoading(false);
    };
    
    loadData();
  }, [civicoNumero]);

  if (!civicoNumero) {
    return (
      <div className="page-container">
        <div style={{ 
          color: 'var(--error-color)', 
          background: 'var(--error-light)', 
          padding: 'var(--spacing-xl)', 
          borderRadius: 'var(--border-radius-lg)',
          textAlign: 'center'
        }}>
          Nessun civico selezionato.
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-container">
        <div style={{ 
          color: 'var(--error-color)', 
          background: 'var(--error-light)', 
          padding: 'var(--spacing-xl)', 
          borderRadius: 'var(--border-radius-lg)',
          textAlign: 'center'
        }}>
          Errore: {error}
        </div>
      </div>
    );
  }

  const handleAdd = () => {
    setFormTipo("");
    setFormData(null);
    setEditAsset(null);
    setShowAssetModal(true);
  };

  const handleEdit = (asset) => {
    setFormTipo(asset.tipo);
    setFormData(asset);
    setEditAsset(asset);
    setShowAssetModal(true);
  };

  const handleCloseAssetModal = () => {
    setShowAssetModal(false);
    setFormTipo("");
    setFormData(null);
    setError("");
  };

  const handleFormSubmit = async (form, docFile) => {
    setError("");
    
    // Controlla sia la versione camelCase che quella con underscore per compatibilità
    const idAziendaleValue = form["id_aziendale"] || form["Id Aziendale"] || form["ID_AZIENDALE"];
    
    if (!idAziendaleValue || idAziendaleValue.trim() === "") {
      setError("Il campo 'Id Aziendale' è obbligatorio e deve essere unico.");
      return;
    }
    if (editAsset) {
      // Modifica asset (PATCH)
      // Cerca l'ID aziendale in diversi formati per compatibilità
      const idAziendale = editAsset["id_aziendale"] || editAsset["Id Aziendale"] || editAsset["ID_AZIENDALE"];
      const payload = { ...form, tipo: formTipo, civico_numero: civicoNumero };
      const formDataObj = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (Array.isArray(v)) formDataObj.append(k, JSON.stringify(v));
        else formDataObj.append(k, v);
      });
      if (docFile) formDataObj.append("documentazione_file", docFile);
      try {
        const res = await fetch(`${API}/${idAziendale}`, {
          method: "PATCH",
          body: formDataObj
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
        setShowAssetModal(false);
        setEditAsset(null);
        fetchAssets();
      } catch (err) {
        setError(err.message);
      }
    } else {
      // Aggiungi asset (POST)
      const payload = { ...form, tipo: formTipo, civico_numero: civicoNumero };
      const formDataObj = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (Array.isArray(v)) formDataObj.append(k, JSON.stringify(v));
        else formDataObj.append(k, v);
      });
      if (docFile) formDataObj.append("documentazione_file", docFile);
      try {
        const res = await fetch(API, {
          method: "POST",
          body: formDataObj
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
        setShowAssetModal(false);
        fetchAssets();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleDelete = async (idAziendale) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo asset?")) return;
    setError("");
    try {
      const res = await fetch(`${API}/${idAziendale}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      fetchAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  // Gestione movimento asset sulla pianta
  const handleAssetMove = async (updatedAsset) => {
    try {
      const formData = new FormData();
      formData.append('posizione_x', updatedAsset.posizione_x);
      formData.append('posizione_y', updatedAsset.posizione_y);
      
      const res = await fetch(`${API}/${updatedAsset.id}`, {
        method: "PUT",
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore aggiornamento posizione");
      
      // Aggiorna l'asset nella lista locale
      setAssets(prevAssets => 
        prevAssets.map(asset => 
          asset.id === updatedAsset.id 
            ? { ...asset, posizione_x: updatedAsset.posizione_x, posizione_y: updatedAsset.posizione_y }
            : asset
        )
      );
    } catch (err) {
      setError('Errore nel salvataggio della posizione: ' + err.message);
    }
  };

  // Gestione selezione asset dalla pianta
  const handleFloorPlanAssetSelect = (asset) => {
    setViewAsset(asset);
  };

  return (
    <div className="page-container">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Gestione Assets {civicoNumero ? civicoNumero : ''}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setShowFloorPlan(!showFloorPlan)} 
              className={`btn ${showFloorPlan ? 'btn-secondary' : 'btn-outline'}`}
              title="Vista pianta interattiva"
            >
              {showFloorPlan ? '📊 Vista Lista' : '🏗️ Vista Pianta'}
            </button>
            <button onClick={handleAdd} className="btn btn-primary">Aggiungi asset</button>
          </div>
        </div>
        
        {/* Filtro per tipo di asset */}
        {assets.length > 0 && (
          <div className="card-content" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--gray-700)' }}>
                Filtra per tipo:
              </label>
              <select 
                value={selectedFilter} 
                onChange={(e) => setSelectedFilter(e.target.value)}
                style={{ 
                  minWidth: '180px',
                  padding: '6px 10px',
                  border: '1px solid var(--gray-300)',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                <option value="">Tutti i tipi ({assets.length})</option>
                {getAvailableAssetTypes().map(type => {
                  const count = assets.filter(a => a.tipo === type).length;
                  return (
                    <option key={type} value={type}>
                      {type} ({count})
                    </option>
                  );
                })}
              </select>
              {selectedFilter && (
                <span style={{ 
                  color: 'var(--gray-600)', 
                  fontSize: 'var(--font-size-sm)',
                  fontStyle: 'italic' 
                }}>
                  Mostrando {getFilteredAssets().length} di {assets.length} asset
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="card-content">
          {error && <div className="alert alert-error">{error}</div>}
          
          {/* Vista Pianta Interattiva */}
          {showFloorPlan ? (
            <InteractiveFloorPlan
              civicoNumero={civicoNumero}
              assets={getFilteredAssets()}
              onAssetMove={handleAssetMove}
              onAssetSelect={handleFloorPlanAssetSelect}
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="desktop-only">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Id Aziendale</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredAssets().map(a => (
                  <tr key={a["id_aziendale"] || a["Id Aziendale"] || a.id}>
                    <td>{a.tipo}</td>
                    <td>{a["id_aziendale"] || a["Id Aziendale"]}</td>
                    <td className="table-actions">
                      <button 
                        onClick={() => setViewAsset(a)} 
                        className="btn btn-sm btn-primary"
                      >
                        Visualizza
                      </button>
                      <button 
                        onClick={() => handleEdit(a)} 
                        className="btn btn-sm btn-outline"
                      >
                        Modifica
                      </button>
                      <button 
                        onClick={() => handleDelete(a["id_aziendale"] || a["Id Aziendale"])} 
                        className="btn btn-sm btn-danger"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))}
                {getFilteredAssets().length === 0 && (
                  <tr>
                    <td colSpan="3" className="table-empty">
                      {selectedFilter ? 
                        `Nessun asset di tipo "${selectedFilter}" trovato per questo civico.` :
                        "Nessun asset trovato per questo civico."
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only">
            {getFilteredAssets().length === 0 ? (
              <div className="table-empty">
                {selectedFilter ? 
                  `Nessun asset di tipo "${selectedFilter}" trovato per questo civico.` :
                  "Nessun asset trovato per questo civico."
                }
              </div>
            ) : (
              getFilteredAssets().map(a => (
                <div key={a["id_aziendale"] || a["Id Aziendale"] || a.id} className="card-item mobile-card">
                  <div className="card-item-header">
                    <span className="card-item-number">{a["id_aziendale"] || a["Id Aziendale"]}</span>
                    <span className="card-item-type">{a.tipo}</span>
                  </div>
                  <div className="card-item-actions">
                    <button 
                      onClick={() => setViewAsset(a)} 
                      className="btn btn-sm btn-primary"
                    >
                      👁️ Visualizza
                    </button>
                    <button 
                      onClick={() => handleEdit(a)} 
                      className="btn btn-sm btn-outline"
                    >
                      ✏️ Modifica
                    </button>
                    <button 
                      onClick={() => handleDelete(a["id_aziendale"] || a["Id Aziendale"])} 
                      className="btn btn-sm btn-danger"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          </>
          )}
        </div>
      </div>
      
      <Modal open={showAssetModal} onClose={handleCloseAssetModal} title={editAsset ? "Modifica asset" : "Aggiungi asset"}>
        <div className="form-group">
          <label className="form-label">Tipo asset:</label>
          <select 
            value={formTipo} 
            onChange={e => setFormTipo(e.target.value)} 
            required 
            disabled={!!editAsset || loading}
            className="form-select"
          >
            {loading ? (
              <option value="">Caricamento tipi...</option>
            ) : (
              <>
                <option value="">Seleziona tipo</option>
                {assetTypes.length === 0 ? (
                  <option disabled>Nessun tipo disponibile</option>
                ) : (
                  assetTypes.map(tipo => (
                    <option key={tipo.id} value={tipo.name}>{tipo.name}</option>
                  ))
                )}
              </>
            )}
          </select>
          {assetTypes.length === 0 && !loading && (
            <p style={{ color: 'orange', fontSize: '12px', margin: '4px 0 0 0' }}>
              Nessun tipo asset configurato. Contatta l'amministratore.
            </p>
          )}
        </div>
        {formTipo && (
          <AssetForm 
            tipo={formTipo} 
            fields={getFieldsForType(formTipo)}
            fieldsMetadata={getFieldsMetadataForType(formTipo)}
            onSubmit={handleFormSubmit} 
            onCancel={handleCloseAssetModal} 
            initialData={formData} 
          />
        )}
        {error && <div className="alert alert-error">{error}</div>}
      </Modal>
      
      {viewAsset && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1060,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: '#fff',
            borderRadius: '8px',
            maxHeight: '75vh',
            overflowY: 'auto',
            minWidth: '320px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            position: 'relative',
            zIndex: 1070
          }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '18px', margin: 0 }}>{viewAsset.tipo}</h3>
              </div>
              <div className="card-content">
                <table className="table">
                  <tbody>
                    {getFieldsForType(viewAsset.tipo).filter(key => key !== 'civico_numero' && key !== 'doc_tecnica').map((key) => {
                      // Consumabili
                      if (key.toLowerCase().includes("consumabili")) {
                        let consumabili = viewAsset[key];
                        if (typeof consumabili === 'string') {
                          try { consumabili = JSON.parse(consumabili); } catch {}
                        }
                        if (Array.isArray(consumabili) && consumabili.length > 0) {
                          return (
                            <tr key={key}>
                              <td colSpan={2}>
                                <div className="card" style={{ margin: '8px 0' }}>
                                  <div className="card-header">
                                    <h4 className="card-title">Consumabili</h4>
                                  </div>
                                  <div className="card-content">
                                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                                      {consumabili.map((item, idx) => (
                                        <li key={idx}>
                                          <TextWithRicambiLinks 
                                            text={item} 
                                            className="asset-description"
                                          />
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      }
                      
                      // Documentazione tecnica
                      if (key.toLowerCase().includes("documentazione tecnica")) {
                        const file = viewAsset["doc_tecnica"];
                        return (
                          <tr key={key}>
                            <td><strong>Documentazione tecnica</strong></td>
                            <td>
                              {file ? (
                                <a 
                                  href={`${API_URLS.uploads}/${encodeURIComponent(file)}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="table-link"
                                >
                                  Visualizza documento
                                </a>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                      
                      if (key === "tipo") return null;
                      
                      return (
                        <tr key={key}>
                          <td><strong>{key}</strong></td>
                          <td>
                            {renderFieldValue(key, viewAsset[key], viewAsset.tipo)}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Mostra eventuali campi extra non previsti nei fields dinamici */}
                    {Object.keys(viewAsset)
                      .filter(key => 
                        !getFieldsForType(viewAsset.tipo).includes(key) && 
                        key !== "tipo" && 
                        key !== 'civico_numero' && 
                        key !== 'doc_tecnica' &&
                        key !== 'Id Aziendale' &&  // Escludi Id Aziendale per evitare duplicazione
                        key !== 'id_aziendale' &&  // Escludi anche la versione lowercase
                        key !== 'id' &&  // Escludi l'id del database
                        key !== 'marca' &&  // Escludi marca (già mostrato come Costruttore)
                        key !== 'modello' &&   // Escludi modello (già mostrato come Modello)
                        key !== 'posizione_x' &&  // Escludi coordinate X (dato tecnico backend)
                        key !== 'posizione_y'     // Escludi coordinate Y (dato tecnico backend)
                      )
                      .map((key) => (
                        <tr key={key}>
                          <td><strong>{key}</strong></td>
                          <td>
                            {typeof viewAsset[key] === 'object' && viewAsset[key] !== null
                              ? JSON.stringify(viewAsset[key], null, 2)
                              : String(viewAsset[key])
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="card-footer" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 16px'
              }}>
                <button 
                  onClick={() => setViewAsset(null)} 
                  className="btn btn-secondary"
                  style={{ minWidth: '80px' }}
                >
                  Chiudi
                </button>
                <button 
                  onClick={() => setViewAsset(null)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: '#666',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Chiudi"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal dettagli contatto */}
      {contactModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1080,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="modal-content" style={{
            background: '#fff',
            borderRadius: '8px',
            maxHeight: '70vh',
            overflowY: 'auto',
            minWidth: '320px',
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 1090
          }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: '16px', margin: 0 }}>📞 Dettagli Contatto</h3>
                <button 
                  onClick={() => setContactModal(null)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    fontSize: '18px',
                    cursor: 'pointer',
                    color: '#666',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Chiudi"
                >
                  ×
                </button>
              </div>
              <div className="card-body">
                <table className="table">
                  <tbody>
                    <tr>
                      <td><strong>Nome</strong></td>
                      <td>{contactModal.nome}</td>
                    </tr>
                    <tr>
                      <td><strong>Categoria</strong></td>
                      <td>{contactModal.categoria_nome}</td>
                    </tr>
                    {contactModal.azienda && (
                      <tr>
                        <td><strong>Azienda</strong></td>
                        <td>{contactModal.azienda}</td>
                      </tr>
                    )}
                    {contactModal.ruolo && (
                      <tr>
                        <td><strong>Ruolo</strong></td>
                        <td>{contactModal.ruolo}</td>
                      </tr>
                    )}
                    {contactModal.telefono && (
                      <tr>
                        <td><strong>Telefono</strong></td>
                        <td>
                          <a href={`tel:${contactModal.telefono}`} style={{ color: '#1a237e' }}>
                            {contactModal.telefono}
                          </a>
                        </td>
                      </tr>
                    )}
                    {contactModal.email && (
                      <tr>
                        <td><strong>Email</strong></td>
                        <td>
                          <a href={`mailto:${contactModal.email}`} style={{ color: '#1a237e' }}>
                            {contactModal.email}
                          </a>
                        </td>
                      </tr>
                    )}
                    {contactModal.indirizzo && (
                      <tr>
                        <td><strong>Indirizzo</strong></td>
                        <td>{contactModal.indirizzo}</td>
                      </tr>
                    )}
                    {contactModal.note && (
                      <tr>
                        <td><strong>Note</strong></td>
                        <td>{contactModal.note}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="card-footer" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                padding: '12px 16px'
              }}>
                <button 
                  onClick={() => setContactModal(null)} 
                  className="btn btn-secondary"
                  style={{ minWidth: '80px' }}
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsManager;
