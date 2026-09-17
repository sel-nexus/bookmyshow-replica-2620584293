'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { BookingConfirmation, Movie, PaymentMethod, Theatre } from '../lib/api';

/** Represent the user-controlled booking discovery state shared across protected pages. */
interface JourneyContextValue {
  selectedMovie: Movie | null;
  selectedTheatre: Theatre | null;
  seats: string[];
  totalPaise: number;
  paymentMethod: PaymentMethod | null;
  confirmation: BookingConfirmation | null;
  chooseMovie: (movie: Movie) => void;
  chooseTheatre: (theatre: Theatre) => void;
  applyFixedSelection: () => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setConfirmation: (confirmation: BookingConfirmation) => void;
  clearJourney: () => void;
}

const JourneyContext = createContext<JourneyContextValue | undefined>(undefined);

/** Hold discovery selections in memory for the current booking journey. */
export function JourneyProvider({ children }: { children: ReactNode }) {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedTheatre, setSelectedTheatre] = useState<Theatre | null>(null);
  const [seats, setSeats] = useState<string[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const value = useMemo(() => ({
    confirmation,
    selectedMovie,
    selectedTheatre,
    seats,
    totalPaise,
    paymentMethod,
    chooseMovie: (movie: Movie) => { setSelectedMovie(movie); setSelectedTheatre(null); setSeats([]); setTotalPaise(0); },
    chooseTheatre: (theatre: Theatre) => { setSelectedTheatre(theatre); setSeats([]); setTotalPaise(0); },
    applyFixedSelection: () => { setSeats(['A1', 'A2', 'A3']); setTotalPaise(45000); },
    setPaymentMethod,
    setConfirmation,
    clearJourney: () => { setSelectedMovie(null); setSelectedTheatre(null); setSeats([]); setTotalPaise(0); setPaymentMethod(null); },
  }), [confirmation, selectedMovie, selectedTheatre, seats, totalPaise, paymentMethod]);
  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

/** Read the current discovery journey from the nearest provider. */
export function useJourney(): JourneyContextValue {
  const context = useContext(JourneyContext);
  if (!context) throw new Error('useJourney must be used inside JourneyProvider');
  return context;
}
