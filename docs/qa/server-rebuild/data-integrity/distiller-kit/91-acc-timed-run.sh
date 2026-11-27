#!/usr/bin/env bash
# 91-acc-timed-run.sh: the whole distiller flow on ACCEPTANCE as ONE command, with the time of every step.
# Asked by the CTO and the CEO on 2026-11-18: (1) run the distiller twice and compare, (2) measure the flow, to
# estimate the freeze a production run needs. The person starts the run and is not needed again until it ends.
#
#   ./91-acc-timed-run.sh <run>             e.g. acc-2026-11-19-a, then acc-2026-11-19-b
#   SOURCE_DB=alkemio_before_<run> ./91-acc-timed-run.sh <run>    distil a database kept aside by an earlier switch instead of live
#   PRINT=1 ./91-acc-timed-run.sh <run>     show every command of every step, change nothing
#   ./92-compare-runs.sh runs <run_a> <run_b>   afterwards: the two runs side by side
#
# It runs, in this order, the same steps a person ran one by one on 2026-11-18 (file 90):
#   prepare, freeze, backup-to-pod, distil, approve, load, switch (starts the services again), start the reset,
#   wait for the reset, backup-after, checks, then OUTSIDE the freeze: distil the same source a second time and
#   compare (file 92), copy the reports to this workstation, delete the pod and its claims (disks are kept).
#
# THE RULE "the switch is asked first, approved, and made by a person" (QA lead, 2026-11-18) is kept in this form:
# a person starts this script at a terminal, reads what it will do, and types the run name. That one confirmation is
# recorded in the gate (file 89) as given in advance, and covers every step of THIS run, on acceptance only.
# Nothing in this script works against any other environment: the context is fixed in file 90.
#
# The reset is started with the browser session of a platform admin. The script asks for the session cookie once, at
# the start, without showing it. It is held in memory only: never printed, never written to a file, gone when the
# script ends. Without a cookie the script stops after the switch and waits until a person starts the reset by hand
# (the measured time then contains that wait, and the report says so).
#
# If a step fails BEFORE the switch, the services are started again on the unchanged database and the run stops.
# If a step fails AFTER the switch, nothing is undone: the way back is  ./90-acc-switch.sh <run> back  by a person.
# Exit: 0 all steps done, 1 a step failed, 4 not confirmed.
set -uo pipefail
run=${1:?usage: 91-acc-timed-run.sh <run>}; [[ "$run" =~ ^[a-z0-9-]+$ ]] || { echo "refused: run name"; exit 2; }
here=$(cd "$(dirname "$0")" && pwd); S="$here/90-acc-switch.sh"; state="$here/runs/$run/switch"; mkdir -p "$state"
[ -f "$here/acc.env" ] && . "$here/acc.env"; CTX=${ACC_CONTEXT:?set ACC_CONTEXT in acc.env (see acc.env.example)}; NS=${ACC_NAMESPACE:-default}; T="$state/timing.tsv"; LOG="$state/91-run.log"
k() { kubectl --context "$CTX" -n "$NS" "$@"; }
[ -n "${PRINT:-}" ] || { [ -t 0 ] && [ -t 1 ]; } || { echo "refused: a person starts this at a terminal"; exit 4; }
[ ! -s "$T" ] || [ -n "${PRINT:-}" ] || { echo "refused: run $run was started before ($T exists). Use a new run name."; exit 2; }
# Volumes: the 8 volumes of an earlier run are used again when they exist (QA lead, 2026-11-18: no new disks per run).
vo=${VOLUMES_OF:-$(k get pvc -l app.kubernetes.io/part-of=data-distiller -o jsonpath='{range .items[*]}{.metadata.labels.distiller/run}{"\n"}{end}' 2>/dev/null | sort -u | grep -v "^$run$" | head -1)}
sets=$(k get pvc -l app.kubernetes.io/part-of=data-distiller -o jsonpath='{range .items[*]}{.metadata.labels.distiller/run}{"\n"}{end}' 2>/dev/null | sort -u | grep -c . || true)
[ "$sets" -le 1 ] || [ -n "${VOLUMES_OF:-}" ] || { echo "refused: more than one set of distiller volumes exists. Name the one to use: VOLUMES_OF=<run> $0 $run"; exit 2; }
[ "${NEW_VOLUMES:-}" = 1 ] && vo=""
export VOLUMES_OF="$vo"; if [ -n "$vo" ]; then voltext="the 8 volumes of run $vo are used again (no new disk). Their content is kept under previous/. The pod of the earlier run is deleted."; endstep=release
else voltext="8 NEW volumes are created for this run."; endstep=cleanup; fi

srctext="the live database, as it is at the freeze"
if [ -n "${SOURCE_DB:-}" ]; then [[ "$SOURCE_DB" =~ ^alkemio_before_[a-z0-9_]+$ ]] || { echo "refused: SOURCE_DB must be a database kept aside by an earlier switch (alkemio_before_...)"; exit 2; }
  export SOURCE_DB; srctext="$SOURCE_DB, a database kept aside earlier. EVERYTHING DONE ON ACCEPTANCE SINCE THEN IS NOT IN THE NEW DATABASE (it stays in the kept live one)"; fi

cat <<B

 RUN $run on ACCEPTANCE, unattended, about one hour.

   SOURCE of the platform database: $srctext

   0. $voltext
   1. acceptance is FROZEN: every service that writes to the database is stopped. Users get errors.
   2. backups of the 7 databases are taken into a pod; the distiller makes the new database there
   3. the new database is loaded next to the live one and SWITCHED IN by two renames. The live one is kept.
   4. services start again; the authorization reset runs; a copy after the reset is checked
   5. after that, with acceptance in use again: the same source is distilled a second time and compared
   6. reports are copied here, the pod is deleted. The volumes stay for the next run.

 If a step fails before the switch, services are started again on the unchanged database.
 Way back after the switch, by a person:  ./90-acc-switch.sh $run back

B
if [ -z "${PRINT:-}" ]; then
  read -r -p " Your name: " who; [ -n "$who" ] || exit 4
  read -r -p " Type the run name to confirm ALL of the above on ACCEPTANCE, anything else stops: " a; [ "$a" = "$run" ] || { echo " stopped, nothing done"; exit 4; }
  echo; echo " The reset needs the session of a platform admin signed in on https://acc-alkem.io ."
  echo " Browser, signed in as the admin: F12, Network, reload the page, click a request named graphql,"
  echo " Headers, Request Headers, right-click the line Cookie, copy the value. The whole line is fine. It is not shown here."
  read -r -s -p " Paste it and press Enter (or just Enter to start the reset by hand later): " RESET_COOKIE; echo
  export UNATTENDED_RUN="$run" UNATTENDED_BY="$who"
  if [ -n "$RESET_COOKIE" ]; then export RESET_COOKIE; "$S" "$run" reset-check || exit 4; else unset RESET_COOKIE; echo " no cookie: the run will wait for you after the switch"; fi
else who=print; fi

: > "$LOG"; stage=before-freeze; failed=""
step() {  # $1 = number and name for the timing file, rest = step of file 90 with its environment
  local name=$1 rc=0 t0 t1; shift; t0=$(date -u +%s); printf '\n######## %s  %s\n' "$name" "$(date -u +%H:%M:%SZ)" | tee -a "$LOG"
  if [ -n "${PRINT:-}" ]; then PRINT=1 "$@" 2>&1 | tee -a "$LOG" || true; return 0; fi
  "$@" > >(tee -a "$LOG") 2>&1 || rc=$?
  t1=$(date -u +%s); printf '%s\t%s\t%s\t%s\n' "$name" "$(date -u -d @"$t0" +%H:%M:%S)" "$(date -u -d @"$t1" +%H:%M:%S)" "$((t1-t0))" >> "$T"
  [ $rc -eq 0 ] || { failed="$name (exit $rc)"; return 1; }; }
gate_is() { [ -n "${PRINT:-}" ] && return 0; local i; for i in 1 2 3 4 5; do "$S" "$run" status 2>/dev/null | grep -q "$1" && return 0; sleep 5; done; return 1; }  # the cluster drops some calls: asked up to 5 times
stop() { echo; echo "######## STOPPED at: $failed" | tee -a "$LOG"
  if [ "$stage" = frozen ]; then echo "   before the switch: starting the services again on the UNCHANGED database" | tee -a "$LOG"; "$S" "$run" unfreeze 2>&1 | tee -a "$LOG"; fi
  [ "$stage" = switched ] && echo "   after the switch: nothing was undone. Acceptance runs on the new database. Way back: ./90-acc-switch.sh $run back" | tee -a "$LOG"
  echo "   log: $LOG"; summary; exit 1; }
summary() { [ -s "$T" ] || return 0; echo; echo "=== time of run $run (UTC), seconds"; awk -F'\t' '{printf "  %-28s %s - %s %7s\n",$1,$2,$3,$4}' "$T"
  local f u q; f=$(awk -F'\t' '$1 ~ /freeze$/{print $2}' "$T" | head -1); u=$(awk -F'\t' '$1 ~ /switch/{print $3}' "$T" | tail -1); q=$(cut -c12-19 "$state/queue-empty-at" 2>/dev/null || true)
  s() { echo $(( $(date -u -d "1970-01-01 $2" +%s) - $(date -u -d "1970-01-01 $1" +%s) )); }
  [ -n "$f" ] && [ -n "$u" ] && printf '  %-28s %s\n' "FROZEN until services back" "$(( $(s "$f" "$u") / 60 )) min $(( $(s "$f" "$u") % 60 )) s"
  [ -n "$f" ] && [ -n "$q" ] && printf '  %-28s %s\n' "FROZEN until reset finished" "$(( $(s "$f" "$q") / 60 )) min $(( $(s "$f" "$q") % 60 )) s  (users back, rights not yet recalculated, in between)"
  [ -n "${RESET_COOKIE:-}${byscript:-}" ] || echo "  note: the reset was started by hand, so the times after the switch contain a person's wait"
  grep -q 'repeated\|trying again\|resuming' "$LOG" 2>/dev/null && echo "  note: $(grep -c 'repeated\|trying again' "$LOG") step(s) were repeated because the cluster dropped a connection; that time is inside the numbers"; return 0; }

step "01 prepare"        "$S" "$run" prepare        || stop
step "02 advance"        "$S" "$run" advance        || stop
stage=frozen
step "03 freeze"         "$S" "$run" freeze         || stop
step "04 backup-to-pod"  "$S" "$run" backup-to-pod  || stop
step "05 distil"         "$S" "$run" distil         || stop
gate_is "not approved by a person" || { failed="05 distil: the flow did not reach the gate (a stage did not pass). See the log."; stop; }
"$S" "$run" stages 2>&1 | tee -a "$LOG"; [ "${PIPESTATUS[0]}" -eq 0 ] || [ -n "${PRINT:-}" ] || { failed="05 distil: a stage before the gate did not pass, so the run does not approve"; stop; }
step "06 approve"        "$S" "$run" approve        || stop
step "07 load"           "$S" "$run" load           || stop
stage=switching
step "08 switch+unfreeze" "$S" "$run" switch        || { stage=switched; stop; }
stage=switched
if [ -n "${RESET_COOKIE:-}" ] || [ -n "${PRINT:-}" ]; then step "09 reset-start" "$S" "$run" reset-trigger || stop
else printf '\n   START THE RESET NOW in the browser console of a platform admin on https://acc-alkem.io :\n     await (await fetch("/api/private/graphql",{method:"POST",headers:{"content-type":"application/json"},credentials:"include",body:JSON.stringify({query:"mutation{ authorizationPolicyResetAll }"})})).json()\n   The run goes on by itself when the queue fills.\n'; fi
step "10 reset-wait"     "$S" "$run" reset-watch    || stop
step "11 backup-after"   "$S" "$run" backup-after   || stop
step "12 checks"         "$S" "$run" checks         || stop
[ -n "${RESET_COOKIE:-}" ] && byscript=1; unset RESET_COOKIE
step "13 distil-again"   "$S" "$run" again          || echo "   (the second distil or its compare did not pass: see the report; the run goes on)"
step "14 collect"        "$S" "$run" collect        || { KEEP_POD=1; echo "   (reports not copied: the pod is KEPT. Run ./90-acc-switch.sh $run collect, then release)"; }
if [ -z "${KEEP_POD:-}" ]; then step "15 release-pod" "$S" "$run" release || echo "   (the pod was not deleted: run ./90-acc-switch.sh $run release)"; fi
[ -n "${PRINT:-}" ] || cp -f "$T" "$here/runs/$run/result/timing.tsv" 2>/dev/null || true
summary | tee -a "$LOG"
[ -n "${PRINT:-}" ] || { echo; echo "=== results of run $run"; f="$here/runs/$run/result/kit/runs/$run/flow/87-flow.out"; grep -E '^(source|copy|repairs|reset|guards|access) ' "$f" 2>/dev/null | cut -c1-170 | sed 's/^/  /'
  grep -E '^(tables |VERDICT)' "$here/runs/$run/result/volumes/reports/92-again.out" 2>/dev/null | sed 's/^/  same source twice: /'; echo "  reports: $here/runs/$run/result    log: $LOG"; }
