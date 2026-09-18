import { Router } from 'express';
import { getDb, saveDbToDisk, Report } from '../db.js';

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

// GET /api/reports - list approved community reports
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const reports = queryAllRows<Report>(
      db,
      `SELECT * FROM reports WHERE status = 'approved' ORDER BY timestamp DESC LIMIT 100`
    );
    res.json({ success: true, reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch community reports' });
  }
});

// POST /api/reports - submit community incident report
router.post('/', async (req, res) => {
  try {
    const { lat, lng, type, description, photoUrl, isAnonymous } = req.body;

    if (!lat || !lng || !type || !description) {
      return res.status(400).json({ success: false, error: 'Latitude, longitude, type, and description are required.' });
    }

    const db = await getDb();
    const timestamp = new Date().toISOString();
    const status = 'approved';

    db.run(
      `INSERT INTO reports (lat, lng, type, description, photoUrl, timestamp, isAnonymous, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lat, lng, type, description, photoUrl || null, timestamp, isAnonymous ? 1 : 0, status]
    );

    const severityMap: Record<string, number> = {
      'Physical Assault': 5,
      'Stalking & Following': 4,
      'Verbal Harassment': 3,
      'Poor Lighting': 2,
      'Suspicious Activity': 2
    };

    const severity = severityMap[type] || 3;
    const hour = new Date().getHours();
    const timeOfDay = (hour >= 6 && hour < 18) ? 'day' : 'night';

    db.run(
      `INSERT INTO incidents (lat, lng, type, severity, timestamp, source, timeOfDay, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lat, lng, type, severity, timestamp, 'community', timeOfDay, description]
    );

    saveDbToDisk(db);

    res.json({
      success: true,
      message: 'Report submitted successfully. Thank you for contributing to community safety!'
    });
  } catch (err) {
    console.error('Error saving community report:', err);
    res.status(500).json({ success: false, error: 'Failed to save incident report.' });
  }
});

export default router;
