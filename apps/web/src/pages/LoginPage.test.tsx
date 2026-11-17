import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { useSessionStore } from '../session/sessionStore';
import { LoginPage } from './LoginPage';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: vi.fn(),
  };
});

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api).mockReset();
    useSessionStore.setState({
      state: { kind: 'signedOut', error: null, returnTo: null },
    });
  });

  function renderLogin(initialEntry: string | { pathname: string; state?: unknown } = '/login') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<h2>Create an account</h2>} />
          <Route path="/map" element={<h2>Map</h2>} />
          <Route path="/upload" element={<h2>Upload</h2>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('validates with Credentials, links errors via aria-describedby, focuses first invalid field, and sends nothing', () => {
    renderLogin();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(emailInput, { target: { value: 'valid@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(api).not.toHaveBeenCalled();
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    expect(document.getElementById('password-error')).toBeInTheDocument();
    expect(document.activeElement).toBe(passwordInput);
  });

  it('shows 401 INVALID_CREDENTIALS and 429 RATE_LIMITED messages', async () => {
    vi.mocked(api).mockRejectedValueOnce(new ApiError(401, 'INVALID_CREDENTIALS', 'Bad.'));
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Email or password is incorrect.',
    );

    vi.mocked(api).mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', 'Slow down.'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in a minute.',
    );
  });

  it('disables submit button while submitting', () => {
    useSessionStore.setState({ state: { kind: 'submitting', returnTo: null } });
    renderLogin();
    expect(screen.getByRole('button', { name: /signing|sign in/i })).toBeDisabled();
  });

  it('redirects a signed-in user to router state from path, or /map when absent', () => {
    useSessionStore.setState({
      state: {
        kind: 'signedIn',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'a@example.com',
          createdAt: '2026-11-17T00:00:00.000Z',
        },
      },
    });
    renderLogin({ pathname: '/login', state: { from: '/upload' } });
    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
  });
});
