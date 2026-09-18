import { Router } from 'express';
import { scoreRoutes } from '../services/routeScorer.js';

const router = Router();

// POST /api/safest-route
router.post('/', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, timeOfDay } = req.body;

    if (startLat === undefined || startLng === undefined || endLat === undefined || endLng === undefined) {
      return res.status(400).json({ success: false, error: 'Start and end coordinates are required.' });
    }

    const result = await scoreRoutes(
      Number(startLat),
      Number(startLng),
      Number(endLat),
      Number(endLng),
      timeOfDay || 'all'
    );

    res.json({
      success: true,
      routes: result.routes,
      disclaimer: result.disclaimer
    });
  } catch (err) {
    console.error('Error computing safest route:', err);
    res.status(500).json({ success: false, error: 'Failed to compute route safety scores.' });
  }
});

export default router;
