import { expect, test } from '@playwright/test';

/** Attach browser error collection so each journey fails on client-side faults. */
function captureBrowserErrors(page: import('@playwright/test').Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('authenticated mobile discovery renders backend movies and only reveals seats after theatre selection', async ({ page }) => {
  const consoleErrors = captureBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time code').fill('1234');
  const verification = page.waitForResponse((response) => response.url().endsWith('/api/auth/verify') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  expect((await verification).status()).toBe(200);

  const movieResponse = page.waitForResponse((response) => response.url().endsWith('/api/movies') && response.request().method() === 'GET');
  await expect(page.getByText('Loading the current program…')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose your film' })).toBeVisible();
  const movies = await movieResponse;
  expect(movies.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Paradise', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/discovery-mobile-movies.png', fullPage: true });

  const theatreResponse = page.waitForResponse((response) => response.url().endsWith('/api/theatres') && response.request().method() === 'GET');
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page.getByText('Loading theatres…')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  const theatres = await theatreResponse;
  expect(theatres.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Pick your view' })).toHaveCount(0);
  await page.getByRole('button', { name: /Sandhya 70mm/ }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  await page.screenshot({ path: 'test-results/discovery-mobile-seats.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('anonymous discovery is guarded and an authenticated unmapped movie ID shows live empty availability', async ({ page }) => {
  const consoleErrors = captureBrowserErrors(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your film' })).toBeVisible();

  const theatresResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/theatres') && response.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  expect((await theatresResponse).status()).toBe(200);
  await expect(page.getByRole('link', { name: 'View availability for an unavailable film' })).toBeVisible();

  await page.getByRole('link', { name: 'View availability for an unavailable film' }).click();
  await expect(page.getByRole('status')).toHaveText('No theatres are available for this film.');
  await expect(page.getByRole('button', { name: /Sandhya 70mm/ })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
