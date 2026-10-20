# CV library foundation

Phase 1 adds the data and repository operations for importing and composing CVs. Phase 2 now adds upload/review screens (see [IMPORTING.md](IMPORTING.md)); composition editing is now available (see [COMPOSER.md](COMPOSER.md)). Existing editor, assembly, rendering and snapshots continue to work.

## Content and emphasis

- An entry holds a shared role, qualification or other structured fact.
- An item holds one achievement/skill and can now carry a neutral `facts` statement independently of its wordings. This statement records user-supplied facts; it is not automatic verification.
- A variant holds alternative wording, existing selection tags and new `targeting` metadata: `roleFamilies`, `competencies`, `keywords`, `basis`, `notes`.
- `basis` is `unspecified`, `inferred` or `confirmed`. Imported emphasis should remain inferred until reviewed. Keywords describe positioning, not an ATS guarantee.
- Existing selection tags continue to drive the assembly engine. Targeting does not silently change selection.

`createItem` / `updateItem` accept `facts`. `createVariant` / `updateVariant` accept `targeting`; omitting metadata in ordinary edits preserves it.

## Sources

`createSourceDocument`, `listSourceDocuments`, `deleteSourceDocument` manage filename, media type, SHA-256, optional extracted text and targeting context. File upload, byte storage and parsing are implemented in phase 2. The SHA-256 must be calculated from the source bytes by that importer; this layer validates its format only.

`addSourceReference` and `listSourceReferences` preserve source excerpt/location for exactly one entry, item or variant. The source and target must belong to the same requesting user. Multiple documents can reference the same fact or wording. Deleting a source removes its references, never the content it helped establish.

## Saved compositions

`createComposition`, `getComposition`, `listCompositions`, `updateComposition`, `deleteComposition` manage independently editable CVs. `compositionDocumentFromCV` copies an existing resolved category/job CV into the new document shape.

The document has schema version 1, a copied profile and ordered sections/entries/items. It preserves selected text and structured facts, with optional library IDs for lineage. Array order records the CV's actual selection and order. Null IDs allow new content written directly into a composition.

A composition's copies are authoritative: library updates/deletions cannot change them, and composition updates cannot write back to the library. New lineage links are ownership-checked and must match their parent/section. Existing dangling links can remain historical provenance after library deletion. A deleted source clears the composition source link without deleting the composition. Design and style are stored separately from content. Snapshots remain immutable records of exported/sent CVs.

Phase 2 adds reviewed imports. Phase 3 adds reviewed reconciliation and a Saved CVs content view. Phase 4 adds measured Classical A4 composition preview/export. The earlier assembler can explicitly copy selected output into Saved CVs. Destructive consolidation of historical duplicates remains outside this workflow.

## Migration and verification

Migration `0006_striped_grandmaster.sql` adds three tables and two columns. Existing item facts default to an empty string; existing wording targeting defaults to empty lists and `unspecified`. No existing IDs, wordings, tags, recipes, job tailoring or snapshot output are rewritten. No source or intent is invented for old content.

The normal startup migration applies it on deployment. Phase 1 development does not modify the operator's database. A regression test builds the previous schema with representative saved content, applies the migration and compares every pre-existing column. Repository tests verify ownership, provenance, document isolation, partial updates, account export and account deletion.

Account exports include `library.sources`, `library.references`, `library.compositions`, plus item facts and variant targeting in the existing content payload. All new owned rows cascade when an account is deleted.
