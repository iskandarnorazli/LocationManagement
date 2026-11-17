// POST /register, POST /login, POST /logout, GET /me (docs/API.md). Issue #3.
import { Credentials } from '@lm/shared';
import { Router } from 'express';
import type { Deps } from '../deps';
import { AppError } from '../http/AppError';
import { hashPassword, verifyPassword } from './password';
import { requireAuth, userIdOf } from './requireAuth';
import { sessionCookie, signSession } from './session';
import { asUserId } from './userId';
import { createUser, findUserByEmail, findUserById } from './usersRepo';

export function authRouter(deps: Deps): Router {
  const router = Router();
  const auth = requireAuth(deps);

  router.post('/register', async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    const passwordHash = await hashPassword(password);
    const user = await createUser(deps.db, {
      id: deps.ids.uuid(),
      email,
      passwordHash,
    });
    const token = await signSession(asUserId(user.id), deps.clock, deps.config.JWT_SECRET);
    res.setHeader('Set-Cookie', sessionCookie(token, deps.config.COOKIE_SECURE));
    res.status(201).json({ user });
  });

  router.post('/login', async (req, res) => {
    const { email, password } = Credentials.parse(req.body);
    const row = await findUserByEmail(deps.db, email);
    if (!row || !(await verifyPassword(password, row.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    const token = await signSession(asUserId(row.id), deps.clock, deps.config.JWT_SECRET);
    res.setHeader('Set-Cookie', sessionCookie(token, deps.config.COOKIE_SECURE));
    res.status(200).json({ user: { id: row.id, email: row.email, createdAt: row.createdAt } });
  });

  router.post('/logout', auth, (_req, res) => {
    res.setHeader('Set-Cookie', sessionCookie(null, deps.config.COOKIE_SECURE));
    res.status(204).end();
  });

  router.get('/me', auth, async (req, res) => {
    const user = await findUserById(deps.db, userIdOf(req));
    if (!user) {
      throw new AppError('UNAUTHENTICATED', 'Authentication is required.');
    }
    res.status(200).json({ user });
  });

  return router;
}
