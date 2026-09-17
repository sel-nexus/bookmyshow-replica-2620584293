'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBooking, type PaymentMethod } from '../lib/api';
import { useJourney } from '../providers/JourneyProvider';
import { useSession } from '../providers/SessionProvider';

const PROCESSING_DELAY_MS = 2000;

/** Render dummy payment choices and submit only the fixed authoritative booking data. */
export function CheckoutController() {
  const router = useRouter();
  const { token } = useSession();
  const { selectedMovie, selectedTheatre, seats, totalPaise, paymentMethod, setPaymentMethod, setConfirmation, clearJourney } = useJourney();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReady = Boolean(token && selectedMovie && selectedTheatre && seats.join(',') === 'A1,A2,A3' && totalPaise === 45000);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** Select a presentation-only payment method without retaining its entered credentials. */
  function selectMethod(method: PaymentMethod): void {
    setError(null);
    setPaymentMethod(method);
  }

  /** Delay the network call exactly two seconds and navigate only after a real server confirmation. */
  function pay(): void {
    if (isProcessing) return;
    if (!isReady || !paymentMethod || !token || !selectedMovie || !selectedTheatre) {
      setError('Choose a payment method before paying.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    timer.current = setTimeout(() => {
      createBooking(token, { movieId: selectedMovie.id, theatreId: selectedTheatre.id, seats, paymentMethod })
        .then((confirmation) => {
          setConfirmation(confirmation);
          clearJourney();
          router.push('/confirmation');
        })
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'We could not create your booking. Please try again.');
          setIsProcessing(false);
        });
    }, PROCESSING_DELAY_MS);
  }

  if (!isReady) return null;
  return <section className="checkout-panel" aria-labelledby="checkout-heading">
    <p className="eyebrow">DEMO CHECKOUT</p><h1 id="checkout-heading">Choose how to pay</h1>
    <p className="mobile-summary">Payment details are only a visual demo and are never sent or stored.</p>
    <div className="payment-methods" role="group" aria-label="Payment method">
      <button type="button" className={paymentMethod === 'CARD' ? 'payment-choice active' : 'payment-choice'} onClick={() => selectMethod('CARD')} disabled={isProcessing}>Card</button>
      <button type="button" className={paymentMethod === 'UPI' ? 'payment-choice active' : 'payment-choice'} onClick={() => selectMethod('UPI')} disabled={isProcessing}>UPI</button>
    </div>
    {paymentMethod === 'CARD' && <div className="payment-fields"><label htmlFor="card-number">Card Number</label><input id="card-number" name="card-number" inputMode="numeric" autoComplete="cc-number" /><div className="payment-field-row"><div><label htmlFor="expiry-date">Expiry Date</label><input id="expiry-date" name="expiry-date" autoComplete="cc-exp" /></div><div><label htmlFor="cvv">CVV</label><input id="cvv" name="cvv" inputMode="numeric" autoComplete="cc-csc" /></div></div></div>}
    {paymentMethod === 'UPI' && <div className="payment-fields"><label htmlFor="upi-id">UPI ID</label><input id="upi-id" name="upi-id" placeholder="user@upi" autoComplete="off" /></div>}
    {error && <p id="checkout-error" className="form-error" role="alert">{error}</p>}
    {isProcessing && <p role="status" aria-live="polite" className="processing-status">Processing Payment...</p>}
    <button type="button" onClick={pay} disabled={isProcessing} aria-describedby={error ? 'checkout-error' : undefined}>{isProcessing ? 'Processing Payment...' : 'Pay ₹450.00'}</button>
  </section>;
}