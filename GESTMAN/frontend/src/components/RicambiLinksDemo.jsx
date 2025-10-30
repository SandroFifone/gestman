import React from 'react';
import TextWithRicambiLinks from './TextWithRicambiLinks';

// Componente di test per dimostrare l'auto-linking dei ricambi
const RicambiLinksDemo = () => {
  const testoEsempio = `Durante la manutenzione dell'asset FRESA_001, sono stati utilizzati i seguenti ricambi:
- Filtro aria principale: filtro_aria_fresa_spare
- Olio lubrificante specifico: olio_fresa_premium_spare  
- Cinghia di trasmissione: cinghia_fresa_std_spare
- Lampada LED di segnalazione: led_signal_fresa_spare

Nota: Il ricambio olio_fresa_premium_spare è in scorta minima, ordinare al più presto.
Per emergenze utilizzare il ricambio alternativo: olio_generico_spare

Controllare anche la disponibilità di: 
- viti_fissaggio_spare (per il prossimo intervento)
- filtro_secondario_spare (sostituzione programmata)

Altri codici non riconosciuti: abc123, xyz_normal (questi non dovrebbero essere linkati)`;

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #ddd'
    }}>
      <h3 style={{ color: '#333', marginBottom: '16px' }}>
        🔧 Demo Auto-linking Ricambi
      </h3>
      
      <div style={{
        backgroundColor: 'white',
        padding: '16px',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
        lineHeight: '1.6'
      }}>
        <TextWithRicambiLinks 
          text={testoEsempio}
          className="demo-content"
          showTooltips={true}
        />
      </div>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        backgroundColor: '#e8f4f8',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#2c5282'
      }}>
        <strong>💡 Come funziona:</strong><br/>
        • Gli ID che terminano con "_spare" vengono automaticamente riconosciuti<br/>
        • Hover sui link per vedere tooltip con informazioni del ricambio<br/>
        • Click sui link per navigare direttamente al magazzino<br/>
        • I ricambi non esistenti appaiono normali, quelli esistenti sono evidenziati
      </div>
    </div>
  );
};

export default RicambiLinksDemo;