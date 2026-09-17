// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionProvider } from '../providers/SessionProvider';
import LoginPage from '../app/login/page';
import OtpPage from '../app/otp/page';

const push = vi.fn();
let query = new URLSearchParams('mobile=%2B15551234567');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => query,
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); push.mockReset(); query = new URLSearchParams('mobile=%2B15551234567'); });

/** Render a client page with the session context it expects. */
function renderWithSession(element: React.ReactNode): void {
  render(<SessionProvider>{element}</SessionProvider>);
}

describe('identity user interface', () => {
  it('requests an OTP then navigates with the mobile number', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { nextStep: 'OTP' }, correlationId: 'c-1' }), { status: 200 }));
    renderWithSession(<LoginPage />);

    await user.type(screen.getByLabelText('Mobile number'), '+15551234567');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }));
    expect(push).toHaveBeenCalledWith('/otp?mobile=%2B15551234567');
  });

  it('shows the backend error when login fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'INVALID_REQUEST' } }), { status: 400 }));
    renderWithSession(<LoginPage />);

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please check the information and try again.');
  });

  it('verifies the OTP and navigates to the future dashboard', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { token: 'signed-token', user: { id: 'u-1', mobileNumber: '+15551234567', createdAt: '2026-01-01T00:00:00.000Z' } }, correlationId: 'c-2' }), { status: 200 }));
    renderWithSession(<OtpPage />);

    await user.type(screen.getByLabelText('One-time code'), '1234');
    await user.click(screen.getByRole('button', { name: 'Verify & continue' }));

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/verify', expect.objectContaining({ method: 'POST' }));
    expect(push).toHaveBeenCalledWith('/dashboard');
  });
});
