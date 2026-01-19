import React from 'react';
import TitleConfig from './configs/TitleConfig';
import TextConfig from './configs/TextConfig';
import TableConfig from './configs/TableConfig';
import StatisticsConfig from './configs/StatisticsConfig';
import SeparatorConfig from './configs/SeparatorConfig';

const ConfigPanel = ({ block, databases, onUpdateConfig }) => {
  if (!block) {
    return (
      <div className="config-panel">
        <div className="config-empty">
          <div className="empty-icon">⚙️</div>
          <h4>Nessun Blocco Selezionato</h4>
          <p>Clicca su un blocco nel canvas per configurarlo</p>
        </div>
      </div>
    );
  }

  const renderConfig = () => {
    switch (block.type) {
      case 'title':
        return <TitleConfig config={block.config} onChange={onUpdateConfig} />;
      case 'text':
        return <TextConfig config={block.config} onChange={onUpdateConfig} />;
      case 'table':
        return <TableConfig config={block.config} databases={databases} onChange={onUpdateConfig} />;
      case 'statistics':
        return <StatisticsConfig config={block.config} onChange={onUpdateConfig} />;
      case 'separator':
        return <SeparatorConfig config={block.config} onChange={onUpdateConfig} />;
      case 'pageBreak':
        return <div className="config-info">Nessuna configurazione necessaria</div>;
      default:
        return <div className="config-info">Configurazione non disponibile per questo blocco</div>;
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <h3>⚙️ Configurazione</h3>
        <div className="config-block-type">
          {block.type} #{block.id.split('-')[1]}
        </div>
      </div>

      <div className="config-content">
        {renderConfig()}
      </div>
    </div>
  );
};

export default ConfigPanel;
