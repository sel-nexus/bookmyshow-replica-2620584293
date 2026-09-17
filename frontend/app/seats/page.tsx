'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Present the fixed discovery selection before the future checkout route is implemented. */
export default function SeatsPage() {
  const router = useRouter();
  const { token } = useSession();
  const { selectedMovie, selectedTheatre, seats, totalPaise, paymentMethod } = useJourney();
  useEffect(() => {
    if (!token) router.replace('/login');
    else if (!selectedMovie || !selectedTheatre || seats.length === 0) router.replace('/dashboard');
  }, [router, seats.length, selectedMovie, selectedTheatre, token]);
  if (!token || !selectedMovie || !selectedTheatre || seats.length === 0) return null;
  return <main className="discovery-shell"><p className="eyebrow">CHECKOUT NEXT</p><h1>Your selection is ready</h1><dl className="selection-summary"><div><dt>Film</dt><dd>{selectedMovie.title}</dd></div><div><dt>Theatre</dt><dd>{selectedTheatre.name}</dd></div><div><dt>Seats</dt><dd>{seats.join(', ')}</dd></div><div><dt>Total</dt><dd>₹{(totalPaise / 100).toFixed(2)}</dd></div><div><dt>Payment</dt><dd>{paymentMethod ?? 'Not selected'}</dd></div></dl><button type="button" onClick={() => router.push('/checkout')}>Continue to checkout</button></main>;
}
