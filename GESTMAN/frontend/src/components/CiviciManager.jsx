import React, { useEffect, useState } from "react";
import "./CiviciManager.css";
import AssetsManager from "./AssetsManager";
import { deleteOrphanAssets } from "../utils/deleteOrphanAssets";
import Modal from "./Modal";
import { API_URLS } from "../config/api";

const API = API_URLS.civici;

// Accetta selectedCivico e setSelectedCivico come props, con default
const CiviciManager = ({ selectedCivico = null, setSelectedCivico = () => {} }) => {
  const [civici, setCivici] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCivicoModal, setShowCivicoModal] = useState(false);
  const [editCivico, setEditCivico] = useState(null); // null = add, object = edit
  const [civicoForm, setCivicoForm] = useState({ numero: "", descrizione: "" });

  // fetchCivici deve essere sempre accessibile
  const fetchCivici = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setCivici(data.civici);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCivici();
  }, []);


  const openAddCivicoModal = () => {
    setEditCivico(null);
    setCivicoForm({ numero: "", descrizione: "" });
    setShowCivicoModal(true);
  };

  const openEditCivicoModal = (civico) => {
    setEditCivico(civico);
    setCivicoForm({ numero: civico.numero, descrizione: civico.descrizione });
    setShowCivicoModal(true);
  };

  const closeCivicoModal = () => {
    setShowCivicoModal(false);
    setEditCivico(null);
    setCivicoForm({ numero: "", descrizione: "" });
    setError("");
  };

  const handleCivicoFormChange = (e) => {
    setCivicoForm({ ...civicoForm, [e.target.name]: e.target.value });
  };

  const handleCivicoFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      let res, data;
      if (editCivico) {
        // Modifica civico (solo descrizione modificabile)
        res = await fetch(`${API}/${editCivico.numero}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ descrizione: civicoForm.descrizione })
        });
      } else {
        // Aggiungi civico
        res = await fetch(API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(civicoForm)
        });
      }
      data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      closeCivicoModal();
      fetchCivici();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async numero => {
    setError("");
    if (!window.confirm("Eliminare questo civico?")) return;
    try {
      const res = await fetch(`${API}/${numero}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      fetchCivici();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGestisciAssets = (civico) => {
    setSelectedCivico(civico);
  }

  // LIVELLO 2: Gestione assets per civico selezionato
  if (selectedCivico && selectedCivico.numero) {
    return (
      <div className="page-container">
        <AssetsManager civicoNumero={selectedCivico.numero} />
      </div>
    );
  }

  // LIVELLO 1: Gestione Civici (solo admin)
  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        🏢 Gestione Civici
      </h2>
      
      {/* Messages */}
      {error && (
        <div style={{ background: 'var(--error-light)', color: 'var(--error-dark)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-md)', marginBottom: 'var(--spacing-lg)' }}>
          {error}
        </div>
      )}

      {/* Lista civici */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Civici Configurati ({civici.length})</h3>
          <button 
            onClick={openAddCivicoModal} 
            className="btn btn-primary"
          >
            Aggiungi civico
          </button>
        </div>
        
        {civici.length === 0 ? (
          <div style={{ 
            color: 'var(--gray-600)', 
            fontStyle: 'italic', 
            textAlign: 'center', 
            padding: 'var(--spacing-4xl)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--border-radius-lg)'
          }}>
            Nessun civico configurato
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
                  {civici.map(c => (
                    <tr key={c.numero}>
                      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 'var(--font-weight-semibold)' }}>
                        {c.numero}
                      </td>
                      <td>{c.descrizione}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleGestisciAssets(c)}
                          >
                            Gestisci assets
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditCivicoModal(c)}
                          >
                            Modifica
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(c.numero)}
                          >
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="mobile-only">
              {civici.map(c => (
                <div key={c.numero} className="card-item mobile-card">
                  <div className="card-item-header">
                    <span className="card-item-number">{c.numero}</span>
                  </div>
                  <div className="card-item-body">
                    <p className="card-item-description">{c.descrizione}</p>
                  </div>
                  <div className="card-item-actions">
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleGestisciAssets(c)}
                    >
                      ⚙️ Assets
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEditCivicoModal(c)}
                    >
                      ✏️ Modifica
                    </button>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(c.numero)}
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal per form civico */}
      <Modal open={showCivicoModal} onClose={closeCivicoModal} title={editCivico ? "Modifica civico" : "Aggiungi civico"}>
        <form onSubmit={handleCivicoFormSubmit}>
          <div className="form-group">
            <label className="form-label">Numero civico</label>
            <input
              className="form-input"
              name="numero"
              value={civicoForm.numero}
              onChange={handleCivicoFormChange}
              placeholder="Numero civico"
              required
              disabled={!!editCivico}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrizione</label>
            <input
              className="form-input"
              name="descrizione"
              value={civicoForm.descrizione}
              onChange={handleCivicoFormChange}
              placeholder="Descrizione"
            />
          </div>
          <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Salva</button>
            <button type="button" className="btn btn-secondary" onClick={closeCivicoModal}>Annulla</button>
          </div>
        </form>
        {error && <div style={{ background: 'var(--error-light)', color: 'var(--error-dark)', padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-md)', marginTop: 'var(--spacing-lg)' }}>{error}</div>}
      </Modal>
    </div>
  );
};

export default CiviciManager;
