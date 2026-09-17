import { SignJWT, jwtVerify } from 'jose';

/** Represent verified JWT identity claims. */
export interface TokenClaims {
  userId: string;
  mobileNumber: string;
}

/** Read the signing secret and reject unsafe empty configuration. */
function signingKey(): Uint8Array {
  const secret = process.env.JWT_SIGNING_SECRET;
  if (!secret) throw new Error('JWT_SIGNING_SECRET must be configured');
  return new TextEncoder().encode(secret);
}

/** Issue a one-day HS256 JWT for an authenticated user. */
export async function createAccessToken(claims: TokenClaims): Promise<string> {
  return new SignJWT({ mobileNumber: claims.mobileNumber })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(signingKey());
}

/** Verify a bearer token and return reusable identity claims. */
export async function verifyAccessToken(token: string): Promise<TokenClaims> {
  const { payload } = await jwtVerify(token, signingKey(), { algorithms: ['HS256'] });
  if (!payload.sub || typeof payload.mobileNumber !== 'string') throw new Error('Token identity claims are invalid');
  return { userId: payload.sub, mobileNumber: payload.mobileNumber };
}

/** Extract and verify a standard Bearer authorization header. */
export async function authenticateBearer(authorization: string | null): Promise<TokenClaims> {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error('Bearer token is required');
  return verifyAccessToken(match[1]);
}
