// docs/STATE_MACHINES.md "Location form". Issue #10 fills the reducer.
import type { Location } from '@lm/shared';
import type { Transition } from '../lib/machine';
import { notImplemented } from '../lib/notImplemented';
import type { ApiError } from '../api/client';

/** What the user typed; numbers stay strings until NewLocation parses them on SUBMIT. */
export type FormFields = { name: string; latitude: string; longitude: string };
export type FieldErrors = Partial<Record<keyof FormFields, string>>;

export const FORM_KINDS = ['editing', 'saving'] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export type FormState =
  | { kind: 'editing'; fields: FormFields; errors: FieldErrors; saveError: ApiError | null }
  | { kind: 'saving'; fields: FormFields };

export const FORM_EVENTS = ['EDIT', 'SUBMIT', 'SAVE_OK', 'SAVE_ERROR'] as const;
export type FormEventType = (typeof FORM_EVENTS)[number];

export type FormEvent =
  | { type: 'EDIT'; field: keyof FormFields; value: string }
  | { type: 'SUBMIT' }
  | { type: 'SAVE_OK'; location: Location }
  | { type: 'SAVE_ERROR'; error: ApiError };

export const FORM_TRANSITIONS: ReadonlyArray<Transition<FormKind, FormEventType>> = [
  { from: 'editing', event: 'EDIT', to: 'editing' },
  { from: 'editing', event: 'SUBMIT', to: 'saving', guard: 'the fields parse with NewLocation' },
  { from: 'saving', event: 'SAVE_OK', to: 'editing' },
  { from: 'saving', event: 'SAVE_ERROR', to: 'editing' },
];

export const emptyForm: FormState = {
  kind: 'editing',
  fields: { name: '', latitude: '', longitude: '' },
  errors: {},
  saveError: null,
};

export function formReducer(state: FormState, event: FormEvent): FormState {
  return notImplemented('#10 formReducer', { state, event });
}
