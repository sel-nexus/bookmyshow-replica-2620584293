// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckoutController } from '../components/CheckoutController';
import { JourneyProvider, useJourney } from '../providers/JourneyProvider';
import { SessionProvider, useSession } from '../providers/SessionProvider';

const mocks = vi.hoisted(() => ({ push: vi.fn(), createBooking: vi.fn() }));
const { push, createBooking } = mocks;
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock('../lib/api', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/api')>()), createBooking: mocks.createBooking }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

/** Establish a valid fixed selection using the real session and journey provider actions. */
function ReadyCheckout() {
  const { establishSession } = useSession();
  const { chooseMovie, chooseTheatre, applyFixedSelection } = useJourney();
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      establishSession('signed-token', { id: 'usr_01', mobileNumber: '+15551234567', createdAt: '2026-01-01T00:00:00.000Z' });
      chooseMovie({ id: 'mov_paradise', title: 'Paradise' });
      chooseTheatre({ id: 'thr_sandhya', name: 'Sandhya 70mm' });
      applyFixedSelection();
    }
  }, [applyFixedSelection, chooseMovie, chooseTheatre, establishSession]);
  return <CheckoutController />;
}

/** Render checkout within its actual provider contract. */
async function renderCheckout(): Promise<void> {
  render(<SessionProvider><JourneyProvider><ReadyCheckout /></JourneyProvider></SessionProvider>);
  await act(async () => { await Promise.resolve(); });
}

describe('checkout user interface', () => {
  it('renders local Card and UPI payment fields without making credentials part of the booking payload', async () => {
    vi.useFakeTimers();
    createBooking.mockResolvedValue({ confirmationId: 'BMS-1', ticket: { movie: 'Paradise', theatre: 'Sandhya 70mm', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPricePaise: 45000 } });
    await renderCheckout();
    fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Expiry Date')).toBeInTheDocument();
    expect(screen.getByLabelText('CVV')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Card Number'), { target: { value: '4111111111111111' } });
    fireEvent.change(screen.getByLabelText('Expiry Date'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByLabelText('CVV'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₹450.00' }));
    expect(screen.getByRole('status')).toHaveTextContent('Processing Payment...');
    expect(createBooking).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1999); });
    expect(createBooking).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(createBooking).toHaveBeenCalledWith('signed-token', { movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD' });
    expect(JSON.stringify(createBooking.mock.calls[0][1])).not.toContain('4111111111111111');
    expect(JSON.stringify(createBooking.mock.calls[0][1])).not.toContain('12/30');
    expect(JSON.stringify(createBooking.mock.calls[0][1])).not.toContain('123');
  });

  it('shows the UPI placeholder and disables duplicate Pay activation while processing', async () => {
    vi.useFakeTimers();
    createBooking.mockResolvedValue({ confirmationId: 'BMS-2', ticket: { movie: 'Paradise', theatre: 'Sandhya 70mm', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI', totalPricePaise: 45000 } });
    await renderCheckout();
    fireEvent.click(screen.getByRole('button', { name: 'UPI' }));
    expect(screen.getByLabelText('UPI ID')).toHaveAttribute('placeholder', 'user@upi');
    const pay = screen.getByRole('button', { name: 'Pay ₹450.00' });
    fireEvent.click(pay);
    expect(screen.getByRole('button', { name: 'Processing Payment...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Processing Payment...' }));
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith('signed-token', expect.objectContaining({ paymentMethod: 'UPI' }));
  });
});