import React, { useState, useEffect } from 'react';
import './WelcomeScreen.css';

const WelcomeScreen = ({ user, onComplete }) => {
  const [showText, setShowText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Mostra il testo dopo 1 secondo dall'inizio del video
    const textTimer = setTimeout(() => {
      setShowText(true);
    }, 1000);

    // Avvia il fade out dopo 5 secondi (lascia finire il video)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 5000);

    // Completa l'animazione dopo 6 secondi totali
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(textTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const handleVideoEnd = () => {
    // Se il video finisce prima dei 6 secondi, completa comunque
    if (!fadeOut) {
      setFadeOut(true);
      setTimeout(onComplete, 1000);
    }
  };

  return (
    <div className={`welcome-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="welcome-content">
        {/* Video di benvenuto */}
        <div className="video-container">
          <video
            autoPlay
            muted
            onEnded={handleVideoEnd}
            className="welcome-video"
          >
            <source src="/loading.mp4" type="video/mp4" />
            Il tuo browser non supporta il video.
          </video>
          
          {/* Maschera per ritagliare la forma del soggetto */}
          <div className="video-mask"></div>
        </div>

        {/* Testo di benvenuto */}
        {showText && (
          <div className="welcome-text">
            <h1 className="greeting">
              Hey Ciao <span className="username-inline">{user.nome || user.username}</span>!
            </h1>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay di sfondo */}
      <div className="welcome-overlay"></div>
    </div>
  );
};

export default WelcomeScreen;