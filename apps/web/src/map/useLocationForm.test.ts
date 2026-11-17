import { NewLocation, type Location } from '@lm/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { useLocationsStore } from './locationsStore';
import { useLocationForm } from './useLocationForm';

const saved: Location = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Menara KL',
  latitude: 3.1528,
  longitude: 101.7038,
  createdAt: '2026-11-17T00:00:00.000Z',
};

function fill(result: { current: ReturnType<typeof useLocationForm> }, name: string, lat: string, lng: string) {
  act(() => {
    result.current.edit('name', name);
    result.current.edit('latitude', lat);
    result.current.edit('longitude', lng);
  });
}

describe('useLocationForm (R7, D12)', () => {
  const create = vi.fn();
  beforeEach(() => {
    create.mockReset();
    useLocationsStore.setState({ create });
  });
  afterEach(() => vi.restoreAllMocks());

  it('a valid submit calls create with numbers, waits for it, then empties the form', async () => {
    let resolve!: (l: Location) => void;
    create.mockReturnValue(new Promise<Location>((r) => (resolve = r)));
    const { result } = renderHook(() => useLocationForm());
    fill(result, 'Menara KL', '3.1528', '101.7038');

    let pending!: Promise<Location | null>;
    act(() => {
      pending = result.current.submit();
    });
    expect(result.current.state.kind).toBe('saving');
    expect(create).toHaveBeenCalledWith({ name: 'Menara KL', latitude: 3.1528, longitude: 101.7038 });

    await act(async () => {
      resolve(saved);
      await pending;
    });
    expect(result.current.state).toEqual({
      kind: 'editing',
      fields: { name: '', latitude: '', longitude: '' },
      errors: {},
      saveError: null,
    });
  });

  it('latitude 91 shows the schema message under latitude and sends nothing', async () => {
    const { result } = renderHook(() => useLocationForm());
    fill(result, 'Menara KL', '91', '101.7038');
    await act(async () => {
      await result.current.submit();
    });
    expect(create).not.toHaveBeenCalled();
    expect(result.current.state.kind).toBe('editing');
    if (result.current.state.kind !== 'editing') return;
    const expected = NewLocation.shape.latitude.safeParse(91).error?.issues[0]?.message;
    expect(expected).toEqual(expect.any(String));
    expect(result.current.state.errors.latitude).toBe(expected);
    expect(result.current.state.errors.name).toBeUndefined();
  });

  it('a save error keeps the fields and shows the error; nothing is added', async () => {
    create.mockRejectedValue(new ApiError(429, 'RATE_LIMITED', 'Too many requests.'));
    const { result } = renderHook(() => useLocationForm());
    fill(result, 'Menara KL', '3.1528', '101.7038');
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe('editing');
    if (result.current.state.kind !== 'editing') return;
    expect(result.current.state.fields.name).toBe('Menara KL');
    expect(result.current.state.saveError?.code).toBe('RATE_LIMITED');
  });
});
