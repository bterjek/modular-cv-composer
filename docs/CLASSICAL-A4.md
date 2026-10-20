# Classical A4 template

Open **Editor → Saved CVs**, then choose a CV. Its Classical A4 preview shows physical page boundaries, page numbers, the measured page count and export readiness.

The template is deliberately fixed: single column, Source Serif 4, 11 pt body text, 18 mm top/bottom and 19 mm side margins, restrained title-case headings and ordinary lists. A CV may use one or two pages. Font size and spacing do not change to force a fit.

## Two-page limit

Chromium lays out the actual copied composition with embedded fonts. It then moves content onto explicit A4 sheets, keeps headings with following content where possible and splits oversized paragraphs/bullets safely. Preview, standalone HTML and PDF use the same paginated content. Exports include embedded fonts and do not depend on the editor's DOS styling.

When content reaches page three, the preview retains it and highlights the later sheets. A list identifies the section, entry or bullet that extends past the target. Both normal HTML and PDF export are blocked until the CV is at most two pages and has no unresolved layout overflow. Nothing is silently dropped, clipped or reduced to small print.

The composition editor is available beside the measured preview. Save local changes to refresh its page count. The content inspector and source links remain available; editing the shared library does not rewrite a saved composition. To resolve overflow, shorten wording, choose shorter alternatives or remove less relevant content. The template never automatically shrinks text.

## What this renders

This workflow renders the composition's own profile, sections, structured facts, wording and selected items in their saved order. It does not reassemble the CV from the current library. Multiple headlines and prose attached to skills/credentials/languages are retained. Source references, database identifiers and editor scripts are not included in the output.

Classical A4 is the fixed baseline. Reference templates now provide explicitly selected supported style choices using this same measured renderer; see [COMPOSER.md](COMPOSER.md). Existing category designs and frozen snapshots continue using their original renderer. Reference files may be retained and adapted into reusable styles; automatic arbitrary-document layout cloning is not implemented.

## Operations and privacy

- Chromium must be available (`CHROMIUM_PATH` in local development; installed in the container).
- Rendering is offline and runs inside the existing bounded browser queue. Preview and downloads contain no executable script.
- Every endpoint checks the saved CV's owner. PDF export also checks the existing `render.pdf` feature flag and rate limit.
- Layout results are cached in memory for up to 60 seconds per owner/content/template revision, with at most 10 entries. Composition changes create a new key. Nothing is written into the user's CV or library by layout/export.
- A preview failure leaves the saved-content inspector available. Extremely large compositions are refused rather than truncated (500,000 serialized characters or a 50-page preview).

## Verification

Tests measure real A4 geometry and content bounds, compare HTML/PDF page counts, verify readable extracted accented text, preserve oversized prose character-for-character and block overlong exports. Browser coverage exercises importing → saved CV preview → HTML/PDF download, feature gating, overflow feedback, ownership and unchanged saved content.
