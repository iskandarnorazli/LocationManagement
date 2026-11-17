// The only code that reads or writes the locations table (D7). Every function takes the caller's
// UserId first, and every statement filters or writes user_id = that id. Issues #4 and #7.
import type { Pool, PoolClient } from 'pg';
import type { Location, NewLocation } from '@lm/shared';
import type { UserId } from '../auth';

type DbLocationRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: Date;
};

function toLocation(row: DbLocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at.toISOString(),
  };
}

/** The caller's locations, oldest first. */
export async function listLocations(db: Pool, userId: UserId): Promise<Location[]> {
  const { rows } = await db.query<DbLocationRow>(
    'SELECT id, name, latitude, longitude, created_at FROM locations WHERE user_id = $1 ORDER BY created_at ASC, id ASC',
    [userId],
  );
  return rows.map(toLocation);
}

export async function createLocation(
  db: Pool,
  userId: UserId,
  input: NewLocation & { id: string },
): Promise<Location> {
  const { rows } = await db.query<DbLocationRow>(
    'INSERT INTO locations (id, user_id, name, latitude, longitude) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, latitude, longitude, created_at',
    [input.id, userId, input.name, input.latitude, input.longitude],
  );
  return toLocation(rows[0]!);
}

/** Inserts all rows inside the caller's transaction, in order; returns them in the same order. */
export async function insertMany(
  tx: PoolClient,
  userId: UserId,
  rows: ReadonlyArray<NewLocation & { id: string }>,
): Promise<Location[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const names = rows.map((r) => r.name);
  const latitudes = rows.map((r) => r.latitude);
  const longitudes = rows.map((r) => r.longitude);

  const result = await tx.query<DbLocationRow>(
    `INSERT INTO locations (id, user_id, name, latitude, longitude)
     SELECT t.id, $2, t.name, t.latitude, t.longitude
     FROM unnest($1::uuid[], $3::text[], $4::double precision[], $5::double precision[])
       AS t(id, name, latitude, longitude)
     RETURNING id, name, latitude, longitude, created_at`,
    [ids, userId, names, latitudes, longitudes],
  );
  return result.rows.map(toLocation);
}
