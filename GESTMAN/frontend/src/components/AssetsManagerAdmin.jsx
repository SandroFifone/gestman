import React, { useState } from 'react';
import AssetTypesManager from './AssetTypesManager';
import CiviciManagerAdmin from './CiviciManagerAdmin';
import './AssetsManager.css';

const AssetsManager = () => {
  const [activeTab, setActiveTab] = useState('asset-types');

  return (
    <div className="section-container">
      <div className="section-header">
        <h2>🏗️ Assets Manager</h2>
        <p>Gestione completa di tipi di asset e civici (solo amministratori)</p>
      </div>
      
      <div className="section-content">
        {/* Navigation Tabs */}
        <div className="tabs-container" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="tabs-nav">
            <button 
              className={`tab-button ${activeTab === 'asset-types' ? 'active' : ''}`}
              onClick={() => setActiveTab('asset-types')}
            >
              🏷️ Tipi Asset
            </button>
            <button 
              className={`tab-button ${activeTab === 'civici' ? 'active' : ''}`}
              onClick={() => setActiveTab('civici')}
            >
              🏢 Civici
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'asset-types' && (
          <AssetTypesManager />
        )}

        {activeTab === 'civici' && (
          <CiviciManagerAdmin />
        )}
      </div>
    </div>
  );
};

export default AssetsManager;
