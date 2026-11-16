import { describe, expect, it } from 'vitest';
import type { Transition } from '../lib/machine';
import { checkMachine } from './machine';

type S = { kind: 'off' } | { kind: 'on' };
type E = { type: 'PRESS' } | { type: 'NOISE' };
const table: ReadonlyArray<Transition<S['kind'], E['type']>> = [
  { from: 'off', event: 'PRESS', to: 'on' },
  { from: 'on', event: 'PRESS', to: 'off' },
];
const base = {
  table,
  kinds: ['off', 'on'] as const,
  eventTypes: ['PRESS', 'NOISE'] as const,
  states: [{ kind: 'off' }, { kind: 'on' }] as S[],
  events: [{ type: 'PRESS' }, { type: 'NOISE' }] as E[],
};

describe('checkMachine', () => {
  it('passes a reducer that follows its table', () => {
    const reducer = (s: S, e: E): S => (e.type === 'PRESS' ? { kind: s.kind === 'off' ? 'on' : 'off' } : s);
    expect(() => checkMachine({ ...base, reducer })).not.toThrow();
  });

  it('fails a reducer that changes state on an undrawn pair (negative control)', () => {
    const reducer = (s: S, e: E): S => (e.type === 'PRESS' ? { kind: s.kind === 'off' ? 'on' : 'off' } : { ...s });
    expect(() => checkMachine({ ...base, reducer })).toThrow(/undrawn pair/);
  });

  it('fails when a state kind has no sample (negative control)', () => {
    const reducer = (s: S) => s;
    expect(() => checkMachine({ ...base, reducer, states: [{ kind: 'off' }] })).toThrow(/no sample state of kind on/);
  });
});
