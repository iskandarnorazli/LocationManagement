// Layout D's bottom sheet (#11, owner 2026-11-17): the add form shows by default; swipe up on
// the handle (or tap it, or press Enter on it) to reveal the list; swipe down to hide it.
import { useRef, useState, type PointerEvent, type ReactNode } from 'react';

const SWIPE_PX = 40;

export function Sheet({
  initiallyOpen,
  count,
  form,
  list,
}: {
  initiallyOpen: boolean;
  count: number;
  form: ReactNode;
  list: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current;
    startY.current = null;
    if (dy < -SWIPE_PX) setOpen(true);
    else if (dy > SWIPE_PX) setOpen(false);
    else setOpen((o) => !o);
  };

  return (
    <section
      aria-label="Locations"
      className={`absolute inset-x-0 bottom-0 z-[1000] mx-auto flex max-w-2xl flex-col rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.18)] md:bottom-4 md:rounded-2xl ${
        open ? 'max-h-[75%] md:max-h-[70%]' : ''
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sheet-list"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex w-full touch-none flex-col items-center gap-1 rounded-t-2xl px-4 pb-1 pt-2"
      >
        <span aria-hidden className="h-1.5 w-10 rounded-full bg-slate-300" />
        <span className="text-xs font-medium text-slate-600">
          {open ? 'Swipe down to hide' : `Swipe up for your locations (${count})`}
        </span>
      </button>
      <div className="px-4 pb-4">{form}</div>
      {open && (
        <div id="sheet-list" className="min-h-0 flex-1 overflow-auto border-t border-slate-200 px-4 pb-4 pt-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Your locations ({count})</h2>
          {list}
        </div>
      )}
    </section>
  );
}
