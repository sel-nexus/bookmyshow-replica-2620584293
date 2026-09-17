import { findOwnedBookingByConfirmationId, insertBooking, type PersistedBooking } from '../../repositories/booking-repository';

/** Represent the only accepted booking request shape. */
export interface CreateBookingRequest {
  movieId: string;
  theatreId: string;
  seats: unknown;
  paymentMethod: unknown;
}

/** Represent the authoritative confirmation returned to the route boundary. */
export interface BookingConfirmation {
  confirmationId: string;
  ticket: {
    movie: string;
    theatre: string;
    seats: ['A1', 'A2', 'A3'];
    paymentMethod: 'CARD' | 'UPI';
    totalPricePaise: 45000;
  };
}

/** Describe known booking errors that can be safely exposed through the API. */
export class BookingError extends Error {
  constructor(public readonly code: 'MOVIE_OR_THEATRE_NOT_FOUND' | 'THEATRE_NOT_AVAILABLE_FOR_MOVIE' | 'INVALID_DEMO_SELECTION') {
    super(code);
  }
}

/** Confirm that a seat payload is exactly the ordered deterministic demo selection. */
function hasFixedSeats(seats: unknown): seats is ['A1', 'A2', 'A3'] {
  return Array.isArray(seats) && seats.length === 3 && seats[0] === 'A1' && seats[1] === 'A2' && seats[2] === 'A3';
}

/** Create a transactional booking using identity derived by the verified JWT route boundary. */
export function createBooking(userId: string, request: CreateBookingRequest): BookingConfirmation {
  if (!hasFixedSeats(request.seats) || (request.paymentMethod !== 'CARD' && request.paymentMethod !== 'UPI')) {
    throw new BookingError('INVALID_DEMO_SELECTION');
  }

  const result = insertBooking({
    userId,
    movieId: request.movieId,
    theatreId: request.theatreId,
    seats: request.seats,
    paymentMethod: request.paymentMethod,
  });
  if (result.kind === 'missing-reference') throw new BookingError('MOVIE_OR_THEATRE_NOT_FOUND');
  if (result.kind === 'unavailable-theatre') throw new BookingError('THEATRE_NOT_AVAILABLE_FOR_MOVIE');
  return toConfirmation(result.booking);
}

/** Retrieve an authoritative confirmation only when it belongs to the requesting user. */
export function getBookingConfirmation(userId: string, confirmationId: string): BookingConfirmation | undefined {
  const booking = findOwnedBookingByConfirmationId(userId, confirmationId);
  return booking ? toConfirmation(booking) : undefined;
}

/** Project a committed database record into the public confirmation contract. */
function toConfirmation(booking: PersistedBooking): BookingConfirmation {
  return {
    confirmationId: booking.confirmationId,
    ticket: {
      movie: booking.movie,
      theatre: booking.theatre,
      seats: booking.seats,
      paymentMethod: booking.paymentMethod,
      totalPricePaise: booking.totalPricePaise,
    },
  };
}