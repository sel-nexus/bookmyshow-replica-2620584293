/** Represent the user fields delivered by the identity API. */
export interface AuthUser {
  id: string;
  mobileNumber: string;
  createdAt: string;
}

/** Represent a movie returned by the authenticated catalog API. */
export interface Movie {
  id: string;
  title: string;
}

/** Represent a theatre returned by the authenticated catalog API. */
export interface Theatre {
  id: string;
  name: string;
}

/** Represent a backend-declared movie and theatre availability relationship. */
export interface MovieTheatreMapping {
  movieId: string;
  theatreId: string;
}

/** Represent the only accepted dummy payment method. */
export type PaymentMethod = 'CARD' | 'UPI';

/** Represent an authoritative persisted booking confirmation. */
export interface BookingConfirmation {
  confirmationId: string;
  ticket: {
    movie: string;
    theatre: string;
    seats: ['A1', 'A2', 'A3'];
    paymentMethod: PaymentMethod;
    totalPricePaise: 45000;
  };
}

/** Represent a typed API response for successful authentication. */
interface ApiResponse<T> {
  data: T;
  correlationId: string;
}

/** Represent the API error payload used to derive a safe user-facing message. */
interface ApiErrorResponse {
  error?: { code?: string };
}

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** Read an API error payload and return a safe, user-facing error message. */
async function errorMessage(response: Response): Promise<string> {
  const payload = await response.json().catch(() => ({})) as ApiErrorResponse;
  if (payload.error?.code === 'OTP_VERIFICATION_FAILED') return 'That code is not valid. Please try again.';
  if (payload.error?.code === 'INVALID_REQUEST') return 'Please check the information and try again.';
  return 'We could not complete your request. Please try again.';
}

/** Start the OTP flow for a mobile number. */
export async function requestOtp(mobileNumber: string): Promise<void> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobileNumber }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  await response.json() as ApiResponse<{ nextStep: 'OTP' }>;
}

/** Verify an OTP and return the signed token and current user. */
export async function verifyOtp(mobileNumber: string, otp: string): Promise<{ token: string; user: AuthUser }> {
  const response = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mobileNumber, otp }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const payload = await response.json() as ApiResponse<{ token: string; user: AuthUser }>;
  return payload.data;
}

/** Fetch movies using the session token issued by the backend. */
export async function getMovies(token: string): Promise<Movie[]> {
  const response = await fetch(`${baseUrl}/api/movies`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(await errorMessage(response));
  const payload = await response.json() as ApiResponse<{ movies: Movie[] }>;
  return payload.data.movies;
}

/** Fetch theatres and their explicit movie availability mappings using the session token. */
export async function getTheatres(token: string): Promise<{ theatres: Theatre[]; movieTheatreMappings: MovieTheatreMapping[] }> {
  const response = await fetch(`${baseUrl}/api/theatres`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(await errorMessage(response));
  const payload = await response.json() as ApiResponse<{ theatres: Theatre[]; movieTheatreMappings: MovieTheatreMapping[] }>;
  return payload.data;
}

/** Create a booking using only authoritative journey identifiers and payment method. */
export async function createBooking(token: string, request: { movieId: string; theatreId: string; seats: string[]; paymentMethod: PaymentMethod }): Promise<BookingConfirmation> {
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  const payload = await response.json() as ApiResponse<BookingConfirmation>;
  return payload.data;
}
