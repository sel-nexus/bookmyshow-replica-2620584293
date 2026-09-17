import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase, resetDatabase } from '../db/database';
import { POST as booking } from '../app/api/bookings/route';
import { POST as verify } from '../app/api/auth/verify/route';

let testDirectory = '';

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'booking-'));
  process.env.DATABASE_URL = join(testDirectory, 'booking.sqlite');
  process.env.JWT_SIGNING_SECRET = 'booking-test-secret';
});

afterEach(() => {
  resetDatabase();
  rmSync(testDirectory, { recursive: true, force: true });
});

/** Build a booking request through the actual API boundary. */
function request(body: unknown, token?: string): Request {
  return new Request('http://test.local/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
}

const validPayload = { movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD' };

/** Establish a real authenticated user so the booking FK is exercised. */
async function authenticatedSession(): Promise<{ token: string; userId: string }> {
  const response = await verify(request({ mobileNumber: '+15551234567', otp: '1234' }));
  const body = await response.json();
  return { token: body.data.token, userId: body.data.user.id };
}

describe('booking API', () => {
  it('persists and can requery a committed ticket in isolated file-backed SQLite', async () => {
    const session = await authenticatedSession();
    const response = await booking(request(validPayload, session.token));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ data: { confirmationId: expect.stringMatching(/^BMS-/), ticket: { movie: 'Paradise', theatre: 'Sandhya 70mm', seats: ['A1', 'A2', 'A3'], paymentMethod: 'CARD', totalPricePaise: 45000 } } });
    expect(getDatabase().prepare('SELECT confirmation_id, user_id, seats_json, payment_method, total_price_paise FROM bookings WHERE confirmation_id = ?').get(body.data.confirmationId)).toEqual({ confirmation_id: body.data.confirmationId, user_id: session.userId, seats_json: '["A1","A2","A3"]', payment_method: 'CARD', total_price_paise: 45000 });
  });

  it('rejects requests without a verified JWT', async () => {
    const response = await booking(request(validPayload));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('rejects an unmapped theatre without inserting a booking', async () => {
    const session = await authenticatedSession();
    const response = await booking(request({ ...validPayload, theatreId: 'thr_allu' }, session.token));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'THEATRE_NOT_AVAILABLE_FOR_MOVIE' } });
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });

  it('rejects any non-fixed seat selection or payment method', async () => {
    const session = await authenticatedSession();
    const response = await booking(request({ ...validPayload, seats: ['A1', 'A3', 'A2'], paymentMethod: 'CASH' }, session.token));
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_DEMO_SELECTION' } });
  });
});