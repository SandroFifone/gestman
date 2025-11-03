import React, { useState, useEffect } from 'react';
import './UserEditModal.css';
import { API_URLS } from '../config/api';

const UserEditModal = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    nome: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Inizializza il form con i dati utente attuali
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        nome: user.nome || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
    }
  }, [isOpen, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Rimuovi errore quando l'utente inizia a digitare
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validazione nome
    if (!formData.nome.trim()) {
      newErrors.nome = 'Il nome completo è obbligatorio';
    }

    // Validazione password (solo se sta cercando di cambiarla)
    if (formData.newPassword || formData.currentPassword || formData.confirmPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Inserisci la password attuale';
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'Inserisci la nuova password';
      } else if (formData.newPassword.length < 4) {
        newErrors.newPassword = 'La password deve essere di almeno 4 caratteri';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Le password non coincidono';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const updateData = {
        nome: formData.nome.trim()
      };

      // Aggiungi password solo se sta cambiando
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch(`${API_URLS.USERS}/${user.username}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'aggiornamento');
      }

      // Aggiorna i dati utente nell'app - temporaneamente disabilitato
      // L'aggiornamento dei dati funziona già lato server
      console.log('Aggiornamento completato sul server, modal si chiuderà');

      // Chiudi il modal
      onClose();

      // Mostra messaggio di successo
      alert('Dati aggiornati con successo!');

    } catch (error) {
      console.error('Errore aggiornamento utente:', error);
      setErrors({
        submit: error.message || 'Errore durante l\'aggiornamento. Riprova.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-edit-modal-overlay">
      <div className="user-edit-modal">
        <div className="modal-header">
          <h2>⚙️ Modifica i tuoi dati</h2>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-section">
            <h3>👤 Informazioni personali</h3>
            
            <div className="form-group">
              <label htmlFor="nome">Nome completo *</label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={errors.nome ? 'error' : ''}
                disabled={loading}
                placeholder="Il tuo nome completo"
              />
              {errors.nome && <span className="error-message">{errors.nome}</span>}
            </div>
          </div>

          <div className="form-section">
            <h3>🔒 Modifica password (opzionale)</h3>
            <p className="form-note">Compila solo se vuoi cambiare la password</p>
            
            <div className="form-group">
              <label htmlFor="currentPassword">Password attuale</label>
              <input
                type={showPasswords ? "text" : "password"}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={errors.currentPassword ? 'error' : ''}
                disabled={loading}
                placeholder="Password attuale"
              />
              {errors.currentPassword && <span className="error-message">{errors.currentPassword}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Nuova password</label>
              <input
                type={showPasswords ? "text" : "password"}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={errors.newPassword ? 'error' : ''}
                disabled={loading}
                placeholder="Nuova password (min. 4 caratteri)"
              />
              {errors.newPassword && <span className="error-message">{errors.newPassword}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Conferma nuova password</label>
              <input
                type={showPasswords ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={errors.confirmPassword ? 'error' : ''}
                disabled={loading}
                placeholder="Ripeti la nuova password"
              />
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                />
                <span>👁️ Mostra password</span>
              </label>
            </div>
          </div>

          {errors.submit && (
            <div className="error-message submit-error">
              {errors.submit}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              className="btn-cancel"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading ? '💾 Salvando...' : '💾 Salva modifiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal;