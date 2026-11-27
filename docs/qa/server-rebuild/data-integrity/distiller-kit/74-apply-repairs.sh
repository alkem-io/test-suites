#!/usr/bin/env bash
# 74-apply-repairs.sh: APPLY repair files to a distilled database. Unlike rehearse-repair.sh this COMMITS.
# Each file runs in its own transaction with ON_ERROR_STOP: a stop inside the file (RAISE EXCEPTION) or any
# error aborts that file's transaction and nothing of it is kept. The next file still runs.
# Refuses any database whose name does not start with distill_. Take a backup first: this script does not.
# usage: 74-apply-repairs.sh <label> <distill_db> <repair.sql> [<repair.sql> ...]
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
label=${1:?usage: 74-apply-repairs.sh <label> <distill_db> <repair.sql>...}; db=${2:?database}; shift 2
case "$db" in distill_*) ;; *) echo "refused: $db is not a distill_ database"; exit 2;; esac
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
out="$here/runs/$label"; mkdir -p "$out"
for f in "$@"; do
  name=$(basename "$f" .sql); log="$out/apply-$name.out"
  { echo '\set ON_ERROR_STOP 1'; echo 'BEGIN;'; cat "$here/$f"; echo
    echo '\echo === rows written by this transaction, per table (temporary tables left out)'
    echo "SELECT relname, n_tup_ins ins, n_tup_upd upd, n_tup_del del FROM pg_stat_xact_user_tables WHERE schemaname='public' AND n_tup_ins+n_tup_upd+n_tup_del>0 ORDER BY 1;"
    echo 'COMMIT;'; echo '\echo === committed'; } | $PSQL -d "$db" -X > "$log" 2>&1
  rc=$?
  if [ $rc -eq 0 ] && grep -q '^=== committed' "$log"; then echo "APPLIED  $name"; awk '/^=== rows written by this transaction/{f=1;next} /^COMMIT/{f=0} f' "$log" | grep '|' | grep -v relname | sed 's/^/           /'
  else echo "STOPPED  $name (nothing of it was kept): $(grep -m1 'ERROR' "$log" | cut -c1-200)"; fi
done
