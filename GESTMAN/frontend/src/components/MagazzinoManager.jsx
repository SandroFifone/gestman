import React, { useState, useEffect } from 'react';
import './MagazzinoManager.css';
import { API_URLS } from '../config/api';

const MagazzinoManager = () => {
    const [ricambi, setRicambi] = useState([]);
    const [assetTypes, setAssetTypes] = useState([]);
    const [rubricaContacts, setRubricaContacts] = useState([]);
    const [filtroAsset, setFiltroAsset] = useState('');
    const [filtroScorteBasse, setFiltroScorteBasse] = useState(false);
    const [highlightedRicambio, setHighlightedRicambio] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRicambio, setEditingRicambio] = useState(null);
    const [showQuantitaModal, setShowQuantitaModal] = useState(false);
    const [selectedRicambio, setSelectedRicambio] = useState(null);
    const [statistiche, setStatistiche] = useState(null);

    // Form state per aggiungere/modificare ricambi
    const [formData, setFormData] = useState({
        asset_tipo: '',
        id_ricambio: '',
        costruttore: '',
        modello: '',
        codice_produttore: '',
        fornitore: '',
        unita_misura: 'pz',
        quantita_disponibile: 0,
        quantita_minima: 1,
        prezzo_unitario: 0,
        note: ''
    });

    // Form per aggiornamento quantità
    const [quantitaForm, setQuantitaForm] = useState({
        operazione: 'carico',
        quantita: 1,
        operatore: '',
        motivo: ''
    });

    const API_BASE = `${API_URLS.BASE}/api/magazzino`;

    useEffect(() => {
        loadAssetTypes();
        loadRubricaContacts();
        loadRicambi();
        loadStatistiche();
        
        // Ascolta eventi di evidenziamento ricambi
        const handleHighlightRicambio = (event) => {
            const { ricambioId } = event.detail;
            setHighlightedRicambio(ricambioId);
            
            // Rimuovi l'evidenziamento dopo 5 secondi
            setTimeout(() => {
                setHighlightedRicambio(null);
            }, 5000);
        };
        
        window.addEventListener('highlightRicambio', handleHighlightRicambio);
        
        return () => {
            window.removeEventListener('highlightRicambio', handleHighlightRicambio);
        };
    }, []);

    useEffect(() => {
        loadRicambi();
        loadStatistiche();
    }, [filtroAsset, filtroScorteBasse]);

    const loadAssetTypes = async () => {
        try {
            const res = await fetch(`${API_BASE}/asset-types`);
            const data = await res.json();
            setAssetTypes(data.asset_types || []);
        } catch (err) {
            console.error('Errore caricamento tipi asset:', err);
        }
    };

    const loadRubricaContacts = async () => {
        try {
            console.log('Loading rubrica contacts from:', API_URLS.RUBRICA_CONTATTI);
            const response = await fetch(API_URLS.RUBRICA_CONTATTI);
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded contacts data:', data);
                
                // L'API restituisce { contatti: [...] }, estraiamo l'array
                const contacts = data.contatti || data;
                
                // Assicurati che sia un array
                if (Array.isArray(contacts)) {
                    // Filtra contatti con nome valido e ordina alfabeticamente
                    const sortedContacts = contacts
                        .filter(c => c.nome && c.nome.trim())
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
                    
                    console.log('Setting sorted contacts:', sortedContacts);
                    setRubricaContacts(sortedContacts);
                } else {
                    console.error('Contacts response is not an array:', contacts);
                    setRubricaContacts([]);
                }
            } else {
                console.error('Failed to load contacts:', response.status, response.statusText);
                setRubricaContacts([]);
            }
        } catch (error) {
            console.error('Errore caricamento contatti rubrica:', error);
            setRubricaContacts([]);
        }
    };

    // Funzione helper per raggruppare i contatti per iniziale
    const getGroupedContacts = () => {
        const grouped = {};
        rubricaContacts.forEach(contact => {
            const firstLetter = contact.nome.charAt(0).toUpperCase();
            if (!grouped[firstLetter]) {
                grouped[firstLetter] = [];
            }
            grouped[firstLetter].push(contact);
        });
        return grouped;
    };

    const loadRicambi = async () => {
        setLoading(true);
        setError(null);
        try {
            let url = `${API_BASE}/ricambi?attivi_only=true`;
            if (filtroAsset) url += `&asset_tipo=${encodeURIComponent(filtroAsset)}`;
            if (filtroScorteBasse) url += '&scorte_basse=true';
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (res.ok) {
                setRicambi(data.ricambi || []);
            } else {
                setError(data.error || 'Errore caricamento ricambi');
            }
        } catch (err) {
            setError('Errore di rete nel caricamento ricambi');
            console.error('Errore:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadStatistiche = async () => {
        try {
            let url = `${API_BASE}/statistiche`;
            if (filtroAsset) url += `?asset_tipo=${encodeURIComponent(filtroAsset)}`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (res.ok) {
                setStatistiche(data.statistiche);
            }
        } catch (err) {
            console.error('Errore caricamento statistiche:', err);
        }
    };

    const resetForm = () => {
        setFormData({
            asset_tipo: '',
            id_ricambio: '',
            costruttore: '',
            modello: '',
            codice_produttore: '',
            fornitore: '',
            unita_misura: 'pz',
            quantita_disponibile: 0,
            quantita_minima: 1,
            prezzo_unitario: 0,
            note: ''
        });
    };

    const handleAddRicambio = () => {
        resetForm();
        setEditingRicambio(null);
        setShowAddModal(true);
    };

    const handleEditRicambio = (ricambio) => {
        setFormData({...ricambio});
        setEditingRicambio(ricambio);
        setShowAddModal(true);
    };

    const handleSaveRicambio = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const url = editingRicambio 
                ? `${API_BASE}/ricambi/${editingRicambio.id}`
                : `${API_BASE}/ricambi`;
            
            const method = editingRicambio ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setShowAddModal(false);
                loadRicambi();
                loadStatistiche();
                alert(editingRicambio ? 'Ricambio aggiornato con successo' : 'Ricambio aggiunto con successo');
            } else {
                alert(data.error || 'Errore nel salvataggio');
            }
        } catch (err) {
            alert('Errore di rete nel salvataggio');
            console.error('Errore:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRicambio = async (ricambio) => {
        if (!window.confirm(`⚠️ ATTENZIONE: Sei sicuro di voler ELIMINARE DEFINITIVAMENTE il ricambio "${ricambio.id_ricambio}"?\n\nQuesta operazione cancellerà:\n- Il ricambio dal database\n- Tutto lo storico movimenti\n\nL'operazione NON può essere annullata!`)) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/ricambi/${ricambio.id}`, {
                method: 'DELETE'
            });
            
            const data = await res.json();
            
            if (res.ok) {
                loadRicambi();
                loadStatistiche();
                alert('Ricambio eliminato definitivamente dal database');
            } else {
                alert(data.error || 'Errore nell\'eliminazione');
            }
        } catch (err) {
            alert('Errore di rete nell\'eliminazione');
            console.error('Errore:', err);
        }
    };

    const handleQuantitaModal = (ricambio) => {
        setSelectedRicambio(ricambio);
        setQuantitaForm({
            operazione: 'carico',
            quantita: 1,
            operatore: '',
            motivo: ''
        });
        setShowQuantitaModal(true);
    };

    const handleUpdateQuantita = async (e) => {
        e.preventDefault();
        
        if (!quantitaForm.operatore.trim()) {
            alert('Inserisci il nome dell\'operatore');
            return;
        }

        setLoading(true);
        
        try {
            const res = await fetch(`${API_BASE}/ricambi/${selectedRicambio.id}/quantita`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quantitaForm)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setShowQuantitaModal(false);
                loadRicambi();
                loadStatistiche();
                alert(data.message);
            } else {
                alert(data.error || 'Errore nell\'aggiornamento quantità');
            }
        } catch (err) {
            alert('Errore di rete nell\'aggiornamento');
            console.error('Errore:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && ricambi.length === 0) {
        return <div className="magazzino-loading">Caricamento magazzino...</div>;
    }

    return (
        <div className="magazzino-manager">
            <div className="magazzino-header">
                <h1>
                    <span className="header-icon">📦</span>
                    Gestione Magazzino
                </h1>
                
                {/* Statistiche */}
                {statistiche && (
                    <div className="statistiche-bar">
                        <div className="stat-item">
                            <span className="stat-label">Ricambi Totali:</span>
                            <span className="stat-value">{statistiche.totale_ricambi}</span>
                        </div>
                        <div className="stat-item warning">
                            <span className="stat-label">Scorte Basse:</span>
                            <span className="stat-value">{statistiche.scorte_basse}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Valore Totale:</span>
                            <span className="stat-value">€ {statistiche.valore_totale}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Filtri e Azioni */}
            <div className="magazzino-controls">
                <div className="filters">
                    <select 
                        value={filtroAsset} 
                        onChange={(e) => setFiltroAsset(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">Tutti i tipi di asset</option>
                        {assetTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    
                    <label className="checkbox-filter">
                        <input 
                            type="checkbox"
                            checked={filtroScorteBasse}
                            onChange={(e) => setFiltroScorteBasse(e.target.checked)}
                        />
                        <span>Solo scorte basse</span>
                    </label>
                </div>
                
                <div className="actions">
                    <button 
                        className="btn-primary"
                        onClick={handleAddRicambio}
                        disabled={loading}
                    >
                        ➕ Aggiungi Ricambio
                    </button>
                    
                    <button 
                        className="btn-secondary"
                        onClick={loadRicambi}
                        disabled={loading}
                    >
                        🔄 Aggiorna
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Tabella Ricambi */}
            <div className="ricambi-table-container">
                <table className="ricambi-table">
                    <thead>
                        <tr>
                            <th>Tipo Asset</th>
                            <th>ID Ricambio</th>
                            <th>Costruttore</th>
                            <th>Modello</th>
                            <th>Cod. Produttore</th>
                            <th>Fornitore</th>
                            <th>Quantità</th>
                            <th>U.M.</th>
                            <th>Min.</th>
                            <th>Prezzo €</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ricambi.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="no-data">
                                    {loading ? 'Caricamento...' : 'Nessun ricambio trovato'}
                                </td>
                            </tr>
                        ) : (
                            ricambi.map(ricambio => (
                                <tr 
                                    key={ricambio.id} 
                                    className={`${ricambio.scorta_bassa ? 'scorta-bassa' : ''} ${
                                        highlightedRicambio === ricambio.id_ricambio ? 'highlighted-ricambio' : ''
                                    }`}
                                >
                                    <td>{ricambio.asset_tipo}</td>
                                    <td className="id-ricambio">
                                        {ricambio.id_ricambio}
                                        {ricambio.scorta_bassa && <span className="warning-icon">⚠️</span>}
                                    </td>
                                    <td>{ricambio.costruttore}</td>
                                    <td>{ricambio.modello}</td>
                                    <td>{ricambio.codice_produttore}</td>
                                    <td>{ricambio.fornitore}</td>
                                    <td className="quantita">
                                        <span className={ricambio.scorta_bassa ? 'quantita-bassa' : ''}>
                                            {ricambio.quantita_disponibile}
                                        </span>
                                    </td>
                                    <td>{ricambio.unita_misura}</td>
                                    <td>{ricambio.quantita_minima}</td>
                                    <td>€ {ricambio.prezzo_unitario.toFixed(2)}</td>
                                    <td className="actions-cell">
                                        <button 
                                            className="btn-icon btn-quantity"
                                            onClick={() => handleQuantitaModal(ricambio)}
                                            title="Aggiorna quantità"
                                        >
                                            📊
                                        </button>
                                        <button 
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEditRicambio(ricambio)}
                                            title="Modifica ricambio"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            className="btn-icon btn-delete"
                                            onClick={() => handleDeleteRicambio(ricambio)}
                                            title="Disattiva ricambio"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Aggiungi/Modifica Ricambio */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editingRicambio ? 'Modifica Ricambio' : 'Aggiungi Nuovo Ricambio'}</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowAddModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveRicambio} className="ricambio-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo Asset *</label>
                                    <select 
                                        value={formData.asset_tipo}
                                        onChange={(e) => setFormData({...formData, asset_tipo: e.target.value})}
                                        required
                                        disabled={editingRicambio} // Non modificabile in edit
                                    >
                                        <option value="">Seleziona tipo asset</option>
                                        {assetTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>ID Ricambio *</label>
                                    <input 
                                        type="text"
                                        value={formData.id_ricambio}
                                        onChange={(e) => setFormData({...formData, id_ricambio: e.target.value})}
                                        required
                                        disabled={editingRicambio} // Non modificabile in edit
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Costruttore</label>
                                    <input 
                                        type="text"
                                        value={formData.costruttore}
                                        onChange={(e) => setFormData({...formData, costruttore: e.target.value})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Modello</label>
                                    <input 
                                        type="text"
                                        value={formData.modello}
                                        onChange={(e) => setFormData({...formData, modello: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Codice Produttore</label>
                                    <input 
                                        type="text"
                                        value={formData.codice_produttore}
                                        onChange={(e) => setFormData({...formData, codice_produttore: e.target.value})}
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Fornitore</label>
                                    <select 
                                        value={formData.fornitore}
                                        onChange={(e) => setFormData({...formData, fornitore: e.target.value})}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Seleziona fornitore...</option>
                                        {(() => {
                                            const groupedContacts = getGroupedContacts();
                                            const letters = Object.keys(groupedContacts).sort();
                                            
                                            return letters.map(letter => (
                                                <optgroup key={letter} label={`--- ${letter} ---`}>
                                                    {groupedContacts[letter].map((contact) => (
                                                        <option key={contact.id} value={contact.nome}>
                                                            {contact.nome} {contact.categoria_nome && `(${contact.categoria_nome})`} {(contact.email || contact.telefono) && `- ${contact.email || contact.telefono}`}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ));
                                        })()}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Unità di Misura</label>
                                    <select 
                                        value={formData.unita_misura}
                                        onChange={(e) => setFormData({...formData, unita_misura: e.target.value})}
                                    >
                                        <option value="pz">Pezzi</option>
                                        <option value="kg">Kg</option>
                                        <option value="mt">Metri</option>
                                        <option value="lt">Litri</option>
                                        <option value="conf">Confezioni</option>
                                    </select>
                                </div>
                                
                                <div className="form-group">
                                    <label>Prezzo Unitario €</label>
                                    <input 
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.prezzo_unitario}
                                        onChange={(e) => setFormData({...formData, prezzo_unitario: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                {!editingRicambio && (
                                    <div className="form-group">
                                        <label>Quantità Iniziale</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={formData.quantita_disponibile}
                                            onChange={(e) => setFormData({...formData, quantita_disponibile: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <label>Quantità Minima</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={formData.quantita_minima}
                                        onChange={(e) => setFormData({...formData, quantita_minima: parseInt(e.target.value) || 1})}
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Note</label>
                                <textarea 
                                    value={formData.note}
                                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                                    rows="3"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Annulla
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Salvando...' : (editingRicambio ? 'Salva Modifiche' : 'Aggiungi Ricambio')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Aggiornamento Quantità */}
            {showQuantitaModal && selectedRicambio && (
                <div className="modal-overlay" onClick={() => setShowQuantitaModal(false)}>
                    <div className="modal-content modal-small" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Aggiorna Quantità</h3>
                            <button 
                                className="modal-close"
                                onClick={() => setShowQuantitaModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        
                        <div className="ricambio-info">
                            <p><strong>{selectedRicambio.id_ricambio}</strong></p>
                            <p>Quantità attuale: <span className="current-quantity">{selectedRicambio.quantita_disponibile}</span> {selectedRicambio.unita_misura}</p>
                        </div>
                        
                        <form onSubmit={handleUpdateQuantita} className="quantita-form">
                            <div className="form-group">
                                <label>Operazione</label>
                                <select 
                                    value={quantitaForm.operazione}
                                    onChange={(e) => setQuantitaForm({...quantitaForm, operazione: e.target.value})}
                                    required
                                >
                                    <option value="carico">➕ Carico (aggiungi)</option>
                                    <option value="scarico">➖ Scarico (rimuovi)</option>
                                    <option value="correzione">🔧 Correzione (imposta valore)</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label>
                                    {quantitaForm.operazione === 'correzione' 
                                        ? 'Nuova quantità' 
                                        : 'Quantità da ' + (quantitaForm.operazione === 'carico' ? 'aggiungere' : 'rimuovere')}
                                </label>
                                <input 
                                    type="number"
                                    min="1"
                                    value={quantitaForm.quantita}
                                    onChange={(e) => setQuantitaForm({...quantitaForm, quantita: parseInt(e.target.value) || 1})}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Operatore *</label>
                                <input 
                                    type="text"
                                    value={quantitaForm.operatore}
                                    onChange={(e) => setQuantitaForm({...quantitaForm, operatore: e.target.value})}
                                    required
                                    placeholder="Nome dell'operatore"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Motivo</label>
                                <input 
                                    type="text"
                                    value={quantitaForm.motivo}
                                    onChange={(e) => setQuantitaForm({...quantitaForm, motivo: e.target.value})}
                                    placeholder="Es: Utilizzo per manutenzione, Nuovo ordine, ecc."
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button 
                                    type="button" 
                                    className="btn-secondary"
                                    onClick={() => setShowQuantitaModal(false)}
                                >
                                    Annulla
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Aggiornando...' : 'Conferma Aggiornamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MagazzinoManager;