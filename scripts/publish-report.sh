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

# ── Organize report ──────────────────────────────────────────────────────────
mkdir -p out
mkdir -p "$REPORT_DIR"
cp -r "$REPORT_SOURCE"/* "$REPORT_DIR/"

# ── Run metadata ─────────────────────────────────────────────────────────────
cat > "$REPORT_DIR/runinfo.txt" <<EOF
Run ID: $RUN_ID
Date: $RUN_DATE
Branch: $GITHUB_REF
Commit: $GITHUB_SHA
$DISPLAY_NAME outcome: ${TEST_OUTCOME:-unknown}
EOF

echo "$GITHUB_SHA" > "$REPORT_DIR/commit.txt"
echo "${GITHUB_REF_NAME:-unknown}" > "$REPORT_DIR/branch.txt"

if [ "${TEST_OUTCOME:-}" = "success" ]; then
  echo "passed" > "$REPORT_DIR/status.txt"
else
  echo "failed" > "$REPORT_DIR/status.txt"
fi

# ── Suite summary index ──────────────────────────────────────────────────────
INDEX="$SUITE_DIR/index.html"

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

# ── Top-level index ──────────────────────────────────────────────────────────
TOP_INDEX="$PAGES_ROOT/index.html"
cat > "$TOP_INDEX" << 'EOF'
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

# ── Commit to gh-pages ───────────────────────────────────────────────────────
cd out

if [ ! -d .git ]; then
  git init
  git checkout -b gh-pages
  git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
else
  git checkout gh-pages || git checkout -b gh-pages
fi

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git add -A
git commit -m "Update $SUITE_NAME report: ${RUN_DATE}/${RUN_ID}" || echo "No changes to commit"
git push origin gh-pages
