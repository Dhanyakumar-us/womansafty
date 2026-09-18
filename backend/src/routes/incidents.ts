import { Router } from 'express';
import { getDb, Incident } from '../db.js';

const router = Router();

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

// GET /api/incidents?bbox=minLng,minLat,maxLng,maxLat&hours=48&timeOfDay=night
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { bbox, hours, timeOfDay } = req.query;

    let query = `SELECT * FROM incidents WHERE 1=1`;
    const params: any[] = [];

    if (bbox && typeof bbox === 'string') {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        query += ` AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?`;
        params.push(minLat, maxLat, minLng, maxLng);
      }
    }

    if (hours) {
      const hoursNum = Number(hours);
      if (!isNaN(hoursNum) && hoursNum > 0) {
        const cutoffTime = new Date(Date.now() - hoursNum * 3600 * 1000).toISOString();
        query += ` AND timestamp >= ?`;
        params.push(cutoffTime);
      }
    }

    if (timeOfDay && (timeOfDay === 'day' || timeOfDay === 'night')) {
      query += ` AND (timeOfDay = ? OR timeOfDay = 'all')`;
      params.push(timeOfDay);
    }

    query += ` ORDER BY timestamp DESC LIMIT 300`;

    const incidents = queryAllRows<Incident>(db, query, params);

    const weightedIncidents = incidents.map(inc => {
      const ageHours = (Date.now() - new Date(inc.timestamp).getTime()) / (3600 * 1000);
      const recencyFactor = Math.max(0.2, 1 - (ageHours / (24 * 30)));
      const intensity = Number((inc.severity * recencyFactor * 0.2).toFixed(2));

      return {
        ...inc,
        intensity: Math.min(1.0, Math.max(0.1, intensity))
      };
    });

    res.json({
      success: true,
      count: weightedIncidents.length,
      incidents: weightedIncidents
    });
  } catch (err) {
    console.error('Error fetching incidents:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch incidents' });
  }
});

export default router;
