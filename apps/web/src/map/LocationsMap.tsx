// The map (R6, R8, R9): one marker per location, its name in a popup. It fits to every marker on
// the first load, and to `focusIds` when they are given (D13). `padBottom` keeps markers clear of
// the bottom sheet (D23).
import type { Location } from '@lm/shared';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import './leafletIcons';

const KUALA_LUMPUR: [number, number] = [3.139, 101.6869];

function FitBounds({
  locations,
  focusIds,
  padBottom,
}: {
  locations: Location[];
  focusIds: string[];
  padBottom: number;
}) {
  const map = useMap();
  const fittedKey = useRef<string | null>(null);

  useEffect(() => {
    const targets = focusIds.length > 0 ? locations.filter((l) => focusIds.includes(l.id)) : locations;
    if (targets.length === 0) return;
    const key = focusIds.length > 0 ? `focus:${focusIds.join(',')}` : 'all';
    if (fittedKey.current === key) return; // fit once per target; never fight the user's panning
    fittedKey.current = key;
    map.invalidateSize();
    const bounds = L.latLngBounds(targets.map((l) => [l.latitude, l.longitude] as [number, number]));
    map.fitBounds(bounds, {
      paddingTopLeft: [32, 32],
      paddingBottomRight: [32, padBottom + 16],
      maxZoom: 15,
      animate: false,
    });
  }, [map, locations, focusIds, padBottom]);

  return null;
}

export function LocationsMap({
  locations,
  focusIds,
  padBottom,
}: {
  locations: Location[];
  focusIds: string[];
  padBottom: number;
}) {
  return (
    <MapContainer center={KUALA_LUMPUR} zoom={11} className="h-full w-full" aria-label="Map of your locations">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locations={locations} focusIds={focusIds} padBottom={padBottom} />
      {locations.map((loc) => (
        <Marker key={loc.id} position={[loc.latitude, loc.longitude]} alt={loc.name} title={loc.name}>
          <Popup>{loc.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
