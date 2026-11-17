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

let loadSeq = 0;

function mergeLocations(server: Location[], current: Location[]): Location[] {
  const seen = new Set(server.map((loc) => loc.id));
  const extra = current.filter((loc) => !seen.has(loc.id));
  return [...server, ...extra];
}

export const useLocationsStore = create<LocationsStore>((set, get) => ({
  state: { kind: 'idle' },
  load: async () => {
    const seq = ++loadSeq;
    set({ state: { kind: 'loading' } });
    try {
      const { locations } = await api('/locations', { schema: LocationsResponse });
      set((s) => {
        if (seq !== loadSeq) {
          if (s.state.kind === 'ready') {
            return { state: { kind: 'ready', locations: mergeLocations(locations, s.state.locations) } };
          }
          return s;
        }
        return { state: { kind: 'ready', locations } };
      });
    } catch (err) {
      if (seq !== loadSeq) return;
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
    if (get().state.kind === 'ready') {
      set((s) => ({
        state: {
          kind: 'ready',
          locations: s.state.kind === 'ready' ? [...s.state.locations, location] : [location],
        },
      }));
    } else {
      await get().load();
    }
    return location;
  },
  addMany: (locations) => {
    if (get().state.kind !== 'ready') {
      void get().load();
      return;
    }
    set((s) => {
      if (s.state.kind !== 'ready') return s;
      const seen = new Set(s.state.locations.map((loc) => loc.id));
      const added: Location[] = [];
      for (const loc of locations) {
        if (!seen.has(loc.id)) {
          seen.add(loc.id);
          added.push(loc);
        }
      }
      return { state: { kind: 'ready', locations: [...s.state.locations, ...added] } };
    });
  },
  reset: () => {
    loadSeq += 1;
    set({ state: { kind: 'idle' } });
  },
}));
