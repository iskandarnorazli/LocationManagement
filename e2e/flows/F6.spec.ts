import { signInAs } from '../auth';
import { expect, test } from '../test';
import { startFlow } from './flow';

test('F6: sign out within budget', async ({ page }) => {
  await signInAs(page);

  await page.goto('/map');
  await page.getByRole('heading', { name: 'Map' }).waitFor();

  const flow = startFlow(page, 'F6');
  await flow.step('log out', () => page.getByRole('button', { name: 'Log out' }).click());

  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await flow.done();
});
