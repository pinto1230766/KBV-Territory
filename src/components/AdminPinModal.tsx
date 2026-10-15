import React, { useState, useEffect } from 'react';
import { X, Delete, Lock, KeyRound } from 'lucide-react';

interface AdminPinModalProps {
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  correctPin,
  onSuccess,
  onClose
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin === correctPin) {
        onSuccess();
      } else if (nextPin.length === correctPin.length) {
        triggerError();
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const triggerError = () => {
    setError(true);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin('');
    }, 600);
  };

  // Gestion des touches du clavier physique
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, correctPin]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 4000,
      padding: '1rem'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '360px',
          padding: '2rem 1.5rem',
          background: '#0d131f',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          textAlign: 'center',
          position: 'relative',
          animation: shake ? 'shake 0.5s ease-in-out' : undefined
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4
          }}
          title="Fermer"
        >
          <X size={20} />
        </button>

        {/* Icône et En-tête */}
        <div style={{
          display: 'inline-flex',
          padding: '0.9rem',
          background: 'rgba(56, 189, 248, 0.15)',
          borderRadius: '50%',
          color: '#38bdf8',
          marginBottom: '1rem'
        }}>
          <Lock size={32} />
        </div>

        <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Accès Responsable
        </h3>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Saisissez votre code PIN pour déverrouiller la console de gestion et les découpages.
        </p>

        {/* Indicateurs de points du PIN */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}>
          {Array.from({ length: correctPin.length || 4 }).map((_, i) => {
            const isFilled = i < pin.length;
            return (
              <div
                key={i}
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: isFilled ? (error ? '#ef4444' : '#38bdf8') : 'rgba(255, 255, 255, 0.15)',
                  border: error ? '2px solid #ef4444' : (isFilled ? '2px solid #38bdf8' : '2px solid rgba(255, 255, 255, 0.25)'),
                  transition: 'all 0.15s ease'
                }}
              />
            );
          })}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
            Code PIN incorrect. Réessayez.
          </div>
        )}

        {/* Clavier numérique tactile */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.65rem',
          maxWidth: '260px',
          margin: '0 auto 1.25rem auto'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigit(num)}
              className="btn btn-secondary"
              style={{
                height: '52px',
                fontSize: '1.35rem',
                fontWeight: 700,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {num}
            </button>
          ))}

          <button
            onClick={handleClear}
            className="btn btn-ghost"
            style={{
              height: '52px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: '12px',
              color: 'var(--text-muted)'
            }}
          >
            Effacer
          </button>

          <button
            onClick={() => handleDigit('0')}
            className="btn btn-secondary"
            style={{
              height: '52px',
              fontSize: '1.35rem',
              fontWeight: 700,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="btn btn-ghost"
            style={{
              height: '52px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
            title="Effacer le dernier chiffre"
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Aide code PIN */}
        <div style={{
          fontSize: '0.74rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.35rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <KeyRound size={13} />
          <span>Code initial par défaut : <strong>1914</strong></span>
        </div>
      </div>
    </div>
  );
};
