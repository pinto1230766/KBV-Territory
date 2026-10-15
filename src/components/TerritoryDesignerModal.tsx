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
  Combine,
  Users,
  Sparkles,
  Building2,
  CheckCircle2
} from 'lucide-react';
import type { Territory, LocationItem, TerritoryType } from '../types';
import { 
  type LatLngTuple, 
  calculatePolygonCenter, 
  calculatePolygonArea, 
  splitPolygonByLine,
  autoSplitPolygon,
  multiSplitPolygon,
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

export interface MultiSplitPartItem {
  id: string;
  num: string;
  label: string;
  boundary: LatLngTuple[];
  doorsCount: number;
  areaFormatted: string;
  areaM2: number;
  estMinutes: number;
  color: string;
}

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
  const [tool, setTool] = useState<'select' | 'split' | 'draw' | 'merge' | 'autosplit'>('select');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(initialTerritories[0]?.id || null);

  // Pour la fusion (sélection de 2 territoires)
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string | null>(null);

  // État Découpage Manuel (Cutter / Split)
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

  // État Découpage Automatique Intelligent (2h / KBV / Binômes)
  const [multiSplitConfig, setMultiSplitConfig] = useState<{
    pairsCount: number; // 2, 3, 4, 5 binômes (soit 4 à 10 proclamateurs)
    terrainType: 'urban_dense' | 'residential_dispersed' | 'kbv_linguistic';
    preferredDirection: 'balanced' | 'horizontal' | 'vertical';
    targetDurationHours: number;
  }>({
    pairsCount: 3,
    terrainType: 'kbv_linguistic',
    preferredDirection: 'balanced',
    targetDurationHours: 2
  });

  const [multiSplitPreview, setMultiSplitPreview] = useState<{
    targetTerritory: Territory;
    parts: MultiSplitPartItem[];
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
  const multiSplitLayerGroupRef = useRef<L.FeatureGroup | null>(null);
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
    const multiSplitGroup = L.featureGroup().addTo(map);

    polygonsLayerGroupRef.current = polygonsGroup;
    handlesLayerGroupRef.current = handlesGroup;
    midpointsLayerGroupRef.current = midpointsGroup;
    multiSplitLayerGroupRef.current = multiSplitGroup;
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

  // Découpage automatique d'un polygone selon l'axe Nord-Sud ou Est-Ouest (2 parties)
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

  // Calcul du Découpage Intelligent Spécifique Prédication 2h / KBV (2 à 5 binômes)
  const handleCalculateMultiSplit = () => {
    if (!selectedTerritory) {
      alert('Veuillez sélectionner un territoire à découper.');
      return;
    }

    if (selectedTerritory.boundary.length < 3) {
      alert('Ce territoire ne comporte pas un polygone valide (au moins 3 sommets).');
      return;
    }

    const subPolygons = multiSplitPolygon(
      selectedTerritory.boundary,
      multiSplitConfig.pairsCount,
      multiSplitConfig.preferredDirection
    );

    if (!subPolygons || subPolygons.length < 2) {
      alert('Impossible de scinder automatiquement ce polygone avec ces paramètres. Essayez une autre orientation.');
      return;
    }

    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const parts: MultiSplitPartItem[] = subPolygons.map((poly, idx) => {
      const letter = letters[idx] || String(idx + 1);
      const partNum = `${selectedTerritory.number}${letter}`;
      const partLabel = `${selectedTerritory.label} (Secteur ${letter} - Binôme ${idx + 1})`;
      const areaM2 = calculatePolygonArea(poly);
      const areaFormatted = areaM2 > 10000 
        ? `${(areaM2 / 10000).toFixed(2)} ha` 
        : `${areaM2.toLocaleString()} m²`;

      // Comptage précis des adresses/portes du territoire parent situées dans ce sous-secteur
      const doorsCount = locations.filter(loc => 
        loc.territoryId === selectedTerritory.id && isPointInPolygon(loc.latLng, poly)
      ).length;

      // Estimation fine de la durée en minutes pour un binôme selon la nature du terrain
      let estMinutes = 120; // Objectif 2h
      if (multiSplitConfig.terrainType === 'urban_dense') {
        // Immeubles denses : 15 min marche/escaliers + 1.2 min/porte
        estMinutes = doorsCount > 0 
          ? Math.round(15 + doorsCount * 1.2)
          : Math.min(135, Math.max(85, Math.round(20 + (areaM2 / 900) * 1.3)));
      } else if (multiSplitConfig.terrainType === 'residential_dispersed') {
        // Pavillonnaire dispersé : 25 min marche entre maisons + 2.8 min/porte
        estMinutes = doorsCount > 0 
          ? Math.round(25 + doorsCount * 2.8)
          : Math.min(145, Math.max(90, Math.round(30 + (areaM2 / 2200) * 2.2)));
      } else {
        // Recherche KBV linguistique (interphones / boîtes aux lettres à scruter)
        estMinutes = doorsCount > 0 
          ? Math.round(20 + doorsCount * 1.5)
          : Math.min(135, Math.max(85, Math.round(22 + (areaM2 / 1300) * 1.6)));
      }

      return {
        id: `sub-${Date.now()}-${idx}`,
        num: partNum,
        label: partLabel,
        boundary: poly,
        doorsCount,
        areaM2,
        areaFormatted,
        estMinutes,
        color: TERRITORY_COLORS[(idx * 2) % TERRITORY_COLORS.length]
      };
    });

    setMultiSplitPreview({
      targetTerritory: selectedTerritory,
      parts
    });

    setStatusMessage(`⚡ Découpage calculé : ${parts.length} sous-territoires équilibrés pour ${multiSplitConfig.pairsCount} binômes (${multiSplitConfig.pairsCount * 2} proclamateurs) !`);
  };

  // Mise à jour rapide d'un sous-secteur calculé
  const handleUpdateMultiSplitPart = (index: number, updates: Partial<MultiSplitPartItem>) => {
    if (!multiSplitPreview) return;
    const newParts = [...multiSplitPreview.parts];
    newParts[index] = { ...newParts[index], ...updates };
    setMultiSplitPreview({ ...multiSplitPreview, parts: newParts });
  };

  // Validation définitive et application du découpage multi-parties
  const handleApplyMultiSplit = () => {
    if (!multiSplitPreview || !selectedTerritory) return;

    const newTerritoriesList: Territory[] = multiSplitPreview.parts.map((part, idx) => {
      return {
        ...selectedTerritory,
        id: `terr-${Date.now().toString(36)}-${idx}`,
        number: part.num.trim() || `${selectedTerritory.number}${String.fromCharCode(65 + idx)}`,
        label: part.label.trim() || `${selectedTerritory.label} (Partie ${String.fromCharCode(65 + idx)})`,
        boundary: part.boundary,
        centerCoordinates: calculatePolygonCenter(part.boundary),
        shortUrlCode: `LYON${part.num.trim().toUpperCase()}`,
        status: 'available',
        assignee: null,
        dateAssigned: null,
        dateDue: null
      };
    });

    // Répartition spatiale automatique de toutes les adresses / portes existantes
    const updatedLocations = locations.map(loc => {
      if (loc.territoryId === selectedTerritory.id) {
        const matched = newTerritoriesList.find(t => isPointInPolygon(loc.latLng, t.boundary));
        if (matched) {
          return { ...loc, territoryId: matched.id };
        }
        return { ...loc, territoryId: newTerritoriesList[0].id };
      }
      return loc;
    });

    // Remplacement du territoire parent par les nouveaux territoires découpés
    const updatedTerritories = territories.filter(t => t.id !== selectedTerritory.id);
    updatedTerritories.push(...newTerritoriesList);

    setTerritories(updatedTerritories);
    setLocations(updatedLocations);
    setSelectedTerritoryId(newTerritoriesList[0].id);
    setMultiSplitPreview(null);
    setTool('select');
    setHasUnsavedChanges(true);
    setStatusMessage(`🎉 Territoire ${selectedTerritory.number} découpé avec succès en ${newTerritoriesList.length} nouveaux territoires (prêts pour vos ${multiSplitConfig.pairsCount} binômes) !`);
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
    const multiSplitGroup = multiSplitLayerGroupRef.current;
    if (!map || !polygonsGroup || !handlesGroup || !midpointsGroup) return;

    polygonsGroup.clearLayers();
    handlesGroup.clearLayers();
    midpointsGroup.clearLayers();
    if (multiSplitGroup) multiSplitGroup.clearLayers();

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
      const isBeingMultiSplit = tool === 'autosplit' && multiSplitPreview && t.id === multiSplitPreview.targetTerritory.id;
      const color = TERRITORY_COLORS[index % TERRITORY_COLORS.length];

      // En mode split ou draw, on laisse les clics traverser vers la carte
      const isDrawingOrSplitting = tool === 'split' || tool === 'draw';

      const polygon = L.polygon(t.boundary, {
        color: isBeingMultiSplit ? 'rgba(255,255,255,0.4)' : (isSelected ? '#38bdf8' : (isMergeSecondary ? '#f59e0b' : color)),
        weight: isBeingMultiSplit ? 1.5 : (isSelected ? 3.5 : (isMergeSecondary ? 3 : 2)),
        fillColor: isMergeSecondary ? '#f59e0b' : color,
        fillOpacity: isBeingMultiSplit ? 0.05 : (isSelected ? 0.35 : (isMergeSecondary ? 0.4 : 0.18)),
        dashArray: isBeingMultiSplit ? '6, 6' : (isSelected ? undefined : '4, 4'),
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

    // 5. Affichage dynamique des sous-territoires calculés (Mode Découpe Auto 'autosplit')
    if (tool === 'autosplit' && multiSplitPreview && multiSplitGroup) {
      multiSplitPreview.parts.forEach((part, idx) => {
        L.polygon(part.boundary, {
          color: part.color,
          weight: 3.5,
          fillColor: part.color,
          fillOpacity: 0.45,
          dashArray: undefined,
          interactive: true
        }).addTo(multiSplitGroup);

        const center = calculatePolygonCenter(part.boundary);
        const hours = Math.floor(part.estMinutes / 60);
        const mins = part.estMinutes % 60;
        const timeFormatted = mins > 0 ? `${hours}h${mins < 10 ? '0' : ''}${mins}` : `${hours}h`;

        const badgeIcon = L.divIcon({
          className: 'multi-split-label',
          html: `
            <div style="
              background: ${part.color};
              color: white;
              padding: 4px 8px;
              border-radius: 7px;
              font-size: 11px;
              font-weight: 800;
              border: 1.5px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.55);
              text-align: center;
              white-space: nowrap;
              pointer-events: none;
            ">
              <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>👥 Binôme ${idx + 1}</span>
                <span style="background: rgba(255,255,255,0.25); padding: 1px 4px; border-radius: 4px; font-size: 10px;">N° ${part.num}</span>
              </div>
              <div style="font-size: 9px; font-weight: 600; opacity: 0.95; margin-top: 2px;">
                ${part.doorsCount > 0 ? `${part.doorsCount} adresses` : part.areaFormatted} • ~${timeFormatted}
              </div>
            </div>
          `,
          iconSize: [126, 42],
          iconAnchor: [63, 21]
        });

        L.marker(center, { icon: badgeIcon, interactive: false }).addTo(multiSplitGroup);
      });
    }

  }, [territories, selectedTerritoryId, mergeSecondaryId, tool, cutPoints, newDrawPoints, multiSplitPreview]);

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
              setTool('autosplit');
              setCutPoints([]);
              setSplitPreview(null);
              setNewDrawPoints([]);
              setMergeSecondaryId(null);
              setStatusMessage('⚡ Mode Découpage Intelligent (2h / KBV) activé : Configurez vos binômes et lancez la découpe optimisée.');
            }}
            className={`btn ${tool === 'autosplit' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ 
              padding: '0.4rem 0.8rem', 
              fontSize: '0.8rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              background: tool === 'autosplit' ? 'linear-gradient(135deg, #0284c7 0%, #8b5cf6 100%)' : undefined,
              color: tool === 'autosplit' ? '#ffffff' : undefined,
              fontWeight: tool === 'autosplit' ? 700 : 500,
              boxShadow: tool === 'autosplit' ? '0 2px 8px rgba(2, 132, 199, 0.4)' : undefined
            }}
            title="Découpage automatique pour groupe de prédication (5 à 10 proclamateurs en binômes, 2h)"
          >
            <Sparkles size={15} />
            <span>⚡ Découpe Auto (2h / KBV)</span>
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

            {tool === 'autosplit' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <Sparkles size={16} color="#38bdf8" />
                  <strong style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                    Découpage Auto (2h / KBV) :
                  </strong>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '0 0 0.65rem 0' }}>
                  Calibré pour une sortie de <strong>2 heures</strong> avec <strong>5 à 10 proclamateurs</strong> en binômes recherchant les personnes capverdiennes.
                </p>

                {/* 1. Choix du nombre de binômes */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    <Users size={13} />
                    <span>Effectif du groupe :</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
                    {[
                      { pairs: 2, label: '2 binômes', people: '4-5 pers.' },
                      { pairs: 3, label: '3 binômes', people: '6-7 pers.' },
                      { pairs: 4, label: '4 binômes', people: '8 pers.' },
                      { pairs: 5, label: '5 binômes', people: '10 pers.' },
                    ].map((item) => {
                      const isSel = multiSplitConfig.pairsCount === item.pairs;
                      return (
                        <button
                          key={item.pairs}
                          onClick={() => setMultiSplitConfig(prev => ({ ...prev, pairsCount: item.pairs }))}
                          type="button"
                          style={{
                            padding: '0.35rem 0.2rem',
                            borderRadius: '6px',
                            background: isSel ? '#0284c7' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isSel ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                            color: '#fff',
                            cursor: 'pointer',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 800 }}>{item.label}</div>
                          <div style={{ fontSize: '0.6rem', color: isSel ? '#e0f2fe' : 'var(--text-muted)' }}>{item.people}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Type de terrain & rythme de recherche */}
                <div style={{ marginBottom: '0.65rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    <Building2 size={13} />
                    <span>Configuration de la zone :</span>
                  </label>
                  <select
                    value={multiSplitConfig.terrainType}
                    onChange={(e) => setMultiSplitConfig(prev => ({ ...prev, terrainType: e.target.value as any }))}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  >
                    <option value="kbv_linguistic">🇨🇻 Recherche KBV (Interphones & Boîtes)</option>
                    <option value="urban_dense">🏢 Immeubles denses & Pâtés groupés</option>
                    <option value="residential_dispersed">🏡 Pavillonnaire dispersé (Plus de marche)</option>
                  </select>
                </div>

                {/* 3. Orientation de la découpe */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Tranchage géographique :
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem' }}>
                    {[
                      { id: 'balanced', label: '⚡ Équilibré' },
                      { id: 'horizontal', label: '↕️ Nord/Sud' },
                      { id: 'vertical', label: '↔️ Est/Ouest' }
                    ].map((dir) => {
                      const isSel = multiSplitConfig.preferredDirection === dir.id;
                      return (
                        <button
                          key={dir.id}
                          onClick={() => setMultiSplitConfig(prev => ({ ...prev, preferredDirection: dir.id as any }))}
                          type="button"
                          style={{
                            padding: '0.3rem',
                            borderRadius: '5px',
                            background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSel ? '#38bdf8' : 'rgba(255,255,255,0.08)'}`,
                            color: isSel ? '#38bdf8' : 'var(--text-secondary)',
                            fontSize: '0.7rem',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          {dir.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Bouton principal de calcul */}
                <button
                  onClick={handleCalculateMultiSplit}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    fontSize: '0.78rem',
                    padding: '0.5rem',
                    background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                    borderColor: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Sparkles size={15} />
                  <span>Calculer la répartition ({multiSplitConfig.pairsCount} binômes)</span>
                </button>

                {/* 5. Prévisualisation & Validation des sous-territoires */}
                {multiSplitPreview && (
                  <div style={{ marginTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>
                        ✓ {multiSplitPreview.parts.length} Secteurs prêts (~2h chacun) :
                      </span>
                      <button
                        onClick={() => setMultiSplitPreview(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer' }}
                      >
                        Annuler
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto', marginBottom: '0.75rem' }}>
                      {multiSplitPreview.parts.map((p, pIdx) => {
                        const hrs = Math.floor(p.estMinutes / 60);
                        const mins = p.estMinutes % 60;
                        const timeStr = mins > 0 ? `${hrs}h${mins < 10 ? '0' : ''}${mins}` : `${hrs}h`;

                        return (
                          <div
                            key={p.id}
                            style={{
                              background: 'rgba(0,0,0,0.3)',
                              border: `1px solid ${p.color}`,
                              borderRadius: '6px',
                              padding: '0.45rem 0.6rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                                <strong style={{ fontSize: '0.76rem', color: '#fff' }}>Binôme {pIdx + 1}</strong>
                              </div>
                              <input
                                type="text"
                                value={p.num}
                                onChange={(e) => handleUpdateMultiSplitPart(pIdx, { num: e.target.value })}
                                style={{
                                  width: '55px',
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.35rem',
                                  background: 'rgba(255,255,255,0.08)',
                                  border: '1px solid rgba(255,255,255,0.2)',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  textAlign: 'center',
                                  fontWeight: 800
                                }}
                                title="Numéro du sous-territoire"
                              />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              <span>{p.doorsCount > 0 ? `${p.doorsCount} portes réparties` : p.areaFormatted}</span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Temps : ~{timeStr}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleApplyMultiSplit}
                      className="btn btn-primary"
                      style={{
                        width: '100%',
                        fontSize: '0.78rem',
                        padding: '0.45rem',
                        background: '#10b981',
                        borderColor: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        fontWeight: 700
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>Confirmer et Créer les {multiSplitPreview.parts.length} Territoires</span>
                    </button>
                  </div>
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
