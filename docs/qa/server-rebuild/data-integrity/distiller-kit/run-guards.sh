#!/usr/bin/env bash
# run-guards.sh: run the per-finding guards, the owner split, the reject closure scan, the inline body scan
# and (since 2026-11-17, through run-guards-extra.sh) the files 49, 50, 51, 53, 56, 63, 67, 68
# against one dataset. Read-only: temp tables only, nothing is written to
# the databases.
#
# usage: run-guards.sh <label> [alkemio_db] [side_db ...]
#   label     names the output folder: runs/<label>/
#   side_db   the other databases of the same dataset (synapse, kratos, ...)
# env:
#   PSQL      psql command prefix, without -d
#             default: docker exec -i alkemio_dev_postgres psql -U synapse
#   SCOPE     comma-separated orphan tables for the closure scan; default all
#   BLOB_DIR  folder of blobs fetched with 43-fetch-blobs.sh; when set, the
#             bodies held in file storage are read too (script 43)
#
# example (acceptance backups of 2026-11-11, restored locally):
#   ./run-guards.sh acc-2026-11-11 alkemio acc_synapse acc_kratos acc_hydra acc_assistant acc_filebackup acc_wopi
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
label=${1:?usage: run-guards.sh <label> [alkemio_db] [side_db ...]}
db=${2:-alkemio}
shift; [ $# -gt 0 ] && shift
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
out="$here/runs/$label"; mkdir -p "$out"
main="$out/30-38-$db.out"
cat "$here/30-architect-classifier-reconstruction.sql" "$here/40-owner-split.sql" "$here/38-reject-closure-scan.sql" \
  | $PSQL -d "$db" -X ${SCOPE:+-v scope="$SCOPE"} > "$main" 2>&1
echo "$db: rc=$? lines=$(wc -l < "$main") done=$(grep -c '^=== closure scan done' "$main")"
grep -A3 'closure scan VERDICT' "$main" | sed -n '2,4p'
grep -A3 'owner split VERDICT' "$main" | sed -n '2,4p'
# live whiteboard / memo bodies naming a rejected id (needs /tmp/closure-ids.txt from the run above)
pairs=$(mktemp)   # ids of the hits, for script 42 only; removed at the end
PSQL="$PSQL" python3 "$here/41-inline-body-scan.py" "$db" "$pairs" > "$out/41-$db.out" 2>&1
grep 'inline body scan VERDICT' "$out/41-$db.out" || tail -2 "$out/41-$db.out"
# blobs behind the file rows against the off-site backup ledger (needs the filebackup side database)
for s in "$@"; do case "$s" in *filebackup*)
  PSQL="$PSQL" python3 "$here/42-blob-ledger-check.py" "$db" "$s" "$pairs" > "$out/42-$db.out" 2>&1
  grep -A1 'blob ledger VERDICT' "$out/42-$db.out" || tail -2 "$out/42-$db.out";; esac; done
rm -f "$pairs"
# bodies that live in file storage: only when BLOB_DIR points at a folder of fetched blobs (see 43-fetch-blobs.sh)
if [ -n "${BLOB_DIR:-}" ]; then
  PSQL="$PSQL" python3 -I "$here/43-file-store-body-scan.py" scan "$BLOB_DIR" "$db" > "$out/43-$db.out" 2>&1
  grep 'file store body scan VERDICT' "$out/43-$db.out" || tail -2 "$out/43-$db.out"
else
  echo "43 file store body scan: skipped, BLOB_DIR not set (stored whiteboard, memo and office document bodies not read)"
fi
for s in "$@"; do
  $PSQL -d "$s" -X < "$here/39-reject-closure-scan-side.sql" > "$out/39-$s.out" 2>&1
  echo "$s: rc=$? ids|columns_with_refs|refs = $(grep -E "^ *$s +\|" "$out/39-$s.out" | cut -d'|' -f2- | tr -d ' ')"
done
# A10: who is still joined on the chat server to rejected rooms (needs /tmp/a10-members.txt from script 39 on the synapse side)
for s in "$@"; do case "$s" in *synapse*)
  $PSQL -d "$db" -X < "$here/44-a10-chat-server-members.sql" > "$out/44-$db.out" 2>&1; echo "44 chat server members: rc=$?";; esac; done
# the guard files that used to be run by hand
"$here/run-guards-extra.sh" "$label" "$db" "$@"
echo "output in $out (contains counts only; /tmp/closure-ids.txt holds the ids on the psql machine)"
