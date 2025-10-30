
import React, { useEffect, useState } from "react";
import "./UsersManager.css";
import AddUserForm from "./AddUserForm";
import Modal from "./Modal";
import { API_URLS } from "../config/api";

const API = API_URLS.users;

const UsersManager = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editUser, setEditUser] = useState({ username: "", password: "", nome: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Stati per gestione permessi
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [availableSections, setAvailableSections] = useState({ user_sections: [], admin_only_sections: [] });
  const [userSections, setUserSections] = useState([]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const updateUser = async (id, updates) => {
    setError("");
    try {
      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setEditId(null);
      setEditUser({ username: "", password: "", nome: "" });
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Funzioni per gestione permessi
  const fetchAvailableSections = async () => {
    try {
      const res = await fetch(`${API_URLS.BASE}/api/sections`);
      const data = await res.json();
      if (res.ok) {
        setAvailableSections(data);
      }
    } catch (err) {
      console.error('Errore caricamento sezioni:', err);
    }
  };

  const fetchUserSections = async (userId) => {
    try {
      const res = await fetch(`${API}/${userId}/sections`);
      const data = await res.json();
      if (res.ok) {
        setUserSections(data.sections || []);
      }
    } catch (err) {
      console.error('Errore caricamento permessi utente:', err);
    }
  };

  const updateUserPermissions = async (userId, sections) => {
    try {
      const res = await fetch(`${API}/${userId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore aggiornamento permessi");
      
      setShowPermissionsModal(false);
      fetchUsers(); // Ricarica la lista utenti
    } catch (err) {
      setError(err.message);
    }
  };

  const openPermissionsModal = async (userId) => {
    setSelectedUserId(userId);
    await fetchUserSections(userId);
    setShowPermissionsModal(true);
  };

  const handleSectionToggle = (sectionKey) => {
    setUserSections(prev => {
      if (prev.includes(sectionKey)) {
        return prev.filter(s => s !== sectionKey);
      } else {
        return [...prev, sectionKey];
      }
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchAvailableSections();
  }, []);

  const deleteUser = async (id) => {
    setError("");
    if (!window.confirm("Sei sicuro di voler eliminare questo utente?")) return;
    try {
      const res = await fetch(`${API}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setEditUser({ username: u.username, password: "", nome: u.nome || "" });
  };

  const handleEditChange = (e) => {
    setEditUser({ ...editUser, [e.target.name]: e.target.value });
  };

  const handleEditSave = (id) => {
    const updates = { username: editUser.username, nome: editUser.nome };
    if (editUser.password) updates.password = editUser.password;
    updateUser(id, updates);
  };

  const handleAddUser = () => {
    fetchUsers();
    setShowAddModal(false);
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-content">
            <div className="text-center text-muted">
              <strong>Accesso negato.</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        👥 Gestione Utenti
      </h2>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📋 Utenti Configurati ({users.length})</h3>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            Aggiungi utente
          </button>
        </div>
        <div className="card-content">
          {/* Desktop Table */}
          <div className="desktop-only">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome utente</th>
                  <th>Nome completo</th>
                  <th>Password</th>
                  <th>Admin</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>
                      {editId === u.id ? (
                        <input
                          name="username"
                          value={editUser.username}
                          onChange={handleEditChange}
                          className="form-input"
                          style={{ width: "120px" }}
                        />
                      ) : (
                        u.username
                      )}
                    </td>
                    <td>
                      {editId === u.id ? (
                        <input
                          name="nome"
                          value={editUser.nome}
                          onChange={handleEditChange}
                          placeholder="Nome completo"
                          className="form-input"
                          style={{ width: "150px" }}
                        />
                      ) : (
                        u.nome || '-'
                      )}
                    </td>
                    <td>
                      {editId === u.id ? (
                        <input
                          name="password"
                          type="text"
                          value={editUser.password}
                          onChange={handleEditChange}
                          placeholder="Nuova password"
                          className="form-input"
                          style={{ width: "120px" }}
                        />
                      ) : (
                        <span style={{ fontFamily: 'monospace' }}>{u.password || ''}</span>
                      )}
                    </td>
                    <td>{u.is_admin ? "Sì" : "No"}</td>
                    <td className="table-actions">
                      {u.id !== currentUser.id && (
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                          {editId === u.id ? (
                            <>
                              <button onClick={() => handleEditSave(u.id)} className="btn btn-sm btn-primary">
                                Salva
                              </button>
                              <button onClick={() => setEditId(null)} className="btn btn-sm btn-secondary">
                                Annulla
                              </button>
                              <button onClick={() => deleteUser(u.id)} className="btn btn-sm btn-danger">
                                Elimina
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => updateUser(u.id, { is_admin: !u.is_admin })} 
                                className="btn btn-sm btn-outline"
                              >
                                {u.is_admin ? "Rimuovi admin" : "Rendi admin"}
                              </button>
                              {!u.is_admin && (
                                <button 
                                  onClick={() => openPermissionsModal(u.id)}
                                  className="btn btn-sm btn-info"
                                >
                                  🔐 Permessi
                                </button>
                              )}
                              <button onClick={() => startEdit(u)} className="btn btn-sm btn-outline">
                                Modifica
                              </button>
                              <button onClick={() => deleteUser(u.id)} className="btn btn-sm btn-danger">
                                Elimina
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="table-empty">
                      Nessun utente trovato.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="mobile-only">
            {users.length === 0 ? (
              <div className="table-empty">
                Nessun utente trovato.
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="card-item mobile-card">
                  <div className="card-item-header">
                    <span className="card-item-number">#{u.id}</span>
                    <div className="card-item-badges">
                      {u.is_admin && <span className="badge badge-admin">Admin</span>}
                      {u.id === currentUser.id && <span className="badge badge-current">Tu</span>}
                    </div>
                  </div>
                  <div className="card-item-body">
                    <p className="card-item-username">{u.username}</p>
                    {u.nome && <p className="card-item-nome">{u.nome}</p>}
                    <p className="card-item-password">{u.password || ''}</p>
                  </div>
                  {u.id !== currentUser.id && (
                    <div className="card-item-actions">
                      <button 
                        onClick={() => updateUser(u.id, { is_admin: !u.is_admin })} 
                        className="btn btn-sm btn-outline"
                      >
                        {u.is_admin ? "👤 Rimuovi admin" : "⭐ Rendi admin"}
                      </button>
                      {!u.is_admin && (
                        <button 
                          onClick={() => openPermissionsModal(u.id)}
                          className="btn btn-sm btn-info"
                        >
                          🔐 Permessi
                        </button>
                      )}
                      <button onClick={() => startEdit(u)} className="btn btn-sm btn-outline">
                        ✏️ Modifica
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="btn btn-sm btn-danger">
                        🗑️ Elimina
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal 
        open={showPermissionsModal} 
        onClose={() => setShowPermissionsModal(false)} 
        title="🔐 Gestione Permessi Utente"
      >
        <div className="permissions-manager">
          <p className="permissions-intro">
            Seleziona le sezioni a cui l'utente può accedere:
          </p>
          
          <div className="sections-grid">
            {availableSections.user_sections.map(section => (
              <label key={section.key} className="section-checkbox">
                <input
                  type="checkbox"
                  checked={userSections.includes(section.key)}
                  onChange={() => handleSectionToggle(section.key)}
                />
                <div className="section-info">
                  <span className="section-icon">{section.icon}</span>
                  <div className="section-details">
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </div>
                </div>
              </label>
            ))}
          </div>
          
          <div className="admin-sections-note">
            <h4>🚫 Sezioni Riservate Admin:</h4>
            <div className="admin-sections-list">
              {availableSections.admin_only_sections.map(section => (
                <span key={section.key} className="admin-section-badge">
                  {section.icon} {section.label}
                </span>
              ))}
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowPermissionsModal(false)}
            >
              Annulla
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => updateUserPermissions(selectedUserId, userSections)}
            >
              💾 Salva Permessi
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Aggiungi nuovo utente">
        <AddUserForm onAdd={handleAddUser} setError={setError} />
      </Modal>
    </div>
  );
}

export default UsersManager;
