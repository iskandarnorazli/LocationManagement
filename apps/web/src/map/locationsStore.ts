import { LocationResponse, LocationsResponse, type Location, type NewLocation } from '@lm/shared';
import { create } from 'zustand';
import { api, ApiError } from '../api/client';

export type LocationsState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; locations: Location[] }
  | { kind: 'failed'; error: ApiError };

type LocationsStore = {
  state: LocationsState;
  load: () => Promise<void>;
  create: (input: NewLocation) => Promise<Location>;
  addMany: (locations: Location[]) => void;
  reset: () => void;
};

export const useLocationsStore = create<LocationsStore>((set) => ({
  state: { kind: 'idle' },
  load: async () => {
    set({ state: { kind: 'loading' } });
    try {
      const { locations } = await api('/locations', { schema: LocationsResponse });
      set({ state: { kind: 'ready', locations } });
    } catch (err) {
      const error =
        err instanceof ApiError ? err : new ApiError(0, 'NETWORK', 'Network error. Please try again.');
      set({ state: { kind: 'failed', error } });
    }
  },
  create: async (input) => {
    const { location } = await api('/locations', {
      method: 'POST',
      body: JSON.stringify(input),
      schema: LocationResponse,
    });
    set((s) => ({
      state: {
        kind: 'ready',
        locations: s.state.kind === 'ready' ? [...s.state.locations, location] : [location],
      },
    }));
    return location;
  },
  addMany: (locations) =>
    set((s) => {
      const existing = s.state.kind === 'ready' ? s.state.locations : [];
      const seen = new Set(existing.map((loc) => loc.id));
      const added: Location[] = [];
      for (const loc of locations) {
        if (!seen.has(loc.id)) {
          seen.add(loc.id);
          added.push(loc);
        }
      }
      return { state: { kind: 'ready', locations: [...existing, ...added] } };
    }),
  reset: () => set({ state: { kind: 'idle' } }),
}));
