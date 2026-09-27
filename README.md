# Modular CV Composer

A hosted app for building CVs from reusable modules. Content is written once
(entries, items and their alternative wordings), grouped by tags, and assembled
into tailored CVs through job-category recipes. The editor has a keyboard-driven,
DOS-style interface; the CVs it produces are modern HTML (and PDF from the same HTML).

**Status:** build step 1 of 7 — data model and container skeleton. Test mode (invite-only) until all features are confirmed.

## Documents

- [`docs/SCHEMA.md`](docs/SCHEMA.md) — the data model. Everything depends on it; change it first.

## Stack

| Layer | Choice |
|---|---|
| App | SvelteKit (Node adapter), TypeScript |
| Database | SQLite in a file on the `/data` volume, via Drizzle ORM (Postgres-ready) |
| Validation | Zod — every JSON column is validated on write |
| PDF | Chromium in the same image (used from step 4) |
| Delivery | One container image, tested, built, smoke-tested and pushed to GHCR by GitHub Actions |

## Run locally

```sh
npm install
npm run db:migrate   # creates ./data/dev.sqlite
npm run dev
npm test             # schema + database constraint tests
```

## Run the container

```sh
cp .env.example .env   # fill in values
docker compose up --build
# http://localhost:3000/healthz → {"status":"ok"}
```

On a host you need only: the image (`ghcr.io/bterjek/modular-cv-composer:latest`),
a **persistent volume at `/data`**, HTTPS in front, the env vars from `.env.example`,
and **off-machine backups of `/data`**. Migrations run automatically on start.

## Changing the database

1. Update `docs/SCHEMA.md`
2. Update `src/lib/server/db/schema.ts`
3. `npm run db:generate` and commit the new file in `drizzle/`

## Build plan

1. ✅ Data model + container skeleton
2. Auth, invite gate, admin screen, feature flags, environments
3. Assembly engine (recipe + overrides → resolved CV, with trace)
4. Rendering: first modern HTML design, preview iframe, PDF via Chromium
5. DOS-style editor shell
6. Snapshots, share links, export and account deletion
7. Remaining designs, feedback tool → testers in
