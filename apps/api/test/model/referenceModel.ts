// The oracle for the seeded model-based API test (D18). A tiny in-memory version of what the API
// promises in docs/API.md and docs/ERRORS.md, with no SQL, no HTTP and no crypto. The model test
// (issue #14) runs the same random command sequence against this and against the real API on
// Postgres, and after every command compares what each user sees.
import type { NewLocation } from '@lm/shared';

export type Outcome<T = undefined> = { ok: true; value: T } | { ok: false; code: string };

export class ReferenceModel {
  private readonly passwords = new Map<string, string>();
  private readonly locations = new Map<string, NewLocation[]>();

  register(email: string, password: string): Outcome {
    const key = email.trim().toLowerCase();
    if (this.passwords.has(key)) return { ok: false, code: 'EMAIL_TAKEN' };
    this.passwords.set(key, password);
    this.locations.set(key, []);
    return { ok: true, value: undefined };
  }

  login(email: string, password: string): Outcome {
    const key = email.trim().toLowerCase();
    return this.passwords.get(key) === password ? { ok: true, value: undefined } : { ok: false, code: 'INVALID_CREDENTIALS' };
  }

  addLocation(email: string, location: NewLocation): Outcome {
    this.ownList(email).push(location);
    return { ok: true, value: undefined };
  }

  /** All or nothing (D8): rows is the parsed file; null means the upload is rejected. */
  importRows(email: string, rows: NewLocation[] | null, failure = 'FILE_ROWS_INVALID'): Outcome<number> {
    if (rows === null) return { ok: false, code: failure };
    this.ownList(email).push(...rows);
    return { ok: true, value: rows.length };
  }

  /** What GET /api/locations must return for this user, oldest first. */
  locationsOf(email: string): readonly NewLocation[] {
    return this.ownList(email);
  }

  users(): string[] {
    return [...this.passwords.keys()];
  }

  private ownList(email: string): NewLocation[] {
    const list = this.locations.get(email.trim().toLowerCase());
    if (!list) throw new Error(`model: ${email} is not registered`);
    return list;
  }
}
