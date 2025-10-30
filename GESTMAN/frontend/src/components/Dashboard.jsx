import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    civici: { totale: 0, attivi: 0 },
    assets: { totale: 0, perTipo: {} },
    alert: { scadenze: 0, nonConformita: 0, totaliAperti: 0 },
    scadenze: { prossime7giorni: 0, prossime30giorni: 0, scadute: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    caricaStatistiche();
  }, []);

  const caricaStatistiche = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carica statistiche da più endpoint
      const [civiciRes, assetsRes, alertRes, scadenzeRes] = await Promise.all([
        fetch('/api/civici'),
        fetch('/api/assets'),
        fetch('/api/compilazioni/alert'),
        fetch('/api/calendario/scadenze-prossime?giorni=365')
      ]);

      if (!civiciRes.ok || !assetsRes.ok || !alertRes.ok || !scadenzeRes.ok) {
        throw new Error('Errore nel caricamento dei dati');
      }

      const [civiciData, assetsData, alertData, scadenzeData] = await Promise.all([
        civiciRes.json(),
        assetsRes.json(),
        alertRes.json(),
        scadenzeRes.json()
      ]);

      // Elabora statistiche civici
      const civiciStats = {
        totale: civiciData.civici?.length || 0,
        attivi: civiciData.civici?.filter(c => c.attivo).length || 0
      };

      // Elabora statistiche assets
      const assetsStats = {
        totale: assetsData.assets?.length || 0,
        perTipo: {}
      };

      if (assetsData.assets) {
        assetsData.assets.forEach(asset => {
          const tipo = asset.tipo || 'Non specificato';
          assetsStats.perTipo[tipo] = (assetsStats.perTipo[tipo] || 0) + 1;
        });
      }

      // Elabora statistiche alert
      const alertStats = {
        scadenze: alertData.alert?.filter(a => a.tipo === 'scadenza' && a.stato === 'aperto').length || 0,
        nonConformita: alertData.alert?.filter(a => a.tipo === 'non_conformita' && a.stato === 'aperto').length || 0,
        totaliAperti: alertData.alert?.filter(a => a.stato === 'aperto').length || 0
      };

      // Elabora statistiche scadenze
      const oggi = new Date();
      const tra7giorni = new Date(oggi.getTime() + 7 * 24 * 60 * 60 * 1000);
      const tra30giorni = new Date(oggi.getTime() + 30 * 24 * 60 * 60 * 1000);

      const scadenzeStats = {
        prossime7giorni: 0,
        prossime30giorni: 0,
        scadute: 0
      };

      if (scadenzeData.scadenze) {
        scadenzeData.scadenze.forEach(scadenza => {
          const dataScadenza = new Date(scadenza.data_scadenza);
          if (dataScadenza < oggi) {
            scadenzeStats.scadute++;
          } else if (dataScadenza <= tra7giorni) {
            scadenzeStats.prossime7giorni++;
          } else if (dataScadenza <= tra30giorni) {
            scadenzeStats.prossime30giorni++;
          }
        });
      }

      setStats({
        civici: civiciStats,
        assets: assetsStats,
        alert: alertStats,
        scadenze: scadenzeStats
      });

    } catch (err) {
      setError(err.message);
      console.error('Errore caricamento statistiche:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon, color = 'blue', trend }) => (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-header">
        <div className="stat-icon">{icon}</div>
        <div className="stat-values">
          <h3 className="stat-value">{value}</h3>
          <p className="stat-title">{title}</p>
          {subtitle && <p className="stat-subtitle">{subtitle}</p>}
        </div>
      </div>
      {trend && (
        <div className="stat-trend">
          <span className={`trend-indicator trend-${trend.direction}`}>
            {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'}
          </span>
          <span className="trend-text">{trend.text}</span>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>📊 Dashboard AAMANUTENZIONE</h1>
          <p>Caricamento statistiche...</p>
        </div>
        <div className="loading-spinner">⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>📊 Dashboard AAMANUTENZIONE</h1>
          <div className="error-message">
            ❌ Errore: {error}
            <button onClick={caricaStatistiche} className="retry-button">
              🔄 Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Dashboard AAMANUTENZIONE</h1>
        <p>Panoramica generale del sistema di gestione manutenzioni</p>
        <button onClick={caricaStatistiche} className="refresh-button">
          🔄 Aggiorna
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Statistiche Civici */}
        <div className="dashboard-section">
          <h2>🏢 Civici</h2>
          <div className="stats-row">
            <StatCard
              title="Totale Civici"
              value={stats.civici.totale}
              subtitle={`${stats.civici.attivi} attivi`}
              icon="🏢"
              color="blue"
            />
          </div>
        </div>

        {/* Statistiche Assets */}
        <div className="dashboard-section">
          <h2>⚙️ Assets</h2>
          <div className="stats-row">
            <StatCard
              title="Totale Assets"
              value={stats.assets.totale}
              subtitle={`${Object.keys(stats.assets.perTipo).length} tipologie`}
              icon="⚙️"
              color="green"
            />
          </div>
          
          {Object.keys(stats.assets.perTipo).length > 0 && (
            <div className="asset-types-breakdown">
              <h3>Distribuzione per tipo:</h3>
              <div className="asset-types-grid">
                {Object.entries(stats.assets.perTipo)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([tipo, count]) => (
                    <div key={tipo} className="asset-type-item">
                      <span className="asset-type-name">{tipo}</span>
                      <span className="asset-type-count">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Statistiche Alert */}
        <div className="dashboard-section">
          <h2>🚨 Alert Attivi</h2>
          <div className="stats-row">
            <StatCard
              title="Alert Scadenze"
              value={stats.alert.scadenze}
              icon="⏰"
              color={stats.alert.scadenze > 0 ? 'orange' : 'green'}
            />
            <StatCard
              title="Non Conformità"
              value={stats.alert.nonConformita}
              icon="🚨"
              color={stats.alert.nonConformita > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Totale Aperti"
              value={stats.alert.totaliAperti}
              icon="📋"
              color={stats.alert.totaliAperti > 0 ? 'orange' : 'green'}
            />
          </div>
        </div>

        {/* Statistiche Scadenze */}
        <div className="dashboard-section">
          <h2>📅 Scadenze</h2>
          <div className="stats-row">
            <StatCard
              title="Prossimi 7 giorni"
              value={stats.scadenze.prossime7giorni}
              icon="🔴"
              color={stats.scadenze.prossime7giorni > 0 ? 'red' : 'green'}
            />
            <StatCard
              title="Prossimi 30 giorni"
              value={stats.scadenze.prossime30giorni}
              icon="🟡"
              color={stats.scadenze.prossime30giorni > 0 ? 'orange' : 'green'}
            />
            <StatCard
              title="Scadute"
              value={stats.scadenze.scadute}
              icon="⚠️"
              color={stats.scadenze.scadute > 0 ? 'red' : 'green'}
            />
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <p>Ultimo aggiornamento: {new Date().toLocaleString('it-IT')}</p>
      </div>
    </div>
  );
};

export default Dashboard;
