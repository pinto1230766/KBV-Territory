import type { Territory, TerritoryType } from '../types';

export interface ImportResult {
  success: boolean;
  importedCount: number;
  message: string;
  territories: Territory[];
  errors?: string[];
}

/**
 * Calcule le centre géographique [lat, lng] d'un polygone
 */
function calculateCenter(boundary: [number, number][]): [number, number] {
  if (boundary.length === 0) return [45.7640, 4.8357];
  let sumLat = 0;
  let sumLng = 0;
  boundary.forEach(([lat, lng]) => {
    sumLat += lat;
    sumLng += lng;
  });
  return [sumLat / boundary.length, sumLng / boundary.length];
}

/**
 * Tente d'extraire le numéro et le nom depuis une chaîne de titre
 * ex: "01 - Saint-Jean" -> { number: "01", label: "Saint-Jean" }
 * ex: "Territoire 14" -> { number: "14", label: "Territoire 14" }
 */
function extractNumberAndLabel(rawName: string, index: number): { number: string; label: string } {
  const clean = rawName.trim();
  const match = clean.match(/^([0-9]+[A-Za-z]?)\s*[-:–—]\s*(.+)$/);
  if (match) {
    return { number: match[1].trim(), label: match[2].trim() };
  }

  const numOnlyMatch = clean.match(/^(?:territoire\s*)?([0-9]+[A-Za-z]?)$/i);
  if (numOnlyMatch) {
    return { number: numOnlyMatch[1].trim(), label: `Territoire ${numOnlyMatch[1].trim()}` };
  }

  return { number: (index + 1).toString().padStart(2, '0'), label: clean || `Territoire ${index + 1}` };
}

/**
 * Parser KML (Google Earth / Export Territory Helper KML)
 */
export function parseKML(kmlText: string): ImportResult {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    if (placemarks.length === 0) {
      return {
        success: false,
        importedCount: 0,
        message: 'Aucun polygone ou territoire (Placemark) trouvé dans le fichier KML.',
        territories: []
      };
    }

    const territories: Territory[] = [];

    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const nameElem = pm.getElementsByTagName('name')[0];
      const rawName = nameElem ? nameElem.textContent || '' : `Territoire ${i + 1}`;
      const descElem = pm.getElementsByTagName('description')[0];
      const desc = descElem ? descElem.textContent || '' : '';

      const { number, label } = extractNumberAndLabel(rawName, i);

      // Recherche des coordonnées dans le polygone
      const coordinatesElem = pm.getElementsByTagName('coordinates')[0];
      if (!coordinatesElem || !coordinatesElem.textContent) continue;

      const rawCoords = coordinatesElem.textContent.trim().split(/\s+/);
      const boundary: [number, number][] = [];

      rawCoords.forEach(c => {
        const parts = c.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            boundary.push([lat, lng]);
          }
        }
      });

      if (boundary.length < 3) continue;

      const center = calculateCenter(boundary);

      territories.push({
        id: `terr-kml-${Date.now()}-${i}`,
        number,
        label,
        type: 'urban' as TerritoryType,
        boundary,
        centerCoordinates: center,
        shortUrlCode: `TH${number.replace(/[^A-Za-z0-9]/g, '')}`,
        status: 'available',
        notes: desc.replace(/<[^>]*>/g, '').trim() || undefined
      });
    }

    return {
      success: territories.length > 0,
      importedCount: territories.length,
      message: `${territories.length} territoire(s) importé(s) avec succès depuis le fichier KML !`,
      territories
    };
  } catch (err) {
    return {
      success: false,
      importedCount: 0,
      message: `Erreur lors de la lecture du fichier KML : ${err instanceof Error ? err.message : String(err)}`,
      territories: []
    };
  }
}

/**
 * Parser GeoJSON (Export Territory Helper GeoJSON / FeatureCollection)
 */
export function parseGeoJSON(jsonText: string): ImportResult {
  try {
    const data = JSON.parse(jsonText);
    const territories: Territory[] = [];

    const features = data.features || (data.type === 'Feature' ? [data] : []);

    features.forEach((feature: any, idx: number) => {
      const geom = feature.geometry;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return;

      const props = feature.properties || {};
      const rawName = props.name || props.title || props.label || props.id || `Territoire ${idx + 1}`;
      const { number, label } = extractNumberAndLabel(String(rawName), idx);

      let coordinatesRaw: number[][][] = [];
      if (geom.type === 'Polygon') {
        coordinatesRaw = geom.coordinates;
      } else if (geom.type === 'MultiPolygon' && geom.coordinates.length > 0) {
        coordinatesRaw = geom.coordinates[0];
      }

      if (!coordinatesRaw || coordinatesRaw.length === 0) return;

      const ring = coordinatesRaw[0];
      const boundary: [number, number][] = ring
        .map((pt: number[]) => [pt[1], pt[0]] as [number, number])
        .filter(([lat, lng]: [number, number]) => !isNaN(lat) && !isNaN(lng));

      if (boundary.length < 3) return;

      const center = calculateCenter(boundary);

      territories.push({
        id: `terr-geo-${Date.now()}-${idx}`,
        number,
        label,
        type: (props.type as TerritoryType) || 'urban',
        boundary,
        centerCoordinates: center,
        shortUrlCode: `TH${number.replace(/[^A-Za-z0-9]/g, '')}`,
        status: props.status === 'assigned' ? 'assigned' : 'available',
        assignee: props.assignee || props.publisher || null,
        dateAssigned: props.dateAssigned || null,
        dateDue: props.dateDue || null,
        notes: props.notes || props.description || undefined
      });
    });

    return {
      success: territories.length > 0,
      importedCount: territories.length,
      message: `${territories.length} territoire(s) importé(s) depuis le GeoJSON !`,
      territories
    };
  } catch (err) {
    return {
      success: false,
      importedCount: 0,
      message: `Erreur de lecture GeoJSON : ${err instanceof Error ? err.message : String(err)}`,
      territories: []
    };
  }
}

/**
 * Parser CSV Territory Helper
 */
export function parseCSV(csvText: string): ImportResult {
  try {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, importedCount: 0, message: 'Fichier CSV vide ou incomplet.', territories: [] };
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const numIdx = headers.findIndex(h => h.includes('num') || h.includes('id') || h.includes('no'));
    const labelIdx = headers.findIndex(h => h.includes('nom') || h.includes('label') || h.includes('name') || h.includes('description'));
    const assigneeIdx = headers.findIndex(h => h.includes('assign') || h.includes('proclamateur') || h.includes('publisher'));
    const statusIdx = headers.findIndex(h => h.includes('statut') || h.includes('status'));

    const territories: Territory[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(separator).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (row.length < 2) continue;

      const num = numIdx !== -1 && row[numIdx] ? row[numIdx] : (i).toString().padStart(2, '0');
      const lbl = labelIdx !== -1 && row[labelIdx] ? row[labelIdx] : `Territoire ${num}`;
      const assignee = assigneeIdx !== -1 && row[assigneeIdx] ? row[assigneeIdx] : null;
      const statusRaw = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].toLowerCase() : 'available';

      // Polygone fictif de base centré
      const baseLat = 45.7640 + (i * 0.002);
      const baseLng = 4.8357 + (i * 0.002);
      const boundary: [number, number][] = [
        [baseLat - 0.001, baseLng - 0.001],
        [baseLat + 0.001, baseLng - 0.001],
        [baseLat + 0.001, baseLng + 0.001],
        [baseLat - 0.001, baseLng + 0.001]
      ];

      territories.push({
        id: `terr-csv-${Date.now()}-${i}`,
        number: num,
        label: lbl,
        type: 'urban',
        boundary,
        centerCoordinates: [baseLat, baseLng],
        shortUrlCode: `TH${num.replace(/[^A-Za-z0-9]/g, '')}`,
        status: assignee ? 'assigned' : (statusRaw.includes('assign') ? 'assigned' : 'available'),
        assignee: assignee || null
      });
    }

    return {
      success: territories.length > 0,
      importedCount: territories.length,
      message: `${territories.length} territoire(s) importé(s) depuis le CSV !`,
      territories
    };
  } catch (err) {
    return {
      success: false,
      importedCount: 0,
      message: `Erreur lors du traitement CSV : ${err instanceof Error ? err.message : String(err)}`,
      territories: []
    };
  }
}

/**
 * Détecteur et routeur universel : analyse automatiquement le type de fichier (KML, GeoJSON, CSV, JSON)
 */
export function parseTerritoryHelperFile(content: string, fileName: string): ImportResult {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'kml' || content.includes('<kml') || content.includes('<Placemark')) {
    return parseKML(content);
  }

  if (ext === 'geojson' || (ext === 'json' && content.includes('"FeatureCollection"'))) {
    return parseGeoJSON(content);
  }

  if (ext === 'csv' || content.includes(';') || (content.includes(',') && !content.includes('{'))) {
    return parseCSV(content);
  }

  // Si c'est un JSON complet (Sauvegarde standard KBV / Territory Helper)
  try {
    const data = JSON.parse(content);
    if (data.territories && Array.isArray(data.territories)) {
      return {
        success: true,
        importedCount: data.territories.length,
        message: `${data.territories.length} territoire(s) importé(s) avec succès !`,
        territories: data.territories
      };
    }
  } catch {
    // ignore
  }

  return {
    success: false,
    importedCount: 0,
    message: 'Format de fichier non reconnu. Veuillez déposer un fichier .kml, .geojson, .csv ou .json exporté depuis Territory Helper.',
    territories: []
  };
}
