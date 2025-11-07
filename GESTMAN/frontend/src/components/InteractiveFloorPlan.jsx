import React, { useState, useEffect, useRef } from 'react';
import FloorPlanUpload from './FloorPlanUpload';
import './InteractiveFloorPlan.css';

const InteractiveFloorPlan = ({ civicoNumero, assets, onAssetMove, onAssetSelect, isAdmin }) => {
  const [draggedAsset, setDraggedAsset] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const [floorPlanImage, setFloorPlanImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [searchAssetId, setSearchAssetId] = useState('');
  const [hoveredAsset, setHoveredAsset] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Carica l'immagine della pianta se disponibile
  const loadFloorPlanImage = () => {
    const img = new Image();
    img.onload = () => {
      setFloorPlanImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.log(`Nessuna pianta trovata per civico ${civicoNumero}`);
      setFloorPlanImage(null);
      setImageLoaded(true);
    };
    img.src = `/api/civici/${civicoNumero}/pianta?t=${Date.now()}`; // Cache busting
  };

  useEffect(() => {
    if (civicoNumero) {
      setImageLoaded(false);
      loadFloorPlanImage();
    }
  }, [civicoNumero]);

  // Callback per ricaricare l'immagine dopo upload
  const handleUploadSuccess = () => {
    loadFloorPlanImage();
  };

  // Gestione drag dell'asset
  const handleAssetDragStart = (e, asset) => {
    setDraggedAsset(asset);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedAsset) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - position.x) / scale;
    const y = (e.clientY - rect.top - position.y) / scale;

    const updatedAsset = {
      ...draggedAsset,
      posizione_x: Math.round(x),
      posizione_y: Math.round(y)
    };

    onAssetMove && onAssetMove(updatedAsset);
    setDraggedAsset(null);
  };

  // Gestione zoom con pulsanti
  const handleZoomIn = () => {
    const newScale = Math.min(5, scale * 1.2);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(0.1, scale / 1.2);
    setScale(newScale);
  };

  // Rimuovo la gestione zoom con rotella
  // const handleWheel = (e) => {
  //   e.preventDefault();
  //   const delta = e.deltaY > 0 ? 0.9 : 1.1;
  //   const newScale = Math.max(0.1, Math.min(5, scale * delta));
  //   setScale(newScale);
  // };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Mouse centrale o Ctrl+click
      setIsDraggingView(true);
      setLastMousePosition({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDraggingView) {
      const deltaX = e.clientX - lastMousePosition.x;
      const deltaY = e.clientY - lastMousePosition.y;
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingView(false);
  };

  // Reset zoom e posizione
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Gestione click su asset
  const handleAssetClick = (asset, e) => {
    e.stopPropagation();
    onAssetSelect && onAssetSelect(asset);
  };

  // Filtra asset in base alla ricerca
  const getFilteredAssets = () => {
    if (!searchAssetId.trim()) return assets;
    
    const searchTerm = searchAssetId.toLowerCase();
    return assets.filter(asset => {
      const assetId = (asset.id_aziendale || asset.id || '').toString().toLowerCase();
      return assetId.includes(searchTerm);
    });
  };

  // Controlla se un asset è evidenziato dalla ricerca
  const isAssetHighlighted = (asset) => {
    if (!searchAssetId.trim()) return true; // Se non c'è filtro, tutti sono "evidenziati"
    
    const searchTerm = searchAssetId.toLowerCase();
    const assetId = (asset.id_aziendale || asset.id || '').toString().toLowerCase();
    return assetId.includes(searchTerm);
  };

  // Renderizza un asset sulla pianta
  const renderAsset = (asset) => {
    const x = asset.posizione_x || 0;
    const y = asset.posizione_y || 0;
    const highlighted = isAssetHighlighted(asset);
    
    // Colore basato sul tipo di asset
    const getAssetColor = (tipo, isHighlighted) => {
      const colors = {
        'Caldaia': '#ff6b6b',
        'Ascensore': '#4ecdc4', 
        'Portone': '#45b7d1',
        'Impianto Elettrico': '#feca57',
        'Impianto Idraulico': '#3742fa',
        'Antincendio': '#ff9ff3',
        'Fresa': '#ff8c00',
        'Tornio': '#32cd32',
        'Default': '#ddd'
      };
      
      const baseColor = colors[tipo] || colors['Default'];
      
      // Se c'è un filtro attivo ma questo asset non corrisponde, usa grigio sbiadito
      if (searchAssetId.trim() && !isHighlighted) {
        return '#e0e0e0';
      }
      
      return baseColor;
    };

    const getAssetIcon = (tipo) => {
      const icons = {
        'Caldaia': '🔥',
        'Ascensore': '🛗',
        'Portone': '🚪',
        'Impianto Elettrico': '⚡',
        'Impianto Idraulico': '🚰',
        'Antincendio': '🧯',
        'Fresa': '🔧',
        'Tornio': '⚙️'
      };
      return icons[tipo] || '📍';
    };

    return (
      <div key={asset.id || asset.id_aziendale}>
        <div
          className={`floor-plan-asset ${highlighted ? 'highlighted' : 'dimmed'}`}
          style={{
            left: `${x}px`,
            top: `${y}px`,
            backgroundColor: getAssetColor(asset.tipo, highlighted),
            transform: `scale(${Math.max(0.7, 1 / scale)})`,
            opacity: highlighted ? 1 : 0.3,
            border: highlighted && searchAssetId.trim() ? '3px solid #ff4444' : '2px solid rgba(0,0,0,0.2)',
            zIndex: highlighted ? 1000 : 1
          }}
          draggable={isAdmin}
          onDragStart={isAdmin ? (e) => handleAssetDragStart(e, asset) : null}
          onClick={(e) => handleAssetClick(asset, e)}
          onMouseEnter={() => setHoveredAsset(asset)}
          onMouseLeave={() => setHoveredAsset(null)}
        >
          <span className="asset-icon-only">
            {getAssetIcon(asset.tipo)}
          </span>
        </div>
        
        {/* Tooltip personalizzato */}
        {hoveredAsset && hoveredAsset.id === asset.id && (
          <div 
            className="asset-tooltip"
            style={{
              left: `${x + 40}px`,
              top: `${y - 10}px`,
              transform: `scale(${Math.max(0.8, 1 / scale)})`
            }}
          >
            <div className="tooltip-content">
              <strong>ID: {asset.id_aziendale || asset.id}</strong>
              <br />
              <span>Tipo: {asset.tipo}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!imageLoaded) {
    return (
      <div className="floor-plan-loading">
        <div>Caricamento pianta...</div>
      </div>
    );
  }

  return (
    <div className="floor-plan-container">
      {isAdmin && (
        <FloorPlanUpload 
          civicoNumero={civicoNumero} 
          onUploadSuccess={handleUploadSuccess}
        />
      )}
      
      <div className="floor-plan-controls">
        <div className="controls-row">
          <button onClick={resetView} className="control-btn">
            🏠 Reset Vista
          </button>
          <div className="zoom-controls">
            <button onClick={handleZoomOut} className="control-btn zoom-btn">
              ➖
            </button>
            <span className="zoom-indicator">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="control-btn zoom-btn">
              ➕
            </button>
          </div>
        </div>
        
        <div className="search-controls">
          <div className="search-input-container">
            <label htmlFor="asset-search" style={{ fontSize: '0.85rem', fontWeight: '600', marginRight: '8px' }}>
              🔍 Cerca Asset:
            </label>
            <input
              id="asset-search"
              type="text"
              placeholder="Inserisci ID asset..."
              value={searchAssetId}
              onChange={(e) => setSearchAssetId(e.target.value)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.85rem',
                width: '200px'
              }}
            />
            {searchAssetId && (
              <button 
                onClick={() => setSearchAssetId('')}
                className="control-btn"
                style={{ marginLeft: '8px', padding: '6px 10px', fontSize: '0.8rem' }}
              >
                ✕ Reset
              </button>
            )}
          </div>
          {searchAssetId && (
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
              Cercando: "<strong>{searchAssetId}</strong>" • {getFilteredAssets().filter(a => a.posizione_x !== undefined).length} trovati sulla pianta
            </div>
          )}
        </div>
        
        <div className="instructions">
          <small>
            • Passa il mouse su un indicatore per vedere l'ID
            • Trascina gli asset per posizionarli
            • Usa +/- per zoom • Ctrl+click: sposta vista
          </small>
        </div>
      </div>
      
      <div
        ref={containerRef}
        className="floor-plan-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDragOver={isAdmin ? handleDragOver : null}
        onDrop={isAdmin ? handleDrop : null}
        style={{ cursor: isDraggingView ? 'grabbing' : (isAdmin ? 'grab' : 'default') }}
      >
        <div
          className="floor-plan-content"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Immagine di sfondo se disponibile */}
          {floorPlanImage && (
            <img
              src={floorPlanImage.src}
              alt="Pianta del civico"
              className="floor-plan-background"
              draggable={false}
            />
          )}
          
          {/* Griglia di base se non c'è immagine */}
          {!floorPlanImage && (
            <div className="floor-plan-grid">
              <div className="grid-pattern"></div>
              <div className="floor-plan-placeholder">
                <h3>Pianta Civico {civicoNumero}</h3>
                <p>Trascina qui gli asset per posizionarli</p>
                <p><small>Carica un'immagine della pianta tramite l'API per avere uno sfondo</small></p>
              </div>
            </div>
          )}
          
          {/* Rendering degli asset */}
          {assets
            .filter(asset => asset.posizione_x !== undefined && asset.posizione_y !== undefined)
            .map(renderAsset)
          }
        </div>
      </div>
      
      {/* Lista asset non posizionati */}
      <div className="unpositioned-assets">
        <h4>Asset da posizionare:</h4>
        <div className="assets-list">
          {assets
            .filter(asset => asset.posizione_x === undefined || asset.posizione_y === undefined)
            .map(asset => (
              <div
                key={asset.id}
                className="unpositioned-asset"
                draggable
                onDragStart={(e) => handleAssetDragStart(e, asset)}
                onClick={(e) => handleAssetClick(asset, e)}
              >
                <span className="asset-type">{asset.tipo}</span>
                <span className="asset-name">{asset.id_aziendale || asset.id || `#${asset.id}`}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default InteractiveFloorPlan;
