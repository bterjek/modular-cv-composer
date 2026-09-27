# Modular CV Composer

A hosted app for building CVs from reusable modules. Content is written once
(entries, items and their alternative wordings), grouped by tags, and assembled
into tailored CVs through job-category recipes. The editor has a keyboard-driven,
DOS-style interface; the CVs it produces are modern HTML (and PDF from the same HTML).

**Status:** build step 6 of 7 — snapshots, share links, data export and account deletion. Test mode (invite-only) until all features are confirmed.

## Documents

- [`docs/SCHEMA.md`](docs/SCHEMA.md) — the data model. Everything depends on it; change it first.
- [`docs/AUTH.md`](docs/AUTH.md) — accounts, sessions, invites, first admin, resets, feature flags.
- [`docs/RENDERING.md`](docs/RENDERING.md) — designs, live preview, HTML and PDF export, output safety.
- [`docs/EDITOR.md`](docs/EDITOR.md) — the editor: keys, screens, live preview.
- [`docs/SNAPSHOTS-AND-PRIVACY.md`](docs/SNAPSHOTS-AND-PRIVACY.md) — snapshots, share links, GDPR export/deletion, privacy notice.

## Stack

| Layer | Choice |
|---|---|
| App | SvelteKit (Node adapter), TypeScript |
| Database | SQLite in a file on the `/data` volume, via Drizzle ORM (Postgres-ready) |
| Validation | Zod — every JSON column is validated on write |
| PDF | Chromium in the same image, driven by playwright-core |
| Fonts | Inter (SIL OFL 1.1) via @fontsource, embedded in exports |
| Delivery | One container image, tested, built, smoke-tested and pushed to GHCR by GitHub Actions |

## Run locally

```sh
npm install
npm run db:migrate   # creates ./data/dev.sqlite
ADMIN_EMAIL=you@example.com npm run dev   # prints your first-admin sign-up link
npm test             # schema, auth, engine, isolation, rendering and boundary tests
                     # PDF tests run when CHROMIUM_PATH points at a Chromium/Chrome binary
```

## Run the container

```sh
cp .env.example .env   # for a local try: APP_ENV=development, ORIGIN=http://localhost:3000, your ADMIN_EMAIL
docker compose up --build
# http://localhost:3000/healthz → {"status":"ok"}
```

The first start prints a one-time admin sign-up link to the container log
(`docker compose logs app`). Open it, create your admin account, then invite testers from **Admin**.

## Environments

`APP_ENV` is `development`, `staging` (test mode with testers) or `production`.
Each environment is its own container with its **own volume** — staging data never
becomes production data. Non-production environments show a banner on every page.

On a host you need only: the image (`ghcr.io/bterjek/modular-cv-composer:latest`),
a **persistent volume at `/data`**, HTTPS in front, the env vars from `.env.example` (including the operator details for the privacy notice),
and **off-machine backups of `/data`**. Migrations run automatically on start.

## Changing the database

1. Update `docs/SCHEMA.md`
2. Update `src/lib/server/db/schema.ts`
3. `npm run db:generate` and commit the new file in `drizzle/`

## Build plan

1. ✅ Data model + container skeleton
2. ✅ Auth, invite gate, admin screen, feature flags, environments
3. ✅ Assembly engine (recipe + overrides → resolved CV, with trace), owner-scoped content repository, example content
4. ✅ Rendering: first modern HTML design, preview iframe, HTML + PDF export
5. ✅ DOS-style editor: profile, content, wordings, tags, categories, job tailoring, live preview
6. ✅ Snapshots, share links, export and account deletion, privacy notice
7. Remaining designs, feedback tool → testers in
