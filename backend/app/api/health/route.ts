import { NextResponse } from 'next/server';
import { getDatabase } from '../../../db/database';

/** Confirm the backend can reach its SQLite database. */
export async function GET(): Promise<NextResponse> {
  getDatabase().prepare('SELECT 1').get();
  return NextResponse.json({ data: { status: 'ok' } });
}
