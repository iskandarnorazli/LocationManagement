// The popup that shows for three seconds after an upload (R11 success, R12 failure).
import type { UploadState } from './uploadMachine';
import { uploadMessage } from './uploadMessages';

export function UploadPopup({ state }: { state: UploadState }) {
  if (state.kind !== 'succeeded' && state.kind !== 'failed') return null;
  const ok = state.kind === 'succeeded';
  const n = ok ? state.locations.length : 0;
  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/30 p-4">
      <div
        role={ok ? 'status' : 'alert'}
        aria-live={ok ? 'polite' : 'assertive'}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <p aria-hidden="true" className={`text-2xl ${ok ? 'text-emerald-700' : 'text-red-700'}`}>
          {ok ? '✓' : '!'}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          {ok ? `${n} ${n === 1 ? 'location' : 'locations'} added` : 'This ZIP can’t be imported'}
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          {ok ? 'They will appear in your list and on the map in a moment.' : uploadMessage(state.error)}
        </p>
        <p className="mt-3 text-xs text-slate-600">Closes in 3 seconds</p>
      </div>
    </div>
  );
}
