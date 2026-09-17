'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Movie, Theatre } from '../lib/api';

/** Represent the user-controlled booking discovery state shared across protected pages. */
interface JourneyContextValue {
  selectedMovie: Movie | null;
  selectedTheatre: Theatre | null;
  seats: string[];
  totalPaise: number;
  paymentMethod: string | null;
  chooseMovie: (movie: Movie) => void;
  chooseTheatre: (theatre: Theatre) => void;
  applyFixedSelection: () => void;
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);

/** Hold discovery selections in memory for the current booking journey. */
export function JourneyProvider({ children }: { children: ReactNode }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [paymentMethod] = useState<string | null>('UPI');
  const value = useMemo(() => ({
    selectedMovie,
    selectedTheatre,
    seats,
    totalPaise,
    paymentMethod,
    chooseMovie: (movie: Movie) => { setSelectedMovie(movie); setSelectedTheatre(null); setSeats([]); setTotalPaise(0); },
    chooseTheatre: (theatre: Theatre) => { setSelectedTheatre(theatre); setSeats([]); setTotalPaise(0); },
    applyFixedSelection: () => { setSeats(['A1', 'A2', 'A3']); setTotalPaise(45000); },
  }), [selectedMovie, selectedTheatre, seats, totalPaise, paymentMethod]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

/** Read the current discovery journey from the nearest provider. */
export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used inside JourneyProvider');
  return context;
}
