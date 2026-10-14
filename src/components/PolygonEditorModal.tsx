import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { X, Save, RotateCcw, Trash2 } from 'lucide-react';
import type { Territory } from '../types';

interface PolygonEditorModalProps {
  territory: Territory;
  onSaveBoundary: (territoryId: string, boundary: [number, number][], center: [number, number]) => void;
  onClose: () => void;
}

export const PolygonEditorModal: React.FC<PolygonEditorModalProps> = ({
  territory,
  onSaveBoundary,
  onClose
}) => {
  const [points, setPoints] = useState<[number, number][]>(territory.boundary || []);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = territory.centerCoordinates || [45.7624, 4.8276];
    const map = L.map(mapContainerRef.current).setView(initialCenter, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Clic sur la carte pour ajouter un sommet
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newCoord: [number, number] = [Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))];
      setPoints(prev => [...prev, newCoord]);
    });

    return () => {
      map.remove();
    };
  }, [territory]);

  // Redessiner le polygone et les poignées à chaque mise à jour de points
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }

    if (points.length > 0) {
      // Polygone
      if (points.length >= 3) {
        const poly = L.polygon(points, {
          color: '#38bdf8',
          weight: 3,
          fillColor: '#0284c7',
          fillOpacity: 0.3
        }).addTo(map);
        polygonLayerRef.current = poly;
      }

      // Marqueurs des sommets
      points.forEach((pt, index) => {
        const icon = L.divIcon({
          className: 'vertex-pin',
          html: `
            <div style="
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #38bdf8;
              border: 2px solid white;
              box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
            "></div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker(pt, { icon, draggable: true });
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          setPoints(current => {
            const copy = [...current];
            copy[index] = [Number(newPos.lat.toFixed(5)), Number(newPos.lng.toFixed(5))];
            return copy;
          });
        });

        markersGroup.addLayer(marker);
      });
    }
  }, [points]);

  const handleSave = () => {
    if (points.length < 3) {
      alert('Un polygone de territoire doit contenir au moins 3 points.');
      return;
    }

    // Calcul du centre géographique moyen
    const avgLat = points.reduce((acc, p) => acc + p[0], 0) / points.length;
    const avgLng = points.reduce((acc, p) => acc + p[1], 0) / points.length;

    onSaveBoundary(territory.id, points, [Number(avgLat.toFixed(5)), Number(avgLng.toFixed(5))]);
    onClose();
  };

  const handleRemoveLast = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleReset = () => {
    setPoints([]);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3200,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '900px', height: '90vh', display: 'flex', flexDirection: 'column', background: '#101522', position: 'relative', overflow: 'hidden' }}>
        {/* En-tête de l'éditeur */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Éditer les Frontières : Territoire {territory.number}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Cliquez sur la carte pour poser les sommets. Glissez les points bleus pour ajuster les limites.
            </p>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Carte de tracé */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Outils flottants en bas de la carte */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(10px)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: 4 }}>
              <strong>{points.length}</strong> points posés
            </span>

            <button 
              onClick={handleRemoveLast} 
              disabled={points.length === 0}
              className="btn btn-secondary" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            >
              <RotateCcw size={14} /> Annuler dernier
            </button>

            <button 
              onClick={handleReset} 
              disabled={points.length === 0}
              className="btn btn-ghost" 
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#f87171' }}
            >
              <Trash2 size={14} /> Effacer tout
            </button>

            <button 
              onClick={handleSave} 
              disabled={points.length < 3}
              className="btn btn-primary" 
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.75rem' }}
            >
              <Save size={14} /> Enregistrer la frontière
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
