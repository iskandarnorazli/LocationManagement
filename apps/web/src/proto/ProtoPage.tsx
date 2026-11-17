import { useParams } from 'react-router';
import type { ProtoState } from './data';
import { LayoutA, LayoutB, LayoutC, LayoutD, viewOf } from './layouts';

const STATES: ProtoState[] = ['markers', 'sheetOpen', 'popup', 'invalid', 'nav', 'afterMap', 'upload', 'success', 'error', 'afterStay'];

/** /proto/:layout/:state, for example /proto/a/markers. Prototype only (#11); never merged. */
export function ProtoPage() {
  const { layout = 'a', state = 'markers' } = useParams();
  const s = STATES.find((x) => x === state) ?? 'markers';
  const v = viewOf(s);
  if (layout === 'b') return <LayoutB v={v} />;
  if (layout === 'c') return <LayoutC v={v} />;
  if (layout === 'd') return <LayoutD v={v} />;
  return <LayoutA v={v} />;
}
