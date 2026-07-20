# NavQuest

AI-powered travel platform that generates personalized group itineraries (optimized schedules,
budget estimates, travel times) and lets users discover and explore itineraries shared by others.
Team capstone — Dylan, Emmanuel, Semir.

## Repository layout

- `backend/` — Express + Prisma API (see `backend/CLAUDE.md` for its layering rules).
- `frontend/` — Vite + React app (see `frontend/CLAUDE.md`).
- `planning/` — the spec: `project_plan.md`, `user_stories.md`, `project_proposal.md`, `wireframes/`.
  Treat this as the source of truth for scope and structure.
- `reflections/` — weekly writeups; not code.
- `NavQuestFrontend/` — empty scaffold, not the real frontend. Ignore it.

## Stack

- Backend: Node (ES modules, `"type": "module"`), Express 5, Prisma 6 on Supabase Postgres,
  Supabase Auth + Storage. Runs on `http://localhost:3000`.
- Frontend: React 19, React Router 7, Vite, axios. The frontend has NO Supabase client —
  it talks only to the backend over HTTP.
- Data flow: **frontend → backend → Supabase**. Keep it that way; don't add a Supabase client
  or secrets to the frontend.

## Environment

- `backend/.env` and `frontend/.env` are git-ignored and hold real secrets — never commit them
  or print their values.
- Frontend env vars must be prefixed `VITE_` to be exposed (e.g. `VITE_BASE_URL=http://localhost:3000`),
  and Vite reads `.env` only at startup — restart the dev server after changing it.

## Database & migrations (shared DB — read this before any Prisma command)

The Supabase Postgres is **shared across the whole team**. Destructive commands wipe everyone's data.

- NEVER run `prisma migrate reset` or `prisma db push --force-reset` against this database.
- If Prisma reports **drift** or a migration "applied to the DB but missing locally", it usually
  means a teammate pushed a schema change whose migration file you haven't pulled. Fix by getting
  their migration file (git pull / ask them), NOT by resetting. `prisma migrate resolve --applied <name>`
  can reconcile history without touching data.
- Always `git pull` before creating a new migration, and commit the generated
  `prisma/migrations/<name>/` folder alongside the `schema.prisma` change.

## Working style

- CS-tutor context in `/Users/semir.ali/salesforce-codepath/CLAUDE.md` may apply to explanation
  requests; for actual implementation work, follow the code conventions instead.
- Ask before actions that touch the shared DB, secrets, or remote (migrations, pushes, deploys).
