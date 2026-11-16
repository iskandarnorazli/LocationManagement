// The auth feature's public surface. Code outside auth/ imports only from here (lint, D20).
export { authRouter } from './routes';
export { requireAuth, userIdOf } from './requireAuth';
export type { UserId } from './userId';
