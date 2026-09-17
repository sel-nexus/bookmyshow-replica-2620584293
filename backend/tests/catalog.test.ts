import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDatabase, resetDatabase } from '../db/database';
import { ensureSeeded } from '../db/seed';
import { createAccessToken } from '../modules/identity/token';
import { GET as movies } from '../app/api/movies/route';
import { GET as theatres } from '../app/api/theatres/route';

let testDirectory = '';

beforeEach(() => {
  testDirectory = mkdtempSync(join(tmpdir(), 'catalog-'));
  process.env.DATABASE_URL = join(testDirectory, 'catalog.sqlite');
  process.env.JWT_SIGNING_SECRET = 'catalog-test-secret';
});

afterEach(() => {
  resetDatabase();
  rmSync(testDirectory, { recursive: true, force: true });
});

/** Build a GET request with an optional real JWT authorization header. */
function request(token?: string): Request {
  return new Request('http://test.local/api/catalog', { headers: token ? { authorization: `Bearer ${token}` } : {} });
}

describe('catalog discovery API', () => {
  it('seeds exactly the requested movies, theatres, and explicit relations into file-backed SQLite', () => {
    const database = getDatabase();
    expect(database.prepare('SELECT id, title FROM movies ORDER BY id').all()).toEqual([
      { id: 'mov_bloody_romeo', title: 'Bloody Romeo' },
      { id: 'mov_og2', title: 'OG2' },
      { id: 'mov_paradise', title: 'Paradise' },
    ]);
    expect(database.prepare('SELECT id, name FROM theatres ORDER BY id').all()).toEqual([
      { id: 'thr_allu', name: 'Allu Cinemas' },
      { id: 'thr_sandhya', name: 'Sandhya 70mm' },
      { id: 'thr_sudharsham', name: 'Sudharsham 70mm' },
    ]);
    expect(database.prepare('SELECT movie_id, theatre_id FROM movie_theatres ORDER BY movie_id').all()).toEqual([
      { movie_id: 'mov_bloody_romeo', theatre_id: 'thr_sudharsham' },
      { movie_id: 'mov_og2', theatre_id: 'thr_allu' },
      { movie_id: 'mov_paradise', theatre_id: 'thr_sandhya' },
    ]);
  });

  it('keeps seed calls idempotent without duplicating mappings', () => {
    const database = getDatabase();
    ensureSeeded(database);
    ensureSeeded(database);
    expect(database.prepare('SELECT COUNT(*) AS count FROM movies').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM theatres').get()).toEqual({ count: 3 });
    expect(database.prepare('SELECT COUNT(*) AS count FROM movie_theatres').get()).toEqual({ count: 3 });
  });

  it('returns authenticated catalog data with a correlation ID', async () => {
    const token = await createAccessToken({ userId: 'usr_catalog', mobileNumber: '+15551234567' });
    const movieResponse = await movies(request(token));
    expect(movieResponse.status).toBe(200);
    expect(await movieResponse.json()).toMatchObject({
      data: { movies: expect.arrayContaining([{ id: 'mov_paradise', title: 'Paradise' }]) },
      correlationId: expect.any(String),
    });

    const theatreResponse = await theatres(request(token));
    expect(theatreResponse.status).toBe(200);
    expect(await theatreResponse.json()).toMatchObject({
      data: {
        theatres: expect.arrayContaining([{ id: 'thr_sandhya', name: 'Sandhya 70mm' }]),
        movieTheatreMappings: expect.arrayContaining([{ movieId: 'mov_paradise', theatreId: 'thr_sandhya' }]),
      },
      correlationId: expect.any(String),
    });
  });

  it('returns UNAUTHENTICATED when catalog requests have no valid bearer JWT', async () => {
    const missing = await movies(request());
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' }, correlationId: expect.any(String) });

    const invalid = await theatres(request('not-a-token'));
    expect(invalid.status).toBe(401);
    expect(await invalid.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });
});
