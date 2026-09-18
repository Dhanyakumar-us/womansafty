import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { getDb } from './db.js';
import incidentsRouter from './routes/incidents.js';
import reportsRouter from './routes/reports.js';
import routingRouter from './routes/routing.js';
import { CrimeDataPipeline } from './services/crimePipeline.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support photo upload payload

// API Routes
app.use('/api/incidents', incidentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/safest-route', routingRouter);

// Pipeline manually trigger endpoint
app.post('/api/pipeline/run', async (req, res) => {
  const pipeline = new CrimeDataPipeline();
  const result = await pipeline.runPipeline();
  res.json({ success: true, ...result });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SafeWalk Backend', timestamp: new Date().toISOString() });
});

async function main() {
  // Initialize Database
  await getDb();
  console.log('[SafeWalk DB] SQLite Database initialized successfully.');

  // Run initial crime data pipeline ingestion
  const pipeline = new CrimeDataPipeline();
  pipeline.runPipeline().catch(err => console.warn('[CrimePipeline] Initial background run warning:', err));

  // Schedule crime pipeline to refresh every 6 hours
  cron.schedule('0 */6 * * *', () => {
    console.log('[Cron] Running scheduled crime pipeline update...');
    pipeline.runPipeline();
  });

  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` SafeWalk Backend running on http://localhost:${PORT}`);
    console.log(`=================================================`);
  });
}

main().catch(err => {
  console.error('Fatal backend startup error:', err);
});
