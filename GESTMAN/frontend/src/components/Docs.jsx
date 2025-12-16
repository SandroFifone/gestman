import React, { useState } from 'react';
import './Docs.css';

const Docs = ({ username, isAdmin }) => {
  return (
    <div className="section-container">
      <div className="section-header">
        <h2>📚 Documentazione e Report</h2>
        <p>Sistema di generazione documenti dinamici per l'amministrazione aziendale</p>
      </div>

      <div className="section-content">
        <div className="coming-soon">
          <h3>🚧 Sezione in Costruzione</h3>
          <p>Stiamo preparando il nuovo sistema di generazione documenti. Presto disponibile!</p>
        </div>
      </div>
    </div>
  );
};

export default Docs;

  const handleSectionClick = (sectionKey) => {
    setActiveView(sectionKey);
  };

  const renderOverview = () => (
    <div className="docs-overview">
      <div className="overview-grid">
        {documentSections.map(section => (
          <div 
            key={section.key}
            className="section-card"
            onClick={() => handleSectionClick(section.key)}
          >
            <div className="section-icon">{section.icon}</div>
            <h3>{section.label}</h3>
            <p>{section.description}</p>
            <button className="btn btn-primary">
              Apri Sezione
            </button>
          </div>
        ))}
      </div>
      
      <div className="coming-soon-notice">
        <h4>🚧 Sezione in Sviluppo</h4>
        <p>Il nuovo sistema di generazione documenti dinamici è in fase di sviluppo. 
           Presto potrai creare template personalizzabili e generare documenti amministrativi 
           utilizzando i dati dell'applicazione.</p>
      </div>
    </div>
  );

  const renderPlaceholder = (sectionKey) => (
    <div className="section-placeholder">
      <button 
        className="btn btn-secondary mb-4"
        onClick={() => setActiveView('overview')}
      >
        ← Torna alla panoramica
      </button>
      
      <div className="placeholder-content">
        <h3>🚧 {documentSections.find(s => s.key === sectionKey)?.label}</h3>
        <p>Questa sezione sarà presto disponibile con le seguenti funzionalità:</p>
        
        {sectionKey === 'templates' && (
          <ul>
            <li>Editor drag & drop per layout documenti</li>
            <li>Campi dinamici collegati ai dati dell'app</li>
            <li>Template pre-configurati per documenti amministrativi</li>
            <li>Anteprima in tempo reale</li>
          </ul>
        )}
        
        {sectionKey === 'generator' && (
          <ul>
            <li>Selezione dati da compilazioni, asset, magazzino</li>
            <li>Filtri avanzati e aggregazioni</li>
            <li>Generazione PDF con formattazione professionale</li>
            <li>Stampa diretta e invio email</li>
          </ul>
        )}
        
        {sectionKey === 'reports' && (
          <ul>
            <li>Rapporti mensili manutenzioni</li>
            <li>Certificati di conformità asset</li>
            <li>Registri controlli periodici</li>
            <li>Analisi costi e KPI</li>
          </ul>
        )}
        
        {sectionKey === 'archive' && (
          <ul>
            <li>Storico documenti generati</li>
            <li>Ricerca avanzata per data, tipo, contenuto</li>
            <li>Versioning e cronologia modifiche</li>
            <li>Backup automatico su cloud</li>
          </ul>
        )}
      </div>
    </div>
  );
      const result = await response.json();
      
      setData(result.data || []);
      setFilteredData(result.data || []);
      setFilterOptions(result.filters || {});
      setFilters({});
      setSelectedRecords([]);
    } catch (err) {
      console.error('Errore caricamento dati:', err);
      setError(`Errore nel caricamento dei dati: ${err.message}`);
      setData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    if (Object.keys(filters).length === 0) {
      setFilteredData(data);
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`${API_URLS.DOCS}/${activeSection}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setFilteredData(result.data || []);
      
    } catch (err) {
      console.error('Errore applicazione filtri:', err);
      setError(`Errore nell'applicazione dei filtri: ${err.message}`);
    }
  };

  const resetFilters = () => {
    setFilters({});
    setFilteredData(data);
  };

  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    setSelectedRecords([]);
    setError(null);
  };

  const handleBackToSections = () => {
    setActiveSection(null);
    setData([]);
    setFilteredData([]);
    setFilters({});
    setFilterOptions({});
    setSelectedRecords([]);
    setError(null);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleSelectRecord = (recordData) => {
    setSelectedRecords(prev => {
      // Per compilazioni, usa oggetti {id, record_type}, per altri usa ID semplici
      const isSelected = activeSection === 'compilazioni' 
        ? prev.some(item => typeof item === 'object' && item.id === recordData.id)
        : prev.includes(recordData);
      
      if (isSelected) {
        return activeSection === 'compilazioni'
          ? prev.filter(item => !(typeof item === 'object' && item.id === recordData.id))
          : prev.filter(id => id !== recordData);
      } else {
        return [...prev, recordData];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredData.length) {
      setSelectedRecords([]);
    } else {
      const recordIds = filteredData.map(item => {
        // Per la sezione compilazioni, invia anche il tipo di record
        if (activeSection === 'compilazioni') {
          const isScadenzaEsecuzione = item.esito && item.nome_voce && item.esito.trim() !== '';
          return {
            id: item.id,
            record_type: isScadenzaEsecuzione ? 'scadenza_esecuzione' : 'form_submission'
          };
        } else if (activeSection === 'civici') {
          return item.numero;
        } else if (activeSection === 'assets-inventory') {
          return item.id_aziendale;
        } else if (activeSection === 'files') {
          return item.id; // Usa il percorso relativo come ID
        } else if (activeSection === 'allegati') {
          return item.id; // Usa il percorso del file come ID
        } else {
          return item.id;
        }
      });
      setSelectedRecords(recordIds);
    }
  };

  const handleDownloadFile = async (downloadUrl) => {
    try {
      // Forza il download del file invece di aprirlo in una nuova tab
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Errore nel download: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Estrai il nome del file dall'URL o dai headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition
          .split('filename=')[1]
          .replace(/"/g, '')
          .trim();
      } else {
        // Fallback: prendi il nome dall'URL
        const urlParts = downloadUrl.split('/');
        const lastPart = urlParts[urlParts.length - 2]; // Prima di '/download'
        if (lastPart) {
          filename = decodeURIComponent(lastPart);
        }
      }
      
      // Crea un link temporaneo per il download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Pulizia
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Errore durante il download:', error);
      alert('Errore durante il download del file. Riprova.');
    }
  };

  const handleDeleteRecords = async () => {
    try {
      // DEBUG: Mostra gli ID selezionati
      console.log('Selected Records:', selectedRecords);
      console.log('Active Section:', activeSection);
      
      // Gestione speciale per i file
      if (activeSection === 'files') {
        if (selectedRecords.length === 1) {
          // Cancellazione singola file
          const filePath = selectedRecords[0];
          const response = await fetch(`${API_URLS.DOCS}/files/${filePath}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            const result = await response.json();
            alert(result.message || 'File cancellato con successo!');
          } else {
            const error = await response.json();
            alert(`Errore: ${error.error}`);
          }
        } else {
          // Cancellazione multipla file
          const response = await fetch(`${API_URLS.DOCS}/files/bulk-delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_paths: selectedRecords })
          });

          if (response.ok) {
            const result = await response.json();
            alert(`Cancellati ${result.deleted} file. ${result.errors.length > 0 ? 'Errori: ' + result.errors.join(', ') : ''}`);
          } else {
            const error = await response.json();
            alert(`Errore: ${error.error}`);
          }
        }
      } else {
        // Logica normale per le altre sezioni
        if (selectedRecords.length === 1) {
          // Cancellazione singola
          const recordId = activeSection === 'compilazioni' && typeof selectedRecords[0] === 'object' 
            ? selectedRecords[0].id 
            : selectedRecords[0];
          const response = await fetch(`${API_URLS.DOCS}/${activeSection}/${recordId}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            alert('Record cancellato con successo!');
          } else {
            const error = await response.json();
            alert(`Errore: ${error.error}`);
          }
        } else {
          // Cancellazione multipla
          console.log('Sending bulk delete with IDs:', selectedRecords); // DEBUG
          const response = await fetch(`${API_URLS.DOCS}/${activeSection}/bulk-delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedRecords })
          });

          if (response.ok) {
            const result = await response.json();
            alert(`Cancellati ${result.deleted} record. ${result.errors.length > 0 ? 'Errori: ' + result.errors.join(', ') : ''}`);
          } else {
            const error = await response.json();
            alert(`Errore: ${error.error}`);
          }
        }
      }

      setShowDeleteModal(false);
      setSelectedRecords([]);
      loadSectionData(); // Ricarica i dati
    } catch (error) {
      console.error('Errore cancellazione:', error);
      alert('Errore durante la cancellazione');
    }
  };

  const handleCleanup = async (daysOld) => {
    try {
      let response;
      
      if (activeSection === 'files') {
        // Per i file, usa l'endpoint specifico di cleanup
        response = await fetch(`${API_URLS.DOCS}/files/cleanup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dry_run: false })
        });
      } else {
        // Per le altre sezioni, usa l'endpoint normale
        response = await fetch(`${API_URLS.DOCS}/cleanup/${activeSection}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days_old: daysOld })
        });
      }

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        setShowCleanupModal(false);
        loadSectionData(); // Ricarica i dati
      } else {
        const error = await response.json();
        alert(`Errore: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore cleanup:', error);
      alert('Errore durante la pulizia');
    }
  };

  const handlePrintReport = async () => {
    try {
      const response = await fetch(API_URLS.PRINT_REPORT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: activeSection,
          selectedRecords: selectedRecords.length > 0 ? selectedRecords : null
        })
      });

      if (response.ok) {
        // Crea un blob dal PDF ricevuto
        const blob = await response.blob();
        
        // Crea un URL per il blob
        const url = window.URL.createObjectURL(blob);
        
        // Crea un link temporaneo per il download
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report_${activeSection}_${new Date().toISOString().slice(0, 10)}.pdf`;
        
        // Simula il click per avviare il download
        document.body.appendChild(link);
        link.click();
        
        // Pulisce
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        alert('✅ Report PDF generato e scaricato con successo!');
      } else {
        const error = await response.json();
        alert(`❌ Errore nella generazione del report: ${error.error}`);
      }
    } catch (error) {
      console.error('Errore stampa:', error);
      alert('❌ Errore nella generazione del report. Controlla la connessione.');
    }
  };

  const canCleanup = () => {
    return ['compilazioni', 'scadenze', 'alert', 'files', 'allegati'].includes(activeSection);
  };

  const renderFilters = () => {
    return (
      <div className="docs-filters">
        <div className="filters-row">
          {Object.entries(filterOptions).map(([key, options]) => (
            <div key={key} className="filter-group">
              <label>{formatHeader(key)}:</label>
              <select
                value={filters[key] || ''}
                onChange={(e) => handleFilterChange(key, e.target.value)}
              >
                <option value="">Tutti</option>
                {options.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        
        <div className="filters-actions">
          <button onClick={applyFilters} className="btn-primary">
            🔍 Applica Filtri
          </button>
          <button onClick={resetFilters} className="btn-secondary">
            🔄 Reset
          </button>
        </div>
      </div>
    );
  };

  const renderActions = () => {
    const isReadOnly = activeSection === 'magazzino';
    
    return (
      <div className="docs-actions">
        <button 
          onClick={handlePrintReport}
          className="btn-print"
          title={selectedRecords.length > 0 ? `Stampa ${selectedRecords.length} record selezionati` : 'Stampa tutti i record visibili'}
        >
          🖨️ Stampa {selectedRecords.length > 0 ? `Selezionati (${selectedRecords.length})` : 'Tutti'}
        </button>
        
        {!isReadOnly && selectedRecords.length > 0 && isAdmin && (
          <button 
            onClick={() => setShowDeleteModal(true)} 
            className="btn-delete"
          >
            🗑️ Cancella Selezionati ({selectedRecords.length})
          </button>
        )}
        
        {!isReadOnly && canCleanup() && (
          <button 
            onClick={() => setShowCleanupModal(true)} 
            className="btn-cleanup"
          >
            🧹 Pulizia Automatica
          </button>
        )}
        
        {isReadOnly && (
          <div className="readonly-notice">
            📋 Sezione in sola lettura - Gestione dal modulo Magazzino
          </div>
        )}
      </div>
    );
  };

  const renderTable = () => {
    if (loading) {
      return <div className="docs-loading">Caricamento dati...</div>;
    }

    if (error) {
      return <div className="docs-error">⚠️ {error}</div>;
    }

    if (!filteredData || filteredData.length === 0) {
      return <div className="docs-empty">Nessun dato disponibile per questa sezione.</div>;
    }

    const headers = Object.keys(filteredData[0] || {});

    return (
      <div className="docs-table-container">
        <div className="table-responsive">
          <table className="docs-table">
            <thead>
              <tr>
                {isAdmin && activeSection !== 'magazzino' && (
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRecords.length === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                {headers.map(header => (
                  <th key={header}>{formatHeader(header)}</th>
                ))}
                {((isAdmin && activeSection !== 'magazzino') || activeSection === 'files' || activeSection === 'allegati') && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => {
                // Determina l'ID corretto in base alla sezione
                let recordData;
                if (activeSection === 'compilazioni') {
                  // Rileva automaticamente il tipo di record basandosi sui dati
                  // Se ha 'esito' e 'nome_voce' popolati, è da scadenze_storico_esecuzioni
                  // Se ha 'form_data' con JSON, è da form_submissions
                  const isScadenzaEsecuzione = row.esito && row.nome_voce && row.esito.trim() !== '';
                  
                  recordData = {
                    id: row.id,
                    record_type: isScadenzaEsecuzione ? 'scadenza_esecuzione' : 'form_submission'
                  };
                  
                  // DEBUG per il primo record
                  if (index === 0) {
                    console.log('First row analysis:', {
                      esito: row.esito,
                      nome_voce: row.nome_voce,
                      detected_type: recordData.record_type,
                      full_row: row
                    });
                  }
                } else if (activeSection === 'civici') {
                  recordData = row.numero;
                } else if (activeSection === 'assets-inventory') {
                  recordData = row.id_aziendale;
                } else if (activeSection === 'files') {
                  recordData = row.id; // Usa il percorso relativo come ID
                } else if (activeSection === 'allegati') {
                  recordData = row.id; // Usa il percorso del file come ID
                } else {
                  recordData = row.id;
                }
                
                const recordId = activeSection === 'compilazioni' ? recordData.id : recordData;
                
                return (
                  <tr key={recordId || index}>
                    {isAdmin && activeSection !== 'magazzino' && (
                      <td>
                        <input
                          type="checkbox"
                          checked={
                            activeSection === 'compilazioni' 
                              ? selectedRecords.some(item => typeof item === 'object' && item.id === recordId)
                              : selectedRecords.includes(recordId)
                          }
                          onChange={() => handleSelectRecord(recordData)}
                        />
                      </td>
                    )}
                    {headers.map(header => (
                      <td key={header}>
                        {formatValue(header, row[header])}
                      </td>
                    ))}
                    {(isAdmin && activeSection !== 'magazzino') || activeSection === 'files' || activeSection === 'allegati' ? (
                      <td className="actions-cell">
                        {/* Pulsante download per i file */}
                        {(activeSection === 'files' || activeSection === 'allegati') && (
                          <button
                            onClick={() => handleDownloadFile(row.download_url)}
                            className="btn-download"
                            title="Scarica file"
                          >
                            💾
                          </button>
                        )}
                        
                        {/* Pulsante cancellazione (solo per admin) */}
                        {isAdmin && activeSection !== 'magazzino' && (
                          <button
                            onClick={() => {
                              setSelectedRecords([recordData]);
                              setShowDeleteModal(true);
                            }}
                            className="btn-delete-single"
                            title="Cancella record"
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const formatHeader = (header) => {
    const headerMap = {
      'id': 'ID',
      'numero': 'Numero',
      'data_creazione': 'Data Creazione',
      'data_intervento': 'Data Intervento',
      'data_scadenza': 'Data Scadenza',
      'data_completamento': 'Data Completamento',
      'civico_numero': 'Civico',
      'asset_id': 'Asset ID',
      'operatore': 'Operatore',
      'tipo': 'Tipo',
      'stato': 'Stato',
      'titolo': 'Titolo',
      'descrizione': 'Descrizione',
      'note': 'Note',
      'template_id': 'Template',
      'template_nome': 'Template',
      'form_data': 'Dati Form',
      'form_data_preview': 'Anteprima Dati',
      'created_at': 'Creato il',
      'updated_at': 'Aggiornato il',
      'nome': 'Nome',
      'name': 'Nome',
      'is_active': 'Attivo',
      'id_aziendale': 'ID Aziendale',
      'tipo_nome': 'Nome Tipo',
      'tipo_descrizione': 'Descrizione Tipo',
      'icona': 'Icona',
      'colore': 'Colore',
      'categoria': 'Categoria',
      'schema_json': 'Schema JSON',
      'dati': 'Dati',
      'doc_tecnica': 'Doc. Tecnica',
      // Magazzino
      'asset_tipo': 'Tipo Asset',
      'id_ricambio': 'ID Ricambio',
      'costruttore': 'Costruttore',
      'modello': 'Modello',
      'codice_produttore': 'Codice Produttore',
      'fornitore': 'Fornitore',
      'unita_misura': 'Unità',
      'quantita_disponibile': 'Quantità Disp.',
      'quantita_minima': 'Quantità Min.',
      'prezzo_unitario': 'Prezzo Unit.',
      'valore_stock': 'Valore Stock',
      'stato_disponibilita': 'Stato',
      // Files
      'nome_file': 'Nome File',
      'percorso_relativo': 'Percorso',
      'cartella': 'Cartella',
      'estensione': 'Tipo',
      'dimensione_bytes': 'Dimensione (byte)',
      'dimensione_mb': 'Dimensione (MB)',
      'data_modifica': 'Data Modifica',
      'tipo_file': 'Categoria',
      'origine': 'Origine',
      'asset_associato': 'Asset Associato',
      'civico_associato': 'Civico'
    };
    return headerMap[header] || header.replace('_', ' ').toUpperCase();
  };

  const formatValue = (header, value) => {
    if (!value && value !== 0 && value !== false) return '-';
    
    // Gestione valori booleani
    if (header === 'is_active') {
      return value ? 'Sì' : 'No';
    }
    
    // Gestione delle date con controllo di validità
    if (header.includes('data') || header.includes('created') || header.includes('updated')) {
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return value; // Se non è una data valida, restituisci il valore originale
        }
        
        if (value.includes('T')) {
          return date.toLocaleString('it-IT');
        }
        return date.toLocaleDateString('it-IT');
      } catch (error) {
        return value; // In caso di errore, restituisci il valore originale
      }
    }
    
    // Gestione dei dati JSON per form_data (mantenere per compatibilità)
    if (header === 'form_data' || header === 'dati' || header === 'schema_json') {
      try {
        const parsed = JSON.parse(value);
        return Object.keys(parsed).length > 0 ? '📋 Dati presenti' : '📋 Vuoto';
      } catch {
        return value;
      }
    }
    
    // Per form_data_preview, mostra direttamente il valore (già formattato dal backend)
    if (header === 'form_data_preview') {
      return value || 'Nessun dato';
    }
    
    // Gestione campi specifici del magazzino
    if (header === 'prezzo_unitario' || header === 'valore_stock') {
      return `€ ${parseFloat(value).toFixed(2)}`;
    }
    
    if (header === 'quantita_disponibile' || header === 'quantita_minima') {
      return `${parseInt(value)}`;
    }
    
    if (header === 'stato_disponibilita') {
      const statusColors = {
        'Disponibile': '✅',
        'Scarsa': '⚠️', 
        'Esaurito': '❌'
      };
      return `${statusColors[value] || ''} ${value}`;
    }
    
    // Gestione campi specifici per la sezione files
    if (header === 'tipo_file') {
      const typeIcons = {
        'asset': '⚙️',
        'form': '📋',
        'pianta': '🏠'
      };
      return `${typeIcons[value] || '📄'} ${value}`;
    }
    
    if (header === 'estensione') {
      const extIcons = {
        'pdf': '📄',
        'jpg': '🖼️',
        'jpeg': '🖼️',
        'png': '🖼️',
        'gif': '🖼️',
        'doc': '📝',
        'docx': '📝',
        'xls': '📊',
        'xlsx': '📊',
        'txt': '📝'
      };
      return `${extIcons[value] || '📎'} ${value?.toUpperCase()}`;
    }
    
    if (header === 'dimensione_mb') {
      const size = parseFloat(value);
      if (size < 0.1) return '< 0.1 MB';
      return `${size.toFixed(1)} MB`;
    }
    
    if (header === 'asset_associato' && value && typeof value === 'object') {
      return `${value.id_aziendale} (${value.tipo})`;
    }
    
    if (header === 'nome_file' && (activeSection === 'files' || activeSection === 'allegati')) {
      // Mostra solo il nome del file (senza path) con icona di download
      return (
        <span className="file-name-cell">
          📎 {value}
        </span>
      );
    }
    
    // Tronca stringhe lunghe
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    
    return value;
  };

  const renderDeleteModal = () => {
    if (!showDeleteModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Conferma Cancellazione</h3>
            <button onClick={() => setShowDeleteModal(false)} className="modal-close">
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            <p>Sei sicuro di voler cancellare {selectedRecords.length} record?</p>
            <p><strong>Questa operazione non può essere annullata.</strong></p>
          </div>
          
          <div className="modal-footer">
            <button onClick={handleDeleteRecords} className="btn-danger">
              🗑️ Cancella
            </button>
            <button onClick={() => setShowDeleteModal(false)} className="btn-secondary">
              ❌ Annulla
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCleanupModal = () => {
    if (!showCleanupModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Pulizia Automatica</h3>
            <button onClick={() => setShowCleanupModal(false)} className="modal-close">
              ✕
            </button>
          </div>
          
          <div className="modal-body">
            {(activeSection === 'files' || activeSection === 'allegati') ? (
              <>
                <p>🧹 <strong>Pulizia File Orfani</strong></p>
                <p>Rimuovi i file che non sono più associati a nessun record nel database.</p>
                <div className="cleanup-warning">
                  ⚠️ <strong>Attenzione:</strong> Questa operazione non può essere annullata.
                </div>
                <div className="cleanup-options">
                  <button onClick={() => handleCleanup()} className="btn-cleanup-option">
                    🗑️ Elimina File Orfani
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>Cancella i record completati più vecchi di:</p>
                <div className="cleanup-options">
                  <button onClick={() => handleCleanup(30)} className="btn-cleanup-option">
                    30 giorni
                  </button>
                  <button onClick={() => handleCleanup(60)} className="btn-cleanup-option">
                    60 giorni
                  </button>
                  <button onClick={() => handleCleanup(90)} className="btn-cleanup-option">
                    90 giorni
                  </button>
                  <button onClick={() => handleCleanup(180)} className="btn-cleanup-option">
                    180 giorni
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button onClick={() => setShowCleanupModal(false)} className="btn-secondary">
              ❌ Annulla
            </button>
          </div>
        </div>
      </div>
    );
  };

  const activeData = sections.find(s => s.key === activeSection);

  // Renderizza la vista principale con lista sezioni
  const renderSectionsList = () => (
    <div className="docs-sections-list">
      <div className="sections-grid">
        {sections.map(section => (
          <div
            key={section.key}
            className="docs-section-card"
            onClick={() => handleSectionChange(section.key)}
          >
            <div className="section-card-icon">{section.icon}</div>
            <div className="section-card-content">
              <h3 className="section-card-title">{section.label}</h3>
              <p className="section-card-description">{section.description}</p>
            </div>
            <div className="section-card-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Renderizza la vista dettaglio di una sezione
  const renderSectionDetail = () => (
    <div className="docs-section-detail">
      <div className="section-detail-header">
        <button 
          onClick={handleBackToSections}
          className="btn-back"
        >
          ← Indietro
        </button>
        <div className="section-detail-info">
          <h3>{activeData?.icon} {activeData?.label}</h3>
          <p>{activeData?.description}</p>
        </div>
      </div>

      <div className="section-detail-content">
        {loading && <div className="loading">⏳ Caricamento...</div>}
        {error && <div className="error">❌ {error}</div>}
        
        {!loading && !error && (
          <>
            {Object.keys(filterOptions).length > 0 && renderFilters()}
            {renderActions()}
            {renderTable()}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="section-container">
      <div className="section-header">
        <h1>📚 Docs</h1>
        <p>Documentazione e reportistica di sistema - {username} {isAdmin ? '(Admin)' : '(Solo lettura)'}</p>
      </div>

      <div className="section-content">
        {!activeSection ? renderSectionsList() : renderSectionDetail()}

        {renderDeleteModal()}
        {renderCleanupModal()}
      </div>
    </div>
  );
};

export default Docs;
