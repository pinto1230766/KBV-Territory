// Utilitaire de lancement d'itinéraires GPS (Google Maps, Waze, Apple Maps, OpenStreetMap)

export type NavigationApp = 'google' | 'waze' | 'apple' | 'osm';

export interface NavigationAppOption {
  id: NavigationApp;
  name: string;
  icon: string;
  description: string;
}

export const NAVIGATION_APPS: NavigationAppOption[] = [
  {
    id: 'google',
    name: 'Google Maps',
    icon: '🗺️',
    description: 'Itinéraire piéton, voiture ou vélo avec trafic'
  },
  {
    id: 'waze',
    name: 'Waze',
    icon: '🚗',
    description: 'Navigation GPS communautaire temps réel'
  },
  {
    id: 'apple',
    name: 'Apple Maps',
    icon: '🍏',
    description: 'Plans sur iPhone, iPad et Mac'
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    icon: '🌐',
    description: 'Calcul d itinéraire libre et open-source'
  }
];

export function openNavigation(
  lat: number, 
  lng: number, 
  app: NavigationApp = 'google', 
  label?: string
): void {
  let url = '';
  const encodedLabel = encodeURIComponent(label || 'Point de rendez-vous');

  switch (app) {
    case 'google':
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`;
      break;
    case 'waze':
      url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
      break;
    case 'apple':
      url = `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`;
      break;
    case 'osm':
      url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${lat},${lng}`;
      break;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
