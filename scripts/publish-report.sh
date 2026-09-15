#!/usr/bin/env bash
set -euo pipefail

# Publish a test report to GitHub Pages (gh-pages branch).
#
# Usage: publish-report.sh <suite-name> <display-name> <report-source-dir> <test-outcome>
#
#   suite-name        — folder name on gh-pages (e.g. "server-api", "playwright")
#   display-name      — human-readable label for HTML pages (e.g. "Server API", "Playwright")
#   report-source-dir — local path containing the HTML report to publish
#   test-outcome      — "success" or "failure" (from the test step outcome)
#
# Expects env vars set by the workflow / GitHub Actions:
#   RUN_DATE, RUN_ID, GITHUB_SHA, GITHUB_REF, GITHUB_REF_NAME,
#   GITHUB_TOKEN, GITHUB_REPOSITORY

SUITE_NAME="$1"
DISPLAY_NAME="$2"
REPORT_SOURCE="$3"
TEST_OUTCOME="$4"

PAGES_ROOT="out/gh-pages-root"
SUITE_DIR="$PAGES_ROOT/$SUITE_NAME"
REPORT_DIR="$SUITE_DIR/$RUN_DATE/$RUN_ID"

# Stage the report outside `out` so the resync-and-retry loop below can hard-reset
# the gh-pages working tree without throwing the report away.
STAGE_DIR="${RUNNER_TEMP:-/tmp}/publish-report-$SUITE_NAME-$RUN_ID"

PUSH_ATTEMPTS=5

# ── Stage report ─────────────────────────────────────────────────────────────
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp -r "$REPORT_SOURCE"/* "$STAGE_DIR/"

# If the report has no index.html (e.g. Vitest uses report_<timestamp>.html),
# copy the report file as index.html so the directory URL works.
if [ ! -f "$STAGE_DIR/index.html" ]; then
  REPORT_HTML=$(find "$STAGE_DIR" -maxdepth 1 -name "*.html" | head -1)
  [ -n "$REPORT_HTML" ] && cp "$REPORT_HTML" "$STAGE_DIR/index.html"
fi

# ── Run metadata ─────────────────────────────────────────────────────────────
cat > "$STAGE_DIR/runinfo.txt" <<EOF
Run ID: $RUN_ID
Date: $RUN_DATE
Branch: $GITHUB_REF
Commit: $GITHUB_SHA
$DISPLAY_NAME outcome: ${TEST_OUTCOME:-unknown}
EOF

echo "$GITHUB_SHA" > "$STAGE_DIR/commit.txt"
echo "${GITHUB_REF_NAME:-unknown}" > "$STAGE_DIR/branch.txt"

if [ "${TEST_OUTCOME:-}" = "success" ]; then
  echo "passed" > "$STAGE_DIR/status.txt"
else
  echo "failed" > "$STAGE_DIR/status.txt"
fi

# ── Index generation ─────────────────────────────────────────────────────────
# Rebuilt from whatever is on disk *after* each resync, so a report pushed by
# another suite's run mid-flight still shows up in the regenerated listing.
write_indexes() {
  local INDEX="$SUITE_DIR/index.html"

  cat > "$INDEX" <<EOF
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>$DISPLAY_NAME Nightly Reports</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; line-height: 1.4; }
      h1 { margin: 0 0 12px 0; }
      h2 { margin: 20px 0 8px 0; }
      ul { margin: 0 0 12px 0; }
    </style>
  </head>
  <body>
    <h1>$DISPLAY_NAME nightly results</h1>
    <p><a href="../">Back to main index</a></p>
EOF

  for dateDir in $(ls -1 "$SUITE_DIR" | sort -r); do
    [ "$dateDir" = "index.html" ] && continue
    [ -d "$SUITE_DIR/$dateDir" ] || continue
    echo "<h2>$dateDir</h2>" >> "$INDEX"
    echo "<ul>" >> "$INDEX"

    for runDir in $(ls -1 "$SUITE_DIR/$dateDir" | sort -r); do
      [ -d "$SUITE_DIR/$dateDir/$runDir" ] || continue

      status="unknown"
      [ -f "$SUITE_DIR/$dateDir/$runDir/status.txt" ] && \
        status=$(tr -d '\n\r' < "$SUITE_DIR/$dateDir/$runDir/status.txt")

      shaShort="unknown"
      [ -f "$SUITE_DIR/$dateDir/$runDir/commit.txt" ] && \
        shaShort=$(tr -d '\n\r' < "$SUITE_DIR/$dateDir/$runDir/commit.txt" | cut -c1-7)

      branchName="unknown"
      [ -f "$SUITE_DIR/$dateDir/$runDir/branch.txt" ] && \
        branchName=$(tr -d '\n\r' < "$SUITE_DIR/$dateDir/$runDir/branch.txt")

      icon="❔"
      [ "$status" = "passed" ] && icon="✅"
      [ "$status" = "failed" ] && icon="❌"

      echo "  <li>$icon <a href=\"$dateDir/$runDir/\">test $runDir ($shaShort - $branchName)</a></li>" >> "$INDEX"
    done

    echo "</ul>" >> "$INDEX"
  done

  cat >> "$INDEX" << 'EOF'
  </body>
</html>
EOF

  cat > "$PAGES_ROOT/index.html" << 'EOF'
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Alkemio Test Reports</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 24px; line-height: 1.4; }
      h1 { margin: 0 0 12px 0; }
      ul { margin: 0 0 12px 0; }
    </style>
  </head>
  <body>
    <h1>Alkemio Test Reports</h1>
    <ul>
      <li><a href="playwright/index.html">Playwright nightly results</a></li>
      <li><a href="server-api/index.html">Server API results</a></li>
    </ul>
  </body>
</html>
EOF
}

# ── Prepare gh-pages worktree ────────────────────────────────────────────────
mkdir -p out

if [ ! -d out/.git ]; then
  git -C out init
  git -C out checkout -b gh-pages
  git -C out remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
else
  git -C out checkout gh-pages || git -C out checkout -b gh-pages
fi

git -C out config user.name "github-actions[bot]"
git -C out config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# ── Commit to gh-pages ───────────────────────────────────────────────────────
# The gh-pages checkout is taken at job start, but a nightly can run for hours —
# long enough for the other suite's run to push in the meantime, which made the
# push a non-fast-forward and lost the whole report (run 34447510124). Resync to
# the remote tip and rebuild on top of it before every attempt.
for attempt in $(seq 1 "$PUSH_ATTEMPTS"); do
  if git -C out fetch --depth=1 origin gh-pages; then
    git -C out reset --hard FETCH_HEAD
  else
    echo "No remote gh-pages branch yet — publishing the first commit."
  fi

  # Untracked files survive the reset, but re-copy so a partially staged retry
  # can't leave a half-written report behind.
  mkdir -p "$REPORT_DIR"
  cp -r "$STAGE_DIR"/* "$REPORT_DIR/"
  write_indexes

  git -C out add -A
  git -C out commit -m "Update $SUITE_NAME report: ${RUN_DATE}/${RUN_ID}" || echo "No changes to commit"

  if git -C out push origin gh-pages; then
    echo "Published $SUITE_NAME report ${RUN_DATE}/${RUN_ID} to gh-pages (attempt $attempt)."
    exit 0
  fi

  echo "Push rejected (attempt $attempt/$PUSH_ATTEMPTS) — resyncing with origin/gh-pages and retrying."
  sleep $((attempt * 5))
done

echo "Failed to publish $SUITE_NAME report after $PUSH_ATTEMPTS attempts." >&2
exit 1
