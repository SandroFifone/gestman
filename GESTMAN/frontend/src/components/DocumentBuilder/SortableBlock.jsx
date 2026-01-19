import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const getBlockIcon = (type) => {
  const icons = {
    title: '📋',
    text: '📝',
    table: '📊',
    statistics: '📈',
    card: '🎴',
    separator: '➖',
    section: '📦',
    columns: '⚖️',
    spacer: '⬜',
    pageBreak: '📄'
  };
  return icons[type] || '📄';
};

const getBlockPreview = (block) => {
  // Funzione per sostituire variabili
  const replaceVars = (text) => {
    if (!text) return text;
    const now = new Date();
    const month = now.toLocaleDateString('it-IT', { month: 'long' });
    const year = now.getFullYear();
    return text
      .replace(/\{\{\s*month\s*\}\}/g, month)
      .replace(/\{\{\s*year\s*\}\}/g, year)
      .replace(/\{\{\s*user\s*\}\}/g, 'Utente');
  };

  switch (block.type) {
    case 'title':
      return replaceVars(block.config.text) || 'Titolo';
    case 'text':
      const content = block.config.content?.substring(0, 50) || 'Testo...';
      return replaceVars(content);
    case 'table':
      return `Tabella: ${block.config.table || 'Non configurata'}`;
    case 'statistics':
      return `Statistiche (${block.config.calculations?.length || 0} calcoli)`;
    case 'separator':
      return '─────────────────';
    case 'pageBreak':
      return '--- Nuova Pagina ---';
    default:
      return block.type;
  }
};

const SortableBlock = ({ block, index, isSelected, onSelect, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`canvas-block ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onSelect}
    >
      <div className="block-handle" {...attributes} {...listeners}>
        <span className="handle-icon">⋮⋮</span>
      </div>

      <div className="block-content">
        <div className="block-header">
          <div className="block-info">
            <span className="block-icon">{getBlockIcon(block.type)}</span>
            <span className="block-type">{block.type}</span>
            <span className="block-index">#{index + 1}</span>
          </div>
          <button 
            className="block-remove" 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Rimuovi blocco"
          >
            ✕
          </button>
        </div>

        <div className="block-preview">
          {getBlockPreview(block)}
        </div>

        {isSelected && (
          <div className="block-selected-indicator">
            ✓ Selezionato - Configura nel pannello destro
          </div>
        )}
      </div>
    </div>
  );
};

export default SortableBlock;
