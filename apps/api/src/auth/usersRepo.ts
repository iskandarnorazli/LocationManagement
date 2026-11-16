// The only code that reads or writes the users table. Issue #3.
import type { Pool } from 'pg';
import type { User } from '@lm/shared';
import { notImplemented } from '../lib/notImplemented';
import type { UserId } from './userId';

export type UserRow = User & { passwordHash: string };

/** Throws AppError EMAIL_TAKEN when the email has an account. */
export async function createUser(
  db: Pool,
  input: { id: string; email: string; passwordHash: string },
): Promise<User> {
  return notImplemented('#3 createUser', { db, input });
}

export async function findUserByEmail(db: Pool, email: string): Promise<UserRow | null> {
  return notImplemented('#3 findUserByEmail', { db, email });
}

export async function findUserById(db: Pool, id: UserId): Promise<User | null> {
  return notImplemented('#3 findUserById', { db, id });
}
