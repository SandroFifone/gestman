import React, { useState, useEffect } from 'react';
import { API_URLS } from '../config/api';
import FormSelector from './FormSelector';
import DynamicFormRenderer from './DynamicFormRenderer';
import './DynamicCompiler.css';

const DynamicCompiler = ({ username }) => {
  const [step, setStep] = useState(1); // 1: civico, 2: asset, 3: form type, 4: form
  const [civici, setCivici] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedCivico, setSelectedCivico] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCivici();
  }, []);

  const loadCivici = async () => {
    try {
      console.log('Loading civici...');
      setLoading(true);
      const response = await fetch(`${API_URLS.civici}`);
      const data = await response.json();
      
      console.log('Civici response:', response.ok, data);
      
      if (response.ok) {
        // L'API ritorna { civici: [...] }, non direttamente l'array
        const civiciArray = data.civici || data || [];
        setCivici(civiciArray);
        console.log('Civici loaded:', civiciArray.length);
      } else {
        setError('Errore nel caricamento civici');
        console.error('Error loading civici:', data);
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAssets = async (civicoNumero) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URLS.assets}?civico=${civicoNumero}`);
      const data = await response.json();
      
      console.log('Assets response:', response.ok, data);
      
      if (response.ok) {
        // L'API potrebbe ritornare direttamente l'array o { assets: [...] }
        const assetsArray = data.assets || data || [];
        setAssets(assetsArray);
        console.log('Assets loaded:', assetsArray.length);
      } else {
        setError('Errore nel caricamento asset');
        console.error('Error loading assets:', data);
      }
    } catch (err) {
      setError('Errore di connessione');
      console.error('Connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCivicoSelect = (civicoNumero) => {
    setSelectedCivico(civicoNumero);
    setSelectedAsset(null);
    setSelectedTemplateId(null);
    setSelectedTemplate(null);
    setStep(2);
    loadAssets(civicoNumero);
  };

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setSelectedTemplateId(null);
    setSelectedTemplate(null);
    setStep(3);
  };

  const handleFormSelect = (templateId, template) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplate(template);
    setStep(4);
  };

  const handleFormSubmit = (formData) => {
    // Callback per integrazioni future con il sistema esistente
    console.log('Form submitted:', formData);
    
    // Reset per nuova compilazione
    setStep(1);
    setSelectedCivico('');
    setSelectedAsset(null);
    setSelectedTemplateId(null);
    setSelectedTemplate(null);
  };

  const resetToStep = (targetStep) => {
    setStep(targetStep);
    if (targetStep <= 1) {
      setSelectedCivico('');
      setSelectedAsset(null);
      setSelectedTemplateId(null);
      setSelectedTemplate(null);
    } else if (targetStep <= 2) {
      setSelectedAsset(null);
      setSelectedTemplateId(null);
      setSelectedTemplate(null);
    } else if (targetStep <= 3) {
      setSelectedTemplateId(null);
      setSelectedTemplate(null);
    }
    setError('');
  };

  const renderBreadcrumb = () => (
    <div className="compiler-breadcrumb">
      <button 
        className={step >= 1 ? 'active' : 'inactive'} 
        onClick={() => resetToStep(1)}
        disabled={loading}
      >
        1. Civico
      </button>
      <span className="separator">→</span>
      <button 
        className={step >= 2 ? 'active' : 'inactive'} 
        onClick={() => resetToStep(2)}
        disabled={!selectedCivico || loading}
      >
        2. Asset
      </button>
      <span className="separator">→</span>
      <button 
        className={step >= 3 ? 'active' : 'inactive'} 
        onClick={() => resetToStep(3)}
        disabled={!selectedAsset || loading}
      >
        3. Tipo Form
      </button>
      <span className="separator">→</span>
      <button 
        className={step >= 4 ? 'active' : 'inactive'} 
        disabled={!selectedTemplateId || loading}
      >
        4. Compilazione
      </button>
    </div>
  );

  const renderStepContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <p>Caricamento...</p>
        </div>
      );
    }

    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <h3>Seleziona il Civico</h3>
            <div className="civici-grid">
              {civici.map((civico) => (
                <div 
                  key={civico.numero}
                  className="civico-card"
                  onClick={() => handleCivicoSelect(civico.numero)}
                >
                  <h4>{civico.numero}</h4>
                  <p>{civico.descrizione}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>Seleziona l'Asset</h3>
            <p>Civico: <strong>{selectedCivico}</strong></p>
            
            {assets.length === 0 ? (
              <div className="no-assets">
                <p>Nessun asset trovato per questo civico</p>
                <button onClick={() => resetToStep(1)} className="btn btn-secondary">
                  Torna alla selezione civico
                </button>
              </div>
            ) : (
              <div className="assets-grid">
                {assets.map((asset) => (
                  <div 
                    key={asset.id}
                    className="asset-card"
                    onClick={() => handleAssetSelect(asset)}
                  >
                    <h4>{asset.id_aziendale}</h4>
                    <p><strong>Tipo:</strong> {asset.tipo}</p>
                    {asset.dati && (() => {
                      try {
                        const dati = JSON.parse(asset.dati);
                        return (
                          <div className="asset-details">
                            {dati.marca && <p><strong>Marca:</strong> {dati.marca}</p>}
                            {dati.modello && <p><strong>Modello:</strong> {dati.modello}</p>}
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Seleziona il Tipo di Form</h3>
            <p>
              Civico: <strong>{selectedCivico}</strong> - 
              Asset: <strong>{selectedAsset?.id_aziendale}</strong>
            </p>
            
            <FormSelector
              civicoNumero={selectedCivico}
              assetType={selectedAsset?.tipo}
              assetId={selectedAsset?.id_aziendale}
              onFormSelect={handleFormSelect}
              selectedTemplateId={selectedTemplateId}
            />
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h3>Compilazione Form</h3>
            <div className="compilation-info">
              <p>
                <strong>Civico:</strong> {selectedCivico} | 
                <strong>Asset:</strong> {selectedAsset?.id_aziendale} | 
                <strong>Form:</strong> {selectedTemplate?.nome?.replace(/_/g, ' ')}
              </p>
            </div>
            
            <DynamicFormRenderer
              templateId={selectedTemplateId}
              onSubmit={handleFormSubmit}
              username={username}
              civicoNumero={selectedCivico}
              assetId={selectedAsset?.id_aziendale}
              assetType={selectedAsset?.tipologia}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dynamic-compiler">
      <div className="compiler-header">
        <h2>🔧 Compilatore Dinamico</h2>
        <p>Sistema di compilazione form configurabile</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {renderBreadcrumb()}
      
      <div className="compiler-content">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default DynamicCompiler;
