import React, { useState, useEffect } from "react";
import "./Topbar.css";
import UserEditModal from './UserEditModal';

const Topbar = ({ username, isAdmin, onLogout, onToggleSidebar, sidebarOpen, children, user, onUserUpdate }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
    setUserMenuOpen(false); // Chiude dropdown desktop
    setDropdownOpen(false); // Chiude dropdown mobile
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    onLogout();
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
        {children && (
          <div className="topbar-breadcrumb tablet-up">
            📍 {children}
          </div>
        )}
      </div>
      
      {/* Desktop: status connessione e dropdown utente */}
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
        
        {/* Dropdown utente desktop */}
        <div className="user-dropdown-container">
          <button className="user-dropdown-trigger" onClick={toggleUserMenu}>
            <span>👤</span>
            <span className="user-name">{username}</span>
            {isAdmin && <span className="admin-badge">Admin</span>}
            <span className="dropdown-arrow">{userMenuOpen ? '▲' : '▼'}</span>
          </button>
          
          {userMenuOpen && (
            <>
              <div className="user-dropdown-overlay" onClick={() => setUserMenuOpen(false)} />
              <div className="user-dropdown-menu">
                <button className="dropdown-item" onClick={handleEditProfile}>
                  <span>⚙️</span>
                  <span>Modifica dati</span>
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout-item" onClick={handleLogout}>
                  <span>🚪</span>
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile: dropdown unica con tutto */}
      <div className="topbar-dropdown mobile-only">
        <button className="topbar-dropdown-trigger" onClick={toggleDropdown}>
          <span className="user-icon-mobile">👤</span>
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
              
              {/* Azioni utente */}
              <div className="dropdown-item">
                <button className="dropdown-action" onClick={handleEditProfile}>
                  ⚙️ Modifica dati
                </button>
              </div>
              
              <div className="dropdown-item">
                <button className="dropdown-logout" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Modal modifica dati utente */}
      <UserEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          // Assicura che i dropdown rimangano chiusi dopo la chiusura del modal
          setDropdownOpen(false);
          setUserMenuOpen(false);
        }}
        user={user}
        onUserUpdate={onUserUpdate}
      />
    </div>
  );
};

export default Topbar;
