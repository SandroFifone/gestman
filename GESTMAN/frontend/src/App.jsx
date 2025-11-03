import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import Topbar from './components/Topbar';

import UsersManager from './components/UsersManager';
import Assets from './components/Assets';
import CiviciManager from './components/CiviciManager';
import AssetsManagerAdmin from './components/AssetsManagerAdmin';
import MagazzinoManager from './components/MagazzinoManager';
import RicambiLinksDemo from './components/RicambiLinksDemo';
import TelegramManager from './components/TelegramManager';
import CalendarioCompleto from './components/CalendarioCompleto';
import FormTemplateManager from './components/FormTemplateManager';
import DynamicCompiler from './components/DynamicCompiler';
import Rubrica from './components/Rubrica';
import PersonalDashboard from './components/PersonalDashboard';
import Docs from './components/Docs';
import Tickets from './components/Tickets';
import WelcomeScreen from './components/WelcomeScreen';
import './App.css';
import { API_URLS } from './config/api';

import AlertScreen from './components/AlertScreen';

function App() {
  const [user, setUser] = useState(null); // { username, isAdmin, nome }
  const [userSections, setUserSections] = useState([]); // sezioni accessibili all'utente
  const [page, setPage] = useState('home');
  const [selectedCivico, setSelectedCivico] = useState(null); // per breadcrumb e navigazione
  const [sidebarOpen, setSidebarOpen] = useState(false); // per mobile sidebar
  const [showWelcome, setShowWelcome] = useState(false); // per welcome screen

    // Carica le sezioni utente quando l'utente fa login
  const loadUserSections = async (userData) => {
    if (userData.isAdmin) {
      // Admin ha accesso a tutto
      setUserSections(['dashboard', 'assets', 'compilazioni', 'calendario', 'rubrica', 'alert', 'docs', 'tickets', 'magazzino']);
      return;
    }

    try {
      // Trova l'ID utente dal nome
      const usersRes = await fetch(API_URLS.USERS);
      const usersData = await usersRes.json();
      const currentUser = usersData.users.find(u => u.username === userData.username);
      
      if (currentUser) {
        const sectionsRes = await fetch(`${API_URLS.USERS}/${currentUser.id}/sections`);
        const sectionsData = await sectionsRes.json();
        const sections = sectionsData.sections || [];
        setUserSections(sections);
        
        // Rimosso auto-redirect: l'utente rimane sempre sulla home dopo il login
      }
    } catch (error) {
      console.error('Errore caricamento sezioni utente:', error);
      setUserSections([]);
    }
  };

  // Navigazione globale al magazzino con ricambio specifico
  const navigateToMagazzino = (ricambioId = null) => {
    setPage('magazzino');
    setSelectedCivico(null);
    setSidebarOpen(false);
    
    // Se è specificato un ricambio, passa l'informazione al componente
    if (ricambioId) {
      // Usa un timeout per assicurarsi che il componente sia montato
      setTimeout(() => {
        const event = new CustomEvent('highlightRicambio', { 
          detail: { ricambioId } 
        });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  // Espone la funzione globalmente per i componenti
  useEffect(() => {
    window.navigateToMagazzino = navigateToMagazzino;
    
    return () => {
      delete window.navigateToMagazzino;
    };
  }, []);

  // Aggiorna la funzione di autenticazione
  const handleAuth = (userData) => {
    setUser(userData);
    setPage('home'); // Forza sempre la home dopo il login
    setShowWelcome(true); // Attiva welcome screen dopo login
    loadUserSections(userData);
  };

  // Callback per completare il welcome screen
  const handleWelcomeComplete = () => {
    setShowWelcome(false);
  };

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  // Mostra welcome screen dopo il login
  if (showWelcome) {
    return (
      <WelcomeScreen 
        user={user} 
        onComplete={handleWelcomeComplete} 
      />
    );
  }

  // Navigazione da breadcrumb (rimossa)
  const handleBreadcrumbNavigate = () => {
    // Funzione vuota per compatibilità
  };

  // Navigazione da sidebar
  const handleNavigate = (newPage) => {
    setPage(newPage);
    setSelectedCivico(null);
    // Chiudi sidebar su mobile dopo un piccolo delay
    setTimeout(() => {
      setSidebarOpen(false);
    }, 100);
  };

  // Toggle sidebar mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app-container">
      <Topbar 
        username={user.username} 
        isAdmin={user.isAdmin} 
        onLogout={() => setUser(null)}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
      />
      
      {/* Overlay per mobile quando sidebar è aperta */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay mobile-only"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 'var(--z-modal-backdrop)',
          }}
        />
      )}
      
      <div className="app-layout">
        <Sidebar 
          isAdmin={user.isAdmin} 
          onNavigate={handleNavigate} 
          active={page}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userSections={userSections}
        />
        
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          {page === 'users' && user.isAdmin ? (
            <UsersManager currentUser={user} />
          ) : page === 'assets-manager' && user.isAdmin ? (
            <AssetsManagerAdmin />
          ) : page === 'magazzino' && userSections.includes('magazzino') ? (
            <MagazzinoManager />
          ) : page === 'ricambi-demo' && user.isAdmin ? (
            <RicambiLinksDemo />
          ) : page === 'form-templates' && user.isAdmin ? (
            <FormTemplateManager />
          ) : page === 'telegram' && user.isAdmin ? (
            <TelegramManager sidebarOpen={sidebarOpen} />
          ) : page === 'assets' ? (
            <Assets />
          ) : page === 'dynamic-compiler' ? (
            <DynamicCompiler username={user.username} />
          ) : page === 'alert' ? (
            <AlertScreen />
          ) : page === 'rubrica' ? (
            <Rubrica />
          ) : page === 'calendario' ? (
            <CalendarioCompleto username={user.username} sidebarOpen={sidebarOpen} />
          ) : page === 'docs' ? (
            <Docs username={user.username} isAdmin={user.isAdmin} />
          ) : page === 'tickets' ? (
            <Tickets username={user.username} />
          ) : (
            <PersonalDashboard user={user} isAdmin={user.isAdmin} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
