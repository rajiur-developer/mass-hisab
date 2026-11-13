# Mass Hisab

Bachelor Mess Management System built with Next.js, Express.js, MongoDB and Bootstrap 5.

## Repository layout

- `frontend/` — Next.js App Router + TypeScript + Bootstrap 5 application
- `backend/` — Express REST API
- MongoDB with Mongoose models

## Requirements

- Node.js 20+
- MongoDB 6+

## Getting started

1. Copy `.env.example` to `.env`.
2. Set `MONGO_URI` and a strong unique `JWT_ACCESS_SECRET`.
3. Install dependencies:

   ```bash
   npm run install:backend
   npm run install:frontend
   ```

4. Create `frontend/.env.local` containing:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

5. Start MongoDB and run the API:

   ```bash
   npm run dev:backend
   ```

6. In another terminal, start Next.js:

   ```bash
   npm run dev:frontend
   ```

The API health endpoint is `GET http://localhost:5000/api/health`.

## Implemented API workflows

- `POST /api/auth/register` creates a mess and its first Manager account.
- `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` manage sessions using an HTTP-only JWT cookie.
- `GET /api/meals/today` returns the caller's own meals for Members or all active Member meals for Managers.
- `POST /api/meals/requests` submits a Member meal request for breakfast, lunch or dinner.
- `PATCH /api/meals/requests/:requestId` lets Managers approve or reject requests.
- `PATCH /api/meals/:userId` lets Managers directly change a Member's meal.
- `PUT /api/meals/deadline` sets the common request cutoff for all three meals.
- `GET/POST /api/members`, `PATCH /api/members/:memberId`, and `DELETE /api/members/:memberId` manage members.

All meal dates and request deadlines use Asia/Dhaka. The server, not the browser, enforces the cutoff and role permissions. Members are always scoped to their authenticated user ID and mess ID; Managers are scoped to their own mess.

## Domain rules

- Every business record belongs to a mess through `messId`.
- Store money as integer paisa; convert to/from BDT at API boundaries.
- Only approved deposits count toward member balances.
- Financial entries should be auditable; finalized monthly summaries should be treated as immutable snapshots.
- Guest meals are attributed to the member who records the guest.

## Development status and limitations

Meal requests, daily meal state, the shared deadline, authentication and member management now have API routes and frontend integration. Bazar, deposit, expense and financial-report pages still use representative demo data. No production deployment or live MongoDB verification is implied by this repository change.
