import { NextResponse } from 'next/server';

/** Generate a request correlation identifier for response observability. */
export function correlationId(): string {
  return crypto.randomUUID();
}

/** Build the standard invalid-request response shape. */
export function invalidRequest(): NextResponse {
  return NextResponse.json({ error: { code: 'INVALID_REQUEST' }, correlationId: correlationId() }, { status: 400 });
}

/** Build the standard OTP-failure response shape without sensitive data. */
export function otpVerificationFailed(): NextResponse {
  return NextResponse.json({ error: { code: 'OTP_VERIFICATION_FAILED' }, correlationId: correlationId() }, { status: 401 });
}

/** Parse JSON without allowing a malformed body to escape a route handler. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await request.json();
    return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
