// GET / and POST / under /api/locations (docs/API.md). Issue #4.
import { Router } from 'express';
import type { Deps } from '../deps';
import { requireAuth } from '../auth';
import { notImplemented } from '../lib/notImplemented';

export function locationsRouter(deps: Deps): Router {
  const router = Router();
  router.use(requireAuth(deps));
  router.get('/', () => notImplemented('#4 GET /api/locations'));
  router.post('/', () => notImplemented('#4 POST /api/locations'));
  return router;
}
