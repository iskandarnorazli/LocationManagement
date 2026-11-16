// POST /register, POST /login, POST /logout, GET /me (docs/API.md). Issue #3.
import { Router } from 'express';
import type { Deps } from '../deps';
import { notImplemented } from '../lib/notImplemented';

export function authRouter(deps: Deps): Router {
  const router = Router();
  router.post('/register', () => notImplemented('#3 POST /api/auth/register', deps));
  router.post('/login', () => notImplemented('#3 POST /api/auth/login'));
  router.post('/logout', () => notImplemented('#3 POST /api/auth/logout'));
  router.get('/me', () => notImplemented('#3 GET /api/auth/me'));
  return router;
}
