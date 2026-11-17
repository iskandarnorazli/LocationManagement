import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import type { ProtoLocation } from './data';

// An explicit icon: L.Icon.Default prefixes a CSS-detected path to Vite's URLs (bug filed from #67).
const icon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type Pad = { topLeft: [number, number]; bottomRight: [number, number] };

function FitTo({ points, pad }: { points: ProtoLocation[]; pad: Pad | undefined }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, {
      paddingTopLeft: pad?.topLeft ?? [48, 48],
      paddingBottomRight: pad?.bottomRight ?? [48, 48],
      maxZoom: 14,
      animate: false,
    });
  }, [map, points, pad]);
  return null;
}

function ProtoMarker({ loc, open }: { loc: ProtoLocation; open: boolean }) {
  const ref = useRef<L.Marker>(null);
  useEffect(() => {
    if (open) ref.current?.openPopup();
  }, [open]);
  return (
    <Marker ref={ref} icon={icon} position={[loc.latitude, loc.longitude]}>
      <Popup>{loc.name}</Popup>
    </Marker>
  );
}

export function ProtoMap({
  locations,
  fit,
  popupId,
  pad,
  className = 'h-full w-full',
}: {
  locations: ProtoLocation[];
  fit?: ProtoLocation[] | undefined;
  popupId?: string | undefined;
  pad?: Pad | undefined;
  className?: string;
}) {
  return (
    <MapContainer center={[3.15, 101.7]} zoom={12} className={className} zoomControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTo points={fit ?? locations} pad={pad} />
      {locations.map((loc) => (
        <ProtoMarker key={loc.id} loc={loc} open={loc.id === popupId} />
      ))}
    </MapContainer>
  );
}
