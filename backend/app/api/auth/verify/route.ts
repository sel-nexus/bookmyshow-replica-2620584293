import { NextResponse } from 'next/server';
import { verifyOtp } from '../../../../modules/identity/service';
import { correlationId, invalidRequest, jsonResponse, optionsResponse, otpVerificationFailed, readJson } from '../../../../modules/shared/http';

/** Verify an OTP, provision its user if needed, and return a signed session token. */
export async function POST(request: Request): Promise<NextResponse> {
  const payload = await readJson(request);
  if (!payload || typeof payload.mobileNumber !== 'string' || typeof payload.otp !== 'string') return invalidRequest();
  const result = await verifyOtp(payload.mobileNumber, payload.otp);
  if (!result) return otpVerificationFailed();
  return jsonResponse({ data: result, correlationId: correlationId() });
}

/** Answer cross-origin preflight requests for OTP verification. */
export function OPTIONS(): NextResponse {
  return optionsResponse();
}
