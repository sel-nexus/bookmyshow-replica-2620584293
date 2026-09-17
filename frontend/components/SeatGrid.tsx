'use client';

import React from 'react';

/** Render a decorative seat preview once a theatre selection confirms availability. */
export function SeatGrid({ onSelectSeats }: { onSelectSeats: () => void }) {
  const seats = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5'];
  return <section aria-labelledby="seat-grid-title" className="seat-section">
    <p className="eyebrow">YOUR SEATS</p>
    <h2 id="seat-grid-title">Pick your view</h2>
    <div aria-label="Decorative seat availability" className="seat-grid" role="img">{seats.map((seat) => <span className={['A1', 'A2', 'A3'].includes(seat) ? 'seat selected' : 'seat'} key={seat}>{seat}</span>)}</div>
    <button onClick={onSelectSeats} type="button">Select Seats</button>
  </section>;
}
