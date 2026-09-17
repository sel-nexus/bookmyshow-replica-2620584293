# BookMyShow Replica

A demo-only, full-stack movie booking workflow. Use a mobile number and OTP `1234` to browse seeded films, choose a mapped theatre, apply the fixed seats A1–A3 (Rs. 450), select a dummy Card or UPI view, wait two seconds, and receive a persisted server confirmation.

> This is not affiliated with BookMyShow. OTP and payment are deterministic demos: no OTP is delivered, no card/UPI values are sent to the API, and no payment is charged.

## Architecture

- `frontend/` — Next.js App Router UI on port 3000.
- `backend/` — Next.js Route Handler API on port 3001.
- SQLite — real file-backed local persistence, with idempotent schema/seed initialization.
- JWT — demo session is issued only for OTP `1234`; the frontend stores it in tab-scoped `sessionStorage` for reload-safe confirmation retrieval.

### API

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/verify`
- `GET /api/movies`
- `GET /api/theatres`
- `POST /api/bookings`
- `GET /api/bookings/:confirmationId` (authenticated booking owner)

Protected endpoints require `Authorization: Bearer <token>`. Error responses are JSON and include a correlation ID.

## Local development

Install dependencies independently:

```sh
cd backend && npm install --no-bin-links
cd ../frontend && npm install --no-bin-links
```

Copy each tier's `.env.example` to an untracked `.env` and set values appropriate to your environment. In separate terminals:

```sh
cd backend && DATABASE_URL=/tmp/bookmyshow.sqlite JWT_SIGNING_SECRET=dev-secret-change-in-production FRONTEND_ORIGIN=http://127.0.0.1:3000 node node_modules/next/dist/bin/next dev -p 3001
cd frontend && NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:3001 node node_modules/next/dist/bin/next dev -p 3000
```

Open `http://127.0.0.1:3000/login`. Use any valid mobile format and code `1234`.

## Containers

```sh
JWT_SIGNING_SECRET=replace-this-for-real-use docker compose up --build
```

The backend uses the named `booking-data` volume at `/data/bookmyshow.sqlite`. Services address one another by Compose service name, not `localhost`.

## Verification

```sh
cd backend && node node_modules/vitest/vitest.mjs run
cd frontend && node node_modules/vitest/vitest.mjs run --exclude 'e2e/**/*.spec.ts'
cd frontend && node node_modules/@playwright/test/cli.js test --config playwright.config.ts
cd backend && NODE_ENV=production node node_modules/next/dist/bin/next build
cd frontend && NODE_ENV=production node node_modules/next/dist/bin/next build
```

The Playwright configuration starts both tiers and uses a temporary SQLite file in `/tmp` to avoid bind-mount locking limitations.

## Demo constraints

The seeded catalog contains Paradise, Bloody Romeo, and OG2, with explicit movie/theatre mappings. The booking API only accepts ordered seats `A1`, `A2`, `A3`, fixed total `45000` paise, and `CARD` or `UPI`. There is intentionally no schedule, dynamic inventory, payment gateway, refund, or real identity service.
