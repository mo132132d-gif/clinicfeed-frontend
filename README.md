# ClinicFeed Supplier Management Frontend

React + Vite + Tailwind CSS frontend for the internal Arabic RTL Supplier Management System.

The app is Arabic-first, RTL, dark themed, and uses the real backend API. Figma-generated screens were used only as a visual reference; API calls remain centralized and connected to the existing ClinicFeed backend.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Default local API:

```env
VITE_API_URL=http://localhost:4000/api
```

## Current Frontend Structure

```text
src/
  app/
  components/
    layout/
    shared/
  features/
    auth/
    dashboard/
    suppliers/
    users/
    account/
    activity/
  services/
  hooks/
  lib/
  types/
```

Important behavior:

- `VITE_API_URL` is the only frontend API base URL.
- JWT is attached automatically by `src/services/api.ts`.
- A `401` clears the token and returns the user to login.
- Supplier, contact, contract, document, user, activity, and performance calls live in service files.
- KPI data is manual now and can later be synced from the e-commerce/orders platform.

## Build

```bash
npm run build
```

Output directory:

```text
dist
```

## Vercel Deployment

1. Import the frontend project into Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add environment variable:

```env
VITE_API_URL=https://YOUR_RENDER_BACKEND_URL/api
```

Vite only exposes frontend environment variables prefixed with `VITE_`.

## Production Notes

- Do not put Supabase service role keys in this frontend.
- The frontend talks only to the backend API using JWT Bearer tokens.
- Configure the backend `CORS_ORIGIN` to include the deployed Vercel domain.
