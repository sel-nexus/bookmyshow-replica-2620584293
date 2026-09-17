import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase, resetDatabase } from '../db/database';
import { GET as confirmation } from '../app/api/bookings/[confirmationId]/route';
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
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Send malformed JSON without bypassing the route boundary. */
function malformedRequest(token: string): Request {
  return new Request('http://test.local/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: '{',
  });
}

/** Build an authenticated confirmation lookup request at the route boundary. */
function confirmationRequest(confirmationId: string, token?: string): Request {
  return new Request(`http://test.local/api/bookings/${confirmationId}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

const validPayload = {
  movieId: 'mov_paradise',
  theatreId: 'thr_sandhya',
  seats: ['A1', 'A2', 'A3'],
  paymentMethod: 'CARD',
};

/** Establish a real authenticated user so the booking FK is exercised. */
async function authenticatedSession(): Promise<{ token: string; userId: string }> {
  const response = await verify(request({ mobileNumber: '+15551234567', otp: '1234' }));
  const body = await response.json();
  return { token: body.data.token, userId: body.data.user.id };
}

/** Return observable booking and catalog row counts after a rejected request. */
function rowCounts(): { bookings: number; movies: number; theatres: number; mappings: number } {
  const database = getDatabase();
  return {
    bookings: (database.prepare('SELECT COUNT(*) AS count FROM bookings').get() as { count: number }).count,
    movies: (database.prepare('SELECT COUNT(*) AS count FROM movies').get() as { count: number }).count,
    theatres: (database.prepare('SELECT COUNT(*) AS count FROM theatres').get() as { count: number }).count,
    mappings: (database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get() as { count: number }).count,
  };
}

describe('booking API', () => {
  it('persists and can requery a committed ticket in isolated file-backed SQLite', async () => {
    const session = await authenticatedSession();
    const response = await booking(request(validPayload, session.token));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      data: {
        confirmationId: expect.stringMatching(/^BMS-/),
        ticket: {
          movie: 'Paradise',
          theatre: 'Sandhya 70mm',
          seats: ['A1', 'A2', 'A3'],
          paymentMethod: 'CARD',
          totalPricePaise: 45000,
        },
      },
    });
    expect(getDatabase().prepare('SELECT confirmation_id, user_id, seats_json, payment_method, total_price_paise FROM bookings WHERE confirmation_id = ?').get(body.data.confirmationId)).toEqual({
      confirmation_id: body.data.confirmationId,
      user_id: session.userId,
      seats_json: '["A1","A2","A3"]',
      payment_method: 'CARD',
      total_price_paise: 45000,
    });
  });

  it('retrieves a persisted confirmation only for its JWT owner and returns documented errors otherwise', async () => {
    const owner = await authenticatedSession();
    const created = await booking(request(validPayload, owner.token));
    const createdBody = await created.json();
    const confirmationId = createdBody.data.confirmationId as string;

    const retrieved = await confirmation(
      confirmationRequest(confirmationId, owner.token),
      { params: { confirmationId } },
    );
    expect(retrieved.status).toBe(200);
    expect(await retrieved.json()).toMatchObject({
      data: {
        confirmationId,
        ticket: {
          movie: 'Paradise',
          theatre: 'Sandhya 70mm',
          seats: ['A1', 'A2', 'A3'],
          paymentMethod: 'CARD',
          totalPricePaise: 45000,
        },
      },
      correlationId: expect.any(String),
    });

    const anonymous = await confirmation(confirmationRequest(confirmationId), { params: { confirmationId } });
    expect(anonymous.status).toBe(401);
    expect(await anonymous.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });

    const otherUser = await verify(request({ mobileNumber: '+15557654321', otp: '1234' }));
    const otherToken = (await otherUser.json()).data.token as string;
    const unowned = await confirmation(confirmationRequest(confirmationId, otherToken), { params: { confirmationId } });
    expect(unowned.status).toBe(404);
    expect(await unowned.json()).toMatchObject({ error: { code: 'BOOKING_NOT_FOUND' } });

    const missing = await confirmation(confirmationRequest('BMS-missing', owner.token), { params: { confirmationId: 'BMS-missing' } });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({ error: { code: 'BOOKING_NOT_FOUND' } });
  });

  it('rejects requests without a verified JWT', async () => {
    const response = await booking(request(validPayload));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });

  it('rejects malformed JSON and isolated missing or wrongly typed identifiers without writes', async () => {
    const session = await authenticatedSession();
    const invalidBodies = [
      undefined,
      { theatreId: 'thr_sandhya' },
      { movieId: 'mov_paradise' },
      { ...validPayload, movieId: 42 },
      { ...validPayload, theatreId: false },
    ];
    const malformed = await booking(malformedRequest(session.token));
    expect(malformed.status).toBe(422);
    expect(await malformed.json()).toMatchObject({ error: { code: 'INVALID_DEMO_SELECTION' } });
    for (const body of invalidBodies) {
      const response = await booking(request(body, session.token));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_DEMO_SELECTION' } });
    }
    expect(rowCounts().bookings).toBe(0);
  });

  it('rejects separately missing seats and payment methods with documented validation errors and no booking rows', async () => {
    const session = await authenticatedSession();
    for (const body of [
      { movieId: validPayload.movieId, theatreId: validPayload.theatreId, paymentMethod: validPayload.paymentMethod },
      { movieId: validPayload.movieId, theatreId: validPayload.theatreId, seats: validPayload.seats },
    ]) {
      const response = await booking(request(body, session.token));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_DEMO_SELECTION' } });
      expect(rowCounts().bookings).toBe(0);
    }
  });

  it('maps empty identifier boundaries to missing references and rejects invalid fixed selections without writes', async () => {
    const session = await authenticatedSession();
    for (const body of [{ ...validPayload, movieId: '' }, { ...validPayload, theatreId: '' }]) {
      const response = await booking(request(body, session.token));
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'MOVIE_OR_THEATRE_NOT_FOUND' } });
    }
    const invalidBodies = [
      { ...validPayload, seats: [] },
      { ...validPayload, seats: ['A1', 'A2'] },
      { ...validPayload, seats: ['A1', 'A2', 'A3', 'A4'] },
      { ...validPayload, seats: 'A1,A2,A3' },
      { ...validPayload, seats: ['A1', 'A3', 'A2'] },
      { ...validPayload, paymentMethod: '' },
      { ...validPayload, paymentMethod: 'CASH' },
      { ...validPayload, paymentMethod: ['CARD'] },
    ];
    for (const body of invalidBodies) {
      const response = await booking(request(body, session.token));
      expect(response.status).toBe(422);
      expect(await response.json()).toMatchObject({ error: { code: 'INVALID_DEMO_SELECTION' } });
    }
    expect(rowCounts().bookings).toBe(0);
  });

  it('maps unknown movie and theatre references to 404 with no booking write', async () => {
    const session = await authenticatedSession();
    for (const payload of [
      { ...validPayload, movieId: 'mov_unknown' },
      { ...validPayload, theatreId: 'thr_unknown' },
    ]) {
      const response = await booking(request(payload, session.token));
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'MOVIE_OR_THEATRE_NOT_FOUND' } });
    }
    expect(rowCounts().bookings).toBe(0);
  });

  it('maps unmapped theatres to the documented conflict without inserting a booking', async () => {
    const session = await authenticatedSession();
    const response = await booking(request({ ...validPayload, theatreId: 'thr_allu' }, session.token));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'THEATRE_NOT_AVAILABLE_FOR_MOVIE' } });
    expect(rowCounts().bookings).toBe(0);
  });

  it('treats SQL and XSS-like identifiers as values, returns 404, and leaves all tables unchanged', async () => {
    const session = await authenticatedSession();
    const before = rowCounts();
    for (const payload of [
      { ...validPayload, movieId: "mov_paradise' OR 1=1 --" },
      { ...validPayload, theatreId: '<script>alert(1)</script>' },
    ]) {
      const response = await booking(request(payload, session.token));
      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({ error: { code: 'MOVIE_OR_THEATRE_NOT_FOUND' } });
    }
    expect(rowCounts()).toEqual(before);
    expect(getDatabase().prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'bookings'").get()).toEqual({ name: 'bookings' });
  });

  it('enforces booking NOT NULL, FK, CHECK, and unique constraints with failed inserts rolled back', async () => {
    const session = await authenticatedSession();
    const database = getDatabase();
    const before = rowCounts();
    expect(() => database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('bad-null', 'BMS-null', ?, 'mov_paradise', 'thr_sandhya', '["A1"]', 'CARD', 45000, 'now')
    `).run(null)).toThrow(/NOT NULL/);
    expect(() => database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('bad-fk', 'BMS-fk', 'usr_missing', 'mov_paradise', 'thr_sandhya', '["A1"]', 'CARD', 45000, 'now')
    `).run()).toThrow(/FOREIGN KEY/);
    expect(() => database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('bad-check', 'BMS-check', ?, 'mov_paradise', 'thr_sandhya', '["A1"]', 'CASH', 45000, 'now')
    `).run(session.userId)).toThrow(/CHECK/);
    expect(() => database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('bad-total', 'BMS-total', ?, 'mov_paradise', 'thr_sandhya', '["A1"]', 'CARD', 1, 'now')
    `).run(session.userId)).toThrow(/CHECK/);
    database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('unique-one', 'BMS-unique', ?, 'mov_paradise', 'thr_sandhya', '["A1","A2","A3"]', 'CARD', 45000, 'now')
    `).run(session.userId);
    expect(() => database.prepare(`
      INSERT INTO bookings (id, confirmation_id, user_id, movie_id, theatre_id, seats_json, payment_method, total_price_paise, created_at)
      VALUES ('unique-two', 'BMS-unique', ?, 'mov_paradise', 'thr_sandhya', '["A1","A2","A3"]', 'CARD', 45000, 'now')
    `).run(session.userId)).toThrow(/UNIQUE/);
    expect(rowCounts()).toEqual({ ...before, bookings: 1 });
  });
});
