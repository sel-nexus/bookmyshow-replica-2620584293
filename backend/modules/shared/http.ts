import { NextResponse } from 'next/server';

const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || 'http://127.0.0.1:3000';

/** Build the CORS headers shared by all backend API responses. */
function corsHeaders(): Headers {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', frontendOrigin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'content-type, authorization, x-correlation-id');
  headers.set('Vary', 'Origin');
  return headers;
}

/** Build a JSON API response with the configured cross-origin policy. */
export function jsonResponse(body: unknown, init?: ResponseInit): NextResponse {
  const headers = corsHeaders();
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return NextResponse.json(body, { ...init, headers });
}

/** Reply to a browser CORS preflight without requiring authentication. */
export function optionsResponse(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/** Generate a request correlation identifier for response observability. */
export function correlationId(): string {
  return crypto.randomUUID();
}

/** Build the standard invalid-request response shape. */
export function invalidRequest(): NextResponse {
  return jsonResponse({ error: { code: 'INVALID_REQUEST' }, correlationId: correlationId() }, { status: 400 });
}

/** Build the standard OTP-failure response shape without sensitive data. */
export function otpVerificationFailed(): NextResponse {
  return jsonResponse({ error: { code: 'OTP_VERIFICATION_FAILED' }, correlationId: correlationId() }, { status: 401 });
}

/** Build the standard response for missing, malformed, or invalid bearer credentials. */
export function unauthenticated(): NextResponse {
  return jsonResponse({ error: { code: 'UNAUTHENTICATED' }, correlationId: correlationId() }, { status: 401 });
}

/** Build a standard JSON error response for an expected domain failure. */
export function domainError(status: number, code: string): NextResponse {
  return jsonResponse({ error: { code }, correlationId: correlationId() }, { status });
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
