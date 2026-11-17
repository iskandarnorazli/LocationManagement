// docs/STATE_MACHINES.md "Location form". Issue #10 fills the reducer.
import { NewLocation, type Location } from '@lm/shared';
import type { Transition } from '../lib/machine';
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

function toNumber(raw: string): number {
  return raw.trim().length === 0 ? Number.NaN : Number(raw);
}

export function formReducer(state: FormState, event: FormEvent): FormState {
  switch (state.kind) {
    case 'editing': {
      if (event.type === 'EDIT') {
        const errors: FieldErrors = { ...state.errors };
        delete errors[event.field];
        return {
          kind: 'editing',
          fields: { ...state.fields, [event.field]: event.value },
          errors,
          saveError: null,
        };
      }
      if (event.type === 'SUBMIT') {
        const parsed = NewLocation.safeParse({
          name: state.fields.name,
          latitude: toNumber(state.fields.latitude),
          longitude: toNumber(state.fields.longitude),
        });
        if (!parsed.success) {
          const errors: FieldErrors = {};
          for (const issue of parsed.error.issues) {
            const key = issue.path[0];
            if (key === 'name' || key === 'latitude' || key === 'longitude') {
              errors[key] ??= issue.message;
            }
          }
          return { kind: 'editing', fields: state.fields, errors, saveError: null };
        }
        return { kind: 'saving', fields: state.fields };
      }
      return state;
    }

    case 'saving': {
      if (event.type === 'SAVE_OK') return emptyForm;
      if (event.type === 'SAVE_ERROR') {
        return { kind: 'editing', fields: state.fields, errors: {}, saveError: event.error };
      }
      return state;
    }
  }
}
