# Browser regression tests

One script per build step, each against a fresh production build and an empty database
(the first-admin link is read from the server log). About 100 checks in total.

```sh
npm run build
CHROMIUM_PATH=/path/to/chromium-or-chrome npm run e2e
```

Screenshots, downloads and logs land in `e2e/out/` (git-ignored). Scripts use `playwright-core`
(already a dependency for PDF export), so no browser download happens.

| Script | Covers |
|---|---|
| step2-auth | first-admin link, invites (e-mail bound, forgiving input), roles, resets, logout, CSRF, CSP, last-admin rule |
| step3-assemble | example content, category vs. job CV, decision trace, 404 for foreign ids |
| step4-render | live preview + fonts in the sandboxed frame, HTML/PDF downloads, PDF flag, isolation |
| step5-editor | building a CV from scratch mostly by keyboard, live preview refresh, job tailoring, isolation |
| step6-snapshots | freeze, immutability, share links (headers, PDF, views, withdraw), export, account deletion |
| step7-feedback-designs | Classic design in preview, Shift+F1 feedback and admin triage, version stamp, error page |

Known: in ~10 full runs a second user's sign-up timed out twice; it never reproduced in isolation or in
the following runs. If it recurs, the step 5/6 logs print the page text (`SIGNUP-ALERT`) to show why.
