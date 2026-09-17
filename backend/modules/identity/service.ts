import { findOrCreateUser, type User } from '../../repositories/user-repository';
import { createAccessToken } from './token';

/** Represent the successful OTP verification result. */
export interface VerificationResult {
  token: string;
  user: User;
}

/** Validate a mobile number supplied at the public authentication boundary. */
export function normalizeMobileNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(/[\s()-]/g, '');
  return /^\+?[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

/** Start the passwordless login flow after validating its mobile number. */
export function requestLogin(mobileNumber: unknown): { nextStep: 'OTP' } | null {
  return normalizeMobileNumber(mobileNumber) ? { nextStep: 'OTP' } : null;
}

/** Verify the fixed development OTP and issue identity material on success. */
export async function verifyOtp(mobileNumber: unknown, otp: unknown): Promise<VerificationResult | null> {
  const normalized = normalizeMobileNumber(mobileNumber);
  if (!normalized || otp !== '1234') return null;
  const user = findOrCreateUser(normalized);
  const token = await createAccessToken({ userId: user.id, mobileNumber: user.mobileNumber });
  return { token, user };
}
