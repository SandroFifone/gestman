import React, { useState, useEffect } from 'react';

const ConnectionStatus = ({ compact = false }) => {
  const [status, setStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkConnection = async () => {
    try {
      setStatus('checking');
      setError(null);
      
      const response = await fetch('/api/test-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setStatus('connected');
        setLastCheck(new Date().toLocaleTimeString());
      } else {
        setStatus('error');
        setError(`HTTP ${response.status}`);
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000); // Check ogni 10 secondi
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#4caf50';
      case 'error': return '#f44336';
      case 'checking': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '🟢';
      case 'error': return '🔴';
      case 'checking': return '🟡';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connesso';
      case 'error': return 'Errore';
      case 'checking': return 'Controllo...';
      default: return 'Sconosciuto';
    }
  };

  if (compact) {
    return (
      <div 
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          border: `1px solid ${getStatusColor()}`,
        }}
        onClick={() => setShowDetails(!showDetails)}
        title={`Backend: ${getStatusText()}${lastCheck ? ` (${lastCheck})` : ''}`}
      >
        <span>{getStatusIcon()}</span>
        <span className="desktop-only">{getStatusText()}</span>
        
        {showDetails && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '4px',
            background: 'white',
            border: `2px solid ${getStatusColor()}`,
            borderRadius: '6px',
            padding: '8px',
            fontSize: '11px',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            minWidth: '150px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>{getStatusIcon()} {getStatusText()}</strong>
            </div>
            {lastCheck && <div>🕒 {lastCheck}</div>}
            {error && <div style={{color: '#f44336', marginTop: '4px'}}>❌ {error}</div>}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                checkConnection();
              }}
              style={{
                marginTop: '6px',
                padding: '2px 6px',
                fontSize: '10px',
                border: '1px solid #ccc',
                borderRadius: '3px',
                background: 'white',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔄 Test Connessione
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div>{getStatusIcon()} {getStatusText()}</div>
      {lastCheck && <div>🕒 {lastCheck}</div>}
      {error && <div style={{color: '#f44336', marginTop: '4px'}}>❌ {error}</div>}
      <button 
        onClick={checkConnection}
        style={{
          marginTop: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        🔄 Test
      </button>
    </div>
  );
};

export default ConnectionStatus;
