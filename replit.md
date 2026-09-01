# Bunsen Burger

Bunsen Burger is a bold restaurant menu and account experience for browsing available food and preparing for online ordering.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/bunsen-burger run dev` — run the React/Vite web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` for the workspace database tooling, plus `SUPABASE_URL` and `SUPABASE_ANON_KEY` for the burger app's external Supabase Auth and Postgres access

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: External Supabase PostgreSQL via `@supabase/supabase-js` (the existing Supabase tables are the source of truth)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bunsen-burger/src/` — restaurant UI, auth pages, menu, account view, and visual theme
- `artifacts/api-server/src/lib/supabase.ts` — lazy Supabase client from environment variables
- `artifacts/api-server/src/middlewares/auth.ts` — bearer verification and role checks
- `artifacts/api-server/src/routes/auth.ts` — signup, login, logout, and current profile endpoints
- `artifacts/api-server/src/routes/menu.ts` — public categories and available products endpoints
- `lib/api-spec/openapi.yaml` — API contract source of truth

## Architecture decisions

- Supabase Auth is handled by the Express API so the browser never needs the Supabase project key; the client stores only the returned access token for bearer requests.
- Profiles are loaded from the existing `profiles` table on every protected request, so role changes take effect without rebuilding the app.
- New accounts default to the `customer` role when a profile row does not already exist.

## Product

- Public visitors can browse available categories and products, filter menu items, and build a temporary bag.
- Customers can create an account, sign in, view their profile role, and sign out.
- The visual direction uses bold editorial typography, high-contrast counter graphics, and explicit connection error states.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be configured before auth or menu requests can succeed; the API intentionally returns a clear 503 instead of using fake data.
- If Supabase email confirmation is enabled, signup returns a confirmation message and waits for the user to sign in after verifying email.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
