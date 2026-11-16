// API tests run against a real Postgres (D14). DATABASE_URL must point at a database the tests
// may wipe: locally `postgres://app:app@localhost:5432/app_test` from docker compose.
import { createPool } from '../src/db/pool';
import { migrate } from '../src/db/migrate';

export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Run `docker compose up -d db` and set ' +
        'DATABASE_URL=postgres://app:app@localhost:5432/app_test (AGENTS.md, Gate commands).',
    );
  }
  const pool = createPool(url);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool);
  await pool.end();
}
