// docs/STATE_MACHINES.md "Upload". Issue #9 fills the reducer; useUploadFlow runs the timer.
import type { Location } from '@lm/shared';
import type { Transition } from '../lib/machine';
import type { ApiError } from '../api/client';

export const POPUP_MS = 3000;

export const UPLOAD_KINDS = ['idle', 'chosen', 'uploading', 'succeeded', 'failed'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export type UploadState =
  | { kind: 'idle' }
  | { kind: 'chosen'; file: File }
  | { kind: 'uploading'; file: File }
  | { kind: 'succeeded'; locations: Location[] }
  | { kind: 'failed'; error: ApiError };

export const UPLOAD_EVENTS = ['CHOOSE', 'SUBMIT', 'UPLOAD_OK', 'UPLOAD_ERROR', 'TIMER_DONE'] as const;
export type UploadEventType = (typeof UPLOAD_EVENTS)[number];

export type UploadEvent =
  | { type: 'CHOOSE'; file: File }
  | { type: 'SUBMIT' }
  | { type: 'UPLOAD_OK'; locations: Location[] }
  | { type: 'UPLOAD_ERROR'; error: ApiError }
  | { type: 'TIMER_DONE' };

export const UPLOAD_TRANSITIONS: ReadonlyArray<Transition<UploadKind, UploadEventType>> = [
  { from: 'idle', event: 'CHOOSE', to: 'chosen' },
  { from: 'chosen', event: 'CHOOSE', to: 'chosen' },
  { from: 'chosen', event: 'SUBMIT', to: 'uploading' },
  { from: 'uploading', event: 'UPLOAD_OK', to: 'succeeded' },
  { from: 'uploading', event: 'UPLOAD_ERROR', to: 'failed' },
  { from: 'succeeded', event: 'TIMER_DONE', to: 'idle' },
  { from: 'failed', event: 'TIMER_DONE', to: 'idle' },
];

export const initialUpload: UploadState = { kind: 'idle' };

export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (state.kind) {
    case 'idle':
      if (event.type === 'CHOOSE') return { kind: 'chosen', file: event.file };
      return state;

    case 'chosen':
      if (event.type === 'CHOOSE') return { kind: 'chosen', file: event.file };
      if (event.type === 'SUBMIT') return { kind: 'uploading', file: state.file };
      return state;

    case 'uploading':
      if (event.type === 'UPLOAD_OK') return { kind: 'succeeded', locations: event.locations };
      if (event.type === 'UPLOAD_ERROR') return { kind: 'failed', error: event.error };
      return state;

    case 'succeeded':
    case 'failed':
      if (event.type === 'TIMER_DONE') return { kind: 'idle' };
      return state;
  }
}
