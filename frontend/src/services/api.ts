import { Incident, RouteOption } from '../types';

const API_BASE = '/api';

export async function fetchIncidents(params?: {
  bbox?: string;
  hours?: number;
  timeOfDay?: 'day' | 'night' | 'all';
}): Promise<Incident[]> {
  try {
    const query = new URLSearchParams();
    if (params?.bbox) query.append('bbox', params.bbox);
    if (params?.hours) query.append('hours', params.hours.toString());
    if (params?.timeOfDay) query.append('timeOfDay', params.timeOfDay);

    const res = await fetch(`${API_BASE}/incidents?${query.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.incidents || [];
  } catch (err) {
    console.warn('[API] Error fetching incidents from backend:', err);
    return [];
  }
}

export async function fetchSafestRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  timeOfDay: 'day' | 'night' | 'all' = 'all'
): Promise<{ routes: RouteOption[]; disclaimer: string }> {
  try {
    const res = await fetch(`${API_BASE}/safest-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startLat, startLng, endLat, endLng, timeOfDay })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      routes: data.routes || [],
      disclaimer: data.disclaimer || 'Safety scores are estimates.'
    };
  } catch (err) {
    console.error('[API] Error computing safest routes:', err);
    throw err;
  }
}

export async function submitCommunityReport(reportData: {
  lat: number;
  lng: number;
  type: string;
  description: string;
  photoUrl?: string;
  isAnonymous: boolean;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[API] Error submitting report:', err);
    throw err;
  }
}
