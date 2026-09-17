import { expect, test } from '@playwright/test';

test('logged-in user completes the live UPI booking journey and sees the persisted confirmation', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await page.getByRole('button', { name: /Sandhya 70mm/ }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'UPI' }).click();
  await expect(page.getByLabel('UPI ID')).toHaveAttribute('placeholder', 'user@upi');
  await page.getByRole('button', { name: 'Pay ₹450.00' }).click();
  await expect(page.getByRole('status')).toHaveText('Processing Payment...');
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('UPI', { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});