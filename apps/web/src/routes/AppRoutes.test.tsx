import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from '../session/sessionStore';
import { AppRoutes } from './AppRoutes';

function LocationTracker() {
  const loc = useLocation();
  return (
    <div data-testid="loc">
      {loc.pathname}
      {JSON.stringify(loc.state)}
    </div>
  );
}

const sampleUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'a@example.com',
  createdAt: '2026-11-17T00:00:00.000Z',
};

describe('AppRoutes', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useSessionStore.setState({
      state: { kind: 'signedOut', error: null, returnTo: null },
    });
  });

  it('redirects signed-out /map to /login with original path in router state', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <AppRoutes />
        <LocationTracker />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent('/login{"from":"/map"}');
  });

  it('redirects signed-out /upload to /login with original path in router state', () => {
    render(
      <MemoryRouter initialEntries={['/upload']}>
        <AppRoutes />
        <LocationTracker />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent('/login{"from":"/upload"}');
  });

  it('renders /login and /register even when signed in', () => {
    useSessionStore.setState({ state: { kind: 'signedIn', user: sampleUser } });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/register']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
  });

  it('redirects / to /map (and renders Map when signed in)', () => {
    useSessionStore.setState({ state: { kind: 'signedIn', user: sampleUser } });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
        <LocationTracker />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByTestId('loc')).toHaveTextContent('/map');
  });

  it('renders Upload when signed in and Page not found on unknown routes', () => {
    useSessionStore.setState({ state: { kind: 'signedIn', user: sampleUser } });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/upload']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/does-not-exist']}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
