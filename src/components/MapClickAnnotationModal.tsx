import React, { useState } from 'react';
import { X, MapPin, AlertTriangle, Info, Key, Star, Circle, Navigation, Plus, PenTool } from 'lucide-react';
import type { FieldNote } from '../types';

interface MapClickAnnotationModalProps {
  territoryId: string;
  latLng: [number, number];
  onSaveNote: (note: Omit<FieldNote, 'id' | 'createdAt'>) => void;
  onNavigate: (latLng: [number, number], label: string) => void;
  onAddNewLocationAtPoint?: (latLng: [number, number]) => void;
  onStartDrawing?: () => void;
  onClose: () => void;
}

export const MapClickAnnotationModal: React.FC<MapClickAnnotationModalProps> = ({
  territoryId,
  latLng,
  onSaveNote,
  onNavigate,
  onAddNewLocationAtPoint,
  onStartDrawing,
  onClose
}) => {
  const [lat, lng] = latLng;
  const [activeTab, setActiveTab] = useState<'note' | 'actions'>('note');

  // Formulaire Note
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [iconType, setIconType] = useState<FieldNote['iconType']>('pin');
  const [color, setColor] = useState('#38bdf8');

  const icons: { type: FieldNote['iconType']; label: string; icon: React.ReactNode }[] = [
    { type: 'cross', label: 'Croix (❌)', icon: <X size={16} color="#ef4444" /> },
    { type: 'pin', label: 'Repère (📌)', icon: <MapPin size={16} /> },
    { type: 'key', label: 'Accès (🔑)', icon: <Key size={16} /> },
    { type: 'warning', label: 'Attention (⚠️)', icon: <AlertTriangle size={16} /> },
    { type: 'info', label: 'Info (ℹ️)', icon: <Info size={16} /> },
    { type: 'star', label: 'Intérêt (⭐)', icon: <Star size={16} /> },
    { type: 'circle', label: 'Zone (⭕)', icon: <Circle size={16} /> },
  ];

  const presets = [
    { label: '47 Rue Pasteur', iconType: 'pin' as const, color: '#38bdf8' },
    { label: '❌ Croix repère', iconType: 'cross' as const, color: '#ef4444' },
    { label: '🔑 Digicode porte', iconType: 'key' as const, color: '#f59e0b' },
    { label: '🚪 Entrée cour arrière', iconType: 'info' as const, color: '#10b981' },
    { label: '⚠️ Chien de garde', iconType: 'warning' as const, color: '#ef4444' },
  ];

  const colors = ['#38bdf8', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveNote({
      territoryId,
      latLng,
      title: title.trim(),
      content: content.trim(),
      iconType,
      color
    });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3600,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', background: '#101522', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 800, fontSize: '1.1rem' }}>
            <MapPin size={20} />
            <span>Point cliqué sur la carte</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            GPS : {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
        </div>

        {/* Onglets d'action rapide */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('note')}
            className={`btn ${activeTab === 'note' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
          >
            Poser une note / repère
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`btn ${activeTab === 'actions' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }}
          >
            Actions rapides
          </button>
        </div>

        {activeTab === 'note' ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Suggestions rapides en 1 clic */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                Exemples rapides :
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {presets.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setTitle(p.label);
                      setIconType(p.iconType);
                      setColor(p.color);
                    }}
                    style={{
                      padding: '3px 7px',
                      borderRadius: '5px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Titre du repère (ex: 47 Rue Pasteur, Digicode, Portail...) *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ex: 47 Rue Pasteur - Code 3812"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Précisions supplémentaires (optionnel)
              </label>
              <textarea
                placeholder="Détails pour les proclamateurs qui prêcheront ce secteur..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', minHeight: '55px', resize: 'vertical' }}
              />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                ⚖️ <em>Conforme RGPD : ne noter que des indications matérielles d'accès (digicode, porte). Pas de noms de personnes ni d'opinions.</em>
              </span>
            </div>

            {/* Type d'icône */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Icône du repère
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {icons.map(item => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setIconType(item.type)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      background: iconType === item.type ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-tertiary)',
                      border: iconType === item.type ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
                      color: iconType === item.type ? '#38bdf8' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Couleur de l'épingle
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {colors.map(c => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: color === c ? '2px solid white' : '2px solid transparent',
                      boxShadow: color === c ? `0 0 8px ${c}` : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>Annuler</button>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                Enregistrer la note sur la carte
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => {
                onNavigate(latLng, 'Point sur le territoire');
                onClose();
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem' }}
            >
              <Navigation size={18} color="#38bdf8" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Lancer l'itinéraire GPS ici</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ouvrir dans Google Maps, Waze ou Apple Maps</div>
              </div>
            </button>

            {onStartDrawing && (
              <button
                onClick={() => {
                  onStartDrawing();
                  onClose();
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem' }}
              >
                <PenTool size={18} color="#10b981" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Activer le mode dessin à main levée</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dessiner ou surligner directement au doigt sur la carte</div>
                </div>
              </button>
            )}

            {onAddNewLocationAtPoint && (
              <button
                onClick={() => {
                  onAddNewLocationAtPoint(latLng);
                  onClose();
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem' }}
              >
                <Plus size={18} color="#f59e0b" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Ajouter une nouvelle adresse ici</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Créer une maison ou un immeuble à cette position GPS</div>
                </div>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
