#!/usr/bin/env bash
# run-guards-extra.sh: the guard files that used to be run by hand (49, 50, 51, 53, 56, 63, 67, 68) and, since 2026-11-19, 95 (register A1), now run for
# every dataset. Called by run-guards.sh as its last step; can be run alone to add them to an existing run folder.
# Read-only. Which files run depends on the side databases given (matched by name) and on VOLUME_STAT.
# usage: run-guards-extra.sh <label> <alkemio_db> [side_db ...]
#   VOLUME_STAT  a listing of the file volume (see 68-c6-volume-xcheck.sh); file 68 runs only when it is set
#   BACKUP_DATE  the date of the backup, for file 68 (default: its own default)
# 67 writes names and e-mail addresses to runs/<label>/67-phase-admin-list.csv (mode 600): local only.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
label=${1:?usage: run-guards-extra.sh <label> <alkemio_db> [side_db ...]}; db=${2:?alkemio database}; shift 2
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
out="$here/runs/$label"; mkdir -p "$out"
run() { local n=$1; shift; "$@" > "$out/$n-$db.out" 2>&1; echo "$n: rc=$? lines=$(wc -l < "$out/$n-$db.out") errors=$(grep -c '^ERROR' "$out/$n-$db.out")"; }
run 49 $PSQL -d "$db" -X -f - < "$here/49-links-carrying-ids.sql"
run 50 $PSQL -d "$db" -X -f - < "$here/50-flow-allowed-values.sql"
run 67 "$here/67-phase-admin-list.sh" "$db" "$label"
run 95 $PSQL -d "$db" -X -f - < "$here/95-a1-policy-guard.sql"
run 97 $PSQL -d "$db" -X -f - < "$here/97-admin-down-rule.sql"
run 101 $PSQL -d "$db" -X -f - < "$here/101-move-signs.sql"
run 106 $PSQL -d "$db" -X -f - < "$here/106-list-shape-guard.sql"
run 111 $PSQL -d "$db" -X -f - < "$here/111-invitee-right-guard.sql"
run 118 $PSQL -d "$db" -X -f - < "$here/118-open-request-of-member-guard.sql"
run 121 $PSQL -d "$db" -X -f - < "$here/121-lead-without-member-guard.sql"
run 123 $PSQL -d "$db" -X -f - < "$here/123-subspace-visibility-guard.sql"
run 126 $PSQL -d "$db" -X -f - < "$here/126-space-plan-guard.sql"
run 127 $PSQL -d "$db" -X -f - < "$here/127-unmanaged-spaces-guard.sql"
run 128 $PSQL -d "$db" -X -f - < "$here/128-leftover-checks.sql"
for s in "$@"; do case "$s" in
  *kratos*)     run 51 "$here/51-login-binding-xcheck.sh" "$db" "$s";;
  *synapse*)    run 53 "$here/53-vc-binding-threads-xcheck.sh" "$db" "$s"; run 63 "$here/63-b2-chat-tree-xcheck.sh" "$db" "$s";;
  *filebackup*) run 56 "$here/56-c6-file-bytes-xcheck.sh" "$db" "$s"
                if [ -n "${VOLUME_STAT:-}" ]; then run 68 "$here/68-c6-volume-xcheck.sh" "$db" "$s" "$VOLUME_STAT" ${BACKUP_DATE:-}; else echo "68: skipped, VOLUME_STAT not set"; fi;;
esac; done
