import React from 'react';
import './CustomModal.css';

const CustomModal = ({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info', // 'info', 'confirm', 'error', 'success'
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Annulla',
  showCancel = false
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose && onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm && onConfirm();
    onClose && onClose();
  };

  const handleCancel = () => {
    onCancel && onCancel();
    onClose && onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'confirm': return '❓';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getModalClass = () => {
    return `custom-modal-content ${type}`;
  };

  return (
    <div className="custom-modal-overlay" onClick={handleBackdropClick}>
      <div className={getModalClass()}>
        <div className="custom-modal-header">
          <div className="custom-modal-icon">
            {getIcon()}
          </div>
          <h3 className="custom-modal-title">
            {title || (type === 'confirm' ? 'Conferma' : 'Informazione')}
          </h3>
          <button 
            className="custom-modal-close" 
            onClick={onClose}
            title="Chiudi"
          >
            ✕
          </button>
        </div>
        
        <div className="custom-modal-body">
          {typeof message === 'string' ? (
            <p>{message}</p>
          ) : (
            message
          )}
        </div>
        
        <div className="custom-modal-footer">
          {type === 'confirm' || showCancel ? (
            <>
              <button 
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                {cancelText}
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleConfirm}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
