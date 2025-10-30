import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Determina l'IP del backend in base all'ambiente
const getBackendTarget = () => {
  // Variabile d'ambiente per backend host (priorità massima)
  if (process.env.VITE_BACKEND_HOST) {
    const cleanHost = process.env.VITE_BACKEND_HOST.trim();
    const target = `http://${cleanHost}:5000`;
    console.log(`🌐 Backend configurato via ENV: ${target}`);
    return target;
  }
  
  // Ambiente di produzione - usa localhost
  if (process.env.NODE_ENV === 'production') {
    console.log(`🏭 Modalità produzione: Backend su localhost`);
    return 'http://127.0.0.1:5000';
  }
  
  // Sviluppo con host specificato
  const host = process.env.VITE_HOST || 'localhost';
  if (host === '0.0.0.0' || host !== 'localhost') {
    const target = 'http://172.16.1.25:5000';
    console.log(`🖥️  Modalità remota rilevata, uso IP ${target}`);
    return target;
  }
  
  // Altrimenti usa localhost per sviluppo
  const target = 'http://127.0.0.1:5000';
  console.log(`🏠 Modalità locale: Backend su ${target}`);
  return target;
};

const backendTarget = getBackendTarget();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permette l'accesso da qualsiasi IP della rete locale
    port: 5173,      // Porta fissa per coerenza con il batch file
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        timeout: 30000,  // 30 secondi per connessioni mobili lente
        proxyTimeout: 30000,
        ws: false,       // Disabilita WebSocket per evitare problemi mobile
        configure: (proxy, _options) => {
          console.log(`🔧 Proxy configurato per target: ${backendTarget}`);
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ Errore proxy:', err.message);
            console.log(`   Target configurato: ${backendTarget}`);
            console.log(`   URL effettivo tentato: ${err.address}:${err.port || 'N/A'}`);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const targetUrl = `${backendTarget}${req.url}`;
            console.log(`📡 Proxy: ${req.method} ${req.url} → ${targetUrl}`);
            console.log(`   Host header: ${proxyReq.getHeader('host')}`);
          });
        },
      },
    },
  },
})
