import { UserResponse, type Credentials } from '@lm/shared';
import { z } from 'zod';
import { create } from 'zustand';
import { api, ApiError, setOnUnauthorized } from '../api/client';
import { useLocationsStore } from '../map/locationsStore';
import { initialSession, sessionReducer, type SessionEvent, type SessionState } from './sessionMachine';

type SessionStore = {
  state: SessionState;
  dispatch: (event: SessionEvent) => void;
  checkSession: () => Promise<void>;
  register: (credentials: Credentials) => Promise<void>;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
};

async function submitAuth(
  dispatch: (event: SessionEvent) => void,
  startEvent: 'REGISTER' | 'LOGIN',
  path: '/auth/register' | '/auth/login',
  credentials: Credentials,
): Promise<void> {
  dispatch({ type: startEvent });
  try {
    const { user } = await api(path, {
      method: 'POST',
      body: JSON.stringify(credentials),
      schema: UserResponse,
    });
    dispatch({ type: 'AUTH_OK', user });
  } catch (err) {
    const apiErr =
      err instanceof ApiError ? err : new ApiError(0, 'NETWORK', 'Network error. Please try again.');
    dispatch({ type: 'AUTH_FAILED', error: apiErr });
  }
}

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
  register: (credentials) => submitAuth(get().dispatch, 'REGISTER', '/auth/register', credentials),
  login: (credentials) => submitAuth(get().dispatch, 'LOGIN', '/auth/login', credentials),
  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST', schema: z.undefined() });
    } catch {
      // A network error still signs out locally.
    }
    get().dispatch({ type: 'LOGOUT' });
    useLocationsStore.getState().reset();
  },
}));

setOnUnauthorized(() => {
  useSessionStore.getState().dispatch({ type: 'ANY_401' });
});
