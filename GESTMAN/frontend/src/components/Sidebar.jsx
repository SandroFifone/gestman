import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

// Props: isAdmin (boolean), onNavigate (function), active (string), isOpen (boolean), onClose (function), userSections (array)
const Sidebar = ({ isAdmin, onNavigate, active, isOpen, onClose, userSections = [] }) => {
  
  // Funzione per verificare se l'utente ha accesso a una sezione
  const hasAccess = (section) => {
    if (isAdmin) return true; // Admin ha accesso a tutto
    return userSections.includes(section);
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
          >
            <span className="sidebar-icon">🏠</span>
            <span>Home</span>
          </button>
        )}
        
        {hasAccess('assets') && (
          <button 
            className={active === "assets" ? "active" : ""} 
            onClick={() => onNavigate("assets")}
          >
            <span className="sidebar-icon">⚙️</span>
            <span>Assets</span>
          </button>
        )}
        
        {hasAccess('calendario') && (
          <button 
            className={active === "calendario" ? "active" : ""} 
            onClick={() => onNavigate("calendario")}
          >
            <span className="sidebar-icon">📅</span>
            <span>Calendario</span>
          </button>
        )}
        
        {hasAccess('compilazioni') && (
          <button 
            className={active === "dynamic-compiler" ? "active" : ""} 
            onClick={() => onNavigate("dynamic-compiler")}
          >
            <span className="sidebar-icon">📋</span>
            <span>Compilatore</span>
          </button>
        )}
        
        {hasAccess('alert') && (
          <button 
            className={active === "alert" ? "active" : ""} 
            onClick={() => onNavigate("alert")}
          >
            <span className="sidebar-icon">🚨</span>
            <span>Alert</span>
          </button>
        )}
        
        {hasAccess('rubrica') && (
          <button 
            className={active === "rubrica" ? "active" : ""} 
            onClick={() => onNavigate("rubrica")}
          >
            <span className="sidebar-icon">📇</span>
            <span>Rubrica</span>
          </button>
        )}
        
        {hasAccess('tickets') && (
          <button 
            className={active === "tickets" ? "active" : ""} 
            onClick={() => onNavigate("tickets")}
          >
            <span className="sidebar-icon">🎫</span>
            <span>Tickets</span>
          </button>
        )}
        
        {hasAccess('docs') && (
          <button 
            className={active === "docs" ? "active" : ""} 
            onClick={() => onNavigate("docs")}
          >
            <span className="sidebar-icon">📚</span>
            <span>Docs</span>
          </button>
        )}
        
        {hasAccess('magazzino') && (
          <button 
            className={active === "magazzino" ? "active" : ""} 
            onClick={() => onNavigate("magazzino")}
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
