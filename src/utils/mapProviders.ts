import type { MapLayerId } from '../types';

export interface MapLayerConfig {
  id: MapLayerId;
  name: string;
  category: 'standard' | 'contrast' | 'satellite' | 'google' | 'special';
  url: string;
  maxZoom: number;
  subdomains?: string[];
  attribution: string;
}

export const MAP_LAYERS: Record<MapLayerId, MapLayerConfig> = {
  osm: {
    id: 'osm',
    name: 'OpenStreetMap (Standard)',
    category: 'standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap contributors'
  },
  osm_fr: {
    id: 'osm_fr',
    name: 'OpenStreetMap France',
    category: 'standard',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    maxZoom: 20,
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; OpenStreetMap France'
  },
  carto_light: {
    id: 'carto_light',
    name: 'Basique (CartoDB Positron)',
    category: 'standard',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB & OpenStreetMap'
  },
  carto_dark: {
    id: 'carto_dark',
    name: 'Contrasté / Sombre (Dark Matter)',
    category: 'contrast',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB & OpenStreetMap'
  },
  carto_voyager: {
    id: 'carto_voyager',
    name: 'Coloré / Détaillé (Voyager)',
    category: 'standard',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB'
  },
  watermark: {
    id: 'watermark',
    name: 'En Filigrane (Positron épuré)',
    category: 'special',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB'
  },
  toner_bw: {
    id: 'toner_bw',
    name: 'Noir & Blanc Contrasté',
    category: 'contrast',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c', 'd'],
    attribution: '&copy; CartoDB'
  },
  esri_satellite: {
    id: 'esri_satellite',
    name: 'Satellite Haute Définition (Esri)',
    category: 'satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  esri_street: {
    id: 'esri_street',
    name: 'Rues International (Esri)',
    category: 'standard',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  },
  google_roadmap: {
    id: 'google_roadmap',
    name: 'Google Maps (Plan)',
    category: 'google',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google'
  },
  google_satellite: {
    id: 'google_satellite',
    name: 'Google Maps (Satellite)',
    category: 'google',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google'
  },
  google_hybrid: {
    id: 'google_hybrid',
    name: 'Google Maps (Hybride / Rues + Satellite)',
    category: 'google',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google'
  },
  google_terrain: {
    id: 'google_terrain',
    name: 'Google Maps (Relief / Terrain)',
    category: 'google',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google'
  },
  custom: {
    id: 'custom',
    name: 'Personnalisé (URL de tuiles XYZ)',
    category: 'special',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: 'Fond personnalisé'
  }
};
