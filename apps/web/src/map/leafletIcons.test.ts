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

  it('uses the imported asset URLs even when Leaflet detects a non-empty imagePath', async () => {
    // Cast through unknown because _detectIconPath is a private method not in Leaflet's public types.
    const spy = vi
      .spyOn(
        L.Icon.Default.prototype as unknown as { _detectIconPath: () => string },
        '_detectIconPath',
      )
      .mockReturnValue('/leaflet/dist/images/');
    try {
      L.Icon.Default.imagePath = undefined;
      vi.resetModules();
      await import('./leafletIcons');

      const icon = new L.Icon.Default();
      expect(icon.createIcon().getAttribute('src')).toBe(iconUrl);
      expect(icon.createShadow()?.getAttribute('src')).toBe(shadowUrl);
    } finally {
      spy.mockRestore();
    }
  });
});
