import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api.js';

const RICAMBI_PATTERN = /\b\w+_spare\b/gi;
const API_BASE = `${API_BASE_URL}/api/magazzino`;

/**
 * Hook per gestire il riconoscimento e la validazione degli ID ricambi
 * Pattern: *_spare (es: filtro-olio_spare, cinghia_spare, F001_spare)
 */
export const useRicambiLinks = (text = '') => {
    const [ricambiCache, setRicambiCache] = useState(new Set());
    const [ricambiInfo, setRicambiInfo] = useState({});
    const [loading, setLoading] = useState(false);
    const [processedSegments, setProcessedSegments] = useState([]);
    const [error, setError] = useState(null);

    // Carica tutti gli ID ricambi esistenti per cache locale
    const loadRicambiCache = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/ricambi/all-ids`);
            if (response.ok) {
                const data = await response.json();
                setRicambiCache(new Set(data.ricambi_ids || []));
                console.log(`[RicambiLinks] Caricati ${data.ricambi_ids?.length || 0} ID ricambi in cache`);
            }
        } catch (error) {
            console.error('[RicambiLinks] Errore caricamento cache:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Inizializza cache al primo utilizzo
    useEffect(() => {
        if (ricambiCache.size === 0) {
            loadRicambiCache();
        }
    }, [ricambiCache.size, loadRicambiCache]);

    // Trova tutti gli ID ricambi in un testo
    const findRicambiInText = useCallback((text) => {
        if (!text || typeof text !== 'string') return [];
        
        const matches = text.match(RICAMBI_PATTERN);
        if (!matches) return [];
        
        // Filtra solo gli ID che esistono realmente nel database
        const validMatches = matches.filter(id => ricambiCache.has(id));
        
        // Rimuovi duplicati
        return [...new Set(validMatches)];
    }, [ricambiCache]);

    // Valida e carica info dettagliate per una lista di ID
    const validateAndLoadInfo = useCallback(async (ricambiIds) => {
        if (!ricambiIds || ricambiIds.length === 0) return {};

        try {
            // Filtra solo gli ID non ancora caricati
            const newIds = ricambiIds.filter(id => !ricambiInfo[id]);
            
            if (newIds.length === 0) {
                // Tutti gli ID sono già in cache
                return ricambiIds.reduce((acc, id) => {
                    acc[id] = ricambiInfo[id];
                    return acc;
                }, {});
            }

            const response = await fetch(`${API_BASE}/ricambi/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: newIds })
            });

            if (response.ok) {
                const data = await response.json();
                const newInfo = data.ricambi_info || {};
                
                // Aggiorna cache info
                setRicambiInfo(prev => ({ ...prev, ...newInfo }));
                
                // Restituisci info complete per tutti gli ID richiesti
                return ricambiIds.reduce((acc, id) => {
                    acc[id] = newInfo[id] || ricambiInfo[id] || null;
                    return acc;
                }, {});
            }
        } catch (error) {
            console.error('[RicambiLinks] Errore validazione:', error);
        }
        
        return {};
    }, [ricambiInfo]);

    // Funzione principale per processare un testo
    const processText = useCallback(async (text) => {
        const foundIds = findRicambiInText(text);
        
        if (foundIds.length === 0) {
            return {
                ricambiIds: [],
                ricambiInfo: {},
                hasRicambi: false
            };
        }

        const info = await validateAndLoadInfo(foundIds);
        
        return {
            ricambiIds: foundIds,
            ricambiInfo: info,
            hasRicambi: foundIds.length > 0
        };
    }, [findRicambiInText, validateAndLoadInfo]);

    // Processa automaticamente il testo quando cambia
    useEffect(() => {
        const processCurrentText = async () => {
            if (!text || typeof text !== 'string') {
                setProcessedSegments([{ type: 'text', text: text || '', id: null, info: null }]);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Trova i ricambi nel testo
                const ricambiIds = findRicambiInText(text);
                
                if (ricambiIds.length === 0) {
                    setProcessedSegments([{ type: 'text', text, id: null, info: null }]);
                    return;
                }

                // Carica le informazioni sui ricambi trovati
                const info = await validateAndLoadInfo(ricambiIds);
                
                // Divide il testo in segmenti
                const segments = [];
                let lastIndex = 0;
                let matches = [...text.matchAll(RICAMBI_PATTERN)];
                
                for (const match of matches) {
                    const ricambioId = match[0];
                    
                    // Solo se il ricambio esiste nel cache
                    if (ricambiCache.has(ricambioId)) {
                        // Aggiunge il testo prima del ricambio
                        if (match.index > lastIndex) {
                            segments.push({
                                type: 'text',
                                text: text.slice(lastIndex, match.index),
                                id: null,
                                info: null
                            });
                        }

                        // Aggiunge il segmento ricambio
                        segments.push({
                            type: 'ricambio',
                            text: ricambioId,
                            id: ricambioId,
                            info: info[ricambioId] || null
                        });

                        lastIndex = match.index + ricambioId.length;
                    }
                }

                // Aggiunge il resto del testo
                if (lastIndex < text.length) {
                    segments.push({
                        type: 'text',
                        text: text.slice(lastIndex),
                        id: null,
                        info: null
                    });
                }

                setProcessedSegments(segments);

            } catch (err) {
                console.error('[RicambiLinks] Errore processamento testo:', err);
                setError(err);
                // In caso di errore, mostra il testo normale
                setProcessedSegments([{ type: 'text', text, id: null, info: null }]);
            } finally {
                setLoading(false);
            }
        };

        processCurrentText();
    }, [text, ricambiCache, findRicambiInText, validateAndLoadInfo]);

    // Refresh cache (utile dopo operazioni CRUD sui ricambi)
    const refreshCache = useCallback(() => {
        setRicambiCache(new Set());
        setRicambiInfo({});
        loadRicambiCache();
    }, [loadRicambiCache]);

    return {
        // Dati processati (principali per il componente TextWithRicambiLinks)
        processedSegments,
        loading,
        error,
        
        // Funzioni principali
        processText,
        findRicambiInText,
        
        // Dati cache
        ricambiCache,
        ricambiInfo,
        
        // Utilità
        refreshCache,
        
        // Info pattern
        pattern: RICAMBI_PATTERN
    };
};

export default useRicambiLinks;