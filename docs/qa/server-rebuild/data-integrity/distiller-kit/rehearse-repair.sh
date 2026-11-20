#!/usr/bin/env bash
# rehearse-repair.sh: try one repair on a dataset and keep nothing of it.
#
# The repair file runs inside one transaction. The whole classifier (script 30)
# then runs on the repaired state inside the same transaction, and the
# transaction ends in ROLLBACK. The script proves four things:
#   1. the repair file's own checks (rules at zero, only the intended columns
#      and rows changed, repaired rows have the shape of untouched rows);
#   2. no other rule or guard moved: the classifier output on the repaired
#      state is compared line by line with the output on the untouched state;
#   3. which tables the transaction wrote, and how many rows;
#   4. nothing was kept: a fingerprint of the dataset before and after is equal.
#
# usage: rehearse-repair.sh <label> <alkemio_db> <repair.sql>
# env:   PSQL  psql command prefix, without -d
#              default: docker exec -i alkemio_dev_postgres psql -U synapse
# The repair file names the tables it writes in a line "-- touches: a,b,c".
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
label=${1:?usage: rehearse-repair.sh <label> <alkemio_db> <repair.sql>}
db=${2:?alkemio database name}
repair=${3:?repair sql file}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
name=$(basename "$repair" .sql)
out="$here/runs/$label/rehearsal-$name"; mkdir -p "$out"
touches=$(grep -m1 '^-- touches:' "$repair" | sed 's/^-- touches: *//; s/ //g')
[ -n "$touches" ] || { echo "the repair file has no '-- touches:' line"; exit 2; }

fingerprint() {
  {
    echo "SELECT table_name||' rows '||(xpath('/row/c/text()', query_to_xml('select count(*) c from public.'||quote_ident(table_name), false, true, '')))[1]::text FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;"
    for t in ${touches//,/ }; do
      echo "SELECT '$t md5 '||coalesce(md5(string_agg(md5(x::text), '' ORDER BY x.id)), 'empty') FROM public.\"$t\" x;"
    done
  } | $PSQL -d "$db" -X -At
}

fingerprint > "$out/before.fp" 2>&1
( echo '\echo === classifier start'; cat "$here/30-architect-classifier-reconstruction.sql" "$here/46-rule-summary.sql" ) \
  | $PSQL -d "$db" -X > "$out/baseline.out" 2>&1
echo "baseline: rc=$? lines=$(wc -l < "$out/baseline.out")"
( echo 'BEGIN;'; cat "$repair"; echo '\echo === classifier start'
  cat "$here/30-architect-classifier-reconstruction.sql" "$here/46-rule-summary.sql"
  echo '\echo === rows written by this transaction, per table (temporary tables left out)'
  echo "SELECT relname, n_tup_ins ins, n_tup_upd upd, n_tup_del del FROM pg_stat_xact_user_tables WHERE schemaname='public' AND n_tup_ins+n_tup_upd+n_tup_del>0 ORDER BY 1;"
  echo 'ROLLBACK;' ) | $PSQL -d "$db" -X > "$out/rehearsal.out" 2>&1
echo "rehearsal: rc=$? lines=$(wc -l < "$out/rehearsal.out") rolled_back=$(grep -c '^ROLLBACK' "$out/rehearsal.out")"
fingerprint > "$out/after.fp" 2>&1
if cmp -s "$out/before.fp" "$out/after.fp"; then echo "KEPT NOTHING: fingerprint equal before and after ($(wc -l < "$out/before.fp") lines)"; else echo "FINGERPRINT DIFFERS: the dataset changed, stop and look"; diff "$out/before.fp" "$out/after.fp" | head; fi
grep -l "ERROR\|unterminated" "$out"/*.out && echo "errors in the outputs above"
# everything the classifier and its guards print, untouched state against repaired state
awk 'f; /^=== classifier start/{f=1}' "$out/baseline.out" > "$out/classifier-untouched.txt"
awk '/^=== rows written by this transaction/{f=0} f; /^=== classifier start/{f=1}' "$out/rehearsal.out" > "$out/classifier-repaired.txt"
# order inside a section, psql notices and bare command tags do not count (47-output-diff.py)
python3 "$here/47-output-diff.py" "$out/classifier-untouched.txt" "$out/classifier-repaired.txt" > "$out/classifier.diff"
echo "$(tail -1 "$out/classifier.diff") (every moved line, by guard section: $out/classifier.diff)"
echo "--- rule summary lines that differ (< untouched, > repaired)"
diff <(awk '/^=== rule summary done/{f=0} f; /^=== rule summary \(/{f=1}' "$out/classifier-untouched.txt") <(awk '/^=== rule summary done/{f=0} f; /^=== rule summary \(/{f=1}' "$out/classifier-repaired.txt") | grep '^[<>]'
echo "--- the repair file's own output"
awk '/^=== classifier start/{exit} 1' "$out/rehearsal.out"
echo "--- tables written inside the transaction"
awk '/^=== rows written by this transaction/{f=1} f' "$out/rehearsal.out"
