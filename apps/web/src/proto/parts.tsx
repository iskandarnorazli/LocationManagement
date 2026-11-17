// Pieces the three layouts share. Copy follows docs/ERRORS.md and docs/UX_FLOWS.md.
import type { ReactNode } from 'react';
import { USER_EMAIL, type ProtoLocation } from './data';

export type Page = 'map' | 'upload';

const field = 'mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none';

export function NavLinks({
  page,
  tone,
  showLabels = true,
}: {
  page: Page;
  tone: 'dark' | 'light';
  showLabels?: boolean;
}) {
  const item = (key: Page, icon: string, label: string) => {
    const active = key === page;
    const colors =
      tone === 'dark'
        ? active
          ? 'bg-white/15 text-white'
          : 'text-slate-300 hover:bg-white/10'
        : active
          ? 'bg-emerald-50 text-emerald-800'
          : 'text-slate-600 hover:bg-slate-100';
    return (
      <a
        href="#"
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${colors} ${showLabels ? '' : 'flex-col gap-1 px-2 text-xs'}`}
      >
        <span aria-hidden className="text-lg leading-none">
          {icon}
        </span>
        {label}
      </a>
    );
  };
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {item('map', '⌖', 'Map')}
      {item('upload', '⇪', 'Upload')}
    </nav>
  );
}

export function LogOut({ tone, compact = false }: { tone: 'dark' | 'light'; compact?: boolean }) {
  const colors = tone === 'dark' ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';
  return (
    <div className={`text-sm ${colors}`}>
      {!compact && <p className="truncate text-xs opacity-75">{USER_EMAIL}</p>}
      <button type="button" className="mt-1 font-medium underline-offset-2 hover:underline">
        Log out
      </button>
    </div>
  );
}

/** Phone top bar; the sidebar opens over the page as a drawer (R2 on a narrow screen). */
export function PhoneBar({ title, open, page }: { title: string; open: boolean; page: Page }) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-white px-4 md:hidden">
        <button type="button" aria-label="Open menu" className="rounded-md p-2 text-xl leading-none">
          ☰
        </button>
        <h1 className="font-semibold">{title}</h1>
      </header>
      {open && (
        <div className="fixed inset-0 z-[2000] flex md:hidden">
          <aside className="flex w-72 flex-col justify-between bg-slate-900 p-4">
            <div>
              <p className="mb-6 font-semibold text-white">Location Management</p>
              <NavLinks page={page} tone="dark" />
            </div>
            <LogOut tone="dark" />
          </aside>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
    </>
  );
}

/** One row on desktop (name, latitude, longitude, Add), stacked on a phone: layout D's sheet. */
export function LocationFormRow({ invalid }: { invalid: boolean }) {
  const label = 'block text-xs font-medium text-slate-700';
  return (
    <form
      className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr_1fr_auto] md:items-start"
      onSubmit={(e) => e.preventDefault()}
      noValidate
    >
      <div className="col-span-2 md:col-span-1">
        <label className={label} htmlFor="name">
          Name
        </label>
        <input id="name" className={`${field} border-slate-300`} defaultValue={invalid ? 'Menara KL' : ''} />
      </div>
      <div>
        <label className={label} htmlFor="lat">
          Latitude
        </label>
        <input
          id="lat"
          inputMode="decimal"
          aria-invalid={invalid}
          aria-describedby={invalid ? 'lat-error' : undefined}
          className={`${field} ${invalid ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
          defaultValue={invalid ? '91' : ''}
        />
        {invalid && (
          <p id="lat-error" className="mt-1 text-xs text-red-700">
            Latitude must be between -90 and 90.
          </p>
        )}
      </div>
      <div>
        <label className={label} htmlFor="lng">
          Longitude
        </label>
        <input id="lng" inputMode="decimal" className={`${field} border-slate-300`} defaultValue={invalid ? '101.7038' : ''} />
      </div>
      <button
        type="submit"
        className="col-span-2 h-[38px] rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 md:col-span-1 md:mt-5"
      >
        Add
      </button>
    </form>
  );
}

export function LocationForm({ invalid, onDark = false }: { invalid: boolean; onDark?: boolean }) {
  const label = `block text-sm font-medium ${onDark ? 'text-white' : 'text-slate-700'}`;
  return (
    <form className="space-y-3" onSubmit={(e) => e.preventDefault()} noValidate>
      <div>
        <label className={label} htmlFor="name">
          Name
        </label>
        <input id="name" className={`${field} border-slate-300`} defaultValue={invalid ? 'Menara KL' : ''} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="lat">
            Latitude
          </label>
          <input
            id="lat"
            inputMode="decimal"
            aria-invalid={invalid}
            className={`${field} ${invalid ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
            defaultValue={invalid ? '91' : ''}
          />
          {invalid && <p className="mt-1 text-xs text-red-700">Latitude must be between -90 and 90.</p>}
        </div>
        <div>
          <label className={label} htmlFor="lng">
            Longitude
          </label>
          <input
            id="lng"
            inputMode="decimal"
            className={`${field} border-slate-300`}
            defaultValue={invalid ? '101.7038' : ''}
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
      >
        Add location
      </button>
    </form>
  );
}

export function LocationList({ locations, highlight = [] }: { locations: ProtoLocation[]; highlight?: string[] }) {
  return (
    <ul className="divide-y divide-slate-200 text-sm">
      {locations.map((l) => (
        <li key={l.id} className={`px-1 py-2 ${highlight.includes(l.id) ? 'bg-emerald-50' : ''}`}>
          <p className="font-medium text-slate-900">{l.name}</p>
          <p className="font-mono text-xs text-slate-500">
            {l.latitude.toFixed(6)}, {l.longitude.toFixed(6)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function UploadPanel({ chosen }: { chosen: string | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p className="text-sm font-medium text-slate-800">{chosen ?? 'Choose a .zip file'}</p>
        <p className="mt-1 text-xs text-slate-500">One .txt file inside, at most 1 MiB</p>
        <button type="button" className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium">
          Browse…
        </button>
      </div>
      <div className="rounded-md bg-slate-100 p-3 font-mono text-xs text-slate-700">
        <p className="mb-1 font-sans font-medium text-slate-800">Each line of the file:</p>
        Name, Latitude, Longitude
        <br />
        Suria KLCC, 3.157324409, 101.7121981
      </div>
      <button
        type="button"
        disabled={!chosen}
        className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Upload
      </button>
    </div>
  );
}

/** R11 and R12: the popup that shows for three seconds. */
export function ResultPopup({ kind }: { kind: 'success' | 'error' }) {
  const ok = kind === 'success';
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/30 p-4">
      <div role={ok ? 'status' : 'alert'} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <p className={`text-2xl ${ok ? 'text-emerald-700' : 'text-red-700'}`} aria-hidden>
          {ok ? '✓' : '!'}
        </p>
        <h2 className="mt-2 text-lg font-semibold">{ok ? '3 locations added' : 'This ZIP can’t be imported'}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {ok
            ? 'They will appear on the map in a moment.'
            : 'The ZIP must hold exactly one text file. This one holds 2: north.txt, south.txt.'}
        </p>
        <div className="mt-4 h-1 overflow-hidden rounded bg-slate-100">
          <div className={`h-full w-2/3 ${ok ? 'bg-emerald-600' : 'bg-red-600'}`} />
        </div>
        <p className="mt-1 text-xs text-slate-500">Closes in 3 seconds</p>
      </div>
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-1/2 top-4 z-[1500] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
      {children}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}
