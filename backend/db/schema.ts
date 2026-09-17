/** Describe the current SQLite schema for the identity slice. */
export const USER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    mobile_number TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS theatres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS movie_theatres (
    movie_id TEXT NOT NULL,
    theatre_id TEXT NOT NULL,
    PRIMARY KEY (movie_id, theatre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(id),
    FOREIGN KEY (theatre_id) REFERENCES theatres(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    confirmation_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id),
    movie_id TEXT NOT NULL REFERENCES movies(id),
    theatre_id TEXT NOT NULL REFERENCES theatres(id),
    seats_json TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('CARD', 'UPI')),
    total_price_paise INTEGER NOT NULL CHECK(total_price_paise = 45000),
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_user_created ON bookings(user_id, created_at DESC);
`;
