# MyCommNet

MyCommNet is a community website for member profiles, groups, and messaging.

## Run & Operate

- Use the **Project** run button to start the MyCommNet web app.
- The web preview is served by the registered `artifacts/app: web` service; its port and Replit proxy routing are configured by the artifact.
- Install dependencies after importing with `pnpm install --frozen-lockfile`.
- Run `pnpm run typecheck` to typecheck the workspace.
- Required Replit Secrets for the web app: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Do not put Supabase values in `.replit` or commit them. Add them to each new Replit project through its Secrets tool.
- Map tiles also require `VITE_GEOAPIFY_API_KEY` in Replit Secrets. This `VITE_` value is included in browser requests and is visible to visitors; use a Geoapify key restricted to this app's development and published origins.
- Optional map-center build variables: `VITE_MAP_DEFAULT_LAT` and `VITE_MAP_DEFAULT_LNG`. If omitted or invalid, the map starts centered on Atlanta.
- The separate API Server artifact is not required for the web app preview and requires a PostgreSQL `DATABASE_URL` to run.
## GitHub Pages

- The `Deploy app to GitHub Pages` workflow builds `@workspace/app` with pnpm and publishes it at `https://<owner>.github.io/MyCommNet/`.
- Configure repository Actions secrets named `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_GEOAPIFY_API_KEY`; never commit their values. Optional map-center variables can be added to the workflow environment if needed.
- GitHub Pages builds set `VITE_BASE_PATH=/MyCommNet/`. Vite and TanStack Router use this base path, and the workflow copies `dist/index.html` to `dist/404.html` so client-side routes have an SPA fallback.
- Add the published Pages URL, including `/MyCommNet/`, and its `/MyCommNet/reset-password` URL to Supabase Authentication URL configuration. Password-reset emails must allow the current origin plus the app base path.
## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: React, Vite, TanStack Router
- Auth, data, and storage: Supabase JavaScript client
- Separate API artifact: Express 5, PostgreSQL, Drizzle ORM

## Where things live

- `artifacts/app/src/routes/` — web pages and route components
- `artifacts/app/src/lib/supabase.ts` — Supabase browser client and required configuration checks
- `artifacts/app/vite.config.ts` — Vite host, port, and configurable deployment base path
- `artifacts/api-server/` and `lib/db/` — optional API server and PostgreSQL packages

## Architecture decisions

- The web app connects directly to Supabase from the browser; Supabase URL and publishable key are client configuration stored in Replit Secrets for per-project setup.
- The Project run button starts only the web artifact, avoiding duplicate web processes and an unrelated database-backed API blocking the preview.

## Product

The site includes member-facing community features such as profiles, groups, onboarding, and messages.

## User preferences

- Keep the imported project structure and make Replit startup repeatable for fresh imports.

## Gotchas

- Each fresh Replit project needs the two Supabase Secrets above; they are intentionally not embedded in source or `.replit`.
- The Geoapify map key is also configured per Replit project; restrict its allowed domains in Geoapify because browser-exposed keys cannot be kept private.
- Run `pnpm install --frozen-lockfile` after importing if workspace dependencies are missing.

- For GitHub Pages, configure the three required Actions secrets and ensure Supabase allows the Pages site and its base-path reset-password redirect.
