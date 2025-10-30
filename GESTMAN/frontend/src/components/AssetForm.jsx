import React, { useState, useEffect } from "react";
import { API_URLS } from '../config/api';

// Form dinamico per asset, con supporto a lista consumabili e upload documentazione tecnica
const AssetForm = ({ tipo, fields = [], fieldsMetadata = {}, initialData, onSubmit, onCancel }) => {
  const safeInitial = initialData && typeof initialData === 'object' ? initialData : {};
  const [form, setForm] = useState(() => {
    const base = {};
    fields.forEach(f => {
      if (f.toLowerCase().includes("consumabili")) base[f] = safeInitial[f] || [];
      else if (f.toLowerCase().includes("documentazione tecnica")) base[f] = safeInitial[f] || null;
      else base[f] = safeInitial[f] || "";
    });
    return base;
  });
  const [consumabile, setConsumabile] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [rubricaContacts, setRubricaContacts] = useState([]);

  // Carica i contatti della rubrica quando il componente si monta
  useEffect(() => {
    loadRubricaContacts();
  }, []);

  const loadRubricaContacts = async () => {
    try {
      console.log('Loading rubrica contacts from:', API_URLS.RUBRICA_CONTATTI); // Debug
      const response = await fetch(API_URLS.RUBRICA_CONTATTI);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded contacts data:', data); // Debug
        
        // L'API restituisce { contatti: [...] }, estraiamo l'array
        const contacts = data.contatti || data;
        
        // Assicurati che sia un array
        if (Array.isArray(contacts)) {
          console.log('Setting contacts:', contacts); // Debug
          setRubricaContacts(contacts);
        } else {
          console.error('Contacts response is not an array:', contacts);
          setRubricaContacts([]);
        }
      } else {
        console.error('Failed to load contacts:', response.status, response.statusText);
        setRubricaContacts([]);
      }
    } catch (error) {
      console.error('Errore caricamento contatti rubrica:', error);
      setRubricaContacts([]);
    }
  };

  const handleChange = (e, field) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleAddConsumabile = () => {
    if (consumabile.trim()) {
      setForm({ ...form, [getConsumabiliField()]: [...(form[getConsumabiliField()] || []), consumabile.trim()] });
      setConsumabile("");
    }
  };

  const handleRemoveConsumabile = idx => {
    const arr = [...(form[getConsumabiliField()] || [])];
    arr.splice(idx, 1);
    setForm({ ...form, [getConsumabiliField()]: arr });
  };

  const handleDocChange = e => {
    setDocFile(e.target.files[0]);
    setForm({ ...form, [getDocField()]: e.target.files[0]?.name || null });
  };

  const getConsumabiliField = () => fields.find(f => f.toLowerCase().includes("consumabili"));
  const getDocField = () => fields.find(f => f.toLowerCase().includes("documentazione tecnica"));

  const handleSubmit = e => {
    e.preventDefault();
    // onSubmit riceve form e docFile (se presente)
    onSubmit({ ...form }, docFile);
  };

  return (
    <form className="asset-form" onSubmit={handleSubmit} style={{ maxWidth: 650, margin: '0 auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 12
      }}>
        {fields.map((field, idx) => {
          if (field.toLowerCase().includes("consumabili")) {
            return (
              <div key={field} style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label><b>{field}</b></label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input value={consumabile} onChange={e => setConsumabile(e.target.value)} placeholder="Aggiungi consumabile" />
                  <button type="button" onClick={handleAddConsumabile}>Aggiungi</button>
                </div>
                <ul style={{ paddingLeft: 20 }}>
                  {(form[field] || []).map((c, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {c}
                      <button type="button" onClick={() => handleRemoveConsumabile(idx)} style={{ color: "red" }}>x</button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          }
          if (field.toLowerCase().includes("documentazione tecnica")) {
            return (
              <div key={field} style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                <label><b>{field}</b></label><br />
                <input type="file" accept="application/pdf" onChange={handleDocChange} />
                {form[field] && <span style={{ marginLeft: 8 }}>{form[field]}</span>}
              </div>
            );
          }
          
          // Ottieni i metadati del campo per determinare il tipo
          const fieldMetadata = fieldsMetadata[field] || {};
          const fieldType = fieldMetadata.type;
          
          // Campo select con opzioni personalizzate
          if (fieldType === 'select' && fieldMetadata.options && Array.isArray(fieldMetadata.options)) {
            return (
              <div key={field}>
                <label><b>{field}</b></label><br />
                <select 
                  value={form[field]} 
                  onChange={e => handleChange(e, field)} 
                  style={{ width: '100%' }}
                >
                  <option value="">Seleziona un'opzione...</option>
                  {fieldMetadata.options.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          
          // Campo rubrica - select con contatti
          if (fieldType === 'select_rubrica') {
            console.log('Rendering select_rubrica field, contacts:', rubricaContacts); // Debug
            return (
              <div key={field}>
                <label><b>{field}</b></label><br />
                <select 
                  value={form[field]} 
                  onChange={e => handleChange(e, field)} 
                  style={{ width: '100%' }}
                >
                  <option value="">Seleziona contatto...</option>
                  {Array.isArray(rubricaContacts) && rubricaContacts.map((contact) => (
                    <option key={contact.id} value={contact.nome}>
                      {contact.nome} ({contact.categoria_nome}) - {contact.email || contact.telefono}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          
          // Campo elenco puntato
          if (fieldType === 'list') {
            const listValue = form[field] ? form[field].split(';').join('\n') : '';
            return (
              <div key={field}>
                <label><b>{field}</b></label><br />
                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                  <textarea
                    value={listValue}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\n/g, ';');
                      handleChange({ target: { value } }, field);
                    }}
                    placeholder="Inserisci ogni elemento su una riga separata"
                    rows="4"
                    style={{ 
                      flex: 1, 
                      backgroundColor: '#f0f8ff',
                      borderLeft: '4px solid #2196f3',
                      padding: '10px',
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ 
                    flex: 1, 
                    backgroundColor: '#f9f9f9', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    padding: '10px',
                    minHeight: '120px'
                  }}>
                    <strong style={{ color: '#2196f3' }}>Anteprima:</strong>
                    <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px' }}>
                      {form[field] && form[field].split(';').filter(item => item.trim()).map((item, index) => (
                        <li key={index} style={{ marginBottom: '3px' }}>{item.trim()}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          }
          
          // Campo area di testo
          if (fieldType === 'textarea') {
            return (
              <div key={field}>
                <label><b>{field}</b></label><br />
                <textarea 
                  value={form[field] || ''} 
                  onChange={e => handleChange(e, field)} 
                  style={{ width: '100%', minHeight: '80px' }}
                  rows="3"
                />
              </div>
            );
          }
          
          // Campo normale
          return (
            <div key={field}>
              <label><b>{field}</b></label><br />
              <input value={form[field]} onChange={e => handleChange(e, field)} style={{ width: '100%' }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
        <button type="submit">Salva</button>
        {onCancel && <button type="button" onClick={onCancel}>Annulla</button>}
      </div>
    </form>
  );
};

export default AssetForm;
