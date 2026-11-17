import { signInAs } from '../auth';
import { KL_SAVED, mapReady, stubLocations } from '../locations';
import { expect, test } from '../test';
import { startFlow } from './flow';

test("F4: see a location's name within budget", async ({ page }) => {
  await signInAs(page);
  await stubLocations(page, KL_SAVED);
  await page.goto('/map');
  await mapReady(page, 3);

  const flow = startFlow(page, 'F4');
  await flow.step('click the marker', () => page.getByRole('button', { name: 'Suria KLCC' }).click());

  await expect(page.locator('.leaflet-popup').getByText('Suria KLCC')).toBeVisible();
  await flow.done();
});
