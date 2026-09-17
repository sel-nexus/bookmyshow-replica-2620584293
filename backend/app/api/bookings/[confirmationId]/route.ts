import { NextResponse } from 'next/server';
import { getBookingConfirmation } from '../../../../modules/booking/service';
import { authenticateBearer } from '../../../../modules/identity/token';
import { correlationId, domainError, jsonResponse, optionsResponse, unauthenticated } from '../../../../modules/shared/http';

/** Return a persisted confirmation only to the JWT-authenticated booking owner. */
export async function GET(request: Request, context: { params: { confirmationId: string } }): Promise<NextResponse> {
  let claims;
  try {
    claims = await authenticateBearer(request.headers.get('authorization'));
  } catch {
    return unauthenticated();
  }

  const confirmation = getBookingConfirmation(claims.userId, context.params.confirmationId);
  if (!confirmation) return domainError(404, 'BOOKING_NOT_FOUND');
  return jsonResponse({ data: confirmation, correlationId: correlationId() });
}

/** Answer cross-origin preflight requests without exposing protected data. */
export function OPTIONS(): NextResponse {
  return optionsResponse();
}
