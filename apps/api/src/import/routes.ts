// POST /api/locations/import (docs/API.md, D8). Order: multer (1 MiB) -> readSingleTextFile ->
// parseLocations -> one transaction with insertMany. Each failure throws the AppError whose code
// the step returned. Issue #7.
import { Router } from 'express';
import type { Deps } from '../deps';
import { requireAuth } from '../auth';
import { notImplemented } from '../lib/notImplemented';

export const MAX_UPLOAD_BYTES = 1024 * 1024;

export function importRouter(deps: Deps): Router {
  const router = Router();
  router.use(requireAuth(deps));
  router.post('/', () => notImplemented('#7 POST /api/locations/import'));
  return router;
}
