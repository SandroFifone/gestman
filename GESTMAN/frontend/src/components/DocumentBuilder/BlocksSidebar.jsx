import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const DraggableBlock = ({ id, icon, label, description }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-${id}`,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="draggable-block"
    >
      <div className="block-icon">{icon}</div>
      <div className="block-info">
        <div className="block-label">{label}</div>
        <div className="block-description">{description}</div>
      </div>
    </div>
  );
};

const BlocksSidebar = ({ databases }) => {
  const blockTypes = [
    {
      category: '📝 Contenuto',
      blocks: [
        { id: 'title', icon: '📋', label: 'Titolo', description: 'Intestazione documento' },
        { id: 'text', icon: '📝', label: 'Testo', description: 'Paragrafo libero' },
        { id: 'separator', icon: '➖', label: 'Separatore', description: 'Linea divisoria' },
      ]
    },
    {
      category: '📊 Dati',
      blocks: [
        { id: 'table', icon: '📊', label: 'Tabella DB', description: 'Dati da database' },
        { id: 'statistics', icon: '📈', label: 'Statistiche', description: 'KPI e conteggi' },
        { id: 'card', icon: '🎴', label: 'Card Record', description: 'Singolo elemento' },
      ]
    },
    {
      category: '🎨 Layout',
      blocks: [
        { id: 'section', icon: '📦', label: 'Sezione', description: 'Container blocchi' },
        { id: 'columns', icon: '⚖️', label: 'Colonne', description: 'Layout 2/3 colonne' },
        { id: 'spacer', icon: '⬜', label: 'Spaziatore', description: 'Spazio vuoto' },
        { id: 'pageBreak', icon: '📄', label: 'Interruzione', description: 'Nuova pagina' },
      ]
    }
  ];

  return (
    <div className="blocks-sidebar">
      <div className="sidebar-header">
        <h3>🧩 Blocchi</h3>
        <p>Trascina nel canvas</p>
      </div>

      <div className="sidebar-content">
        {blockTypes.map(category => (
          <div key={category.category} className="block-category">
            <div className="category-label">{category.category}</div>
            <div className="category-blocks">
              {category.blocks.map(block => (
                <DraggableBlock key={block.id} {...block} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {databases && Object.keys(databases).length > 0 && (
        <div className="sidebar-info">
          <div className="info-label">📊 Database disponibili:</div>
          {Object.keys(databases).map(dbName => (
            <div key={dbName} className="db-info">
              {dbName} ({databases[dbName]?.tables?.length || 0} tabelle)
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlocksSidebar;
