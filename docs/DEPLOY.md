# Deploying (test mode)

Everything runs in one container. The host needs to provide five things.

## 1. Host
Any service that runs a Docker image **with a persistent volume**, in the EU. Examples: a small VM with
Docker (Hetzner, Scaleway, OVH…), or a container platform that supports volumes. 1 vCPU / 1–2 GB RAM is
enough for testing; PDF rendering is the memory peak (Chromium, ~2 renders at a time).

## 2. Image
`ghcr.io/bterjek/modular-cv-composer:latest` (or a specific commit tag). The package is private by default:
create a GitHub token with `read:packages` and log the host in (`docker login ghcr.io`), or make the package public.

## 3. Volume
Mount a persistent volume at **`/data`**. It holds the database (`/data/composer.sqlite`) and the built-in
backups (`/data/backups`). Without it, every deploy starts empty.

## 4. HTTPS
Put the app behind HTTPS (most platforms do this; on a plain VM use Caddy or nginx). The app listens on port 3000.
If a reverse proxy sits in front, set `ADDRESS_HEADER=X-Forwarded-For` so rate limits see real visitors.

## 5. Environment
| Variable | Value |
|---|---|
| `APP_ENV` | `staging` for the test phase (shows the test banner), `production` later |
| `ORIGIN` | the public https URL, e.g. `https://cv.example.com` — must match exactly |
| `ADMIN_EMAIL` | your e-mail: the first start prints a one-time admin sign-up link to the log |
| `OPERATOR_NAME`, `OPERATOR_CONTACT` | shown in the privacy notice (required before inviting anyone) |
| `HOSTING_DESCRIPTION` | one sentence: provider and country, for the privacy notice |
| `BACKUP_RETENTION_DAYS` | default 30; the notice promises this, so keep it true |
| `BACKUP_INTERVAL_HOURS` | default 24; `0` switches built-in backups off |

## Backups — the one thing to set up yourself
The app writes a consistent copy of the database to `/data/backups` every day and deletes copies older than
`BACKUP_RETENTION_DAYS`. Those copies are on the **same disk**; copy them off the machine daily
(e.g. `rclone sync /path/to/volume/backups remote:cv-backups --max-age 31d` from host cron, or the platform's
volume snapshots to another region). Test a restore once: stop the app, put a backup in place as
`/data/composer.sqlite`, start it.

## First start
1. Start the container, open its log, find `[bootstrap] No admin yet. Sign up as … <link>`.
2. Open the link within 24 hours and create your admin account.
3. **Admin → Feature flags**: switch on `editor.dos-shell`, `render.pdf`, `snapshots.share-links` for everyone
   (or first only for yourself with a per-user override). Leave `ai.tailoring` off.
4. **Admin → Invite codes**: create one per tester (tie it to their e-mail), send them the sign-up link.
5. Testers' feedback (Shift+F1) appears under **Admin → Tester feedback**; the Admin menu shows the open count.

## Updating
Every push to `main` builds, tests and publishes a new image. Pull it and restart the container; database
migrations run automatically at start. Check the version in the page footer (it is the git commit).

## Going public later
Switch `APP_ENV=production`, then decide on open sign-up, terms of service and billing — see the build plan.
Have the privacy notice checked by someone qualified before that.
