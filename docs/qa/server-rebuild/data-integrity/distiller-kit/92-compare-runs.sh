#!/usr/bin/env bash
# 92-compare-runs.sh: do two distiller runs give the same result? (asked by the CTO and the CEO, 2026-11-18)
#
#   92-compare-runs.sh in-pod <db_a> <db_b>     inside the runner pod: compare two distilled databases table by table.
#                                               Used by "90-acc-switch.sh <run> again": the SAME source distilled twice.
#   92-compare-runs.sh runs <run_a> <run_b>     on the workstation: compare the collected reports of two runs
#                                               (runs/<run>/result, written by "90-acc-switch.sh <run> collect").
#
# What "the same" means, and what is reported apart:
#   level 1  every row of the table equal, every column
#   level 2  equal once the time columns are left out (a repair that adds a row stamps it with the time of the run)
#   level 3  equal once time columns AND the id are left out (a repair that adds a row gives it a new random id)
#   DIFFERENT anything else. One DIFFERENT table makes the verdict FAIL.
# Reads only. Prints counts and table names, never row content.
set -euo pipefail
mode=${1:?usage: 92-compare-runs.sh in-pod <db_a> <db_b> | runs <run_a> <run_b>}
here=$(cd "$(dirname "$0")" && pwd)

if [ "$mode" = in-pod ]; then
  a=${2:?db a}; b=${3:?db b}; q() { psql -X -q -AtF'|' -v ON_ERROR_STOP=1 -d "$1" -c "set timezone to 'UTC'" -c "$2"; }
  tables=$(q "$a" "select tablename from pg_tables where schemaname='public' order by 1"); tb=$(q "$b" "select tablename from pg_tables where schemaname='public' order by 1")
  [ "$tables" = "$tb" ] || { echo "VERDICT: FAIL, the two databases do not have the same tables"; exit 1; }
  fp() { # db table level -> count|md5
    local drop=""; if [ "$3" -ge 2 ]; then drop=$(q "$1" "select coalesce(string_agg(' - '||quote_literal(column_name), ''),'') from information_schema.columns where table_schema='public' and table_name='$2' and data_type like 'timestamp%'"); fi
    [ "$3" -ge 3 ] && drop="$drop - 'id'"
    if [ "$3" -eq 1 ]; then q "$1" "select count(*)||'|'||coalesce(md5(string_agg(h,'' order by h)),'-') from (select md5(t::text) h from \"$2\" t) x"
    else q "$1" "select count(*)||'|'||coalesce(md5(string_agg(h,'' order by h)),'-') from (select md5((to_jsonb(t)$drop)::text) h from \"$2\" t) x"; fi; }
  n=0; l1=0; l2=0; l3=0; bad=0; echo "=== 92 same source distilled twice: $a against $b, $(date -u +%Y-%m-%dT%H:%MZ)"
  for t in $tables; do n=$((n+1)); x=$(fp "$a" "$t" 1); y=$(fp "$b" "$t" 1)
    if [ "$x" = "$y" ]; then l1=$((l1+1)); continue; fi
    ca=${x%%|*}; cb=${y%%|*}
    if [ "$(fp "$a" "$t" 2)" = "$(fp "$b" "$t" 2)" ]; then l2=$((l2+1)); printf '    %-44s rows %s / %s   equal apart from time columns\n' "$t" "$ca" "$cb"; continue; fi
    if [ "$(fp "$a" "$t" 3)" = "$(fp "$b" "$t" 3)" ]; then l3=$((l3+1)); printf '    %-44s rows %s / %s   equal apart from time columns and generated ids\n' "$t" "$ca" "$cb"; continue; fi
    bad=$((bad+1)); printf '    %-44s rows %s / %s   DIFFERENT\n' "$t" "$ca" "$cb"; done
  echo "tables $n: fully equal $l1, equal apart from time columns $l2, equal apart from time columns and generated ids $l3, DIFFERENT $bad"
  if [ $bad -eq 0 ]; then echo "VERDICT: PASS, the same source gives the same result twice"; else echo "VERDICT: FAIL, $bad table(s) differ in content"; exit 1; fi
  exit 0
fi

[ "$mode" = runs ] || { echo "unknown mode $mode" >&2; exit 2; }
ra=${2:?run a}; rb=${3:?run b}; A="$here/runs/$ra/result"; B="$here/runs/$rb/result"
for d in "$A" "$B"; do [ -d "$d" ] || { echo "refused: $d does not exist. Run: ./90-acc-switch.sh <run> collect" >&2; exit 2; }; done
fa="$A/kit/runs/$ra/flow"; fb="$B/kit/runs/$rb/flow"
echo "=== 92 two runs side by side: $ra | $rb"
echo; echo "--- stage results"
for st in source copy repairs reset guards access; do printf '  %-8s %-50s | %s\n' "$st" "$(grep -E "^$st +" "$fa/87-flow.out" | tail -1 | cut -c11-58)" "$(grep -E "^$st +" "$fb/87-flow.out" | tail -1 | cut -c11-58)"; done
echo; echo "--- rows rejected by the copy"
printf '  %s\n  %s\n' "$(grep -m1 'reject set' "$fa/69-copy.out" | sed 's/^--- //')" "$(grep -m1 'reject set' "$fb/69-copy.out" | sed 's/^--- //')"
acc() { awk '/row accounting per table/{p=1; next} p && /^    [a-z_]/ && $1!="table" && $1!="all" && $1!="tables" && $2 ~ /^[0-9]+$/{print $1"\t"$2"\t"$3"\t"$4} p && /^---/{p=0}' "$1" | sort; }
acc "$fa/69-copy.out" > /tmp/92a.$$; acc "$fb/69-copy.out" > /tmp/92b.$$
echo "  tables where source, kept or rejected counts differ between the runs: $(join -t$'\t' /tmp/92a.$$ /tmp/92b.$$ | awk -F'\t' '$2!=$5||$3!=$6||$4!=$7' | wc -l) of $(wc -l < /tmp/92a.$$)"
join -t$'\t' /tmp/92a.$$ /tmp/92b.$$ | awk -F'\t' '$2!=$5||$3!=$6||$4!=$7{printf "    %-40s source %s / %s   kept %s / %s   rejected %s / %s\n",$1,$2,$5,$3,$6,$4,$7}' | head -40
rm -f /tmp/92a.$$ /tmp/92b.$$
echo; echo "--- repairs (rows touched per repair file)"
if diff -q "$fa/74-repairs.out" "$fb/74-repairs.out" > /dev/null; then echo "  equal"; else echo "  differ:"; diff "$fa/74-repairs.out" "$fb/74-repairs.out" | grep '^[<>]' | cut -c1-110 | head -30 | sed 's/^/    /'; fi
echo; echo "--- same source distilled twice inside each run (level of equality)"
for r in "$ra:$A" "$rb:$B"; do f="${r#*:}/volumes/reports/92-again.out"; printf '  %-22s %s\n' "${r%%:*}" "$( [ -f "$f" ] && { grep -E '^tables ' "$f" | tail -1; grep -E '^VERDICT' "$f" | tail -1; } | tr '\n' ' ' || echo 'not run')"; done
echo; echo "--- time, seconds"
ta="$A/timing.tsv"; tb2="$B/timing.tsv"
if [ -f "$ta" ] && [ -f "$tb2" ]; then join -t$'\t' -a1 -a2 -e '-' -o 0,1.4,2.4 <(sort "$ta") <(sort "$tb2") | sort -t$'\t' -k1,1 | awk -F'\t' '{printf "  %-26s %8s | %8s\n",$1,$2,$3}'
else echo "  no timing file for one of the runs (only runs made with 91-acc-timed-run.sh have one)"; fi
echo; echo "Read: the second run starts from the result of the first plus whatever acceptance did in between (the reset, and any use)."
echo "It is 'the same' when it rejects nothing new and its repairs touch nothing. Differences listed above are for a person."
