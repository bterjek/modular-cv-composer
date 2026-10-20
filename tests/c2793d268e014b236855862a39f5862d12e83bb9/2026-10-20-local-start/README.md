# Local start — 20 October 2026

Checkpoint: `c2793d268e014b236855862a39f5862d12e83bb9`. The image was built from this checkpoint and started locally against the existing backed-up database. Backup and post-upgrade database integrity checks passed. Existing content and accounts are preserved; the feature-flag descriptions were refreshed by normal startup.

The app is available only on this Mac at http://localhost:3000. Docker reports the container healthy. The original database backup remains under the ignored `data/backups/` directory and is deliberately excluded from Git and test archives. No account credentials, original CV files or server/bootstrap logs are copied into this record.

The committed code was also reverified: 170 automated tests passed, one optional visual test skipped. Detailed machine-readable results are in the adjacent `2026-10-20T06-19-12-015Z/results/unit.json`. The complete pre-commit run also retained all 184 passing browser checks under the earlier base commit's test folder.
