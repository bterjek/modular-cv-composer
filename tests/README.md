# Test history

Test definitions and verification results are archived at:

`tests/<full-git-commit-sha>/<run-name>/`

Each run contains a snapshot of its tests, results and identification of the tested state. Uncommitted runs are labelled `working-tree` and grouped under their base commit; they do not certify that clean commit.

The initial archive captures the midpoint consolidation results from 20 October 2026. Its README identifies which raw logs were available and which totals were recorded from the completed chat session.

Use `npm run verify` for sync → type check → automated tests → production build → browser regression, with CHROMIUM_PATH set. `npm run check`, `npm test`, and `npm run e2e` also archive their own results. Configuration snapshots use `.snapshot` where needed to avoid accidental discovery as live configuration. Test history is excluded from source type checking and container builds.

The complete tasks 5–8 run is `e72cf4c0ec89781f76bf7aeed08b483a44830985/2026-10-20T06-11-36-201Z-working-tree/README.md`. It retains 170 passed automated tests, one optional visual skip, all 184 browser checks and synthetic screenshots.
