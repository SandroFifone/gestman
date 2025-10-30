import React, { useState } from "react";

// Voci specifiche per manutenzione programmata frese
const programmatoFreseFields = [
  { key: 'ingrassaggio_asse_b', label: 'Ingrassaggio asse B' },
  { key: 'controllo_pulizia_canali_ventilazione_motori', label: 'Controllo e pulizia canali di ventilazione Motori' },
  { key: 'smontaggio_pulizia_evacuatore_trucioli', label: 'Smontaggio e pulizia evacuatore trucioli' },
  { key: 'pulizia_vasca_refrigerante', label: 'Pulizia vasca refrigerante' },
  { key: 'controllo_filtro_lubrorefrigerante', label: 'Controllo filtro lubrorefrigerante' },
  { key: 'controllo_stato_connettori_cavi', label: 'Controllo stato connettori e cavi' },
  { key: 'rumori_vibrazioni_viti_sfere_assi', label: 'Rumori e vibrazioni viti a sfere assi' },
  { key: 'rumori_vibrazioni_temperature_motori', label: 'Rumori vibrazioni e temperature motori' },
  { key: 'livellamento_macchina', label: 'Livellamento macchina' },
  { key: 'verifica_cono_mandrino_presa_utensile', label: 'Verifica cono mandrino e presa utensile' },
  { key: 'controllo_utenze_idrauliche_pneumatiche', label: 'Controllo utenze idrauliche e pneumatiche' },
  { key: 'perpendicolarita_mandrino', label: 'Perpendicolarità mandrino' },
  { key: 'verifica_lubrificazione_guide', label: 'Verifica lubrificazione guide' },
  { key: 'sostituzione_olio_centraline_idrauliche', label: 'Sostituzione olio centraline idrauliche' },
  { key: 'pulizia_viti_sfere_assi', label: 'Pulizia viti a sfere assi' },
  { key: 'pulizia_guide_assi', label: 'Pulizia guide assi' },
  { key: 'controllo_cinghie_assi_mandrino', label: 'Controllo cinghie assi e mandrino' },
  { key: 'sostituzione_liquido_refrigerante_testa', label: 'Sostituzione liquido refrigerante testa' }
];

const ProgrammatoForm = ({ onSubmit, username, selectedAssetTipo }) => {
  const [form, setForm] = useState(() => {
    const initial = {
      data_intervento: "",
      operatore: username || "",
      asset_tipo: selectedAssetTipo || "",
      tipologia_manutenzione: "",
      descrizione_intervento: "",
      stato_completamento: "completato",
      note: ""
    };
    
    // Aggiungi i campi checklist solo per le frese
    if (selectedAssetTipo === 'Frese') {
      programmatoFreseFields.forEach(field => {
        initial[field.key] = "eseguito";
      });
    }
    
    return initial;
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    // Validation
    if (!form.data_intervento || !form.tipologia_manutenzione || !form.descrizione_intervento) {
      setError("Campi obbligatori: Data intervento, Tipologia manutenzione, Descrizione intervento");
      setLoading(false);
      return;
    }

    // Alert se ci sono note (come per form ordinario)
    if (form.note.trim()) {
      const conferma = window.confirm("Attenzione: sono presenti note! Questo genererà un alert di non conformità. Vuoi continuare?");
      if (!conferma) {
        setLoading(false);
        return;
      }
    }

    try {
      if (onSubmit) await onSubmit(form);
      setSuccess("Manutenzione programmata salvata con successo!");
      // Reset solo alcuni campi, mantieni i dati base
      setForm(prev => ({ 
        ...prev, 
        tipologia_manutenzione: "", 
        descrizione_intervento: "", 
        note: "" 
      }));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {success && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '12px', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
          {success}
        </div>
      )}
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '4px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <label>Data intervento*</label>
          <input 
            type="date" 
            required 
            value={form.data_intervento} 
            onChange={e => handleChange('data_intervento', e.target.value)} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Operatore*</label>
          <input 
            type="text" 
            required 
            value={form.operatore} 
            onChange={e => handleChange('operatore', e.target.value)}
            placeholder="Nome operatore"
          />
        </div>
      </div>

      <div style={{ border: '1px solid #e3eaf6', borderRadius: 8, padding: 16, background: '#f9f9fc' }}>
        <h4 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>Dettagli Manutenzione Programmata</h4>
        
        {/* Checklist specifica per Frese */}
        {selectedAssetTipo === 'Frese' && (
          <div style={{ marginBottom: 20 }}>
            <h5 style={{ margin: '0 0 12px 0', color: '#1a237e' }}>Checklist Manutenzione Programmata Frese</h5>
            <div style={{ display: 'grid', gap: 8 }}>
              {programmatoFreseFields.map((field, idx) => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                  <span style={{ flex: 1, fontSize: '14px' }}>{field.label}</span>
                  <select 
                    value={form[field.key] || "eseguito"} 
                    onChange={e => handleChange(field.key, e.target.value)}
                    style={{ minWidth: 120 }}
                  >
                    <option value="eseguito">Eseguito</option>
                    <option value="non_eseguito">Non eseguito</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label>Tipologia Manutenzione*</label>
            <input 
              type="text" 
              required 
              value={form.tipologia_manutenzione} 
              onChange={e => handleChange('tipologia_manutenzione', e.target.value)}
              placeholder="Es: Manutenzione preventiva, Sostituzione componenti, ecc."
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Stato Completamento*</label>
            <select 
              value={form.stato_completamento} 
              onChange={e => handleChange('stato_completamento', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="completato">Completato</option>
              <option value="parziale">Parziale</option>
              <option value="con_problemi">Con problemi</option>
              <option value="non_completato">Non completato</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Descrizione Intervento*</label>
          <textarea 
            required
            value={form.descrizione_intervento} 
            onChange={e => handleChange('descrizione_intervento', e.target.value)}
            placeholder="Descrivere in dettaglio l'intervento effettuato..."
            style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
          />
        </div>
      </div>

      <div>
        <label>Note aggiuntive <span style={{ color: '#dc3545', fontSize: '0.9em' }}>(se compilato genererà alert)</span></label>
        <textarea 
          value={form.note} 
          onChange={e => handleChange('note', e.target.value)} 
          rows={3} 
          style={{ width: '100%' }}
          placeholder="Annotare eventuali problemi, anomalie o osservazioni particolari..."
        />
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button 
          type="submit" 
          disabled={loading}
          style={{
            background: loading ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500'
          }}
        >
          {loading ? 'Salvataggio...' : 'Salva Manutenzione'}
        </button>
      </div>
    </form>
  );
};

export default ProgrammatoForm;
