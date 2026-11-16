// The pair-table test (D19). For every sample state and every sample event:
// - a drawn pair ends in the drawn state (or, for a guarded arrow, stays in `from`);
// - an undrawn pair returns the very same state object.
// It also fails when a state kind, an event type or a table row has no sample, so a new state
// or event cannot be added without a test.
import { expect } from 'vitest';
import { findTransition, type Transition } from '../lib/machine';

export function checkMachine<S extends { kind: K }, Ev extends { type: E }, K extends string, E extends string>(m: {
  reducer: (s: S, e: Ev) => S;
  table: ReadonlyArray<Transition<K, E>>;
  kinds: readonly K[];
  eventTypes: readonly E[];
  states: readonly S[];
  events: readonly Ev[];
}): void {
  for (const k of m.kinds) expect(m.states.some((s) => s.kind === k), `no sample state of kind ${k}`).toBe(true);
  for (const t of m.eventTypes) expect(m.events.some((e) => e.type === t), `no sample event ${t}`).toBe(true);
  for (const row of m.table) {
    expect(m.kinds, `table row from unknown kind ${row.from}`).toContain(row.from);
    expect(m.kinds, `table row to unknown kind ${row.to}`).toContain(row.to);
  }
  for (const s of m.states) {
    for (const e of m.events) {
      const label = `${s.kind} + ${e.type}`;
      const next = m.reducer(s, e);
      const t = findTransition(m.table, s.kind, e.type);
      if (!t) expect(next, `${label}: undrawn pair must return the same object`).toBe(s);
      else if (t.guard) expect([t.to, t.from], `${label} (guard ${t.guard})`).toContain(next.kind);
      else expect(next.kind, label).toBe(t.to);
    }
  }
}
