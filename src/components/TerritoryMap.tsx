import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Navigation, 
  MapPin, 
  PenTool, 
  Trash2
} from 'lucide-react';
import type { 
  Territory, 
  LocationItem, 
  VisitStatus, 
  MapDisplayOptions, 
  FieldNote, 
  FreehandDrawing 
} from '../types';
import { MAP_LAYERS } from '../utils/mapProviders';
import { MapControlsPanel } from './MapControlsPanel';
import { MapClickAnnotationModal } from './MapClickAnnotationModal';
import { NavigationModal } from './NavigationModal';

interface TerritoryMapProps {
  territories: Territory[];
  selectedTerritory: Territory | null;
  locations: LocationItem[];
  onSelectLocation?: (location: LocationItem) => void;
  onSelectTerritory?: (territory: Territory) => void;
  onSaveFieldNote?: (territoryId: string, note: Omit<FieldNote, 'id' | 'createdAt'>) => void;
  onDeleteFieldNote?: (territoryId: string, noteId: string) => void;
  onAddNewLocationAtPoint?: (latLng: [number, number]) => void;
  onSaveFreehandDrawing?: (territoryId: string, drawing: FreehandDrawing) => void;
  onClearFreehandDrawings?: (territoryId: string) => void;
  onStartDrawing?: () => void;
  interactive?: boolean;
}

const STATUS_COLORS: Record<VisitStatus, string> = {
  not_visited: '#64748b',
  not_at_home: '#f59e0b',
  visited: '#10b981',
  return_visit: '#0ea5e9',
  do_not_call: '#ef4444'
};

export type ActiveMapTool = 'navigate' | 'note' | 'cross' | 'pen' | 'highlight';

export const TerritoryMap: React.FC<TerritoryMapProps> = ({
  territories,
  selectedTerritory,
  locations,
  onSelectTerritory,
  onSaveFieldNote,
  onDeleteFieldNote,
  onAddNewLocationAtPoint,
  onSaveFreehandDrawing,
  onClearFreehandDrawings
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.FeatureGroup | null>(null);
  const drawingLayerGroupRef = useRef<L.FeatureGroup | null>(null);

  // Outil actif sur la carte
  const [activeTool, setActiveTool] = useState<ActiveMapTool>('navigate');
  const [drawColor, setDrawColor] = useState<string>('#ef4444'); // Rouge vif par défaut pour croix / dessin

  // Référence mutable vers l'outil actif pour les callbacks Leaflet sans stale closure
  const activeToolRef = useRef<ActiveMapTool>('navigate');
  activeToolRef.current = activeTool;
  const drawColorRef = useRef<string>('#ef4444');
  drawColorRef.current = drawColor;

  // Options de calques
  const [mapOptions, setMapOptions] = useState<MapDisplayOptions>({
    layerId: 'osm',
    showLocations: true,
    locationFilter: 'all',
    showLabels: false,
    showPolygons: true,
    showPolylines: true,
    showRectangles: false,
    showCircles: false,
    showFieldNotes: true
  });

  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [clickedLatLng, setClickedLatLng] = useState<[number, number] | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<{ latLng: [number, number]; title: string; subtitle?: string } | null>(null);
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  const targetTerritoryId = selectedTerritory ? selectedTerritory.id : (territories[0]?.id || 'terr-01');

  const showToast = (msg: string) => {
    setLastActionToast(msg);
    setTimeout(() => setLastActionToast(null), 3000);
  };

  // Traitement universel du clic sur la carte ou sur un polygone
  const handleMapPointClick = (latLng: [number, number]) => {
    const currentTool = activeToolRef.current;
    const currentColor = drawColorRef.current;

    if (currentTool === 'cross') {
      // Pose immédiate d'une croix rouge à cet endroit précis !
      if (onSaveFieldNote) {
        onSaveFieldNote(targetTerritoryId, {
          territoryId: targetTerritoryId,
          latLng,
          title: 'Croix repère (❌)',
          content: 'Point marqué d une croix',
          iconType: 'cross',
          color: currentColor
        });
        showToast('✓ Croix ❌ posée à l\'endroit cliqué !');
      }
      return;
    }

    if (currentTool === 'note') {
      // Ouvre immédiatement la modale pour noter (ex: 47 rue Pasteur)
      setClickedLatLng(latLng);
      return;
    }

    // Si on est en mode navigation mais qu'on a cliqué
    // Si l'utilisateur clique alors qu'aucun outil spécifique n'est actif, on n'interrompt pas la navigation
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView([45.7624, 4.8276], 14);

      // Couche tuiles
      const initialLayerConfig = MAP_LAYERS[mapOptions.layerId] || MAP_LAYERS.osm;
      const initialTile = L.tileLayer(initialLayerConfig.url, {
        maxZoom: initialLayerConfig.maxZoom,
        subdomains: initialLayerConfig.subdomains || ['a', 'b', 'c']
      }).addTo(map);

      tileLayerRef.current = initialTile;

      const layersGroup = L.featureGroup().addTo(map);
      layersGroupRef.current = layersGroup;

      const drawingGroup = L.featureGroup().addTo(map);
      drawingLayerGroupRef.current = drawingGroup;

      mapInstanceRef.current = map;

      // Variables d'état pour le tracé en direct
      let isMouseDown = false;
      let currentTracePoints: [number, number][] = [];
      let tempPolyline: L.Polyline | null = null;

      // Événements clic et tracé direct
      map.on('click', (e: L.LeafletMouseEvent) => {
        const tool = activeToolRef.current;
        if (tool === 'cross' || tool === 'note') {
          handleMapPointClick([e.latlng.lat, e.latlng.lng]);
        }
      });

      map.on('mousedown', (e: L.LeafletMouseEvent) => {
        const tool = activeToolRef.current;
        if (tool === 'pen' || tool === 'highlight') {
          isMouseDown = true;
          currentTracePoints = [[e.latlng.lat, e.latlng.lng]];
          tempPolyline = L.polyline(currentTracePoints, {
            color: drawColorRef.current,
            weight: tool === 'highlight' ? 9 : 4,
            opacity: tool === 'highlight' ? 0.6 : 1,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(drawingGroup);
        }
      });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        const tool = activeToolRef.current;
        if (isMouseDown && (tool === 'pen' || tool === 'highlight') && tempPolyline) {
          currentTracePoints.push([e.latlng.lat, e.latlng.lng]);
          tempPolyline.setLatLngs(currentTracePoints);
        }
      });

      map.on('mouseup', () => {
        const tool = activeToolRef.current;
        if (isMouseDown && (tool === 'pen' || tool === 'highlight')) {
          isMouseDown = false;
          if (currentTracePoints.length > 1 && onSaveFreehandDrawing) {
            onSaveFreehandDrawing(targetTerritoryId, {
              id: 'draw-' + Date.now(),
              type: 'path',
              points: currentTracePoints,
              color: drawColorRef.current,
              width: tool === 'highlight' ? 8 : 3
            });
            showToast('✓ Tracé enregistré sur le territoire !');
          }
          currentTracePoints = [];
          tempPolyline = null;
        }
      });
    }

    return () => {
      // Nettoyage Leaflet
    };
  }, []);

  // Gestion du curseur et de la désactivation du drag en mode dessin
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return;

    if (activeTool === 'pen' || activeTool === 'highlight') {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      container.style.cursor = 'crosshair';
    } else if (activeTool === 'cross' || activeTool === 'note') {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      container.style.cursor = 'crosshair';
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      container.style.cursor = '';
    }
  }, [activeTool]);

  // Changement de fond de carte
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const config = MAP_LAYERS[mapOptions.layerId] || MAP_LAYERS.osm;
    const tileUrl = mapOptions.layerId === 'custom' && mapOptions.customTileUrl ? mapOptions.customTileUrl : config.url;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || ['a', 'b', 'c']
    }).addTo(map);

    tileLayerRef.current = newTileLayer;
  }, [mapOptions.layerId, mapOptions.customTileUrl]);

  // Rendu de tous les calques, territoires, adresses, dessins et croix
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    const drawGroup = drawingLayerGroupRef.current;
    if (!map || !group || !drawGroup) return;

    group.clearLayers();
    drawGroup.clearLayers();

    const territoriesToDraw = selectedTerritory ? [selectedTerritory] : territories;

    // 1. Dessins vectoriels manuscrits libres (freehandDrawings)
    territoriesToDraw.forEach(terr => {
      if (terr.freehandDrawings) {
        terr.freehandDrawings.forEach(d => {
          if (d.points && d.points.length > 0) {
            const line = L.polyline(d.points, {
              color: d.color || '#ef4444',
              weight: d.width || 3,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            });
            drawGroup.addLayer(line);
          }
        });
      }
    });

    // 2. Polygones des territoires
    if (mapOptions.showPolygons) {
      territoriesToDraw.forEach(terr => {
        if (!terr.boundary || terr.boundary.length === 0) return;

        const isSelected = selectedTerritory?.id === terr.id;
        const polygon = L.polygon(terr.boundary, {
          color: isSelected ? '#38bdf8' : '#3b82f6',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#0284c7' : '#2563eb',
          fillOpacity: isSelected ? 0.22 : 0.12,
          dashArray: isSelected ? undefined : '4, 4'
        });

        polygon.bindTooltip(`<strong>Territoire ${terr.number}</strong><br/>${terr.label}`, {
          sticky: true,
          className: 'leaflet-tooltip-dark'
        });

        // Clic sur le polygone : si un outil est actif, on applique l'outil !
        polygon.on('click', (e: L.LeafletMouseEvent) => {
          const tool = activeToolRef.current;
          if (tool === 'cross' || tool === 'note') {
            L.DomEvent.stopPropagation(e);
            handleMapPointClick([e.latlng.lat, e.latlng.lng]);
            return;
          }
          if (tool === 'navigate') {
            L.DomEvent.stopPropagation(e);
            if (onSelectTerritory) onSelectTerritory(terr);
          }
        });

        group.addLayer(polygon);

        // Rectangles
        if (mapOptions.showRectangles) {
          const bounds = L.latLngBounds(terr.boundary);
          const rect = L.rectangle(bounds, {
            color: '#10b981',
            weight: 1.5,
            dashArray: '3, 6',
            fillColor: '#10b981',
            fillOpacity: 0.05
          });
          group.addLayer(rect);
        }

        // Polylignes
        if (mapOptions.showPolylines && terr.polylines) {
          terr.polylines.forEach(line => {
            const polyline = L.polyline(line, {
              color: '#a855f7',
              weight: 3,
              dashArray: '5, 5'
            });
            group.addLayer(polyline);
          });
        }
      });
    }

    // 3. Marqueurs d'adresses (Locations)
    if (mapOptions.showLocations) {
      const filteredLocations = (selectedTerritory 
        ? locations.filter(l => l.territoryId === selectedTerritory.id)
        : locations
      ).filter(loc => {
        if (mapOptions.locationFilter === 'all') return true;
        return loc.status === mapOptions.locationFilter || loc.units.some(u => u.status === mapOptions.locationFilter);
      });

      filteredLocations.forEach(loc => {
        const color = STATUS_COLORS[loc.status] || '#64748b';

        const customIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="
              background-color: ${color};
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid #ffffff;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 800;
              color: white;
            ">
              ${loc.number}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker(loc.latLng, { icon: customIcon });

        if (mapOptions.showLabels) {
          marker.bindTooltip(`<strong>${loc.number}</strong> ${loc.streetName}`, {
            permanent: true,
            direction: 'top',
            offset: [0, -12],
            className: 'leaflet-tooltip-dark'
          });
        }

        const statusLabels: Record<VisitStatus, string> = {
          not_visited: 'Non visité',
          not_at_home: 'Absent',
          visited: 'Visité',
          return_visit: 'Revisite',
          do_not_call: 'Ne pas appeler'
        };

        const popupContent = document.createElement('div');
        popupContent.style.minWidth = '180px';
        popupContent.style.fontFamily = 'system-ui, sans-serif';
        popupContent.innerHTML = `
          <div style="font-weight: 800; font-size: 14px; margin-bottom: 2px; color: #fff;">
            ${loc.number} ${loc.streetName}
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
            <span style="font-size: 12px; font-weight: 600; color: #cbd5e1;">${statusLabels[loc.status]}</span>
          </div>
          <div style="margin-bottom: 8px;">
            <button id="nav-btn-${loc.id}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 5px; font-size: 11px; font-weight: 700; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🧭 Itinéraire GPS
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const navBtn = document.getElementById(`nav-btn-${loc.id}`);
          if (navBtn) {
            navBtn.onclick = () => {
              setNavigationTarget({
                latLng: loc.latLng,
                title: `${loc.number} ${loc.streetName}`,
                subtitle: 'Adresse du territoire'
              });
            };
          }
        });

        group.addLayer(marker);
      });
    }

    // 4. Notes de terrain & Croix posées sur la carte (FieldNotes)
    if (mapOptions.showFieldNotes) {
      territoriesToDraw.forEach(terr => {
        if (!terr.fieldNotes) return;

        terr.fieldNotes.forEach(note => {
          const isCross = note.iconType === 'cross';

          const noteIcon = L.divIcon({
            className: 'custom-note-pin',
            html: isCross ? `
              <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                background: rgba(239, 68, 68, 0.2);
                border: 2px solid ${note.color || '#ef4444'};
                border-radius: 50%;
                box-shadow: 0 0 10px rgba(239, 68, 68, 0.6);
              ">
                <span style="color: ${note.color || '#ef4444'}; font-size: 18px; font-weight: 900; line-height: 1;">✕</span>
              </div>
            ` : `
              <div style="
                background-color: ${note.color || '#ec4899'};
                width: 24px;
                height: 24px;
                border-radius: 4px;
                transform: rotate(45deg);
                border: 2px solid #ffffff;
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div style="transform: rotate(-45deg); font-size: 11px; color: white; font-weight: bold;">
                  ${note.iconType === 'key' ? '🔑' : note.iconType === 'warning' ? '⚠️' : note.iconType === 'info' ? 'ℹ️' : note.iconType === 'star' ? '⭐' : '📌'}
                </div>
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });

          const noteMarker = L.marker(note.latLng, { icon: noteIcon });

          const noteContent = document.createElement('div');
          noteContent.style.minWidth = '180px';
          noteContent.innerHTML = `
            <div style="font-weight: 800; font-size: 13px; color: ${note.color}; margin-bottom: 4px;">
              ${note.title}
            </div>
            ${note.content ? `<div style="font-size: 12px; color: #cbd5e1; margin-bottom: 8px;">${note.content}</div>` : ''}
            <div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">
              Ajouté le ${new Date(note.createdAt).toLocaleDateString()}
            </div>
            <div style="display: flex; justify-content: space-between; gap: 6px;">
              <button id="nav-note-${note.id}" style="padding: 3px 6px; font-size: 10px; background: #0284c7; color: white; border: none; border-radius: 4px; cursor: pointer;">
                🧭 Itinéraire
              </button>
              <button id="del-note-${note.id}" style="padding: 3px 6px; font-size: 10px; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 4px; cursor: pointer;">
                Supprimer
              </button>
            </div>
          `;

          noteMarker.bindPopup(noteContent);

          noteMarker.on('popupopen', () => {
            const navBtn = document.getElementById(`nav-note-${note.id}`);
            if (navBtn) {
              navBtn.onclick = () => {
                setNavigationTarget({
                  latLng: note.latLng,
                  title: note.title,
                  subtitle: 'Note de terrain'
                });
              };
            }

            const delBtn = document.getElementById(`del-note-${note.id}`);
            if (delBtn && onDeleteFieldNote) {
              delBtn.onclick = () => {
                onDeleteFieldNote(terr.id, note.id);
                noteMarker.closePopup();
                showToast('✓ Note supprimée');
              };
            }
          });

          group.addLayer(noteMarker);
        });
      });
    }

    // Centrage initial
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { padding: [40, 40], maxZoom: 17 });
    }
  }, [
    territories, 
    selectedTerritory, 
    locations, 
    mapOptions, 
    onSelectTerritory,
    onDeleteFieldNote
  ]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Conteneur Leaflet */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Barre d'outils flottante "Terrain, Croix & Dessin" en haut au centre */}
      <div style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        background: 'rgba(13, 19, 31, 0.94)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)'
      }}>
        {/* 1. Curseur normal */}
        <button
          type="button"
          onClick={() => setActiveTool('navigate')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTool === 'navigate' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
            border: activeTool === 'navigate' ? '1px solid #38bdf8' : '1px solid transparent',
            color: activeTool === 'navigate' ? '#38bdf8' : 'var(--text-secondary)'
          }}
          title="Mode navigation / zoom libre sur la carte"
        >
          <Navigation size={15} />
          <span>Naviguer</span>
        </button>

        {/* 2. Outil Croix ❌ */}
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'cross' ? 'navigate' : 'cross')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 11px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTool === 'cross' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
            border: activeTool === 'cross' ? '1px solid #ef4444' : '1px solid transparent',
            color: activeTool === 'cross' ? '#ef4444' : 'var(--text-secondary)'
          }}
          title="Cliquez n'importe où sur la carte pour tamponner une croix ❌"
        >
          <span style={{ fontSize: '14px', fontWeight: 900 }}>✕</span>
          <span>Poser une Croix</span>
        </button>

        {/* 3. Outil Note / Repère 📌 (ex: 47 rue Pasteur) */}
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'note' ? 'navigate' : 'note')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 11px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTool === 'note' ? 'rgba(14, 165, 233, 0.25)' : 'transparent',
            border: activeTool === 'note' ? '1px solid #0ea5e9' : '1px solid transparent',
            color: activeTool === 'note' ? '#38bdf8' : 'var(--text-secondary)'
          }}
          title="Cliquez pour noter un numéro ou détail (ex: 47 rue Pasteur)"
        >
          <MapPin size={15} />
          <span>Annoter / Note</span>
        </button>

        {/* 4. Outil Crayon libre 🖊️ */}
        <button
          type="button"
          onClick={() => setActiveTool(activeTool === 'pen' ? 'navigate' : 'pen')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeTool === 'pen' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
            border: activeTool === 'pen' ? '1px solid #f59e0b' : '1px solid transparent',
            color: activeTool === 'pen' ? '#f59e0b' : 'var(--text-secondary)'
          }}
          title="Dessiner directement à main levée sur la carte avec la souris ou au doigt"
        >
          <PenTool size={15} />
          <span>Dessiner</span>
        </button>

        {/* Séparateur */}
        <div style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.15)', margin: '0 3px' }} />

        {/* Palette de couleurs rapide */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['#ef4444', '#f59e0b', '#38bdf8', '#10b981', '#a855f7'].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setDrawColor(c)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: c,
                border: drawColor === c ? '2px solid white' : '1px solid rgba(0,0,0,0.5)',
                boxShadow: drawColor === c ? '0 0 6px ' + c : 'none',
                cursor: 'pointer',
                padding: 0
              }}
              title={`Couleur ${c}`}
            />
          ))}
        </div>

        {/* Bouton Effacer tracés */}
        {onClearFreehandDrawings && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Effacer tous les tracés manuscrits dessinés sur ce territoire ?')) {
                onClearFreehandDrawings(targetTerritoryId);
                showToast('✓ Tracés effacés');
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
            title="Effacer tous les tracés manuscrits"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Bannière explicative d'outil actif */}
      {activeTool !== 'navigate' && (
        <div style={{
          position: 'absolute',
          top: 66,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: activeTool === 'cross' ? '#ef4444' : activeTool === 'pen' ? '#f59e0b' : '#0284c7',
          color: 'white',
          padding: '4px 14px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>
            {activeTool === 'cross' && '❌ Mode Croix : Cliquez n\'importe où sur un bâtiment ou une rue pour poser une croix.'}
            {activeTool === 'note' && '📌 Mode Note : Cliquez sur la carte pour renseigner une adresse ou consigne.'}
            {activeTool === 'pen' && '🖊️ Mode Dessin : Cliquez et glissez sur la carte pour tracer directement au crayon.'}
          </span>
          <button
            type="button"
            onClick={() => setActiveTool('navigate')}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast d'action */}
      {lastActionToast && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          background: 'rgba(16, 21, 34, 0.95)',
          border: '1px solid #10b981',
          color: '#10b981',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          fontWeight: 700,
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)'
        }}>
          {lastActionToast}
        </div>
      )}

      {/* Panneau de contrôle des calques & styles de carte */}
      <MapControlsPanel
        options={mapOptions}
        onOptionsChange={setMapOptions}
        isOpen={isControlsOpen}
        onToggleOpen={() => setIsControlsOpen(prev => !prev)}
        isClickToAnnotateActive={activeTool === 'note' || activeTool === 'cross'}
        onToggleClickToAnnotate={() => setActiveTool(prev => prev === 'navigate' ? 'note' : 'navigate')}
        onStartDrawing={() => setActiveTool('pen')}
      />

      {/* Modal d'annotation au clic sur la carte */}
      {clickedLatLng && (
        <MapClickAnnotationModal
          territoryId={targetTerritoryId}
          latLng={clickedLatLng}
          onSaveNote={(newNote) => {
            if (onSaveFieldNote) {
              onSaveFieldNote(targetTerritoryId, newNote);
              showToast('✓ Note enregistrée sur la carte !');
            }
          }}
          onNavigate={(targetLatLng, label) => {
            setNavigationTarget({
              latLng: targetLatLng,
              title: label
            });
          }}
          onAddNewLocationAtPoint={onAddNewLocationAtPoint}
          onStartDrawing={() => setActiveTool('pen')}
          onClose={() => setClickedLatLng(null)}
        />
      )}

      {/* Modal d'itinéraire GPS */}
      {navigationTarget && (
        <NavigationModal
          title={navigationTarget.title}
          subtitle={navigationTarget.subtitle}
          latLng={navigationTarget.latLng}
          onClose={() => setNavigationTarget(null)}
        />
      )}
    </div>
  );
};
