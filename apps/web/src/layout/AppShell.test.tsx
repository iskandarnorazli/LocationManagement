import type { Location } from '@lm/shared';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useLocationsStore } from '../map/locationsStore';
import { RequireAuth } from '../routes/RequireAuth';
import { useSessionStore } from '../session/sessionStore';
import { AppShell } from './AppShell';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: vi.fn(),
  };
});

const sampleUser = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'aisyah@example.com',
  createdAt: '2026-11-17T00:00:00.000Z',
};

const sampleLocation: Location = {
  id: '00000000-0000-4000-8000-000000000010',
  name: 'KLCC',
  latitude: 3.1578,
  longitude: 101.7117,
  createdAt: '2026-11-17T00:00:00.000Z',
};

function renderShell(initialEntry = '/map') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<h2>Sign in</h2>} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/map" element={<h2>Map</h2>} />
            <Route path="/upload" element={<h2>Upload</h2>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(api).mockReset();
    useSessionStore.setState({ state: { kind: 'signedIn', user: sampleUser } });
    useLocationsStore.setState({ state: { kind: 'ready', locations: [sampleLocation] } });
  });

  it('renders app name, Map and Upload links, user email, and Log out with responsive md: classes', () => {
    renderShell('/map');

    const sidebar = screen.getByRole('complementary');
    expect(sidebar.className).toMatch(/\bhidden\b/);
    expect(sidebar.className).toMatch(/\bmd:flex\b/);

    const header = screen.getByRole('banner');
    expect(header.className).toMatch(/\bmd:hidden\b/);

    expect(within(sidebar).getByText('Location Management')).toBeInTheDocument();
    expect(within(sidebar).getByText('aisyah@example.com')).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Map' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Upload' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('marks only the current page link with aria-current="page"', () => {
    renderShell('/map');

    const sidebar = screen.getByRole('complementary');
    const mapLink = within(sidebar).getByRole('link', { name: 'Map' });
    const uploadLink = within(sidebar).getByRole('link', { name: 'Upload' });

    expect(mapLink).toHaveAttribute('aria-current', 'page');
    expect(uploadLink).not.toHaveAttribute('aria-current');

    fireEvent.click(uploadLink);

    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('link', { name: 'Upload' })).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByRole('link', { name: 'Map' })).not.toHaveAttribute('aria-current');
  });

  it('opens phone drawer as a modal dialog, moves focus in, and closes on Escape, backdrop, and link click', () => {
    renderShell('/map');

    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Close on Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close on backdrop click
    fireEvent.click(menuButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Reopen and close on link click
    fireEvent.click(menuButton);
    const openDialog = screen.getByRole('dialog');
    fireEvent.click(within(openDialog).getByRole('link', { name: 'Upload' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upload' })).toBeInTheDocument();
  });

  it('logs out via API, resets locationsStore, ends in signedOut, and lands on /login', async () => {
    vi.mocked(api).mockResolvedValueOnce(undefined);
    renderShell('/map');

    const sidebar = screen.getByRole('complementary');
    fireEvent.click(within(sidebar).getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });

    expect(api).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useSessionStore.getState().state).toEqual({
      kind: 'signedOut',
      error: null,
      returnTo: null,
    });
    expect(useLocationsStore.getState().state).toEqual({ kind: 'idle' });
  });
});
