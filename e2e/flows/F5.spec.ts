import { signInAs } from '../auth';
import { mapReady } from '../locations';
import { expect, test } from '../test';
import { chooseZip, SAMPLE_ZIP } from '../uploads';
import { startFlow } from './flow';

test('F5: import locations from a ZIP within budget', async ({ page }) => {
  await signInAs(page);
  await page.goto('/map');
  await mapReady(page);

  const flow = startFlow(page, 'F5');
  await flow.step('open Upload', () => page.getByRole('link', { name: 'Upload' }).first().click());
  await flow.step('choose the file', () => chooseZip(page, SAMPLE_ZIP));
  await flow.step('upload', () => page.getByRole('button', { name: 'Upload', exact: true }).click());

  await expect(page.getByRole('status').filter({ hasText: '1 location added' })).toBeVisible();
  await flow.done();
});
