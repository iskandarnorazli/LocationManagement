import { describe, it } from 'vitest';
import { ApiError } from '../api/client';
import { checkMachine } from '../test/machine';
import {
  UPLOAD_EVENTS,
  UPLOAD_KINDS,
  UPLOAD_TRANSITIONS,
  uploadReducer,
  type UploadEvent,
  type UploadState,
} from './uploadMachine';

const sampleFile = new File(['hello'], 'locations.zip', { type: 'application/zip' });
const sampleLoc = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Suria KLCC',
  latitude: 3.157324409,
  longitude: 101.7121981,
  createdAt: '2026-11-17T00:00:00.000Z',
};
const sampleErr = new ApiError(422, 'ZIP_INVALID', 'Invalid ZIP.');

const sampleStates: UploadState[] = [
  { kind: 'idle' },
  { kind: 'chosen', file: sampleFile },
  { kind: 'uploading', file: sampleFile },
  { kind: 'succeeded', locations: [sampleLoc] },
  { kind: 'failed', error: sampleErr },
];

const sampleEvents: UploadEvent[] = [
  { type: 'CHOOSE', file: sampleFile },
  { type: 'SUBMIT' },
  { type: 'UPLOAD_OK', locations: [sampleLoc] },
  { type: 'UPLOAD_ERROR', error: sampleErr },
  { type: 'TIMER_DONE' },
];

describe('uploadMachine', () => {
  it('satisfies every (state, event) pair in UPLOAD_TRANSITIONS', () => {
    checkMachine({
      reducer: uploadReducer,
      table: UPLOAD_TRANSITIONS,
      kinds: UPLOAD_KINDS,
      eventTypes: UPLOAD_EVENTS,
      states: sampleStates,
      events: sampleEvents,
    });
  });
});
