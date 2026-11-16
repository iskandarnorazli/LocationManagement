// docs/STATE_MACHINES.md "Session". Issue #8 fills the reducer.
import type { User } from '@lm/shared';
import type { Transition } from '../lib/machine';
import { notImplemented } from '../lib/notImplemented';
import type { ApiError } from '../api/client';

export const SESSION_KINDS = ['checking', 'signedOut', 'submitting', 'signedIn'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export type SessionState =
  | { kind: 'checking' }
  | { kind: 'signedOut'; error: ApiError | null; returnTo: string | null }
  | { kind: 'submitting'; returnTo: string | null }
  | { kind: 'signedIn'; user: User };

export const SESSION_EVENTS = ['ME_OK', 'ME_401', 'NETWORK', 'LOGIN', 'REGISTER', 'AUTH_OK', 'AUTH_FAILED', 'LOGOUT', 'ANY_401'] as const;
export type SessionEventType = (typeof SESSION_EVENTS)[number];

export type SessionEvent =
  | { type: 'ME_OK'; user: User }
  | { type: 'ME_401' }
  | { type: 'NETWORK'; error: ApiError }
  | { type: 'LOGIN' }
  | { type: 'REGISTER' }
  | { type: 'AUTH_OK'; user: User }
  | { type: 'AUTH_FAILED'; error: ApiError }
  | { type: 'LOGOUT' }
  | { type: 'ANY_401' };

export const SESSION_TRANSITIONS: ReadonlyArray<Transition<SessionKind, SessionEventType>> = [
  { from: 'checking', event: 'ME_OK', to: 'signedIn' },
  { from: 'checking', event: 'ME_401', to: 'signedOut' },
  { from: 'checking', event: 'NETWORK', to: 'signedOut' },
  { from: 'signedOut', event: 'LOGIN', to: 'submitting' },
  { from: 'signedOut', event: 'REGISTER', to: 'submitting' },
  { from: 'submitting', event: 'AUTH_OK', to: 'signedIn' },
  { from: 'submitting', event: 'AUTH_FAILED', to: 'signedOut' },
  { from: 'signedIn', event: 'LOGOUT', to: 'signedOut' },
  { from: 'signedIn', event: 'ANY_401', to: 'signedOut' },
];

export const initialSession: SessionState = { kind: 'checking' };

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  return notImplemented('#8 sessionReducer', { state, event });
}
