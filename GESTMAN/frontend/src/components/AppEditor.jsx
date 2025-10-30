import React, { useState } from 'react';
import AssetsAndCiviciEditor from './AssetsAndCiviciEditor';

function AppEditor() {
  const [activeSection, setActiveSection] = useState('forms');

  const sections = [
    {
      id: 'forms',
      title: 'Editor Form',
      icon: '📝',
      description: 'Gestisci i template dei form di compilazione'
    },
    {
      id: 'assets',
      title: 'Asset & Civici',
      icon: '🏗️',
      description: 'Configura tipologie asset e unità organizzative'
    },
    {
      id: 'schedules',
      title: 'Scadenziari',
      icon: '🗓️',
      description: 'Gestisci i template degli scadenziari'
    },
    {
      id: 'config',
      title: 'Configurazioni',
      icon: '⚙️',
      description: 'Impostazioni generali dell\'applicazione'
    }
  ];

  function FormEditor() {
    return (
      <div style={{ 
        padding: 'var(--spacing-xl)', 
        textAlign: 'center',
        background: 'var(--gray-50)',
        borderRadius: 'var(--border-radius)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-lg)' }}>
          📝 Editor Form di Compilazione
        </h2>
        <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--spacing-md)' }}>
          Gestisci i template dei form per ordinario, straordinario, programmato ed esterni.
        </p>
        <p style={{ color: 'var(--gray-500)', fontSize: 'var(--font-size-sm)' }}>
          Sezione in sviluppo - sarà disponibile nella prossima versione
        </p>
      </div>
    );
  }

  const renderSectionEditor = () => {
    switch (activeSection) {
      case 'forms':
        return <FormEditor />;
      case 'assets':
        return <AssetsAndCiviciEditor />;
      case 'schedules':
        return (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-xl)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--border-radius)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-lg)' }}>
              🗓️ Editor Scadenziari
            </h2>
            <p style={{ color: 'var(--gray-600)' }}>
              Sezione in sviluppo per la gestione degli scadenziari
            </p>
          </div>
        );
      case 'config':
        return (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-xl)',
            background: 'var(--gray-50)',
            borderRadius: 'var(--border-radius)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h2 style={{ color: 'var(--primary-color)', marginBottom: 'var(--spacing-lg)' }}>
              ⚙️ Configurazioni Avanzate
            </h2>
            <p style={{ color: 'var(--gray-600)' }}>
              Sezione in sviluppo per configurazioni di sistema
            </p>
          </div>
        );
      default:
        return <FormEditor />;
    }
  }

  return (
    <div style={{ 
      padding: 'var(--spacing-xl)', 
      maxWidth: '100%', 
      background: 'var(--white)', 
      borderRadius: 'var(--border-radius)', 
      height: 'calc(100vh - var(--topbar-height) - 2 * var(--spacing-xl))',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 'var(--spacing-xl)',
        paddingBottom: 'var(--spacing-md)',
        borderBottom: '2px solid var(--primary-color)'
      }}>
        <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>
          🛠️ App Editor
        </h1>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
          Editor universale per configurazioni GESTMAN
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-xl)'
      }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: 'var(--spacing-md)',
              background: activeSection === section.id ? 'var(--primary-color)' : 'var(--gray-50)',
              color: activeSection === section.id ? 'var(--white)' : 'var(--gray-700)',
              border: `1px solid ${activeSection === section.id ? 'var(--primary-color)' : 'var(--gray-200)'}`,
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            <div style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-xs)' }}>
              {section.icon}
            </div>
            <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
              {section.title}
            </div>
            <div style={{ 
              fontSize: 'var(--font-size-xs)', 
              opacity: activeSection === section.id ? 0.9 : 0.7 
            }}>
              {section.description}
            </div>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {renderSectionEditor()}
      </div>
    </div>
  );
};

export default AppEditor;
