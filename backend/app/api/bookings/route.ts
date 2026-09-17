import { NextResponse } from 'next/server';
import { BookingError, createBooking } from '../../../modules/booking/service';
import { authenticateBearer } from '../../../modules/identity/token';
import { correlationId, domainError, jsonResponse, optionsResponse, readJson, unauthenticated } from '../../../modules/shared/http';

/** Persist an authenticated user's validated fixed demo booking. */
export async function POST(request: Request): Promise<NextResponse> {
  let claims;
  try {
    claims = await authenticateBearer(request.headers.get('authorization'));
  } catch {
    return unauthenticated();
  }

  const payload = await readJson(request);
  if (!payload || typeof payload.movieId !== 'string' || typeof payload.theatreId !== 'string') {
    return domainError(422, 'INVALID_DEMO_SELECTION');
  }

  try {
    const confirmation = createBooking(claims.userId, {
      movieId: payload.movieId,
      theatreId: payload.theatreId,
      seats: payload.seats,
      paymentMethod: payload.paymentMethod,
    });
    return jsonResponse({ data: confirmation, correlationId: correlationId() }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingError) {
      const status = error.code === 'MOVIE_OR_THEATRE_NOT_FOUND' ? 404 : error.code === 'THEATRE_NOT_AVAILABLE_FOR_MOVIE' ? 409 : 422;
      return domainError(status, error.code);
    }
    return domainError(500, 'BOOKING_PERSISTENCE_FAILED');
  }
}

/** Answer cross-origin preflight requests for booking creation. */
export function OPTIONS(): NextResponse {
  return optionsResponse();
}