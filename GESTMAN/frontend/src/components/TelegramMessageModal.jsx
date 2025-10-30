import React from 'react';
import './TelegramMessageModal.css';

const TelegramMessageModal = ({ message, isOpen, onClose }) => {
  if (!isOpen || !message) return null;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ticket':
        return '🎫';
      case 'scadenza':
        return '⏰';
      case 'non_conformita':
        return '🚨';
      default:
        return '📢';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ticket':
        return 'Ticket';
      case 'scadenza':
        return 'Scadenza';
      case 'non_conformita':
        return 'Non Conformità';
      default:
        return 'Alert';
    }
  };

  return (
    <div className="telegram-modal-overlay" onClick={onClose}>
      <div className="telegram-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="telegram-modal-header">
          <div className="telegram-modal-title">
            <span className="message-type-icon">{getTypeIcon(message.type)}</span>
            <span>Messaggio Telegram - {getTypeLabel(message.type)}</span>
          </div>
          <button className="telegram-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="telegram-modal-body">
          <div className="message-timestamp">
            📅 {formatTime(message.timestamp)}
          </div>
          
          <div className={`message-full-content ${message.type}`}>
            {/* Preserva le interruzioni di riga nel messaggio */}
            {message.message.split('\n').map((line, index) => (
              <div key={index} className="message-line">
                {line || <br />}
              </div>
            ))}
          </div>
        </div>
        
        <div className="telegram-modal-footer">
          <button 
            className="telegram-modal-button telegram-modal-button-primary"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default TelegramMessageModal;