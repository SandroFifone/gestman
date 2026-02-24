import React, { useState, useEffect } from 'react';
import './PersonalDashboard.css';
import TelegramMessageModal from './TelegramMessageModal';
import { SECTIONS_MAP } from './Sidebar';
import { API_URLS } from '../config/api';
import convert from 'convert-units';

const PersonalDashboard = ({ user, isAdmin, onNavigate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [telegramMessages, setTelegramMessages] = useState([]);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  
  // Stati per widget area
  const [widgets, setWidgets] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Stati per conversioni - Una sola riga configurabile
  const [conversion, setConversion] = useState({
    value: '',
    fromUnit: 'kW',
    toUnit: 'CV',
    result: '',
    category: 'power'
  });

  // Unità tecniche per azienda meccanica - Solo le più importanti
  const availableUnits = {
    power: ['kW', 'CV', 'HP'],
    pressure: ['bar', 'psi', 'MPa', 'atm'],
    torque: ['Nm', 'lbf-ft', 'kgf-m'],
    thread: ['M', 'UNC', 'BSP', 'NPT'],
    steel: ['HRC', 'HB', 'N/mm2', 'psi'],
    flow: ['l/min', 'gpm', 'm3/h', 'cfm'],
    surface: ['Ra', 'Rz', 'RMS', 'μin'],
    tolerance: ['H7', 'h6', 'IT', 'mil'],
    angle: ['deg', 'rad', 'grad', 'mrad'],
    precision: ['mm', 'in', 'mil', 'μm']
  };

  // Conversioni personalizzate per meccanica industriale
  const customConversions = {
    // POTENZA - Motori e macchine
    'kW-CV': (kw) => kw * 1.35962,
    'CV-kW': (cv) => cv * 0.73549,
    'kW-HP': (kw) => kw * 1.34102,
    'HP-kW': (hp) => hp * 0.7457,
    'CV-HP': (cv) => cv * 0.98632,
    'HP-CV': (hp) => hp * 1.01387,
    
    // COPPIA - Serraggio e motori
    'Nm-lbf-ft': (nm) => nm * 0.737562,
    'lbf-ft-Nm': (lbfft) => lbfft * 1.35582,
    'Nm-kgf-m': (nm) => nm * 0.101972,
    'kgf-m-Nm': (kgfm) => kgfm * 9.80665,
    
    // FILETTATURE - Viti e raccordi
    'M-UNC': (m) => m / 25.4, // mm to inch approximation
    'UNC-M': (unc) => unc * 25.4,
    'M-BSP': (m) => m / 25.4,
    'BSP-M': (bsp) => bsp * 25.4,
    
    // DUREZZA ACCIAI
    'HRC-HB': (hrc) => hrc <= 20 ? hrc * 10 : 2.15 * hrc + 132,
    'HB-HRC': (hb) => hb <= 200 ? hb / 10 : (hb - 132) / 2.15,
    'HRC-N/mm2': (hrc) => hrc * 32.5, // Approssimazione resistenza
    'N/mm2-HRC': (nmm2) => nmm2 / 32.5,
    
    // RUGOSITÀ SUPERFICIALE
    'Ra-Rz': (ra) => ra * 4, // Approssimazione Ra->Rz
    'Rz-Ra': (rz) => rz / 4,
    'Ra-RMS': (ra) => ra * 1.11,
    'RMS-Ra': (rms) => rms / 1.11,
    'Ra-μin': (ra) => ra * 39.37,
    'μin-Ra': (uin) => uin / 39.37,
    
    // TOLLERANZE ISO
    'H7-h6': (h7) => h7 * 0.6, // Rapporto tolleranze
    'h6-H7': (h6) => h6 / 0.6,
    'IT-mil': (it) => it * 0.0394, // μm to mil
    'mil-IT': (mil) => mil / 0.0394,
    
    // PRECISIONE
    'mm-in': (mm) => mm / 25.4,
    'in-mm': (inch) => inch * 25.4,
    'mm-mil': (mm) => mm * 39.37,
    'mil-mm': (mil) => mil / 39.37,
    'mm-μm': (mm) => mm * 1000,
    'μm-mm': (um) => um / 1000,
    'in-mil': (inch) => inch * 1000,
    'mil-in': (mil) => mil / 1000
  };

  useEffect(() => {
    // Aggiorna la data ogni minuto
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    // Carica dati iniziali
    loadUserNotes();
    loadUserWidgets();
    checkTelegramStatus();

    return () => clearInterval(timer);
  }, [user.username]);

  // Sincronizza note localStorage al server se necessario
  useEffect(() => {
    const syncLocalNotesToServer = async () => {
      try {
        const localNotes = localStorage.getItem(`notes_${user.username}`);
        
        if (localNotes && localNotes.trim()) {
          // Controlla se le note del server sono vuote
          const response = await fetch(`/api/users/${user.username}/notes`);
          if (response.ok) {
            const serverData = await response.json();
            const serverNotes = serverData.notes || '';
            
            // SOLO se il server è completamente vuoto, sincronizza le note locali
            if (!serverNotes || serverNotes.trim() === '') {
              console.log(`[DASHBOARD] Server vuoto, sincronizzando note locali per ${user.username}`);
              
              await fetch(`/api/users/${user.username}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: localNotes })
              });
            } else {
              // Se il server ha già note, usa quelle e pulisci localStorage obsoleto
              console.log(`[DASHBOARD] Usando note dal server e aggiornando localStorage`);
              localStorage.setItem(`notes_${user.username}`, serverNotes);
              setNotes(serverNotes);
              setSavedNotes(serverNotes);
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

  const loadUserWidgets = async () => {
    try {
      const response = await fetch(API_URLS.widgets(user.username));
      const data = await response.json();
      
      if (response.ok) {
        setWidgets(data.widgets || []);
        console.log(`[DASHBOARD] Widget caricati: ${data.widgets?.length || 0}`);
      }
    } catch (error) {
      console.error('Errore caricamento widget:', error);
    }
  };

  const addWidget = async (section) => {
    try {
      console.log('[DASHBOARD] Chiamata addWidget per:', section);
      const url = API_URLS.widgets(user.username);
      console.log('[DASHBOARD] URL chiamata:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section })
      });

      const data = await response.json();
      console.log('[DASHBOARD] Risposta server:', data);
      
      if (response.ok) {
        // Ricarica tutti i widget per essere sicuri
        await loadUserWidgets();
        console.log(`[DASHBOARD] Widget aggiunto con successo: ${section}`);
      } else if (data.error === 'Widget già presente') {
        console.log(`[DASHBOARD] Widget ${section} già presente`);
      } else {
        console.error('[DASHBOARD] Errore dal server:', data.error);
      }
    } catch (error) {
      console.error('[DASHBOARD] Errore aggiunta widget:', error);
    }
  };

  const removeWidget = async (widgetId) => {
    try {
      const response = await fetch(`${API_URLS.widgets(user.username)}/${widgetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
        console.log(`[DASHBOARD] Widget rimosso: ${widgetId}`);
      }
    } catch (error) {
      console.error('Errore rimozione widget:', error);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    try {
      const dataText = e.dataTransfer.getData('application/json');
      console.log('[DASHBOARD] Drop ricevuto, data:', dataText);
      
      if (!dataText) {
        console.error('[DASHBOARD] Nessun dato nel drop');
        return;
      }
      
      const dragData = JSON.parse(dataText);
      console.log('[DASHBOARD] Drag data parsed:', dragData);
      
      if (dragData.section) {
        console.log('[DASHBOARD] Aggiunta widget sezione:', dragData.section);
        await addWidget(dragData.section);
      } else {
        console.error('[DASHBOARD] Nessuna sezione nel dragData');
      }
    } catch (error) {
      console.error('[DASHBOARD] Errore drop widget:', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
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

  // Funzione per conversioni con logica personalizzata
  const handleConversion = (value) => {
    if (!value || value === '') {
      setConversion(prev => ({ ...prev, value: '', result: '' }));
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    try {
      let result;
      const conversionKey = `${conversion.fromUnit}-${conversion.toUnit}`;
      
      // Controlla se esiste conversione personalizzata
      if (customConversions[conversionKey]) {
        result = customConversions[conversionKey](numValue);
      } else {
        // Usa convert-units per conversioni standard
        result = convert(numValue).from(conversion.fromUnit).to(conversion.toUnit);
      }
      
      setConversion(prev => ({
        ...prev,
        value,
        result: result.toFixed(3)
      }));
    } catch (error) {
      console.error('Errore conversione:', error);
      setConversion(prev => ({
        ...prev,
        value,
        result: 'N/A'
      }));
    }
  };

  const handleUnitChange = (unitType, newUnit) => {
    setConversion(prev => ({
      ...prev,
      [unitType]: newUnit,
      value: '',
      result: ''
    }));
  };

  const handleCategoryChange = (newCategory) => {
    const categoryUnits = availableUnits[newCategory];
    setConversion({
      category: newCategory,
      fromUnit: categoryUnits[0],
      toUnit: categoryUnits[1] || categoryUnits[0],
      value: '',
      result: ''
    });
  };

  const swapUnits = () => {
    setConversion(prev => ({
      ...prev,
      fromUnit: prev.toUnit,
      toUnit: prev.fromUnit,
      value: prev.result || '',
      result: prev.value || ''
    }));
  };

  const clearConversion = () => {
    setConversion(prev => ({
      ...prev,
      value: '',
      result: ''
    }));
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>Buon lavoro, {user.nome || user.username}!</h2>
        <p>La tua dashboard personale - {formatTime(currentDate)}</p>
      </div>
      
      <div className="section-content">

      <div className="dashboard-grid">
        {/* Widget Area - Scorciatoie Personalizzate */}
        <div 
          className={`dashboard-card widgets-area-card ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <h2>📌 Widget Area</h2>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', marginBottom: 'var(--spacing-md)' }}>
            Trascina qui le sezioni dalla sidebar per creare scorciatoie
          </p>
          
          {widgets.length === 0 ? (
            <div className="widget-placeholder">
              <span style={{ fontSize: '3rem', opacity: 0.3 }}>📌</span>
              <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)', margin: '8px 0 0 0' }}>
                Nessun widget. Trascina una sezione qui!
              </p>
            </div>
          ) : (
            <div className="widgets-grid">
              {widgets.map(widget => {
                const sectionData = SECTIONS_MAP[widget.section] || { icon: '📌', label: widget.section, route: widget.section };
                return (
                  <div key={widget.id} className="widget-item">
                    <button
                      className="widget-button"
                      onClick={() => onNavigate && onNavigate(sectionData.route)}
                    >
                      <span className="widget-icon">{sectionData.icon}</span>
                      <span className="widget-label">{sectionData.label}</span>
                    </button>
                    <button
                      className="widget-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWidget(widget.id);
                      }}
                      title="Rimuovi widget"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversioni Tecniche */}
        <div className="dashboard-card conversions-card">
          <h2>⚙️ Conversioni</h2>
          <div className="conversions-container">
            
            <div className="category-selector">
              <label>Tipo conversione:</label>
              <select 
                className="category-select"
                value={conversion.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {Object.keys(availableUnits).map(cat => {
                  const labels = {
                    power: '⚡ Potenza (kW/CV/HP)',
                    pressure: '🔧 Pressione (bar/psi/MPa)',
                    torque: '🔩 Coppia (Nm/lbf-ft)',
                    thread: '🔗 Filettature (M/UNC/BSP)',
                    steel: '⚒️ Durezza Acciai (HRC/HB)',
                    flow: '🌊 Portata (l/min/gpm)',
                    surface: '📏 Rugosità (Ra/Rz/RMS)',
                    tolerance: '🎯 Tolleranze (H7/IT)',
                    angle: '📐 Angoli (deg/rad)',
                    precision: '🔍 Precisione (mm/in/μm)'
                  };
                  return (
                    <option key={cat} value={cat}>
                      {labels[cat] || cat}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="conversion-main">
              <div className="input-group">
                <input
                  type="number"
                  placeholder="Inserisci valore"
                  value={conversion.value}
                  onChange={(e) => handleConversion(e.target.value)}
                  className="main-input"
                />
                <select 
                  className="unit-select-large"
                  value={conversion.fromUnit}
                  onChange={(e) => handleUnitChange('fromUnit', e.target.value)}
                >
                  {availableUnits[conversion.category]?.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <button 
                className="swap-btn-large"
                onClick={swapUnits}
                title="Inverti unità"
              >
                ⇅
              </button>

              <div className="result-group">
                <div className="result-display">
                  {conversion.result || '0'}
                </div>
                <select 
                  className="unit-select-large"
                  value={conversion.toUnit}
                  onChange={(e) => handleUnitChange('toUnit', e.target.value)}
                >
                  {availableUnits[conversion.category]?.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>

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
    </div>
  );
};

export default PersonalDashboard;