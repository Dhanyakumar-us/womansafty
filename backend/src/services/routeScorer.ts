import { getDb, Incident } from '../db.js';

export interface RouteOption {
  id: string;
  name: string;
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMin: number;
  safetyScore: number;
  riskCategory: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
  color: string;
  dangerHotspots: { lat: number; lng: number; type: string; severity: number }[];
  isSafest: boolean;
}

export interface RouteScoringResult {
  routes: RouteOption[];
  disclaimer: string;
}

function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function queryAllRows<T>(db: any, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function scoreRoutes(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  timeOfDay: 'day' | 'night' | 'all' = 'all'
): Promise<RouteScoringResult> {
  const db = await getDb();

  const minLat = Math.min(startLat, endLat) - 0.05;
  const maxLat = Math.max(startLat, endLat) + 0.05;
  const minLng = Math.min(startLng, endLng) - 0.05;
  const maxLng = Math.max(startLng, endLng) + 0.05;

  let query = `SELECT * FROM incidents WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`;
  const params: any[] = [minLat, maxLat, minLng, maxLng];

  if (timeOfDay !== 'all') {
    query += ` AND (timeOfDay = ? OR timeOfDay = 'all')`;
    params.push(timeOfDay);
  }

  const incidents: Incident[] = queryAllRows<Incident>(db, query, params);

  const reports = queryAllRows<Incident>(
    db,
    `SELECT lat, lng, type, 3 as severity, timestamp, 'community' as source, 'night' as timeOfDay, description
     FROM reports WHERE status = 'approved' AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`,
    [minLat, maxLat, minLng, maxLng]
  );
  const allIncidents: Incident[] = [...incidents, ...reports];

  let rawRoutes: any[] = [];
  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(osrmUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        rawRoutes = data.routes;
      }
    }
  } catch (err) {
    console.warn('[RouteScorer] OSRM fetch warning:', err);
  }

  if (rawRoutes.length === 0) {
    rawRoutes = generateFallbackRouteOptions(startLat, startLng, endLat, endLng);
  }

  const evaluatedRoutes: RouteOption[] = rawRoutes.map((r, index) => {
    let coords: [number, number][] = [];
    if (r.geometry && r.geometry.coordinates) {
      coords = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    } else {
      coords = r.coordinates || [[startLat, startLng], [endLat, endLng]];
    }

    const distanceKm = Number((r.distance ? r.distance / 1000 : getHaversineDistanceKm(startLat, startLng, endLat, endLng)).toFixed(2));
    const durationMin = Math.ceil(r.duration ? r.duration / 60 : (distanceKm / 4.5) * 60);

    let totalRiskScore = 0;
    const hotspotsMap = new Map<string, { lat: number; lng: number; type: string; severity: number }>();

    const stepSize = Math.max(1, Math.floor(coords.length / 30));
    for (let i = 0; i < coords.length; i += stepSize) {
      const [pLat, pLng] = coords[i];

      for (const inc of allIncidents) {
        const distKm = getHaversineDistanceKm(pLat, pLng, inc.lat, inc.lng);
        if (distKm <= 0.3) {
          const ageDays = (Date.now() - new Date(inc.timestamp).getTime()) / (1000 * 3600 * 24);
          const recencyWeight = Math.max(0.3, Math.exp(-0.05 * ageDays));
          const proximityFactor = (0.3 - distKm) / 0.3;

          const incidentRisk = inc.severity * recencyWeight * proximityFactor;
          totalRiskScore += incidentRisk;

          if (distKm <= 0.15 && !hotspotsMap.has(`${inc.lat}-${inc.lng}`)) {
            hotspotsMap.set(`${inc.lat}-${inc.lng}`, {
              lat: inc.lat,
              lng: inc.lng,
              type: inc.type,
              severity: inc.severity
            });
          }
        }
      }
    }

    const normalizedRisk = totalRiskScore / (coords.length / stepSize || 1);
    const safetyScore = Math.max(25, Math.min(98, Math.round(100 - normalizedRisk * 22)));

    let riskCategory: 'SAFE' | 'MODERATE' | 'HIGH_RISK' = 'SAFE';
    if (safetyScore < 60) riskCategory = 'HIGH_RISK';
    else if (safetyScore < 80) riskCategory = 'MODERATE';

    return {
      id: `route-${index + 1}`,
      name: index === 0 ? 'Primary Path' : `Alternative ${index}`,
      coordinates: coords,
      distanceKm,
      durationMin,
      safetyScore,
      riskCategory,
      color: '#10b981',
      dangerHotspots: Array.from(hotspotsMap.values()),
      isSafest: false
    };
  });

  evaluatedRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

  evaluatedRoutes.forEach((route, idx) => {
    if (idx === 0) {
      route.isSafest = true;
      route.name = `${route.name} (Safest)`;
      route.color = '#10b981';
    } else if (idx === 1) {
      route.color = route.safetyScore > 75 ? '#3b82f6' : '#f59e0b';
    } else {
      route.color = '#ef4444';
    }
  });

  return {
    routes: evaluatedRoutes,
    disclaimer: 'Safety scores are estimated based on open incident records and community reports. They are not absolute guarantees of safety. Always remain vigilant of your surroundings.'
  };
}

function generateFallbackRouteOptions(startLat: number, startLng: number, endLat: number, endLng: number) {
  const directCoords: [number, number][] = interpolatePoints(startLat, startLng, endLat, endLng, 15);
  const midLat = (startLat + endLat) / 2 + 0.003;
  const midLng = (startLng + endLng) / 2 + 0.003;
  const curveCoords: [number, number][] = [
    ...interpolatePoints(startLat, startLng, midLat, midLng, 8),
    ...interpolatePoints(midLat, midLng, endLat, endLng, 8)
  ];

  return [
    { coordinates: directCoords, distance: getHaversineDistanceKm(startLat, startLng, endLat, endLng) * 1000, duration: 600 },
    { coordinates: curveCoords, distance: getHaversineDistanceKm(startLat, startLng, endLat, endLng) * 1200, duration: 750 }
  ];
}

function interpolatePoints(lat1: number, lng1: number, lat2: number, lng2: number, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push([lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t]);
  }
  return pts;
}
