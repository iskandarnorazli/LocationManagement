import { signInAs } from '../auth';
import { mapReady } from '../locations';
import { expect, test } from '../test';
import { startFlow } from './flow';

test('F3: add a location with the form within budget', async ({ page }) => {
  const name = `F3 ${Date.now()}`;
  await signInAs(page);
  await page.goto('/map');
  await mapReady(page);

  const flow = startFlow(page, 'F3');
  await flow.step('fill name', () => page.getByLabel('Name').fill(name));
  await flow.step('fill latitude', () => page.getByLabel('Latitude').fill('3.1528'));
  await flow.step('fill longitude', () => page.getByLabel('Longitude').fill('101.7038'));
  await flow.step('add', () => page.getByRole('button', { name: 'Add', exact: true }).click());

  await expect(page.getByRole('button', { name })).toBeAttached();
  await flow.done();
});
