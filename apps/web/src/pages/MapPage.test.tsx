import type { Location } from '@lm/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { useLocationsStore } from '../map/locationsStore';
import { MapPage } from './MapPage';

// jsdom cannot lay out a Leaflet map: the real map is covered by e2e (map.spec.ts, F3, F4).
vi.mock('../map/LocationsMap', () => ({
  LocationsMap: ({ locations, focusIds }: { locations: Location[]; focusIds: string[] }) => (
    <div data-testid="map" data-focus={focusIds.join(',')}>
      {locations.map((l) => (
        <span key={l.id}>marker:{l.name}</span>
      ))}
    </div>
  ),
}));

const loc = (n: number, name: string): Location => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  name,
  latitude: 3.1 + n / 100,
  longitude: 101.6 + n / 100,
  createdAt: '2026-11-17T00:00:00.000Z',
});
const klcc = loc(1, 'Suria KLCC');
const merdeka = loc(2, 'Merdeka 118');

function renderMap(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/map', state }]}>
      <MapPage />
    </MemoryRouter>,
  );
}

const handle = () => screen.getByRole('button', { name: /locations/i });

describe('MapPage (R6-R9, D13, D23)', () => {
  const load = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn();
  beforeEach(() => {
    load.mockClear();
    create.mockReset();
    useLocationsStore.setState({ state: { kind: 'idle' }, load, create });
  });

  it('loads the list once when the store is idle', () => {
    renderMap();
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
  });

  it('puts every location on the map and counts them on the closed sheet', () => {
    useLocationsStore.setState({ state: { kind: 'ready', locations: [klcc, merdeka] } });
    renderMap();
    expect(load).not.toHaveBeenCalled();
    expect(screen.getByText('marker:Suria KLCC')).toBeInTheDocument();
    expect(screen.getByText('marker:Merdeka 118')).toBeInTheDocument();
    expect(handle()).toHaveAttribute('aria-expanded', 'false');
    expect(handle()).toHaveTextContent('Swipe up for your locations (2)');
  });

  it('opened with focusIds (D13): sheet open, those rows marked new, the map told to fit them', () => {
    useLocationsStore.setState({ state: { kind: 'ready', locations: [klcc, merdeka] } });
    renderMap({ focusIds: [merdeka.id] });
    expect(handle()).toHaveAttribute('aria-expanded', 'true');
    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).not.toHaveAttribute('aria-current');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('map')).toHaveAttribute('data-focus', merdeka.id);
  });

  it('a failed load shows the error with Retry, which loads again', () => {
    useLocationsStore.setState({
      state: { kind: 'failed', error: new ApiError(500, 'INTERNAL', 'Something went wrong.') },
    });
    renderMap();
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your locations.");
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('latitude 91 shows an error under Latitude and sends nothing (S3.invalid)', () => {
    useLocationsStore.setState({ state: { kind: 'ready', locations: [] } });
    renderMap();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Menara KL' } });
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '91' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '101.7038' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const latitude = screen.getByLabelText('Latitude');
    expect(latitude).toHaveAttribute('aria-invalid', 'true');
    expect(latitude).toHaveAttribute('aria-describedby', 'location-latitude-error');
    expect(create).not.toHaveBeenCalled();
  });
});
