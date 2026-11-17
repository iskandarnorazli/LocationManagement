import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '../session/sessionStore';
import { RequireAuth } from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <div data-testid="login-page">{JSON.stringify(location.state)}</div>;
}

describe('RequireAuth', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useSessionStore.setState({ state: { kind: 'checking' } });
  });

  it('shows a spinner in checking with no flash of the login page', () => {
    render(
      <MemoryRouter initialEntries={['/locations']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/locations" element={<div>Protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects in signedOut to /login with the original path in state', () => {
    useSessionStore.setState({
      state: { kind: 'signedOut', error: null, returnTo: null },
    });

    render(
      <MemoryRouter initialEntries={['/upload?tab=zip']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/upload" element={<div>Protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('login-page')).toHaveTextContent('/upload?tab=zip');
  });

  it('renders protected route when signedIn', () => {
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

    render(
      <MemoryRouter initialEntries={['/locations']}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/locations" element={<div>Protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
