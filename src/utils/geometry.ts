// Utilitaires de géométrie spatiale pour le découpage et la manipulation de polygones géographiques

export type LatLngTuple = [number, number];

// Test si un point [lat, lng] est à l'intérieur d'un polygone [lat, lng][] (Ray Casting Algorithm)
export function isPointInPolygon(point: LatLngTuple, polygon: LatLngTuple[]): boolean {
  if (polygon.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Calcul du centre géographique (Centroïde) d'un polygone
export function calculatePolygonCenter(polygon: LatLngTuple[]): LatLngTuple {
  if (polygon.length === 0) return [45.7624, 4.8276];
  let latSum = 0;
  let lngSum = 0;
  for (const [lat, lng] of polygon) {
    latSum += lat;
    lngSum += lng;
  }
  return [
    Number((latSum / polygon.length).toFixed(6)),
    Number((lngSum / polygon.length).toFixed(6))
  ];
}

// Calcul de distance entre deux points GPS en mètres (Formule de Haversine)
export function calculateDistanceMeters(p1: LatLngTuple, p2: LatLngTuple): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const phi1 = (p1[0] * Math.PI) / 180;
  const phi2 = (p2[0] * Math.PI) / 180;
  const deltaPhi = ((p2[0] - p1[0]) * Math.PI) / 180;
  const deltaLambda = ((p2[1] - p1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Estimation de la superficie approximative en m² ou km²
export function calculatePolygonArea(polygon: LatLngTuple[]): number {
  if (polygon.length < 3) return 0;
  let total = 0;
  const R = 6378137; // Rayon terrestre WGS84

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lon1 = (p1[1] * Math.PI) / 180;
    const lon2 = (p2[1] * Math.PI) / 180;
    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const area = Math.abs((total * R * R) / 2);
  return Math.round(area);
}

// Intersection de 2 segments de ligne : (A-B) et (C-D)
// Retourne le point d'intersection ou null s'ils ne se croisent pas
function lineIntersection(
  a: LatLngTuple,
  b: LatLngTuple,
  c: LatLngTuple,
  d: LatLngTuple
): LatLngTuple | null {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const [x3, y3] = c;
  const [x4, y4] = d;

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (Math.abs(denom) < 1e-12) return null; // Lignes parallèles

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  // L'intersection doit être strictement sur les deux segments (avec marge de tolérance)
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    const ix = x1 + ua * (x2 - x1);
    const iy = y1 + ua * (y2 - y1);
    return [Number(ix.toFixed(6)), Number(iy.toFixed(6))];
  }

  return null;
}

// Algorithme de découpe d'un polygone par une ligne de coupe (cutLine: [start, end])
// Scinde un polygone en 2 sous-polygones géométriquement valides
export function splitPolygonByLine(
  polygon: LatLngTuple[],
  cutStart: LatLngTuple,
  cutEnd: LatLngTuple
): [LatLngTuple[], LatLngTuple[]] | null {
  if (polygon.length < 3) return null;

  // 1. Étendre légèrement la ligne de coupe pour s'assurer qu'elle traverse complètement les frontières
  const dx = cutEnd[0] - cutStart[0];
  const dy = cutEnd[1] - cutStart[1];
  const extendedStart: LatLngTuple = [cutStart[0] - dx * 2, cutStart[1] - dy * 2];
  const extendedEnd: LatLngTuple = [cutEnd[0] + dx * 2, cutEnd[1] + dy * 2];

  // 2. Trouver toutes les intersections avec les arêtes du polygone
  interface IntersectionInfo {
    edgeIndex: number;
    point: LatLngTuple;
  }
  const intersections: IntersectionInfo[] = [];

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const inter = lineIntersection(p1, p2, extendedStart, extendedEnd);
    if (inter) {
      intersections.push({
        edgeIndex: i,
        point: inter
      });
    }
  }

  // Pour une découpe propre, nous devons avoir exactement 2 points d'intersection avec les bords du polygone
  if (intersections.length < 2) {
    return null;
  }

  const int1 = intersections[0];
  const int2 = intersections[1];

  // Assurer que edgeIndex1 < edgeIndex2
  const first = int1.edgeIndex <= int2.edgeIndex ? int1 : int2;
  const second = int1.edgeIndex <= int2.edgeIndex ? int2 : int1;

  // 3. Construction du Premier polygone (Partie A)
  // Du point d'intersection 1 vers point d'intersection 2, puis sommets du polygone original
  const polyA: LatLngTuple[] = [];
  polyA.push(first.point);
  polyA.push(second.point);
  for (let i = second.edgeIndex + 1; i < polygon.length; i++) {
    polyA.push(polygon[i]);
  }
  for (let i = 0; i <= first.edgeIndex; i++) {
    polyA.push(polygon[i]);
  }

  // 4. Construction du Second polygone (Partie B)
  // Du point d'intersection 1, traverse les sommets jusqu'au point d'intersection 2
  const polyB: LatLngTuple[] = [];
  polyB.push(first.point);
  for (let i = first.edgeIndex + 1; i <= second.edgeIndex; i++) {
    polyB.push(polygon[i]);
  }
  polyB.push(second.point);

  // Vérifier la validité des deux polygones formés (au moins 3 sommets chacun)
  if (polyA.length >= 3 && polyB.length >= 3) {
    return [polyA, polyB];
  }

  return null;
}

// Découpe automatique d'un polygone selon l'axe médian (horizontal ou vertical)
export function autoSplitPolygon(
  polygon: LatLngTuple[],
  direction: 'horizontal' | 'vertical' = 'horizontal'
): [LatLngTuple[], LatLngTuple[]] | null {
  if (polygon.length < 3) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of polygon) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;

  if (direction === 'horizontal') {
    // Coupe horizontale (Est - Ouest) : sépare Nord et Sud
    const cutStart: LatLngTuple = [midLat, minLng - spanLng];
    const cutEnd: LatLngTuple = [midLat, maxLng + spanLng];
    return splitPolygonByLine(polygon, cutStart, cutEnd);
  } else {
    // Coupe verticale (Nord - Sud) : sépare Ouest et Est
    const cutStart: LatLngTuple = [minLat - spanLat, midLng];
    const cutEnd: LatLngTuple = [maxLat + spanLat, midLng];
    return splitPolygonByLine(polygon, cutStart, cutEnd);
  }
}

// Découpe multi-parties équilibrée pour 2, 3, 4 ou 5 binômes (durée 2h de prédication)
export function multiSplitPolygon(
  polygon: LatLngTuple[],
  partsCount: number,
  preferredDirection?: 'horizontal' | 'vertical' | 'balanced'
): LatLngTuple[][] | null {
  if (polygon.length < 3 || partsCount < 2) return null;

  // Calcul de la boîte englobante
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of polygon) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;

  // Déterminer la direction optimale selon l'élongation géographique
  const direction: 'horizontal' | 'vertical' =
    preferredDirection === 'horizontal' ? 'horizontal' :
    preferredDirection === 'vertical' ? 'vertical' :
    (spanLat >= spanLng ? 'horizontal' : 'vertical');

  // Cas N = 2 : simple coupe médiane
  if (partsCount === 2) {
    const res = autoSplitPolygon(polygon, direction);
    return res ? [res[0], res[1]] : null;
  }

  // Cas N = 4 avec découpe en quadrant 2x2
  if (partsCount === 4 && preferredDirection !== 'horizontal' && preferredDirection !== 'vertical') {
    const split1 = autoSplitPolygon(polygon, 'horizontal');
    if (split1) {
      const [north, south] = split1;
      const splitNorth = autoSplitPolygon(north, 'vertical');
      const splitSouth = autoSplitPolygon(south, 'vertical');

      const parts: LatLngTuple[][] = [];
      if (splitNorth) parts.push(splitNorth[0], splitNorth[1]);
      else parts.push(north);

      if (splitSouth) parts.push(splitSouth[0], splitSouth[1]);
      else parts.push(south);

      if (parts.length >= 3) return parts;
    }
  }

  // Découpe séquentielle en tranches régulières (pour N = 3, 4 ou 5)
  const results: LatLngTuple[][] = [];
  let remainingPolygon = [...polygon];

  for (let i = 1; i < partsCount; i++) {
    if (direction === 'horizontal') {
      const cutLat = minLat + spanLat * (i / partsCount);
      const cutStart: LatLngTuple = [cutLat, minLng - spanLng * 2];
      const cutEnd: LatLngTuple = [cutLat, maxLng + spanLng * 2];
      const split = splitPolygonByLine(remainingPolygon, cutStart, cutEnd) || autoSplitPolygon(remainingPolygon, 'horizontal');

      if (split) {
        const c0 = calculatePolygonCenter(split[0]);
        const c1 = calculatePolygonCenter(split[1]);
        // Le sous-polygone au Sud (lat plus basse) devient la tranche finie, le Nord reste à couper
        if (c0[0] <= c1[0]) {
          results.push(split[0]);
          remainingPolygon = split[1];
        } else {
          results.push(split[1]);
          remainingPolygon = split[0];
        }
      }
    } else {
      const cutLng = minLng + spanLng * (i / partsCount);
      const cutStart: LatLngTuple = [minLat - spanLat * 2, cutLng];
      const cutEnd: LatLngTuple = [maxLat + spanLat * 2, cutLng];
      const split = splitPolygonByLine(remainingPolygon, cutStart, cutEnd) || autoSplitPolygon(remainingPolygon, 'vertical');

      if (split) {
        const c0 = calculatePolygonCenter(split[0]);
        const c1 = calculatePolygonCenter(split[1]);
        // Le sous-polygone à l'Ouest (lng plus basse) devient la tranche finie, l'Est reste à couper
        if (c0[1] <= c1[1]) {
          results.push(split[0]);
          remainingPolygon = split[1];
        } else {
          results.push(split[1]);
          remainingPolygon = split[0];
        }
      }
    }
  }

  if (remainingPolygon && remainingPolygon.length >= 3) {
    results.push(remainingPolygon);
  }

  if (results.length < 2) return null;
  // Assainir chaque sous-secteur découpé pour exclure ponts, cours d'eau et débordements
  return results.map(p => sanitizeTerritoryBoundary(p));
}

// Détection et assainissement des zones non exploitables à pied (Ponts, fleuves, parcs non habités, voies ferrées)
export function sanitizeTerritoryBoundary(boundary: LatLngTuple[]): LatLngTuple[] {
  if (boundary.length < 3) return boundary;

  const cleaned = boundary.map(([lat, lng]) => {
    let newLat = lat;
    let newLng = lng;

    // 1. Détection spécifique Saône / Pont Alphonse Juin (Vieux-Lyon / Saint-Jean) :
    // La rive droite piétonne le long du Quai Romain Rolland s'arrête à lng ~4.8286.
    // Tout point situé à l'Est de 4.8286 (ex: 4.8310 sur le pont Alphonse Juin ou Quai Saint-Antoine)
    // est un débordement inutile sur le fleuve ou le pont. On le recale sur la rive marchable.
    const isMainlyVieuxLyon = boundary.filter(p => p[1] < 4.8290).length >= boundary.length * 0.5;
    if (isMainlyVieuxLyon && newLng > 4.8286) {
      newLng = 4.8286;
    }

    // 2. Détection Presqu'île (rive gauche de la Saône) : ne pas déborder dans la Saône vers l'Ouest
    const isMainlyPresquile = boundary.filter(p => p[1] >= 4.8315 && p[1] < 4.8400).length >= boundary.length * 0.5;
    if (isMainlyPresquile && newLng < 4.8315) {
      newLng = 4.8315;
    }

    // 3. Détection Rhône (Quai Jules Courmont / Quai Claude Bernard) : ne pas déborder dans le Rhône
    if (isMainlyPresquile && newLng > 4.8395) {
      newLng = 4.8395;
    }

    return [Number(newLat.toFixed(6)), Number(newLng.toFixed(6))] as LatLngTuple;
  });

  // Élimination des sommets consécutifs doublons
  const deduped: LatLngTuple[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const curr = cleaned[i];
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.abs(curr[0] - prev[0]) > 0.00005 || Math.abs(curr[1] - prev[1]) > 0.00005) {
      deduped.push(curr);
    }
  }

  // Fermeture propre : vérifier que le dernier point n'est pas identique au premier
  if (deduped.length > 2) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.abs(first[0] - last[0]) < 0.00005 && Math.abs(first[1] - last[1]) < 0.00005) {
      deduped.pop();
    }
  }

  return deduped.length >= 3 ? deduped : boundary;
}

// Calcul de la charge de travail et évaluation du dimensionnement pour un territoire attribué sur 1 mois
export function estimateMonthlyWorkload(
  doorsCount: number,
  areaM2: number,
  terrainType: 'urban_dense' | 'residential_dispersed' | 'kbv_linguistic'
) {
  let doorsPer2hOuting = 40;
  if (terrainType === 'residential_dispersed') doorsPer2hOuting = 22; // marche plus longue
  if (terrainType === 'kbv_linguistic') doorsPer2hOuting = 55; // vérification ciblée des noms

  // Si des adresses sont enregistrées
  let estimatedOutings = 3;
  let totalHours = 6;
  if (doorsCount > 0) {
    estimatedOutings = Math.max(1, Math.ceil(doorsCount / doorsPer2hOuting));
    totalHours = estimatedOutings * 2;
  } else {
    // Estimation basée sur la surface habitable (excluant ponts/eau)
    const hectares = areaM2 / 10000;
    if (terrainType === 'urban_dense') {
      estimatedOutings = Math.max(2, Math.min(6, Math.round(1.5 + hectares * 1.2)));
    } else if (terrainType === 'residential_dispersed') {
      estimatedOutings = Math.max(2, Math.min(6, Math.round(1.2 + hectares * 0.8)));
    } else {
      estimatedOutings = Math.max(2, Math.min(5, Math.round(1.5 + hectares * 1.0)));
    }
    totalHours = estimatedOutings * 2;
  }

  // Évaluation de la taille pour 1 mois (doit rester raisonnable : ni trop restreint, ni gigantesque)
  let sizeStatus: 'optimal' | 'small' | 'large' = 'optimal';
  let sizeLabel = '✅ Taille idéale (~1 mois)';
  let sizeAdvice = 'Parfaitement calibré pour 3 à 5 sorties de 2h dans le mois.';

  if (estimatedOutings < 3) {
    sizeStatus = 'small';
    sizeLabel = 'ℹ️ Petit territoire (1 à 2 sorties)';
    sizeAdvice = 'Sera terminé rapidement en début de mois.';
  } else if (estimatedOutings > 5) {
    sizeStatus = 'large';
    sizeLabel = '⚠️ Très étendu (> 5 sorties)';
    sizeAdvice = 'Risque de ne pas être terminé en 1 mois par un seul binôme.';
  }

  return {
    estimatedOutings,
    totalHours,
    sizeStatus,
    sizeLabel,
    sizeAdvice
  };
}

// Convertisseur GeoJSON pour export officiel
export function exportCongregationToGeoJSON(territories: { id: string; number: string; label: string; type: string; boundary: LatLngTuple[] }[]) {
  const features = territories.map(t => {
    // Dans GeoJSON les coordonnées sont en [longitude, latitude]
    const coordinates = [t.boundary.map(([lat, lng]) => [lng, lat])];
    // Fermer le polygone si nécessaire
    if (coordinates[0].length > 0) {
      const first = coordinates[0][0];
      const last = coordinates[0][coordinates[0].length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates[0].push(first);
      }
    }

    return {
      type: 'Feature',
      properties: {
        id: t.id,
        number: t.number,
        label: t.label,
        type: t.type
      },
      geometry: {
        type: 'Polygon',
        coordinates
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
}
