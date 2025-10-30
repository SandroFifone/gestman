import React, { useState, useEffect } from "react";

const FormScadenzaDinamica = ({ scadenza, username, onClose, onCompleted }) => {
  const [formData, setFormData] = useState({});
  const [checklist, setChecklist] = useState([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Funzione per formattare la data da ISO a formato italiano
  const formatDataScadenza = (dataISO) => {
    if (!dataISO) return '';
    try {
      const date = new Date(dataISO);
      return date.toLocaleDateString('it-IT');
    } catch (error) {
      return dataISO; // Fallback al formato originale se c'è errore
    }
  };

  useEffect(() => {
    if (scadenza.is_gruppo) {
      // Per i gruppi, usa i dati già caricati
      caricaFormGruppo();
    } else {
      // Per le scadenze singole, carica dal server
      caricaFormScadenza();
    }
  }, [scadenza.id || scadenza.is_gruppo]);

  const caricaFormGruppo = () => {
    try {
      setLoading(true);
      
      // Per i gruppi, creiamo una checklist combinata da tutte le scadenze
      const checklistCombinata = scadenza.scadenze.map(scad => ({
        id: scad.id,
        codice: `scadenza_${scad.id}`,
        voce: scad.nome_voce,  // Usa 'voce' per essere coerente con il rendering
        descrizione: scad.descrizione,
        tipo_campo: 'select',
        opzioni: ['eseguito', 'non_eseguito', 'da_riprogrammare'],
        frequenza_tipo: scad.frequenza_tipo
      }));
      
      setChecklist(checklistCombinata);
      
      // Inizializza form con valori predefiniti
      const initialForm = {};
      checklistCombinata.forEach(item => {
        initialForm[item.codice] = "eseguito";
      });
      setFormData(initialForm);
      
    } catch (err) {
      setError("Errore nel caricamento del form gruppo");
    } finally {
      setLoading(false);
    }
  };

  const caricaFormScadenza = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/calendario/form-scadenza/${scadenza.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setChecklist(data.checklist || []);
        // Inizializza form con valori predefiniti
        const initialForm = {};
        data.checklist.forEach(item => {
          initialForm[item.codice] = "eseguito";
        });
        setFormData(initialForm);
      } else {
        setError(data.error || "Errore nel caricamento del form");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (codice, valore) => {
    setFormData(prev => ({
      ...prev,
      [codice]: valore
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !username.trim()) {
      alert("Operatore obbligatorio. Effettua il login.");
      return;
    }

    // Conferma se ci sono note
    if (note.trim()) {
      const conferma = window.confirm("Attenzione: sono presenti note! Questo genererà un alert di non conformità. Vuoi continuare?");
      if (!conferma) return;
    }

    try {
      setSaving(true);
      
      // Prepara i risultati della checklist
      const checklistRisultati = checklist.map(item => ({
        codice: item.codice,
        esito: formData[item.codice] || "eseguito",
        note: ""
      }));

      let payload;
      let endpoint;

      if (scadenza.is_gruppo) {
        // Per i gruppi, invia tutte le scadenze
        payload = {
          is_gruppo: true,
          scadenze: scadenza.scadenze.map(scad => ({
            scadenza_id: scad.id,
            esito: formData[`scadenza_${scad.id}`] || "eseguito"
          })),
          operatore: username,
          note: note,
          checklist: checklistRisultati
        };
        endpoint = "/api/calendario/completa-gruppo";
      } else {
        // Per le scadenze singole
        payload = {
          scadenza_id: scadenza.id,
          operatore: username,
          note: note,
          checklist: checklistRisultati
        };
        endpoint = "/api/calendario/completa-scadenza";
      }

      console.log(`[FORM SCADENZA] Invio dati a ${endpoint}:`, payload);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        alert("Manutenzione completata con successo!");
        onCompleted();
      } else {
        alert(result.error || "Errore nel completamento");
      }

    } catch (err) {
      alert("Errore di comunicazione: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          Caricamento form...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0', color: '#1a237e' }}>
              🔧 Evento Manutenzione - {scadenza.nome_gruppo || scadenza.nome_manutenzione}
            </h3>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {scadenza.civico} - {scadenza.asset} ({scadenza.asset_tipo})
              {scadenza.is_gruppo && (
                <span style={{ marginLeft: '10px', background: '#007bff', color: 'white', padding: '2px 6px', borderRadius: '12px', fontSize: '12px' }}>
                  {scadenza.num_scadenze} voci
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && (
            <div style={{
              background: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {error}
            </div>
          )}

          {/* Info Manutenzione */}
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #bbdefb',
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
              <div><strong>Data Scadenza:</strong> {formatDataScadenza(scadenza.data_scadenza)}</div>
              <div><strong>Operatore:</strong> {username}</div>
            </div>
            {scadenza.descrizione && (
              <div style={{ fontSize: '14px', color: '#6c757d', fontStyle: 'italic' }}>
                {scadenza.descrizione}
              </div>
            )}
          </div>

          {/* Checklist */}
          {checklist.length > 0 && (
            <div style={{
              border: '1px solid #e3eaf6',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              background: '#f9f9fc'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>
                ✅ Checklist Manutenzione
              </h4>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {checklist.map((item, idx) => (
                  <div 
                    key={item.codice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#fff',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px'
                    }}
                  >
                    <span style={{ flex: 1, fontSize: '14px' }}>
                      <strong>{idx + 1}.</strong> {item.voce}
                      {item.obbligatoria && (
                        <span style={{ color: '#dc3545', marginLeft: '5px' }}>*</span>
                      )}
                    </span>
                    <select 
                      key={item.codice + '_select'}
                      value={formData[item.codice] || "eseguito"}
                      onChange={e => handleChecklistChange(item.codice, e.target.value)}
                      style={{ 
                        minWidth: '130px',
                        padding: '6px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px'
                      }}
                    >
                      <option key="eseguito" value="eseguito">✅ Eseguito</option>
                      <option key="non_eseguito" value="non_eseguito">❌ Non eseguito</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '500',
              color: '#495057'
            }}>
              📝 Note aggiuntive 
              <span style={{ color: '#dc3545', fontSize: '0.9em', marginLeft: '5px' }}>
                (se compilato genererà alert)
              </span>
            </label>
            <textarea 
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                resize: 'vertical',
                fontSize: '14px'
              }}
              placeholder="Annotare eventuali problemi, anomalie o osservazioni particolari..."
            />
          </div>

          {/* Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid #e9ecef'
          }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Annulla
            </button>
            <button 
              type="submit"
              disabled={saving}
              style={{
                background: saving ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {saving ? '⏳ Salvando...' : '✅ Esegui evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormScadenzaDinamica;
