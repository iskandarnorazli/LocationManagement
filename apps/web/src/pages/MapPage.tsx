// /map (R6-R9, D12, D23): the full-screen map with the add form in a bottom sheet that swipes up
// to the list. Opened from the upload page's link (D13) with router state { focusIds }, it zooms to
// those markers, opens the sheet and highlights their rows.
import type { Location } from '@lm/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router';
import { LocationSheet } from '../map/LocationSheet';
import { LocationsMap } from '../map/LocationsMap';
import { useLocationsStore } from '../map/locationsStore';
import { useLocationForm } from '../map/useLocationForm';
import type { FormFields } from '../map/locationFormMachine';

const field =
  'mt-1 block w-full rounded-md border px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none';

function focusIdsOf(state: unknown): string[] {
  const ids = (state as { focusIds?: unknown } | null)?.focusIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

function LocationForm() {
  const { state, edit, submit } = useLocationForm();
  const saving = state.kind === 'saving';
  const errors = state.kind === 'editing' ? state.errors : {};
  const saveError = state.kind === 'editing' ? state.saveError : null;
  const fields = state.fields;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const input = (key: keyof FormFields, label: string, decimal = false) => (
    <div className={key === 'name' ? 'col-span-2 md:col-span-1' : ''}>
      <label htmlFor={`location-${key}`} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      <input
        id={`location-${key}`}
        name={key}
        value={fields[key]}
        onChange={(e) => edit(key, e.target.value)}
        disabled={saving}
        inputMode={decimal ? 'decimal' : undefined}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `location-${key}-error` : undefined}
        className={`${field} ${errors[key] ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
      />
      {errors[key] && (
        <p id={`location-${key}-error`} className="mt-1 text-xs text-red-700">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Add a location"
      className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-start"
    >
      {input('name', 'Name')}
      {input('latitude', 'Latitude', true)}
      {input('longitude', 'Longitude', true)}
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 h-[38px] rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 md:col-span-1 md:mt-5"
      >
        {saving ? 'Adding…' : 'Add'}
      </button>
      {saveError && (
        <p role="alert" className="col-span-2 text-sm text-red-700 md:col-span-4">
          Couldn&apos;t save the location. {saveError.message}
        </p>
      )}
    </form>
  );
}

function LocationList({ locations, highlight }: { locations: Location[]; highlight: string[] }) {
  if (locations.length === 0) {
    return <p className="py-2 text-sm text-slate-600">No locations yet. Add one above, or upload a ZIP.</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 text-sm">
      {locations.map((l) => {
        const isNew = highlight.includes(l.id);
        return (
          <li
            key={l.id}
            aria-current={isNew ? 'true' : undefined}
            className={`px-1 py-2 ${isNew ? 'bg-emerald-50' : ''}`}
          >
            <p className="font-medium text-slate-900">
              {l.name}
              {isNew && <span className="ml-2 text-xs font-normal text-emerald-800">new</span>}
            </p>
            <p className="font-mono text-xs text-slate-600">
              {l.latitude}, {l.longitude}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function MapPage() {
  const state = useLocationsStore((s) => s.state);
  const load = useLocationsStore((s) => s.load);
  const routerLocation = useLocation();
  const focusIds = focusIdsOf(routerLocation.state);
  const focusKey = focusIds.join(',');

  const [open, setOpen] = useState(focusIds.length > 0);
  const [openedFor, setOpenedFor] = useState(focusKey);
  if (focusKey !== openedFor) {
    // A new focus from the upload page's link (D13): open the sheet on its rows.
    setOpenedFor(focusKey);
    if (focusKey) setOpen(true);
  }

  const sheetRef = useRef<HTMLElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (state.kind === 'idle') void load();
  }, [state.kind, load]);

  useEffect(() => {
    const el = sheetRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setSheetHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const locations = state.kind === 'ready' ? state.locations : [];

  return (
    // `isolate`: Leaflet's panes use z-index 400 and up, which would cover the phone drawer.
    <div className="relative isolate h-full min-h-[28rem]">
      <h1 className="sr-only">Map</h1>
      <LocationsMap locations={locations} focusIds={focusIds} padBottom={sheetHeight} />

      {state.kind === 'loading' && (
        <p
          role="status"
          className="absolute left-1/2 top-3 z-[1100] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1.5 text-sm text-white shadow"
        >
          Loading your locations…
        </p>
      )}
      {state.kind === 'failed' && (
        <div
          role="alert"
          className="absolute left-1/2 top-3 z-[1100] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-white px-4 py-2 text-sm text-red-700 shadow"
        >
          Couldn&apos;t load your locations. {state.error.message}
          <button type="button" onClick={() => void load()} className="font-semibold text-emerald-800 underline">
            Retry
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1100] md:bottom-4 md:px-4">
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <LocationSheet
            open={open}
            onOpenChange={setOpen}
            count={locations.length}
            sheetRef={sheetRef}
            form={<LocationForm />}
            list={<LocationList locations={locations} highlight={focusIds} />}
          />
        </div>
      </div>
    </div>
  );
}
