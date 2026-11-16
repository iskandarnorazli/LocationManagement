import { pino } from 'pino';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { createPool } from '../src/db/pool';

export function testPool(): Pool {
  return createPool(process.env.DATABASE_URL as string);
}

export function testApp(pool: Pool) {
  return createApp({ pool, logger: pino({ level: 'silent' }) });
}
