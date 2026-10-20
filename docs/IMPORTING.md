# Importing an existing CV

Open **Editor → Import CVs**, choose a PDF or Word `.docx` file, then select **Upload and review**. The original file is retained, and a review draft is created. No library content changes until approval.

## Review

Compare the suggestions with the original download and the source text shown under each block. Correct the section, title, organisation, dates and wording. Bullets/skills are editable one per line. Exclude unwanted blocks, split wording after its first line, or add a new block. Save incomplete drafts whenever needed.

Credential kind/issuer and language level require review. Year-only dates are not silently converted to January. Unclassified opening details and unfamiliar content remain visible as custom blocks. Profile import is optional; an existing library profile is never overwritten by approval. Enter a name and valid email to include a profile copy in the composition.

Optional target roles, competencies and keywords describe this CV's intended emphasis. Mark their basis as unspecified, inferred or confirmed. They are not automatic ATS scores.

**Approve and add to library** validates all included blocks, creates or reuses reusable entries/wordings according to your reconciliation choices, adds source references, and saves the composition in source order. Approval is atomic and cannot duplicate the same import on retry. Existing library facts are not overwritten. Phase 3 adds [reviewed reconciliation](RECONCILIATION.md); phase 4 adds Classical A4 preview/export, and composition editing follows in phase 5. Imported library entries are immediately available in the current content editor.

The full extracted text is available under **Correct extracted text and rebuild suggestions**. Paste corrected text there for scans or poor PDF reading order; rebuilding replaces review blocks. Original bytes and originally extracted text remain unchanged as provenance.

## Limits and storage

- PDF and DOCX only; up to 4 MB. PDF maximum: 30 pages.
- Local text extraction using unpdf/PDF.js and Mammoth, in a subprocess with a 20-second timeout and bounded memory/output. No AI provider is contacted.
- OCR is not included. Text order in columns/tables and missing glyphs need review. Damaged/password-protected documents may be refused.
- At most two simultaneous extractions. DOCX archives are checked for declared expanded size (20 MB) and entry count before extraction.
- The server accepts up to 200,000 extracted characters. Individual text blocks also have validation limits. Oversized/complex drafts are refused with a visible error, not silently truncated.
- Originals are stored in SQLite, included in database backups, and included as base64 in account export along with drafts and metadata. Account/source deletion cascades to original bytes. Removing an original/import does not delete approved library entries or compositions.
- Downloads require the owner's session and are served as attachments. Original documents are never embedded or executed in the app.

The container sets `BODY_SIZE_LIMIT=6M` for multipart overhead. Set the same environment variable when starting the built Node server directly. Configure any reverse proxy to allow at least this request size.

## Verification

Unit/integration coverage exercises actual PDF/DOCX extraction, invalid files, conservative parsing, owner isolation, byte preservation, review/approval transactions, retries, profile protection, export and deletion. `e2e/step8-import.mjs` exercises Word upload → corrected draft → original download → approval → account export in a browser.

Extractor references: [unpdf](https://github.com/unjs/unpdf), [Mammoth](https://github.com/mwilliamson/mammoth.js).

Uploads and review pages are available only while `editor.dos-shell` is enabled for the account, like the existing editor. Originals remain private even when public snapshot sharing is enabled.

## PDF reading order

PDF imports recover top-to-bottom text positions rather than trusting the file's drawing order. Separate recognised section headings on the same row create independent column regions, so certificates are not interleaved with education/languages. Date/title columns are read together; `Job title | Organisation` headers are recognised, including additional and undated experience. Dates that are not present in the source remain for review.

This is still a conservative suggestion, not a guarantee of perfect reconstruction for arbitrary layouts. Review the source excerpt and the original PDF. Existing review drafts are not silently re-extracted or replaced when the parser changes. Upload the original again to produce a fresh draft using the new PDF reading order; reparsing an old extracted-text field does not recover the original geometry.
