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

test('logged-in user completes the live UPI booking journey and sees the server confirmation', async ({ page }) => {
  const consoleErrors = captureBrowserErrors(page);
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
  const bookingResponse = page.waitForResponse((response) => response.url().endsWith('/api/bookings') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay ₹450.00' }).click();
  await expect(page.getByRole('status')).toHaveText('Processing Payment...');
  const booking = await bookingResponse;
  expect(booking.status()).toBe(201);
  const bookingBody = await booking.json() as { data: { confirmationId: string; ticket: { movie: string; theatre: string; paymentMethod: string } } };
  expect(bookingBody.data.ticket).toEqual(expect.objectContaining({ movie: 'Paradise', theatre: 'Sandhya 70mm', paymentMethod: 'UPI' }));
  await expect(page).toHaveURL(`/confirmation?id=${bookingBody.data.confirmationId}`);
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(bookingBody.data.confirmationId)).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  await expect(page.getByText('Sandhya 70mm')).toBeVisible();
  await expect(page.getByText('UPI', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/booking-confirmation.png', fullPage: true });
  expect(consoleErrors).toEqual([]);
});

test('anonymous checkout is guarded before any payment action can be submitted', async ({ page }) => {
  const consoleErrors = captureBrowserErrors(page);
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: /Pay ₹450.00/ })).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('a signed-in user can navigate away and reopen the server-backed confirmation URL', async ({ page }) => {
  const consoleErrors = captureBrowserErrors(page);
  await page.goto('/login');
  await page.getByLabel('Mobile number').fill('+15551234567');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('One-time code').fill('1234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await page.getByRole('button', { name: 'Choose Paradise' }).click();
  await page.getByRole('button', { name: /Sandhya 70mm/ }).click();
  await page.getByRole('button', { name: 'Select Seats' }).click();
  await page.getByRole('button', { name: 'Continue to checkout' }).click();
  await page.getByRole('button', { name: 'Card' }).click();
  const bookingResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/bookings') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Pay ₹450.00' }).click();
  const booking = await bookingResponse;
  const { data } = await booking.json() as { data: { confirmationId: string } };
  await expect(page.getByText(data.confirmationId)).toBeVisible();

  await page.goBack();
  const forwardRetrieval = page.waitForResponse(
    (response) => response.url().endsWith(`/api/bookings/${data.confirmationId}`) && response.request().method() === 'GET',
  );
  await page.goForward();
  expect((await forwardRetrieval).status()).toBe(200);
  await expect(page).toHaveURL(`/confirmation?id=${data.confirmationId}`);

  const reloadRetrieval = page.waitForResponse(
    (response) => response.url().endsWith(`/api/bookings/${data.confirmationId}`) && response.request().method() === 'GET',
  );
  await page.reload();
  expect((await reloadRetrieval).status()).toBe(200);
  await expect(page).toHaveURL(`/confirmation?id=${data.confirmationId}`);
  await expect(page.getByRole('heading', { name: 'Congratulations!' })).toBeVisible();
  await expect(page.getByText(data.confirmationId)).toBeVisible();
  await expect(page.getByText('Paradise')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
