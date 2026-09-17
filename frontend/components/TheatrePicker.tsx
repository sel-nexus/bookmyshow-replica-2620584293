'use client';

import React from 'react';
import type { MovieTheatreMapping, Theatre } from '../lib/api';

/** Render theatres related to the currently selected movie, without inventing availability. */
export function TheatrePicker({ movieId, theatres, mappings, onChoose }: { movieId: string; theatres: Theatre[]; mappings: MovieTheatreMapping[]; onChoose: (theatre: Theatre) => void }) {
  const availableTheatreIds = new Set(mappings.filter((mapping) => mapping.movieId === movieId).map((mapping) => mapping.theatreId));
  const availableTheatres = theatres.filter((theatre) => availableTheatreIds.has(theatre.id));
  return <section aria-labelledby="theatre-picker-title">
    <p className="eyebrow">SELECT A THEATRE</p>
    <h1 id="theatre-picker-title">Where will you watch?</h1>
    <div className="theatre-list">
      {availableTheatres.map((theatre) => <button className="theatre-choice" key={theatre.id} onClick={() => onChoose(theatre)} type="button"><strong>{theatre.name}</strong><span>Available for this show</span></button>)}
    </div>
  </section>;
}
