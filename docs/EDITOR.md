# The editor

Build step 5. Keyboard-first, DOS-style editor at `/edit`, behind the `editor.dos-shell`
feature flag during testing. Three panes: menu · editor · live preview.

## Keys
| Key | Does |
|---|---|
| F1 | Help (Esc closes) |
| F2 or Ctrl+S | Save the form you are in (or the page's main form) |
| F3 · F4 · F8 · F9 | Content · Job categories · Jobs · Profile |
| ↑ ↓ Home End | Move through menus and lists; Enter opens |

Every key also exists as a clickable button in the bottom bar. F5–F7 and F10–F12 are left
alone on purpose: browsers reserve them (reload, address bar, caret browsing, menu, full screen, devtools).

## What is where
- **Profile** — name, contact, up to five links (https only; `javascript:` and other schemes are rejected at save, not just hidden at render).
- **Content → section** — list in CV order (↑/↓ buttons set a manual order), add form. The first wording is written with the entry.
- **Entry page** — structured fields, entry tags, the entry's wordings (headline, summary, role description) and its bullets/skills. Each bullet has its own tags (**whether** it is used) and one or more wordings with their own tags (**which** wording is used). Archive keeps content out of every CV without deleting it.
- **Job categories** — the recipe as one table: tick sections, number them, optional title, limits, “only” and “never” tags; preferred tags and length on top; design; duplicate.
- **Jobs** — details (company, role, link, ad text, status) and tailoring: extra preferred tags, length, section positions, and for every entry and bullet the current **IN/OUT with the reason**, a leave-out switch, auto/always/never per bullet, and a wording pin where there is more than one.

## Live preview
The right pane renders the selected job or category through the same renderer as the downloads.
Its URL carries a content revision (`contentRevision()` — counts and last-change times of everything that affects a CV),
so it reloads after every save and only then. The choice is remembered per browser (cookie scoped to `/edit`).
“Why?” opens the Assemble page with the full decision trace.

## Conventions in the code
- Pages talk to `src/lib/server/repo` only (boundary test); `attempt()` in `src/lib/server/editor.ts` turns validation errors into a status message and foreign ids into 404.
- Form ↔ JSON conversions for recipes and overrides are pure functions in `src/lib/editor/forms.ts` with their own tests.
- Deletes sit behind a `<details>` disclosure instead of browser confirm dialogs.
