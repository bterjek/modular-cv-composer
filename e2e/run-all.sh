#!/bin/bash
# Browser regression: starts a fresh production build for each script and runs it.
#   npm run build && CHROMIUM_PATH=/path/to/chromium e2e/run-all.sh
# Output (screenshots, downloads, logs) goes to e2e/out/.
set -u
cd "$(dirname "$0")/.."
: "${CHROMIUM_PATH:?Set CHROMIUM_PATH to a Chromium or Chrome binary}"
OUT="$PWD/e2e/out"; mkdir -p "$OUT"
PORT=3123; fails=0
for s in e2e/step*.mjs; do
	rm -rf "$OUT/data"
	APP_ENV=development ORIGIN=http://localhost:$PORT PORT=$PORT ADMIN_EMAIL=admin@example.test \
	OPERATOR_NAME="Test Operator" OPERATOR_CONTACT="privacy@example.test" APP_VERSION=e2e-test BACKUP_INTERVAL_HOURS=0 \
	DATABASE_PATH="$OUT/data/e2e.sqlite" node scripts/migrate.js > /dev/null
	APP_ENV=development ORIGIN=http://localhost:$PORT PORT=$PORT ADMIN_EMAIL=admin@example.test \
	OPERATOR_NAME="Test Operator" OPERATOR_CONTACT="privacy@example.test" APP_VERSION=e2e-test BACKUP_INTERVAL_HOURS=0 \
	DATABASE_PATH="$OUT/data/e2e.sqlite" node build > "$OUT/server.log" 2>&1 &
	pid=$!
	for i in $(seq 1 30); do curl -fs "http://localhost:$PORT/healthz" > /dev/null && break; sleep 0.5; done
	SERVER_LOG="$OUT/server.log" OUT="$OUT" node "$s" > "$OUT/$(basename "$s").log" 2>&1
	kill $pid; wait $pid 2>/dev/null
	p=$(grep -c '^PASS' "$OUT/$(basename "$s").log"); f=$(grep -c '^FAIL' "$OUT/$(basename "$s").log")
	crashed=$(grep -c 'Error' "$OUT/$(basename "$s").log")
	echo "$(basename "$s"): $p passed, $f failed"
	grep '^FAIL' "$OUT/$(basename "$s").log"
	[ "$f" -gt 0 ] || [ "$crashed" -gt 0 ] && fails=1
done
exit $fails
