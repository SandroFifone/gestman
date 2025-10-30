import React, { useState, useEffect } from "react";

const TelegramManager = ({ sidebarOpen }) => {
  const [config, setConfig] = useState({ bot_token: '', bot_name: '', active: false });
  const [botLoading, setBotLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ 
    user_name: '', 
    chat_id: '', 
    alert_types: [],
    civici_filter: '',
    asset_types: []
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editUser, setEditUser] = useState({
    id: null,
    name: '',
    chat_id: '',
    alert_types: [],
    civici_filter: '',
    asset_types: []
  });
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [assetTypes, setAssetTypes] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  
  // Tipi di alert disponibili (dal database compilazioni.db)
  const alertTypes = [
    { key: 'non_conformita', label: 'Non Conformità' },
    { key: 'scadenze', label: 'Scadenze' },
    { key: 'Tickets', label: 'Tickets' }
  ];

  // Load configurazione bot
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/telegram/config');
      const data = await res.json();
      if (res.ok) {
        setConfig(data);
      } else {
        setError(data.error || 'Errore caricamento config');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Load utenti
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/telegram/chats');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.chats || []);
      } else {
        setError(data.error || 'Errore caricamento utenti');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Load tipi di asset dinamicamente dal database
  const loadAssetTypes = async () => {
    try {
      const res = await fetch('/api/telegram/asset-types');
      const data = await res.json();
      if (res.ok) {
        setAssetTypes(data.asset_types || []);
      } else {
        console.error('Errore caricamento tipi asset:', data.error);
        // Fallback ai tipi hardcodati se il caricamento fallisce
        setAssetTypes([
          { key: 'ALL', label: '🔄 Seleziona tutti asset' },
          { key: 'Frese', label: 'Frese' },
          { key: 'Forni', label: 'Forni' },
          { key: 'Torni', label: 'Torni' }
        ]);
      }
    } catch (err) {
      console.error('Errore connessione per tipi asset:', err);
      // Fallback ai tipi hardcodati se il caricamento fallisce
      setAssetTypes([
        { key: 'ALL', label: '🔄 Seleziona tutti asset' },
        { key: 'Frese', label: 'Frese' },
        { key: 'Forni', label: 'Forni' },
        { key: 'Torni', label: 'Torni' }
      ]);
    }
  };

  // Load utenti registrati nell'app
  const loadRegisteredUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setRegisteredUsers(data.users || []);
        console.log('Utenti registrati caricati:', data.users?.length || 0);
      } else {
        console.error('Errore caricamento utenti registrati:', data.error);
        setRegisteredUsers([]);
      }
    } catch (err) {
      console.error('Errore connessione per utenti registrati:', err);
      setRegisteredUsers([]);
    }
  };

  useEffect(() => {
    loadConfig();
    loadUsers();
    loadAssetTypes();
    loadRegisteredUsers();
  }, []);

  // Salva configurazione bot
  const saveConfig = async () => {
    if (!config.bot_token.trim()) {
      setError('Bot token richiesto');
      return;
    }
    
    setBotLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch('/api/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_token: config.bot_token })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setConfig(prev => ({ ...prev, bot_name: data.bot_name, active: true }));
        setMessage(data.message);
      } else {
        setError(data.error || 'Errore salvataggio');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
    
    setBotLoading(false);
  };

  // Aggiungi utente
  const addUser = async () => {
    if (!newUser.user_name.trim() || !newUser.chat_id.trim()) {
      setError('Nome utente e Chat ID richiesti');
      return;
    }
    
    if (newUser.alert_types.length === 0) {
      setError('Seleziona almeno un tipo di alert');
      return;
    }
    
    setError('');
    setMessage('');
    
    try {
      const userData = {
        name: newUser.user_name,
        chat_id: newUser.chat_id,
        alert_types: newUser.alert_types.join(','),
        civici_filter: newUser.civici_filter,
        asset_types: newUser.asset_types.join(',')
      };
      
      const res = await fetch('/api/telegram/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setNewUser({ 
          user_name: '', 
          chat_id: '', 
          alert_types: [],
          civici_filter: '',
          asset_types: []
        });
        loadUsers();
      } else {
        setError(data.error || 'Errore aggiunta utente');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Rimuovi utente
  const removeUser = async (userId) => {
    if (!confirm('Rimuovere questo utente?')) return;
    
    try {
      const res = await fetch(`/api/telegram/chats/${userId}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        loadUsers();
      } else {
        setError(data.error || 'Errore rimozione utente');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Avvia modifica utente
  const startEditUser = async (userId) => {
    try {
      const res = await fetch(`/api/telegram/chats/${userId}`);
      const data = await res.json();
      
      if (res.ok) {
        setEditUser({
          id: data.chat.id,
          name: data.chat.name,
          chat_id: data.chat.chat_id,
          alert_types: data.chat.alert_types || [],
          civici_filter: data.chat.civici_filter || '',
          asset_types: data.chat.asset_types || []
        });
        setEditingUser(userId);
        setError('');
      } else {
        setError(data.error || 'Errore caricamento dati utente');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Salva modifiche utente
  const saveEditUser = async () => {
    if (!editUser.name.trim() || !editUser.chat_id.trim()) {
      setError('Nome utente e Chat ID richiesti');
      return;
    }
    
    if (editUser.alert_types.length === 0) {
      setError('Seleziona almeno un tipo di alert');
      return;
    }
    
    setError('');
    setMessage('');
    
    try {
      const userData = {
        name: editUser.name,
        chat_id: editUser.chat_id,
        alert_types: editUser.alert_types.join(','),
        civici_filter: editUser.civici_filter,
        asset_types: editUser.asset_types.join(',')
      };
      
      const res = await fetch(`/api/telegram/chats/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setEditingUser(null);
        setEditUser({
          id: null,
          name: '',
          chat_id: '',
          alert_types: [],
          civici_filter: '',
          asset_types: []
        });
        loadUsers();
      } else {
        setError(data.error || 'Errore aggiornamento utente');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
  };

  // Annulla modifica
  const cancelEdit = () => {
    setEditingUser(null);
    setEditUser({
      id: null,
      name: '',
      chat_id: '',
      alert_types: [],
      civici_filter: '',
      asset_types: []
    });
    setError('');
  };

  // Test invio messaggio
  const testMessage = async (chatId) => {
    setTestLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error || 'Errore test messaggio');
      }
    } catch (err) {
      setError('Errore connessione server');
    }
    
    setTestLoading(false);
  };

  const TabButton = ({ tabKey, label, isActive, onClick }) => (
    <button
      onClick={onClick}
      style={{
        background: isActive ? '#1a237e' : '#fff',
        color: isActive ? '#fff' : '#1a237e',
        border: '1px solid #1a237e',
        borderRadius: 6,
        fontWeight: 500,
        fontSize: 15,
        padding: '8px 18px',
        marginRight: 12,
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  );

  // Gestione checkbox per tipi di alert
  const handleAlertTypeChange = (alertType, checked) => {
    setNewUser(prev => ({
      ...prev,
      alert_types: checked 
        ? [...prev.alert_types, alertType]
        : prev.alert_types.filter(type => type !== alertType)
    }));
  };

  // Gestione checkbox per tipi di asset
  const handleAssetTypeChange = (assetType, checked) => {
    setNewUser(prev => {
      if (assetType === 'ALL') {
        // Se seleziona/deseleziona "tutti", gestisce tutti gli asset
        if (checked) {
          // Seleziona tutti gli asset specifici (escluso 'ALL')
          const allAssetKeys = assetTypes.filter(at => at.key !== 'ALL').map(at => at.key);
          return { ...prev, asset_types: allAssetKeys };
        } else {
          // Deseleziona tutti
          return { ...prev, asset_types: [] };
        }
      } else {
        // Gestione normale per asset specifici
        const newAssetTypes = checked 
          ? [...prev.asset_types, assetType]
          : prev.asset_types.filter(type => type !== assetType);
        
        return { ...prev, asset_types: newAssetTypes };
      }
    });
  };

  // Gestione checkbox per tipi di alert (editing)
  const handleEditAlertTypeChange = (alertType, checked) => {
    setEditUser(prev => ({
      ...prev,
      alert_types: checked 
        ? [...prev.alert_types, alertType]
        : prev.alert_types.filter(type => type !== alertType)
    }));
  };

  // Gestione checkbox per tipi di asset (editing)
  const handleEditAssetTypeChange = (assetType, checked) => {
    setEditUser(prev => {
      if (assetType === 'ALL') {
        // Se seleziona/deseleziona "tutti", gestisce tutti gli asset
        if (checked) {
          // Seleziona tutti gli asset specifici (escluso 'ALL')
          const allAssetKeys = assetTypes.filter(at => at.key !== 'ALL').map(at => at.key);
          return { ...prev, asset_types: allAssetKeys };
        } else {
          // Deseleziona tutti
          return { ...prev, asset_types: [] };
        }
      } else {
        // Gestione normale per asset specifici
        const newAssetTypes = checked 
          ? [...prev.asset_types, assetType]
          : prev.asset_types.filter(type => type !== assetType);
        
        return { ...prev, asset_types: newAssetTypes };
      }
    });
  };

  return (
    <div style={{ 
      maxWidth: sidebarOpen ? 1000 : 'none', 
      margin: sidebarOpen ? '0 auto' : '0', 
      padding: 32,
      width: sidebarOpen ? 'auto' : '100%'
    }}>
      <h2 style={{ color: '#1a237e', marginBottom: 24 }}>🤖 Telegram Manager</h2>
      
      {/* Messages */}
      {message && (
        <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Configurazione Bot */}
      <div style={{ background: '#fff', border: '1px solid #e3eaf6', borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0, color: '#1a237e' }}>Configurazione Bot Telegram</h3>
        
        {config.active && config.bot_name && (
          <div style={{ background: '#d4edda', color: '#155724', padding: 12, borderRadius: 6, marginBottom: 16 }}>
            ✅ Bot attivo: <strong>{config.bot_name}</strong>
          </div>
        )}
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            Bot Token:
          </label>
          <input
            type="text"
            value={config.bot_token}
            onChange={(e) => setConfig(prev => ({ ...prev, bot_token: e.target.value }))}
            placeholder="123456789:ABCdefGHIjklMN..."
            style={{ 
              width: '100%', 
              padding: 10, 
              borderRadius: 4, 
              border: '1px solid #ccc',
              fontFamily: 'monospace',
              fontSize: 14
            }}
          />
          <small style={{ color: '#666', fontSize: 13 }}>
            Ottieni il token da @BotFather su Telegram
          </small>
        </div>
        
        <button
          onClick={saveConfig}
          disabled={botLoading}
          style={{
            background: '#1a237e',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 20px',
            cursor: botLoading ? 'not-allowed' : 'pointer',
            opacity: botLoading ? 0.7 : 1
          }}
        >
          {botLoading ? 'Verificando...' : 'Salva e Testa Bot'}
        </button>
      </div>

      {/* Gestione Utenti e Alert */}
      <div style={{ background: '#fff', border: '1px solid #e3eaf6', borderRadius: 10, padding: 24 }}>
        <h3 style={{ marginTop: 0, color: '#1a237e' }}>Gestione Utenti e Alert</h3>
        
        {/* Form aggiunta utente */}
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Aggiungi Nuovo Utente</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Nome Utente:
              </label>
              <select
                value={newUser.user_name}
                onChange={(e) => setNewUser(prev => ({ ...prev, user_name: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 4, 
                  border: '1px solid #ccc',
                  backgroundColor: 'white',
                  fontSize: 14
                }}
              >
                <option value="">Seleziona un utente registrato...</option>
                {registeredUsers.map(user => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
              {registeredUsers.length === 0 && (
                <small style={{ color: '#666', fontSize: 12, marginTop: 4, display: 'block' }}>
                  Nessun utente registrato trovato
                </small>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Chat ID Utente:
              </label>
              <input
                type="text"
                value={newUser.chat_id}
                onChange={(e) => setNewUser(prev => ({ ...prev, chat_id: e.target.value }))}
                placeholder="es. 123456789"
                style={{ 
                  width: '100%', 
                  padding: 8, 
                  borderRadius: 4, 
                  border: '1px solid #ccc',
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Tipi di Alert da Ricevere:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
              {alertTypes.map(alertType => (
                <label key={alertType.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newUser.alert_types.includes(alertType.key)}
                    onChange={(e) => handleAlertTypeChange(alertType.key, e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  <span style={{ fontSize: 14 }}>{alertType.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Filtro Civici (opzionale):
              </label>
              <input
                type="text"
                value={newUser.civici_filter}
                onChange={(e) => setNewUser(prev => ({ ...prev, civici_filter: e.target.value }))}
                placeholder="es. VIA001,VIA002 (separati da virgola)"
                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              />
              <small style={{ color: '#666', fontSize: 12 }}>
                Lascia vuoto per ricevere alert da tutti i civici
              </small>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                Tipi Asset (opzionale):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                {assetTypes.map(assetType => {
                  const isChecked = assetType.key === 'ALL' 
                    ? newUser.asset_types.length === assetTypes.length - 1 // Tutti selezionati eccetto 'ALL'
                    : newUser.asset_types.includes(assetType.key);
                  
                  return (
                    <label key={assetType.key} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      fontWeight: assetType.key === 'ALL' ? 'bold' : 'normal',
                      borderBottom: assetType.key === 'ALL' ? '1px solid #ddd' : 'none',
                      paddingBottom: assetType.key === 'ALL' ? '4px' : '0',
                      marginBottom: assetType.key === 'ALL' ? '4px' : '0'
                    }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleAssetTypeChange(assetType.key, e.target.checked)}
                        style={{ marginRight: 6 }}
                      />
                      <span style={{ fontSize: 13 }}>{assetType.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={addUser}
              disabled={!config.active}
              style={{
                background: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 20px',
                cursor: !config.active ? 'not-allowed' : 'pointer',
                opacity: !config.active ? 0.6 : 1
              }}
            >
              Aggiungi Utente
            </button>
            <small style={{ color: '#666', fontSize: 13, alignSelf: 'center' }}>
              {!config.active && 'Configura prima il bot per aggiungere utenti'}
            </small>
          </div>
          
          <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
            💡 <strong>Come ottenere il Chat ID di un utente:</strong><br />
            1. L'utente deve scrivere al bot (anche solo /start)<br />
            2. Vai su https://api.telegram.org/bot[TOKEN]/getUpdates<br />
            3. Trova "from": &#123;"id": 123456789&#125; nel JSON<br />
            4. Questo è il Chat ID dell'utente
          </div>
        </div>

        {/* Form modifica utente */}
        {editingUser && (
          <div style={{ 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7', 
            borderRadius: 10, 
            padding: 24, 
            marginBottom: 24 
          }}>
            <h4 style={{ marginTop: 0, color: '#856404' }}>✏️ Modifica Utente</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                  Nome Utente:
                </label>
                <input
                  type="text"
                  value={editUser.name}
                  onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="es. Mario Rossi"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                  Chat ID Utente:
                </label>
                <input
                  type="text"
                  value={editUser.chat_id}
                  onChange={(e) => setEditUser(prev => ({ ...prev, chat_id: e.target.value }))}
                  placeholder="es. 123456789"
                  style={{ 
                    width: '100%', 
                    padding: 8, 
                    borderRadius: 4, 
                    border: '1px solid #ccc',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Tipi di Alert da Ricevere:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                {alertTypes.map(alertType => (
                  <label key={alertType.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editUser.alert_types.includes(alertType.key)}
                      onChange={(e) => handleEditAlertTypeChange(alertType.key, e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ fontSize: 14 }}>{alertType.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                  Filtro Civici (opzionale):
                </label>
                <input
                  type="text"
                  value={editUser.civici_filter}
                  onChange={(e) => setEditUser(prev => ({ ...prev, civici_filter: e.target.value }))}
                  placeholder="es. VIA001,VIA002 (separati da virgola)"
                  style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                />
                <small style={{ color: '#666', fontSize: 12 }}>
                  Lascia vuoto per ricevere alert da tutti i civici
                </small>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>
                  Tipi Asset (opzionale):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                  {assetTypes.map(assetType => {
                    const isChecked = assetType.key === 'ALL' 
                      ? editUser.asset_types.length === assetTypes.length - 1 // Tutti selezionati eccetto 'ALL'
                      : editUser.asset_types.includes(assetType.key);
                    
                    return (
                      <label key={assetType.key} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        fontWeight: assetType.key === 'ALL' ? 'bold' : 'normal',
                        borderBottom: assetType.key === 'ALL' ? '1px solid #ddd' : 'none',
                        paddingBottom: assetType.key === 'ALL' ? '4px' : '0',
                        marginBottom: assetType.key === 'ALL' ? '4px' : '0'
                      }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleEditAssetTypeChange(assetType.key, e.target.checked)}
                          style={{ marginRight: 6 }}
                        />
                        <span style={{ fontSize: 13 }}>{assetType.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={saveEditUser}
                style={{
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
              >
                Salva Modifiche
              </button>
              <button
                onClick={cancelEdit}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Lista utenti configurati */}
        <div>
          <h4 style={{ marginBottom: 16, color: '#1a237e' }}>
            Utenti Configurati ({users.length})
          </h4>
          
          {users.length === 0 ? (
            <div style={{ 
              color: '#666', 
              fontStyle: 'italic', 
              textAlign: 'center', 
              padding: 40,
              background: '#f8f9fa',
              borderRadius: 8
            }}>
              Nessun utente configurato
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f7fa' }}>
                    <th style={{ padding: 12, borderBottom: '2px solid #e3eaf6', textAlign: 'left' }}>Nome Utente</th>
                    <th style={{ padding: 12, borderBottom: '2px solid #e3eaf6', textAlign: 'left' }}>Chat ID</th>
                    <th style={{ padding: 12, borderBottom: '2px solid #e3eaf6', textAlign: 'left' }}>Alert Types</th>
                    <th style={{ padding: 12, borderBottom: '2px solid #e3eaf6', textAlign: 'left' }}>Filtri</th>
                    <th style={{ padding: 12, borderBottom: '2px solid #e3eaf6', textAlign: 'left' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid #e3eaf6' }}>
                        <strong>{user.name}</strong>
                      </td>
                      <td style={{ 
                        padding: 12, 
                        borderBottom: '1px solid #e3eaf6', 
                        fontFamily: 'monospace',
                        fontSize: 13
                      }}>
                        {user.chat_id}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e3eaf6' }}>
                        {user.alert_types && user.alert_types.length > 0 ? user.alert_types.map(type => (
                          <span 
                            key={type}
                            style={{ 
                              background: '#e3f2fd', 
                              color: '#1976d2', 
                              padding: '2px 6px', 
                              borderRadius: 3, 
                              fontSize: 12,
                              marginRight: 4,
                              display: 'inline-block'
                            }}
                          >
                            {alertTypes.find(at => at.key === type)?.label || type}
                          </span>
                        )) : '-'}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e3eaf6', fontSize: 13 }}>
                        {user.civici_filter && (
                          <div>Civici: {user.civici_filter}</div>
                        )}
                        {user.asset_types && user.asset_types.length > 0 && (
                          <div>Asset: {user.asset_types.join(', ')}</div>
                        )}
                        {!user.civici_filter && (!user.asset_types || user.asset_types.length === 0) && (
                          <span style={{ color: '#999' }}>Nessun filtro</span>
                        )}
                      </td>
                      <td style={{ padding: 12, borderBottom: '1px solid #e3eaf6' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => testMessage(user.chat_id)}
                            disabled={testLoading || !config.active}
                            style={{
                              background: '#007bff',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              cursor: testLoading || !config.active ? 'not-allowed' : 'pointer',
                              opacity: testLoading || !config.active ? 0.6 : 1,
                              fontSize: 12
                            }}
                          >
                            {testLoading ? 'Invio...' : 'Test'}
                          </button>
                          <button
                            onClick={() => startEditUser(user.id)}
                            style={{
                              background: '#28a745',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => removeUser(user.id)}
                            style={{
                              background: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 12
                            }}
                          >
                            Rimuovi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramManager;
