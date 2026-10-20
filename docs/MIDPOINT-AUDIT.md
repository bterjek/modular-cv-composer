# Midpoint code audit — 19 October 2026

The code contains genuine unused helpers, dormant features and duplicated logic. The largest issue is the coexistence of two active CV workflows. This audit makes no application or database changes.

## Scope and verification

- Repository-wide reference scan of source, scripts and browser tests; runtime import graph covering 136 non-test source files, including route files and styles.
- Manual tracing of imports, reconciliation, library editing, saved CVs, both rendering paths, persistence, exports and shared helpers.
- Svelte check: zero errors and warnings. Unit/integration suite: 149 passed, seven skipped. Six skipped tests require Chromium configured; the seventh is an opt-in visual review. Browser regression tests were not rerun for this read-only audit.
- No clearly orphaned production feature file found. The one file outside the runtime import graph, `src/lib/domain/fixtures/ads.ts`, is used by term-extraction tests. Static references cannot prove every branch is useful; wildcard repository exports also make file reachability broader than actual function usage.

## Findings, in recommended order

### 1. Two active product workflows — high priority

The original route is library → categories/recipes → job overrides → resolved CV → snapshot/share link. The new route is import → reviewed library content → independent composition → measured classical export. Both remain in the main navigation. The library editor previews the original category/job output, rather than the imported saved CV the user may have just opened.

Evidence: `src/routes/edit/+layout.svelte`, `src/lib/server/repo/assembly.ts`, `src/lib/server/repo/snapshots.ts`, `src/lib/server/repo/imports.ts`, and the separate `/cv/render` and `/cv/composition/[id]` endpoints.

This is active duplication, not safely deletable dead code. Before task 5, establish compositions as the destination for the new editor. Keep the old workflow behind a clearly identified legacy area while existing categories/jobs can be copied across. `compositionDocumentFromCV()` in `src/lib/server/repo/library.ts` is already tested but has no production caller: it is a useful bridge waiting to be connected.

### 2. Module rules disagree between import, editing and rendering — high priority

`ENTRY_WORDINGS` in `src/lib/editor/fields.ts:75` disallows entry descriptions for credentials, skills and languages. Import approval can nevertheless create those descriptions. The library editor hides their wording controls at `src/routes/edit/content/entry/[id]/+page.svelte:55`. The old renderer omits skills/language entry prose (`src/lib/render/designs/shared.ts:62`); credential prose does render through its shared entry block, despite being hidden in the library editor. The new renderer preserves all entry prose.

Consequently imported content can exist and appear in Saved CVs but remain unavailable to edit in the library and disappear from old exports. Module field definitions, item capabilities and presentation rules are spread across domain schemas, editor metadata, importer branches and two renderers.

Consolidate content capabilities into the domain layer and align both editors with them. Share the interpretation of structured facts between renderers while allowing each template its own layout. Do not solve this by deleting imported descriptions.

### 3. Imported headers can print twice — high priority

`src/lib/domain/import.ts:109` copies role titles, organisations and dates into structured facts but also retains the same lines in the description. Education, project, credential and language parsing has similar overlap. The classical template prints facts and description separately, so an approved draft can repeat the same title or qualification. Opening name/contact text can also remain in an opening-details block while appearing in the profile.

Preserving the original source is correct. Duplicating it in displayed content is avoidable. Keep the original excerpt intact, but explicitly distinguish recognised header lines from the suggested description during review; uncertain lines must remain reviewable. This also prevents duplicated text consuming the two-page allowance.

### 4. Confirmed unused helpers and legacy placeholders — low risk cleanup

No callers were found in application code, tests or scripts for:

- `intOrUndefined` — `src/lib/server/editor.ts:18`.
- `activeSessionCount` — `src/lib/server/auth/session.ts:63`.
- `resetLimits` — `src/lib/server/auth/rate-limit.ts:19`.

`src/lib/server/import-extract.ts` also collects stderr without ever reporting or otherwise using its contents. Remove that buffer or give it a deliberate diagnostic purpose.

The `ai_runs` table and `ai.tailoring` flag are unused scaffolding, inconsistent with doing job comparison in external chat. `user.emailVerified`, `user.image` and `snapshots.pdfKey` likewise have no implemented feature using them. Remove the obsolete flag and plan any schema cleanup through a new migration after checking stored data. Never delete historical migrations as cleanup.

### 5. New model fields are only partly connected — track, do not delete

Item `facts` has repository support but neither the importer nor library forms currently populate it; imported bullets receive empty facts. Variant `targeting` is imported and used for reconciliation, but the old wording forms only expose legacy tags and length. These are implementation gaps around the intended shared-facts model, not redundant fields.

Composition update/delete methods are tested but have no application callers yet: they belong to the forthcoming editor. Composition `designKey` and `style` are persisted and accepted by the repository, but classical rendering and its cache only use the copied document. Those fields currently have no visual effect. Explicitly reserve them for task 7, or define a fixed-template contract until then; avoid presenting them as working options.

### 6. One page-limit rule has several definitions — small consolidation

`CLASSICAL_PAGE_LIMIT = 2` in `src/lib/render/classical.ts:8` has no callers. Pagination independently hardcodes two at `src/lib/server/render/paginate.ts:14`, `:68` and `:72`; export validation repeats it in `src/lib/server/render/classical.ts:30`. The composition route also calls `requireTwoPages()` before `classicalPDF()` repeats the check.

Pass the shared limit as an explicit argument into the browser-evaluated pagination function and use it consistently in validation/messages. The browser function is serialized, so it cannot simply close over an imported constant. Keep one clearly responsible export validation boundary.

### 7. Provenance repeats whole block excerpts — optional storage improvement

`src/lib/server/repo/imports.ts:102` attaches the entire block excerpt to every entry, entry wording, item and item wording reference. A block with a description and 20 bullets produces 42 copies of the same excerpt, on top of the original source text and import draft.

The individual lineage relationships are useful; the repeated excerpt bodies are not necessary. A shared source-block record referenced by those relationships would retain the evidence with less storage and smaller exports. This is a later optimisation, not a reason to remove provenance now.

### 8. Supporting duplication and stale guidance — low priority

- Browser tests 8–10 repeat DOCX ZIP creation, upload and result-checking setup. Extract fixture/setup helpers while preserving the separate behavioural assertions.
- Content, assembly and library repositories each implement their own validation-error adapter. A small common helper would reduce inconsistent messages; avoid a broader repository-framework rewrite.
- `/cv/render` constructs response headers/downloads that substantially overlap `src/lib/server/render/respond.ts`. Reuse the common response helper, extending it for the old clickable preview's explicit script policy.
- The editor's entire route tree is gated by `editor.dos-shell` in `src/routes/edit/+layout.server.ts`, coupling access to importing/saved CVs with the optional DOS presentation. Separate editor access from the eventual skin setting.
- README still announces all seven original steps complete; editor help and function keys explain the old category/job process. Update them to the current eight-task redesign and show which areas are transitional.

## Copies that should remain

The independent composition document is deliberate: a saved CV must survive library edits and deletions. Alternative wordings with different targeting are also deliberate, even when their text matches. Retained original files, extracted text and reviewed drafts serve different purposes. Immutable snapshots and their stored HTML preserve already-created outputs. Migration snapshots are generated migration history, not duplicate application implementations.

Authentication, account export/deletion, backups, font handling and the shared Chromium worker remain active infrastructure. Old designs and share routes are still needed for existing functionality until it is explicitly retired.

## Recommended next step

Do a bounded consolidation before extending task 5: remove the three unused helpers, align module capabilities, resolve duplicated import header suggestions, connect the existing conversion helper and give the new editor a single composition-based path. Keep compatibility with existing data. Then complete tasks 5–8 against that path, retire old assembly screens deliberately, and remove their dependencies only once their callers and migration needs are gone.

Additional unrelated defect noticed during the audit: account export omits category `style` in `src/lib/server/repo/account.ts:32`, although the database stores it and rendering uses it. Include it in any subsequent export-completeness fix.

## Consolidation implemented — 20 October 2026

- Moved wording/item capabilities into the domain module definition and enabled optional descriptions for every structured section. Existing editor imports re-export those shared rules.
- Preserved skills and language descriptions in all five legacy designs as well as the classical composition template.
- New import suggestions omit recognised role/education/project/credential/language header lines from duplicate prose, retaining the exact original excerpt. Uncertain date ranges remain in the suggested text. Existing approved CVs and saved drafts are not rewritten; opening contact/profile text remains reviewable.
- Connected the tested composition conversion helper through an explicit Copy to Saved CVs action. It resolves the owner's category/job on the server, validates links and saves an independent copy. The editor now opens Saved CVs by default; old assembly is labelled legacy.
- Removed the three unused helpers, unused extraction stderr buffer and obsolete AI flag from the registry; historical database fields and migrations are preserved.
- Passed the shared page limit into browser pagination and removed the repeated PDF validation at the route boundary.
- Included category style in account exports and updated README/help/AI-flag guidance.

Deferred deliberately: database-column/table removal, provenance storage restructuring, full retirement of old assembly/rendering, shared fact-presentation refactoring, test-helper extraction, and the remaining editor/style/chat work. These require either data migration or the remaining redesign tasks; they are not claimed complete by this cleanup.

Verification after consolidation: Svelte check zero errors/warnings; 157 tests passed and one opt-in visual test skipped; production build passed; all 163 browser assertions passed across the complete regression suite. Tests cover the new legacy-to-composition copy, unchanged source content, editable skill descriptions, reconciliation, authentication and matching preview/PDF pagination. Build and test-generation steps were run sequentially for the final verified build. No deployment or migration of the existing user database was performed.
