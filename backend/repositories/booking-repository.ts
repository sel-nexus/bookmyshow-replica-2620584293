import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getDatabase } from '../db/database';

/** Represent the persisted values needed to create the fixed demo booking. */
export interface NewBooking {
  userId: string;
  movieId: string;
  theatreId: string;
  seats: readonly string[];
  paymentMethod: 'CARD' | 'UPI';
}

/** Represent the resolved ticket details returned after an inserted booking. */
export interface PersistedBooking {
  confirmationId: string;
  movie: string;
  theatre: string;
  seats: ['A1', 'A2', 'A3'];
  paymentMethod: 'CARD' | 'UPI';
  totalPricePaise: 45000;
}

/** Represent an expected lookup result without treating it as a persistence failure. */
export type BookingWriteResult =
  | { kind: 'created'; booking: PersistedBooking }
  | { kind: 'missing-reference' }
  | { kind: 'unavailable-theatre' };

/** Create a sortable confirmation identifier after the transaction can commit. */
function confirmationId(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `BMS-${date}-${crypto.randomUUID()}`;
}

/** Insert a fixed booking atomically after resolving catalog references and their mapping. */
export function insertBooking(booking: NewBooking): BookingWriteResult {
  const database = getDatabase();
  const write = database.transaction((input: NewBooking): BookingWriteResult => {
    const movie = database.prepare('SELECT title FROM movies WHERE id = ?').get(input.movieId) as { title: string } | undefined;
    const theatre = database.prepare('SELECT name FROM theatres WHERE id = ?').get(input.theatreId) as { name: string } | undefined;
    if (!movie || !theatre) return { kind: 'missing-reference' };

    const mapping = database.prepare('SELECT 1 FROM movie_theatres WHERE movie_id = ? AND theatre_id = ?').get(input.movieId, input.theatreId);
    if (!mapping) return { kind: 'unavailable-theatre' };

    const id = crypto.randomUUID();
    const nextConfirmationId = confirmationId();
    database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 45000, ?)
    `).run(id, nextConfirmationId, input.userId, input.movieId, input.theatreId, JSON.stringify(input.seats), input.paymentMethod, new Date().toISOString());

    return {
      kind: 'created',
      booking: {
        confirmationId: nextConfirmationId,
        movie: movie.title,
        theatre: theatre.name,
        seats: ['A1', 'A2', 'A3'],
        paymentMethod: input.paymentMethod,
        totalPricePaise: 45000,
      },
    };
  });
  return write(booking);
}

/** Retrieve a persisted ticket only when its confirmation belongs to the authenticated user. */
export function findOwnedBookingByConfirmationId(userId: string, confirmationId: string): PersistedBooking | undefined {
  const database: Database.Database = getDatabase();
  const row = database.prepare(`
    SELECT bookings.confirmation_id, movies.title AS movie, theatres.name AS theatre,
      bookings.seats_json, bookings.payment_method, bookings.total_price_paise
    FROM bookings
    JOIN movies ON movies.id = bookings.movie_id
    JOIN theatres ON theatres.id = bookings.theatre_id
    WHERE bookings.user_id = ? AND bookings.confirmation_id = ?
  `).get(userId, confirmationId) as {
    confirmation_id: string;
    movie: string;
    theatre: string;
    seats_json: string;
    payment_method: 'CARD' | 'UPI';
    total_price_paise: 45000;
  } | undefined;
  if (!row) return undefined;
  return {
    confirmationId: row.confirmation_id,
    movie: row.movie,
    theatre: row.theatre,
    seats: JSON.parse(row.seats_json) as ['A1', 'A2', 'A3'],
    paymentMethod: row.payment_method,
    totalPricePaise: row.total_price_paise,
  };
}

/** Read a booking row for persistence-focused tests and operational verification. */
export function findBookingByConfirmationId(confirmation: string): Record<string, unknown> | undefined {
  const database: Database.Database = getDatabase();
  return database.prepare('SELECT * FROM bookings WHERE confirmation_id = ?').get(confirmation) as Record<string, unknown> | undefined;
}