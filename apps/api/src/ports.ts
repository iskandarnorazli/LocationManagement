// The only source of time and randomness in apps/api/src (D18, D20). Production wires the
// system versions; tests pass fixed or seeded ones, so every run can be replayed.
// Lint bans Date.now(), new Date() without arguments, Math.random() and randomUUID everywhere
// else in apps/api/src.
import { randomUUID } from 'node:crypto';

export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}

export interface Ids {
  /** A new UUID v4 string. */
  uuid(): string;
}

export const systemClock: Clock = { now: () => Date.now() };
export const systemIds: Ids = { uuid: () => randomUUID() };

/** A clock tests move by hand. */
export function fixedClock(startMs: number): Clock & { advance(ms: number): void } {
  let t = startMs;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
}

/** Deterministic UUID-shaped ids from a counter: 00000000-0000-4000-8000-000000000001, ... */
export function sequentialIds(): Ids {
  let n = 0;
  return {
    uuid: () => {
      n += 1;
      return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
    },
  };
}
