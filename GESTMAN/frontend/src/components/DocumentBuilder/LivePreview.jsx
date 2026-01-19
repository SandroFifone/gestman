import React from 'react';

const LivePreview = ({ blocks, previewData, loading }) => {
  if (loading) {
    return (
      <div className="live-preview loading">
        <div className="preview-loading">
          <div className="spinner"></div>
          <p>Generazione anteprima...</p>
        </div>
      </div>
    );
  }

  const renderBlock = (block, data) => {
    switch (block.type) {
      case 'title':
        return (
          <div 
            className={`preview-title ${block.config.level}`}
            style={{ textAlign: block.config.align }}
          >
            {block.config.text}
          </div>
        );

      case 'text':
        return (
          <div 
            className="preview-text"
            style={{ textAlign: block.config.align }}
          >
            {block.config.content}
          </div>
        );

      case 'table':
        const tableData = data?.tables?.[block.id];
        if (!tableData || !tableData.rows) {
          return <div className="preview-placeholder">Tabella: {block.config.table} (Dati in caricamento...)</div>;
        }

        return (
          <div className="preview-table-wrapper">
            <table className="preview-table">
              <thead>
                <tr>
                  {block.config.columns.map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {block.config.columns.map(col => (
                      <td key={col}>{row[col] ?? '-'}</td>
                    ))}
                  </tr>
                ))}
                {tableData.rows.length > 10 && (
                  <tr>
                    <td colSpan={block.config.columns.length} className="preview-more">
                      ... e altri {tableData.rows.length - 10} record
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );

      case 'statistics':
        const stats = data?.statistics?.[block.id];
        return (
          <div className="preview-statistics">
            {block.config.calculations?.map((calc, idx) => (
              <div key={idx} className="stat-item">
                <div className="stat-label">{calc.label}</div>
                <div className="stat-value">{stats?.[calc.label] || '-'}</div>
              </div>
            ))}
          </div>
        );

      case 'separator':
        return (
          <hr 
            className="preview-separator"
            style={{
              borderStyle: block.config.style,
              borderWidth: `${block.config.thickness}px`
            }}
          />
        );

      case 'pageBreak':
        return <div className="preview-page-break">─── Interruzione Pagina ───</div>;

      default:
        return <div className="preview-placeholder">{block.type}</div>;
    }
  };

  return (
    <div className="live-preview">
      <div className="preview-paper">
        <div className="preview-page">
          {blocks.map((block, index) => (
            <div key={block.id} className="preview-block">
              {renderBlock(block, previewData)}
            </div>
          ))}

          {blocks.length === 0 && (
            <div className="preview-empty">
              <p>Nessun blocco da visualizzare</p>
            </div>
          )}
        </div>
      </div>

      <div className="preview-info">
        <div className="info-item">
          📄 {blocks.length} blocchi
        </div>
        <div className="info-item">
          📊 {blocks.filter(b => b.type === 'table').length} tabelle
        </div>
        <div className="info-item">
          📈 {blocks.filter(b => b.type === 'statistics').length} statistiche
        </div>
      </div>
    </div>
  );
};

export default LivePreview;
