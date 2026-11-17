import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { checkMachine } from '../test/machine';
import {
  SESSION_EVENTS,
  SESSION_KINDS,
  SESSION_TRANSITIONS,
  sessionReducer,
  type SessionEvent,
  type SessionState,
} from './sessionMachine';

const sampleUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'a@example.com',
  createdAt: '2026-11-17T00:00:00.000Z',
};

const netErr = new ApiError(0, 'NETWORK', 'Network error');
const authErr = new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

const sampleStates: SessionState[] = [
  { kind: 'checking' },
  { kind: 'signedOut', error: null, returnTo: '/locations' },
  { kind: 'submitting', returnTo: '/locations' },
  { kind: 'signedIn', user: sampleUser },
];

const sampleEvents: SessionEvent[] = [
  { type: 'ME_OK', user: sampleUser },
  { type: 'ME_401' },
  { type: 'NETWORK', error: netErr },
  { type: 'LOGIN' },
  { type: 'REGISTER' },
  { type: 'AUTH_OK', user: sampleUser },
  { type: 'AUTH_FAILED', error: authErr },
  { type: 'LOGOUT' },
  { type: 'ANY_401' },
];

describe('sessionMachine', () => {
  it('satisfies every (state, event) pair in SESSION_TRANSITIONS', () => {
    checkMachine({
      reducer: sessionReducer,
      table: SESSION_TRANSITIONS,
      kinds: SESSION_KINDS,
      eventTypes: SESSION_EVENTS,
      states: sampleStates,
      events: sampleEvents,
    });
  });

  it('preserves returnTo across LOGIN -> AUTH_FAILED and clears on LOGOUT / ANY_401', () => {
    const signedOut: SessionState = { kind: 'signedOut', error: null, returnTo: '/upload' };
    const submitting = sessionReducer(signedOut, { type: 'LOGIN' });
    expect(submitting).toEqual({ kind: 'submitting', returnTo: '/upload' });

    const failed = sessionReducer(submitting, { type: 'AUTH_FAILED', error: authErr });
    expect(failed).toEqual({ kind: 'signedOut', error: authErr, returnTo: '/upload' });

    const signedIn: SessionState = { kind: 'signedIn', user: sampleUser };
    expect(sessionReducer(signedIn, { type: 'ANY_401' })).toEqual({
      kind: 'signedOut',
      error: null,
      returnTo: null,
    });
  });
});
