import React from 'react';
import { 
  Layers, 
  MapPin, 
  Tag, 
  Hexagon, 
  Share2, 
  Circle, 
  Square, 
  X,
  PenTool
} from 'lucide-react';
import type { MapDisplayOptions, MapLayerId, VisitStatus } from '../types';

interface MapControlsPanelProps {
  options: MapDisplayOptions;
  onOptionsChange: (newOptions: MapDisplayOptions) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isClickToAnnotateActive: boolean;
  onToggleClickToAnnotate: () => void;
  onStartDrawing?: () => void;
}

export const MapControlsPanel: React.FC<MapControlsPanelProps> = ({
  options,
  onOptionsChange,
  isOpen,
  onToggleOpen,
  isClickToAnnotateActive,
  onToggleClickToAnnotate,
  onStartDrawing
}) => {
  const updateOption = <K extends keyof MapDisplayOptions>(key: K, value: MapDisplayOptions[K]) => {
    onOptionsChange({
      ...options,
      [key]: value
    });
  };

  const statusFilters: { id: 'all' | VisitStatus; label: string; color: string }[] = [
    { id: 'all', label: 'Tous', color: '#94a3b8' },
    { id: 'not_visited', label: 'Non visités', color: '#64748b' },
    { id: 'not_at_home', label: 'Absents', color: '#f59e0b' },
    { id: 'visited', label: 'Visités', color: '#10b981' },
    { id: 'return_visit', label: 'Revisites', color: '#0ea5e9' },
    { id: 'do_not_call', label: 'Ne pas appeler', color: '#ef4444' }
  ];

  return (
    <>
      {/* Bouton flottant d'accès rapide sur la carte */}
      <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={onToggleOpen}
          className="btn btn-secondary"
          style={{
            background: 'rgba(16, 21, 34, 0.92)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            padding: '0.6rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.8rem',
            border: isOpen ? '1px solid #38bdf8' : '1px solid var(--border-subtle)'
          }}
          title="Fonds de carte & Affichage des calques"
        >
          <Layers size={16} color="#38bdf8" />
          <span style={{ fontWeight: 700 }}>Couches & Réglages</span>
        </button>

        <button
          onClick={onToggleClickToAnnotate}
          className={`btn ${isClickToAnnotateActive ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            background: isClickToAnnotateActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'rgba(16, 21, 34, 0.92)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
            padding: '0.6rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.8rem'
          }}
          title="Cliquez n'importe où sur la carte pour poser une note ou un repère"
        >
          <MapPin size={16} />
          <span>{isClickToAnnotateActive ? 'Clic-Note : ACTIF' : 'Annoter au clic'}</span>
        </button>

        {onStartDrawing && (
          <button
            onClick={onStartDrawing}
            className="btn btn-secondary"
            style={{
              background: 'rgba(16, 21, 34, 0.92)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
              padding: '0.6rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem'
            }}
            title="Dessiner à main levée au doigt/souris"
          >
            <PenTool size={16} color="#34d399" />
            <span>Dessiner</span>
          </button>
        )}
      </div>

      {/* Panneau latéral déroulant de réglages */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 60,
          right: 12,
          width: '320px',
          maxHeight: 'calc(100% - 80px)',
          overflowY: 'auto',
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          fontSize: '0.85rem'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
              <Layers size={18} color="#38bdf8" />
              <span>Options Cartographiques</span>
            </div>
            <button onClick={onToggleOpen} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          {/* Section 1 : Fournisseur et Style de Carte */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '6px' }}>
              Style du fond de carte
            </label>
            <select
              value={options.layerId}
              onChange={(e) => updateOption('layerId', e.target.value as MapLayerId)}
              style={{
                width: '100%',
                padding: '0.55rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '0.8rem'
              }}
            >
              <optgroup label="Standards & Minimalistes">
                <option value="osm">OpenStreetMap (Standard)</option>
                <option value="osm_fr">OpenStreetMap France</option>
                <option value="carto_light">Basique (CartoDB Positron - Clair)</option>
                <option value="carto_voyager">Coloré / Détaillé (Voyager)</option>
                <option value="esri_street">Rues Internationales (Esri)</option>
              </optgroup>
              <optgroup label="Contrasté & Nuit">
                <option value="carto_dark">Contrasté / Sombre (Dark Matter)</option>
                <option value="toner_bw">Noir & Blanc Fort Contraste</option>
                <option value="watermark">En Filigrane (Épuré)</option>
              </optgroup>
              <optgroup label="Vues Satellite Aériennes">
                <option value="esri_satellite">Satellite Esri World Imagery (HD)</option>
                <option value="google_satellite">Google Maps Satellite</option>
                <option value="google_hybrid">Google Maps Hybride (Satellite + Rues)</option>
              </optgroup>
              <optgroup label="Google Maps">
                <option value="google_roadmap">Google Maps (Plan routier)</option>
                <option value="google_terrain">Google Maps (Relief / Topo)</option>
              </optgroup>
              <optgroup label="Personnalisé">
                <option value="custom">Tuiles personnalisées (URL XYZ)</option>
              </optgroup>
            </select>

            {options.layerId === 'custom' && (
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="https://{s}.../{z}/{x}/{y}.png"
                  value={options.customTileUrl || ''}
                  onChange={(e) => updateOption('customTileUrl', e.target.value)}
                  style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'white', fontSize: '0.75rem' }}
                />
              </div>
            )}
          </div>

          {/* Section 2 : Filtre des emplacements / Adresses */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                Afficher les emplacements
              </label>
              <input
                type="checkbox"
                checked={options.showLocations}
                onChange={(e) => updateOption('showLocations', e.target.checked)}
              />
            </div>

            {options.showLocations && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px' }}>
                {statusFilters.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => updateOption('locationFilter', filter.id)}
                    style={{
                      padding: '4px 6px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: options.locationFilter === filter.id ? `1px solid ${filter.color}` : '1px solid transparent',
                      background: options.locationFilter === filter.id ? `${filter.color}33` : 'rgba(255,255,255,0.05)',
                      color: options.locationFilter === filter.id ? filter.color : 'var(--text-secondary)',
                      textAlign: 'left'
                    }}
                  >
                    &bull; {filter.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Section 3 : Formes géométriques & Calques (Polygones, Polylignes, Rectangles, Cercles, Étiquettes) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
              Formes géométriques &amp; Étiquettes
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Hexagon size={14} color="#38bdf8" /> Polygones (Frontières de territoire)
              </span>
              <input
                type="checkbox"
                checked={options.showPolygons}
                onChange={(e) => updateOption('showPolygons', e.target.checked)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Share2 size={14} color="#a855f7" /> Polylignes (Lignes de délimitation)
              </span>
              <input
                type="checkbox"
                checked={options.showPolylines}
                onChange={(e) => updateOption('showPolylines', e.target.checked)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Circle size={14} color="#f59e0b" /> Cercles (Rayons d'influence / 50m)
              </span>
              <input
                type="checkbox"
                checked={options.showCircles}
                onChange={(e) => updateOption('showCircles', e.target.checked)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Square size={14} color="#10b981" /> Rectangles (Blocs et zones)
              </span>
              <input
                type="checkbox"
                checked={options.showRectangles}
                onChange={(e) => updateOption('showRectangles', e.target.checked)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={14} color="#f43f5e" /> Étiquettes permanentes (Numéros &amp; Rues)
              </span>
              <input
                type="checkbox"
                checked={options.showLabels}
                onChange={(e) => updateOption('showLabels', e.target.checked)}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="#ec4899" /> Notes de terrain géolocalisées
              </span>
              <input
                type="checkbox"
                checked={options.showFieldNotes}
                onChange={(e) => updateOption('showFieldNotes', e.target.checked)}
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
};
