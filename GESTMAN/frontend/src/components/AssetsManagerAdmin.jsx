import React, { useState } from 'react';
import AssetTypesManager from './AssetTypesManager';
import CiviciManagerAdmin from './CiviciManagerAdmin';
import './AssetsManager.css';

const AssetsManager = () => {
  const [activeTab, setActiveTab] = useState('asset-types');

  return (
    <div className="page-container">
      <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-semibold)' }}>
        🏗️ Assets Manager
      </h2>
      
      <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-xl)', fontSize: 'var(--font-size-lg)' }}>
        Gestione completa di tipi di asset e civici (solo amministratori)
      </p>
      
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
  );
};

export default AssetsManager;
