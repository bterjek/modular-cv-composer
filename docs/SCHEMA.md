# Data model — v1

Status: **draft for review**. Everything else in the app depends on this document;
change it here first, then in `src/lib/server/db/schema.ts` and `src/lib/domain/`.

## 1. Core idea

A CV is never stored as a document. It is **assembled** from reusable content:

| Concept | What it is | Stored as |
|---|---|---|
| **Module** | A fixed CV section type (summary, experience, …) | Code enum, not a table |
| **Entry** | One fact inside a module (a role, a degree, a certification) | `entries` |
| **Item** | An atomic sub-fact of an entry (one achievement bullet, one skill) | `items` |
| **Variant** | An alternative wording of an entry's text or an item | `variants` |
| **Tag** | A user-defined label used for selection (`governance`, `delivery`, …) | `tags` + link tables |
| **Category** | A job category = a **recipe** that selects and orders content | `categories` |
| **Job target** | One concrete application: a category + per-job overrides | `job_targets` |
| **Snapshot** | A frozen, rendered CV exactly as it was generated/sent | `snapshots` |

**Rule 1 — single source.** A fact exists once. Categories and job targets
*select* content; they never copy it. The only place content is duplicated is a
snapshot, and that is deliberate (it records what was sent).

**Rule 2 — variants are wordings, not facts.** Anything that changes the facts
(dates, employer, numbers) is a different entry/item, not a variant.

## 2. Modules (code enum)

`headline`, `summary`, `experience`, `education`, `credentials`, `skills`,
`languages`, `projects`, `custom`.

Each module has a Zod schema for the structured fields of its entries
(`src/lib/domain/modules.ts`). Examples:

- `experience`: organization, title, location?, start (`YYYY-MM`), end (`YYYY-MM` | null = present)
- `credentials`: name, issuer, kind (`certification` | `course` | `license` | `membership`), issued?, expires?, credentialUrl?
- `languages`: language, level (CEFR `A1`…`C2` | `native`)

`credentials.kind` exists so a course completion can never be rendered as a
certification. The renderer labels by `kind`, never by guessing from the name.

## 3. Tables

All ids are UUIDv7 text (time-sortable). All timestamps are integer Unix ms.
JSON columns are validated by Zod on every write; they are never trusted on read
without the version check.

### Tenancy
Every domain table carries `owner_id NOT NULL` — including child tables where
the owner is derivable (items, variants). This is deliberate denormalisation:
it lets every query filter on one column (see §6).

### Auth & admin
Authentication is implemented in the app (no auth library): see `docs/AUTH.md`.

- `user`: id, name, email (lower-cased, unique), role (`admin` | `tester` | `user`), password_hash (scrypt), last_login_at?, disabled_at?, created_at, updated_at
- `session`: id = sha256 of the cookie token, user_id, expires_at, created_at
- `password_resets`: id, user_id, code_hash, created_by (the admin), expires_at, used_at?, created_at — admin-issued, one-time, because there is no email yet
- `invite_codes`: id, code_hash (sha256), created_by, role (granted on sign-up), email? (if set, only this address may use it), note?, max_uses, uses, expires_at?, revoked_at?, created_at
- `feature_flags`: key (pk), enabled (global default), description
- `feature_flag_overrides`: flag_key, user_id, enabled — per-user switch
- `feedback`: id, user_id, message, route, screen_state (JSON), created_at

### Content
- `profiles` — one per user: full_name, email, phone?, location?, links (JSON `[{label,url}]`), updated_at
- `entries` — id, owner_id, module, label (internal name, never rendered), data (JSON, per-module schema, `data_version`), sort_key (text, e.g. start date), position, archived_at?, created_at, updated_at
- `items` — id, owner_id, entry_id → entries (cascade), position, note (internal), archived_at?, created_at, updated_at
- `variants` — id, owner_id, entry_id? → entries, item_id? → items, text, length (`short` | `standard` | `long`), is_default, position, created_at, updated_at
  - CHECK: exactly one of `entry_id`, `item_id` is set
  - At most one default per target (partial unique index)
- `tags` — id, owner_id, name (unique per owner), color?
- `entry_tags`, `item_tags`, `variant_tags` — (target_id, tag_id) composite pk

Where variants attach:
- **Entry variants** — the entry's prose (summary paragraph, headline, role description line)
- **Item variants** — each bullet/skill wording

### Assembly
- `categories` — id, owner_id, name, description?, recipe (JSON, §4), design_key, created_at, updated_at
- `job_targets` — id, owner_id, category_id → categories (restrict), company, role_title, job_url?, job_ad_text?, overrides (JSON, §4), status (`draft` | `sent` | `archived`), created_at, updated_at

### Output
- `snapshots` — **immutable**: id, owner_id, job_target_id? (set null), category_id? (set null), design_key, engine_version, resolved (JSON: the full resolved CV), html (frozen render), pdf_key? (object path), label, created_at. No `updated_at`: rows are never updated.
- `share_links` — id, owner_id, snapshot_id → snapshots (cascade), token_hash, created_at, expires_at?, revoked_at?. The token itself is only shown once.

### Reserved for AI tailoring (not used in v1)
- `ai_runs` — id, owner_id, job_target_id?, kind, model, input_tokens, output_tokens, result (JSON), created_at. Exists now so usage limits have a place to count against.

## 4. Recipe and overrides (JSON formats)

Recipe (stored on a category), `version: 1`:

```jsonc
{
  "version": 1,
  "modules": [
    { "module": "headline" },
    { "module": "summary" },
    { "module": "experience", "title": "Experience",
      "maxEntries": 5, "maxItemsPerEntry": 4,
      "includeTags": ["governance", "delivery"],   // empty = everything
      "excludeTags": ["legacy"] },
    { "module": "credentials", "title": "Certifications & training" }
  ],
  "preferTags": ["governance"],      // steers variant choice
  "length": "short"                  // preferred variant length
}
```

Overrides (stored on a job target) — all optional:

```jsonc
{
  "moduleOrder": ["headline", "summary", "credentials", "experience"],
  "includeItems": ["<itemId>"],        // force in, even if filtered or over max
  "excludeItems": ["<itemId>"],
  "excludeEntries": ["<entryId>"],
  "pinVariants": { "<entryId|itemId>": "<variantId>" },
  "preferTags": ["nis2"],              // appended before recipe preferTags
  "length": "standard"
}
```

## 5. Resolution rules (the assembly engine)

Pure function: `resolve(content, recipe, overrides) → ResolvedCV`. Deterministic:
same input, same output. No database access inside.

1. **Modules**: `overrides.moduleOrder` if given, else recipe order. Modules not in the recipe are not rendered.
2. **Entries**: not archived, not in `excludeEntries`. If the module has `includeTags`, keep entries where the entry *or any of its items* has one of them. Drop entries with an `excludeTags` tag. Order: `position`, then `sort_key` descending. Truncate to `maxEntries`.
3. **Items**: not archived, not in `excludeItems`, same tag filters. Rank by number of matching `preferTags` (desc), then `position`. Truncate to `maxItemsPerEntry`. Then add `includeItems` that belong to kept entries, even if over the limit.
4. **Variant choice** per entry/item, first match wins:
   1. `pinVariants`
   2. highest count of matching `preferTags` (override tags weigh before recipe tags), tie → preferred `length`
   3. preferred `length`
   4. `is_default`
   5. lowest `position`
5. An entry or item with **no variants** is rendered from its structured data only (e.g. a skill with no wording).
6. The result carries a `trace` (why each item was kept/dropped, which rule chose each variant) so the UI can explain "why is this bullet here?".

`ResolvedCV` is what templates receive and what snapshots store. Templates never
query the database.

## 6. Data isolation (replaces Postgres row-level security)

SQLite has no row-level security, so isolation is enforced in code:

- **One door**: all domain queries go through `src/lib/server/repo/`, which requires an `ownerId` for every call and adds `WHERE owner_id = ?` itself. Route handlers never import the Drizzle client directly (enforced by a lint rule).
- **Writes check parents**: creating an item/variant verifies the parent entry belongs to the same owner in the same transaction.
- **Tests**: every repo function has a test where user B tries to read/update/delete user A's rows and must get "not found" (never "forbidden" — do not leak existence).
- **Admin** reads of other users' content are not possible through the repo; admin screens only see invite codes, flags, feedback and user accounts.

## 7. GDPR hooks

- **Export**: one JSON document with profile, entries, items, variants, tags, categories, job targets and snapshot metadata. The schema above is the export format.
- **Delete account**: deletes the user row; every owned table cascades. Snapshot PDFs are removed from storage by the same job. Backups age out on their retention schedule (to be stated in the privacy notice).

## 8. Open questions for review

1. Is `headline` a module (with variants per category), or a profile field? Current choice: module.
2. Should categories be able to inherit from another category (e.g. "Audit" = "Governance" + extra rules)? Current choice: no, copy the recipe; revisit if recipes multiply.
3. Photo on CV: out of scope for v1 (also reduces bias concerns in EU hiring contexts).
