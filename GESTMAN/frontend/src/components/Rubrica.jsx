import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import './AssetsManager.css'; // Riutilizziamo gli stili esistenti

const Rubrica = () => {
  const [categorie, setCategorie] = useState([]);
  const [contatti, setContatti] = useState([]); // Contiene sempre TUTTI i contatti
  const [contattiFiltrati, setContattiFiltrati] = useState([]); // Contatti da visualizzare
  const [categoriaSelezionata, setCategoriaSelezionata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('contatto'); // 'contatto' o 'categoria'
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [contattoForm, setContattoForm] = useState({
    categoria_id: '',
    nome: '',
    azienda: '',
    ruolo: '',
    telefono: '',
    email: '',
    indirizzo: '',
    note: '',
    priorita: 1
  });

  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    descrizione: '',
    icona: '📁',
    colore: '#007bff',
    ordinamento: 0
  });

  useEffect(() => {
    loadCategorie();
    loadContatti();
  }, []);

  // Sincronizza contattiFiltrati quando cambiano i contatti
  useEffect(() => {
    if (categoriaSelezionata) {
      setContattiFiltrati(contatti.filter(c => c.categoria_id === categoriaSelezionata.id));
    } else {
      setContattiFiltrati(contatti);
    }
  }, [contatti, categoriaSelezionata]);

  const loadCategorie = async () => {
    try {
      const response = await fetch('/api/rubrica/categorie');
      if (response.ok) {
        const data = await response.json();
        setCategorie(data.categorie);
      } else {
        throw new Error('Errore nel caricamento delle categorie');
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const loadContatti = async () => {
    try {
      const response = await fetch('/api/rubrica/contatti');
      if (response.ok) {
        const data = await response.json();
        setContatti(data.contatti); // L'useEffect si occuperà di filtrare
      } else {
        throw new Error('Errore nel caricamento dei contatti');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoriaClick = (categoria) => {
    setCategoriaSelezionata(categoria);
    // L'useEffect si occuperà di filtrare i contatti
  };

  const handleShowAll = () => {
    setCategoriaSelezionata(null);
    // L'useEffect si occuperà di mostrare tutti i contatti
  };

  const handleCreateContatto = () => {
    setEditingItem(null);
    setModalType('contatto');
    setContattoForm({
      categoria_id: categoriaSelezionata?.id || '',
      nome: '',
      azienda: '',
      ruolo: '',
      telefono: '',
      email: '',
      indirizzo: '',
      note: '',
      priorita: 1
    });
    setShowModal(true);
  };

  const handleEditContatto = (contatto) => {
    setEditingItem(contatto);
    setModalType('contatto');
    setContattoForm({
      categoria_id: contatto.categoria_id,
      nome: contatto.nome,
      azienda: contatto.azienda || '',
      ruolo: contatto.ruolo || '',
      telefono: contatto.telefono || '',
      email: contatto.email || '',
      indirizzo: contatto.indirizzo || '',
      note: contatto.note || '',
      priorita: contatto.priorita || 1
    });
    setShowModal(true);
  };

  const handleSaveContatto = async () => {
    try {
      const url = editingItem 
        ? `/api/rubrica/contatti/${editingItem.id}`
        : '/api/rubrica/contatti';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contattoForm)
      });

      if (response.ok) {
        setShowModal(false);
        loadContatti(categoriaSelezionata?.id);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      setError('Errore nella comunicazione con il server');
    }
  };

  const handleDeleteContatto = async (contatto) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${contatto.nome}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/rubrica/contatti/${contatto.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadContatti(categoriaSelezionata?.id);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Errore nell\'eliminazione');
      }
    } catch (error) {
      setError('Errore nella comunicazione con il server');
    }
  };

  const filteredContatti = contattiFiltrati.filter(contatto =>
    contatto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contatto.azienda && contatto.azienda.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contatto.ruolo && contatto.ruolo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="loading">Caricamento rubrica...</div>;

  return (
    <div className="assets-manager">
      <div className="assets-header">
        <h2>📇 Rubrica Contatti</h2>
        <p>Gestione contatti fornitori, manutentori e collaboratori</p>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Cerca contatti..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={handleCreateContatto} className="btn btn-primary">
            + Nuovo Contatto
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="rubrica-layout" style={{ display: 'flex', gap: '20px' }}>
        {/* Sidebar categorie */}
        <div className="categorie-sidebar" style={{ minWidth: '250px', maxWidth: '300px' }}>
          <h3>Categorie</h3>
          
          <button
            onClick={handleShowAll}
            className={`categoria-item ${!categoriaSelezionata ? 'active' : ''}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px',
              margin: '5px 0',
              border: 'none',
              borderRadius: '8px',
              background: !categoriaSelezionata ? '#007bff' : '#f8f9fa',
              color: !categoriaSelezionata ? 'white' : '#333',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            📋 Tutti i contatti ({contatti.length})
          </button>

          {categorie.map(categoria => {
            const contattiCategoria = contatti.filter(c => c.categoria_id === categoria.id);
            return (
              <button
                key={categoria.id}
                onClick={() => handleCategoriaClick(categoria)}
                className={`categoria-item ${categoriaSelezionata?.id === categoria.id ? 'active' : ''}`}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  margin: '5px 0',
                  border: 'none',
                  borderRadius: '8px',
                  background: categoriaSelezionata?.id === categoria.id ? categoria.colore : '#f8f9fa',
                  color: categoriaSelezionata?.id === categoria.id ? 'white' : '#333',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {categoria.icona} {categoria.nome} ({contattiCategoria.length})
              </button>
            );
          })}
        </div>

        {/* Lista contatti */}
        <div className="contatti-content" style={{ flex: 1 }}>
          <h3>
            {categoriaSelezionata 
              ? `${categoriaSelezionata.icona} ${categoriaSelezionata.nome}` 
              : '📋 Tutti i contatti'
            }
          </h3>

          {filteredContatti.length === 0 && (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              📭 Nessun contatto trovato
            </div>
          )}

          <div className="contatti-grid" style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filteredContatti.map(contatto => (
              <div key={contatto.id} className="card" style={{ border: `2px solid ${categoriaSelezionata ? categoriaSelezionata.colore : '#e9ecef'}` }}>
                <div className="card-header" style={{ background: `${categoriaSelezionata ? categoriaSelezionata.colore + '20' : '#f8f9fa'}` }}>
                  <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {contatto.categoria_icona} {contatto.nome}
                  </h4>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                    <button
                      onClick={() => handleEditContatto(contatto)}
                      className="btn btn-sm btn-secondary"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteContatto(contatto)}
                      className="btn btn-sm btn-danger"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="card-content">
                  {contatto.azienda && (
                    <p><strong>🏢 Azienda:</strong> {contatto.azienda}</p>
                  )}
                  {contatto.ruolo && (
                    <p><strong>👤 Ruolo:</strong> {contatto.ruolo}</p>
                  )}
                  {contatto.telefono && (
                    <p><strong>📞 Telefono:</strong> 
                      <a href={`tel:${contatto.telefono}`} style={{ marginLeft: '5px', color: '#007bff' }}>
                        {contatto.telefono}
                      </a>
                    </p>
                  )}
                  {contatto.email && (
                    <p><strong>📧 Email:</strong> 
                      <a href={`mailto:${contatto.email}`} style={{ marginLeft: '5px', color: '#007bff' }}>
                        {contatto.email}
                      </a>
                    </p>
                  )}
                  {contatto.indirizzo && (
                    <p><strong>📍 Indirizzo:</strong> {contatto.indirizzo}</p>
                  )}
                  {contatto.note && (
                    <p><strong>📝 Note:</strong> {contatto.note}</p>
                  )}
                  <small style={{ color: '#666' }}>
                    Categoria: {contatto.categoria_nome}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal per aggiunta/modifica contatto */}
      <Modal 
        open={showModal && modalType === 'contatto'} 
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Modifica Contatto' : 'Nuovo Contatto'}
      >
        <div className="form-group">
          <label>Categoria *</label>
          <select
            value={contattoForm.categoria_id}
            onChange={(e) => setContattoForm(prev => ({ ...prev, categoria_id: e.target.value }))}
            required
          >
            <option value="">Seleziona categoria...</option>
            {categorie.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icona} {cat.nome}
              </option>
            ))}
          </select>
        </div>

            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                value={contattoForm.nome}
                onChange={(e) => setContattoForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome del contatto"
                required
              />
            </div>

            <div className="form-group">
              <label>Azienda</label>
              <input
                type="text"
                value={contattoForm.azienda}
                onChange={(e) => setContattoForm(prev => ({ ...prev, azienda: e.target.value }))}
                placeholder="Nome azienda"
              />
            </div>

            <div className="form-group">
              <label>Ruolo</label>
              <input
                type="text"
                value={contattoForm.ruolo}
                onChange={(e) => setContattoForm(prev => ({ ...prev, ruolo: e.target.value }))}
                placeholder="Ruolo o mansione"
              />
            </div>

            <div className="form-group">
              <label>Telefono</label>
              <input
                type="tel"
                value={contattoForm.telefono}
                onChange={(e) => setContattoForm(prev => ({ ...prev, telefono: e.target.value }))}
                placeholder="Numero di telefono"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={contattoForm.email}
                onChange={(e) => setContattoForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Indirizzo email"
              />
            </div>

            <div className="form-group">
              <label>Indirizzo</label>
              <textarea
                value={contattoForm.indirizzo}
                onChange={(e) => setContattoForm(prev => ({ ...prev, indirizzo: e.target.value }))}
                placeholder="Indirizzo completo"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Note</label>
              <textarea
                value={contattoForm.note}
                onChange={(e) => setContattoForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Note aggiuntive"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">
                Annulla
              </button>
              <button onClick={handleSaveContatto} className="btn btn-primary">
                {editingItem ? 'Aggiorna' : 'Crea'} Contatto
              </button>
            </div>
        </Modal>
    </div>
  );
};

export default Rubrica;
