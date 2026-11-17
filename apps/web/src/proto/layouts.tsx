// Three whole-layout candidates for #11 (pstack principle-exhaust-the-design-space):
// A map-first with a floating form, B split view with form and list beside the map,
// C one centred column, the same on phone and desktop.
import { IMPORTED, MAP_STATES, SAVED, type ProtoLocation, type ProtoState } from './data';
import { ProtoMap } from './ProtoMap';
import {
  Card,
  LocationForm,
  LocationList,
  LogOut,
  NavLinks,
  PhoneBar,
  ResultPopup,
  Toast,
  UploadPanel,
  type Page,
} from './parts';

const ALL: ProtoLocation[] = [...SAVED, ...IMPORTED];
const NEW_IDS = IMPORTED.map((l) => l.id);

type View = {
  state: ProtoState;
  page: Page;
  locations: ProtoLocation[];
  fit?: ProtoLocation[];
  popupId?: string;
  invalid: boolean;
  navOpen: boolean;
  chosen: string | null;
};

export function viewOf(state: ProtoState): View {
  return {
    state,
    page: MAP_STATES.includes(state) ? 'map' : 'upload',
    locations: state === 'afterMap' || state === 'afterStay' ? ALL : SAVED,
    fit: state === 'afterMap' ? IMPORTED : undefined,
    popupId: state === 'popup' ? '1' : undefined,
    invalid: state === 'invalid',
    navOpen: state === 'nav',
    chosen: state === 'success' ? 'kl-places.zip' : state === 'error' ? 'two-files.zip' : null,
  };
}

function Popups({ v }: { v: View }) {
  if (v.state === 'success') return <ResultPopup kind="success" />;
  if (v.state === 'error') return <ResultPopup kind="error" />;
  return null;
}

function StayedBanner() {
  return (
    <p role="status" className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      3 locations added from kl-places.zip.{' '}
      <a href="#" className="font-medium underline">
        See them on the map
      </a>
    </p>
  );
}

function Brand({ dark }: { dark: boolean }) {
  return <p className={`mb-6 font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>Location Management</p>;
}

/** A: the map fills the screen; the form floats over it (a bottom sheet on a phone). */
export function LayoutA({ v }: { v: View }) {
  return (
    <div className="flex h-screen flex-col bg-slate-100 md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col justify-between bg-slate-900 p-4 md:flex">
        <div>
          <Brand dark />
          <NavLinks page={v.page} tone="dark" />
        </div>
        <LogOut tone="dark" />
      </aside>
      <PhoneBar title={v.page === 'map' ? 'Map' : 'Upload'} open={v.navOpen} page={v.page} />
      <main className="relative min-h-0 flex-1">
        {v.page === 'map' ? (
          <>
            <ProtoMap locations={v.locations} fit={v.fit} popupId={v.popupId} />
            {v.state === 'afterMap' && <Toast>3 new locations from kl-places.zip</Toast>}
            <div className="absolute inset-x-3 bottom-3 z-[1000] md:inset-x-auto md:bottom-auto md:right-4 md:top-4 md:w-80">
              <Card title="Add a location">
                <LocationForm invalid={v.invalid} />
              </Card>
            </div>
          </>
        ) : (
          <div className="flex h-full items-start justify-center overflow-auto p-4 md:items-center">
            <Card title="Import locations from a ZIP" className="w-full max-w-md">
              {v.state === 'afterStay' && <StayedBanner />}
              <UploadPanel chosen={v.chosen} />
            </Card>
          </div>
        )}
      </main>
      <Popups v={v} />
    </div>
  );
}

/** B: a working column (form, then the list) beside the map; on a phone, map, form, list. */
export function LayoutB({ v }: { v: View }) {
  return (
    <div className="flex h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 md:flex">
        <div>
          <Brand dark={false} />
          <NavLinks page={v.page} tone="light" />
        </div>
        <LogOut tone="light" />
      </aside>
      <PhoneBar title={v.page === 'map' ? 'Map' : 'Upload'} open={v.navOpen} page={v.page} />
      {v.page === 'map' ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-auto md:flex-row md:overflow-hidden">
          <div className="relative order-first h-72 shrink-0 md:order-last md:h-full md:flex-1">
            <ProtoMap locations={v.locations} fit={v.fit} popupId={v.popupId} />
            {v.state === 'afterMap' && <Toast>3 new locations from kl-places.zip</Toast>}
          </div>
          <div className="space-y-4 p-4 md:w-96 md:shrink-0 md:overflow-auto md:border-r md:border-slate-200">
            <Card title="Add a location">
              <LocationForm invalid={v.invalid} />
            </Card>
            <Card title={`Your locations (${v.locations.length})`}>
              <LocationList locations={v.locations} highlight={v.state === 'afterMap' ? NEW_IDS : []} />
            </Card>
          </div>
        </main>
      ) : (
        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Import locations from a ZIP">
              {v.state === 'afterStay' && <StayedBanner />}
              <UploadPanel chosen={v.chosen} />
            </Card>
            <Card title={`Your locations (${v.locations.length})`}>
              <LocationList locations={v.locations} highlight={v.state === 'afterStay' ? NEW_IDS : []} />
            </Card>
          </div>
        </main>
      )}
      <Popups v={v} />
    </div>
  );
}

/** C: one centred column of cards (map, form, list); a narrow icon rail on desktop. */
export function LayoutC({ v }: { v: View }) {
  return (
    <div className="flex h-screen flex-col bg-slate-100 md:flex-row">
      <aside className="hidden w-24 shrink-0 flex-col items-center justify-between bg-slate-900 py-4 md:flex">
        <div className="flex flex-col items-center">
          <p className="mb-6 text-lg font-bold text-white" aria-label="Location Management">
            LM
          </p>
          <NavLinks page={v.page} tone="dark" showLabels={false} />
        </div>
        <LogOut tone="dark" compact />
      </aside>
      <PhoneBar title={v.page === 'map' ? 'Map' : 'Upload'} open={v.navOpen} page={v.page} />
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4 md:py-8">
          {v.page === 'map' ? (
            <>
              <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200 shadow-sm md:h-[420px]">
                <ProtoMap locations={v.locations} fit={v.fit} popupId={v.popupId} />
                {v.state === 'afterMap' && <Toast>3 new locations from kl-places.zip</Toast>}
              </div>
              <Card title="Add a location">
                <LocationForm invalid={v.invalid} />
              </Card>
              <Card title={`Your locations (${v.locations.length})`}>
                <LocationList locations={v.locations} highlight={v.state === 'afterMap' ? NEW_IDS : []} />
              </Card>
            </>
          ) : (
            <Card title="Import locations from a ZIP">
              {v.state === 'afterStay' && <StayedBanner />}
              <UploadPanel chosen={v.chosen} />
            </Card>
          )}
        </div>
      </main>
      <Popups v={v} />
    </div>
  );
}
