# Reconciling CV imports

Import another CV and review its blocks under **Editor → Import CVs**. Each block now has **Match with your library**. Suggestions explain shared identity fields or wording overlap; they do not apply a merge.

## Entry decisions

- **A separate library entry** keeps the imported role, qualification or section distinct. This is the default, including for old drafts.
- **Reuse** attaches incoming wording and source references to an existing entry in the same section. Existing facts, tags, archive state, order and default wordings are preserved.
- Different dates, titles, issuers, credential kinds, language levels and other structured fields appear side by side. Correct the imported fields, keep a separate entry, or explicitly choose **Use the library facts in this CV**. That decision affects structured fields only; inspect dates/numbers in prose too.
- If selected library facts changed since review, **Review current library facts** resets the choice for confirmation. Deleted/archived targets must be selected again or restored.

Suggestions use local rules: organisation, institution, credential name/issuer, other identifying fields, dates and token overlap. They are not AI judgements or ATS scores. The selector also exposes other active entries of the same section for manual matching. Save the draft after changing factual fields to refresh suggestions.

## Achievements and skills

For a reused entry, each incoming bullet has its own decision:

- **Automatic** reuses an unambiguous identical wording on an active existing item. Otherwise it creates a new achievement.
- **Always create a separate achievement** preserves a distinct fact even if its wording matches.
- **Reuse** a chosen achievement to add an alternative wording. Numerical differences require checking that both wordings accurately describe the same achievement, or keeping them separate. Contradictory claims should be corrected rather than confirmed. Suggestions expose overlap and numerical differences; users still need to assess meaning and evidence.

Matching is tied to incoming text and position. Editing or reordering a bullet resets its decision rather than attaching unrelated text to an old selection. Text and targeting are checked together: equivalent wording/emphasis reuses its variant; different wording or emphasis is stored as a non-default alternative. The first wording of a previously unworded fact becomes its initial default.

## Saved CVs and provenance

Approval remains one transaction and is safe to retry. Validation/ownership/conflict errors leave library content and earlier compositions unchanged. Every occurrence retains source references to its own original CV.

**Saved CVs** lists approved compositions. Open one to inspect its copied facts, selected wording and order, and follow links to its original import and shared library entries. Changes to the library never rewrite those saved copies. Phase 4 adds the Classical A4 preview/export; document editing follows in phase 5.

This phase reconciles content while approving imports. It does not destructively consolidate already-approved duplicate library entries, modify earlier snapshots, or automatically decide that similar claims are the same fact. A subsequent import can enrich the shared library while retaining its own composition.

## Storage and tests

Decisions are optional fields in existing import-draft JSON. No new SQL migration is needed; previous drafts remain valid. Decisions are included in the existing account export/deletion lifecycle.

Tests cover explained suggestions, conflicting/missing dates, ambiguity, alternative wording/emphasis, default preservation, source lineage, separate selection/order, numerical confirmation, stale or deleted targets, cross-owner/wrong-parent references, transaction rollback, retries and browser approval of two CVs sharing one role.
