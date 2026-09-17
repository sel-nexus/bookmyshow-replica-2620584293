'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SeatGrid } from '../../components/SeatGrid';
import { TheatrePicker } from '../../components/TheatrePicker';
import { getTheatres, type MovieTheatreMapping, type Theatre } from '../../lib/api';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Fetch mapped theatres and reveal a decorative seat preview only after an explicit theatre choice. */
export default function TheatresPage() {
  const router = useRouter();
  const { token } = useSession();
  const { selectedMovie, selectedTheatre, chooseTheatre, applyFixedSelection } = useJourney();
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [mappings, setMappings] = useState<MovieTheatreMapping[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (!selectedMovie) { router.replace('/dashboard'); return; }
    getTheatres(token).then(({ theatres: nextTheatres, movieTheatreMappings }) => { setTheatres(nextTheatres); setMappings(movieTheatreMappings); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Theatre availability could not be loaded.'));
  }, [router, selectedMovie, token]);
  if (!token || !selectedMovie) return null;
  return <main className="discovery-shell">{error ? <p className="form-error" role="alert">{error}</p> : theatres.length === 0 ? <p aria-live="polite">Loading theatres…</p> : <><TheatrePicker movieId={selectedMovie.id} theatres={theatres} mappings={mappings} onChoose={chooseTheatre} />{selectedTheatre ? <SeatGrid onSelectSeats={() => { applyFixedSelection(); router.push('/seats'); }} /> : null}</>}</main>;
}
