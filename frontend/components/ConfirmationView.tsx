import React from 'react';
import type { BookingConfirmation } from '../lib/api';

/** Render only the persisted confirmation supplied by the booking API response. */
export function ConfirmationView({ confirmation }: { confirmation: BookingConfirmation }) {
  return (
    <main className="discovery-shell confirmation-view">
      <p className="eyebrow">BOOKING CONFIRMED</p>
      <h1>Congratulations!</h1>
      <p className="mobile-summary">Your ticket is confirmed by the booking service.</p>
      <dl className="selection-summary">
        <div>
          <dt>Confirmation ID</dt>
          <dd>{confirmation.confirmationId}</dd>
        </div>
        <div>
          <dt>Film</dt>
          <dd>{confirmation.ticket.movie}</dd>
        </div>
        <div>
          <dt>Theatre</dt>
          <dd>{confirmation.ticket.theatre}</dd>
        </div>
        <div>
          <dt>Seats</dt>
          <dd>{confirmation.ticket.seats.join(', ')}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{confirmation.ticket.paymentMethod}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>₹{(confirmation.ticket.totalPricePaise / 100).toFixed(2)}</dd>
        </div>
      </dl>
    </main>
  );
}
