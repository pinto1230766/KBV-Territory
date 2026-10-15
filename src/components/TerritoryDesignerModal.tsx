import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Scissors, 
  Plus, 
  Save, 
  MapPin, 
  Download, 
  Info,
  ChevronRight
} from 'lucide-react';
import type { Territory, LocationItem, TerritoryType } from '../types';
import { 
  type LatLngTuple, 
  calculatePolygonCenter, 
  calculatePolygonArea, 
  splitPolygonByLine, 
  isPointInPolygon,
  exportCongregationToGeoJSON 
} from '../utils/geometry';

interface TerritoryDesignerModalProps {
  territories: Territory[];
  locations: LocationItem[];
  onSaveTerritories: (updatedTerritories: Territory[], updatedLocations: LocationItem[]) => Promise<void>;
  onClose: () => void;
}

// Palette de couleurs distinctives pour la carte de la congrégation
const TERRITORY_COLORS = [
  '#0284c7', // Bleu ciel
  '#10b981', // Émeraude
  '#f59e0b', // Ambre
  '#8b5cf6', // Violet
  '#ec4899', // Rose
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export const TerritoryDesignerModal: React.FC<TerritoryDesignerModalProps> = ({
  territories: initialTerritories,
  locations: initialLocations,
  onSaveTerritories,
  onClose
}) => {
  // Copies locales de travail
  const [territories, setTerritories] = useState<Territory[]>(initialTerritories);
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);
  
  // Outil actif : 'select' (éditer sommets), 'split' (découper au cutter), 'draw' (nouveau territoire)
  const [tool, setTool] = useState<'select' | 'split' | 'draw'>('select');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(initialTerritories[0]?.id || null);

  // État de la découpe (Cutter / Split)
  const [cutPoints, setCutPoints] = useState<LatLngTuple[]>([]);
  const [splitPreview, setSplitPreview] = useState<{
    targetTerritory: Territory;
    polyA: LatLngTuple[];
    polyB: LatLngTuple[];
    nameA: string;
    numA: string;
    nameB: string;
    numB: string;
  } | null>(null);

  // État de dessin d'un nouveau territoire (Draw)
  const [newDrawPoints, setNewDrawPoints] = useState<LatLngTuple[]>([]);
  const [newTerritoryDetails, setNewTerritoryDetails] = useState<{
    number: string;
    label: string;
    type: TerritoryType;
  } | null>(null);

  // Statut de sauvegarde
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Références Leaflet
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const handlesLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const cutLineLayerRef = useRef<L.Polyline | null>(null);

  const selectedTerritory = territories.find(t => t.id === selectedTerritoryId) || null;

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = selectedTerritory?.centerCoordinates || [45.7624, 4.8276];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(initialCenter, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Fond de carte OSM standard haute lisibilité
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const polygonsGroup = L.featureGroup().addTo(map);
    const handlesGroup = L.featureGroup().addTo(map);

    polygonsLayerGroupRef.current = polygonsGroup;
    handlesLayerGroupRef.current = handlesGroup;
    mapInstanceRef.current = map;

    // Gestion du clic sur la carte selon l'outil actif
    map.on('click', (e: L.LeafletMouseEvent) => {
      const clickedCoord: LatLngTuple = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      ];

      // Outil Découpage (Split)
      if (tool === 'split') {
        setCutPoints(prev => {
          if (prev.length === 0) {
            return [clickedCoord];
          } else if (prev.length === 1) {
            const line = [prev[0], clickedCoord];
            return line;
          } else {
            return [clickedCoord];
          }
        });
      }
      // Outil Nouveau Territoire (Draw)
      else if (tool === 'draw') {
        setNewDrawPoints(prev => [...prev, clickedCoord]);
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Recalcul de la découpe dès qu'on a 2 points de coupe
  useEffect(() => {
    if (tool !== 'split' || cutPoints.length !== 2 || !selectedTerritory) return;

    const result = splitPolygonByLine(selectedTerritory.boundary, cutPoints[0], cutPoints[1]);
    if (result) {
      const [polyA, polyB] = result;
      setSplitPreview({
        targetTerritory: selectedTerritory,
        polyA,
        polyB,
        numA: selectedTerritory.number + 'A',
        nameA: selectedTerritory.label + ' (Nord / Partie A)',
        numB: selectedTerritory.number + 'B',
        nameB: selectedTerritory.label + ' (Sud / Partie B)'
      });
      setStatusMessage('Découpe géométrique calculée avec succès ! Vérifiez les deux parties ci-dessous.');
    } else {
      setSplitPreview(null);
      setStatusMessage('La ligne de coupe doit traverser complètement les deux côtés du territoire sélectionné.');
    }
  }, [cutPoints, tool, selectedTerritory]);

  // Rendu des polygones et des poignées d'édition à chaque mise à jour
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonsGroup = polygonsLayerGroupRef.current;
    const handlesGroup = handlesLayerGroupRef.current;
    if (!map || !polygonsGroup || !handlesGroup) return;

    polygonsGroup.clearLayers();
    handlesGroup.clearLayers();

    // Nettoyage de la ligne de coupe
    if (cutLineLayerRef.current) {
      map.removeLayer(cutLineLayerRef.current);
      cutLineLayerRef.current = null;
    }

    // 1. Dessiner tous les territoires de la congrégation
    territories.forEach((t, index) => {
      const isSelected = t.id === selectedTerritoryId;
      const color = TERRITORY_COLORS[index % TERRITORY_COLORS.length];

      // Polygone du territoire
      const polygon = L.polygon(t.boundary, {
        color: isSelected ? '#38bdf8' : color,
        weight: isSelected ? 3.5 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.35 : 0.18,
        dashArray: isSelected ? undefined : '4, 4'
      }).addTo(polygonsGroup);

      // Clic sur le polygone pour le sélectionner
      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedTerritoryId(t.id);
        if (tool === 'split') {
          setCutPoints([]);
          setSplitPreview(null);
        }
      });

      // Badge au centre du territoire
      const center = t.centerCoordinates || calculatePolygonCenter(t.boundary);
      const icon = L.divIcon({
        className: 'territory-designer-label',
        html: `
          <div style="
            background: ${isSelected ? '#0284c7' : 'rgba(15, 23, 42, 0.9)'};
            color: white;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            border: 1px solid ${isSelected ? '#38bdf8' : 'rgba(255,255,255,0.3)'};
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
          ">
            <span>N° ${t.number}</span>
          </div>
        `,
        iconSize: [50, 24],
        iconAnchor: [25, 12]
      });

      const marker = L.marker(center, { icon, interactive: true }).addTo(polygonsGroup);
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedTerritoryId(t.id);
      });
    });

    // 2. Si un territoire est sélectionné et en mode 'select', afficher les poignées éditables
    if (selectedTerritory && tool === 'select') {
      selectedTerritory.boundary.forEach((coord, ptIdx) => {
        const handleMarker = L.circleMarker(coord, {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#0284c7',
          fillOpacity: 1,
          interactive: true
        }).addTo(handlesGroup);

        // Curseur de déplacement
        const element = handleMarker.getElement() as HTMLElement | null;
        if (element) {
          element.style.cursor = 'move';
        }

        // Déplacement par drag simulé
        let isDragging = false;
        handleMarker.on('mousedown', (e) => {
          L.DomEvent.stopPropagation(e);
          isDragging = true;
          map.dragging.disable();

          const onMouseMove = (moveEvent: L.LeafletMouseEvent) => {
            if (!isDragging) return;
            const newPos: LatLngTuple = [
              Number(moveEvent.latlng.lat.toFixed(6)),
              Number(moveEvent.latlng.lng.toFixed(6))
            ];
            handleMarker.setLatLng(newPos);

            // Mise à jour en direct du polygone
            setTerritories(prev => prev.map(t => {
              if (t.id === selectedTerritory.id) {
                const newBoundary = [...t.boundary];
                newBoundary[ptIdx] = newPos;
                return {
                  ...t,
                  boundary: newBoundary,
                  centerCoordinates: calculatePolygonCenter(newBoundary)
                };
              }
              return t;
            }));
            setHasUnsavedChanges(true);
          };

          const onMouseUp = () => {
            isDragging = false;
            map.dragging.enable();
            map.off('mousemove', onMouseMove);
            map.off('mouseup', onMouseUp);
          };

          map.on('mousemove', onMouseMove);
          map.on('mouseup', onMouseUp);
        });

        // Clic droit pour supprimer le sommet (minimum 3 sommets)
        handleMarker.on('contextmenu', (e) => {
          L.DomEvent.stopPropagation(e);
          if (selectedTerritory.boundary.length <= 3) {
            alert('Un territoire doit comporter au moins 3 sommets.');
            return;
          }
          const updatedBoundary = selectedTerritory.boundary.filter((_, idx) => idx !== ptIdx);
          setTerritories(prev => prev.map(t => {
            if (t.id === selectedTerritory.id) {
              return {
                ...t,
                boundary: updatedBoundary,
                centerCoordinates: calculatePolygonCenter(updatedBoundary)
              };
            }
            return t;
          }));
          setHasUnsavedChanges(true);
        });
      });
    }

    // 3. Dessiner la ligne de coupe si en mode 'split'
    if (cutPoints.length > 0) {
      cutPoints.forEach(pt => {
        L.circleMarker(pt, {
          radius: 7,
          color: '#ef4444',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 3
        }).addTo(handlesGroup);
      });

      if (cutPoints.length === 2) {
        cutLineLayerRef.current = L.polyline(cutPoints, {
          color: '#ef4444',
          weight: 4,
          dashArray: '6, 6'
        }).addTo(map);
      }
    }

    // 4. Dessiner le polygone en cours de création en mode 'draw'
    if (newDrawPoints.length > 0) {
      newDrawPoints.forEach(pt => {
        L.circleMarker(pt, {
          radius: 5,
          color: '#10b981',
          fillColor: '#ffffff',
          fillOpacity: 1,
          weight: 2
        }).addTo(handlesGroup);
      });

      if (newDrawPoints.length >= 2) {
        L.polyline(newDrawPoints, {
          color: '#10b981',
          weight: 3,
          dashArray: '4, 4'
        }).addTo(handlesGroup);
      }
    }

  }, [territories, selectedTerritoryId, tool, cutPoints, newDrawPoints]);

  // Validation de la découpe (Split)
  const handleApplySplit = () => {
    if (!splitPreview || !selectedTerritory) return;

    const { polyA, polyB, numA, nameA, numB, nameB } = splitPreview;

    // 1. Créer le Territoire A
    const territoryA: Territory = {
      ...selectedTerritory,
      id: 'terr-' + Date.now().toString(36) + '-a',
      number: numA.trim() || selectedTerritory.number + 'A',
      label: nameA.trim() || selectedTerritory.label + ' - Partie A',
      boundary: polyA,
      centerCoordinates: calculatePolygonCenter(polyA),
      shortUrlCode: 'LYON' + numA.trim().toUpperCase()
    };

    // 2. Créer le Territoire B
    const territoryB: Territory = {
      ...selectedTerritory,
      id: 'terr-' + (Date.now() + 1).toString(36) + '-b',
      number: numB.trim() || selectedTerritory.number + 'B',
      label: nameB.trim() || selectedTerritory.label + ' - Partie B',
      boundary: polyB,
      centerCoordinates: calculatePolygonCenter(polyB),
      shortUrlCode: 'LYON' + numB.trim().toUpperCase(),
      status: 'available',
      assignee: null,
      dateAssigned: null,
      dateDue: null
    };

    // 3. Répartir les adresses de l'ancien territoire vers A ou B
    const updatedLocs = locations.map(loc => {
      if (loc.territoryId === selectedTerritory.id) {
        const inA = isPointInPolygon(loc.latLng, polyA);
        return {
          ...loc,
          territoryId: inA ? territoryA.id : territoryB.id
        };
      }
      return loc;
    });

    // 4. Remplacer l'ancien territoire par A et B
    const updatedTerrs = territories.filter(t => t.id !== selectedTerritory.id);
    updatedTerrs.push(territoryA, territoryB);

    setTerritories(updatedTerrs);
    setLocations(updatedLocs);
    setSelectedTerritoryId(territoryA.id);
    setCutPoints([]);
    setSplitPreview(null);
    setTool('select');
    setHasUnsavedChanges(true);
    setStatusMessage(`Territoire ${selectedTerritory.number} scindé avec succès en ${territoryA.number} et ${territoryB.number} !`);
  };

  // Validation de la création d'un nouveau territoire (Draw)
  const handleFinishDraw = () => {
    if (newDrawPoints.length < 3) {
      alert('Un polygone doit comporter au moins 3 points.');
      return;
    }
    // Proposer le numéro suivant
    const maxNum = territories.reduce((max, t) => Math.max(max, parseInt(t.number, 10) || 0), 0);
    const nextNum = String(maxNum + 1).padStart(2, '0');

    setNewTerritoryDetails({
      number: nextNum,
      label: `Nouveau Quartier ${nextNum}`,
      type: 'urban'
    });
  };

  const handleConfirmNewTerritory = () => {
    if (!newTerritoryDetails || newDrawPoints.length < 3) return;

    const newCenter = calculatePolygonCenter(newDrawPoints);
    const newTerritory: Territory = {
      id: 'terr-' + Date.now().toString(36),
      number: newTerritoryDetails.number.trim(),
      label: newTerritoryDetails.label.trim(),
      type: newTerritoryDetails.type,
      boundary: newDrawPoints,
      centerCoordinates: newCenter,
      shortUrlCode: 'LYON' + newTerritoryDetails.number.trim().toUpperCase(),
      status: 'available',
      assignee: null,
      dateAssigned: null,
      dateDue: null
    };

    setTerritories(prev => [...prev, newTerritory]);
    setSelectedTerritoryId(newTerritory.id);
    setNewDrawPoints([]);
    setNewTerritoryDetails(null);
    setTool('select');
    setHasUnsavedChanges(true);
    setStatusMessage(`Nouveau Territoire ${newTerritory.number} créé avec succès !`);
  };

  // Sauvegarde globale
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await onSaveTerritories(territories, locations);
      setHasUnsavedChanges(false);
      setStatusMessage('Tous les contours et découpages ont été enregistrés !');
    } catch (e) {
      alert('Erreur lors de la sauvegarde : ' + e);
    } finally {
      setIsSaving(false);
    }
  };

  // Export GeoJSON officiel
  const handleExportGeoJSON = () => {
    const geojsonData = exportCongregationToGeoJSON(territories);
    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KBV_Congregation_Territoires_${new Date().toISOString().split('T')[0]}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Surface calculée du territoire sélectionné
  const currentArea = selectedTerritory ? calculatePolygonArea(selectedTerritory.boundary) : 0;
  const currentAreaFormatted = currentArea > 10000 
    ? `${(currentArea / 10000).toFixed(2)} ha` 
    : `${currentArea.toLocaleString()} m²`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0b0f19',
      zIndex: 4000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Barre d'outils supérieure de l'Atelier */}
      <header style={{
        background: 'rgba(16, 21, 34, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <Scissors size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Atelier de Découpage des Territoires (Designer)
            </h2>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Découpe au cutter, ajustement des frontières et dessin de la congrégation
            </div>
          </div>
        </div>

        {/* Sélecteur d'outils central */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => {
              setTool('select');
              setCutPoints([]);
              setSplitPreview(null);
              setNewDrawPoints([]);
            }}
            className={`btn ${tool === 'select' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <MapPin size={15} />
            <span>Ajuster les sommets</span>
          </button>

          <button
            onClick={() => {
              setTool('split');
              setNewDrawPoints([]);
            }}
            className={`btn ${tool === 'split' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: tool === 'split' ? '#ef4444' : undefined }}
          >
            <Scissors size={15} />
            <span>✂️ Découper (Cutter)</span>
          </button>

          <button
            onClick={() => {
              setTool('draw');
              setCutPoints([]);
              setSplitPreview(null);
            }}
            className={`btn ${tool === 'draw' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: tool === 'draw' ? '#10b981' : undefined }}
          >
            <Plus size={15} />
            <span>➕ Tracer Nouveau</span>
          </button>
        </div>

        {/* Actions à droite */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleExportGeoJSON}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Exporter tous les polygones au format officiel GeoJSON"
          >
            <Download size={14} />
            <span>Export GeoJSON</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isSaving}
            className="btn btn-primary"
            style={{ 
              fontSize: '0.75rem', 
              padding: '0.45rem 0.95rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem',
              background: hasUnsavedChanges ? '#10b981' : undefined,
              borderColor: hasUnsavedChanges ? '#10b981' : undefined
            }}
          >
            <Save size={14} />
            <span>{isSaving ? 'Enregistrement...' : hasUnsavedChanges ? 'Sauvegarder les découpes' : 'À jour'}</span>
          </button>

          <button
            onClick={() => {
              if (hasUnsavedChanges && !window.confirm('Vous avez des modifications non enregistrées. Quitter quand même ?')) {
                return;
              }
              onClose();
            }}
            className="btn-icon"
            style={{ padding: '0.45rem', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Contenu principal : Panneau latéral gauche + Carte interactive */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Panneau latéral gauche (Territoires & Guide d'action) */}
        <div style={{
          width: '320px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5,
          overflowY: 'auto'
        }}>
          
          {/* Guide d'instruction selon l'outil */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(2, 132, 199, 0.08)' }}>
            {tool === 'select' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '0.25rem' }}>👉 Mode Ajustement :</strong>
                Glissez les ronds bleus pour ajuster les frontières sur les rues. Clic droit pour supprimer un point.
              </div>
            )}

            {tool === 'split' && (
              <div style={{ fontSize: '0.8rem', color: '#f87171' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>✂️ Mode Découpage :</strong>
                1. Cliquez sur le territoire à couper.<br/>
                2. Cliquez sur 2 points de la carte pour faire passer la ligne de refente à travers la zone.
              </div>
            )}

            {tool === 'draw' && (
              <div style={{ fontSize: '0.8rem', color: '#34d399' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>➕ Nouveau Territoire :</strong>
                Cliquez successivement sur la carte pour tracer le contour du polygone ({newDrawPoints.length} points posés).
                {newDrawPoints.length >= 3 && (
                  <button
                    onClick={handleFinishDraw}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.4rem' }}
                  >
                    Valider le contour ({newDrawPoints.length} sommets)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Statut ou message d'info */}
          {statusMessage && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Fiche d'information du territoire sélectionné */}
          {selectedTerritory && (
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Territoire Actif
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  N° {selectedTerritory.number}
                </div>
                <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
                  {selectedTerritory.type}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {selectedTerritory.label}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Surface estimée :</span>
                  <strong style={{ color: '#fff' }}>{currentAreaFormatted}</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Sommets :</span>
                  <strong style={{ color: '#fff' }}>{selectedTerritory.boundary.length} points</strong>
                </div>
              </div>
            </div>
          )}

          {/* Liste de tous les territoires pour sélection rapide */}
          <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              TERRITOIRES DE LA CONGRÉGATION ({territories.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {territories.map((t, idx) => {
                const isSel = t.id === selectedTerritoryId;
                const col = TERRITORY_COLORS[idx % TERRITORY_COLORS.length];

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTerritoryId(t.id);
                      if (mapInstanceRef.current && t.centerCoordinates) {
                        mapInstanceRef.current.panTo(t.centerCoordinates);
                      }
                    }}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: isSel ? 'rgba(2, 132, 199, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isSel ? '#0284c7' : 'rgba(255, 255, 255, 0.06)'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: col, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        N° {t.number} - {t.label}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.status === 'available' ? 'Disponible' : (t.assignee ? `Attribué à ${t.assignee}` : 'En cours')}
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSel ? '#38bdf8' : 'var(--text-muted)'} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Espace Carte Leaflet */}
        <div ref={mapContainerRef} style={{ flex: 1, height: '100%', background: '#1e293b' }} />

      </div>

      {/* MODALE : Validation de la Découpe (Split Confirmation) */}
      {splitPreview && (
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
          zIndex: 4200,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scissors size={20} color="#ef4444" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Valider la Découpe du Territoire</h3>
              </div>
              <button onClick={() => setSplitPreview(null)} className="btn-icon">✕</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                Le territoire <strong>N° {splitPreview.targetTerritory.number} ({splitPreview.targetTerritory.label})</strong> va être scindé en 2 territoires indépendants. Les adresses intérieures seront automatiquement réparties.
              </p>

              {/* Partie A */}
              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>
                  PREMIER TERRITOIRE (Partie A - {splitPreview.polyA.length} sommets)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="N°"
                    value={splitPreview.numA}
                    onChange={(e) => setSplitPreview({ ...splitPreview, numA: e.target.value })}
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Nom du territoire"
                    value={splitPreview.nameA}
                    onChange={(e) => setSplitPreview({ ...splitPreview, nameA: e.target.value })}
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Partie B */}
              <div style={{ padding: '0.85rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34d399', marginBottom: '0.5rem' }}>
                  SECOND TERRITOIRE (Partie B - {splitPreview.polyB.length} sommets)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="N°"
                    value={splitPreview.numB}
                    onChange={(e) => setSplitPreview({ ...splitPreview, numB: e.target.value })}
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    placeholder="Nom du territoire"
                    value={splitPreview.nameB}
                    onChange={(e) => setSplitPreview({ ...splitPreview, nameB: e.target.value })}
                    className="input-field"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setSplitPreview(null)} className="btn btn-secondary">
                  Annuler
                </button>
                <button onClick={handleApplySplit} className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                  Confirmer la Découpe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : Nommer le nouveau territoire tracé (Draw Completion) */}
      {newTerritoryDetails && (
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
          zIndex: 4200,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="#10b981" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Créer le Territoire Tracé</h3>
              </div>
              <button onClick={() => setNewTerritoryDetails(null)} className="btn-icon">✕</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Numéro de territoire *
                </label>
                <input
                  type="text"
                  value={newTerritoryDetails.number}
                  onChange={(e) => setNewTerritoryDetails({ ...newTerritoryDetails, number: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nom / Libellé du territoire *
                </label>
                <input
                  type="text"
                  value={newTerritoryDetails.label}
                  onChange={(e) => setNewTerritoryDetails({ ...newTerritoryDetails, label: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Type de terrain
                </label>
                <select
                  value={newTerritoryDetails.type}
                  onChange={(e) => setNewTerritoryDetails({ ...newTerritoryDetails, type: e.target.value as TerritoryType })}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="urban">Urbain</option>
                  <option value="residential">Résidentiel</option>
                  <option value="rural">Rural</option>
                  <option value="business">Commercial</option>
                  <option value="campaign">Campagne</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setNewTerritoryDetails(null)} className="btn btn-secondary">
                  Annuler
                </button>
                <button onClick={handleConfirmNewTerritory} className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                  Ajouter à la Congrégation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
