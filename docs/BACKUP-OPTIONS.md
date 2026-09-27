# Backups when the app goes public — options and recommendation

Today: a consistent SQLite copy every 24 h into `/data/backups`, pruned after `BACKUP_RETENTION_DAYS`
(`src/lib/server/backup.ts`). Good enough for testing, not for real users: the copies sit on the same
disk, can lose up to a day, and nothing alerts if they stop.

What public operation needs: **off-site, encrypted, frequent, monitored, restorable, and retention that
matches the privacy notice** (deleted accounts must disappear from backups within the stated days).

## Options

| # | Option | Data loss window | Off-site | Effort | Monthly cost (small app) |
|---|---|---|---|---|---|
| 1 | **Litestream** → S3-compatible EU object storage | seconds | ✅ | low: one extra process in the container | cents to €1 (a few GB) |
| 2 | Scheduled encrypted snapshots with **restic** → object storage or a Hetzner Storage Box | hours (= schedule) | ✅ | low | €1–4 |
| 3 | Host-level disk snapshots (Hetzner/OVH backups, volume snapshots) | 24 h | ✅ (provider-side) | none | +20% of server price |
| 4 | Move to managed Postgres (point-in-time recovery by the provider) | minutes | ✅ | high: async data layer rewrite | €15+ for PITR tiers |
| 5 | Export per user to their own storage | — | — | — | not a backup, just portability |

**Litestream** streams every SQLite change (the WAL) to object storage continuously and restores to any
point in time within the retention window. It is designed for exactly this one-file-database setup.
EU S3-compatible targets: Hetzner Object Storage, Scaleway Object Storage, OVHcloud Object Storage.

## What I would build (recommendation)

**1 + 3, plus a restore drill and monitoring:**

1. **Litestream in the container**
   - Run it as the container's supervisor (`litestream replicate -exec "node build"`), so replication starts
     before the app and the app stops if replication cannot start.
   - On start with an empty `/data`, `litestream restore -if-replica-exists` — a new server restores itself.
   - Replica: an EU bucket, **server-side encryption on**, bucket credentials scoped to that one bucket.
   - `retention` = `BACKUP_RETENTION_DAYS` (e.g. 30 d) so erasure promises in the privacy notice hold;
     snapshot interval 24 h, WAL sync every 1 s.
2. **Provider disk snapshots** as a second, independent copy (different mechanism, different failure modes).
3. **Keep the built-in daily copy** in `/data/backups`, but shorten its retention to ~3 days (fast local restores).
4. **Monitoring**: a `/healthz` field with “last successful replication” age; an external uptime check
   (e.g. a free Healthchecks.io / UptimeRobot monitor) alerts when it exceeds 15 minutes or the site is down.
5. **Restore drill**: a CI job (weekly) that restores the latest replica into a throwaway container and
   runs the smoke tests against it — a backup is only real if a restore has been tested.
6. **Documentation**: a one-page runbook (restore to a point in time, rotate bucket keys, what to tell users).

Effort estimate: 1–2 days including the restore drill. Nothing in the data model has to change.

## Retention and GDPR
- Backups may contain deleted users' data until they age out; the privacy notice already says so and
  names the window (`BACKUP_RETENTION_DAYS`). Every backup layer must respect the same number.
- Object storage must be in the EU; the provider becomes a processor → list it in the privacy notice
  and sign its DPA.
