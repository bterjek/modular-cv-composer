# Hosting on your own Mac

Current setup for the test phase: the app runs in Docker on the operator's MacBook, reachable
only from that Mac (`127.0.0.1:3000`). Nothing is exposed to the network.

## Requirements
- Docker: OrbStack (lighter on 8 GB machines) or Docker Desktop. Give its VM 2–3 GB RAM.
- The image is **built locally** (`--build`): the image CI publishes is x86-only and would run under
  emulation on Apple silicon, which is slow and unreliable for Chromium. Everything in the Dockerfile
  has native ARM builds.

## Where the data is
`./data/` next to `compose.local.yaml` (git-ignored):
- `composer.sqlite` (+ `-wal`, `-shm`) — the live database; never copy these while the app runs
- `backups/composer-YYYYMMDD-HHMMSS.sqlite` — daily consistent copies, deleted after 30 days

Time Machine backs up `./data` like any folder. Do **not** put the repo folder in iCloud Drive,
Dropbox or similar: syncing a live SQLite database can corrupt it.

## Commands
See the README section “Run on your Mac”.

---

## Later: letting testers in (not set up yet)

What is needed when testers should reach the Mac-hosted app:

1. **A tunnel instead of opening the router** — one of:
   - **Cloudflare Tunnel** (free): `cloudflared` on the Mac, a domain on Cloudflare (or a temporary
     `trycloudflare.com` URL for quick tests). Gives HTTPS automatically.
   - **Tailscale Funnel** (free for personal use): public HTTPS URL on `*.ts.net`; simplest if Tailscale is already used.
2. **Environment changes** (in `.env`):
   ```
   APP_ENV=staging
   ORIGIN=https://<the tunnel's public hostname>     # must match exactly
   ADDRESS_HEADER=X-Forwarded-For                     # rate limits must see visitors, not the tunnel
   XFF_DEPTH=1
   OPERATOR_NAME=…
   OPERATOR_CONTACT=…
   ```
   Keep the port bound to `127.0.0.1` — the tunnel connects locally, so nothing else needs to change.
3. **Availability**: the site is down whenever the Mac sleeps or the lid is closed. Keep it on power and
   prevent sleep (Amphetamine, or `caffeinate -dimsu` in a terminal). Tell testers the hours it is up.
4. **Privacy notice**: `HOSTING_DESCRIPTION` must stay true (“Hosted on the operator's own computer in Hungary”).
   With a Cloudflare tunnel, add that traffic passes through Cloudflare (a processor, US company with EU data centres).
5. **Security**: only the app is exposed through the tunnel; keep macOS and Docker updated; do not run other
   services behind the same tunnel. Consider Cloudflare Access (e-mail one-time codes) in front of the app
   for an extra gate during testing.
6. **Moving to a real server afterwards**: stop the app, copy `./data` to the server's `/data`, start the same
   image there with the same `.env` (new `ORIGIN`). Nothing else migrates.
