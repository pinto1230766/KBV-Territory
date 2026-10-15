import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Scissors, 
  Plus, 
  Save, 
  MapPin, 
  Download, 
  Info,
  ChevronRight,
  Undo2,
  Check,
  Split,
  Combine
} from 'lucide-react';
import type { Territory, LocationItem, TerritoryType } from '../types';
import { 
  type LatLngTuple, 
  calculatePolygonCenter, 
  calculatePolygonArea, 
  splitPolygonByLine,
  autoSplitPolygon,
  isPointInPolygon,
  exportCongregationToGeoJSON 
} from '../utils/geometry';

interface TerritoryDesignerModalProps {
  territories: Territory[];
  locations: LocationItem[];
  onSaveTerritories: (updatedTerritories: Territory[], updatedLocations: LocationItem[]) => Promise<void>;
  onClose: () => void;
}

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
  
  // Outil actif
  const [tool, setTool] = useState<'select' | 'split' | 'draw' | 'merge'>('select');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(initialTerritories[0]?.id || null);

  // Pour la fusion (sélection de 2 territoires)
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string | null>(null);

  // État Découpage (Cutter / Split)
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

  // État Tracé d'un nouveau territoire (Draw)
  const [newDrawPoints, setNewDrawPoints] = useState<LatLngTuple[]>([]);
  const [newTerritoryDetails, setNewTerritoryDetails] = useState<{
    number: string;
    label: string;
    type: TerritoryType;
  } | null>(null);

  // Statut
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Références Leaflet et refs pour éviter les closures périmées
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonsLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const handlesLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const midpointsLayerGroupRef = useRef<L.FeatureGroup | null>(null);
  const cutLineLayerRef = useRef<L.Polyline | null>(null);
  const drawLayerRef = useRef<L.Polygon | null>(null);

  // Synchronisation des refs pour les gestionnaires Leaflet
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const territoriesRef = useRef(territories);
  territoriesRef.current = territories;
  const selectedTerritoryIdRef = useRef(selectedTerritoryId);
  selectedTerritoryIdRef.current = selectedTerritoryId;
  const cutPointsRef = useRef(cutPoints);
  cutPointsRef.current = cutPoints;

  const selectedTerritory = territories.find(t => t.id === selectedTerritoryId) || null;

  // Gestionnaire universel de clic sur la carte ou sur un polygone
  const handleMapOrPolygonClick = (clickedCoord: LatLngTuple) => {
    const currentTool = toolRef.current;
    const currentTerrId = selectedTerritoryIdRef.current;
    const currentTerr = territoriesRef.current.find(t => t.id === currentTerrId);

    // 1. Outil Découpage (Split)
    if (currentTool === 'split') {
      const prevPoints = cutPointsRef.current;
      if (prevPoints.length === 0) {
        setCutPoints([clickedCoord]);
        setStatusMessage('Premier point de coupe posé. Cliquez sur le second point pour trancher !');
      } else if (prevPoints.length === 1) {
        const p1 = prevPoints[0];
        const p2 = clickedCoord;
        setCutPoints([p1, p2]);

        if (currentTerr) {
          const result = splitPolygonByLine(currentTerr.boundary, p1, p2);
          if (result) {
            const [polyA, polyB] = result;
            setSplitPreview({
              targetTerritory: currentTerr,
              polyA,
              polyB,
              numA: currentTerr.number + 'A',
              nameA: currentTerr.label + ' (Partie A)',
              numB: currentTerr.number + 'B',
              nameB: currentTerr.label + ' (Partie B)'
            });
            setStatusMessage('Découpe géométrique calculée avec succès ! Confirmez ci-dessous.');
          } else {
            setStatusMessage('La ligne de coupe doit traverser complètement 2 bords du territoire sélectionné. Réessayez ou utilisez la découpe automatique.');
          }
        }
      } else {
        // Redémarre un nouveau tracé de coupe
        setCutPoints([clickedCoord]);
        setStatusMessage('Premier point de coupe posé. Cliquez sur le second point pour trancher !');
      }
    }
    // 2. Outil Nouveau Territoire (Draw)
    else if (currentTool === 'draw') {
      setNewDrawPoints(prev => {
        const updated = [...prev, clickedCoord];
        setStatusMessage(`${updated.length} point(s) posé(s). Continuez à cliquer pour délimiter le quartier.`);
        return updated;
      });
    }
  };

  // Initialisation de la carte Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter = selectedTerritory?.centerCoordinates || [45.7624, 4.8276];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(initialCenter, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const polygonsGroup = L.featureGroup().addTo(map);
    const handlesGroup = L.featureGroup().addTo(map);
    const midpointsGroup = L.featureGroup().addTo(map);

    polygonsLayerGroupRef.current = polygonsGroup;
    handlesLayerGroupRef.current = handlesGroup;
    midpointsLayerGroupRef.current = midpointsGroup;
    mapInstanceRef.current = map;

    // Clic sur la carte
    map.on('click', (e: L.LeafletMouseEvent) => {
      const coord: LatLngTuple = [
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      ];
      handleMapOrPolygonClick(coord);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Découpage automatique d'un polygone selon l'axe Nord-Sud ou Est-Ouest
  const handleAutoSplit = (direction: 'horizontal' | 'vertical') => {
    if (!selectedTerritory) return;

    const result = autoSplitPolygon(selectedTerritory.boundary, direction);
    if (!result) {
      alert('Impossible de scinder automatiquement ce polygone. Vérifiez qu\'il a au moins 3 sommets bien formés.');
      return;
    }

    const [polyA, polyB] = result;
    setSplitPreview({
      targetTerritory: selectedTerritory,
      polyA,
      polyB,
      numA: selectedTerritory.number + 'A',
      nameA: selectedTerritory.label + (direction === 'horizontal' ? ' (Nord)' : ' (Ouest)'),
      numB: selectedTerritory.number + 'B',
      nameB: selectedTerritory.label + (direction === 'horizontal' ? ' (Sud)' : ' (Est)')
    });
    setStatusMessage(`Découpe automatique (${direction === 'horizontal' ? 'Nord/Sud' : 'Est/Ouest'}) calculée avec succès !`);
  };

  // Ajout d'un point au territoire sélectionné à une coordonnée ou au milieu d'un segment
  const handleAddVertexAtPoint = (coord: LatLngTuple, insertIndex?: number) => {
    if (!selectedTerritory) return;
    const boundary = [...selectedTerritory.boundary];
    if (typeof insertIndex === 'number') {
      boundary.splice(insertIndex + 1, 0, coord);
    } else {
      boundary.push(coord);
    }

    const newCenter = calculatePolygonCenter(boundary);
    setTerritories(prev => prev.map(t => {
      if (t.id === selectedTerritory.id) {
        return { ...t, boundary, centerCoordinates: newCenter };
      }
      return t;
    }));
    setHasUnsavedChanges(true);
    setStatusMessage('Nouveau sommet ajouté au contour du territoire !');
  };

  // Suppression d'un sommet
  const handleDeleteVertex = (vertexIndex: number) => {
    if (!selectedTerritory) return;
    if (selectedTerritory.boundary.length <= 3) {
      alert('Un territoire doit comporter au moins 3 sommets.');
      return;
    }
    const updatedBoundary = selectedTerritory.boundary.filter((_, idx) => idx !== vertexIndex);
    const newCenter = calculatePolygonCenter(updatedBoundary);

    setTerritories(prev => prev.map(t => {
      if (t.id === selectedTerritory.id) {
        return { ...t, boundary: updatedBoundary, centerCoordinates: newCenter };
      }
      return t;
    }));
    setHasUnsavedChanges(true);
    setStatusMessage('Sommet supprimé avec succès.');
  };

  // Rendu interactif des polygones, sommets et outils sur la carte
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonsGroup = polygonsLayerGroupRef.current;
    const handlesGroup = handlesLayerGroupRef.current;
    const midpointsGroup = midpointsLayerGroupRef.current;
    if (!map || !polygonsGroup || !handlesGroup || !midpointsGroup) return;

    polygonsGroup.clearLayers();
    handlesGroup.clearLayers();
    midpointsGroup.clearLayers();

    if (cutLineLayerRef.current) {
      map.removeLayer(cutLineLayerRef.current);
      cutLineLayerRef.current = null;
    }
    if (drawLayerRef.current) {
      map.removeLayer(drawLayerRef.current);
      drawLayerRef.current = null;
    }

    // 1. Rendu de tous les territoires existants
    territories.forEach((t, index) => {
      const isSelected = t.id === selectedTerritoryId;
      const isMergeSecondary = t.id === mergeSecondaryId;
      const color = TERRITORY_COLORS[index % TERRITORY_COLORS.length];

      // En mode split ou draw, on laisse les clics traverser vers la carte
      const isDrawingOrSplitting = tool === 'split' || tool === 'draw';

      const polygon = L.polygon(t.boundary, {
        color: isSelected ? '#38bdf8' : (isMergeSecondary ? '#f59e0b' : color),
        weight: isSelected ? 3.5 : (isMergeSecondary ? 3 : 2),
        fillColor: isMergeSecondary ? '#f59e0b' : color,
        fillOpacity: isSelected ? 0.35 : (isMergeSecondary ? 0.4 : 0.18),
        dashArray: isSelected ? undefined : '4, 4',
        interactive: true
      }).addTo(polygonsGroup);

      // Clic sur le polygone
      polygon.on('click', (e: L.LeafletMouseEvent) => {
        const clickedCoord: LatLngTuple = [
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6))
        ];

        if (isDrawingOrSplitting) {
          handleMapOrPolygonClick(clickedCoord);
        } else if (tool === 'merge') {
          if (!selectedTerritoryId) {
            setSelectedTerritoryId(t.id);
          } else if (selectedTerritoryId !== t.id) {
            setMergeSecondaryId(t.id);
          }
        } else {
          setSelectedTerritoryId(t.id);
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

      const marker = L.marker(center, { icon, interactive: !isDrawingOrSplitting }).addTo(polygonsGroup);
      marker.on('click', () => {
        if (!isDrawingOrSplitting) {
          setSelectedTerritoryId(t.id);
        }
      });
    });

    // 2. Poignées de sommets et boutons "+" d'insertion (Mode 'select')
    if (selectedTerritory && tool === 'select') {
      selectedTerritory.boundary.forEach((coord, ptIdx) => {
        // Poignée bleue déplaçable
        const handleMarker = L.circleMarker(coord, {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor: '#0284c7',
          fillOpacity: 1,
          interactive: true
        }).addTo(handlesGroup);

        const element = handleMarker.getElement() as HTMLElement | null;
        if (element) {
          element.style.cursor = 'grab';
        }

        // Drag & drop du sommet
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

        // Clic pour supprimer le sommet
        handleMarker.on('contextmenu', (e) => {
          L.DomEvent.stopPropagation(e);
          handleDeleteVertex(ptIdx);
        });

        // Petit point '+' au milieu de chaque segment pour insérer un nouveau point en 1 clic
        const nextCoord = selectedTerritory.boundary[(ptIdx + 1) % selectedTerritory.boundary.length];
        const midPoint: LatLngTuple = [
          Number(((coord[0] + nextCoord[0]) / 2).toFixed(6)),
          Number(((coord[1] + nextCoord[1]) / 2).toFixed(6))
        ];

        const plusMarker = L.circleMarker(midPoint, {
          radius: 4,
          color: '#ffffff',
          weight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.9,
          interactive: true
        }).addTo(midpointsGroup);

        plusMarker.bindTooltip('Cliquer pour insérer un sommet ici', { direction: 'top', offset: [0, -5] });
        plusMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          handleAddVertexAtPoint(midPoint, ptIdx);
        });
      });
    }

    // 3. Dessin des points de coupe (Mode 'split')
    if (cutPoints.length > 0) {
      cutPoints.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: 9,
          color: '#ffffff',
          fillColor: '#ef4444',
          fillOpacity: 1,
          weight: 3
        }).addTo(handlesGroup);

        marker.bindTooltip(`Point de coupe ${idx + 1}`, { permanent: true, direction: 'top', offset: [0, -10] });
      });

      if (cutPoints.length >= 2) {
        cutLineLayerRef.current = L.polyline(cutPoints, {
          color: '#ef4444',
          weight: 4,
          dashArray: '6, 6'
        }).addTo(map);
      }
    }

    // 4. Tracé d'un nouveau quartier (Mode 'draw')
    if (newDrawPoints.length > 0) {
      newDrawPoints.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: 6,
          color: '#ffffff',
          fillColor: '#10b981',
          fillOpacity: 1,
          weight: 2
        }).addTo(handlesGroup);

        marker.bindTooltip(`${idx + 1}`, { permanent: true, direction: 'top', offset: [0, -8] });
      });

      if (newDrawPoints.length >= 2) {
        drawLayerRef.current = L.polygon(newDrawPoints, {
          color: '#10b981',
          weight: 3,
          fillColor: '#10b981',
          fillOpacity: 0.25,
          dashArray: '4, 4'
        }).addTo(map);
      }
    }

  }, [territories, selectedTerritoryId, mergeSecondaryId, tool, cutPoints, newDrawPoints]);

  // Validation de la découpe (Split)
  const handleApplySplit = () => {
    if (!splitPreview || !selectedTerritory) return;

    const { polyA, polyB, numA, nameA, numB, nameB } = splitPreview;

    const territoryA: Territory = {
      ...selectedTerritory,
      id: 'terr-' + Date.now().toString(36) + '-a',
      number: numA.trim() || selectedTerritory.number + 'A',
      label: nameA.trim() || selectedTerritory.label + ' (Partie A)',
      boundary: polyA,
      centerCoordinates: calculatePolygonCenter(polyA),
      shortUrlCode: 'LYON' + numA.trim().toUpperCase()
    };

    const territoryB: Territory = {
      ...selectedTerritory,
      id: 'terr-' + (Date.now() + 1).toString(36) + '-b',
      number: numB.trim() || selectedTerritory.number + 'B',
      label: nameB.trim() || selectedTerritory.label + ' (Partie B)',
      boundary: polyB,
      centerCoordinates: calculatePolygonCenter(polyB),
      shortUrlCode: 'LYON' + numB.trim().toUpperCase(),
      status: 'available',
      assignee: null,
      dateAssigned: null,
      dateDue: null
    };

    // Répartition des adresses
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

    const updatedTerrs = territories.filter(t => t.id !== selectedTerritory.id);
    updatedTerrs.push(territoryA, territoryB);

    setTerritories(updatedTerrs);
    setLocations(updatedLocs);
    setSelectedTerritoryId(territoryA.id);
    setCutPoints([]);
    setSplitPreview(null);
    setTool('select');
    setHasUnsavedChanges(true);
    setStatusMessage(`Territoire ${selectedTerritory.number} scindé en ${territoryA.number} et ${territoryB.number} avec succès !`);
  };

  // Validation de la création d'un nouveau territoire tracé (Draw)
  const handleFinishDraw = () => {
    if (newDrawPoints.length < 3) {
      alert('Un polygone doit comporter au moins 3 points.');
      return;
    }
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

  // Fusion de 2 territoires (Merge)
  const handleApplyMerge = () => {
    if (!selectedTerritoryId || !mergeSecondaryId) return;
    const t1 = territories.find(t => t.id === selectedTerritoryId);
    const t2 = territories.find(t => t.id === mergeSecondaryId);
    if (!t1 || !t2) return;

    // Fusion des sommets
    const combinedBoundary = [...t1.boundary, ...t2.boundary];
    const newCenter = calculatePolygonCenter(combinedBoundary);

    const mergedTerritory: Territory = {
      ...t1,
      id: 'terr-' + Date.now().toString(36) + '-merged',
      number: t1.number,
      label: `${t1.label} + ${t2.label}`,
      boundary: combinedBoundary,
      centerCoordinates: newCenter
    };

    // Transférer les adresses du second vers le fusionné
    const updatedLocs = locations.map(loc => {
      if (loc.territoryId === t2.id) {
        return { ...loc, territoryId: mergedTerritory.id };
      }
      return loc;
    });

    const updatedTerrs = territories.filter(t => t.id !== t1.id && t.id !== t2.id);
    updatedTerrs.push(mergedTerritory);

    setTerritories(updatedTerrs);
    setLocations(updatedLocs);
    setSelectedTerritoryId(mergedTerritory.id);
    setMergeSecondaryId(null);
    setTool('select');
    setHasUnsavedChanges(true);
    setStatusMessage(`Territoires ${t1.number} et ${t2.number} fusionnés avec succès !`);
  };

  // Sauvegarde globale
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      await onSaveTerritories(territories, locations);
      setHasUnsavedChanges(false);
      setStatusMessage('Tous les contours, découpages et adresses ont été enregistrés avec succès !');
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

  // Surface calculée
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
      
      {/* Barre d'outils supérieure */}
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
              Atelier de Découpage des Territoires
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
              setMergeSecondaryId(null);
            }}
            className={`btn ${tool === 'select' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <MapPin size={15} />
            <span>Ajuster sommets</span>
          </button>

          <button
            onClick={() => {
              setTool('split');
              setNewDrawPoints([]);
              setMergeSecondaryId(null);
              setCutPoints([]);
              setStatusMessage('Mode Cutter activé : Cliquez sur 2 points de la carte pour trancher le territoire sélectionné.');
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
              setMergeSecondaryId(null);
              setStatusMessage('Mode Tracé activé : Cliquez sur la carte pour délimiter les contours d\'un nouveau territoire.');
            }}
            className={`btn ${tool === 'draw' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: tool === 'draw' ? '#10b981' : undefined }}
          >
            <Plus size={15} />
            <span>➕ Tracer Nouveau</span>
          </button>

          <button
            onClick={() => {
              setTool('merge');
              setCutPoints([]);
              setSplitPreview(null);
              setNewDrawPoints([]);
              setStatusMessage('Mode Fusion : Sélectionnez deux territoires pour les réunir en un seul.');
            }}
            className={`btn ${tool === 'merge' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: tool === 'merge' ? '#f59e0b' : undefined }}
          >
            <Combine size={15} />
            <span>🔗 Fusionner</span>
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

      {/* Contenu : Panneau latéral + Carte */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        
        {/* Panneau latéral gauche */}
        <div style={{
          width: '340px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 5,
          overflowY: 'auto'
        }}>
          
          {/* Guide d'instruction interactif */}
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(2, 132, 199, 0.08)' }}>
            
            {tool === 'select' && (
              <div>
                <strong style={{ color: '#38bdf8', fontSize: '0.82rem', display: 'block', marginBottom: '0.35rem' }}>
                  👉 Ajustement des Sommets :
                </strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                  • Glissez les <strong>ronds bleus</strong> pour ajuster les rues.<br/>
                  • Cliquez sur les petits <strong>points jaunes (+)</strong> pour insérer un sommet.<br/>
                  • Clic droit sur un point bleu pour le supprimer.
                </p>
                {selectedTerritory && (
                  <button
                    onClick={() => {
                      if (!selectedTerritory.boundary[0]) return;
                      const p = selectedTerritory.boundary[0];
                      const newPt: LatLngTuple = [p[0] + 0.0005, p[1] + 0.0005];
                      handleAddVertexAtPoint(newPt);
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Plus size={14} />
                    <span>Ajouter un sommet GPS libre</span>
                  </button>
                )}
              </div>
            )}

            {tool === 'split' && (
              <div>
                <strong style={{ color: '#ef4444', fontSize: '0.82rem', display: 'block', marginBottom: '0.35rem' }}>
                  ✂️ Découpage au Cutter :
                </strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.65rem 0' }}>
                  {cutPoints.length === 0 && '1. Cliquez sur la carte pour poser le premier point de la ligne de refente.'}
                  {cutPoints.length === 1 && '2. Cliquez de l\'autre côté du territoire pour trancher !'}
                  {cutPoints.length >= 2 && 'Ligne de coupe tracée !'}
                </p>

                {/* Boutons de découpe automatique ultra faciles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DÉCOUPE AUTOMATIQUE EN 1 CLIC :</span>
                  <button
                    onClick={() => handleAutoSplit('horizontal')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem', borderColor: '#ef4444', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Split size={14} />
                    <span>Scinder en 2 (Axe Nord / Sud)</span>
                  </button>
                  <button
                    onClick={() => handleAutoSplit('vertical')}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem', borderColor: '#ef4444', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                  >
                    <Split size={14} />
                    <span>Scinder en 2 (Axe Est / Ouest)</span>
                  </button>
                </div>
              </div>
            )}

            {tool === 'draw' && (
              <div>
                <strong style={{ color: '#10b981', fontSize: '0.82rem', display: 'block', marginBottom: '0.35rem' }}>
                  ➕ Tracer un Nouveau Quartier :
                </strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                  Cliquez successivement sur la carte pour délimiter le quartier ({newDrawPoints.length} points posés).
                </p>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {newDrawPoints.length > 0 && (
                    <button
                      onClick={() => setNewDrawPoints(prev => prev.slice(0, -1))}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <Undo2 size={13} />
                      <span>Annuler point</span>
                    </button>
                  )}
                  {newDrawPoints.length >= 3 && (
                    <button
                      onClick={handleFinishDraw}
                      className="btn btn-primary"
                      style={{ flex: 1.5, fontSize: '0.75rem', padding: '0.35rem', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <Check size={14} />
                      <span>Terminer le contour</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {tool === 'merge' && (
              <div>
                <strong style={{ color: '#f59e0b', fontSize: '0.82rem', display: 'block', marginBottom: '0.35rem' }}>
                  🔗 Fusionner deux Territoires :
                </strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
                  Cliquez sur le premier territoire puis sur le second pour les réunir.
                </p>
                {selectedTerritoryId && mergeSecondaryId && (
                  <button
                    onClick={handleApplyMerge}
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', background: '#f59e0b', borderColor: '#f59e0b' }}
                  >
                    Valider la fusion ({territories.find(t => t.id === selectedTerritoryId)?.number} + {territories.find(t => t.id === mergeSecondaryId)?.number})
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Message de notification / statut */}
          {statusMessage && (
            <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Info size={14} style={{ flexShrink: 0 }} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Fiche Territoire sélectionné */}
          {selectedTerritory && (
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Territoire Actif
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  N° {selectedTerritory.number}
                </div>
                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
                  {selectedTerritory.type}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                {selectedTerritory.label}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.65rem', fontSize: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Surface :</span>
                  <strong style={{ color: '#fff' }}>{currentAreaFormatted}</strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem', borderRadius: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Sommets :</span>
                  <strong style={{ color: '#fff' }}>{selectedTerritory.boundary.length} points</strong>
                </div>
              </div>
            </div>
          )}

          {/* Liste de tous les territoires */}
          <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.45rem', paddingLeft: '0.25rem' }}>
              TERRITOIRES DE LA CONGRÉGATION ({territories.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {territories.map((t, idx) => {
                const isSel = t.id === selectedTerritoryId;
                const isMergeSec = t.id === mergeSecondaryId;
                const col = TERRITORY_COLORS[idx % TERRITORY_COLORS.length];

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (tool === 'merge' && selectedTerritoryId && selectedTerritoryId !== t.id) {
                        setMergeSecondaryId(t.id);
                      } else {
                        setSelectedTerritoryId(t.id);
                        if (mapInstanceRef.current && t.centerCoordinates) {
                          mapInstanceRef.current.panTo(t.centerCoordinates);
                        }
                      }
                    }}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: isSel ? 'rgba(2, 132, 199, 0.2)' : (isMergeSec ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.02)'),
                      border: `1px solid ${isSel ? '#0284c7' : (isMergeSec ? '#f59e0b' : 'rgba(255, 255, 255, 0.06)')}`,
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

      {/* MODALE : Validation de la Découpe */}
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

      {/* MODALE : Nommer le nouveau territoire tracé */}
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
