'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutController } from '../../components/CheckoutController';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Guard the checkout journey and render its local dummy payment controller. */
export default function CheckoutPage() {
  const router = useRouter();
  const { token } = useSession();
  const { selectedMovie, selectedTheatre, seats, totalPaise } = useJourney();
  const selectionReady = Boolean(selectedMovie && selectedTheatre && seats.join(',') === 'A1,A2,A3' && totalPaise === 45000);
  useEffect(() => {
    if (!token) router.replace('/login');
    else if (!selectionReady) router.replace('/dashboard');
  }, [router, selectionReady, token]);
  if (!token || !selectionReady) return null;
  return <main className="discovery-shell"><CheckoutController /></main>;
}