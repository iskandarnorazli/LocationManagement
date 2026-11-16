import { pino } from 'pino';
import { createApp } from './app';
import { loadConfig } from './config';
import { createPool } from './db/pool';
import { migrate } from './db/migrate';
import { systemClock, systemIds } from './ports';

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });
const db = createPool(config.DATABASE_URL);
await migrate(db);
const app = createApp({ db, logger, clock: systemClock, ids: systemIds, config });
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'listening');
});

// A clean stop on SIGTERM (docker stop) and SIGINT (Ctrl+C), on Linux and Windows.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    logger.info({ signal }, 'stopping');
    server.close(() => void db.end().then(() => process.exit(0)));
  });
}
