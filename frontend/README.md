# Mass Hisab Frontend

Next.js App Router + TypeScript + Bootstrap 5 frontend.

## Run locally

1. Install backend and frontend dependencies from the repository root:

   ```bash
   npm run install:backend
   npm run install:frontend
   ```

2. Configure the root `.env` using `.env.example`, including MongoDB and a strong `JWT_ACCESS_SECRET`.

3. Create `frontend/.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start MongoDB, then start the backend and frontend in separate terminals:

   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

Open http://localhost:3000.

## Screens

- `/login` and `/register`
- `/dashboard` overview
- `/dashboard/meals` — API-backed breakfast, lunch and dinner
- `/dashboard/members` — API-backed member management
- `/dashboard/bazar`, `/dashboard/deposits`, `/dashboard/expenses`, `/dashboard/reports`, `/dashboard/manager`, `/dashboard/settings`

## API integration

Authentication uses an HTTP-only JWT cookie. Meal and member screens call the Express API with credentials included. The server enforces mess isolation, role permissions and the common Asia/Dhaka meal request deadline.

Offline demo credentials are available only when the API cannot be reached; they do not authorize database API access. Other finance and report screens remain demo UI until their APIs are implemented.

Bootstrap 5 and Bootstrap Icons are used; Tailwind CSS is not used.
