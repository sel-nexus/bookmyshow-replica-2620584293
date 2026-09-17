import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db/database';

/** Represent the persisted identity returned to clients and token services. */
export interface User {
  id: string;
  mobileNumber: string;
  createdAt: string;
}

interface UserRow {
  id: string;
  mobile_number: string;
  created_at: string;
}

/** Convert the SQLite naming convention to the application user contract. */
function mapUser(row: UserRow): User {
  return { id: row.id, mobileNumber: row.mobile_number, createdAt: row.created_at };
}

/** Find a user by normalized mobile number or create one exactly once. */
export function findOrCreateUser(mobileNumber: string): User {
  const db = getDatabase();
  const existing = db.prepare('SELECT id, mobile_number, created_at FROM users WHERE mobile_number = ?').get(mobileNumber) as UserRow | undefined;
  if (existing) return mapUser(existing);

  const user: User = { id: randomUUID(), mobileNumber, createdAt: new Date().toISOString() };
  try {
    db.prepare('INSERT INTO users (id, mobile_number, created_at) VALUES (?, ?, ?)').run(user.id, user.mobileNumber, user.createdAt);
    return user;
  } catch (error) {
    const concurrent = db.prepare('SELECT id, mobile_number, created_at FROM users WHERE mobile_number = ?').get(mobileNumber) as UserRow | undefined;
    if (concurrent) return mapUser(concurrent);
    throw error;
  }
}
