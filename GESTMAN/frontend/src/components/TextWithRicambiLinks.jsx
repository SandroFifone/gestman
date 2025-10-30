import React from 'react';
import { useRicambiLinks } from '../hooks/useRicambiLinks';
import './TextWithRicambiLinks.css';

const TextWithRicambiLinks = ({ 
  text, 
  onRicambioClick = null,
  className = '',
  showTooltips = true 
}) => {
  const { processedSegments, loading, error } = useRicambiLinks(text);

  const handleRicambioClick = (ricambioId) => {
    if (onRicambioClick) {
      onRicambioClick(ricambioId);
    } else {
      // Comportamento di default: naviga al magazzino
      if (window.navigateToMagazzino) {
        window.navigateToMagazzino(ricambioId);
      } else {
        // Fallback: scroll o highlight nel magazzino se già aperto
        console.log('Navigazione al ricambio:', ricambioId);
      }
    }
  };

  if (loading) {
    return <span className={`text-with-ricambi-loading ${className}`}>{text}</span>;
  }

  if (error) {
    // In caso di errore, mostra il testo normale
    return <span className={className}>{text}</span>;
  }

  // Protezione per processedSegments undefined
  if (!processedSegments || !Array.isArray(processedSegments)) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`text-with-ricambi ${className}`}>
      {processedSegments.map((segment, index) => {
        if (segment.type === 'ricambio') {
          return (
            <span
              key={index}
              className="ricambio-link"
              onClick={() => handleRicambioClick(segment.id)}
              title={showTooltips && segment.info ? 
                `${segment.info.nome_ricambio || segment.id}\n` +
                `Quantità: ${segment.info.quantita || 0}\n` +
                `Fornitore: ${segment.info.fornitore || 'N/D'}\n` +
                `Prezzo: €${segment.info.prezzo || '0.00'}`
                : segment.id
              }
            >
              {segment.text}
            </span>
          );
        } else {
          return (
            <span key={index}>
              {segment.text}
            </span>
          );
        }
      })}
    </span>
  );
};

export default TextWithRicambiLinks;