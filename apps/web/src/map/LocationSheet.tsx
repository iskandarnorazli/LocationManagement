// Layout D's bottom sheet (D23): the add form shows by default; swipe up on the handle to reveal
// "Your locations", swipe down to hide it. A tap, Enter or Space on the handle toggles it. Open or
// closed is the parent's boolean (a disclosure, not a flow: no state machine).
import { useRef, type PointerEvent, type ReactNode, type Ref } from 'react';

export const SWIPE_PX = 40;
export type SheetGesture = 'open' | 'close' | 'toggle';

/** What a vertical drag of `dy` pixels on the handle means: up opens, down closes, small toggles. */
export function sheetGesture(dy: number): SheetGesture {
  if (dy < -SWIPE_PX) return 'open';
  if (dy > SWIPE_PX) return 'close';
  return 'toggle';
}

export function LocationSheet({
  open,
  onOpenChange,
  count,
  form,
  list,
  sheetRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  form: ReactNode;
  list: ReactNode;
  sheetRef?: Ref<HTMLElement>;
}) {
  const startY = useRef<number | null>(null);
  const swallowClick = useRef(false);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    startY.current = e.clientY;
    // A swipe ends off the handle: capture the pointer so pointerup still comes here.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (startY.current === null) return;
    const gesture = sheetGesture(e.clientY - startY.current);
    startY.current = null;
    if (gesture === 'toggle') return; // the click that follows toggles
    swallowClick.current = true;
    onOpenChange(gesture === 'open');
  };
  const onClick = () => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    onOpenChange(!open);
  };

  return (
    <section
      ref={sheetRef}
      aria-label="Locations"
      className={`flex flex-col rounded-t-2xl bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.18)] md:rounded-2xl ${
        open ? 'max-h-[75dvh] md:max-h-[70dvh]' : ''
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="location-list"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={onClick}
        className="flex w-full cursor-grab touch-none flex-col items-center gap-1 rounded-t-2xl px-4 pb-1 pt-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
      >
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-slate-300" />
        <span className="text-xs font-medium text-slate-600">
          {open ? 'Swipe down to hide your locations' : `Swipe up for your locations (${count})`}
        </span>
      </button>
      <div className="px-4 pb-4">{form}</div>
      {open && (
        <div id="location-list" className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 px-4 pb-4 pt-3">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Your locations ({count})</h2>
          {list}
        </div>
      )}
    </section>
  );
}
