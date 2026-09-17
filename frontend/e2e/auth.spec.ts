import { expect, test } from '@playwright/test';

/** Exercise the real passwordless identity flow against both running tiers. */
test('a visitor completes mobile OTP verification', async ({ page }) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
  page.on('pageerror', (error) => browserErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/otp\?mobile=/);
  await page.getByLabel('One-time code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page).toHaveURL('/dashboard');
  expect(browserErrors).toEqual([]);
});
