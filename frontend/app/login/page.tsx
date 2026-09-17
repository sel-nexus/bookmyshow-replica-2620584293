'use client';

import React, { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '../../components/AuthShell';
import { requestOtp } from '../../lib/api';

/** Collect a mobile number and request the next OTP step. */
export default function LoginPage() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Submit the mobile number to the public login API. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await requestOtp(mobileNumber);
      router.push(`/otp?mobile=${encodeURIComponent(mobileNumber)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start verification.');
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthShell title="Sign in with your mobile">
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="mobileNumber">Mobile number</label>
      <input id="mobileNumber" name="mobileNumber" type="tel" autoComplete="tel" inputMode="tel" placeholder="+1 555 123 4567" value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} />
      {error && <p id="login-error" role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? 'Requesting code…' : 'Continue'}</button>
      <p className="form-note" aria-live="polite">We will take you to a secure code check.</p>
    </form>
  </AuthShell>;
}
