import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableBlock from './SortableBlock';

const BuilderCanvas = ({ blocks, selectedBlock, onSelectBlock, onRemoveBlock }) => {
  const { setNodeRef } = useDroppable({
    id: 'canvas-droppable',
  });

  return (
    <div className="builder-canvas" ref={setNodeRef}>
      {blocks.length === 0 ? (
        <div className="canvas-empty">
          <div className="empty-icon">📄</div>
          <h3>Canvas Vuoto</h3>
          <p>Trascina blocchi dalla sidebar per iniziare</p>
          <div className="empty-hints">
            <div className="hint">💡 Inizia con un blocco "Titolo"</div>
            <div className="hint">📊 Aggiungi una "Tabella DB" per i dati</div>
            <div className="hint">📈 Usa "Statistiche" per KPI</div>
          </div>
        </div>
      ) : (
        <SortableContext 
          items={blocks.map(b => b.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="canvas-blocks">
            {blocks.map((block, index) => (
              <SortableBlock
                key={block.id}
                block={block}
                index={index}
                isSelected={selectedBlock?.id === block.id}
                onSelect={() => onSelectBlock(block)}
                onRemove={() => onRemoveBlock(block.id)}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
};

export default BuilderCanvas;
