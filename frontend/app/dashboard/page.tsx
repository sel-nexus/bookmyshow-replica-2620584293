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
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    getMovies(token).then(setMovies).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'The catalog could not be loaded.'));
  }, [router, token]);
  if (!token) return null;
  return <main className="discovery-shell">{error ? <p className="form-error" role="alert">{error}</p> : movies.length === 0 ? <p aria-live="polite">Loading the current program…</p> : <MovieCatalog movies={movies} onChoose={(movie) => { chooseMovie(movie); router.push('/theatres'); }} />}</main>;
}
