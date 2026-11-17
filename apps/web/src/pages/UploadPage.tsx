// /upload (R10-R12, D13, D23): the upload card beside the list. After a successful upload the user
// stays here (D13): when the 3-second popup closes, the new rows are added and highlighted, with a
// link that opens the map on them.
import type { Location } from '@lm/shared';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router';
import { useLocationsStore } from '../map/locationsStore';
import { UploadPopup } from '../upload/UploadPopup';
import { useUploadFlow } from '../upload/useUploadFlow';

export function UploadPage() {
  const store = useLocationsStore((s) => s.state);
  const load = useLocationsStore((s) => s.load);
  const addMany = useLocationsStore((s) => s.addMany);
  const [added, setAdded] = useState<{ ids: string[]; file: string } | null>(null);
  const fileName = useRef('');
  const pending = useRef<Location[] | null>(null);

  const onSucceeded = useCallback(
    (locations: Location[]) => {
      pending.current = null;
      addMany(locations);
      setAdded({ ids: locations.map((l) => l.id), file: fileName.current });
    },
    [addMany],
  );
  const { state, choose, submit } = useUploadFlow(onSucceeded);

  useEffect(() => {
    if (store.kind === 'idle') void load();
  }, [store.kind, load]);

  // Leaving during the 3-second popup must not lose the rows: useUploadFlow's timer is cleared on
  // unmount, so the page adds them itself (addMany skips ids it already has).
  useEffect(() => {
    if (state.kind === 'succeeded') pending.current = state.locations;
  }, [state]);
  useEffect(
    () => () => {
      if (pending.current) addMany(pending.current);
    },
    [addMany],
  );

  const onChoose = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) choose(file);
  };
  const onUpload = () => {
    if (state.kind !== 'chosen') return;
    fileName.current = state.file.name;
    setAdded(null);
    void submit();
  };

  const chosenName = state.kind === 'chosen' || state.kind === 'uploading' ? state.file.name : null;
  const busy = state.kind === 'uploading';
  const locations = store.kind === 'ready' ? store.locations : [];
  const highlight = added?.ids ?? [];

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Upload</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="upload-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="upload-title" className="mb-3 text-sm font-semibold text-slate-900">
            Import locations from a ZIP
          </h2>
          {added && (
            <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {added.ids.length} {added.ids.length === 1 ? 'location' : 'locations'} added
              {added.file ? ` from ${added.file}` : ''}.{' '}
              <Link to="/map" state={{ focusIds: added.ids }} className="font-medium underline">
                See them on the map
              </Link>
            </p>
          )}
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <label htmlFor="zip-file" className="block text-sm font-medium text-slate-800">
              {chosenName ?? 'Choose a .zip file'}
            </label>
            <p className="mt-1 text-xs text-slate-600">One .txt file inside, at most 1 MiB</p>
            <input
              id="zip-file"
              type="file"
              accept=".zip,application/zip"
              onChange={onChoose}
              disabled={busy}
              className="mx-auto mt-3 block text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
          <div className="mt-4 rounded-md bg-slate-100 p-3 font-mono text-xs text-slate-700">
            <p className="mb-1 font-sans font-medium text-slate-800">Each line of the file:</p>
            Name, Latitude, Longitude
            <br />
            Suria KLCC, 3.157324409, 101.7121981
          </div>
          <button
            type="button"
            onClick={onUpload}
            disabled={state.kind !== 'chosen'}
            className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </section>

        <section aria-labelledby="list-title" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 id="list-title" className="mb-1 text-sm font-semibold text-slate-900">
            Your locations ({locations.length})
          </h2>
          {store.kind === 'loading' && <p className="text-sm text-slate-600">Loading…</p>}
          {store.kind === 'failed' && (
            <p role="alert" className="text-sm text-red-700">
              Couldn&apos;t load your locations. {store.error.message}
            </p>
          )}
          {store.kind === 'ready' && locations.length === 0 && (
            <p className="text-sm text-slate-600">No locations yet.</p>
          )}
          {locations.length > 0 && (
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
          )}
        </section>
      </div>
      <UploadPopup state={state} />
    </div>
  );
}
