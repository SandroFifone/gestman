import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

// Componente principale che gestisce autenticazione
function App() {
  const [user, setUser] = useState(null); // { username, isAdmin, nome }
  const [showWelcome, setShowWelcome] = useState(false); // per welcome screen

  // Registra Service Worker per PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registrato con successo:', registration);
        })
        .catch((error) => {
          console.log('SW registrazione fallita:', error);
        });
    }
  }, []);

  // Aggiorna la funzione di autenticazione
  const handleAuth = (userData) => {
    setUser(userData);
    setShowWelcome(true); // Attiva welcome screen dopo login
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

  return (
    <Router>
      <AppContent user={user} onLogout={() => setUser(null)} />
    </Router>
  );
}

// Componente che gestisce il contenuto dell'app con routing
function AppContent({ user, onLogout }) {
  const [userSections, setUserSections] = useState([]); // sezioni accessibili all'utente
  const [currentUser, setCurrentUser] = useState(user); // Stato locale per aggiornamenti utente
  const [selectedCivico, setSelectedCivico] = useState(null); // per breadcrumb e navigazione
  const [sidebarOpen, setSidebarOpen] = useState(false); // per mobile sidebar
  const navigate = useNavigate();
  const location = useLocation();

      // Carica le sezioni utente quando il componente si monta
  useEffect(() => {
    const loadUserSections = async () => {
      if (user.isAdmin) {
        // Admin ha accesso a tutto
        setUserSections(['dashboard', 'assets', 'compilazioni', 'calendario', 'rubrica', 'alert', 'docs', 'tickets', 'magazzino']);
        return;
      }

      try {
        console.log('[DEBUG] Caricamento sezioni per utente non-admin:', user.username);
        
        const usersRes = await fetch(API_URLS.USERS);
        console.log('[DEBUG] Users API response status:', usersRes.status);
        
        const usersData = await usersRes.json();
        console.log('[DEBUG] Users data:', usersData);
        
        const users = usersData.users || [];
        console.log('[DEBUG] Users array:', users);
        
        const currentUser = users.find(u => u.username === user.username);
        console.log('[DEBUG] Current user found:', currentUser);
        
        if (currentUser && currentUser.id) {
          const sectionsUrl = `${API_URLS.USERS}/${currentUser.id}/sections`;
          console.log('[DEBUG] Sections URL:', sectionsUrl);
          
          const sectionsRes = await fetch(sectionsUrl);
          console.log('[DEBUG] Sections API response status:', sectionsRes.status);
          
          const sectionsData = await sectionsRes.json();
          console.log('[DEBUG] Sections data:', sectionsData);
          
          const sections = sectionsData.sections || [];
          console.log('[DEBUG] Final sections array:', sections);
          setUserSections(sections);
        } else {
          console.log('[DEBUG] No user found or no ID');
          setUserSections([]);
        }
      } catch (error) {
        console.error('Errore caricamento sezioni utente:', error);
        setUserSections([]);
      }
    };

    loadUserSections();
  }, [user]);

  // Navigazione globale al magazzino con ricambio specifico
  const navigateToMagazzino = (ricambioId = null) => {
    navigate('/magazzino');
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

  // Gestisce il tasto indietro mobile in modo più aggressivo
  useEffect(() => {
    let isNavigating = false;

    const handlePopState = () => {
      if (isNavigating) return;
      
      isNavigating = true;
      
      // Se non siamo nella home, naviga indietro nell'app
      if (location.pathname !== '/') {
        navigate(-1);
      } else {
        // Se siamo nella home, aggiungi di nuovo un entry per evitare l'uscita
        window.history.pushState(null, '', '/');
      }
      
      setTimeout(() => {
        isNavigating = false;
      }, 100);
    };

    // Aggiungi sempre un entry nella cronologia per intercettare il back
    window.history.pushState(null, '', location.pathname);
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, navigate]);

  // Previeni l'uscita accidentale dall'app
  useEffect(() => {
    const preventExit = (event) => {
      // Solo su mobile, mostra conferma prima di uscire dall'app
      if (window.innerWidth <= 768 && location.pathname !== '/') {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', preventExit);
    
    return () => {
      window.removeEventListener('beforeunload', preventExit);
    };
  }, [location.pathname]);

  // Espone la funzione globalmente per i componenti
  useEffect(() => {
    window.navigateToMagazzino = navigateToMagazzino;
    
    return () => {
      delete window.navigateToMagazzino;
    };
  }, []);



  // Navigazione da breadcrumb (rimossa)
  const handleBreadcrumbNavigate = () => {
    // Funzione vuota per compatibilità
  };

  // Navigazione da sidebar
  const handleNavigate = (newPage) => {
    navigate(newPage === 'home' ? '/' : `/${newPage}`);
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

  // Aggiorna i dati utente quando vengono modificati
  const handleUserUpdate = (updatedUser) => {
    setUser(prevUser => ({
      ...prevUser,
      ...updatedUser
    }));
  };

  return (
    <div className="app-container">
      <Topbar 
        username={currentUser.username} 
        isAdmin={currentUser.isAdmin} 
        onLogout={onLogout}
        onToggleSidebar={toggleSidebar}
        sidebarOpen={sidebarOpen}
        user={currentUser}
        onUserUpdate={handleUserUpdate}
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
          active={location.pathname === '/' ? 'home' : location.pathname.slice(1)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          userSections={userSections}
        />
        
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <Routes>
            {/* Home route - sempre disponibile */}
            <Route path="/" element={<PersonalDashboard user={user} isAdmin={user.isAdmin} />} />
            
            {/* Admin routes */}
            {user.isAdmin && (
              <>
                <Route path="/users" element={<UsersManager currentUser={user} />} />
                <Route path="/assets-manager" element={<AssetsManagerAdmin />} />
                <Route path="/ricambi-demo" element={<RicambiLinksDemo />} />
                <Route path="/form-templates" element={<FormTemplateManager />} />
                <Route path="/telegram" element={<TelegramManager sidebarOpen={sidebarOpen} />} />
              </>
            )}
            
            {/* Routes per sezioni utente */}
            {userSections.includes('magazzino') && (
              <Route path="/magazzino" element={<MagazzinoManager />} />
            )}
            {userSections.includes('assets') && (
              <Route path="/assets" element={<Assets />} />
            )}
            {userSections.includes('compilazioni') && (
              <Route path="/dynamic-compiler" element={<DynamicCompiler username={user.username} />} />
            )}
            {userSections.includes('alert') && (
              <Route path="/alert" element={<AlertScreen />} />
            )}
            {userSections.includes('rubrica') && (
              <Route path="/rubrica" element={<Rubrica />} />
            )}
            {userSections.includes('calendario') && (
              <Route path="/calendario" element={<CalendarioCompleto username={user.username} sidebarOpen={sidebarOpen} />} />
            )}
            {userSections.includes('docs') && (
              <Route path="/docs" element={<Docs username={user.username} isAdmin={user.isAdmin} />} />
            )}
            {userSections.includes('tickets') && (
              <Route path="/tickets" element={<Tickets username={user.username} />} />
            )}
            
            {/* Redirect di fallback alla home per route non trovate */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
