import { Router } from 'express';
import type { Pool } from 'pg';
import { AppError } from './AppError';

export function healthRouter(pool: Pool): Router {
  const router = Router();
  router.get('/live', (_req, res) => {
    res.json({ status: 'ok' });
  });
  router.get('/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
    } catch {
      throw new AppError('UNAVAILABLE', 'The database is not reachable.');
    }
    res.json({ status: 'ok' });
  });
  return router;
}
