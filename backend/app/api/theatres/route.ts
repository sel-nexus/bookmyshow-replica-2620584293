import { NextResponse } from 'next/server';
import { listTheatres } from '../../../modules/catalog/service';
import { authenticateBearer } from '../../../modules/identity/token';
import { correlationId, jsonResponse, optionsResponse, unauthenticated } from '../../../modules/shared/http';

/** Return theatre inventory and its explicit movie availability mappings to an authenticated session. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    await authenticateBearer(request.headers.get('authorization'));
  } catch {
    return unauthenticated();
  }
  return jsonResponse({ data: listTheatres(), correlationId: correlationId() });
}

/** Answer cross-origin preflight requests without exposing protected data. */
export function OPTIONS(): NextResponse {
  return optionsResponse();
}
