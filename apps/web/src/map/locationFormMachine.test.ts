import { NewLocation } from '@lm/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { checkMachine } from '../test/machine';
import {
  emptyForm,
  FORM_EVENTS,
  FORM_KINDS,
  FORM_TRANSITIONS,
  formReducer,
  type FormEvent,
  type FormState,
} from './locationFormMachine';

const sampleLoc = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Suria KLCC',
  latitude: 3.157324409,
  longitude: 101.7121981,
  createdAt: '2026-11-17T00:00:00.000Z',
};

const sampleErr = new ApiError(500, 'INTERNAL', 'Something went wrong.');

const sampleStates: FormState[] = [
  {
    kind: 'editing',
    fields: { name: 'Suria KLCC', latitude: '3.157324409', longitude: '101.7121981' },
    errors: {},
    saveError: null,
  },
  {
    kind: 'saving',
    fields: { name: 'Suria KLCC', latitude: '3.157324409', longitude: '101.7121981' },
  },
];

const sampleEvents: FormEvent[] = [
  { type: 'EDIT', field: 'name', value: 'Zoo Negara' },
  { type: 'SUBMIT' },
  { type: 'SAVE_OK', location: sampleLoc },
  { type: 'SAVE_ERROR', error: sampleErr },
];

describe('locationFormMachine', () => {
  it('satisfies every (state, event) pair in FORM_TRANSITIONS', () => {
    checkMachine({
      reducer: formReducer,
      table: FORM_TRANSITIONS,
      kinds: FORM_KINDS,
      eventTypes: FORM_EVENTS,
      states: sampleStates,
      events: sampleEvents,
    });
  });

  it('keeps editing with an error on latitude when latitude is 91 on SUBMIT', () => {
    const editing: FormState = {
      kind: 'editing',
      fields: { name: 'Bad', latitude: '91', longitude: '101.7' },
      errors: {},
      saveError: null,
    };

    const next = formReducer(editing, { type: 'SUBMIT' });
    expect(next.kind).toBe('editing');
    if (next.kind === 'editing') {
      expect(next.errors.latitude).toBeDefined();
      expect(next.errors.name).toBeUndefined();
    }
  });

  it('accepts decimal strings matching NewLocation and rejects non-numeric text ("abc")', () => {
    const valid: FormState = {
      kind: 'editing',
      fields: { name: 'Suria KLCC', latitude: '3.157324409', longitude: '101.7121981' },
      errors: {},
      saveError: null,
    };
    const saving = formReducer(valid, { type: 'SUBMIT' });
    expect(saving.kind).toBe('saving');
    if (saving.kind === 'saving') {
      const parsed = NewLocation.parse({
        name: saving.fields.name,
        latitude: Number(saving.fields.latitude),
        longitude: Number(saving.fields.longitude),
      });
      expect(parsed.latitude).toBe(3.157324409);
    }

    const nonNumeric: FormState = {
      kind: 'editing',
      fields: { name: 'Suria KLCC', latitude: 'abc', longitude: '101.7' },
      errors: {},
      saveError: null,
    };
    const rejected = formReducer(nonNumeric, { type: 'SUBMIT' });
    expect(rejected.kind).toBe('editing');
    if (rejected.kind === 'editing') {
      expect(rejected.errors.latitude).toBeDefined();
    }
  });

  it('clears fields on SAVE_OK and keeps fields on SAVE_ERROR', () => {
    const saving: FormState = {
      kind: 'saving',
      fields: { name: 'Suria KLCC', latitude: '3.157324409', longitude: '101.7121981' },
    };

    expect(formReducer(saving, { type: 'SAVE_OK', location: sampleLoc })).toEqual(emptyForm);

    const errored = formReducer(saving, { type: 'SAVE_ERROR', error: sampleErr });
    expect(errored).toEqual({
      kind: 'editing',
      fields: saving.fields,
      errors: {},
      saveError: sampleErr,
    });
  });
});
