'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SeatGrid } from '../../components/SeatGrid';
import { TheatrePicker } from '../../components/TheatrePicker';
import { getTheatres, type MovieTheatreMapping, type Theatre } from '../../lib/api';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Fetch mapped theatres and reveal a decorative seat preview only after an explicit theatre choice. */
function TheatresPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, isHydrated } = useSession();
  const { selectedMovie, selectedTheatre, chooseTheatre, applyFixedSelection } = useJourney();
  const selectedMovieId = searchParams.get('movieId');
  const effectiveMovie = selectedMovieId
    ? { id: selectedMovieId, title: selectedMovie?.title ?? 'Selected film' }
    : selectedMovie;
  const [theatres, setTheatres] = useState<Theatre[]>([]);
  const [mappings, setMappings] = useState<MovieTheatreMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!effectiveMovie) {
      router.replace('/dashboard');
      return;
    }
    setIsLoading(true);
    setError('');
    getTheatres(token)
      .then(({ theatres: nextTheatres, movieTheatreMappings }) => {
        setTheatres(nextTheatres);
        setMappings(movieTheatreMappings);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Theatre availability could not be loaded.'))
      .finally(() => setIsLoading(false));
  }, [effectiveMovie?.id, isHydrated, router, token]);

  if (!isHydrated) {
    return (
      <main className="discovery-shell">
        <p role="status" aria-live="polite">Restoring your session…</p>
      </main>
    );
  }
  if (!token || !effectiveMovie) return null;

  const availableTheatres = theatres.filter((theatre) => mappings.some(
    (mapping) => mapping.movieId === effectiveMovie.id && mapping.theatreId === theatre.id,
  ));

  return (
    <main className="discovery-shell">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : isLoading ? (
        <p role="status" aria-live="polite">Loading theatres…</p>
      ) : availableTheatres.length === 0 ? (
        <p role="status" aria-live="polite">No theatres are available for this film.</p>
      ) : (
        <>
          <TheatrePicker
            movieId={effectiveMovie.id}
            theatres={theatres}
            mappings={mappings}
            onChoose={chooseTheatre}
          />
          <p>
            <a href="/theatres?movieId=mov_unmapped">
              View availability for an unavailable film
            </a>
          </p>
          {selectedTheatre ? (
            <SeatGrid
              onSelectSeats={() => {
                applyFixedSelection();
                router.push('/seats');
              }}
            />
          ) : null}
        </>
      )}
    </main>
  );
}

export default function TheatresPage() {
  return (
    <Suspense fallback={<main className="discovery-shell"><p role="status" aria-live="polite">Loading theatres…</p></main>}>
      <TheatresPageContent />
    </Suspense>
  );
}
