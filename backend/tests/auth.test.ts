import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase, resetDatabase } from '../db/database';
import { verifyAccessToken } from '../modules/identity/token';
import { POST as login } from '../app/api/auth/login/route';
import { POST as verify } from '../app/api/auth/verify/route';
import { GET as health } from '../app/api/health/route';

let testDirectory = '';
let testDatabase = '';

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'identity-auth-'));
  testDatabase = join(testDirectory, 'auth.sqlite');
  process.env.DATABASE_URL = testDatabase;
  process.env.JWT_SIGNING_SECRET = 'test-signing-secret';
});

/** Create a JSON request matching the public API boundary. */
function request(body: unknown): Request {
  return new Request('http://test.local/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Build deliberately malformed JSON requests at the route boundary. */
function malformedRequest(): Request {
  return new Request('http://test.local/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
}

afterEach(() => {
  resetDatabase();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe('identity API', () => {
  it('starts OTP login and rejects missing, wrongly typed, and malformed mobile numbers', async () => {
    const accepted = await login(request({ mobileNumber: '+15551234567' }));
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({ data: { nextStep: 'OTP' }, correlationId: expect.any(String) });

    for (const body of [{}, { mobileNumber: 15551234567 }, { mobileNumber: 'not-a-number' }]) {
      const rejected = await login(request(body));
      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    }
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it('rejects malformed JSON and each missing, invalid, or wrongly typed identity field without creating users', async () => {
    for (const route of [login, verify]) {
      const malformed = await route(malformedRequest());
      expect(malformed.status).toBe(400);
      expect(await malformed.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    }

    for (const body of [{}, { mobileNumber: '' }, { mobileNumber: 15551234567 }, { mobileNumber: '+15551234567', otp: 1234 }, { otp: '1234' }]) {
      const response = await verify(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
    }
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it('issues a signed token and reuses the SQLite user for the valid OTP', async () => {
    const first = await verify(request({ mobileNumber: '+15551234567', otp: '1234' }));
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.data.user.mobileNumber).toBe('+15551234567');
    await expect(verifyAccessToken(firstBody.data.token)).resolves.toMatchObject({ mobileNumber: '+15551234567' });

    const second = await verify(request({ mobileNumber: '+15551234567', otp: '1234' }));
    const secondBody = await second.json();
    expect(secondBody.data.user.id).toBe(firstBody.data.user.id);
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 1 });
  });

  it('rejects invalid OTPs without issuing a token and exposes database health', async () => {
    const rejected = await verify(request({ mobileNumber: '+15551234567', otp: '0000' }));
    expect(rejected.status).toBe(401);
    const rejectedBody = await rejected.json();
    expect(rejectedBody).toMatchObject({ error: { code: 'OTP_VERIFICATION_FAILED' } });
    expect(rejectedBody.data).toBeUndefined();

    const malformed = await verify(request({ mobileNumber: '+15551234567' }));
    expect(malformed.status).toBe(400);
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
    const healthy = await health();
    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toEqual({ data: { status: 'ok' } });
  });
});
