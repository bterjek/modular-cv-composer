# Backlog

Ideas and open items that are agreed but not scheduled. Newest first.

## Keyboard navigation everywhere (logged 2026-09-27)
Make the whole app drivable like a DOS program, not only the editor. Estimated ~1 day incl. keyboard-only
browser tests (sign-in → PDF download without the mouse). Suggested order if split: 3 and 4 first.

1. **F10 menu bar** — top-level menus (Home, Editor, Assemble, Account, Admin) opened with F10, navigated
   with ← → ↑ ↓; underlined hotkey letters (Alt+E, Alt+A…), avoiding keys browsers reserve.
2. **Same shortcuts on every page**, with a context-aware key bar at the bottom showing what works on the current screen.
3. **List actions** — Ins: add entry/bullet/wording · Del: delete with a “Delete? Y/N” prompt on the status line
   (no browser dialogs) · Alt+↑/↓: move the highlighted item · Space: cycle a job bullet auto → always → never ·
   Esc: go up one level (bullet → entry → section → menu).
4. **Quick jump** — `/` or Ctrl+K opens a box; type part of a role, category, job or “profile”, Enter jumps there
   (Norton Commander-style quick search).
5. **Strong focus highlight** — DOS-style cyan bar on whatever has keyboard focus. Mouse and screen readers keep working.

## Admin password reset from the terminal
A one-off command (e.g. `docker compose exec app node scripts/reset-password.js <email>`) that prints a reset
code, so a forgotten admin password never requires wiping `./data`. Wanted before real content goes in.

## Tag autocomplete inside comma-separated fields
Today the tag fields are plain text with the known tags listed as a hint; a proper per-tag suggestion control is missing.

## Letting testers reach the Mac-hosted app
Tunnel (Cloudflare Tunnel or Tailscale Funnel) + env changes — steps in `docs/LOCAL-HOSTING.md` (“Later”).

## Public-phase backups
Litestream to EU object storage + provider snapshots + monitoring + weekly restore drill — `docs/BACKUP-OPTIONS.md`.

## ARM (arm64) image in CI
Needed for Oracle Always Free, AWS Graviton, or running the published image on Apple silicon without emulation
(today the Mac builds it locally). A multi-arch build in `.github/workflows/container.yml`.

## Verify CI
The GitHub Actions image build has not been confirmed green from here (no access to the Actions tab).

## Form values typed before the page has loaded can be reset
Found via the formerly flaky e2e step: typing into the sign-up form before its scripts finished loading left the
fields empty after hydration, so the submit was blocked silently. Tests now wait for load. Real users rarely type
that fast, but browser/password-manager autofill could be wiped the same way — worth a check on real devices.
