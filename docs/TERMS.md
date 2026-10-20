# Job-ad terms and the gap log

Paste a job ad into a job (**Job ad text**). The app extracts the terms it asks for and compares them with your content.

- **Job page → Job ad terms**: each term with how often the ad mentions it and a status — **IN CV** (this CV says it),
  **LEFT OUT** (your content has it, this CV doesn't show it), **GAP** (nothing in your content), **N/A** (you marked it
  not applicable). **Apply suggestions** brings in bullets covering LEFT OUT terms and pins wordings that mention more
  ad terms. Everything it changes is ordinary job tailoring, so it can be undone there.
- **Terms & gaps** (menu): all terms across all your ads, ranked gaps-first by how many ads ask for them — the list of
  what to write (or learn) next. “write a bullet →” opens your latest role with a new bullet prefilled with the term.
- Only “N/A” marks are stored (`term_status`); terms are recomputed from the ad texts, so editing an ad updates everything.

## How extraction works (`src/lib/domain/terms.ts`)
Rule-based, no AI, nothing leaves the server:
1. A built-in vocabulary (~90 IT operations / service management / governance / security / cloud terms) with aliases,
   e.g. “ITIL v4”, “ITIL 4” → ITIL; “SLAs” → service level management; “CAB” → change management.
2. Acronyms as written (CMDB, BGP…), minus a stop list (IT, EU, EUR, ISO/IEC…).
3. Phrases ending in management / governance / operations / security / … (“capacity planning”, “IT service operations”),
   including lists like “incident, problem and change management”.
Matching is whole-word and case-insensitive; archived content never counts as coverage.
Before extraction: everything from a “What we offer / Benefits / How to apply / About us” heading on is dropped, the
job's company name is excluded, line breaks end phrases, and all-caps heading lines are not read as acronyms.

## Tuning
Tuned on three real ads (Nilfisk IT Security & Compliance Manager, Liferay Security Operations Manager, MOL E&P IT
Operations Manager), kept as fixtures in `src/lib/domain/fixtures/ads.ts`. Real ads are the best test set. Add missed terms or aliases to `VOCAB`, noise to `ACRONYM_STOP` / `PHRASE_STOP`, and a
case to `terms.test.ts`. Job comparison and rewording can be handled in external chat; a dedicated exchange workflow is planned in task 6 of the redesign.
