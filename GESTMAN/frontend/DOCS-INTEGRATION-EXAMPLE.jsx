// Esempio di modifica a Docs.jsx per integrare DocumentHistory

// 1. Import del nuovo componente
import DocumentHistory from './DocumentHistory';

// 2. Aggiungere stato per la tab attiva (se non già presente)
const [activeView, setActiveView] = useState('builder'); // 'builder' o 'history'

// 3. Aggiungere pulsanti di navigazione nell'header
<div className="docs-header">
  <h1>Documentazione Dinamica</h1>
  <div className="docs-nav">
    <button 
      className={`btn ${activeView === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setActiveView('builder')}
    >
      📝 Crea Documento
    </button>
    <button 
      className={`btn ${activeView === 'history' ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => setActiveView('history')}
    >
      📚 Storico
    </button>
  </div>
</div>

// 4. Render condizionale del contenuto
<div className="docs-content">
  {activeView === 'builder' ? (
    <DocumentBuilder 
      databases={databases}
      onGenerate={handleGenerateDocument}
      currentUser={currentUser}
    />
  ) : (
    <DocumentHistory 
      currentUser={currentUser}
    />
  )}
</div>

// 5. Modificare la funzione di generazione documento per includere metadati
const handleGenerateDocument = async (blocks, variables, metadata) => {
  try {
    setLoading(true);
    
    const response = await fetch(`${API_URLS.DOCS}/generate-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        blocks,
        variables,
        generated_by: currentUser.username, // IMPORTANTE: username corrente
        metadata: {
          title: metadata.documentTitle || 'Documento',
          civico_numero: metadata.civico,
          asset_id: metadata.asset,
          periodo_inizio: metadata.startDate,
          periodo_fine: metadata.endDate,
          related_type: metadata.relatedType || 'manual',
          related_ids: metadata.relatedIds || [],
          template_id: metadata.templateId,
          notes: metadata.notes,
          extra_params: metadata.extraParams || {}
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Errore generazione documento');
    }
    
    // Scarica il PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documento_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    alert('✓ Documento generato e salvato nello storico!');
    
    // Cambia alla vista storico
    setActiveView('history');
    
  } catch (error) {
    console.error('Errore:', error);
    alert(`Errore generazione documento: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// 6. Opzionale: Modale per raccogliere metadati prima della generazione
const [showMetadataModal, setShowMetadataModal] = useState(false);
const [pendingGeneration, setPendingGeneration] = useState(null);

const handleGenerateClick = (blocks, variables) => {
  // Salva i dati temporaneamente
  setPendingGeneration({ blocks, variables });
  // Mostra modale per metadati
  setShowMetadataModal(true);
};

const handleMetadataSubmit = (metadata) => {
  if (pendingGeneration) {
    handleGenerateDocument(
      pendingGeneration.blocks,
      pendingGeneration.variables,
      metadata
    );
  }
  setShowMetadataModal(false);
  setPendingGeneration(null);
};

// 7. Componente Modale Metadati (opzionale)
const MetadataModal = ({ show, onClose, onSubmit, currentUser }) => {
  const [metadata, setMetadata] = useState({
    documentTitle: '',
    civico: '',
    asset: '',
    startDate: '',
    endDate: '',
    relatedType: 'manual',
    notes: ''
  });
  
  if (!show) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Metadati Documento</h3>
        
        <div className="form-group">
          <label>Titolo Documento *</label>
          <input
            type="text"
            value={metadata.documentTitle}
            onChange={(e) => setMetadata({...metadata, documentTitle: e.target.value})}
            placeholder="es. Rapporto Mensile Marzo 2026"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Civico</label>
          <input
            type="text"
            value={metadata.civico}
            onChange={(e) => setMetadata({...metadata, civico: e.target.value})}
            placeholder="es. 001"
          />
        </div>
        
        <div className="form-group">
          <label>Asset ID</label>
          <input
            type="text"
            value={metadata.asset}
            onChange={(e) => setMetadata({...metadata, asset: e.target.value})}
            placeholder="es. FRE-001"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Periodo Inizio</label>
            <input
              type="date"
              value={metadata.startDate}
              onChange={(e) => setMetadata({...metadata, startDate: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Periodo Fine</label>
            <input
              type="date"
              value={metadata.endDate}
              onChange={(e) => setMetadata({...metadata, endDate: e.target.value})}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Tipo Documento</label>
          <select
            value={metadata.relatedType}
            onChange={(e) => setMetadata({...metadata, relatedType: e.target.value})}
          >
            <option value="manual">Manuale</option>
            <option value="submission">Compilazione</option>
            <option value="scadenza">Scadenza</option>
            <option value="alert">Alert</option>
            <option value="multi">Multiplo</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Note</label>
          <textarea
            value={metadata.notes}
            onChange={(e) => setMetadata({...metadata, notes: e.target.value})}
            placeholder="Note o commenti opzionali"
            rows="3"
          />
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            Annulla
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => onSubmit(metadata)}
            disabled={!metadata.documentTitle}
          >
            Genera Documento
          </button>
        </div>
      </div>
    </div>
  );
};

// 8. CSS per modale (opzionale)
/*
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
*/
