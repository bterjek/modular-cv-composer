# Redesign tasks 5–8 — verified 20 October 2026

Tested state: uncommitted working tree based on `e72cf4c0ec89781f76bf7aeed08b483a44830985`, not that clean commit.

- Type check: zero errors and warnings.
- Automated tests: 170 passed, zero failed; one optional visual-export test skipped because VISUAL_OUT was not set.
- Browser regression: 184 checks passed, zero failed, across all ten browser scripts.
- Production build: passed.

Actual command output, machine-readable unit results, individual browser results and synthetic screenshots are retained under `results/`. `results.json` records the executed commands and exit codes. `test-sources/` preserves test definitions and runner configuration. The tracked-file patch supplements the recorded working-tree status; this archive is not a standalone application checkout.

Coverage includes local edits versus shared-library isolation, stale saves, explicit library publication and rollback, structured facts and bullet ordering/removal, duplication, reviewed chat exchange, source ownership, template application/deletion and retained references, all supported renderers, migration compatibility, pagination/PDFs, optional appearance and existing authentication/share/backup flows.

Earlier failed runs remain in their own timestamped folders. No operator database migration or container deployment was performed.
