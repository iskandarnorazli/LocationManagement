import { UserResponse } from '@lm/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, setOnUnauthorized } from './client';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setOnUnauthorized(null);
  });

  it('parses a 2xx JSON response with the given schema', async () => {
    const user = {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'a@example.com',
      createdAt: '2026-11-17T00:00:00.000Z',
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const data = await api('/auth/me', { schema: UserResponse });
    expect(data).toEqual({ user });
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('turns a network failure into ApiError code NETWORK', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api('/auth/me', { schema: UserResponse })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NETWORK',
    });
  });

  it('turns a non-JSON body into ApiError code NETWORK', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', { status: 502 }),
    );

    await expect(api('/auth/me', { schema: UserResponse })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NETWORK',
      status: 502,
    });
  });

  it('turns an API error envelope into ApiError and calls onUnauthorized on 401', async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication is required.',
            requestId: 'req-1',
          },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    let caught: unknown;
    try {
      await api('/auth/me', { schema: UserResponse });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication is required.',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
