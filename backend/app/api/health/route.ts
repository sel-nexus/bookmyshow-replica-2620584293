import { NextResponse } from 'next/server';
import { getDatabase } from '../../../db/database';
import { jsonResponse, optionsResponse } from '../../../modules/shared/http';

/** Confirm the backend can reach its SQLite database. */
export async function GET(): Promise<NextResponse> {
  getDatabase().prepare('SELECT 1').get();
  return jsonResponse({ data: { status: 'ok' } });
}

/** Answer cross-origin preflight requests for the health endpoint. */
export function OPTIONS(): NextResponse {
  return optionsResponse();
}
