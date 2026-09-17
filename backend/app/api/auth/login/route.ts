import { NextResponse } from 'next/server';
import { requestLogin } from '../../../../modules/identity/service';
import { correlationId, invalidRequest, readJson } from '../../../../modules/shared/http';

/** Validate a mobile number and begin the passwordless OTP flow. */
export async function POST(request: Request): Promise<NextResponse> {
  const payload = await readJson(request);
  const result = payload ? requestLogin(payload.mobileNumber) : null;
  if (!result) return invalidRequest();
  return NextResponse.json({ data: result, correlationId: correlationId() });
}
