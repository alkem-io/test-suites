#!/usr/bin/env bash
# 87-distill-flow.sh: the whole flow as one command, with a backup at every state and one PASS or FAIL line per stage.
#   source backup -> guards -> copy only the valid rows -> verify -> BACKUP (copied state) -> repairs -> BACKUP
#   (repaired state) -> authorization reset (+ BACKUP) -> guards and summary -> access checks -> walks as users
# It replaces the steps that were run by hand on 2026-11-16. The source database is only read.
#
# usage: 87-distill-flow.sh <label> <source_db> <new distill_db> <kratos_db> [side_db ...]
#   label      names the run: runs/<label>-source/ (guards on the source) and runs/<label>/ (guards on the new database), runs/<label>/flow/ (everything else)
#   side_db    the other databases of the dataset (synapse, kratos, hydra, assistant, filebackup, wopi)
# env:
#   FROM=<stage>      start at this stage (source, copy, repairs, reset, guards, access, walk); earlier ones are skipped
#   ONLY=<stage>      run this stage alone
#   REPAIRS="..."     repair files, in order (default: the eight accepted ones and 94, 98, 99, 100: the rulings of the QA lead of 2026-11-19)
#   FREE_PLAN_RULED=yes   also run 125-space-free-plan-repair.sql (acceptance: ruled 2026-11-20; production: only after product has answered, see guard 126)
#   AGREED=<label>    whose agreed readings the summary compares with (default: this label; a new dataset has none
#                     and reports NO BASELINE until a person has read the run and saved it with --save-baseline)
#   WALK_USERS="id .." user ids for the application walk (file 78). Without it the walk stage is skipped
#   SKIP_RESET=1      go on without the reset when the server does not serve the new database (results then describe
#                     a state the application has not recalculated: for a dry run of the scripts only)
#   SWITCH_GATE=1     the run switches an environment (file 89). The reset stage then only writes the request and stops
#                     (exit 11) until a person has approved and switched; then stops (exit 12) until AFTER_RESET_DB
#                     names the restored backup taken after the reset on the environment. Later stages read that one.
#   VOLUME_ROOT       cluster run: every backup goes to the volume of its stage (file 88); the flow starts only when
#                     every volume is mounted and writable
#   VOLUME_STAT       passed on to the guards (file 68)
#
# The ONE step this script does not do: pointing the local server at the new database. The server reads
# DATABASE_NAME from its own .env, which is the QA lead's file. The reset stage stops with the exact instruction.
# Exit code: 0 all stages PASS, 1 a stage failed, 10 stopped for the server switch, 11 waiting for approval and switch by a person, 12 waiting for the backup after the reset.
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd); . "$here/lib-who.sh"
label=${1:?usage: 87-distill-flow.sh <label> <source_db> <new distill_db> <kratos_db> [side_db ...]}; src=${2:?source db}; new=${3:?new db}; kdb=${4:?login db}; shift 4; sides=("$@")
case "$new" in distill_*) ;; *) echo "refused: $new is not a distill_ database"; exit 2;; esac
REPAIRS=${REPAIRS:-45-b3-repair.sql 48-b4-repair.sql 52-c3-repair.sql 54-c4-repair.sql 57-c7-repair.sql 58-c8-repair.sql 60-b1-repair.sql 61-b2-repair.sql 94-a1-repair.sql 98-admin-list-repair.sql 99-a4-membership-repair.sql 100-a6-associate-repair.sql 105-member-lead-list-repair.sql 110-invitee-right-repair.sql 117-open-request-of-member-repair.sql 120-lead-without-member-repair.sql 122-subspace-visibility-repair.sql}
# 125 gives the free plan to top-level spaces with no plan. QA lead 2026-11-20: on PRODUCTION only after product has been asked (read guard 126 first). Off unless the run says so.
[ "${FREE_PLAN_RULED:-}" = yes ] && REPAIRS="$REPAIRS 125-space-free-plan-repair.sql"
run="$here/runs/$label"; out="$run/flow"; mkdir -p "$out"; log="$out/87-flow.out"   # flow outputs in flow/: the run folder itself holds guard outputs only; STAGES=(source copy repairs reset guards access walk)
started=0; rc_all=0
post=$new; [ -n "${SWITCH_GATE:-}" ] && [ -n "${AFTER_RESET_DB:-}" ] && post=$AFTER_RESET_DB   # after a switch the checks read the backup taken after the reset
want() { [ -n "${ONLY:-}" ] && { [ "$ONLY" = "$1" ]; return; }; [ -z "${FROM:-}" ] && return 0; [ "$FROM" = "$1" ] && started=1; [ $started -eq 1 ]; }
line() { printf '%-9s %-8s %s\n' "$1" "$2" "$3" | tee -a "$log"; [ "$2" = FAIL ] && rc_all=1; return 0; }
if [ -n "${VOLUME_ROOT:-}" ]; then "$here/88-cluster-volumes.sh" check | tee -a "$log"; [ "${PIPESTATUS[0]}" -eq 0 ] || { echo "refused: a volume is missing. Nothing started." | tee -a "$log"; exit 2; }; fi
echo "=== 87 flow $label: $src -> $new, $(date -u +%Y-%m-%dT%H:%MZ)" | tee -a "$log"

if want source; then
  "$here/run-guards.sh" "$label-source" "$src" "${sides[@]}" > "$out/87-source-guards.console" 2>&1
  [ -f "$here/66-baselines/$label-source.source.tsv" ] || "$here/66-guard-summary.py" "$label-source" --save-baseline > /dev/null
  s=$("$here/66-guard-summary.py" "$label-source" | tail -2 | tr '\n' ' ')
  "$here/66-guard-summary.py" "$label-source" --save-baseline --force > /dev/null     # the same-day reading the new database is compared with
  case "$s" in *"VERDICT: PASS"*) line source PASS "$s";; *) line source FAIL "$s";; esac
fi

if want copy; then
  python3 "$here/41-inline-body-scan.py" "$src" "$out/body-pairs.txt" > "$out/41-pairs-run.out" 2>&1
  python3 "$here/69-distill-copy.py" "$src" "$new" "$label" --pairs "$out/body-pairs.txt" > "$out/69-copy.out" 2>&1; c=$?
  python3 "$here/70-distill-verify.py" "$src" "$new" "$label" > "$out/70-verify.out" 2>&1; v=$?
  python3 "$here/71-distill-row-compare.py" "$src" "$new" "$label" > "$out/71-rows.out" 2>&1; r=$?
  "$here/83-snapshot.sh" take "$new" copied-state >> "$log"
  d="copy rc $c, verify rc $v, row compare rc $r; $(grep -h -i -m1 'V1' "$out/70-verify.out" | cut -c1-110)"
  [ $c -eq 0 ] && [ $v -eq 0 ] && [ $r -eq 0 ] && ! grep -q '^ERROR\|Traceback' "$out/69-copy.out" "$out/70-verify.out" "$out/71-rows.out" && line copy PASS "$d" || { line copy FAIL "$d"; exit 1; }
fi

if want repairs; then
  "$here/83-snapshot.sh" need "$new" before-repairs >> "$log"
  # shellcheck disable=SC2086
  "$here/74-apply-repairs.sh" "$label" "$new" $REPAIRS > "$out/74-repairs.out" 2>&1
  a=$(grep -c '^APPLIED' "$out/74-repairs.out"); st=$(grep -c '^STOPPED' "$out/74-repairs.out"); n=$(echo $REPAIRS | wc -w)
  "$here/83-snapshot.sh" take "$new" repaired-state >> "$log"
  [ "$a" -eq "$n" ] && [ "$st" -eq 0 ] && line repairs PASS "$a of $n repair files applied, each in its own transaction" || { line repairs FAIL "$a applied, $st stopped of $n: see $out/74-repairs.out"; exit 1; }
fi

if want reset && [ -n "${SWITCH_GATE:-}" ]; then
  # an environment is switched (file 89): the kit stops here. A person approves, switches, runs the reset there and hands back a backup.
  [ -f "$out/89-switch-record.tsv" ] || "$here/89-switch-gate.sh" request "$label" "$new" >> "$log" 2>&1 || { line reset FAIL "no switch request could be written: see $log"; exit 1; }
  g=$("$here/89-switch-gate.sh" check "$label" 2>&1) || { line reset STOPPED "$g. The switch is asked first and made by a person: $out/89-switch-request.md"; exit 11; }
  [ -n "${AFTER_RESET_DB:-}" ] || { line reset STOPPED "$g. Now waiting for the backup taken after the reset: restore it as a distill_ database and set AFTER_RESET_DB"; exit 12; }
  case "$AFTER_RESET_DB" in distill_*) ;; *) echo "refused: $AFTER_RESET_DB is not a distill_ database"; exit 2;; esac
  polrows() { echo "copy (select id, md5(coalesce(\"credentialRules\"::text,'') || coalesce(\"privilegeRules\"::text,'')) from authorization_policy order by id) to stdout" | PSQL_Q "$1"; }
  polrows "$new" > "$out/89-policies-before.tsv"; polrows "$AFTER_RESET_DB" > "$out/89-policies-after.tsv"
  ch=$(join -t$'\t' -a1 -a2 -e MISSING -o 0,1.2,2.2 "$out/89-policies-before.tsv" "$out/89-policies-after.tsv" | awk -F'\t' '$2!=$3' | wc -l)
  "$here/83-snapshot.sh" take "$AFTER_RESET_DB" after-reset >> "$log"
  line reset PERSON "$g; policies whose rules differ between the loaded file and the state after the reset: $ch"
elif want reset; then
  served=${ALK_DB:-$(grep -E '^\s*DATABASE_NAME=' "${SERVER_DIR:-$HOME/repos/server}/.env" | tail -1 | sed 's/.*=//')}
  if [ "$served" != "$new" ] || [ "${DISTILL_DB:-distill_acc_repaired}" != "$new" ]; then
    if [ -n "${SKIP_RESET:-}" ]; then line reset SKIPPED "the server serves '$served', not $new: no reset ran (dry run of the scripts)"; else
      line reset STOPPED "the two repairs that need a reset (moved files, role definitions) are NOT in effect yet"
      cat <<MSG | tee -a "$log"
    To go on:
      1. in the server .env set  DATABASE_NAME=$new  and restart the server
      2. in $here/stack/distill-overlay.yml replace the database name by $new and run stack/distill-stack-on.sh
      3. FROM=reset $0 $label $src $new $kdb ${sides[*]}
MSG
      exit 10; fi
  else
    "$here/86-auth-reset.sh" "$new" "$kdb" "$label/flow" > "$out/86-console.out" 2>&1; r=$?
    d=$(grep -h 'queue peak\|rules the reset changed' "$out/86-reset.out" 2>/dev/null | tr -s ' ' | tr '\n' ';' | cut -c1-200)
    if [ $r -eq 0 ] && grep -q 'error or exception: NOT COUNTED' "$out/86-reset.out"; then line reset OPEN "$d; worker errors NOT COUNTED: an operator must read the worker logs"
    else [ $r -eq 0 ] && grep -q 'error or exception: 0 ' "$out/86-reset.out" && line reset PASS "$d" || { line reset FAIL "rc $r $d (see $out/86-console.out)"; exit 1; }; fi
  fi
fi

if want guards; then
  "$here/run-guards.sh" "$label" "$post" "${sides[@]}" > "$out/87-guards.console" 2>&1
  s=$("$here/66-guard-summary.py" "$label" --mode distilled --source "$label-source" --baseline "${AGREED:-$label}" | tail -2 | tr '\n' ' ')
  "$here/66-guard-summary.py" "$label" --mode distilled --source "$label-source" --baseline "${AGREED:-$label}" --only FAIL,OPEN,"NO BASELINE",UNDECIDED,MOVED > "$out/66-for-a-person.out" 2>&1
  case "$s" in *"VERDICT: PASS"*) line guards PASS "$s";; *) line guards FAIL "$s (lines in $out/66-for-a-person.out)";; esac
fi

if want access; then
  python3 "$here/access_model.py" --self-test > "$out/85-selftest.out" 2>&1; t=$?
  python3 "$here/access_model.py" --digest "$post" "$out/85-model-digests.tsv" >> "$out/85-selftest.out" 2>&1
  node "$here/85-server-function-xcheck.mjs" "$post" "$out/85-model-digests.tsv" > "$out/85-xcheck.out" 2>&1; x=$?
  python3 "$here/75-access-full-compare.py" "$src" "$post" > "$out/75-access.out" 2>&1; c=$?
  d="model self-test rc $t; model against the server's own function: $(grep -h VERDICT "$out/85-xcheck.out" | tr -s ' '); $(grep -h -o 'rights GAINED: [0-9]*\|rights LOST: [0-9]*' "$out/75-access.out" | tr '\n' ' ')(every gain and loss is listed in 75-access.out for a person)"
  [ $t -eq 0 ] && [ $x -eq 0 ] && [ $c -eq 0 ] && line access PASS "$d" || line access FAIL "$d"
fi

if want walk; then
  if [ -z "${WALK_USERS:-}" ]; then line walk SKIPPED "WALK_USERS not set"; else
    bad=0; n=0
    for u in $WALK_USERS; do n=$((n+1)); e=$(who_email "$post" "$u"); [ -n "$e" ] || { bad=$((bad+1)); continue; }
      python3 "$here/73-access-model-export.py" "$post" "$out/73-model-user$n.json" "$e" > "$out/73-user$n.out" 2>&1
      node "$here/78-user-access-walk.mjs" "$kdb" "$e" "$out/73-model-user$n.json" "$out/walk-user$n" > "$out/78-user$n.out" 2>&1 || bad=$((bad+1))
      m=$(grep -o '"mismatches":[0-9]*\|"notAsTheDatabaseSays":[0-9]*\|"accepted":[0-9]*' "$out/78-user$n.out" | cut -d: -f2 | awk '{s+=$1} END{print s+0}'); [ "${m:-1}" = 0 ] || bad=$((bad+1)); done
    "$here/83-snapshot.sh" diff "$post" > "$out/83-after-walk.out" 2>&1
    grep -q 'tables that differ: 0' "$out/83-after-walk.out" || bad=$((bad+1))
    [ $bad -eq 0 ] && line walk PASS "$n user(s): application equals the database model on every object, every attempt without the right refused, database equal to its backup afterwards" || line walk FAIL "$bad problem(s): see 78-user*.out and 83-after-walk.out in $out"
  fi
fi
# cluster run (file 88): the result gets its own volume, and the volumes of the finished stages are listed
if [ -n "${VOLUME_ROOT:-}" ] && [ -z "${ONLY:-}" ] && [ $rc_all -eq 0 ]; then "$here/83-snapshot.sh" take "$post" final-state >> "$log"; "$here/88-cluster-volumes.sh" inventory > "$out/88-volumes.out" 2>&1; fi
echo "=== 87 flow done: $([ $rc_all -eq 0 ] && echo 'no stage failed' || echo 'A STAGE FAILED')" | tee -a "$log"
"$here/83-snapshot.sh" list "$post" | sed 's/^/    backup: /' | tee -a "$log"
exit $rc_all
