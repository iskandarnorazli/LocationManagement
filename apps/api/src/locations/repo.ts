// The only code that reads or writes the locations table (D7). Every function takes the caller's
// UserId first, and every statement filters or writes user_id = that id. Issues #4 and #7.
import type { Pool, PoolClient } from 'pg';
import type { Location, NewLocation } from '@lm/shared';
import type { UserId } from '../auth';
import { notImplemented } from '../lib/notImplemented';

/** The caller's locations, oldest first. */
export async function listLocations(db: Pool, userId: UserId): Promise<Location[]> {
  return notImplemented('#4 listLocations', { db, userId });
}

export async function createLocation(
  db: Pool,
  userId: UserId,
  input: NewLocation & { id: string },
): Promise<Location> {
  return notImplemented('#4 createLocation', { db, userId, input });
}

/** Inserts all rows inside the caller's transaction, in order; returns them in the same order. */
export async function insertMany(
  tx: PoolClient,
  userId: UserId,
  rows: ReadonlyArray<NewLocation & { id: string }>,
): Promise<Location[]> {
  return notImplemented('#7 insertMany', { tx, userId, rows });
}
