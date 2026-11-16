// The composition root (D17): the one place that wires features to their dependencies.
// It builds the app without listening, so tests drive it with supertest.
import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';
import { authRouter } from './auth';
import type { Deps } from './deps';
import { errorHandler, notFound } from './http/errorHandler';
import { healthRouter } from './http/health';
import { importRouter } from './import';
import { locationsRouter } from './locations';

export function createApp(deps: Deps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    pinoHttp({
      logger: deps.logger,
      genReqId: (_req, res) => {
        const id = deps.ids.uuid();
        res.setHeader('X-Request-Id', id);
        return id;
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/health', healthRouter(deps.db));
  app.use('/api/auth', authRouter(deps));
  app.use('/api/locations/import', importRouter(deps));
  app.use('/api/locations', locationsRouter(deps));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
