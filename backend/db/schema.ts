/** Describe the current SQLite schema for the identity slice. */
export const USER_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    mobile_number TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );
`;
