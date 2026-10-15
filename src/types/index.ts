export type VisitStatus = 
  | 'not_visited' 
  | 'not_at_home' 
  | 'visited' 
  | 'return_visit' 
  | 'do_not_call';

export type TerritoryStatus = 'available' | 'assigned' | 'completed' | 'in_progress';

export type TerritoryType = 'urban' | 'residential' | 'rural' | 'business' | 'campaign';

export interface LocationTag {
  id: string;
  name: string;
  category: 'language' | 'access' | 'schedule' | 'general';
  color: string;
}

export interface LocationUnit {
  id: string;
  locationId: string;
  floor: string;        // ex: 'RDC', '1er étage', '2ème', 'Entresol'
  unitNumber: string;   // ex: 'Appartement 12', 'Porte droite', '302'
  occupantName?: string;
  status: VisitStatus;
  dateLastVisited?: string;
  notes?: string;          // Note publique (ex: interphone défectueux)
  personalNotes?: string;  // Note personnelle privée du proclamateur
  tags?: string[];
}

export interface LocationItem {
  id: string;
  territoryId: string;
  streetName: string;
  number: string;
  postalCode?: string;
  city?: string;
  latLng: [number, number];
  type: 'house' | 'apartment_building' | 'commercial';
  status: VisitStatus;
  dateLastVisited?: string;
  notes?: string;          // Note publique (ex: code porte, concierge)
  personalNotes?: string;  // Note privée personnelle (revisites, intérêt)
  digicode?: string;       // Digicode / code d'entrée immeuble
  interphoneName?: string;
  tags?: string[];
  doNotCallDate?: string;
  doNotCallReason?: string;
  units: LocationUnit[];
}

export interface FieldNote {
  id: string;
  territoryId: string;
  latLng: [number, number];
  title: string;
  content: string;
  iconType: 'pin' | 'cross' | 'warning' | 'info' | 'key' | 'star' | 'circle';
  color: string;
  createdAt: string;
}

export interface FreehandDrawing {
  id: string;
  type: 'path' | 'cross';
  points: [number, number][]; // Coordonnées géographiques Leaflet [lat, lng]
  color: string;
  width: number;
  label?: string;
}

export type MapLayerId = 
  | 'osm' 
  | 'osm_fr' 
  | 'carto_light' 
  | 'carto_dark' 
  | 'carto_voyager' 
  | 'watermark' 
  | 'toner_bw' 
  | 'esri_satellite' 
  | 'esri_street' 
  | 'google_roadmap' 
  | 'google_satellite' 
  | 'google_hybrid' 
  | 'google_terrain' 
  | 'custom';

export interface MapDisplayOptions {
  layerId: MapLayerId;
  customTileUrl?: string;
  showLocations: boolean;
  locationFilter: 'all' | VisitStatus;
  showLabels: boolean;
  showPolygons: boolean;
  showPolylines: boolean;
  showRectangles: boolean;
  showCircles: boolean;
  showFieldNotes: boolean;
}

export interface Territory {
  id: string;
  number: string;       // ex: '01', '14B'
  label: string;        // ex: 'Quartier Vieux-Lyon'
  type: TerritoryType;
  boundary: [number, number][]; // Coordonnées polygonales [lat, lng]
  centerCoordinates: [number, number];
  shortUrlCode: string;
  status: TerritoryStatus;
  assignee?: string | null;
  serviceGroupId?: string | null;
  dateAssigned?: string | null;
  dateDue?: string | null;
  dateReturned?: string | null;
  dateLastCompleted?: string | null;
  notes?: string;
  campaignId?: string | null;
  annotationDataUrl?: string | null; // Dessin / annotation manuscrite sur la carte
  fieldNotes?: FieldNote[];          // Notes et repères posés par clic sur la carte
  polylines?: [number, number][][];  // Polylignes de tracé / délimitation
  rectangles?: [[number, number], [number, number]][]; // Rectangles de repérage
  circles?: { center: [number, number]; radiusMeters: number; label?: string }[]; // Cercles
  freehandDrawings?: FreehandDrawing[]; // Tracés manuscrits et croix vectorielles géolocalisées
  receiptAcknowledged?: boolean;       // Accusé de réception confirmé par le proclamateur
  receiptAcknowledgedDate?: string | null;
}

export interface TerritoryRequest {
  id: string;
  publisherName: string;
  publisherEmail?: string;
  publisherPhone?: string;             // Numéro WhatsApp / Téléphone du proclamateur
  message: string;
  preferredType?: TerritoryType | 'any';
  requestedTerritoryId?: string | null; // Territoire spécifique demandé (ex: 'terr-01')
  requestedTerritoryNumber?: string | null;
  createdAt: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  fulfilledTerritoryId?: string | null;
  fulfilledDate?: string | null;
}

export interface Publisher {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  serviceGroupId?: string;
}

export interface Campaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes?: string;
}

export interface ServiceGroup {
  id: string;
  name: string;
  overseerName: string;
}

export interface VisitRecord {
  id: string;
  territoryId: string;
  locationId: string;
  unitId?: string;
  addressLabel: string;
  status: VisitStatus;
  timestamp: string;
  publisherName: string;
  campaignId?: string | null;
  notes?: string;
}

export interface CongregationSettings {
  congregationName: string;
  language: string;
  publisherName: string;
  allowDoNotCallDisplay: boolean;
  theme: 'light' | 'dark' | 'system';
  activeCampaignId?: string | null;
  defaultAssignmentMonths: number; // 4 mois par défaut
  preferredMapLayer?: MapLayerId;
  gdprCompliant: boolean; // Respect strict RGPD (France / UE)
  publisherEmail?: string;
  showMapPreview: boolean; // Aperçu / poursuite de la carte sur les fiches
  territoryServantName?: string; // Nom du frère préposé aux territoires
  territoryServantPhone?: string; // Téléphone WhatsApp du préposé pour les demandes
  appVersion?: string;
}
