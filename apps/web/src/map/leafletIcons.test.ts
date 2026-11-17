import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { describe, expect, it, vi } from 'vitest';

describe('leafletIcons', () => {
  it('sets iconUrl, iconRetinaUrl, and shadowUrl on L.Icon.Default.prototype.options', async () => {
    await import('./leafletIcons');
    expect(L.Icon.Default.prototype.options.iconUrl).toBe(iconUrl);
    expect(L.Icon.Default.prototype.options.iconRetinaUrl).toBe(iconRetinaUrl);
    expect(L.Icon.Default.prototype.options.shadowUrl).toBe(shadowUrl);
  });

  it('is idempotent when imported twice', async () => {
    await import('./leafletIcons');
    const first = {
      iconUrl: L.Icon.Default.prototype.options.iconUrl,
      iconRetinaUrl: L.Icon.Default.prototype.options.iconRetinaUrl,
      shadowUrl: L.Icon.Default.prototype.options.shadowUrl,
    };

    vi.resetModules();
    await import('./leafletIcons');
    expect(L.Icon.Default.prototype.options.iconUrl).toBe(first.iconUrl);
    expect(L.Icon.Default.prototype.options.iconRetinaUrl).toBe(first.iconRetinaUrl);
    expect(L.Icon.Default.prototype.options.shadowUrl).toBe(first.shadowUrl);
  });
});
