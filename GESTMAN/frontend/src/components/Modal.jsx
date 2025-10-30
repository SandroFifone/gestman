import React from "react";
import "./Modal.css";

const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  
  const handleKeyDown = (e) => {
    // Se l'evento viene da una textarea, non fare nulla
    if (e.target.tagName === 'TEXTAREA' && e.key === 'Enter') {
      return; // Lascia che la textarea gestisca l'Enter normalmente
    }
    
    // Solo per altri elementi, gestisci Escape
    if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex="-1"
      >
        {title && (
          <div className="modal-header">
            <div className="modal-title">{title}</div>
            <button className="modal-close-btn" onClick={onClose} aria-label="Chiudi">
              ✕
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
