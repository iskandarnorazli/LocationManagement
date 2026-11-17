import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { useUploadFlow } from './useUploadFlow';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: vi.fn(),
  };
});

const sampleLoc = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Suria KLCC',
  latitude: 3.157324409,
  longitude: 101.7121981,
  createdAt: '2026-11-17T00:00:00.000Z',
};

describe('useUploadFlow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps succeeded popup for 3000 ms (not 2999), then returns to idle and calls onSucceeded once', async () => {
    vi.mocked(api).mockResolvedValue({ imported: 1, locations: [sampleLoc] });

    const onSucceeded = vi.fn();
    const { result } = renderHook(() => useUploadFlow(onSucceeded));
    const file = new File(['zip'], 'test.zip', { type: 'application/zip' });

    act(() => {
      result.current.choose(file);
    });
    expect(result.current.state.kind).toBe('chosen');

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe('succeeded');
    expect(onSucceeded).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(result.current.state.kind).toBe('succeeded');
    expect(onSucceeded).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.state.kind).toBe('idle');
    expect(onSucceeded).toHaveBeenCalledTimes(1);
    expect(onSucceeded).toHaveBeenCalledWith([sampleLoc]);
  });

  it('keeps failed popup for 3000 ms, returns to idle, and never calls onSucceeded', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(422, 'ZIP_INVALID', 'Invalid ZIP.'));

    const onSucceeded = vi.fn();
    const { result } = renderHook(() => useUploadFlow(onSucceeded));
    const file = new File(['bad'], 'bad.zip', { type: 'application/zip' });

    act(() => {
      result.current.choose(file);
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe('failed');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.state.kind).toBe('idle');
    expect(onSucceeded).not.toHaveBeenCalled();
  });

  it('clears the 3000 ms timer on unmount so no state update or callback runs after unmount', async () => {
    vi.mocked(api).mockResolvedValue({ imported: 1, locations: [sampleLoc] });

    const onSucceeded = vi.fn();
    const { result, unmount } = renderHook(() => useUploadFlow(onSucceeded));

    act(() => {
      result.current.choose(new File(['zip'], 'test.zip', { type: 'application/zip' }));
    });
    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.kind).toBe('succeeded');

    unmount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onSucceeded).not.toHaveBeenCalled();
  });
});
