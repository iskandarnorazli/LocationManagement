import { ImportResponse, type Location } from '@lm/shared';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { api, ApiError } from '../api/client';
import { initialUpload, POPUP_MS, uploadReducer } from './uploadMachine';

export function useUploadFlow(onSucceeded: (locations: Location[]) => void) {
  const [state, dispatch] = useReducer(uploadReducer, initialUpload);
  const onSucceededRef = useRef(onSucceeded);
  onSucceededRef.current = onSucceeded;

  useEffect(() => {
    if (state.kind !== 'succeeded' && state.kind !== 'failed') return;

    const timerId = window.setTimeout(() => {
      if (state.kind === 'succeeded') {
        onSucceededRef.current(state.locations);
      }
      dispatch({ type: 'TIMER_DONE' });
    }, POPUP_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [state]);

  const choose = useCallback((file: File) => {
    dispatch({ type: 'CHOOSE', file });
  }, []);

  const submit = useCallback(async () => {
    if (state.kind !== 'chosen') return;
    const formData = new FormData();
    formData.append('file', state.file);
    dispatch({ type: 'SUBMIT' });

    try {
      const res = await api('/locations/import', {
        method: 'POST',
        body: formData,
        schema: ImportResponse,
      });
      dispatch({ type: 'UPLOAD_OK', locations: res.locations });
    } catch (err) {
      const apiErr =
        err instanceof ApiError ? err : new ApiError(0, 'NETWORK', 'Network error. Please try again.');
      dispatch({ type: 'UPLOAD_ERROR', error: apiErr });
    }
  }, [state]);

  return { state, choose, submit };
}
