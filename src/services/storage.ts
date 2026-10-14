import localforage from 'localforage';
import type { 
  Territory, 
  LocationItem, 
  LocationUnit,
  VisitStatus,
  VisitRecord, 
  CongregationSettings, 
  Campaign, 
  ServiceGroup,
  LocationTag,
  Publisher,
  FieldNote,
  TerritoryRequest
} from '../types';

localforage.config({
  name: 'KBVTerritoryDB',
  storeName: 'territories_store',
  description: 'Stockage local persistant des territoires, adresses, visites, campagnes, groupes et proclamateurs'
});

const TERRITORIES_KEY = 'th_territories_v3';
const LOCATIONS_KEY = 'th_locations_v3';
const VISITS_KEY = 'th_visits_v3';
const SETTINGS_KEY = 'th_settings_v3';
const CAMPAIGNS_KEY = 'th_campaigns_v3';
const SERVICE_GROUPS_KEY = 'th_service_groups_v3';
const PUBLISHERS_KEY = 'th_publishers_v3';
const TAGS_KEY = 'th_tags_v3';
const REQUESTS_KEY = 'th_requests_v3';

export const INITIAL_PUBLISHERS: Publisher[] = [
  { id: 'pub-1', name: 'Jean Dupont', phone: '06 12 34 56 78', serviceGroupId: 'grp-1' },
  { id: 'pub-2', name: 'Marc Laurent', phone: '06 23 45 67 89', serviceGroupId: 'grp-2' },
  { id: 'pub-3', name: 'Sophie Laurent', phone: '06 34 56 78 90', serviceGroupId: 'grp-2' },
  { id: 'pub-4', name: 'David Meyer', phone: '06 45 67 89 01', serviceGroupId: 'grp-1' },
  { id: 'pub-5', name: 'Alexandre Roux', phone: '06 56 78 90 12', serviceGroupId: 'grp-3' },
  { id: 'pub-6', name: 'Nicolas Petit', phone: '06 67 89 01 23', serviceGroupId: 'grp-1' },
  { id: 'pub-7', name: 'Élodie Martin', phone: '06 78 90 12 34', serviceGroupId: 'grp-2' }
];

export const DEFAULT_TAGS: LocationTag[] = [
  { id: 'tag-lsf', name: 'LSF (Langue des Signes)', category: 'language', color: '#8b5cf6' },
  { id: 'tag-en', name: 'Anglais', category: 'language', color: '#0ea5e9' },
  { id: 'tag-es', name: 'Espagnol', category: 'language', color: '#f59e0b' },
  { id: 'tag-ar', name: 'Arabe', category: 'language', color: '#10b981' },
  { id: 'tag-code', name: 'Digicode Requis', category: 'access', color: '#ec4899' },
  { id: 'tag-pm', name: 'Présent en fin de journée', category: 'schedule', color: '#6366f1' },
  { id: 'tag-elder', name: 'Personne âgée', category: 'general', color: '#64748b' }
];

export const INITIAL_SERVICE_GROUPS: ServiceGroup[] = [
  { id: 'grp-1', name: 'Groupe 1 - Saint-Jean', overseerName: 'David Meyer' },
  { id: 'grp-2', name: 'Groupe 2 - Pentes & Plateau', overseerName: 'Samuel Laurent' },
  { id: 'grp-3', name: 'Groupe 3 - Presquîle', overseerName: 'Alexandre Roux' }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-memorial',
    name: 'Campagne spéciale du Mémorial 2026',
    startDate: '2026-03-15',
    endDate: '2026-04-12',
    isActive: true,
    notes: 'Distribution prioritaire des invitations imprimées et présentation brève.'
  },
  {
    id: 'camp-convention',
    name: 'Campagne de lAssemblée Régionale',
    startDate: '2026-06-01',
    endDate: '2026-06-28',
    isActive: false,
    notes: 'Invitation pour le grand rassemblement régional.'
  }
];

const INITIAL_TERRITORIES: Territory[] = [
  {
    id: 'terr-01',
    number: '01',
    label: 'Saint-Jean / Cathédrale',
    type: 'urban',
    boundary: [
      [45.7628, 4.8252],
      [45.7645, 4.8275],
      [45.7632, 4.8310],
      [45.7605, 4.8285],
      [45.7612, 4.8258]
    ],
    centerCoordinates: [45.7624, 4.8276],
    shortUrlCode: 'LYON01',
    status: 'assigned',
    assignee: 'Jean Dupont',
    serviceGroupId: 'grp-1',
    campaignId: 'camp-memorial',
    dateAssigned: '2026-10-01',
    dateDue: '2027-02-01', // Règle officielle 4 mois
    notes: 'Zone historique piétonne, privilégier les samedis matin.',
  },
  {
    id: 'terr-02',
    number: '02',
    label: 'Croix-Rousse / Pentes',
    type: 'residential',
    boundary: [
      [45.7725, 4.8280],
      [45.7758, 4.8320],
      [45.7730, 4.8375],
      [45.7698, 4.8335],
      [45.7705, 4.8290]
    ],
    centerCoordinates: [45.7723, 4.8320],
    shortUrlCode: 'LYON02',
    status: 'in_progress',
    assignee: 'Marc Laurent',
    serviceGroupId: 'grp-2',
    dateAssigned: '2026-09-15',
    dateDue: '2027-01-15',
    notes: 'Nombreux traboules et escaliers. Forte concentration dimmeubles.',
  },
  {
    id: 'terr-03',
    number: '03',
    label: 'Presquîle / Cordeliers',
    type: 'business',
    boundary: [
      [45.7640, 4.8340],
      [45.7665, 4.8385],
      [45.7625, 4.8415],
      [45.7595, 4.8370]
    ],
    centerCoordinates: [45.7630, 4.8375],
    shortUrlCode: 'LYON03',
    status: 'available',
    assignee: null,
    serviceGroupId: 'grp-3',
    dateAssigned: null,
    dateDue: null,
    dateLastCompleted: '2026-08-20',
    notes: 'Commerces et appartements en étages. À parcourir en semaine en fin daprès-midi.',
  }
];

const INITIAL_LOCATIONS: LocationItem[] = [
  {
    id: 'loc-101',
    territoryId: 'terr-01',
    streetName: 'Rue Saint-Jean',
    number: '12',
    postalCode: '69005',
    city: 'Lyon',
    latLng: [45.7625, 4.8272],
    type: 'apartment_building',
    status: 'not_visited',
    digicode: '45B2',
    interphoneName: 'Martin / Bernard / Leroy',
    tags: ['tag-code'],
    notes: 'Code porte : 45B2 - Interphone fonctionnel',
    units: [
      { id: 'u-101-1', locationId: 'loc-101', floor: 'RDC', unitNumber: 'Porte Gauche', occupantName: 'M. Martin', status: 'visited', dateLastVisited: '2026-10-10' },
      { id: 'u-101-2', locationId: 'loc-101', floor: 'RDC', unitNumber: 'Porte Droite', occupantName: 'Mme Bernard', status: 'not_at_home', dateLastVisited: '2026-10-10' },
      { id: 'u-101-3', locationId: 'loc-101', floor: '1er', unitNumber: 'Appt 101', occupantName: 'Famille Leroy', status: 'not_visited', tags: ['tag-en'] },
      { id: 'u-101-4', locationId: 'loc-101', floor: '1er', unitNumber: 'Appt 102', occupantName: 'M. Petit', status: 'return_visit', notes: 'Sintéresse à la brochure', personalNotes: 'Discussion approfondie sur Psaume 37:11. Repasser samedi.', dateLastVisited: '2026-10-12', tags: ['tag-pm'] },
      { id: 'u-101-5', locationId: 'loc-101', floor: '2ème', unitNumber: 'Appt 201', occupantName: '', status: 'do_not_call', notes: 'Refus catégorique exprimé le 05/10', dateLastVisited: '2026-10-05' },
    ]
  },
  {
    id: 'loc-102',
    territoryId: 'terr-01',
    streetName: 'Rue Saint-Jean',
    number: '14',
    postalCode: '69005',
    city: 'Lyon',
    latLng: [45.7628, 4.8275],
    type: 'house',
    status: 'visited',
    dateLastVisited: '2026-10-10',
    notes: 'Maison de ville, boîte aux lettres sous la voûte',
    tags: ['tag-elder'],
    units: []
  },
  {
    id: 'loc-103',
    territoryId: 'terr-01',
    streetName: 'Rue Saint-Jean',
    number: '16',
    postalCode: '69005',
    city: 'Lyon',
    latLng: [45.7631, 4.8278],
    type: 'apartment_building',
    status: 'not_at_home',
    dateLastVisited: '2026-10-11',
    notes: 'Pas de code, sonner à linterphone général',
    units: [
      { id: 'u-103-1', locationId: 'loc-103', floor: '1er', unitNumber: 'Apt A', status: 'not_at_home' },
      { id: 'u-103-2', locationId: 'loc-103', floor: '1er', unitNumber: 'Apt B', status: 'not_at_home' },
      { id: 'u-103-3', locationId: 'loc-103', floor: '2ème', unitNumber: 'Apt C', status: 'not_visited', tags: ['tag-es'] },
    ]
  },
  {
    id: 'loc-104',
    territoryId: 'terr-01',
    streetName: 'Place Saint-Jean',
    number: '3',
    postalCode: '69005',
    city: 'Lyon',
    latLng: [45.7618, 4.8268],
    type: 'house',
    status: 'return_visit',
    dateLastVisited: '2026-10-13',
    notes: 'Discussion chaleureuse avec Thomas, a accepté le magazine.',
    personalNotes: 'Aime lhistoire religieuse. Invité à la réunion.',
    units: []
  },
  {
    id: 'loc-201',
    territoryId: 'terr-02',
    streetName: 'Montée de la Grande-Côte',
    number: '45',
    postalCode: '69001',
    city: 'Lyon',
    latLng: [45.7718, 4.8315],
    type: 'apartment_building',
    status: 'not_visited',
    digicode: '1870A',
    notes: 'Traboule traversante, escalier en colimaçon',
    tags: ['tag-code'],
    units: [
      { id: 'u-201-1', locationId: 'loc-201', floor: '1er', unitNumber: 'Porte 1', status: 'visited', dateLastVisited: '2026-10-08' },
      { id: 'u-201-2', locationId: 'loc-201', floor: '2ème', unitNumber: 'Porte 2', status: 'not_at_home', dateLastVisited: '2026-10-08' },
      { id: 'u-201-3', locationId: 'loc-201', floor: '3ème', unitNumber: 'Porte 3', status: 'not_visited' },
    ]
  },
  {
    id: 'loc-202',
    territoryId: 'terr-02',
    streetName: 'Rue des Tables Claudiennes',
    number: '8',
    postalCode: '69001',
    city: 'Lyon',
    latLng: [45.7730, 4.8328],
    type: 'house',
    status: 'not_visited',
    units: []
  }
];

const INITIAL_VISITS: VisitRecord[] = [
  {
    id: 'vis-1',
    territoryId: 'terr-01',
    locationId: 'loc-104',
    addressLabel: 'Place Saint-Jean 3',
    status: 'return_visit',
    timestamp: '2026-10-13T10:45:00Z',
    publisherName: 'Jean Dupont',
    campaignId: 'camp-memorial',
    notes: 'Discussion sur la paix dans le monde. Prévu de repasser.'
  },
  {
    id: 'vis-2',
    territoryId: 'terr-01',
    locationId: 'loc-101',
    unitId: 'u-101-4',
    addressLabel: 'Rue Saint-Jean 12 - 1er - Appt 102',
    status: 'return_visit',
    timestamp: '2026-10-12T17:30:00Z',
    publisherName: 'Jean Dupont',
    campaignId: 'camp-memorial',
    notes: 'A accepté l invitation pour le Mémorial.'
  },
  {
    id: 'vis-3',
    territoryId: 'terr-01',
    locationId: 'loc-101',
    unitId: 'u-101-2',
    addressLabel: 'Rue Saint-Jean 12 - RDC - Porte Droite',
    status: 'not_at_home',
    timestamp: '2026-10-10T11:15:00Z',
    publisherName: 'Jean Dupont'
  },
  {
    id: 'vis-4',
    territoryId: 'terr-01',
    locationId: 'loc-101',
    unitId: 'u-101-1',
    addressLabel: 'Rue Saint-Jean 12 - RDC - Porte Gauche',
    status: 'visited',
    timestamp: '2026-10-10T11:10:00Z',
    publisherName: 'Jean Dupont'
  }
];

const INITIAL_SETTINGS: CongregationSettings = {
  congregationName: 'Lyon Centre',
  language: 'fr',
  publisherName: 'Jean Dupont',
  allowDoNotCallDisplay: true,
  theme: 'dark',
  activeCampaignId: 'camp-memorial',
  defaultAssignmentMonths: 4,
  gdprCompliant: true,
  publisherEmail: 'jean.dupont@congre.org',
  showMapPreview: true,
  appVersion: '4.2.1-fr'
};

export class StorageService {
  static async getTerritories(): Promise<Territory[]> {
    const data = await localforage.getItem<Territory[]>(TERRITORIES_KEY);
    if (!data || data.length === 0) {
      await this.saveTerritories(INITIAL_TERRITORIES);
      return INITIAL_TERRITORIES;
    }
    return data;
  }

  static async saveTerritories(territories: Territory[]): Promise<void> {
    await localforage.setItem(TERRITORIES_KEY, territories);
  }

  static async getLocations(): Promise<LocationItem[]> {
    const data = await localforage.getItem<LocationItem[]>(LOCATIONS_KEY);
    if (!data || data.length === 0) {
      await this.saveLocations(INITIAL_LOCATIONS);
      return INITIAL_LOCATIONS;
    }
    return data;
  }

  static async saveLocations(locations: LocationItem[]): Promise<void> {
    await localforage.setItem(LOCATIONS_KEY, locations);
  }

  static async getVisits(): Promise<VisitRecord[]> {
    const data = await localforage.getItem<VisitRecord[]>(VISITS_KEY);
    if (!data || data.length === 0) {
      await localforage.setItem(VISITS_KEY, INITIAL_VISITS);
      return INITIAL_VISITS;
    }
    return data;
  }

  static async recordVisit(visit: Omit<VisitRecord, 'id' | 'timestamp'>): Promise<VisitRecord> {
    const visits = await this.getVisits();
    const newVisit: VisitRecord = {
      ...visit,
      id: 'vis-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString()
    };
    visits.unshift(newVisit);
    await localforage.setItem(VISITS_KEY, visits);
    return newVisit;
  }

  static async deleteVisit(visitId: string): Promise<void> {
    const visits = await this.getVisits();
    const updated = visits.filter(v => v.id !== visitId);
    await localforage.setItem(VISITS_KEY, updated);
  }

  static async getPublishers(): Promise<Publisher[]> {
    const data = await localforage.getItem<Publisher[]>(PUBLISHERS_KEY);
    if (!data || data.length === 0) {
      await localforage.setItem(PUBLISHERS_KEY, INITIAL_PUBLISHERS);
      return INITIAL_PUBLISHERS;
    }
    return data;
  }

  static async savePublishers(publishers: Publisher[]): Promise<void> {
    await localforage.setItem(PUBLISHERS_KEY, publishers);
  }

  static async getCampaigns(): Promise<Campaign[]> {
    const data = await localforage.getItem<Campaign[]>(CAMPAIGNS_KEY);
    if (!data || data.length === 0) {
      await localforage.setItem(CAMPAIGNS_KEY, INITIAL_CAMPAIGNS);
      return INITIAL_CAMPAIGNS;
    }
    return data;
  }

  static async saveCampaigns(campaigns: Campaign[]): Promise<void> {
    await localforage.setItem(CAMPAIGNS_KEY, campaigns);
  }

  static async getServiceGroups(): Promise<ServiceGroup[]> {
    const data = await localforage.getItem<ServiceGroup[]>(SERVICE_GROUPS_KEY);
    if (!data || data.length === 0) {
      await localforage.setItem(SERVICE_GROUPS_KEY, INITIAL_SERVICE_GROUPS);
      return INITIAL_SERVICE_GROUPS;
    }
    return data;
  }

  static async saveServiceGroups(groups: ServiceGroup[]): Promise<void> {
    await localforage.setItem(SERVICE_GROUPS_KEY, groups);
  }

  static async getTags(): Promise<LocationTag[]> {
    const data = await localforage.getItem<LocationTag[]>(TAGS_KEY);
    if (!data || data.length === 0) {
      await localforage.setItem(TAGS_KEY, DEFAULT_TAGS);
      return DEFAULT_TAGS;
    }
    return data;
  }

  static async getSettings(): Promise<CongregationSettings> {
    const data = await localforage.getItem<CongregationSettings>(SETTINGS_KEY);
    return data || INITIAL_SETTINGS;
  }

  static async saveSettings(settings: CongregationSettings): Promise<void> {
    await localforage.setItem(SETTINGS_KEY, settings);
  }

  // Restitution d'un territoire avec option de réinitialisation
  static async returnTerritory(territoryId: string, resetStatuses: boolean, notes: string): Promise<void> {
    const territories = await this.getTerritories();
    const updatedTerritories = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          status: 'available' as const,
          assignee: null,
          dateAssigned: null,
          dateDue: null,
          dateReturned: new Date().toISOString().split('T')[0],
          dateLastCompleted: new Date().toISOString().split('T')[0],
          notes: notes ? (t.notes ? `${t.notes}\n[Retour]: ${notes}` : `[Retour]: ${notes}`) : t.notes
        };
      }
      return t;
    });
    await this.saveTerritories(updatedTerritories);

    if (resetStatuses) {
      const locations = await this.getLocations();
      const updatedLocations: LocationItem[] = locations.map(loc => {
        if (loc.territoryId === territoryId) {
          // On préserve les "Ne pas appeler" stricts
          const preservedStatus: VisitStatus = loc.status === 'do_not_call' ? 'do_not_call' : 'not_visited';
          const updatedUnits: LocationUnit[] = loc.units.map((u): LocationUnit => ({
            ...u,
            status: (u.status === 'do_not_call' ? 'do_not_call' : 'not_visited') as VisitStatus
          }));
          return {
            ...loc,
            status: preservedStatus,
            units: updatedUnits
          };
        }
        return loc;
      });
      await this.saveLocations(updatedLocations);
    }
  }

  static async saveFieldNote(territoryId: string, note: Omit<FieldNote, 'id' | 'createdAt'>): Promise<FieldNote> {
    const territories = await this.getTerritories();
    const newNote: FieldNote = {
      ...note,
      id: 'fn-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString()
    };
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          fieldNotes: [...(t.fieldNotes || []), newNote]
        };
      }
      return t;
    });
    await this.saveTerritories(updated);
    return newNote;
  }

  static async deleteFieldNote(territoryId: string, noteId: string): Promise<void> {
    const territories = await this.getTerritories();
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          fieldNotes: (t.fieldNotes || []).filter(n => n.id !== noteId)
        };
      }
      return t;
    });
    await this.saveTerritories(updated);
  }

  static async saveFreehandDrawing(territoryId: string, drawing: import('../types').FreehandDrawing): Promise<void> {
    const territories = await this.getTerritories();
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        const existing = t.freehandDrawings || [];
        return {
          ...t,
          freehandDrawings: [...existing, drawing]
        };
      }
      return t;
    });
    await this.saveTerritories(updated);
  }

  static async clearFreehandDrawings(territoryId: string): Promise<void> {
    const territories = await this.getTerritories();
    const updated = territories.map(t => {
      if (t.id === territoryId) {
        return {
          ...t,
          freehandDrawings: []
        };
      }
      return t;
    });
    await this.saveTerritories(updated);
  }

  static async getTerritoryRequests(): Promise<TerritoryRequest[]> {
    const data = await localforage.getItem<TerritoryRequest[]>(REQUESTS_KEY);
    return data || [];
  }

  static async saveTerritoryRequest(req: TerritoryRequest): Promise<void> {
    const requests = await this.getTerritoryRequests();
    await localforage.setItem(REQUESTS_KEY, [req, ...requests]);
  }

  static async updateTerritoryRequestStatus(id: string, status: 'pending' | 'fulfilled' | 'cancelled'): Promise<void> {
    const requests = await this.getTerritoryRequests();
    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    await localforage.setItem(REQUESTS_KEY, updated);
  }

  static async exportData(): Promise<string> {
    const territories = await this.getTerritories();
    const locations = await this.getLocations();
    const visits = await this.getVisits();
    const campaigns = await this.getCampaigns();
    const serviceGroups = await this.getServiceGroups();
    const publishers = await this.getPublishers();
    const settings = await this.getSettings();

    const payload = {
      app: 'KBVTerritory',
      version: '3.1.1-complete',
      exportedAt: new Date().toISOString(),
      territories,
      locations,
      visits,
      campaigns,
      serviceGroups,
      publishers,
      settings
    };
    return JSON.stringify(payload, null, 2);
  }

  static async importData(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (data.territories && Array.isArray(data.territories)) {
        await this.saveTerritories(data.territories);
      }
      if (data.locations && Array.isArray(data.locations)) {
        await this.saveLocations(data.locations);
      }
      if (data.visits && Array.isArray(data.visits)) {
        await localforage.setItem(VISITS_KEY, data.visits);
      }
      if (data.publishers && Array.isArray(data.publishers)) {
        await this.savePublishers(data.publishers);
      }
      if (data.campaigns && Array.isArray(data.campaigns)) {
        await this.saveCampaigns(data.campaigns);
      }
      if (data.serviceGroups && Array.isArray(data.serviceGroups)) {
        await this.saveServiceGroups(data.serviceGroups);
      }
      if (data.settings) {
        await this.saveSettings(data.settings);
      }
      return true;
    } catch (e) {
      console.error('Erreur import data:', e);
      return false;
    }
  }

  static async resetToDefaults(): Promise<void> {
    await this.saveTerritories(INITIAL_TERRITORIES);
    await this.saveLocations(INITIAL_LOCATIONS);
    await localforage.setItem(VISITS_KEY, INITIAL_VISITS);
    await this.savePublishers(INITIAL_PUBLISHERS);
    await this.saveCampaigns(INITIAL_CAMPAIGNS);
    await this.saveServiceGroups(INITIAL_SERVICE_GROUPS);
    await this.saveSettings(INITIAL_SETTINGS);
  }
}
