import { useState } from 'react';

export const useCustomModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Annulla',
    showCancel: false
  });

  const showAlert = (message, title = 'Informazione', type = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: null,
      onCancel: null,
      confirmText: 'OK',
      cancelText: 'Annulla',
      showCancel: false
    });
  };

  const showConfirm = (
    message, 
    onConfirm, 
    onCancel = null, 
    title = 'Conferma',
    confirmText = 'Conferma',
    cancelText = 'Annulla'
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      showCancel: true
    });
  };

  const showError = (message, title = 'Errore') => {
    showAlert(message, title, 'error');
  };

  const showSuccess = (message, title = 'Successo') => {
    showAlert(message, title, 'success');
  };

  const showWarning = (message, title = 'Attenzione') => {
    showAlert(message, title, 'warning');
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    modalState,
    showAlert,
    showConfirm,
    showError,
    showSuccess,
    showWarning,
    closeModal
  };
};
