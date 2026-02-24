import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

// Mappa sezioni con icone e label
export const SECTIONS_MAP = {
  home: { icon: '🏠', label: 'Home', route: 'home' },
  assets: { icon: '⚙️', label: 'Assets', route: 'assets' },
  calendario: { icon: '📅', label: 'Calendario', route: 'calendario' },
  'dynamic-compiler': { icon: '📋', label: 'Compilatore', route: 'dynamic-compiler', section: 'compilazioni' },
  alert: { icon: '🚨', label: 'Alert', route: 'alert' },
  rubrica: { icon: '📇', label: 'Rubrica', route: 'rubrica' },
  tickets: { icon: '🎫', label: 'Tickets', route: 'tickets' },
  docs: { icon: '📚', label: 'Docs', route: 'docs' },
  magazzino: { icon: '📦', label: 'Magazzino', route: 'magazzino' }
};

// Props: isAdmin (boolean), onNavigate (function), active (string), isOpen (boolean), onClose (function), userSections (array)
const Sidebar = ({ isAdmin, onNavigate, active, isOpen, onClose, userSections = [] }) => {
  
  // Debug: logga sempre i parametri ricevuti
  console.log('[DEBUG SIDEBAR] Props ricevute:', {
    isAdmin,
    userSections,
    userSectionsLength: userSections.length
  });
  
  // Funzione per rilevare se siamo su smartphone
  const isMobile = () => {
    return window.innerWidth <= 768;
  };
  
  // Funzione per verificare se l'utente ha accesso a una sezione
  const hasAccess = (section) => {
    const access = isAdmin ? true : userSections.includes(section);
    console.log(`[DEBUG SIDEBAR] hasAccess(${section}):`, access, 'userSections:', userSections);
    return access;
  };

  // Handler per drag start - salva dati della sezione
  const handleDragStart = (e, route, section) => {
    const dragData = {
      route: route,
      section: section || route,
      icon: SECTIONS_MAP[route]?.icon || '📌',
      label: SECTIONS_MAP[route]?.label || route
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    console.log('[SIDEBAR] Drag start:', dragData);
    
    // Chiudi la sidebar sempre dopo un breve delay per permettere il drop
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  return (
    <>
      {/* Backdrop per tablet portrait */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
      
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Header della sidebar con titolo e close button per mobile */}
        <div className="sidebar-header">
          <h3 className="sidebar-title">GESTMAN</h3>
          <button className="sidebar-close mobile-only" onClick={onClose}>
            ✕
          </button>
        </div>
      
      <nav className="sidebar-nav">
        {hasAccess('dashboard') && (
          <button 
            className={active === "home" ? "active" : ""} 
            onClick={() => onNavigate("home")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'home', 'dashboard')}
          >
            <span className="sidebar-icon">🏠</span>
            <span>Home</span>
          </button>
        )}
        
        {hasAccess('assets') && (
          <button 
            className={active === "assets" ? "active" : ""} 
            onClick={() => onNavigate("assets")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'assets', 'assets')}
          >
            <span className="sidebar-icon">⚙️</span>
            <span>Assets</span>
          </button>
        )}
        
        {hasAccess('calendario') && !isMobile() && (
          <button 
            className={active === "calendario" ? "active" : ""} 
            onClick={() => onNavigate("calendario")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'calendario', 'calendario')}
          >
            <span className="sidebar-icon">📅</span>
            <span>Calendario</span>
          </button>
        )}
        
        {hasAccess('compilazioni') && (
          <button 
            className={active === "dynamic-compiler" ? "active" : ""} 
            onClick={() => onNavigate("dynamic-compiler")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'dynamic-compiler', 'compilazioni')}
          >
            <span className="sidebar-icon">📋</span>
            <span>Compilatore</span>
          </button>
        )}
        
        {hasAccess('alert') && (
          <button 
            className={active === "alert" ? "active" : ""} 
            onClick={() => onNavigate("alert")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'alert', 'alert')}
          >
            <span className="sidebar-icon">🚨</span>
            <span>Alert</span>
          </button>
        )}
        
        {hasAccess('rubrica') && (
          <button 
            className={active === "rubrica" ? "active" : ""} 
            onClick={() => onNavigate("rubrica")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'rubrica', 'rubrica')}
          >
            <span className="sidebar-icon">📇</span>
            <span>Rubrica</span>
          </button>
        )}
        
        {hasAccess('tickets') && (
          <button 
            className={active === "tickets" ? "active" : ""} 
            onClick={() => onNavigate("tickets")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'tickets', 'tickets')}
          >
            <span className="sidebar-icon">🎫</span>
            <span>Tickets</span>
          </button>
        )}
        
        {hasAccess('docs') && !isMobile() && (
          <button 
            className={active === "docs" ? "active" : ""} 
            onClick={() => onNavigate("docs")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'docs', 'docs')}
          >
            <span className="sidebar-icon">📚</span>
            <span>Docs</span>
          </button>
        )}
        
        {hasAccess('magazzino') && (
          <button 
            className={active === "magazzino" ? "active" : ""} 
            onClick={() => onNavigate("magazzino")}
            draggable
            onDragStart={(e) => handleDragStart(e, 'magazzino', 'magazzino')}
          >
            <span className="sidebar-icon">📦</span>
            <span>Magazzino</span>
          </button>
        )}
        
        {/* Sezione Admin */}
        {isAdmin && (
          <div className="sidebar-admin-section">
            <button 
              className={active === "assets-manager" ? "active" : ""} 
              onClick={() => onNavigate("assets-manager")}
            >
              <span className="sidebar-icon">🏗️</span>
              <span>Assets Manager</span>
            </button>
            
            <button 
              className={active === "form-templates" ? "active" : ""} 
              onClick={() => onNavigate("form-templates")}
            >
              <span className="sidebar-icon">🔧</span>
              <span>Form Manager</span>
            </button>
            
            <button 
              className={active === "telegram" ? "active" : ""} 
              onClick={() => onNavigate("telegram")}
            >
              <span className="sidebar-icon">💬</span>
              <span>Telegram Manager</span>
            </button>
            
            <button 
              className={active === "users" ? "active" : ""} 
              onClick={() => onNavigate("users")}
            >
              <span className="sidebar-icon">👥</span>
              <span>Users Manager</span>
            </button>
          </div>
        )}
      </nav>
    </div>
    </>
  );
};

export default Sidebar;
