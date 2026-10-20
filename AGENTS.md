# Test records

The user requires all tests and their results to be saved under `tests/<full-git-commit-sha>/` for each commit.

- Keep executable tests in their normal source locations. Archive copies of test definitions, fixtures and runner configuration alongside the results.
- Use a distinct run subfolder so later runs do not overwrite earlier results.
- Retain the actual command output and machine-readable results where supported. Record commands, passed/failed/skipped counts, skip reasons, date and commit SHA.
- Clearly identify uncommitted working-tree runs under their base commit, using a run name ending in `working-tree`; never describe them as tests of the clean commit. Record the working-tree status.
- After creating a commit, record its actual SHA and archive subsequent verification under that SHA. Do not create commits merely to name a test folder.
- Keep failures and skipped results as well as successes. Never replace missing execution evidence with invented logs. Label summaries transcribed from prior runs explicitly.
- Exclude real CVs, originals, credentials, cookies, databases, server bootstrap logs and other personal or secret material from archived results. Use synthetic fixtures.
- Do not run build and test/config-generation steps concurrently: they share generated SvelteKit files and can produce mismatched client/server assets.

Historical test snapshots under `tests/` are records, not additional executable suites. Do not edit them as application test sources.
