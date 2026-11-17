// GET / and POST / under /api/locations (docs/API.md). Issue #4.
import { NewLocation } from '@lm/shared';
import { Router } from 'express';
import type { Deps } from '../deps';
import { requireAuth, userIdOf } from '../auth';
import { createLocation, listLocations } from './repo';

export function locationsRouter(deps: Deps): Router {
  const router = Router();
  router.use(requireAuth(deps));

  router.get('/', async (req, res) => {
    const locations = await listLocations(deps.db, userIdOf(req));
    res.status(200).json({ locations });
  });

  router.post('/', async (req, res) => {
    const body = NewLocation.parse(req.body);
    const location = await createLocation(deps.db, userIdOf(req), {
      ...body,
      id: deps.ids.uuid(),
    });
    res.status(201).json({ location });
  });

  return router;
}
