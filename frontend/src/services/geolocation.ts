import { GeocodedLocation } from '../types';

export function watchUserLocation(
  onSuccess: (coords: { lat: number; lng: number; accuracy: number }) => void,
  onError: (error: GeolocationPositionError) => void
): number | null {
  if (!navigator.geolocation) {
    onError({
      code: 2,
      message: 'Geolocation is not supported by your browser.',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    } as GeolocationPositionError);
    return null;
  }

  return navigator.geolocation.watchPosition(
    (pos) => {
      onSuccess({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    },
    onError,
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 12000
    }
  );
}

export async function searchLocationNominatim(query: string): Promise<GeocodedLocation[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SafeWalk-WomenSafetyPWA/1.0'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name
    }));
  } catch (err) {
    console.warn('Nominatim geocoding search error:', err);
    return [];
  }
}

export async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SafeWalk-WomenSafetyPWA/1.0'
      }
    });
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (err) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
