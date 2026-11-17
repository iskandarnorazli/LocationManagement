import { UserResponse } from '@lm/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { useSessionStore } from './sessionStore';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: vi.fn(),
  };
});

const sampleUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'a@example.com',
  createdAt: '2026-11-17T00:00:00.000Z',
};

describe('sessionStore register & login', () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
    useSessionStore.setState({
      state: { kind: 'signedOut', error: null, returnTo: null },
    });
  });

  it('register() dispatches REGISTER, calls POST /auth/register, and transitions to signedIn', async () => {
    vi.mocked(api).mockResolvedValue({ user: sampleUser });

    await useSessionStore.getState().register({ email: 'a@example.com', password: 'password123' });

    expect(api).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
      schema: UserResponse,
    });
    expect(useSessionStore.getState().state).toEqual({ kind: 'signedIn', user: sampleUser });
  });

  it('register() dispatches AUTH_FAILED on ApiError', async () => {
    const err = new ApiError(409, 'EMAIL_TAKEN', 'Email taken.');
    vi.mocked(api).mockRejectedValue(err);

    await useSessionStore.getState().register({ email: 'a@example.com', password: 'password123' });

    expect(useSessionStore.getState().state).toEqual({
      kind: 'signedOut',
      error: err,
      returnTo: null,
    });
  });

  it('login() dispatches LOGIN, calls POST /auth/login, and transitions to signedIn or signedOut with error', async () => {
    vi.mocked(api).mockResolvedValue({ user: sampleUser });

    await useSessionStore.getState().login({ email: 'a@example.com', password: 'password123' });

    expect(api).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@example.com', password: 'password123' }),
      schema: UserResponse,
    });
    expect(useSessionStore.getState().state).toEqual({ kind: 'signedIn', user: sampleUser });

    useSessionStore.setState({ state: { kind: 'signedOut', error: null, returnTo: null } });
    const err = new ApiError(401, 'INVALID_CREDENTIALS', 'Bad credentials.');
    vi.mocked(api).mockRejectedValue(err);

    await useSessionStore.getState().login({ email: 'a@example.com', password: 'wrongpassword' });
    expect(useSessionStore.getState().state).toEqual({
      kind: 'signedOut',
      error: err,
      returnTo: null,
    });
  });
});
