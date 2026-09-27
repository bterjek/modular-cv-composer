# Rendering: designs, preview, HTML and PDF

Build step 4. One template per design produces every output, so the preview is
exactly what gets downloaded.

```
ResolvedCV ──► renderDocument(cv, design, fonts) ──► one standalone HTML document
                                                      ├─ preview  (iframe, fonts from this server)
                                                      ├─ .html    (fonts embedded, works offline)
                                                      └─ .pdf     (the .html printed by Chromium, A4)
```

## Designs
- Live in `src/lib/render/designs/`, registered in `src/lib/render/index.ts`.
- A design is `{ key, name, description, fonts, css, render(cv) }`; the section logic is shared (`designs/shared.ts`), a design only supplies its look and entry layout. The server embeds or links exactly the font families a design lists (`src/lib/server/render/fonts.ts`). `render` builds HTML with the `h` template tag
  (`src/lib/render/html.ts`), which escapes every interpolated value — there is no way to insert raw user text.
- Links are rendered only for `http`, `https` and `mailto` URLs.
- Credentials are labelled from their `kind` field (Course / Certification / …), never guessed from the name.
- Unknown design keys fall back to `modern`.

### `classic`
Serif (Source Serif 4, latin + latin-ext, 400/600/400 italic), centred header, title-case headings with a rule, no colour.
Small caps were tried and dropped: synthesised small caps extract as “P rofile”, and lower-cased headings extract lower-case.

### `modern`
Single column, A4, Inter (SIL OFL 1.1, latin + latin-ext subsets, 400/600/700), one accent colour.
Chosen for applicant tracking systems too: real text, one column, standard section names,
no layout tables. Checked with `pdftotext`: headings and bullets extract as plain lines
(heading letter-spacing kept at 0.08em — wider values made extractors split words into letters).

## Safety of the output
- The document has its own CSP: no scripts, no external resources except the fonts.
- The preview iframe uses `sandbox="allow-same-origin"` without `allow-scripts`: fonts load, nothing runs.
- PDF rendering: the page's network is fully blocked, scripts are forbidden by CSP; Chromium runs
  with `--no-sandbox` because the container user lacks the namespaces its sandbox needs — acceptable
  only because of the two previous points.
- At most 2 PDF renders at a time, 20 s timeout, 30 exports per user per 10 minutes.

## Endpoint
`GET /cv/render?category=<id>|target=<id>&format=preview|html|pdf` — owner-scoped (another user's id gives 404).
PDF is behind the `render.pdf` feature flag during testing. Download names are ASCII
("Ádám — CV" → "Adam - CV"): in testing, Chromium ignored UTF-8 file names and saved as "download".

## Checks
- Unit: escaping, link filtering, CSP, labels, dates, file names (`src/lib/render/render.test.ts`).
- PDF: one A4 page, fonts embedded, network blocked, parallel renders (`src/lib/server/render/pdf.test.ts`,
  runs wherever Chromium exists — CI uses the runner's Chrome).
- Container: CI runs `scripts/pdf-smoke.js` inside the built image before publishing it.
- Visual review: `RENDER_OUT=<dir> CHROMIUM_PATH=<chromium> npx vitest run src/lib/server/demo.test.ts`
  writes the example CVs as HTML and PDF.
