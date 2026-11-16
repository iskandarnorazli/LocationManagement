// Everything a feature needs from outside, wired once in server.ts (production) and in
// test/helpers.ts (tests). Features receive Deps; they never import pg pools, process.env or
// the system clock themselves (D17).
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import type { Config } from './config';
import type { Clock, Ids } from './ports';

export type Deps = {
  db: Pool;
  logger: Logger;
  clock: Clock;
  ids: Ids;
  config: Pick<Config, 'JWT_SECRET' | 'COOKIE_SECURE'>;
};
