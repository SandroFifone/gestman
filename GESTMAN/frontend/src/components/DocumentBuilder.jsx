import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import BlocksSidebar from './DocumentBuilder/BlocksSidebar';
import BuilderCanvas from './DocumentBuilder/BuilderCanvas';
import ConfigPanel from './DocumentBuilder/ConfigPanel';
import LivePreview from './DocumentBuilder/LivePreview';
import TemplateManager from './DocumentBuilder/TemplateManager';
import './DocumentBuilder.css';

const API_URLS = {
  DOCS: window.location.hostname === 'localhost' 
    ? 'http://localhost:5001/api/docs'
    : '/api/docs'
};

const DocumentBuilder = ({ username }) => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [databases, setDatabases] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Carica database disponibili
  useEffect(() => {
    loadDatabases();
    loadTemplates();
  }, []);

  const loadDatabases = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/databases`);
      const data = await response.json();
      setDatabases(data.databases || data);
    } catch (err) {
      console.error('Errore caricamento database:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Errore caricamento template:', err);
    }
  };

  // Aggiungi blocco al canvas
  const addBlock = (blockType) => {
    const newBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      position: blocks.length,
      config: getDefaultConfig(blockType)
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock);
  };

  // Config default per tipo blocco
  const getDefaultConfig = (type) => {
    switch (type) {
      case 'title':
        return { text: 'Titolo Documento', level: 'h1', align: 'center' };
      case 'text':
        return { content: 'Inserisci testo...', align: 'left' };
      case 'table':
        return {
          database: '',
          table: '',
          columns: [],
          filters: [],
          dateRange: null,
          orderBy: null,
          style: { alternateRows: true, borders: true, fontSize: 10 }
        };
      case 'statistics':
        return { source: null, calculations: [] };
      case 'separator':
        return { style: 'solid', thickness: 1 };
      case 'pageBreak':
        return {};
      default:
        return {};
    }
  };

  // Gestisci drag start
  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  // Gestisci drag end
  const handleDragEnd = (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    
    if (!over) return;

    // Se drag da sidebar a canvas
    if (active.id.startsWith('new-')) {
      const blockType = active.id.replace('new-', '');
      addBlock(blockType);
      return;
    }

    // Riordina blocchi nel canvas
    if (active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Aggiorna config blocco
  const updateBlockConfig = (blockId, newConfig) => {
    setBlocks(blocks.map(block => {
      if (block.id === blockId) {
        const updatedBlock = { ...block, config: newConfig };
        // Aggiorna anche selectedBlock se è lo stesso
        if (selectedBlock?.id === blockId) {
          setSelectedBlock(updatedBlock);
        }
        return updatedBlock;
      }
      return block;
    }));
    
    // Aggiorna preview se attiva
    if (showPreview) {
      updatePreview();
    }
  };

  // Rimuovi blocco
  const removeBlock = (blockId) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
    if (selectedBlock?.id === blockId) {
      setSelectedBlock(null);
    }
  };

  // Aggiorna preview live
  const updatePreview = async () => {
    if (blocks.length === 0) {
      setPreviewData(null);
      return;
    }

    try {
      const response = await fetch(`${API_URLS.DOCS}/preview-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: blocks,
          variables: {
            user: username,
            date: new Date().toISOString(),
            month: new Date().toLocaleDateString('it-IT', { month: 'long' }),
            year: new Date().getFullYear()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
      }
    } catch (err) {
      console.error('Errore preview:', err);
    }
  };

  // Salva template
  const saveTemplate = async (templateName) => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          created_by: username,
          shared: true,
          blocks: blocks
        })
      });

      if (response.ok) {
        const saved = await response.json();
        setCurrentTemplate(saved);
        loadTemplates();
        return true;
      }
    } catch (err) {
      console.error('Errore salvataggio template:', err);
    }
    return false;
  };

  // Carica template
  const loadTemplate = (template) => {
    setBlocks(template.blocks || []);
    setCurrentTemplate(template);
    setSelectedBlock(null);
  };

  // Genera PDF finale
  const generatePDF = async () => {
    try {
      const response = await fetch(`${API_URLS.DOCS}/generate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: blocks,
          variables: {
            user: username,
            date: new Date().toISOString(),
            month: new Date().toLocaleDateString('it-IT', { month: 'long' }),
            year: new Date().getFullYear()
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `documento_${Date.now()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Errore generazione PDF:', err);
    }
  };

  // Aggiorna preview quando cambiano i blocchi
  useEffect(() => {
    if (showPreview) {
      const debounce = setTimeout(() => {
        updatePreview();
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [blocks, showPreview]);

  return (
    <div className="document-builder">
      <div className="builder-header">
        <div className="header-left">
          <h2>📄 Crea Documento</h2>
          {currentTemplate && (
            <span className="current-template">Template: {currentTemplate.name}</span>
          )}
        </div>
        <div className="header-actions">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-preview">
            {showPreview ? '📝 Modifica' : '👁️ Anteprima'}
          </button>
          <TemplateManager 
            templates={templates}
            currentTemplate={currentTemplate}
            onSave={saveTemplate}
            onLoad={loadTemplate}
            onNew={() => { setBlocks([]); setCurrentTemplate(null); }}
          />
          <button onClick={generatePDF} className="btn-generate" disabled={blocks.length === 0}>
            📄 Genera PDF
          </button>
        </div>
      </div>

      <div className="builder-content">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {!showPreview ? (
            <>
              <BlocksSidebar databases={databases} />
              
              <BuilderCanvas 
                blocks={blocks}
                selectedBlock={selectedBlock}
                onSelectBlock={setSelectedBlock}
                onRemoveBlock={removeBlock}
              />

              {selectedBlock && (
                <ConfigPanel 
                  block={selectedBlock}
                  databases={databases}
                  onUpdateConfig={(config) => updateBlockConfig(selectedBlock.id, config)}
                />
              )}
            </>
          ) : (
            <LivePreview 
              blocks={blocks}
              previewData={previewData}
              loading={!previewData}
            />
          )}
          
          <DragOverlay>
            {activeDragId ? (
              <div className="drag-overlay-item">
                {activeDragId.startsWith('new-') ? (
                  <div className="draggable-block dragging-preview">
                    <span className="block-icon">
                      {activeDragId.includes('title') ? '📋' :
                       activeDragId.includes('text') ? '📝' :
                       activeDragId.includes('table') ? '📊' :
                       activeDragId.includes('statistics') ? '📈' :
                       activeDragId.includes('separator') ? '➖' : '📄'}
                    </span>
                    <span className="block-name">
                      {activeDragId.replace('new-', '').replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default DocumentBuilder;
