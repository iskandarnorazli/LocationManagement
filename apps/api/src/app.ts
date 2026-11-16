import { randomUUID } from 'node:crypto';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import { pinoHttp } from 'pino-http';
import type { Logger } from 'pino';
import { errorHandler, notFound } from './http/errorHandler';
import { healthRouter } from './http/health';

export type AppDeps = { pool: Pool; logger: Logger };

// Builds the app without listening, so tests drive it with supertest.
export function createApp({ pool, logger }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRouter(pool));
  // M1 mounts /api/auth and /api/locations here (docs/API.md).

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
