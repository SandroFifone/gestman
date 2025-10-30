import React, { useState, useEffect } from "react";
import "./Topbar.css";

const Topbar = ({ username, isAdmin, onLogout, onToggleSidebar, sidebarOpen, children }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // Gestione stato connessione (integrato dalla ConnectionStatus)
  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setConnectionError(null);
      
      const response = await fetch('/api/test-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setConnectionStatus('connected');
        setLastCheck(new Date().toLocaleTimeString());
      } else {
        setConnectionStatus('error');
        setConnectionError(`HTTP ${response.status}`);
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionError(err.message);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'error': return '#f44336';
      case 'checking': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢';
      case 'error': return '🔴';
      case 'checking': return '🟡';
      default: return '⚪';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connesso';
      case 'error': return 'Errore';
      case 'checking': return 'Verifica...';
      default: return 'Sconosciuto';
    }
  };

  return (
    <div className="topbar">
      {/* Burger menu + Logo */}
      <div className="topbar-left">
        <div className="burger-menu" onClick={onToggleSidebar}>
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="burger-icon"
          >
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="topbar-logo">
          <img 
            src="/AAM.png" 
            alt="AAM" 
            className="logo-image"
          />
        </div>
      </div>
      
      <div className="topbar-content">
        {/* Desktop: mostra tutto inline */}
        <div className="topbar-user desktop-only">
          <span>👤</span>
          <span className="topbar-username">{username}</span>
          {isAdmin && <span className="admin">Admin</span>}
        </div>
        
        {children && (
          <div className="topbar-breadcrumb tablet-up">
            📍 {children}
          </div>
        )}
      </div>
      
      {/* Desktop: elementi separati */}
      <div className="topbar-actions desktop-only">
        <div className="connection-status-desktop">
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: connectionStatus === 'connected' ? '#e8f5e8' : '#ffeaea'
            }}
          >
            <span>{getStatusIcon()}</span>
            <span style={{ fontSize: '12px', color: getStatusColor() }}>
              {getStatusText()}
            </span>
          </div>
        </div>
        <button className="topbar-logout" onClick={onLogout}>
          Logout
        </button>
      </div>

      {/* Mobile: dropdown unica con tutto */}
      <div className="topbar-dropdown mobile-only">
        <button className="topbar-dropdown-trigger" onClick={toggleDropdown}>
          <span className="connection-indicator" style={{ color: getStatusColor() }}>
            {getStatusIcon()}
          </span>
          <span className="topbar-username-mobile">{username}</span>
          <span className="dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
        </button>
        
        {dropdownOpen && (
          <>
            <div className="topbar-dropdown-overlay" onClick={() => setDropdownOpen(false)} />
            <div className="topbar-dropdown-menu">
              {/* Info utente */}
              <div className="dropdown-item dropdown-user">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>👤 {username}</span>
                    {isAdmin && <span className="admin">Admin</span>}
                  </div>
                </div>
              </div>
              
              {/* Stato connessione */}
              <div className="dropdown-item dropdown-connection">
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '500' }}>🌐 Connessione</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{getStatusIcon()}</span>
                      <span style={{ color: getStatusColor(), fontSize: '14px', fontWeight: '500' }}>
                        {getStatusText()}
                      </span>
                    </div>
                  </div>
                  {lastCheck && connectionStatus === 'connected' && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Ultimo controllo: {lastCheck}
                    </div>
                  )}
                  {connectionError && (
                    <div style={{ fontSize: '12px', color: '#f44336', marginTop: '4px' }}>
                      Errore: {connectionError}
                    </div>
                  )}
                  <button 
                    onClick={checkConnection} 
                    style={{ 
                      marginTop: '8px', 
                      padding: '4px 8px', 
                      fontSize: '12px',
                      background: '#f5f5f5',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Ricontrolla
                  </button>
                </div>
              </div>
              
              {/* Logout */}
              <div className="dropdown-item">
                <button className="dropdown-logout" onClick={onLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Topbar;
