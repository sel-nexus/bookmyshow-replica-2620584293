'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationView } from '../../components/ConfirmationView';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Render an authoritative confirmation or return users to a valid journey entry point. */
export default function ConfirmationPage() {
  const router = useRouter();
  const { token } = useSession();
  const { confirmation } = useJourney();
  useEffect(() => {
    if (!token) router.replace('/login');
    else if (!confirmation) router.replace('/dashboard');
  }, [confirmation, router, token]);
  if (!token || !confirmation) return null;
  return <ConfirmationView confirmation={confirmation} />;
}