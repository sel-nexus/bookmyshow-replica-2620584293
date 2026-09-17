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
`;
