# Mass Hisab

Bachelor Mess Management System built with Next.js, Express.js, MongoDB and Bootstrap 5.

## Repository layout

- `frontend/` — Next.js App Router application (planned)
- `backend/` — Express REST API
- MongoDB with Mongoose models

## Current backend foundation

- MongoDB connection with startup failure handling
- Express security and request middleware
- Health endpoint at `GET /api/health`
- Initial schemas: Mess, User, Meal, Bazar, Deposit, Expense, MonthlySummary and ManagerHistory
- Integer-paisa money storage for financial accuracy
- Tenant-scoped indexes using `messId`

## Requirements

- Node.js 20+
- MongoDB 6+ (use a replica set for multi-document transactions)

## Getting started

1. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

2. Set `MONGO_URI` and a strong `JWT_ACCESS_SECRET` in `.env`.

3. Install backend dependencies:

   ```bash
   npm run install:backend
   ```

4. Start the API:

   ```bash
   npm run dev:backend
   ```

5. Check health:

   ```text
   GET http://localhost:5000/api/health
   ```

## Important domain rules

- Every business record belongs to a mess through `messId`.
- Store money as integer paisa; convert to/from BDT at API boundaries.
- Only approved deposits count toward member balances.
- Financial entries should be auditable; finalized monthly summaries must be treated as immutable snapshots.
- Meal lock enforcement and manager overrides must be validated by the API, not only by the UI.
- Guest meals are attributed to the member who records the guest.

## Development status

Backend foundation is in progress. Authentication, authorization, validation, calculation services, API resources, tests and the Next.js frontend are upcoming.
