# Saved CV workflow (redesign tasks 5–8)

## Edit a CV

Open **My CVs**. Import an existing CV or give a new CV a name and select **Create CV**. Add sections and either write new entries or select entries from the shared library. Edit contact details, facts and descriptions, choose alternative library wordings, and add, reorder or remove sections, entries and bullets.

**Save CV** (also F2 / Ctrl+S) saves this copy and refreshes its measured preview. Unsaved changes are marked and leaving prompts you to save first. A stale browser window cannot overwrite a newer saved version. The preview fits beside the editor on larger screens; the underlying A4 page geometry stays unchanged.

Edits do not alter library facts or another CV. **Duplicate CV** makes another independent copy. To reuse something newly written, save first, then expand **Copy saved content to the shared library**. This explicitly creates a new library entry rather than replacing shared facts. Library wordings support role, competency and keyword emphasis; achievements have a separate neutral facts field.

Deletion requires typing DELETE. Deleting a saved CV does not delete its library content or original import. Classical A4 remains the default; exports are blocked above two pages or on unresolved horizontal overflow. Content is never automatically removed or shrunk to fit.

## Compare or tailor in chat

From a CV, open **Compare or tailor in chat**. Download the text instructions/context or JSON bundle and attach it to your chosen chat client with the job description. The bundle includes this CV and active shared-library entries, their facts, wordings and targeting metadata. It excludes authentication details and original file bytes, but does contain your personal CV/contact information. Sharing is a deliberate action you perform outside the app; there is no AI API key, automatic external request or numerical ATS score.

For a proposed revision, the chat returns `cv-composer/chat@1` JSON using the included example. Paste it into the review screen, inspect the returned profile, facts, sections and bullets, then accept it as a new CV. Invalid structure/dates/links are rejected. Database relationship IDs from external content are discarded. Neither review nor acceptance overwrites the original CV or shared library. You remain responsible for reviewing factual and numerical claims.

## Reuse a reference style

From a CV, open **Choose a template**. Apply a saved template or attach a PDF/DOCX reference and choose supported font, text size, spacing, alignment, colour, section lines, bullets and margins. An optional chat workflow describes the reference using those same supported choices; paste its style JSON, preview, and save/apply.

The uploaded document is retained as a visual reference, not automatically reverse-engineered. This is a reviewed translation into supported single-column A4 styles. Arbitrary columns, graphics, exact custom fonts and arbitrary uploaded HTML/CSS are not implemented. Template creation does not import reference content into the career library. Preview does not save or apply anything; reselect an attached file after preview before saving it.

Applied style choices are copied into each CV. Editing content, deleting a reusable template, or later applying the template elsewhere cannot change a previous CV. Classical A4 is always available to reset styling. The same measured pagination/export rules apply to every supported style. Text-size choices are explicit readable presets, never an automatic fit-to-page operation.

**Templates** lists reusable styles and offers owner-only original downloads. Unused reference bytes are cleaned up when their template is deleted; account export/deletion includes templates and references.

## Navigation and appearance

The main path is My CVs → Import CVs / shared library / Templates. Categories, jobs, term matching and snapshots remain under **Earlier assembly tools** for compatibility. The earlier assembler can copy selected output to Saved CVs. Existing frozen snapshots retain their original HTML/design.

Simple appearance is the default for new accounts; the DOS toggle changes only the app interface. The historical `editor.dos-shell` flag now supplies a default appearance for existing accounts, not permission to edit CVs. F3 opens library content, F4 saved CVs, F8 imports, F9 profile; F1 shows help.

## Verification records

`npm run check`, `npm test` and `npm run e2e` retain their test definitions, raw outputs and results in `tests/<full-base-commit-sha>/<timestamp[-working-tree]>/`. `npm run verify` runs sync, type checking, unit/integration tests, build and browser regression sequentially. Set `CHROMIUM_PATH` to a local Chrome/Chromium binary for browser/PDF coverage. A working-tree archive identifies its base commit and is not presented as a test of that clean commit. The optional visual-export helper requires VISUAL_OUT and is explicitly skipped otherwise. Archive directories are excluded from source type checking and the container context.

Migration 0008 adds only the reusable-template table. Development verification uses isolated databases; it does not migrate the operator's existing database or rebuild/deploy their container.
