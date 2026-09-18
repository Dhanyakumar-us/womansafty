import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

export interface Incident {
  id?: number;
  lat: number;
  lng: number;
  type: string;
  severity: number; // 1 (minor) to 5 (extreme)
  timestamp: string;
  source: 'dataset' | 'rss' | 'community';
  timeOfDay: 'day' | 'night' | 'all';
  description?: string;
  verified?: number;
}

export interface Report {
  id?: number;
  lat: number;
  lng: number;
  type: string;
  description: string;
  photoUrl?: string;
  timestamp: string;
  isAnonymous: number;
  status: 'pending' | 'approved';
}

let dbInstance: Database | null = null;
const dbFilePath = path.join(process.cwd(), 'safewalk.db');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbFilePath)) {
    const filebuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      type TEXT NOT NULL,
      severity INTEGER NOT NULL DEFAULT 3,
      timestamp TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'dataset',
      timeOfDay TEXT NOT NULL DEFAULT 'night',
      description TEXT,
      verified INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      photoUrl TEXT,
      timestamp TEXT NOT NULL,
      isAnonymous INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'approved'
    );
  `);

  // Save DB to disk
  saveDbToDisk(dbInstance);

  // Seed default data if database is empty
  const res = dbInstance.exec('SELECT COUNT(*) as count FROM incidents');
  const count = res[0]?.values[0][0] as number || 0;
  
  if (count === 0) {
    console.log('[SQLite] Seeding initial crime incident dataset...');
    await seedInitialData(dbInstance);
  }

  return dbInstance;
}

export function saveDbToDisk(db: Database) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.warn('[SQLite] Failed to persist DB to disk:', err);
  }
}

async function seedInitialData(db: Database) {
  const seedIncidents: Omit<Incident, 'id'>[] = [
    // Delhi / Connaught Place & nearby regions
    { lat: 28.6315, lng: 77.2167, type: 'Poor Lighting & Harassment', severity: 4, timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Unlit alley near metro station entry 3' },
    { lat: 28.6328, lng: 77.2195, type: 'Stalking Incident', severity: 3, timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), source: 'rss', timeOfDay: 'night', description: 'Reported catcalling and suspicious vehicle' },
    { lat: 28.6280, lng: 77.2120, type: 'Physical Assault', severity: 5, timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Aggressive encounter reported near parking structure' },
    { lat: 28.6350, lng: 77.2250, type: 'Pickpocketing & Snatching', severity: 2, timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), source: 'community', timeOfDay: 'day', description: 'Chain snatching on busy pedestrian walkway' },
    { lat: 28.6250, lng: 77.2080, type: 'Isolated Park Area', severity: 3, timestamp: new Date(Date.now() - 3600000 * 72).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Poor security presence after 8 PM' },
    
    // Mumbai / Churchgate & Colaba
    { lat: 18.9322, lng: 72.8264, type: 'Verbal Harassment', severity: 3, timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), source: 'rss', timeOfDay: 'night', description: 'Groups loitering near station exit' },
    { lat: 18.9220, lng: 72.8315, type: 'Poor Lighting', severity: 2, timestamp: new Date(Date.now() - 3600000 * 15).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Street lights malfunctioning along lane' },

    // Bengaluru / MG Road & Indiranagar
    { lat: 12.9756, lng: 77.6066, type: 'Stalking & Following', severity: 4, timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), source: 'community', timeOfDay: 'night', description: 'Person following pedestrians towards bus stop' },
    { lat: 12.9784, lng: 77.6408, type: 'Crowded Harassment', severity: 3, timestamp: new Date(Date.now() - 3600000 * 30).toISOString(), source: 'rss', timeOfDay: 'night', description: 'Eve teasing reported near night venue' },

    // London / Soho & Central
    { lat: 51.5136, lng: -0.1365, type: 'Suspicious Activity', severity: 3, timestamp: new Date(Date.now() - 3600000 * 6).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Unsafe loitering near unlit underpass' },
    { lat: 51.5115, lng: -0.1281, type: 'Mobile Snatching', severity: 3, timestamp: new Date(Date.now() - 3600000 * 18).toISOString(), source: 'dataset', timeOfDay: 'day', description: 'Phone theft by bike riders' },

    // New York / Manhattan & Times Square periphery
    { lat: 40.7580, lng: -73.9855, type: 'Harassment', severity: 3, timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), source: 'rss', timeOfDay: 'night', description: 'Verbal harassment outside subway entrance' },
    { lat: 40.7505, lng: -73.9934, type: 'Subway Alley Danger', severity: 4, timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), source: 'dataset', timeOfDay: 'night', description: 'Unattended dark corner near 34th station' }
  ];

  const stmt = db.prepare(
    `INSERT INTO incidents (lat, lng, type, severity, timestamp, source, timeOfDay, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const item of seedIncidents) {
    stmt.run([item.lat, item.lng, item.type, item.severity, item.timestamp, item.source, item.timeOfDay, item.description || '']);
  }
  stmt.free();

  // Seed sample approved community report
  db.run(
    `INSERT INTO reports (lat, lng, type, description, timestamp, isAnonymous, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [28.6340, 77.2180, 'Poor Lighting', 'Broken streetlamps make this path very dark after dusk.', new Date().toISOString(), 1, 'approved']
  );

  saveDbToDisk(db);
}
