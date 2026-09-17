import { expect, test } from '@playwright/test';

test('authenticated discovery renders backend movies and only reveals seats after theatre selection', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Choose your film' })).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();

  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pick your view' })).toHaveCount(0);
  await page.getByRole('button', { name: /Sandhya 70mm/ }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await expect(page.getByText('A1, A2, A3')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
