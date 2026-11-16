// `npm run migrate -w apps/api`: apply pending migrations and exit.
import { createPool } from './pool';
import { migrate } from './migrate';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const pool = createPool(url);
const applied = await migrate(pool);
console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date');
await pool.end();
