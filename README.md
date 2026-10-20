# Modular CV Composer

A CV library and composer built around reusable facts, alternative wordings and independently saved CVs. Import PDF or DOCX CVs, review the extraction, reconcile matching experience and export through a measured Classical A4 template with a two-page limit.

**Status:** tasks 1–8 of the redesign are implemented: reviewed imports/reconciliation, independent CV editing, chat exchange, reusable reference styles and simplified navigation. Reference styles are reviewed adaptations to supported settings, not automatic clones of arbitrary documents. Verified: 170 automated tests and 184 browser checks passed; one optional visual-export test skipped. See [the workflow guide](docs/COMPOSER.md).

## Documents

- [`docs/COMPOSER.md`](docs/COMPOSER.md) — saved CV editing, chat comparison exchange, reference styles, navigation and retained test results.

- [`docs/CLASSICAL-A4.md`](docs/CLASSICAL-A4.md) — measured two-page A4 preview and HTML/PDF export for saved CVs.

- [`docs/RECONCILIATION.md`](docs/RECONCILIATION.md) — reconcile another CV against shared facts and wordings, resolve conflicts and inspect saved CVs.

- [`docs/IMPORTING.md`](docs/IMPORTING.md) — upload PDF/Word CVs, review extraction, approve content and retain originals.

- [`docs/LIBRARY.md`](docs/LIBRARY.md) — phase 1 of the CV-library redesign: facts, targeting, source provenance and independent compositions (data layer; import/editor screens follow).

- [`docs/SCHEMA.md`](docs/SCHEMA.md) — the data model. Everything depends on it; change it first.
- [`docs/AUTH.md`](docs/AUTH.md) — accounts, sessions, invites, first admin, resets, feature flags.
- [`docs/RENDERING.md`](docs/RENDERING.md) — designs, live preview, HTML and PDF export, output safety.
- [`docs/EDITOR.md`](docs/EDITOR.md) — the editor: keys, screens, live preview.
- [`docs/SNAPSHOTS-AND-PRIVACY.md`](docs/SNAPSHOTS-AND-PRIVACY.md) — snapshots, share links, GDPR export/deletion, privacy notice.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — hosting checklist, backups, first start, updating.
- [`docs/LOCAL-HOSTING.md`](docs/LOCAL-HOSTING.md) — running on your own Mac; what testers-via-tunnel would need.
- [`docs/BACKUP-OPTIONS.md`](docs/BACKUP-OPTIONS.md) — backup options for going public, and the recommended build.
- [`docs/TERMS.md`](docs/TERMS.md) — job-ad terms, coverage, suggestions and the gap log.
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — agreed ideas and open items not yet scheduled.

## Stack

| Layer | Choice |
|---|---|
| App | SvelteKit (Node adapter), TypeScript |
| Database | SQLite in a file on the `/data` volume, via Drizzle ORM (Postgres-ready) |
| Validation | Zod — every JSON column is validated on write |
| PDF | Chromium in the same image, driven by playwright-core |
| Fonts | Inter and Source Serif 4 (SIL OFL 1.1) via @fontsource, embedded in exports |
| Delivery | One container image, tested, built, smoke-tested and pushed to GHCR by GitHub Actions |

## Run locally

```sh
npm install
npm run db:migrate   # creates ./data/dev.sqlite
ADMIN_EMAIL=you@example.com npm run dev   # prints your first-admin sign-up link
npm test             # schema, auth, engine, isolation, rendering and boundary tests
                     # PDF tests run when CHROMIUM_PATH points at a Chromium/Chrome binary
npm run build && CHROMIUM_PATH=… npm run e2e   # browser regression, see e2e/README.md
```

## Run on your Mac (current setup)

The app runs in Docker on your own Mac, reachable only from that Mac. Details, and what is needed later to let
testers in: [`docs/LOCAL-HOSTING.md`](docs/LOCAL-HOSTING.md).

```sh
# first time
ADMIN_EMAIL=you@example.com docker compose -f compose.local.yaml up -d --build
docker compose -f compose.local.yaml logs app | grep bootstrap     # your one-time admin sign-up link
open http://localhost:3000

# update to the latest code
git pull && docker compose -f compose.local.yaml up -d --build

# everyday
docker compose -f compose.local.yaml ps                              # is it running?
docker compose -f compose.local.yaml logs -f app                     # follow the log (Ctrl+C to stop following)
docker compose -f compose.local.yaml stop                            # stop (data stays in ./data)
docker compose -f compose.local.yaml start                           # start again
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

## Original build history (before the redesign)

1. ✅ Data model + container skeleton
2. ✅ Auth, invite gate, admin screen, feature flags, environments
3. ✅ Assembly engine (recipe + overrides → resolved CV, with trace), owner-scoped content repository, example content
4. ✅ Rendering: first modern HTML design, preview iframe, HTML + PDF export
5. ✅ DOS-style editor: profile, content, wordings, tags, categories, job tailoring, live preview
6. ✅ Snapshots, share links, export and account deletion, privacy notice
7. ✅ Second design (Classic), in-app feedback (Shift+F1) with admin triage, built-in backups, version stamping, error page → **testers in**

After first use: headline/summary pick one · click-to-edit in the preview · Business/Executive/Bold designs + style panel · job-ad terms, suggestions and gap log.
