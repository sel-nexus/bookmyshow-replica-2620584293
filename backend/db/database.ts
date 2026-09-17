import Database from 'better-sqlite3';
import { USER_SCHEMA } from './schema';
import { ensureSeeded } from './seed';

let database: Database.Database | undefined;
let activeUrl: string | undefined;

/** Return the configured SQLite connection after ensuring its schema exists. */
export function getDatabase(): Database.Database {
  const databaseUrl = process.env.DATABASE_URL ?? './identity.sqlite';
  if (!database || activeUrl !== databaseUrl) {
    database?.close();
    database = new Database(databaseUrl);
    database.pragma('journal_mode = DELETE');
    database.pragma('foreign_keys = ON');
    database.exec(USER_SCHEMA);
    ensureSeeded(database);
    activeUrl = databaseUrl;
  }
  return database;
}

/** Close the cached connection so a test or process can select another database URL. */
export function resetDatabase(): void {
  database?.close();
  database = undefined;
  activeUrl = undefined;
}
