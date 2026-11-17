import type { Location } from '@lm/shared';
import { cleanup, act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api/client';
import { useLocationsStore } from '../map/locationsStore';
import { UploadPage } from './UploadPage';

afterEach(cleanup);

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, api: vi.fn() };
});

const loc = (n: number, name: string): Location => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  latitude: 3.1,
  longitude: 101.6,
  createdAt: '2026-11-17T00:00:00.000Z',
});
const saved = loc(1, 'Suria KLCC');
const imported = [loc(2, 'Petaling Street'), loc(3, 'KL Bird Park')];
const zip = () => new File(['PK'], 'kl-places.zip', { type: 'application/zip' });

function MapProbe() {
  const location = useLocation();
  return <p>map with {JSON.stringify(location.state)}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <Routes>
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/map" element={<MapProbe />} />
        <Route path="/elsewhere" element={<p>elsewhere</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const choose = () =>
  fireEvent.change(screen.getByLabelText('Choose a .zip file'), { target: { files: [zip()] } });

describe('UploadPage (R10-R12, D13)', () => {
  const addMany = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(api).mockReset();
    addMany.mockReset();
    useLocationsStore.setState({ state: { kind: 'ready', locations: [saved] }, addMany });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps Upload disabled until a file is chosen', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    choose();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
    expect(screen.getByText('kl-places.zip')).toBeInTheDocument();
  });

  it('success: popup now, rows added at 3 s, then the banner links to the map with their ids', async () => {
    vi.mocked(api).mockResolvedValue({ imported: 2, locations: imported });
    renderPage();
    choose();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('2 locations added');
    expect(addMany).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(addMany).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(addMany).toHaveBeenCalledTimes(1);
    expect(addMany).toHaveBeenCalledWith(imported);

    const banner = screen.getByText(/2 locations added from kl-places\.zip/);
    act(() => {
      useLocationsStore.setState({ state: { kind: 'ready', locations: [saved, ...imported] } });
    });
    const rows = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(rows.map((r) => r.getAttribute('aria-current'))).toEqual([null, 'true', 'true']);

    fireEvent.click(within(banner).getByRole('link', { name: 'See them on the map' }));
    expect(screen.getByText(`map with ${JSON.stringify({ focusIds: imported.map((l) => l.id) })}`)).toBeInTheDocument();
  });

  it('failure: the popup shows the code message, nothing is added, and the page is idle at 3 s', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(422, 'ZIP_ENTRY_COUNT', 'x', { files: ['north.txt', 'south.txt'] }),
    );
    renderPage();
    choose();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('This one holds 2: north.txt, south.txt.');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(addMany).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
  });

  it('leaving during the popup still adds the rows', async () => {
    vi.mocked(api).mockResolvedValue({ imported: 2, locations: imported });
    const { unmount } = renderPage();
    choose();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    unmount();
    expect(addMany).toHaveBeenCalledWith(imported);
  });
});
