import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { useSessionStore } from '../session/sessionStore';
import { RegisterPage } from './RegisterPage';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: vi.fn(),
  };
});

describe('RegisterPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api).mockReset();
    useSessionStore.setState({
      state: { kind: 'signedOut', error: null, returnTo: null },
    });
  });

  function renderRegister(initialEntry: string | { pathname: string; state?: unknown } = '/register') {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<h2>Sign in</h2>} />
          <Route path="/map" element={<h2>Map</h2>} />
          <Route path="/upload" element={<h2>Upload</h2>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('validates with Credentials, links errors via aria-describedby, focuses first invalid field, and sends nothing', () => {
    renderRegister();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(api).not.toHaveBeenCalled();
    expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
    expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
    expect(document.getElementById('email-error')).toBeInTheDocument();
    expect(document.getElementById('password-error')).toBeInTheDocument();
    expect(document.activeElement).toBe(emailInput);
  });

  it('shows 409 EMAIL_TAKEN message and 429 RATE_LIMITED message', async () => {
    vi.mocked(api).mockRejectedValueOnce(new ApiError(409, 'EMAIL_TAKEN', 'Taken.'));
    renderRegister();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists.',
    );

    vi.mocked(api).mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', 'Slow down.'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in a minute.',
    );
  });

  it('disables submit button while submitting', () => {
    useSessionStore.setState({ state: { kind: 'submitting', returnTo: null } });
    renderRegister();
    expect(screen.getByRole('button', { name: /creating|create account/i })).toBeDisabled();
  });

  it('redirects a signed-in user to /map (or router state from)', () => {
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
    renderRegister('/register');
    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
  });
});
