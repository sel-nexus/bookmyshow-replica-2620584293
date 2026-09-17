'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmationView } from '../../components/ConfirmationView';
import { getBookingConfirmation, type BookingConfirmation } from '../../lib/api';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Render the immediate booking response or retrieve its durable record by confirmation ID. */
function ConfirmationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isHydrated } = useSession();
  const { confirmation } = useJourney();
  const confirmationId = searchParams.get('id');
  const [loadedConfirmation, setLoadedConfirmation] = useState<BookingConfirmation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!confirmationId) {
      router.replace('/dashboard');
      return;
    }
    if (confirmation?.confirmationId === confirmationId) {
      setLoadedConfirmation(confirmation);
    } else {
      setLoadedConfirmation(null);
    }

    let cancelled = false;
    setError('');
    getBookingConfirmation(token, confirmationId)
      .then((nextConfirmation) => {
        if (!cancelled) setLoadedConfirmation(nextConfirmation);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'We could not load this booking confirmation.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [confirmation, confirmationId, isHydrated, router, token]);

  if (!isHydrated) {
    return (
      <main className="discovery-shell">
        <p role="status" aria-live="polite">Restoring your session…</p>
      </main>
    );
  }
  if (!token || !confirmationId) return null;
  if (error) {
    return (
      <main className="discovery-shell">
        <p className="form-error" role="alert">
          {error}
        </p>
      </main>
    );
  }
  if (!loadedConfirmation) {
    return (
      <main className="discovery-shell">
        <p role="status" aria-live="polite">Loading your booking confirmation…</p>
      </main>
    );
  }
  return <ConfirmationView confirmation={loadedConfirmation} />;
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<main className="discovery-shell"><p role="status" aria-live="polite">Loading your booking confirmation…</p></main>}>
      <ConfirmationPageContent />
    </Suspense>
  );
}