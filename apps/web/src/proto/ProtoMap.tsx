import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import '../map/leafletIcons';
import type { ProtoLocation } from './data';

function FitTo({ points }: { points: ProtoLocation[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: false });
  }, [map, points]);
  return null;
}

function ProtoMarker({ loc, open }: { loc: ProtoLocation; open: boolean }) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    if (open) ref.current?.openPopup();
  }, [open]);
  return (
    <Marker ref={ref} position={[loc.latitude, loc.longitude]}>
      <Popup>{loc.name}</Popup>
    </Marker>
  );
}

export function ProtoMap({
  locations,
  fit,
  popupId,
  className = 'h-full w-full',
}: {
  locations: ProtoLocation[];
  fit?: ProtoLocation[];
  popupId?: string;
  className?: string;
}) {
  return (
    <MapContainer center={[3.15, 101.7]} zoom={12} className={className} zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTo points={fit ?? locations} />
      {locations.map((loc) => (
        <ProtoMarker key={loc.id} loc={loc} open={loc.id === popupId} />
      ))}
    </MapContainer>
  );
}
