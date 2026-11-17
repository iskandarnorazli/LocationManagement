import type { Location, NewLocation } from '@lm/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { useLocationsStore } from './locationsStore';

const loc1: Location = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'HQ',
  latitude: 3.139,
  longitude: 101.6869,
  createdAt: '2026-11-17T00:00:00.000Z',
};

const loc2: Location = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Warehouse',
  latitude: 3.0738,
  longitude: 101.5183,
  createdAt: '2026-11-17T00:01:00.000Z',
};

const loc3: Location = {
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Port',
  latitude: 3.0005,
  longitude: 101.3928,
  createdAt: '2026-11-17T00:02:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function seedReady(locations: Location[]): Promise<void> {
  const spy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(jsonResponse({ locations }, 200));
  await useLocationsStore.getState().load();
  spy.mockRestore();
}

describe('locationsStore', () => {
  beforeEach(() => {
    useLocationsStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle state and reset() returns to idle', async () => {
    expect(useLocationsStore.getState().state).toEqual({ kind: 'idle' });
    await seedReady([loc1]);
    expect(useLocationsStore.getState().state.kind).toBe('ready');

    useLocationsStore.getState().reset();
    expect(useLocationsStore.getState().state).toEqual({ kind: 'idle' });
  });

  it('load() transitions idle -> loading -> ready with LocationsResponse', async () => {
    let resolveFetch!: (res: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const loadPromise = useLocationsStore.getState().load();
    expect(useLocationsStore.getState().state).toEqual({ kind: 'loading' });

    resolveFetch(jsonResponse({ locations: [loc1, loc2] }, 200));
    await loadPromise;

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/locations',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc2],
    });
  });

  it('load() transitions loading -> failed on ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'INTERNAL',
            message: 'Database unavailable.',
            requestId: 'req-1',
          },
        },
        500,
      ),
    );

    await useLocationsStore.getState().load();

    const state = useLocationsStore.getState().state;
    expect(state.kind).toBe('failed');
    if (state.kind === 'failed') {
      expect(state.error).toBeInstanceOf(ApiError);
      expect(state.error.status).toBe(500);
      expect(state.error.code).toBe('INTERNAL');
    }
  });

  it('create() calls POST /locations and appends only after 201 (D12)', async () => {
    await seedReady([loc1]);

    let resolveFetch!: (res: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const input: NewLocation = { name: loc2.name, latitude: loc2.latitude, longitude: loc2.longitude };
    const createPromise = useLocationsStore.getState().create(input);

    // D12: must not append optimistically before 201 response
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1],
    });

    resolveFetch(jsonResponse({ location: loc2 }, 201));
    const created = await createPromise;

    expect(created).toEqual(loc2);
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/locations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(input),
        credentials: 'include',
      }),
    );
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc2],
    });
  });

  it('create() appends nothing and rethrows ApiError on failure', async () => {
    await seedReady([loc1]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid coordinates.',
            requestId: 'req-2',
          },
        },
        400,
      ),
    );

    const input: NewLocation = { name: 'Bad', latitude: 0, longitude: 0 };
    let caught: unknown;
    try {
      await useLocationsStore.getState().create(input);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
    });
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1],
    });
  });

  it('addMany() appends new locations and skips ids already in the list', async () => {
    await seedReady([loc1, loc2]);
    // Repeating the upload response and adding a new one
    useLocationsStore.getState().addMany([loc1, loc2, loc3]);

    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc2, loc3],
    });
  });

  it('create() when failed calls load() after 201 so state ends ready with full list or failed', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'INTERNAL', message: 'Database unavailable.', requestId: 'req-fail' } },
          500,
        ),
      )
      .mockResolvedValueOnce(jsonResponse({ location: loc2 }, 201))
      .mockResolvedValueOnce(jsonResponse({ locations: [loc1, loc2] }, 200));

    await useLocationsStore.getState().load();
    expect(useLocationsStore.getState().state.kind).toBe('failed');

    const input: NewLocation = { name: loc2.name, latitude: loc2.latitude, longitude: loc2.longitude };
    const created = await useLocationsStore.getState().create(input);

    expect(created).toEqual(loc2);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc2],
    });
  });

  it('addMany() when not ready calls load() instead of setting a partial ready state', async () => {
    let resolveLoad!: (res: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveLoad = resolve;
      }),
    );

    useLocationsStore.getState().addMany([loc3]);
    expect(useLocationsStore.getState().state).toEqual({ kind: 'loading' });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/locations',
      expect.objectContaining({ credentials: 'include' }),
    );

    resolveLoad(jsonResponse({ locations: [loc1, loc2, loc3] }, 200));
    await vi.waitFor(() => {
      expect(useLocationsStore.getState().state).toEqual({
        kind: 'ready',
        locations: [loc1, loc2, loc3],
      });
    });
  });

  it('earlier in-flight load() merges instead of overwriting a row from a later create()', async () => {
    let resolveEarlyLoad!: (res: Response) => void;
    let resolveCreate!: (res: Response) => void;
    let resolveFollowUpLoad!: (res: Response) => void;

    vi.spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveEarlyLoad = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveCreate = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveFollowUpLoad = resolve;
        }),
      );

    const earlyLoadPromise = useLocationsStore.getState().load();
    expect(useLocationsStore.getState().state).toEqual({ kind: 'loading' });

    const input: NewLocation = { name: loc3.name, latitude: loc3.latitude, longitude: loc3.longitude };
    const createPromise = useLocationsStore.getState().create(input);

    // POST answers 201 while early load() is still in flight; create() triggers follow-up load()
    resolveCreate(jsonResponse({ location: loc3 }, 201));
    await vi.waitFor(() => {
      expect(resolveFollowUpLoad).toBeTypeOf('function');
    });

    // Follow-up load() finishes with server list including loc3
    resolveFollowUpLoad(jsonResponse({ locations: [loc1, loc3] }, 200));
    const created = await createPromise;
    expect(created).toEqual(loc3);
    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc3],
    });

    // Earlier load() now answers with stale list [loc1, loc2] (without loc3):
    // must merge (server order first, then loc3), not overwrite loc3.
    resolveEarlyLoad(jsonResponse({ locations: [loc1, loc2] }, 200));
    await earlyLoadPromise;

    expect(useLocationsStore.getState().state).toEqual({
      kind: 'ready',
      locations: [loc1, loc2, loc3],
    });
  });
});
