import React, { useState } from 'react';

const TemplateManager = ({ templates, currentTemplate, onSave, onLoad, onNew, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('save'); // 'save' | 'load'
  const [templateName, setTemplateName] = useState('');

  const handleDelete = async (templateId, e) => {
    e.stopPropagation(); // Evita il click sulla card
    
    if (!confirm('Sei sicuro di voler eliminare questo template?')) {
      return;
    }

    await onDelete(templateId);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Inserisci un nome per il template');
      return;
    }

    const success = await onSave(templateName);
    if (success) {
      setShowModal(false);
      setTemplateName('');
    }
  };

  return (
    <>
      <div className="template-manager-buttons">
        <button 
          onClick={() => {
            setModalMode('save');
            setShowModal(true);
          }}
          className="btn-save-template"
        >
          💾 Salva Template
        </button>
        
        <button 
          onClick={() => {
            setModalMode('load');
            setShowModal(true);
          }}
          className="btn-load-template"
        >
          📂 Carica Template
        </button>

        <button onClick={onNew} className="btn-new">
          📄 Nuovo
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'save' ? '💾 Salva Template' : '📂 Carica Template'}</h3>
              <button onClick={() => setShowModal(false)} className="modal-close">✕</button>
            </div>

            <div className="modal-body">
              {modalMode === 'save' ? (
                <div className="save-template-form">
                  <label>Nome Template:</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Es: Report Mensile Asset"
                    autoFocus
                  />

                  <div className="form-actions">
                    <button onClick={handleSave} className="btn-primary">
                      Salva
                    </button>
                    <button onClick={() => setShowModal(false)} className="btn-secondary">
                      Annulla
                    </button>
                  </div>
                </div>
              ) : (
                <div className="load-template-list">
                  {templates.length === 0 ? (
                    <div className="no-templates">
                      <p>Nessun template salvato</p>
                    </div>
                  ) : (
                    <div className="templates-grid">
                      {templates.map(template => (
                        <div 
                          key={template.id} 
                          className={`template-card ${currentTemplate?.id === template.id ? 'active' : ''}`}
                          onClick={() => {
                            onLoad(template);
                            setShowModal(false);
                          }}
                        >
                          <button 
                            className="template-delete-btn"
                            onClick={(e) => handleDelete(template.id, e)}
                            title="Elimina template"
                          >
                            🗑️
                          </button>
                          <div className="template-name">{template.name}</div>
                          <div className="template-meta">
                            <span>📝 {template.blocks?.length || 0} blocchi</span>
                            <span>👤 {template.created_by}</span>
                          </div>
                          {template.shared && <span className="template-shared">🔗 Condiviso</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TemplateManager;
