// The only code that reads or writes the users table. Issue #3.
import type { Pool } from 'pg';
import type { User } from '@lm/shared';
import { AppError } from '../http/AppError';
import type { UserId } from './userId';

export type UserRow = User & { passwordHash: string };

type DbUserRow = {
  id: string;
  email: string;
  password_hash?: string;
  created_at: Date;
};

function toUser(row: DbUserRow): User {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  };
}

/** Throws AppError EMAIL_TAKEN when the email has an account. */
export async function createUser(
  db: Pool,
  input: { id: string; email: string; passwordHash: string },
): Promise<User> {
  try {
    const { rows } = await db.query<DbUserRow>(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, created_at',
      [input.id, input.email, input.passwordHash],
    );
    return toUser(rows[0]!);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists.');
    }
    throw err;
  }
}

export async function findUserByEmail(db: Pool, email: string): Promise<UserRow | null> {
  const { rows } = await db.query<DbUserRow>(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return { ...toUser(row), passwordHash: row.password_hash! };
}

export async function findUserById(db: Pool, id: UserId): Promise<User | null> {
  const { rows } = await db.query<DbUserRow>(
    'SELECT id, email, created_at FROM users WHERE id = $1',
    [id],
  );
  const row = rows[0];
  return row ? toUser(row) : null;
}
