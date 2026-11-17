// R5: locations belong to one user. Alice adds one; Bob, in his own browser context, never sees it.
import { signInAs } from './auth';
import { mapReady } from './locations';
import { expect, test } from './test';

test("user B never sees user A's location, on the map or from the API (R5)", async ({ page, browser }) => {
  const name = `Alice only ${Date.now()}`;
  await signInAs(page, 'alice');
  const created = await page.request.post('/api/locations', {
    data: { name, latitude: 3.1478, longitude: 101.6953 },
  });
  expect(created.status()).toBe(201);

  const bob = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  try {
    const bobPage = await bob.newPage();
    await signInAs(bobPage, 'bob');

    const list = await bobPage.request.get('/api/locations');
    expect(list.status()).toBe(200);
    const body = (await list.json()) as { locations: { name: string }[] };
    expect(body.locations.map((l) => l.name)).not.toContain(name);

    await bobPage.goto('/map');
    await mapReady(bobPage);
    await bobPage.getByRole('button', { name: /Swipe up for your locations/ }).click();
    await expect(bobPage.getByRole('heading', { name: /^Your locations/ })).toBeVisible();
    await expect(bobPage.getByText(name)).toHaveCount(0);
    await expect(bobPage.getByRole('button', { name })).toHaveCount(0);
  } finally {
    await bob.close();
  }

  await page.goto('/map');
  await mapReady(page);
  await expect(page.getByRole('button', { name })).toBeAttached();
});
