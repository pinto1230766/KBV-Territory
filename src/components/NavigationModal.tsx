import React from 'react';
import { X, Navigation, ExternalLink, MapPin } from 'lucide-react';
import { NAVIGATION_APPS, openNavigation } from '../utils/navigation';
import type { NavigationApp } from '../utils/navigation';

interface NavigationModalProps {
  title: string;
  subtitle?: string;
  latLng: [number, number];
  onClose: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  title,
  subtitle,
  latLng,
  onClose
}) => {
  const [lat, lng] = latLng;

  const handleLaunch = (appId: NavigationApp) => {
    openNavigation(lat, lng, appId, title);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3500,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '1.5rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', borderRadius: '10px' }}>
            <Navigation size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Choisir un itinéraire</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {title} {subtitle ? `• ${subtitle}` : ''}
            </p>
          </div>
        </div>

        <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-tertiary)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <MapPin size={14} color="#38bdf8" />
          <span>Coordonnées GPS : {lat.toFixed(5)}, {lng.toFixed(5)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
          {NAVIGATION_APPS.map(app => (
            <button
              key={app.id}
              onClick={() => handleLaunch(app.id)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{app.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{app.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{app.description}</div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--text-muted)" />
            </button>
          ))}
        </div>

        <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.85rem' }}>
          Fermer
        </button>
      </div>
    </div>
  );
};
