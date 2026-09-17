import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase, resetDatabase } from '../db/database';
import { POST as verify } from '../app/api/auth/verify/route';
import { GET as movies } from '../app/api/movies/route';
import { GET as theatres } from '../app/api/theatres/route';
import { POST as booking } from '../app/api/bookings/route';

let testDirectory = '';

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'journey-'));
  process.env.DATABASE_URL = join(testDirectory, 'journey.sqlite');
  process.env.JWT_SIGNING_SECRET = 'journey-test-secret';
});

afterEach(() => {
  resetDatabase();
  rmSync(testDirectory, { recursive: true, force: true });
});

/** Build a JSON route-handler request with optional session credentials. */
function request(url: string, body?: unknown, token?: string): Request {
  return new Request(url, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe('authenticated booking journey integration', () => {
  it('chains OTP verification, authenticated catalog discovery, and persisted booking', async () => {
    const verified = await verify(request('http://test.local/api/auth/verify', { mobileNumber: '+15551234567', otp: '1234' }));
    const session = await verified.json();
    expect(verified.status).toBe(200);

    const catalog = await movies(request('http://test.local/api/movies', undefined, session.data.token));
    expect(catalog.status).toBe(200);
    expect((await catalog.json()).data.movies).toContainEqual({ id: 'mov_paradise', title: 'Paradise' });

    const theatreCatalog = await theatres(request('http://test.local/api/theatres', undefined, session.data.token));
    expect(theatreCatalog.status).toBe(200);
    expect((await theatreCatalog.json()).data.movieTheatreMappings).toContainEqual({ movieId: 'mov_paradise', theatreId: 'thr_sandhya' });

    const created = await booking(request('http://test.local/api/bookings', { movieId: 'mov_paradise', theatreId: 'thr_sandhya', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI' }, session.data.token));
    const confirmation = await created.json();
    expect(created.status).toBe(201);
    expect(confirmation.data.ticket).toMatchObject({ movie: 'Paradise', theatre: 'Sandhya 70mm', paymentMethod: 'UPI', totalPricePaise: 45000 });
    expect(getDatabase().prepare('SELECT seats_json, payment_method FROM bookings WHERE confirmation_id = ?').get(confirmation.data.confirmationId)).toEqual({ seats_json: '["A1","A2","A3"]', payment_method: 'UPI' });
  });

  it('chains authenticated catalog access to a booking validation error without writing a ticket', async () => {
    const verified = await verify(request('http://test.local/api/auth/verify', { mobileNumber: '+15551234567', otp: '1234' }));
    const session = await verified.json();
    expect((await movies(request('http://test.local/api/movies', undefined, session.data.token)).then((response) => response.status)).valueOf()).toBe(200);
    expect((await theatres(request('http://test.local/api/theatres', undefined, session.data.token)).then((response) => response.status)).valueOf()).toBe(200);
    const rejected = await booking(request('http://test.local/api/bookings', { movieId: 'mov_paradise', theatreId: 'thr_allu', seats: ['A1', 'A2', 'A3'], paymentMethod: 'UPI' }, session.data.token));
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ error: { code: 'THEATRE_NOT_AVAILABLE_FOR_MOVIE' } });
    expect(getDatabase().prepare('SELECT COUNT(*) AS count FROM bookings').get()).toEqual({ count: 0 });
  });
});