import { UserResponse } from '@lm/shared';
import { create } from 'zustand';
import { api, ApiError, setOnUnauthorized } from '../api/client';
import { initialSession, sessionReducer, type SessionEvent, type SessionState } from './sessionMachine';

type SessionStore = {
  state: SessionState;
  dispatch: (event: SessionEvent) => void;
  checkSession: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  state: initialSession,
  dispatch: (event) => set((s) => ({ state: sessionReducer(s.state, event) })),
  checkSession: async () => {
    try {
      const { user } = await api('/auth/me', { schema: UserResponse });
      get().dispatch({ type: 'ME_OK', user });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        get().dispatch({ type: 'ME_401' });
        return;
      }
      const apiErr =
        err instanceof ApiError ? err : new ApiError(0, 'NETWORK', 'Network error. Please try again.');
      get().dispatch({ type: 'NETWORK', error: apiErr });
    }
  },
}));

setOnUnauthorized(() => {
  useSessionStore.getState().dispatch({ type: 'ANY_401' });
});
