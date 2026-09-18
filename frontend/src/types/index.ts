export interface Incident {
  id?: number;
  lat: number;
  lng: number;
  type: string;
  severity: number;
  timestamp: string;
  source: 'dataset' | 'rss' | 'community';
  timeOfDay: 'day' | 'night' | 'all';
  description?: string;
  intensity?: number;
}

export interface RouteOption {
  id: string;
  name: string;
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
  safetyScore: number;
  riskCategory: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
  color: string;
  dangerHotspots: { lat: number; lng: number; type: string; severity: number }[];
  isSafest: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation?: string;
}

export interface UserSettings {
  emergencyContacts: EmergencyContact[];
  primaryHelpline: string;
  womenHelpline: string;
  distressHelpline: string;
  alarmVolume: number;
  sirenPin: string;
  enableShakeSOS: boolean;
  enableWakeLock: boolean;
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  displayName: string;
}
