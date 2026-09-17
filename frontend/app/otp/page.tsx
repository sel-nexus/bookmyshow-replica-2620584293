'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '../../components/AuthShell';
import { verifyOtp } from '../../lib/api';
import { useSession } from '../../providers/SessionProvider';

/** Verify a one-time code and establish the in-memory session. */
export default function OtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useSession();
  const mobileNumber = searchParams.get('mobile') ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(mobileNumber ? '' : 'Return to sign in and enter your mobile number.');
  const [submitting, setSubmitting] = useState(false);

  /** Submit the one-time code and move the signed-in user to the future dashboard. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!mobileNumber) return;
    setError('');
    setSubmitting(true);
    try {
      const session = await verifyOtp(mobileNumber, otp);
      establishSession(session.token, session.user);
      router.push('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify the code.');
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthShell title="Enter your verification code">
    <form onSubmit={handleSubmit} noValidate>
      <p className="mobile-summary">Code for <strong>{mobileNumber || 'your mobile number'}</strong></p>
      <label htmlFor="otp">One-time code</label>
      <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="1234" value={otp} onChange={(event) => setOtp(event.target.value)} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'otp-error' : undefined} />
      {error && <p id="otp-error" role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={submitting || !mobileNumber}>{submitting ? 'Verifying…' : 'Verify & continue'}</button>
      <p className="form-note" aria-live="polite">For this development flow, use code 1234.</p>
    </form>
  </AuthShell>;
}
