import { expect, test } from '@playwright/test';

/** Attach browser error collection so each journey fails on client-side faults. */
function captureBrowserErrors(
  page: import('@playwright/test').Page,
  isExpectedConsoleError: (message: string) => boolean = () => false,
): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !isExpectedConsoleError(message.text())) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test('unauthenticated protected navigation redirects to login', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
  expect(browserErrors).toEqual([]);
});

test('a visitor sees the backend OTP failure and can complete mobile verification', async ({ page }) => {
  const browserErrors = captureBrowserErrors(
    page,
    (message) => message.includes('Failed to load resource') && message.includes('401'),
  );
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  const loginResponse = page.waitForResponse((response) => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { name: 'Requesting code…' })).toBeVisible();
  expect((await loginResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/otp\?mobile=/);

  await page.getByLabel('One-time code').fill('0000');
  const failedVerification = page.waitForResponse((response) => response.url().endsWith('/api/auth/verify') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('button', { name: 'Verifying…' })).toBeVisible();
  expect((await failedVerification).status()).toBe(401);
  await expect(page.locator('#otp-error')).toHaveText('That code is not valid. Please try again.');

  await page.getByLabel('One-time code').fill('1234');
  const verified = page.waitForResponse((response) => response.url().endsWith('/api/auth/verify') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  expect((await verified).status()).toBe(200);
  await expect(page).toHaveURL('/dashboard');
  expect(browserErrors).toEqual([]);
});
