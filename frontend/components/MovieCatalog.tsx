'use client';

import React from 'react';
import type { Movie } from '../lib/api';

interface MovieCatalogProps {
  movies: Movie[];
  onChoose: (movie: Movie) => void;
}

/** Render an actionable catalog of movies returned by the authenticated backend. */
export function MovieCatalog({ movies, onChoose }: MovieCatalogProps) {
  return (
    <section aria-labelledby="movie-catalog-title">
      <p className="eyebrow">NOW SHOWING</p>
      <h1 id="movie-catalog-title">Choose your film</h1>
      <div className="movie-catalog">
        {movies.map((movie) => (
          <article className="movie-card" key={movie.id}>
            <div
              aria-label={`${movie.title} poster placeholder`}
              className={`poster poster-${movie.id}`}
              role="img"
            >
              <span>FEATURE PRESENTATION</span>
            </div>
            <div className="movie-card-copy">
              <h2>{movie.title}</h2>
              <button onClick={() => onChoose(movie)} type="button">
                Choose {movie.title}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
