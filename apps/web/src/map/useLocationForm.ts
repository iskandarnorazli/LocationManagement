// Runs the location form machine (docs/STATE_MACHINES.md "Location form") and saves through the
// locations store. D12: the location appears only after the API answers 201.
import { NewLocation, type Location } from '@lm/shared';
import { useCallback, useReducer } from 'react';
import { ApiError } from '../api/client';
import { emptyForm, formReducer, type FormFields } from './locationFormMachine';
import { useLocationsStore } from './locationsStore';

export function useLocationForm() {
  const [state, dispatch] = useReducer(formReducer, emptyForm);
  const create = useLocationsStore((s) => s.create);

  const edit = useCallback((field: keyof FormFields, value: string) => {
    dispatch({ type: 'EDIT', field, value });
  }, []);

  /** Validates; when valid, saves. Resolves to the saved location, or null. */
  const submit = useCallback(async (): Promise<Location | null> => {
    const next = formReducer(state, { type: 'SUBMIT' });
    dispatch({ type: 'SUBMIT' });
    if (next.kind !== 'saving') return null;

    const input = NewLocation.parse({
      name: next.fields.name,
      latitude: Number(next.fields.latitude),
      longitude: Number(next.fields.longitude),
    });
    try {
      const location = await create(input);
      dispatch({ type: 'SAVE_OK', location });
      return location;
    } catch (err) {
      const error =
        err instanceof ApiError ? err : new ApiError(0, 'NETWORK', 'Network error. Please try again.');
      dispatch({ type: 'SAVE_ERROR', error });
      return null;
    }
  }, [state, create]);

  return { state, edit, submit };
}
