import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import './CiviciManager.css';
import { API_URLS } from '../config/api';

const CiviciManagerAdmin = () => {
  const [civici, setCivici] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCivico, setEditCivico] = useState(null);
  const [form, setForm] = useState({ numero: '', descrizione: '' });

  // Carica civici
  useEffect(() => {
    loadCivici();
  }, []);

  const loadCivici = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/civici');
      if (!response.ok) throw new Error('Errore nel caricamento civici');
      
      const data = await response.json();
      setCivici(data.civici || data);
    } catch (err) {
      setError('Errore nel caricamento dei civici: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    console.log('Opening add modal');
    setEditCivico(null);
    setForm({ numero: '', descrizione: '' });
    setShowModal(true);
  };

  const openEditModal = (civico) => {
    console.log('Opening edit modal for:', civico);
    setEditCivico(civico);
    setForm({ numero: civico.numero, descrizione: civico.descrizione });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditCivico(null);
    setForm({ numero: '', descrizione: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Submitting form:', { form, editCivico });
      
      const url = editCivico ? `/api/civici/${editCivico.numero}` : '/api/civici';
      const method = editCivico ? 'PATCH' : 'POST';
      
      console.log('Making request:', { url, method, body: form });
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      console.log('Response received:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Errore nel salvataggio');
      }

      const result = await response.json();
      console.log('API Success:', result);

      await loadCivici();
      closeModal();
    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (numero) => {
    if (!confirm(`Sei sicuro di voler eliminare il civico ${numero}?`)) return;
    
    try {
      console.log('Deleting civico:', numero);
      
      const response = await fetch(`/api/civici/${numero}`, { method: 'DELETE' });
      
      console.log('Delete response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete Error:', errorData);
        throw new Error(errorData.error || 'Errore nell\'eliminazione');
      }

      const result = await response.json();
      console.log('Delete Success:', result);
      
      await loadCivici();
    } catch (err) {
      console.error('Delete Error:', err);
      setError(err.message);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
        <p>Caricamento civici...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div style={{ 
          background: 'var(--error-light)', 
          color: 'var(--error-dark)', 
          padding: 'var(--spacing-md)', 
          borderRadius: 'var(--border-radius-md)', 
          marginBottom: 'var(--spacing-lg)' 
        }}>
          {error}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🏢 Civici Configurati ({civici.length})</h3>
          <button onClick={openAddModal} className="btn btn-primary">
            Aggiungi civico
          </button>
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
              <button onClick={openAddModal} className="btn btn-primary">
                Aggiungi il primo civico
              </button>
            </div>
          </div>
        ) : (
          <div className="card-body">
            <div style={{ overflowX: 'auto' }}>
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
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(civico)}
                          >
                            ✏️ Modifica
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(civico.numero)}
                          >
                            🗑️ Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal per form civico */}
      <Modal open={showModal} onClose={closeModal}>
        <h3>{editCivico ? 'Modifica' : 'Aggiungi'} civico</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label htmlFor="numero" style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              Numero civico *
            </label>
            <input
              type="text"
              id="numero"
              name="numero"
              required
              value={form.numero}
              onChange={handleFormChange}
              disabled={!!editCivico}
              placeholder="es: 123, 123A, 123/bis"
              style={{ width: '100%', padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}
            />
          </div>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label htmlFor="descrizione" style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              Descrizione
            </label>
            <textarea
              id="descrizione"
              name="descrizione"
              rows="3"
              value={form.descrizione}
              onChange={handleFormChange}
              placeholder="Descrizione del civico"
              style={{ width: '100%', padding: 'var(--spacing-md)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}
            />
          </div>
          <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Salva</button>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>Annulla</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CiviciManagerAdmin;
