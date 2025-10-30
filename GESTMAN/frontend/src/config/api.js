// Configurazione API per accesso locale e remoto
// Determina automaticamente l'URL del backend basandosi sull'hostname attuale

const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  // Ambiente di sviluppo
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:5000';
  }
  
  // Sviluppo con Vite dev server
  if (port === '5173') {
    return ''; // URL relativi gestiti dal proxy Vite
  }
  
  // Produzione - usa /api che viene gestito da Nginx
  if (protocol === 'https:') {
    return ''; // In produzione HTTPS, usa percorsi relativi /api
  }
  
  // Produzione HTTP - usa anche percorsi relativi /api gestiti da Nginx
  if (hostname === '192.168.1.221' || (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))) {
    return ''; // In produzione HTTP, usa percorsi relativi /api
  }
  
  // Fallback per accesso diretto in sviluppo
  return `http://${hostname}:5000`;
};

export const API_BASE_URL = getApiBaseUrl();

// Funzione helper per costruire URL dell'API
export const getApiUrl = (endpoint) => {
  // Se l'endpoint inizia con '/', rimuovilo per evitare doppie barre
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// URL delle API principali
export const API_URLS = {
  assets: `${API_BASE_URL}/api/assets`,
  civici: `${API_BASE_URL}/api/civici`,
  users: `${API_BASE_URL}/api/users`,
  register: `${API_BASE_URL}/api/register`,
  login: `${API_BASE_URL}/api/login`,
  uploads: `${API_BASE_URL}/uploads`,
  
  // API per i moduli
  calendario: `${API_BASE_URL}/api/calendario`,
  compilazioni: `${API_BASE_URL}/api/compilazioni`,
  telegram: `${API_BASE_URL}/api/telegram`,
  
  // API per form dinamici
  dynamicForms: `${API_BASE_URL}/api/dynamic-forms`,
  
  // API per asset types dinamici
  assetTypes: `${API_BASE_URL}/api/asset-types`,
  
  // API per alert e tickets
  alerts: `${API_BASE_URL}/api/alert`,
  
  // API per la rubrica
  RUBRICA_CATEGORIE: `${API_BASE_URL}/api/rubrica/categorie`,
  RUBRICA_CONTATTI: `${API_BASE_URL}/api/rubrica/contatti`,
  
  // API per la documentazione
  DOCS: `${API_BASE_URL}/api/docs`,
  CIVICI: `${API_BASE_URL}/api/civici`,
  USERS: `${API_BASE_URL}/api/users`,
  
  // API per la stampa
  PRINT_REPORT: `${API_BASE_URL}/api/docs/print-report`,
  
  BASE: API_BASE_URL
};
