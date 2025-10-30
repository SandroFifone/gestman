import React, { useState, useEffect } from "react";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import FormScadenzaDinamica from "./FormScadenzaDinamica";

const CalendarioCompleto = ({ username, sidebarOpen }) => {
  const [activeTab, setActiveTab] = useState('scadenze');
  const [scadenze, setScadenze] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedScadenza, setSelectedScadenza] = useState(null);
  const [message, setMessage] = useState("");

  // Stati per filtri scadenze
  const [filtroRangeGiorni, setFiltroRangeGiorni] = useState(60); // 60 giorni default, 0 = tutte
  const [filtroCivico, setFiltroCivico] = useState('');
  const [filtroAssetType, setFiltroAssetType] = useState('');
  const [filtroAssetSpecifico, setFiltroAssetSpecifico] = useState('');
  const [scadenzeComplete, setScadenzeComplete] = useState([]); // Tutte le scadenze senza filtri
  const [scadenzeFiltrate, setScadenzeFiltrate] = useState([]); // Scadenze dopo i filtri
  const [assetsForFilterData, setAssetsForFilterData] = useState([]); // Assets per i filtri

  // Stati per gestione voci checklist - RIMOSSI - ora gestiti in FormTemplateManager

  // Stati per nuova scadenza
  const [showAddScadenzaModal, setShowAddScadenzaModal] = useState(false);
  const [selectedCivico, setSelectedCivico] = useState('');
  const [selectedAssetTypeForScadenza, setSelectedAssetTypeForScadenza] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [civici, setCivici] = useState([]);
  const [assetsForScadenza, setAssetsForScadenza] = useState([]);
  const [checklistForScadenza, setChecklistForScadenza] = useState([]);
  const [scadenzaData, setScadenzaData] = useState({});
  const [newScadenza, setNewScadenza] = useState({
    checklist_voce_id: '',
    civico: '',
    asset: '',
    asset_tipo: '',
    data_scadenza: '',
    frequenza_tipo: '',
    giorni_preavviso: 7
  });
  // Stati per la vista calendario
  const [vistaCalendario, setVistaCalendario] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  // Stati necessari per modal nuova scadenza
  const [tipologieForModal, setTipologieForModal] = useState([]);

  const tabs = [
    { key: 'scadenze', label: 'Scadenze Programmate', icon: '📅' }
  ];

  useEffect(() => {
    caricaDati();
    // Carica sempre civici e asset types per i filtri
    caricaCivici();
    caricaAssetTypes();
  }, [activeTab]);

  // Riapplica filtri quando cambiano
  useEffect(() => {
    if (scadenzeComplete.length > 0) {
      applicaFiltri();
    }
  }, [filtroRangeGiorni, filtroCivico, filtroAssetType, filtroAssetSpecifico]);

  const caricaDati = async () => {
    if (activeTab === 'scadenze') {
      await caricaScadenze();
      await caricaCivici();
      await caricaAssetTypes();
      // NON caricare tipologie automaticamente - solo quando si seleziona un tipo asset
      // NON generare automaticamente gli alert - lasciare solo il pulsante manuale
      // await generaAlertScadenze();
    }
  };

  const caricaScadenze = async () => {
    try {
      setLoading(true);
      // Usa l'endpoint raggruppato per mostrare scadenze accorpate
      const response = await fetch("/api/calendario/scadenze-raggruppate?stato=programmata");
      const data = await response.json();
      
      if (response.ok) {
        setScadenzeComplete(data.scadenze || []);
        applicaFiltri(data.scadenze || []);
      } else {
        setError(data.error || "Errore nel caricamento scadenze");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    } finally {
      setLoading(false);
    }
  };

  const generaAlertScadenze = async () => {
    try {
      const response = await fetch("/api/calendario/alert/genera-scadenze", {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message || "Alert scadenze generati con successo");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || "Errore nella generazione alert");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const applicaFiltri = (scadenzeBase = scadenzeComplete) => {
    let scadenzeFiltrate = [...scadenzeBase];

    // Filtro per range giorni
    if (filtroRangeGiorni > 0) {
      const oggi = new Date();
      const dataLimite = new Date();
      dataLimite.setDate(oggi.getDate() + filtroRangeGiorni);
      
      scadenzeFiltrate = scadenzeFiltrate.filter(scadenza => {
        const dataScadenza = parseItalianDate(scadenza.data_scadenza);
        return dataScadenza && dataScadenza <= dataLimite;
      });
    }

    // Filtro per civico
    if (filtroCivico) {
      scadenzeFiltrate = scadenzeFiltrate.filter(scadenza => 
        scadenza.civico === filtroCivico
      );
    }

    // Filtro per tipo asset
    if (filtroAssetType) {
      scadenzeFiltrate = scadenzeFiltrate.filter(scadenza => 
        scadenza.asset_tipo === filtroAssetType
      );
    }

    // Filtro per asset specifico
    if (filtroAssetSpecifico) {
      scadenzeFiltrate = scadenzeFiltrate.filter(scadenza => 
        scadenza.asset === filtroAssetSpecifico
      );
    }

    setScadenzeFiltrate(scadenzeFiltrate);
    setScadenze(scadenzeFiltrate); // Mantieni compatibilità con il resto del codice
  };

  // Funzioni per ottenere opzioni uniche dall'anagrafica reale
  const getCiviciUnici = () => {
    return civici.map(c => c.numero).sort();
  };

  const getAssetTypesUnici = () => {
    return assetTypes.sort();
  };

  const getAssetsSpecifici = () => {
    let assets = assetsForFilterData; // Usa i dati degli assets caricati per i filtri
    
    // Se non abbiamo assets caricati, restituisci array vuoto
    if (!assets || assets.length === 0) {
      return [];
    }
    
    const assetsUnici = [...new Set(assets.map(a => a.id_aziendale || a["Id Aziendale"]))];
    return assetsUnici.sort();
  };

  // Carica assets per i filtri
  const caricaAssetsPerFiltri = async () => {
    try {
      let url = "/api/assets";
      const params = new URLSearchParams();
      
      if (filtroCivico) {
        params.append('civico', filtroCivico);
      }
      if (filtroAssetType) {
        params.append('tipo', filtroAssetType);
      }
      
      if (params.toString()) {
        url += "?" + params.toString();
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setAssetsForFilterData(data.assets || []);
      }
    } catch (err) {
      console.error("Errore nel caricamento assets per filtri:", err);
    }
  };

  // Ricarica assets quando cambiano civico o tipo asset
  useEffect(() => {
    caricaAssetsPerFiltri();
  }, [filtroCivico, filtroAssetType]);

  const resetFiltri = () => {
    setFiltroRangeGiorni(60);
    setFiltroCivico('');
    setFiltroAssetType('');
    setFiltroAssetSpecifico('');
    setAssetsForFilterData([]); // Resetta anche gli assets caricati
  };

  const caricaAssetTypes = async () => {
    try {
      const response = await fetch("/api/calendario/manutenzioni/asset-types");
      const data = await response.json();
      
      if (response.ok) {
        setAssetTypes(data.asset_types || []);
      } else {
        setError(data.error || "Errore nel caricamento tipi asset");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const caricaCivici = async () => {
    try {
      const response = await fetch("/api/civici");
      const data = await response.json();
      
      if (response.ok) {
        setCivici(data.civici || []);
      } else {
        setError(data.error || "Errore nel caricamento civici");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const caricaAssets = async (civico, assetType) => {
    if (!civico || !assetType) {
      setAssetsForScadenza([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/assets?civico=${civico}&tipo=${assetType}`);
      const data = await response.json();
      
      if (response.ok) {
        setAssetsForScadenza(data.assets || []);
      } else {
        setError(data.error || "Errore nel caricamento assets");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const caricaChecklistPerScadenza = async (assetType) => {
    if (!assetType) {
      setChecklistForScadenza([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/calendario/manutenzioni/checklist-items/${assetType}`);
      const data = await response.json();
      
      if (response.ok) {
        setChecklistForScadenza(data.checklist_items || []);
      } else {
        setError(data.error || "Errore nel caricamento checklist");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  // Funzione per formattare la frequenza in modo leggibile
  const formatFrequenza = (tipologia) => {
    if (tipologia.frequenza_tipo && tipologia.frequenza_valore) {
      const tipo = tipologia.frequenza_tipo;
      const valore = tipologia.frequenza_valore;
      
      if (tipo === "settimanale") return `${valore} settimana${valore > 1 ? 'e' : ''}`;
      if (tipo === "mensile") return `${valore} mese${valore > 1 ? 'i' : ''}`;
      if (tipo === "bimestrale") return "2 mesi";
      if (tipo === "semestrale") return "6 mesi";
      if (tipo === "annuale") return "1 anno";
      if (tipo === "biennale") return "2 anni";
    }
    
    // Fallback al vecchio formato
    const mesi = tipologia.frequenza_mesi;
    if (mesi < 1) return "settimanale";
    if (mesi === 1) return "mensile";
    if (mesi === 2) return "bimestrale";
    if (mesi === 6) return "semestrale";
    if (mesi === 12) return "annuale";
    if (mesi === 24) return "biennale";
    return `${mesi} mesi`;
  };
  const caricaAssetsPerScadenza = async (civico = null) => {
    try {
      let url = "/api/assets";
      const params = new URLSearchParams();
      
      if (civico) {
        params.append('civico', civico);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setAssetsForScadenza(data.assets || []);
      }
    } catch (err) {
      console.error("Errore caricamento assets per scadenza:", err);
    }
  };

  // Funzione per caricare le tipologie di manutenzione in base al tipo asset (per modal nuova scadenza)
  const caricaTipologiePerTipoAsset = async (tipoAsset) => {
    try {
      const response = await fetch(`/api/calendario/manutenzioni/checklist-items/${encodeURIComponent(tipoAsset)}`);
      const data = await response.json();
      
      if (response.ok) {
        setTipologieForModal(data.checklist_items || []);
        console.log(`[DEBUG] Caricate ${data.checklist_items?.length || 0} tipologie per asset tipo: ${tipoAsset}`);
      } else {
        setTipologieForModal([]);
        console.log(`[DEBUG] Nessuna tipologia trovata per asset tipo: ${tipoAsset}`);
      }
    } catch (err) {
      setTipologieForModal([]);
      console.log(`[DEBUG] Errore nel caricamento tipologie per: ${tipoAsset}`, err);
    }
  };

  // Funzioni per gestire checklist items - RIMOSSE - ora gestite in FormTemplateManager

  const salvaScadenza = async () => {
    try {
      const response = await fetch("/api/calendario/scadenze", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScadenza)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage("Scadenza programmata con successo");
        setShowAddScadenzaModal(false);
        setNewScadenza({
          checklist_voce_id: '',
          civico: '',
          asset: '',
          asset_tipo: '',
          data_scadenza: '',
          frequenza_tipo: '',
          giorni_preavviso: 7
        });
        await caricaScadenze();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || "Errore nel salvataggio scadenza");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const getStatoColor = (scadenza) => {
    if (scadenza.scaduta) return "#dc3545"; // Rosso scaduto
    if (scadenza.urgente) return "#fd7e14"; // Arancione urgente
    return "#28a745"; // Verde normale
  };

  const getStatoText = (scadenza) => {
    if (scadenza.scaduta) return "SCADUTA";
    if (scadenza.urgente) return "URGENTE";
    return "IN PROGRAMMA";
  };

  // Funzione per parsare date in formato italiano DD/MM/YYYY
  const parseItalianDate = (dateString) => {
    if (!dateString) return null;
    
    // Se è già un formato ISO, usalo direttamente
    if (dateString.includes('-')) {
      return new Date(dateString);
    }
    
    // Parse formato italiano DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      // JavaScript Date constructor usa month-1 (0-11)
      return new Date(year, month - 1, day);
    }
    
    // Fallback: prova a parsare come stringa normale
    return new Date(dateString);
  };

  const apriFormScadenza = async (gruppo) => {
    try {
      // Usa sempre il form gruppo (anche per scadenze singole)
      console.log('Caricamento form per gruppo:', gruppo);
      
      // Prova prima con data_scadenza_formatted, poi con data_scadenza originale
      let dataPerUrl = gruppo.data_scadenza_formatted || gruppo.data_scadenza;
      
      // Se la data ha il formato ISO, convertila in formato italiano
      if (dataPerUrl && dataPerUrl.includes('T')) {
        const date = new Date(dataPerUrl);
        dataPerUrl = date.toLocaleDateString('it-IT');
      }
      
      const url = `/api/calendario/form-gruppo?civico=${encodeURIComponent(gruppo.civico)}&asset=${encodeURIComponent(gruppo.asset)}&data_scadenza=${encodeURIComponent(dataPerUrl)}`;
      console.log('URL chiamata:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('Risposta server:', responseText);
        const formData = JSON.parse(responseText);
        console.log('Form caricato:', formData);
        setSelectedScadenza(formData);
      } else {
        const responseText = await response.text();
        console.error('Errore server:', response.status, responseText);
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.error || 'Errore nel caricamento del form');
        } catch {
          setError(`Errore del server: ${response.status} - ${responseText}`);
        }
      }
    } catch (err) {
      console.error('Errore nella richiesta del form:', err);
      setError('Errore di comunicazione con il server');
    }
  };

  // Funzioni per la gestione calendario
  const getScadenzePerData = (data) => {
    if (!scadenze) return [];
    const dataString = data.toLocaleDateString('it-IT');
    return scadenze.filter(gruppo => {
      // Per i gruppi, usa data_scadenza_formatted se disponibile, altrimenti data_scadenza
      const dataGruppo = gruppo.data_scadenza_formatted || gruppo.data_scadenza;
      if (dataGruppo === dataString) return true;
      
      // Fallback: parse della data
      const scadenzaDate = parseItalianDate(dataGruppo);
      return scadenzaDate && scadenzaDate.toLocaleDateString('it-IT') === dataString;
    });
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const scadenzeDelGiorno = getScadenzePerData(date);
      if (scadenzeDelGiorno.length > 0) {
        const urgenti = scadenzeDelGiorno.filter(gruppo => {
          const oggi = new Date();
          // Usa giorni_rimanenti se disponibile, altrimenti calcola
          if (gruppo.giorni_rimanenti !== null && gruppo.giorni_rimanenti !== undefined) {
            return gruppo.giorni_rimanenti <= 7;
          }
          const dataScadenza = parseItalianDate(gruppo.data_scadenza_formatted || gruppo.data_scadenza);
          const giorniRimanenti = Math.ceil((dataScadenza - oggi) / (1000 * 60 * 60 * 24));
          return giorniRimanenti <= 7;
        }).length;
        
        const colore = urgenti > 0 ? '#dc3545' : '#007bff';
        
        return (
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{ 
              background: colore, 
              color: 'white', 
              borderRadius: '50%', 
              width: '18px', 
              height: '18px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '10px',
              fontWeight: 'bold',
              position: 'absolute',
              top: '2px',
              right: '2px',
              zIndex: 1
            }}>
              {scadenzeDelGiorno.length}
            </div>
            {scadenzeDelGiorno.length <= 2 && (
              <div style={{ 
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                right: '2px',
                fontSize: '8px',
                lineHeight: '1.1',
                color: '#333',
                maxHeight: '24px',
                overflow: 'hidden'
              }}>
                {scadenzeDelGiorno.slice(0, 2).map((gruppo, i) => (
                  <div key={i} style={{ 
                    background: 'rgba(255,255,255,0.9)', 
                    padding: '1px 2px', 
                    borderRadius: '2px',
                    marginBottom: '1px',
                    fontSize: '7px'
                  }}>
                    {gruppo.nome_gruppo?.substring(0, 15) || gruppo.nome_manutenzione?.substring(0, 15) || 'Manutenzione'}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const scadenzeDelGiorno = getScadenzePerData(date);
      if (scadenzeDelGiorno.length > 0) {
        const oggi = new Date();
        const urgenti = scadenzeDelGiorno.filter(gruppo => {
          // Usa giorni_rimanenti se disponibile, altrimenti calcola
          if (gruppo.giorni_rimanenti !== null && gruppo.giorni_rimanenti !== undefined) {
            return gruppo.giorni_rimanenti <= 7;
          }
          const dataScadenza = parseItalianDate(gruppo.data_scadenza_formatted || gruppo.data_scadenza);
          const giorniRimanenti = Math.ceil((dataScadenza - oggi) / (1000 * 60 * 60 * 24));
          return giorniRimanenti <= 7;
        }).length;
        
        return urgenti > 0 ? 'has-scadenze-urgenti' : 'has-scadenze';
      }
    }
    return null;
  };

  // Funzione per creare nuova scadenza
  const creaScadenza = async () => {
    if (!newScadenza.checklist_voce_id || !newScadenza.civico || !newScadenza.asset || !newScadenza.data_scadenza) {
      setError("Tutti i campi sono richiesti");
      return;
    }

    try {
      const response = await fetch("/api/calendario/scadenze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newScadenza)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage("Scadenza creata con successo");
        setShowAddModal(false);
        setNewScadenza({
          checklist_voce_id: '',
          civico: '',
          asset: '',
          asset_tipo: '',
          data_scadenza: '',
          frequenza_tipo: '',
          giorni_preavviso: 7
        });
        await caricaScadenze();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setError(data.error || "Errore nella creazione della scadenza");
      }
    } catch (err) {
      setError("Errore di comunicazione con il server");
    }
  };

  const eliminaScadenza = async (gruppo, nomeGruppo) => {
    // Crea un nome descrittivo per l'evento
    const nomeEvento = gruppo.nome_gruppo || 
                      gruppo.descrizione_gruppo || 
                      `${gruppo.asset || 'Asset'} - ${gruppo.civico || 'Civico'} (${gruppo.data_scadenza_formatted || gruppo.data_scadenza})`;
    
    // Se è un gruppo, elimina tutte le scadenze individuali
    if (gruppo.scadenze_individuali && gruppo.scadenze_individuali.length > 0) {
      const numScadenze = gruppo.scadenze_individuali.length;
      if (!confirm(`Sei sicuro di voler eliminare tutte le ${numScadenze} scadenze dell'evento "${nomeEvento}"?\n\nQuesta azione non può essere annullata.`)) {
        return;
      }

      try {
        // Elimina tutte le scadenze del gruppo
        for (const scadenza of gruppo.scadenze_individuali) {
          const response = await fetch(`/api/calendario/scadenze/${scadenza.id}`, {
            method: 'DELETE'
          });

          if (!response.ok) {
            const data = await response.json();
            setError(data.error || `Errore nell'eliminazione della scadenza ${scadenza.id}`);
            return;
          }
        }

        setMessage(`Gruppo di ${numScadenze} scadenze eliminato con successo`);
        await caricaScadenze(); // Ricarica la lista
        setTimeout(() => setMessage(""), 3000);
      } catch (err) {
        setError("Errore di comunicazione con il server");
      }
    } else {
      // Fallback per scadenza singola
      const scadenzaId = gruppo.id || (gruppo.scadenze_individuali && gruppo.scadenze_individuali[0]?.id);
      if (!scadenzaId) {
        setError("ID scadenza non trovato");
        return;
      }

      if (!confirm(`Sei sicuro di voler eliminare l'evento "${nomeEvento}"?\n\nQuesta azione non può essere annullata.`)) {
        return;
      }

      try {
        const response = await fetch(`/api/calendario/scadenze/${scadenzaId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
          setMessage(data.message || "Scadenza eliminata con successo");
          await caricaScadenze(); // Ricarica la lista
          setTimeout(() => setMessage(""), 3000);
        } else {
          setError(data.error || "Errore nell'eliminazione della scadenza");
        }
      } catch (err) {
        setError("Errore di comunicazione con il server");
      }
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scadenze':
        return renderScadenze();
      default:
        return null;
    }
  };

  const renderScadenze = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Scadenze Programmate</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Toggle vista */}
          <div style={{ display: 'flex', background: '#f8f9fa', borderRadius: '6px', padding: '2px' }}>
            <button 
              onClick={() => setVistaCalendario(false)}
              style={{
                background: !vistaCalendario ? '#1a237e' : 'transparent',
                color: !vistaCalendario ? 'white' : '#1a237e',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📋 Lista
            </button>
            <button 
              onClick={() => setVistaCalendario(true)}
              style={{
                background: vistaCalendario ? '#1a237e' : 'transparent',
                color: vistaCalendario ? 'white' : '#1a237e',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📅 Calendario
            </button>
          </div>
          
          <button 
            onClick={async () => {
              // Reset completo e carica civici
              setNewScadenza({
                checklist_voce_id: '',
                civico: '',
                asset: '',
                asset_tipo: '',
                data_scadenza: '',
                note: '',
                frequenza_tipo: '',
                giorni_preavviso: ''
              });
              setAssetsForScadenza([]);
              setTipologieForModal([]);
              setSelectedCivico('');
              setSelectedAssetId('');
              setSelectedAssetTypeForScadenza('');
              // Carica i civici quando apro il modal
              await caricaCivici();
              setShowAddModal(true);
            }}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ➕ Nuova Scadenza
          </button>
          
          <button 
            onClick={generaAlertScadenze}
            style={{
              background: '#ff6b35',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            🔔 Genera Alert
          </button>
          <button 
            onClick={caricaScadenze}
            style={{
              background: '#1a237e',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🔄 Aggiorna
          </button>
        </div>
      </div>

      {/* Pannello Filtri */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h4 style={{ margin: 0, color: '#1a237e' }}>🔍 Filtri Scadenze</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={resetFiltri}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🔄 Reset Filtri
            </button>
            <span style={{ 
              background: '#007bff', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '4px', 
              fontSize: '12px' 
            }}>
              {scadenze.length} event{scadenze.length === 1 ? 'o' : 'i'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
          {/* Filtro Range Temporale */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              📅 Range Temporale:
            </label>
            <select
              value={filtroRangeGiorni}
              onChange={(e) => setFiltroRangeGiorni(parseInt(e.target.value))}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option key="7" value={7}>Prossimi 7 giorni</option>
              <option key="30" value={30}>Prossimi 30 giorni</option>
              <option key="60" value={60}>Prossimi 60 giorni</option>
              <option key="90" value={90}>Prossimi 90 giorni</option>
              <option key="0" value={0}>Tutte le scadenze</option>
            </select>
          </div>

          {/* Filtro Civico */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              🏠 Civico:
            </label>
            <select
              value={filtroCivico}
              onChange={(e) => {
                setFiltroCivico(e.target.value);
                // Reset asset specifico quando cambia il civico
                setFiltroAssetSpecifico('');
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option key="" value="">Tutti i civici</option>
              {getCiviciUnici().map(civico => (
                <option key={civico} value={civico}>{civico}</option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo Asset */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              ⚙️ Tipo Asset:
            </label>
            <select
              value={filtroAssetType}
              onChange={(e) => {
                setFiltroAssetType(e.target.value);
                // Reset asset specifico quando cambia il tipo
                setFiltroAssetSpecifico('');
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option key="" value="">Tutti i tipi</option>
              {getAssetTypesUnici().map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          {/* Filtro Asset Specifico */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>
              📋 Asset Specifico:
            </label>
            <select
              value={filtroAssetSpecifico}
              onChange={(e) => setFiltroAssetSpecifico(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option key="" value="">Tutti gli asset</option>
              {getAssetsSpecifici().map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contenuto basato sulla vista selezionata */}
      {vistaCalendario ? (
        // Vista Calendario
        <div>
          {/* Stili CSS per il calendario */}
          <style dangerouslySetInnerHTML={{
            __html: `
              .react-calendar {
                width: 100% !important;
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                font-family: inherit;
              }
              
              .react-calendar__tile {
                position: relative !important;
                height: 80px !important;
                padding: 4px !important;
                border: 1px solid #f1f5f9 !important;
                background: white !important;
                transition: all 0.2s ease !important;
                cursor: pointer !important;
              }
              
              .react-calendar__tile:hover {
                background: #f8fafc !important;
                border-color: #cbd5e1 !important;
                transform: scale(1.02) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
              }
              
              .react-calendar__tile--active {
                background: #1a237e !important;
                color: white !important;
              }
              
              .react-calendar__tile--active:hover {
                background: #0f1654 !important;
              }
              
              .has-scadenze {
                background: #e0f2fe !important;
                border-color: #0ea5e9 !important;
              }
              
              .has-scadenze-urgenti {
                background: #fef2f2 !important;
                border-color: #ef4444 !important;
              }
              
              .react-calendar__navigation {
                background: #1a237e !important;
                border-radius: 8px 8px 0 0 !important;
              }
              
              .react-calendar__navigation button {
                color: white !important;
                font-weight: bold !important;
                font-size: 16px !important;
                padding: 12px !important;
              }
              
              .react-calendar__navigation button:hover {
                background: #0f1654 !important;
              }
              
              .react-calendar__month-view__weekdays {
                background: #f8fafc !important;
                font-weight: bold !important;
                color: #475569 !important;
                text-transform: uppercase !important;
                font-size: 12px !important;
              }
              
              .react-calendar__month-view__days__day--weekend {
                color: #dc2626 !important;
              }
              
              .react-calendar__tile abbr {
                font-weight: bold !important;
                font-size: 14px !important;
              }
              
              .react-calendar__tile:before {
                content: '' !important;
                position: absolute !important;
                top: 2px !important;
                left: 2px !important;
                width: 8px !important;
                height: 8px !important;
                border-radius: 50% !important;
                background: transparent !important;
                transition: all 0.2s ease !important;
              }
              
              .react-calendar__tile:hover:before {
                background: #28a745 !important;
              }
            `
          }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <div style={{ background: 'white', padding: '0', borderRadius: '8px', overflow: 'hidden' }}>
              <Calendar
                onChange={(date) => {
                  setSelectedDate(date);
                  // Se si fa doppio click, apri il modal per nuova scadenza
                }}
                onClickDay={(date, event) => {
                  setSelectedDate(date);
                  // Aggiungi un piccolo delay per distinguere tra click singolo e doppio
                  if (event.detail === 2) {
                    // Doppio click - apri modal nuova scadenza con data precompilata
                    // Reset completo prima di impostare la nuova data
                    setNewScadenza({
                      checklist_voce_id: '',
                      civico: '',
                      asset: '',
                      asset_tipo: '',
                      data_scadenza: date.toLocaleDateString('en-CA'), // Formato YYYY-MM-DD
                      note: '',
                      frequenza_tipo: '',
                      giorni_preavviso: ''
                    });
                    setAssetsForScadenza([]);
                    setTipologieForModal([]);
                    setSelectedCivico('');
                    setSelectedAssetId('');
                    setSelectedAssetTypeForScadenza('');
                    // Carica i civici quando apro il modal
                    caricaCivici();
                    setShowAddModal(true);
                  }
                }}
                value={selectedDate}
                tileContent={tileContent}
                tileClassName={tileClassName}
                locale="it-IT"
                next2Label={null}
                prev2Label={null}
                style={{ width: '100%', border: 'none' }}
              />
            </div>
          
          {/* Pannello laterale con scadenze del giorno selezionato */}
          <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4 style={{ margin: 0, color: '#1a237e' }}>
                📅 {selectedDate.toLocaleDateString('it-IT')}
              </h4>
              <button
                onClick={() => {
                  // Reset completo prima di impostare la nuova data
                  setNewScadenza({
                    checklist_voce_id: '',
                    civico: '',
                    asset: '',
                    asset_tipo: '',
                    data_scadenza: selectedDate.toLocaleDateString('en-CA'), // Formato YYYY-MM-DD
                    note: '',
                    frequenza_tipo: '',
                    giorni_preavviso: ''
                  });
                  setAssetsForScadenza([]);
                  setTipologieForModal([]);
                  setSelectedCivico('');
                  setSelectedAssetId('');
                  setSelectedAssetTypeForScadenza('');
                  // Carica i civici quando apro il modal
                  caricaCivici();
                  setShowAddModal(true);
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ➕ Aggiungi
              </button>
            </div>
            
            <div style={{ 
              background: '#f8f9fa', 
              border: '1px solid #e9ecef', 
              borderRadius: '4px', 
              padding: '8px', 
              marginBottom: '15px',
              fontSize: '12px',
              color: '#6c757d'
            }}>
              💡 <strong>Suggerimento:</strong> Fai doppio click su un giorno del calendario per creare rapidamente una scadenza
            </div>

            {(() => {
              const scadenzeDelGiorno = getScadenzePerData(selectedDate);
              return scadenzeDelGiorno.length === 0 ? (
                <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
                  Nessuna scadenza programmata per questo giorno
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {scadenzeDelGiorno.map(gruppo => (
                    <div
                      key={gruppo.id || gruppo.civico + gruppo.asset + gruppo.data_scadenza}
                      style={{
                        border: `2px solid ${getStatoColor(gruppo)}`,
                        borderRadius: '6px',
                        padding: '12px',
                        background: '#f8f9fa'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a237e', marginBottom: '4px' }}>
                        {gruppo.nome_gruppo || gruppo.nome_manutenzione}
                        {gruppo.is_gruppo && (
                          <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '8px' }}>
                            ({gruppo.num_voci} voci)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                        📍 {gruppo.civico}{gruppo.asset ? ` - ${gruppo.asset}` : ''}
                      </div>
                      {gruppo.descrizione_gruppo && (
                        <div style={{ fontSize: '11px', color: '#6c757d', marginBottom: '8px' }}>
                          {gruppo.descrizione_gruppo}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            if (gruppo.is_gruppo && gruppo.scadenze_individuali?.length > 0) {
                              // Per i gruppi, prendi la prima scadenza come rappresentante
                              apriFormScadenza({...gruppo, id: gruppo.scadenze_individuali[0].id});
                            } else {
                              apriFormScadenza(gruppo);
                            }
                          }}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          ✅ Esegui evento
                        </button>
                        <button
                          onClick={() => eliminaScadenza(gruppo, gruppo.nome_asset)}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
          </div>
        </div>
      ) : (
        // Vista Lista (esistente)
        scadenze.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '50px',
            background: '#f8f9fa',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📅</div>
            <p>Nessuna scadenza programmata</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {scadenze.map(gruppo => (
              <div
                key={gruppo.id || gruppo.civico + gruppo.asset + gruppo.data_scadenza}
                style={{
                  border: `2px solid ${getStatoColor(gruppo)}`,
                  borderRadius: '8px',
                  padding: '15px',
                  background: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ 
                      background: getStatoColor(gruppo),
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {getStatoText(gruppo)}
                    </span>
                    {gruppo.is_gruppo && (
                      <span style={{ 
                        background: '#17a2b8',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>
                        {gruppo.num_voci} VOCI
                      </span>
                    )}
                    <span style={{ color: '#6c757d', fontSize: '14px' }}>
                      📅 {gruppo.data_scadenza_formatted || parseItalianDate(gruppo.data_scadenza)?.toLocaleDateString('it-IT') || 'Data non valida'}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1a237e' }}>
                    {gruppo.nome_gruppo || gruppo.nome_manutenzione}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', color: '#6c757d' }}>
                    📍 {gruppo.civico}{gruppo.asset ? ` - ${gruppo.asset}` : ''}
                  </p>
                  {gruppo.descrizione_gruppo && (
                    <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                      {gruppo.descrizione_gruppo}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '15px' }}>
                  <button
                    onClick={() => apriFormScadenza(gruppo)}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    ✅ Esegui evento
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminaScadenza(gruppo, gruppo.nome_asset);
                    }}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )
      )}
    </div>
  );

  const renderNuovaScadenza = () => (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>Programma Nuova Scadenza</h3>
        <p style={{ color: '#6c757d', margin: '5px 0 0 0' }}>
          Seleziona un asset specifico per programmare le scadenze di manutenzione
        </p>
      </div>

      {/* Filtri di selezione */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Selezione Civico */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            🏠 Civico:
          </label>
          <select
            value={selectedCivico}
            onChange={(e) => {
              setSelectedCivico(e.target.value);
              setSelectedAssetTypeForScadenza('');
              setSelectedAssetId('');
              setAssetsForScadenza([]);
            }}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          >
            <option key="" value="">Seleziona civico</option>
            {civici.map(civico => (
              <option key={civico.id} value={civico.numero}>{civico.numero}</option>
            ))}
          </select>
        </div>

        {/* Selezione Tipo Asset */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            ⚙️ Tipo Asset:
          </label>
          <select
            value={selectedAssetTypeForScadenza}
            onChange={(e) => {
              setSelectedAssetTypeForScadenza(e.target.value);
              setSelectedAssetId('');
              if (selectedCivico && e.target.value) {
                caricaAssets(selectedCivico, e.target.value);
              }
            }}
            disabled={!selectedCivico}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '16px',
              opacity: !selectedCivico ? 0.6 : 1
            }}
          >
            <option key="" value="">Seleziona tipo asset</option>
            {assetTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Selezione Asset Specifico */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            📋 Asset:
          </label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            disabled={!selectedAssetTypeForScadenza}
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '16px',
              opacity: !selectedAssetTypeForScadenza ? 0.6 : 1
            }}
          >
            <option key="" value="">Seleziona asset</option>
            {assetsForScadenza.map(asset => (
              <option key={asset["Id Aziendale"]} value={asset["Id Aziendale"]}>
                {asset["Id Aziendale"]}{asset.tipo ? ` - ${asset.tipo}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pulsante Nuova Scadenza */}
      {selectedAssetId && (
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <button 
            onClick={() => {
              console.log("🔍 Debug pulsante Programma Scadenze:");
              console.log("selectedAssetTypeForScadenza:", selectedAssetTypeForScadenza);
              console.log("selectedAssetId:", selectedAssetId);
              console.log("selectedCivico:", selectedCivico);
              
              caricaChecklistPerScadenza(selectedAssetTypeForScadenza);
              // Pre-popola i campi con i dati selezionati
              const selectedAsset = assetsForScadenza.find(a => a["Id Aziendale"] == selectedAssetId);
              setNewScadenza({
                checklist_voce_id: '',
                civico: selectedCivico,
                asset: selectedAsset ? selectedAsset["Id Aziendale"] : '',
                asset_tipo: selectedAssetTypeForScadenza,
                data_scadenza: '',
                frequenza_tipo: '',
                giorni_preavviso: 7
              });
              console.log("🎯 Aprendo modal...");
              setShowAddScadenzaModal(true);
            }}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto'
            }}
          >
            ➕ Programma Scadenze per questo Asset
          </button>
        </div>
      )}

      {/* Info Asset Selezionato */}
      {selectedAssetId && (
        <div style={{ 
          padding: '20px',
          background: '#e7f3ff',
          borderRadius: '8px',
          border: '1px solid #b3d7ff'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1a237e' }}>
            📋 Asset Selezionato
          </h4>
          {assetsForScadenza.find(a => a.id == selectedAssetId) && (
            <div>
              <p><strong>Civico:</strong> {selectedCivico}</p>
              <p><strong>Tipo:</strong> {selectedAssetTypeForScadenza}</p>
              <p><strong>Asset:</strong> {assetsForScadenza.find(a => a.id == selectedAssetId).marca} {assetsForScadenza.find(a => a.id == selectedAssetId).modello}</p>
              <p><strong>ID:</strong> {selectedAssetId}</p>
            </div>
          )}
        </div>
      )}

      {/* Messaggio vuoto */}
      {!selectedAssetId && (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
          <p>Seleziona civico, tipo asset e asset specifico per programmare le scadenze</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <div>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: sidebarOpen ? '1200px' : 'none', 
      margin: sidebarOpen ? '0 auto' : '0',
      width: sidebarOpen ? 'auto' : '100%'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#1a237e', margin: 0 }}>📅 Calendario Manutenzioni</h2>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e9ecef', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? '#1a237e' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#1a237e',
                border: 'none',
                padding: '12px 20px',
                cursor: 'pointer',
                borderRadius: '8px 8px 0 0',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                transition: 'all 0.3s ease'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messaggi */}
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

      {message && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {message}
        </div>
      )}

      {/* Contenuto per tab */}
      {renderTabContent()}

      {/* Modal Form Scadenza */}
      {selectedScadenza && (
        <FormScadenzaDinamica 
          scadenza={selectedScadenza}
          username={username}
          onClose={() => setSelectedScadenza(null)}
          onCompleted={() => {
            setSelectedScadenza(null);
            caricaScadenze();
          }}
        />
      )}

      {/* Modal Nuova Scadenza */}
      {showAddScadenzaModal && (
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
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Nuova Scadenza di Manutenzione</h3>
              <button 
                onClick={() => setShowAddScadenzaModal(false)} 
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              {/* Info asset selezionato */}
              <div style={{ 
                padding: '10px', 
                background: '#e7f3ff', 
                borderRadius: '6px', 
                border: '1px solid #b3d7ff' 
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#1a237e' }}>
                  📋 Asset: <strong>{selectedAssetTypeForScadenza}</strong> - 
                  Verranno mostrate solo le tipologie per questo tipo di asset
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Voce Checklist da Controllare:
                </label>
                <select
                  value={newScadenza.checklist_voce_id}
                  onChange={(e) => setNewScadenza({...newScadenza, checklist_voce_id: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option key="" value="">Seleziona voce checklist</option>
                  {checklistForScadenza.map(voce => (
                    <option key={voce.id} value={voce.id}>
                      {voce.nome_voce}
                    </option>
                  ))}
                </select>
                {checklistForScadenza.length === 0 && (
                  <p style={{ color: '#dc3545', fontSize: '12px', margin: '5px 0 0 0' }}>
                    ⚠️ Nessuna voce checklist configurata per {selectedAssetTypeForScadenza}. 
                    Vai in "Tipologie" per crearne una.
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Frequenza Scadenza:
                </label>
                <select
                  value={newScadenza.frequenza_tipo}
                  onChange={(e) => setNewScadenza({...newScadenza, frequenza_tipo: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option key="" value="">Seleziona frequenza</option>
                  <option key="settimanale" value="settimanale">Settimanale</option>
                  <option key="bisettimanale" value="bisettimanale">Bisettimanale (ogni 2 settimane)</option>
                  <option key="mensile" value="mensile">Mensile</option>
                  <option key="bimestrale" value="bimestrale">Bimestrale (ogni 2 mesi)</option>
                  <option key="semestrale" value="semestrale">Semestrale (ogni 6 mesi)</option>
                  <option key="annuale" value="annuale">Annuale</option>
                  <option key="biennale" value="biennale">Biennale (ogni 2 anni)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Giorni di Preavviso:
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={newScadenza.giorni_preavviso}
                  onChange={(e) => setNewScadenza({...newScadenza, giorni_preavviso: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                  placeholder="es. 7"
                />
                <small style={{ color: '#6c757d' }}>Numero di giorni prima della scadenza per ricevere l'alert</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Civico:
                </label>
                <input
                  type="text"
                  value={newScadenza.civico}
                  readOnly
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    color: '#666'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Asset:
                </label>
                <input
                  type="text"
                  value={newScadenza.asset}
                  readOnly
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd',
                    backgroundColor: '#f5f5f5',
                    color: '#666'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Data Scadenza:
                </label>
                <input
                  type="date"
                  value={newScadenza.data_scadenza}
                  onChange={(e) => setNewScadenza({...newScadenza, data_scadenza: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setShowAddScadenzaModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button 
                onClick={salvaScadenza}
                disabled={!newScadenza.checklist_voce_id || !newScadenza.civico || !newScadenza.asset || !newScadenza.data_scadenza || !newScadenza.frequenza_tipo || !newScadenza.giorni_preavviso}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  opacity: (!newScadenza.checklist_voce_id || !newScadenza.civico || !newScadenza.asset || !newScadenza.data_scadenza || !newScadenza.frequenza_tipo || !newScadenza.giorni_preavviso) ? 0.5 : 1
                }}
              >
                Programma Scadenza
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuova Scadenza */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '500px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0, color: '#1a237e' }}>➕ Nuova Scadenza</h3>
            
            {!newScadenza.data_scadenza && (
              <div style={{ 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '4px', 
                padding: '10px', 
                marginBottom: '15px',
                fontSize: '14px',
                color: '#856404'
              }}>
                💡 <strong>Suggerimento:</strong> Puoi chiudere questo modal e fare doppio click su un giorno del calendario per precompilare automaticamente la data
              </div>
            )}
            
            {/* Primo step: Selezione Civico */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                1️⃣ Civico:
              </label>
              <select
                value={newScadenza.civico}
                onChange={async (e) => {
                  const selectedCivico = e.target.value;
                  setNewScadenza({
                    ...newScadenza,
                    civico: selectedCivico,
                    asset: '', // Reset asset quando cambia civico
                    asset_tipo: '', // Reset tipo asset
                    checklist_voce_id: '' // Reset tipologia
                  });
                  setTipologieForModal([]); // Reset tipologie
                  if (selectedCivico) {
                    await caricaAssetsPerScadenza(selectedCivico);
                  } else {
                    setAssetsForScadenza([]);
                  }
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd'
                }}
              >
                <option key="" value="">Seleziona civico...</option>
                {civici.map(civico => (
                  <option key={civico.id} value={civico.numero}>
                    {civico.numero}{civico.via ? ` - ${civico.via}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Secondo step: Selezione Asset Specifico */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                2️⃣ Asset Specifico:
              </label>
              <select
                value={newScadenza.asset}
                onChange={async (e) => {
                  const selectedAssetId = e.target.value;
                  const selectedAsset = assetsForScadenza.find(a => 
                    (a.id_aziendale || a["Id Aziendale"]) === selectedAssetId
                  );
                  
                  const tipoAsset = selectedAsset ? (selectedAsset.tipo || selectedAsset["Tipo"]) : '';
                  
                  setNewScadenza({
                    ...newScadenza,
                    asset: selectedAssetId,
                    asset_tipo: tipoAsset,
                    checklist_voce_id: '' // Reset tipologia quando cambia asset
                  });
                  
                  if (tipoAsset) {
                    await caricaTipologiePerTipoAsset(tipoAsset);
                  } else {
                    setTipologieForModal([]);
                  }
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd'
                }}
                disabled={!newScadenza.civico}
              >
                <option key="" value="">
                  {!newScadenza.civico ? 'Prima seleziona un civico...' : 'Seleziona asset...'}
                </option>
                {assetsForScadenza.map(asset => (
                  <option key={asset.id} value={asset.id_aziendale || asset["Id Aziendale"]}>
                    {asset.id_aziendale || asset["Id Aziendale"]}{(asset.descrizione || asset["Descrizione"]) ? ` - ${asset.descrizione || asset["Descrizione"]}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Terzo step: Tipo Asset (automatico) */}
            {newScadenza.asset_tipo && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  3️⃣ Tipo Asset (automatico):
                </label>
                <div style={{ 
                  padding: '8px 12px', 
                  background: '#e7f3ff', 
                  border: '1px solid #bee5eb', 
                  borderRadius: '4px',
                  color: '#0c5460',
                  fontWeight: 'bold'
                }}>
                  📋 {newScadenza.asset_tipo}
                </div>
              </div>
            )}

            {/* Quarto step: Tipologia Manutenzione */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                4️⃣ Tipologia Manutenzione:
              </label>
              <select
                value={newScadenza.checklist_voce_id}
                onChange={async (e) => {
                  setNewScadenza({
                    ...newScadenza,
                    checklist_voce_id: e.target.value
                  });
                }}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: '1px solid #ddd'
                }}
                disabled={!newScadenza.asset_tipo}
              >
                <option key="" value="">
                  {!newScadenza.asset_tipo ? 'Prima seleziona un asset...' : 'Seleziona tipologia manutenzione...'}
                </option>
                {tipologieForModal.map(tip => (
                  <option key={tip.id} value={tip.id}>
                    {tip.nome_voce}
                  </option>
                ))}
              </select>
            </div>

            {tipologieForModal.length === 0 && newScadenza.asset_tipo && (
              <div style={{ 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7', 
                borderRadius: '4px', 
                padding: '10px', 
                marginBottom: '15px',
                fontSize: '14px',
                color: '#856404'
              }}>
                ⚠️ Nessuna tipologia di manutenzione configurata per il tipo asset "{newScadenza.asset_tipo}". 
                Vai nel <strong>Form Manager → ⚙️ Checklist Manutenzioni</strong> per aggiungerne una.
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Data Scadenza:
                {newScadenza.data_scadenza && (
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '12px', 
                    color: '#28a745', 
                    background: '#d4edda', 
                    padding: '2px 6px', 
                    borderRadius: '3px' 
                  }}>
                    📅 Data selezionata dal calendario
                  </span>
                )}
              </label>
              <input
                type="date"
                value={newScadenza.data_scadenza}
                onChange={(e) => setNewScadenza({...newScadenza, data_scadenza: e.target.value})}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  borderRadius: '4px', 
                  border: newScadenza.data_scadenza ? '2px solid #28a745' : '1px solid #ddd',
                  background: newScadenza.data_scadenza ? '#f8fff9' : 'white'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Frequenza:
                </label>
                <select
                  value={newScadenza.frequenza_tipo}
                  onChange={(e) => setNewScadenza({...newScadenza, frequenza_tipo: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd'
                  }}
                >
                  <option key="" value="">Seleziona frequenza...</option>
                  <option key="settimanale" value="settimanale">Settimanale</option>
                  <option key="bisettimanale" value="bisettimanale">Bisettimanale (ogni 2 settimane)</option>
                  <option key="mensile" value="mensile">Mensile</option>
                  <option key="bimestrale" value="bimestrale">Bimestrale (ogni 2 mesi)</option>
                  <option key="semestrale" value="semestrale">Semestrale (ogni 6 mesi)</option>
                  <option key="annuale" value="annuale">Annuale</option>
                  <option key="biennale" value="biennale">Biennale (ogni 2 anni)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Giorni Preavviso:
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newScadenza.giorni_preavviso}
                  onChange={(e) => setNewScadenza({...newScadenza, giorni_preavviso: parseInt(e.target.value)})}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: '1px solid #ddd'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  // Reset completo di tutti i dati del modal
                  setNewScadenza({
                    checklist_voce_id: '',
                    civico: '',
                    asset: '',
                    asset_tipo: '',
                    data_scadenza: '',
                    note: '',
                    frequenza_tipo: '',
                    giorni_preavviso: ''
                  });
                  setAssetsForScadenza([]);
                  setTipologieForModal([]);
                  setSelectedCivico('');
                  setSelectedAssetId('');
                  setSelectedAssetTypeForScadenza('');
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Annulla
              </button>
              <button
                onClick={creaScadenza}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Crea Scadenza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioCompleto;
