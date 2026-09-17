'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MovieCatalog } from '../../components/MovieCatalog';
import { getMovies, type Movie } from '../../lib/api';
import { useJourney } from '../../providers/JourneyProvider';
import { useSession } from '../../providers/SessionProvider';

/** Fetch and display the authenticated movie catalog as the first booking step. */
export default function DashboardPage() {
  const router = useRouter();
  const { token } = useSession();
  const { chooseMovie } = useJourney();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    setIsLoading(true);
    setError('');
    getMovies(token)
      .then(setMovies)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The catalog could not be loaded.'))
      .finally(() => setIsLoading(false));
  }, [router, token]);

  if (!token) return null;

  return (
    <main className="discovery-shell">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : isLoading ? (
        <p role="status" aria-live="polite">Loading the current program…</p>
      ) : movies.length === 0 ? (
        <p role="status" aria-live="polite">No films are currently available.</p>
      ) : (
        <MovieCatalog
          movies={movies}
          onChoose={(movie) => {
            chooseMovie(movie);
            router.push('/theatres');
          }}
        />
      )}
    </main>
  );
}
