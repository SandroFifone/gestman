import React, { useState, useEffect } from 'react';
import './PersonalDashboard.css';
import TelegramMessageModal from './TelegramMessageModal';
import convert from 'convert-units';

const PersonalDashboard = ({ user, isAdmin }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  
  // Stati per conversioni
  const [conversions, setConversions] = useState({
    pressure: { value: '', fromUnit: 'bar', toUnit: 'psi', result: '' },
    length: { value: '', fromUnit: 'mm', toUnit: 'in', result: '' },
    mass: { value: '', fromUnit: 'kg', toUnit: 'lb', result: '' }
  });

  useEffect(() => {
    // Aggiorna la data ogni minuto
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    // Carica dati iniziali
    loadUserNotes();
    checkTelegramStatus();

    return () => clearInterval(timer);
  }, [user.username]);

  // Sincronizza note localStorage al server se necessario
  useEffect(() => {
    const syncLocalNotesToServer = async () => {
      try {
        const localNotes = localStorage.getItem(`notes_${user.username}`);
        
        if (localNotes && localNotes.trim()) {
          // Controlla se le note del server sono diverse da quelle locali
          const response = await fetch(`/api/users/${user.username}/notes`);
          if (response.ok) {
            const serverData = await response.json();
            const serverNotes = serverData.notes || '';
            
            // Se le note locali sono più recenti o il server è vuoto, sincronizza
            if (localNotes !== serverNotes && (!serverNotes || localNotes.length > serverNotes.length)) {
              console.log(`[DASHBOARD] Sincronizzando note locali al server per ${user.username}`);
              
              await fetch(`/api/users/${user.username}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: localNotes })
              });
            }
          }
        }
      } catch (error) {
        console.log('[DASHBOARD] Sincronizzazione note saltata:', error);
      }
    };

    // Esegui la sincronizzazione dopo il caricamento iniziale
    setTimeout(syncLocalNotesToServer, 1000);
  }, [user.username]);

  useEffect(() => {
    // Polling per aggiornare i messaggi Telegram ogni 30 secondi
    let pollInterval;
    
    if (telegramEnabled) {
      // Carica subito i messaggi
      loadRecentTelegramMessages();
      
      // Poi imposta il polling ogni 30 secondi
      pollInterval = setInterval(() => {
        loadRecentTelegramMessages();
      }, 30000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [telegramEnabled, user.username]);

  const loadUserNotes = async () => {
    try {
      const response = await fetch(`/api/users/${user.username}/notes`);
      const data = await response.json();
      
      if (response.ok) {
        setSavedNotes(data.notes || '');
        setNotes(data.notes || '');
        console.log(`[DASHBOARD] Note caricate per utente ${user.username}: ${data.notes?.length || 0} caratteri`);
      } else {
        console.error('Errore API note utente:', data.error);
        // Fallback al localStorage se l'API fallisce
        const localNotes = localStorage.getItem(`notes_${user.username}`) || '';
        setSavedNotes(localNotes);
        setNotes(localNotes);
      }
    } catch (error) {
      console.error('Errore caricamento note:', error);
      // Fallback al localStorage in caso di errore di rete
      const localNotes = localStorage.getItem(`notes_${user.username}`) || '';
      setSavedNotes(localNotes);
      setNotes(localNotes);
    }
  };

  const saveNotes = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/users/${user.username}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSavedNotes(notes);
        console.log(`[DASHBOARD] Note salvate per utente ${user.username}: ${notes.length} caratteri`);
        
        // Salva anche nel localStorage come backup
        localStorage.setItem(`notes_${user.username}`, notes);
        
        // Feedback visivo
        const button = document.getElementById('save-notes-btn');
        if (button) {
          button.textContent = 'Salvato!';
          button.style.backgroundColor = '#4caf50';
          setTimeout(() => {
            button.textContent = 'Salva Note';
            button.style.backgroundColor = '';
          }, 2000);
        }
      } else {
        console.error('Errore API salvataggio note:', data.error);
        
        // Fallback al localStorage se l'API fallisce
        localStorage.setItem(`notes_${user.username}`, notes);
        setSavedNotes(notes);
        
        // Mostra comunque feedback positivo all'utente
        const button = document.getElementById('save-notes-btn');
        if (button) {
          button.textContent = 'Salvato (locale)';
          button.style.backgroundColor = '#ff9800';
          setTimeout(() => {
            button.textContent = 'Salva Note';
            button.style.backgroundColor = '';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Errore salvataggio note:', error);
      
      // Fallback al localStorage in caso di errore di rete
      localStorage.setItem(`notes_${user.username}`, notes);
      setSavedNotes(notes);
      
      // Mostra feedback all'utente
      const button = document.getElementById('save-notes-btn');
      if (button) {
        button.textContent = 'Salvato (offline)';
        button.style.backgroundColor = '#ff5722';
        setTimeout(() => {
          button.textContent = 'Salva Note';
          button.style.backgroundColor = '';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkTelegramStatus = async () => {
    try {
      // Controlla se l'utente è abilitato per Telegram
      const response = await fetch('/api/telegram/chats');
      const data = await response.json();
      
      if (response.ok) {
        const userChat = data.chats?.find(chat => chat.name === user.username);
        setTelegramEnabled(!!userChat);
        
        if (userChat) {
          // TODO: Carica messaggi recenti per l'utente
          loadRecentTelegramMessages();
        }
      }
    } catch (error) {
      console.error('Errore controllo Telegram:', error);
    }
  };

  const loadRecentTelegramMessages = async () => {
    try {
      const response = await fetch(`/api/telegram/messages/${user.username}?limit=10`);
      const data = await response.json();
      
      if (response.ok) {
        // Converte i timestamp dal formato ISO al Date object
        const messagesWithDates = data.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        
        setTelegramMessages(messagesWithDates);
        console.log(`[DASHBOARD] Caricati ${messagesWithDates.length} messaggi Telegram per ${user.username}`);
      } else {
        console.error('Errore API messaggi Telegram:', data.error);
        setTelegramMessages([]);
      }
    } catch (error) {
      console.error('Errore caricamento messaggi Telegram:', error);
      setTelegramMessages([]);
    }
  };

  const handleMessageClick = async (messageId) => {
    if (loadingMessage) return;
    
    setLoadingMessage(true);
    try {
      const response = await fetch(`/api/telegram/message/${messageId}/full`);
      const data = await response.json();
      
      if (response.ok) {
        setSelectedMessage(data);
        setIsModalOpen(true);
      } else {
        console.error('Errore caricamento messaggio completo:', data.error);
        // Fallback: mostra il messaggio originale se l'API fallisce
        const originalMessage = telegramMessages.find(msg => msg.id === messageId);
        if (originalMessage) {
          setSelectedMessage(originalMessage);
          setIsModalOpen(true);
        }
      }
    } catch (error) {
      console.error('Errore caricamento messaggio completo:', error);
      // Fallback: mostra il messaggio originale se c'è errore di rete
      const originalMessage = telegramMessages.find(msg => msg.id === messageId);
      if (originalMessage) {
        setSelectedMessage(originalMessage);
        setIsModalOpen(true);
      }
    } finally {
      setLoadingMessage(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMessage(null);
  };



  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();
    
    // Primo giorno del mese e ultimo giorno
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Giorni da mostrare (iniziando da lunedì)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() + 6) % 7);
    
    const calendar = [];
    const currentDay = new Date(startDate);
    
    // Genera 6 settimane di giorni
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const isCurrentMonth = currentDay.getMonth() === month;
        const isToday = currentDay.toDateString() === today.toDateString();
        
        weekDays.push({
          date: new Date(currentDay),
          day: currentDay.getDate(),
          isCurrentMonth,
          isToday
        });
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
      calendar.push(weekDays);
    }
    
    return calendar;
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  const formatTime = (date) => {
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Funzioni per conversioni
  const handleConversion = (type, value) => {
    if (!value || value === '') {
      setConversions(prev => ({
        ...prev,
        [type]: { ...prev[type], value: '', result: '' }
      }));
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    try {
      const currentConv = conversions[type];
      const result = convert(numValue).from(currentConv.fromUnit).to(currentConv.toUnit);
      
      setConversions(prev => ({
        ...prev,
        [type]: { ...prev[type], value, result: result.toFixed(3) }
      }));
    } catch (error) {
      console.error('Errore conversione:', error);
    }
  };

  const swapUnits = (type) => {
    const currentConv = conversions[type];
    const newFromUnit = currentConv.toUnit;
    const newToUnit = currentConv.fromUnit;
    
    setConversions(prev => ({
      ...prev,
      [type]: {
        fromUnit: newFromUnit,
        toUnit: newToUnit,
        value: prev[type].result || '',
        result: prev[type].value || ''
      }
    }));
  };

  const clearConversions = () => {
    setConversions({
      pressure: { value: '', fromUnit: 'bar', toUnit: 'psi', result: '' },
      length: { value: '', fromUnit: 'mm', toUnit: 'in', result: '' },
      mass: { value: '', fromUnit: 'kg', toUnit: 'lb', result: '' }
    });
  };

  return (
    <div className="personal-dashboard">
      <div className="dashboard-header">
        <h1>Buon lavoro, {user.nome || user.username}!</h1>
        <p>La tua dashboard personale - {formatTime(currentDate)}</p>
      </div>

      <div className="dashboard-grid">
        {/* Conversioni Tecniche */}
        <div className="dashboard-card conversions-card">
          <h2>⚙️ Conversioni</h2>
          <div className="conversions-container">
            
            {/* Pressione */}
            <div className="conv-row">
              <label className="conv-label">Pressione</label>
              <div className="conv-inputs">
                <input
                  type="number"
                  placeholder="0"
                  value={conversions.pressure.value}
                  onChange={(e) => handleConversion('pressure', e.target.value)}
                  className="conv-input"
                />
                <span className="conv-unit">{conversions.pressure.fromUnit}</span>
                <button 
                  className="swap-btn"
                  onClick={() => swapUnits('pressure')}
                  title="Inverti unità"
                >
                  ⇄
                </button>
                <span className="conv-result">{conversions.pressure.result}</span>
                <span className="conv-unit">{conversions.pressure.toUnit}</span>
              </div>
            </div>

            {/* Lunghezza */}
            <div className="conv-row">
              <label className="conv-label">Lunghezza</label>
              <div className="conv-inputs">
                <input
                  type="number"
                  placeholder="0"
                  value={conversions.length.value}
                  onChange={(e) => handleConversion('length', e.target.value)}
                  className="conv-input"
                />
                <span className="conv-unit">{conversions.length.fromUnit}</span>
                <button 
                  className="swap-btn"
                  onClick={() => swapUnits('length')}
                  title="Inverti unità"
                >
                  ⇄
                </button>
                <span className="conv-result">{conversions.length.result}</span>
                <span className="conv-unit">{conversions.length.toUnit}</span>
              </div>
            </div>

            {/* Peso */}
            <div className="conv-row">
              <label className="conv-label">Peso</label>
              <div className="conv-inputs">
                <input
                  type="number"
                  placeholder="0"
                  value={conversions.mass.value}
                  onChange={(e) => handleConversion('mass', e.target.value)}
                  className="conv-input"
                />
                <span className="conv-unit">{conversions.mass.fromUnit}</span>
                <button 
                  className="swap-btn"
                  onClick={() => swapUnits('mass')}
                  title="Inverti unità"
                >
                  ⇄
                </button>
                <span className="conv-result">{conversions.mass.result}</span>
                <span className="conv-unit">{conversions.mass.toUnit}</span>
              </div>
            </div>

            <button 
              className="clear-all-btn"
              onClick={clearConversions}
              title="Pulisci tutto"
            >
              Pulisci
            </button>
          </div>
        </div>

        {/* Note personali */}
        <div className="dashboard-card notes-card">
          <h2>📝 Le mie note</h2>
          <div className="notes-container">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scrivi le tue note personali qui..."
              className="notes-textarea"
            />
            <div className="notes-actions">
              <button 
                id="save-notes-btn"
                onClick={saveNotes}
                disabled={loading || notes === savedNotes}
                className="save-notes-btn"
              >
                {loading ? 'Salvataggio...' : 'Salva Note'}
              </button>
              {notes !== savedNotes && (
                <span className="unsaved-indicator">• Modifiche non salvate</span>
              )}
            </div>
          </div>
        </div>

        {/* Messaggi Telegram - Solo se l'utente è abilitato */}
        {telegramEnabled && (
          <div className="dashboard-card telegram-card">
            <h2>💬 Messaggi Telegram</h2>
            <div className="telegram-messages">
              {telegramMessages.length > 0 ? (
                <>
                  <p className="telegram-status">✅ Notifiche attive</p>
                  <div className="messages-list">
                    {telegramMessages.map(msg => (
                      <div 
                        key={msg.id} 
                        className={`message-item ${msg.type} ${loadingMessage ? 'loading' : 'clickable'}`}
                        onClick={() => handleMessageClick(msg.id)}
                        title="Clicca per vedere il messaggio completo"
                      >
                        <div className="message-content">{msg.message}</div>
                        <div className="message-time">
                          {formatTime(msg.timestamp)}
                        </div>
                        <div className="message-expand-hint">👆 Clicca per espandere</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-messages">
                  <p className="telegram-status">✅ Notifiche attive</p>
                  <p>Nessun messaggio recente</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal per messaggio completo */}
      <TelegramMessageModal 
        message={selectedMessage}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
};

export default PersonalDashboard;