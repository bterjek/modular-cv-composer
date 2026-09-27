# Snapshots, share links and data protection

Build step 6.

## Snapshots
- **Freeze** from a job's page (optionally marking the job as sent). The snapshot stores the resolved CV
  (data) and the standalone HTML (fonts embedded), plus design key and engine version.
- **Immutable**: the repository has no update function. Editing content, categories or the job never changes a snapshot.
  Deleting the job keeps the snapshot (its job link becomes empty).
- **PDF** is printed from the stored HTML on demand, so it always matches the snapshot and no files need storing
  (`snapshots.pdf_key` stays unused; object storage is not needed).
- Owner-only endpoint: `GET /cv/snapshot/<id>?format=preview|html|pdf`.

## Share links (feature flag `snapshots.share-links`)
- `https://<origin>/s/<token>` shows the snapshot without login; `/s/<token>/pdf` downloads it.
- 256-bit random token; only its SHA-256 is stored; the full link is shown once.
- Validity: 7 / 30 / 90 days or until withdrawn. Withdrawn, expired, unknown links and links of disabled
  accounts all show the same “not available” page (404) — nothing reveals that a link existed.
- Responses carry `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`, no-store caching.
- A view counter and last-view time per link. Nothing about the visitor is stored. Chat apps that unfurl links count as views.
- Rate limits per visitor address: 60 page views and 10 PDFs per 10 minutes.

## Data protection (GDPR)
| Right | How |
|---|---|
| Access / portability (Art. 15, 20) | Account → **Download my data**: one JSON file (`modular-cv-composer/export@1`) with account, profile, content, tags, categories, jobs, snapshots (resolved data), share-link counts and feedback. No password hash, no token hashes. |
| Erasure (Art. 17) | Account → **Delete account**: password + typing DELETE. Everything owned goes by foreign-key cascade in one transaction; feedback is deleted explicitly. The last active admin cannot delete their account. |
| Information (Art. 13) | Public `/privacy` notice. Operator name, contact, hosting description and backup retention come from `OPERATOR_NAME`, `OPERATOR_CONTACT`, `HOSTING_DESCRIPTION`, `BACKUP_RETENTION_DAYS`; the server warns at start-up outside development if they are missing. |

- SQLite runs with `secure_delete = ON`: deleted rows are overwritten, not just unlinked.
- Backups still hold deleted data until they expire — the retention you set must match what the notice says.
- Cookies: session and preview choice only, both strictly necessary; no consent banner needed and none shown.

The notice text is a practical starting point, not legal advice; have it checked before going public.
