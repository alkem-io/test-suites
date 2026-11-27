#!/usr/bin/env bash
# 90-acc-switch.sh: the steps a PERSON performs to switch ACCEPTANCE to the distilled database, and back.
# Run by a person at a terminal. Every step that changes something prints what it will do and asks for the step
# name to be typed. Nothing here is run by the kit or by an agent. Acceptance only: the context is fixed below and
# any other context is refused.
#
# How the switch works: the distilled database is loaded NEXT TO the live one, then the two are renamed. No config
# is edited, so a later deploy cannot undo it, and the way back is a rename. The old database is never changed.
#
#   90-acc-switch.sh <run> prepare         create the run's volumes and pod and copy the kit scripts in (acceptance itself untouched)
#   90-acc-switch.sh <run> status          read only: writers, databases, connections, gate
#   90-acc-switch.sh <run> freeze          stop everything that writes to the database (replica counts are remembered)
#   90-acc-switch.sh <run> backup-to-pod   dump the seven databases of the frozen environment into the run's pod
#   90-acc-switch.sh <run> distil          in the pod: seal the source, restore it, copy, repair, stop at the gate
#   90-acc-switch.sh <run> request         show the request for approval
#   90-acc-switch.sh <run> approve         record your approval (asks for part of the file's checksum)
#   90-acc-switch.sh <run> load            load the approved file as a new database next to the live one and prove it is equal
#   90-acc-switch.sh <run> switch          rename: live -> kept aside, new -> live. Then start everything again
#   90-acc-switch.sh <run> reset-watch     after you triggered the reset: wait for the queue, save the worker logs
#   90-acc-switch.sh <run> backup-after    copy the live database after the reset into the pod
#   90-acc-switch.sh <run> checks          in the pod: guards and access checks on that copy
#   90-acc-switch.sh <run> back            WAY BACK: stop writers, rename back, start again
#   90-acc-switch.sh <run> release         delete only the pod; claims and disks stay for the next run (VOLUMES_OF=<run> on prepare)
#   90-acc-switch.sh <run> cleanup         after the test: delete the pod and the claims of the run
#   90-acc-switch.sh <run> unfreeze        start what freeze stopped (also after an aborted attempt)
# Add PRINT=1 in front to see the commands of a step without running anything.
set -euo pipefail
run=${1:?usage: 90-acc-switch.sh <run> <step>}; step=${2:?step}
[[ "$run" =~ ^[a-z0-9-]+$ ]] || { echo "refused: run name"; exit 2; }
here=$(cd "$(dirname "$0")" && pwd); state="$here/runs/$run/switch"; mkdir -p "$state"
# Environment facts (kubectl context, namespace, names of the workloads that write to the database) are NOT in this
# repository. They are read from acc.env beside this file (see acc.env.example); that file is never committed.
[ -f "$here/acc.env" ] && . "$here/acc.env"
CTX=${ACC_CONTEXT:?set ACC_CONTEXT in acc.env}; NS=${ACC_NAMESPACE:-default}; LIVE=${ACC_LIVE_DB:-alkemio}
case "$CTX" in *prod*) echo "refused: $CTX looks like production. This script is for acceptance only."; exit 2;; esac
WRITERS=${ACC_WRITERS:?set ACC_WRITERS in acc.env}; CRONS=${ACC_CRONS:?set ACC_CRONS in acc.env}
RABBIT_POD=${ACC_RABBIT_POD:?set ACC_RABBIT_POD in acc.env}
SERVER_DEPLOY=${ACC_SERVER_DEPLOY:?set ACC_SERVER_DEPLOY in acc.env}; RESET_WORKER_DEPLOY=${ACC_RESET_WORKER_DEPLOY:?set ACC_RESET_WORKER_DEPLOY in acc.env}
tag=${run//-/_}; NEW="alkemio_distilled_$tag"; OLD="alkemio_before_$tag"; POD="distill-$run-runner"; DIST="distill_$tag"
# everything that connects to the alkemio database, directly or through the pooler. The pooler goes last and comes back first.
SIDES="synapse kratos hydra assistant filebackup wopi"
k() { kubectl --context "$CTX" -n "$NS" "$@"; }
say() { printf '\n== %s\n' "$*"; }
do_() { if [ -n "${PRINT:-}" ]; then printf '   would run: %s\n' "$*"; else "$@"; fi; }
confirm() { [ -n "${PRINT:-}" ] && return 0; if [ "${UNATTENDED_RUN:-}" = "$run" ] && [ -n "${UNATTENDED_BY:-}" ]; then echo "   confirmed in advance by $UNATTENDED_BY for the whole run (file 91)"; return 0; fi; [ -t 0 ] || { echo "refused: this step is performed by a person at a terminal"; exit 4; }
  echo; read -r -p "Type '$step' to do this on ACCEPTANCE, anything else stops: " a; [ "$a" = "$step" ] || { echo "stopped, nothing done"; exit 4; }; }
# The acceptance API refuses some exec calls before the command starts ("unable to upgrade connection", seen 2026-11-18,
# about one in three). Nothing has run in that case, so the call is repeated. Input is buffered first so no line is lost.
xr() { local in=$1 e rc i; shift; e=$(mktemp); for i in 1 2 3 4 5 6; do rc=0; if [ -n "$in" ]; then "$@" < "$in" 2> "$e" || rc=$?; else "$@" < /dev/null 2> "$e" || rc=$?; fi
    if [ $rc -ne 0 ] && grep -q 'unable to upgrade connection\|Unable to connect to the server' "$e"; then sleep 2; continue; fi; cat "$e" >&2; rm -f "$e"; return $rc; done; cat "$e" >&2; rm -f "$e"; return 1; }
pg() { local t rc=0; t=$(mktemp); cat > "$t"; xr "$t" kubectl --context "$CTX" -n "$NS" exec -i "$(pgpod)" -c postgres -- sh -c 'psql -X -q -v ON_ERROR_STOP=1 -AtF"|" -U "$POSTGRES_USER" -d "$1"' _ "${1:-postgres}" || rc=$?; rm -f "$t"; return $rc; }   # the form of the operations runbook
kit() { xr "" kubectl --context "$CTX" -n "$NS" exec "$POD" -c kit -- "$@"; }          # no input
kit_in() { k exec -i "$POD" -c kit -- "$@"; }                                           # takes a stream: not repeated, its result is checked by the caller
pgpod() { local p i; for i in 1 2 3 4 5; do p=$(k get pod -l app=postgres -o name 2>/dev/null | grep -v standby | head -1); [ -n "$p" ] && { echo "$p"; return 0; }; sleep 2; done; return 1; }
conns() { echo "select coalesce(sum((datname='$LIVE')::int),0), coalesce(sum((datname='$NEW')::int),0) from pg_stat_activity where pid <> pg_backend_pid() and datname in ('$LIVE','$NEW')" | pg; }
objs() { echo "select (select count(*) from pg_tables where schemaname='public')||' tables, '||(select count(*) from pg_indexes where schemaname='public')||' indexes, '||(select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public')||' constraints, '||(select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and not convalidated)||' not validated, '||(select count(*) from pg_sequences where schemaname='public')||' sequences, '||(select count(*) from pg_index where not indisvalid)||' invalid indexes'" | pg "$1"; }
exists() { echo "select count(*) from pg_database where datname='$1'" | pg; }
record() { local i; if [ "${UNATTENDED_RUN:-}" = "$run" ]; then for i in 1 2 3 4 5; do kit env IN_ADVANCE=1 bash -c "cd /kit && ./89-switch-gate.sh $1 $run" && return 0; sleep 2; done; echo "   NOT RECORDED: $1"; return 1; fi; for i in 1 2 3 4 5; do k exec -it "$POD" -c kit -- bash -c "cd /kit && ./89-switch-gate.sh $1 $run" && return 0; echo "   (not recorded, trying again)"; sleep 2; done; echo "   NOT RECORDED. Nothing else is affected. Record it later with: $0 $run record-$1"; return 0; }
gate() { kit bash -c "cd /kit && ./89-switch-gate.sh status $run"; }
[ "$(kubectl config get-contexts -o name | grep -c "^$CTX$")" = 1 ] || { echo "refused: context $CTX not found"; exit 2; }

case "$step" in
  prepare)
    img=$(k get deploy "$SERVER_DEPLOY" -o jsonpath='{.spec.template.spec.containers[0].image}')
    say "PREPARE run $run: 8 volumes (kept after deletion of their claims) and the runner pod, then copy the kit scripts in. Acceptance itself is not touched."; echo "   server code for the access check: $img"; confirm
    vo=${VOLUMES_OF:-$(cat "$state/volumes-of" 2>/dev/null || true)}
    if [ -n "$vo" ]; then [[ "$vo" =~ ^[a-z0-9-]+$ ]] || { echo "refused: VOLUMES_OF"; exit 2; }; echo "   the 8 volumes of run $vo are used again: no new disk. Their content moves to previous/ on each volume, nothing is deleted."
      [ -n "${PRINT:-}" ] || [ "$(k get pvc -o name | grep -c "^persistentvolumeclaim/distill-$vo-")" = 8 ] || { echo "refused: run $vo does not have 8 claims"; exit 2; }
      echo "$vo" > "$state/volumes-of"; for op in $(k get pods -o name | grep -E '^pod/distill-.*-runner$' | grep -v "/$POD$" || true); do do_ k delete "$op" --wait=true; done; fi
    VOLUMES_OF="$vo" KIT_MODE=copy SERVER_IMAGE="$img" "$here/88-cluster-volumes.sh" render "$run" > "$state/manifests.yml"
    do_ k apply -f "$state/manifests.yml"; do_ k wait --for=condition=Ready "pod/$POD" --timeout=600s
    if [ -z "${PRINT:-}" ]; then ( cd "$here" && { ls *.sh *.py *.mjs *.sql 66-guard-expectations.tsv; find 66-baselines shim -type f; echo cluster/RUNBOOK.md; } > "$state/kit.list" && tar czf "$state/kit.tgz" --no-same-owner -T "$state/kit.list" )
      echo "   kit: $(tar tzf "$state/kit.tgz" | wc -l) script files, no data"; ok=0; for try in 1 2 3 4 5; do kit_in tar xzf - -C /kit --no-same-owner < "$state/kit.tgz" 2> "$state/kit.err" && { ok=1; break; }; sleep 2; done; [ $ok -eq 1 ] || { cat "$state/kit.err"; exit 1; }
      [ -z "$vo" ] || kit bash -c "cd /kit && ./88-cluster-volumes.sh recycle $vo" || { echo "STOP: the volumes could not be made ready"; exit 1; }
      kit bash -c "cd /kit && ./88-cluster-volumes.sh pod-init && { [ -z '$vo' ] || ./88-cluster-volumes.sh recycle-work; } && ./88-cluster-volumes.sh mark-run $run && ./88-cluster-volumes.sh check"; fi;;
  cleanup)
    say "DELETE the pod and the 8 claims of run $run. Disks of the retain class stay until deleted at the provider."; confirm
    do_ k delete pod "$POD" --wait=true; do_ k delete pvc -l "distiller/run=$run";;
  release)   # delete only the pod. The claims and their disks stay, for the next run to use again (VOLUMES_OF).
    say "DELETE the pod of run $run. Its claims and disks STAY."; confirm; do_ k delete pod "$POD" --wait=true;;
  status)
    say "writers (replicas now)"; for d in $WRITERS; do printf '   %-52s %s\n' "$d" "$(k get deploy "$d" -o jsonpath='{.status.replicas}' 2>/dev/null || echo '?')"; done
    say "scheduled jobs (suspended?)"; for c in $CRONS; do printf '   %-36s %s\n' "$c" "$(k get cronjob "$c" -o jsonpath='{.spec.suspend}' 2>/dev/null || echo '?')"; done
    say "databases"; echo "select datname, pg_size_pretty(pg_database_size(datname)), (select count(*) from pg_stat_activity a where a.datname=d.datname) from pg_database d where not datistemplate order by 1" | pg | sed 's/^/   /;s/|/  /g'
    say "gate of run $run"; gate 2>/dev/null || echo "   no pod or no request yet";;
  freeze)
    say "FREEZE acceptance: scale to 0 and suspend scheduled jobs. Users get errors from now on."; printf '   %s\n' $WRITERS; printf '   job %s\n' $CRONS; confirm
    [ -f "$state/replicas.tsv" ] || for d in $WRITERS; do printf '%s\t%s\n' "$d" "$(k get deploy "$d" -o jsonpath='{.spec.replicas}')"; done > "$state/replicas.tsv"
    [ -f "$state/crons.tsv" ] || for c in $CRONS; do printf '%s\t%s\n' "$c" "$(k get cronjob "$c" -o jsonpath='{.spec.suspend}')"; done > "$state/crons.tsv"
    for c in $CRONS; do do_ k patch cronjob "$c" -p '{"spec":{"suspend":true}}'; done
    for d in $WRITERS; do do_ k scale deploy "$d" --replicas=0; done
    [ -n "${PRINT:-}" ] || { c='?'; for i in $(seq 1 30); do sleep 6; c=$(conns 2>/dev/null || echo '?'); [ "$c" = "0|0" ] && break; done; echo "connections left on $LIVE | $NEW: $c  (expect 0|0; if not, run status and find who is still connected)"; [ "$c" = "0|0" ] || [ "${UNATTENDED_RUN:-}" != "$run" ] || { echo "STOP: connections did not go away"; exit 3; }; };;
  unfreeze)
    say "START again what freeze stopped"; cat "$state/replicas.tsv"; confirm
    while IFS=$'\t' read -r d n; do [ "$d" = pgbouncer ] && do_ k scale deploy "$d" --replicas="$n"; done < "$state/replicas.tsv"; [ -n "${PRINT:-}" ] || k rollout status deploy pgbouncer --timeout=120s || echo "   the pooler is not ready yet"
    while IFS=$'\t' read -r d n; do [ "$d" = pgbouncer ] || do_ k scale deploy "$d" --replicas="$n"; done < "$state/replicas.tsv"
    while IFS=$'\t' read -r c s; do do_ k patch cronjob "$c" -p "{\"spec\":{\"suspend\":${s:-false}}}"; done < "$state/crons.tsv"
    [ -n "${PRINT:-}" ] || k rollout status deploy "$SERVER_DEPLOY" --timeout=600s || echo "   the server is not ready yet: look at its pods before going on";;
  backup-to-pod)
    # SOURCE_DB (2026-11-19, QA lead: "start from the initial state"): the platform database is read from a database KEPT ASIDE
    # by an earlier switch instead of the live one. The six other databases are always read from live. The switch
    # itself is unchanged: live is kept aside, the new one becomes live.
    SRCDB=${SOURCE_DB:-$LIVE}
    if [ "$SRCDB" != "$LIVE" ]; then [[ "$SRCDB" =~ ^alkemio_before_[a-z0-9_]+$ ]] || { echo "refused: SOURCE_DB must be a database kept aside by an earlier switch (alkemio_before_...)"; exit 2; }
      [ -n "${PRINT:-}" ] || [ "$(exists "$SRCDB")" = 1 ] || { echo "refused: $SRCDB does not exist on acceptance. Nothing was changed. Run unfreeze."; exit 3; }
      echo "   SOURCE: the platform database is read from $SRCDB, NOT from live $LIVE. What is in live $LIVE and not in $SRCDB will not be in the new database."; echo "$SRCDB" > "$state/source-db"; fi
    say "DUMP $SRCDB $SIDES from the live Postgres into pod $POD (read only on acceptance)"; confirm
    [ -n "${PRINT:-}" ] || [ "$(conns | cut -d'|' -f1)" = 0 ] || { echo "refused: $LIVE still has connections. Freeze first, so the backup is the frozen state."; exit 3; }
    stamp=$(date -u +%Y_%m_%d_%H_%M_%S); do_ kit sh -c "rm -rf /volumes/work/incoming && mkdir -p /volumes/work/incoming"   # scratch: dumps of a run that stopped here must not be loaded with the new ones (2026-11-20, run c filled the source volume)
    for db in $LIVE $SIDES; do echo "   $db ..."; [ -n "${PRINT:-}" ] && { echo "   would run: pg_dump $( [ "$db" = "$LIVE" ] && echo "$SRCDB" || echo "$db" ) on the live Postgres | into the pod as ${db}_${stamp}_live.pgdump"; continue; }
      ok=0; for try in 1 2 3 4 5; do
        k exec "$(pgpod)" -c postgres -- sh -c 'pg_dump -U "$POSTGRES_USER" -d "$1"' _ "$( [ "$db" = "$LIVE" ] && echo "$SRCDB" || echo "$db" )" 2> "$state/dump.err" | kit_in sh -c "cat > /volumes/work/incoming/${db}_${stamp}_live.pgdump" 2>> "$state/dump.err" || true
        [ "$(kit sh -c "tail -c 300 /volumes/work/incoming/${db}_${stamp}_live.pgdump | grep -c 'PostgreSQL database dump complete'")" = 1 ] && { ok=1; break; }; echo "   repeated ($(tail -1 "$state/dump.err" | cut -c1-80))"; sleep 3; done
      [ $ok -eq 1 ] || { echo "STOP: the dump of $db did not complete. Nothing was changed on acceptance. Run unfreeze, or try this step again."; exit 1; }; done
    [ -n "${PRINT:-}" ] || kit sh -c 'ls -la /volumes/work/incoming | awk "{print \"   \", \$5, \$9}"';;
  distil)
    say "IN THE POD: seal the source, restore it, source checks, copy, repairs, stop at the gate. Acceptance is not touched."; confirm
    do_ kit bash -c "cd /kit && ./88-cluster-volumes.sh load-source /volumes/work/incoming && rm -rf /volumes/work/incoming && ./88-cluster-volumes.sh restore-source src_ && { FREE_PLAN_RULED=${FREE_PLAN_RULED:-no} SWITCH_GATE=1 ALK_DB=none ./87-distill-flow.sh $run src_alkemio $DIST src_kratos src_synapse src_kratos src_hydra src_assistant src_filebackup src_wopi; echo \"flow exit \$? (11 = stopped at the gate, as it should)\"; }";;
  request) kit bash -c "cat /kit/runs/$run/flow/89-switch-request.md";;
  approve) if [ "${UNATTENDED_RUN:-}" = "$run" ]; then record approve; else k exec -it "$POD" -c kit -- bash -c "cd /kit && ./89-switch-gate.sh approve $run"; fi;;
  advance) [ "${UNATTENDED_RUN:-}" = "$run" ] && [ -n "${UNATTENDED_BY:-}" ] || { echo "refused: advance is used by file 91 only"; exit 4; }
    kit env ADVANCE_BY="$UNATTENDED_BY" bash -c "cd /kit && ./89-switch-gate.sh advance $run";;
  record-switched) record switched;;
  record-back) record back;;
  load)
    g=$(gate || true); case "$g" in *"approved, the switch is not recorded yet"*) ;; *) echo "refused: $g"; exit 3;; esac
    f=$(kit bash -c "sed -n 's/^- file to load: //p' /kit/runs/$run/flow/89-switch-request.md"); sum=$(kit bash -c "sed -n 's/^- sha256: //p' /kit/runs/$run/flow/89-switch-request.md")
    say "LOAD $f as database $NEW next to $LIVE. $LIVE is not changed."; echo "   approved sha256 $sum"; confirm
    if [ -z "${PRINT:-}" ]; then
      [ "$(kit sha256sum "/volumes/repaired/$f" | cut -c1-64)" = "$sum" ] || { echo "refused: the file in the pod does not have the approved checksum"; exit 3; }
      owner=$(echo "select pg_get_userbyid(datdba) from pg_database where datname='$LIVE'" | pg); want=$(objs "$LIVE")
      if [ -n "${RESUME:-}" ]; then   # the load ran but its connection never closed (seen 2026-11-18): go on from the loaded database
        [ "$(exists "$NEW")" = 1 ] || { echo "refused: RESUME, but $NEW does not exist"; exit 3; }
        [ "$(conns | cut -d'|' -f2)" = 0 ] || { echo "refused: something is still working on $NEW. Wait, then try again."; exit 3; }
        [ "$(objs "$NEW")" = "$want" ] || { echo "refused: $NEW is not complete ($(objs "$NEW")). Drop it and run load without RESUME."; exit 3; }
        echo "   resuming: $NEW exists and is complete"; ok=1
      else
      [ "$(exists "$NEW")" = 0 ] || { echo "refused: $NEW exists already. If a load hung after finishing, run: RESUME=1 $0 $run load"; exit 3; }
      echo "create database \"$NEW\" owner \"$owner\"" | pg; echo "   loading, a few minutes ..."
      ok=0; for try in 1 2 3 4 5; do
        # the connection may stay open after the load has finished: stop waiting after LOAD_TIMEOUT and judge by what is in the database
        k exec "$POD" -c kit -- cat "/volumes/repaired/$f" 2> "$state/load.err" | timeout "${LOAD_TIMEOUT:-600}" kubectl --context "$CTX" -n "$NS" exec -i "$(pgpod)" -c postgres -- sh -c 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-acl --exit-on-error' _ "$NEW" 2>> "$state/load.err" || true
        sleep 5; if [ "$(conns | cut -d'|' -f2)" = 0 ] && [ "$(objs "$NEW")" = "$want" ]; then ok=1; break; fi
        echo "   repeated on a clean database ($(tail -1 "$state/load.err" | cut -c1-80))"; echo "drop database \"$NEW\"" | pg; echo "create database \"$NEW\" owner \"$owner\"" | pg; sleep 3; done
      [ $ok -eq 1 ] || { echo "STOP: the load did not complete. $LIVE is unchanged. Drop $NEW by hand after looking at $state/load.err"; exit 1; }
      fi
      echo "   schema objects, live | new (must be equal):"; echo "     $want"; echo "     $(objs "$NEW")"; echo "   applying rights, then comparing every row with the approved file (one or two minutes) ..."
      # rights other roles hold on the live database: the same lines as in the source backup, applied to the new one
      kit bash -c "grep -a -h -E '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES) ' /volumes/source/alkemio_*" > "$state/grants.sql"; echo "   grant lines from the source backup: $(wc -l < "$state/grants.sql")"; pg "$NEW" < "$state/grants.sql"
      # proof: the same fingerprint (rows and content of every table) as the approved file
      fp='select format($f$select %L || $q$|$q$ || count(*) || $q$|$q$ || coalesce(md5(string_agg(h, $q$$q$ order by h)), $q$-$q$) from (select md5(t::text) h from %I t) x;$f$, tablename, tablename) from pg_tables where schemaname = $s$public$s$ order by tablename'
      { echo "set timezone to 'UTC';"; echo "$fp"; } | pg "$NEW" | { echo "set timezone to 'UTC';"; cat; } | pg "$NEW" | sort > "$state/loaded.fingerprint"; kit cat "/volumes/repaired/$f.fingerprint" | sort > "$state/approved.fingerprint"
      d=$(diff "$state/approved.fingerprint" "$state/loaded.fingerprint" | grep -c '^[<>]' || true); echo "   tables: $(wc -l < "$state/loaded.fingerprint"); lines that differ from the approved file: $d (must be 0)"
      echo "   rights on the database itself, live | new (must be equal before the switch; if not, stop and ask):"; echo "select datname, coalesce(datacl::text,'default') from pg_database where datname in ('$LIVE','$NEW') order by 1" | pg | sed 's/^/     /'
      [ "$d" = 0 ] || { echo "STOP: the loaded database is not the approved file. Do not switch. Drop $NEW and investigate."; exit 1; }
    fi;;
  switch)
    g=$(gate || true); case "$g" in *"approved, the switch is not recorded yet"*) ;; *) echo "refused: $g"; exit 3;; esac
    say "SWITCH: rename $LIVE -> $OLD and $NEW -> $LIVE, then start everything again."; echo "   Way back afterwards: $0 $run back"; confirm
    if [ -z "${PRINT:-}" ]; then
      [ -s "$state/loaded.fingerprint" ] && [ "$(diff "$state/approved.fingerprint" "$state/loaded.fingerprint" | grep -c '^[<>]' || true)" = 0 ] || { echo "refused: run load first, and it must report 0 differences"; exit 3; }
      [ "$(conns)" = "0|0" ] || { echo "refused: there are connections ($(conns)). Freeze first."; exit 3; }
      [ "$(exists "$OLD")" = 0 ] || { echo "refused: $OLD exists already"; exit 3; }
      printf 'begin;\nalter database "%s" rename to "%s";\nalter database "%s" rename to "%s";\ncommit;\n' "$LIVE" "$OLD" "$NEW" "$LIVE" | pg
      echo "   renamed at $(date -u +%H:%M:%SZ)"; date -u +%Y-%m-%dT%H:%M:%SZ > "$state/switched-at"
    fi
    step=unfreeze PRINT=${PRINT:-} "$0" "$run" unfreeze < /dev/tty
    [ -n "${PRINT:-}" ] || { echo; echo "Now record the switch (asks for the checksum again):"; record switched; }
    [ "${UNATTENDED_RUN:-}" = "$run" ] || cat <<T

   NEXT, by you, signed in on https://acc-alkem.io as a platform admin, in the browser console (F12):
     await (await fetch('/api/private/graphql',{method:'POST',headers:{'content-type':'application/json'},credentials:'include',body:JSON.stringify({query:'mutation{ authorizationPolicyResetAll }'})})).json()
   then:  $0 $run reset-watch
T
    ;;
  reset-watch)
    say "WAIT for the reset queue to empty, then save the worker logs (read only)"; [ -z "${PRINT:-}" ] || { echo "   would watch queue alkemio-auth-reset until it is empty, and save the worker logs"; exit 0; }; t0=$(date +%s); seen=0; idle=0; since=$(cat "$state/switched-at" 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)
    while [ $idle -lt 6 ]; do
      n=$(xr "" kubectl --context "$CTX" -n "$NS" exec "$RABBIT_POD" -c rabbitmq -- rabbitmqctl -q list_queues name messages messages_unacknowledged 2>/dev/null | awk '$1=="alkemio-auth-reset"{print $2+$3; f=1} END{if(!f) print "?"}' || echo "?")
      w=$(k get deploy "$RESET_WORKER_DEPLOY" -o jsonpath='{.status.replicas}' 2>/dev/null || echo "?")
      printf '\r   queue %-7s workers %-3s minutes %s ' "$n" "${w:-0}" "$(( ($(date +%s)-t0)/60 ))"
      # the workers disappear when the queue is empty, and their logs with them: collect while they live (the cluster drops some calls: go on)
      k logs -l app=alkemio-auth-reset-worker --all-containers --prefix --since=45s --tail=-1 --max-log-requests=20 >> "$state/worker-logs.raw" 2>/dev/null || true
      if [ "$n" = "?" ]; then sleep 20; continue; fi   # the queue could not be read this time: not counted as empty
      [ "$n" -gt 0 ] && seen=1; if [ "$n" -eq 0 ] && { [ $seen -eq 1 ] || [ -n "${ASSUME_STARTED:-}" ]; }; then idle=$((idle+1)); [ $idle -eq 1 ] && date -u +%Y-%m-%dT%H:%M:%SZ > "$state/queue-empty-at"; else idle=0; fi; sleep 20
      [ $(( $(date +%s)-t0 )) -lt "${MAX_SECONDS:-5400}" ] || { echo; echo "STOP: the queue did not start or did not empty in time"; exit 5; }; done
    sort -u "$state/worker-logs.raw" > "$state/worker.log"; rm -f "$state/worker-logs.raw"
    echo; echo "   reset finished. Worker log lines with error or exception: $(grep -v OidcService "$state/worker.log" | grep -c -E '[[:space:]]ERROR|Exception' || true) (expect 0). Log saved: $state/worker.log";;
  reset-check|reset-trigger)   # file 91: the reset is started with the session of a platform admin. RESET_COOKIE is never printed or written to disk.
    [ -z "${PRINT:-}" ] || { echo "   would send to https://acc-alkem.io/api/private/graphql with the admin session: $step"; exit 0; }
    [ -n "${RESET_COOKIE:-}" ] || { echo "refused: RESET_COOKIE is not set"; exit 4; }
    # accepted: the whole Cookie header of a request (most reliable), or the value of one session cookie. A value may end in "=", so "=" alone decides nothing.
    ck=${RESET_COOKIE#Cookie: }; ck=${ck#cookie: }
    case "$ck" in *'; '*|ory_kratos_session*=*|alkemio_session*=*) ;; s%3A*|s:*) ck="alkemio_session_acceptance=$ck";; *) ck="ory_kratos_session_acceptance=$ck";; esac
    gqlc() { printf 'header = "Cookie: %s"\n' "$ck" | curl -sS --max-time 60 --config - -H 'content-type: application/json' --data "$1" "https://acc-alkem.io/api/private/graphql"; }
    if [ "$step" = reset-check ]; then
      r=$(gqlc '{"query":"query { platform { authorization { myPrivileges } } me { user { id } } }"}' || true)
      case "$r" in *AUTHORIZATION_RESET*) echo "   the session may start the authorization reset";;
        *'"user":{"id"'*) echo "refused: the session is signed in on acceptance, but this account may not start the reset (it needs the operations admin role)"; exit 4;;
        *'"data"'*) echo "refused: acceptance answered, but did not recognise the session: it is not signed in. Paste the whole Cookie header of a request instead (see file 91)."; exit 4;;
        *) echo "refused: no usable answer from acceptance ($(printf '%s' "$r" | wc -c) bytes)"; exit 4;; esac
    else
      say "START the authorization reset on acceptance (mutation authorizationPolicyResetAll)"; confirm
      ok=0; for i in $(seq 1 30); do r=$(gqlc '{"query":"mutation { authorizationPolicyResetAll }"}' 2>/dev/null || true)
        case "$r" in *'"authorizationPolicyResetAll":"'*) ok=1; break;; esac; sleep 10; done
      [ $ok -eq 1 ] || { echo "STOP: the reset could not be started (the server did not accept the request in 5 minutes). Start it by hand in the browser, then: ASSUME_STARTED=1 $0 $run reset-watch"; exit 5; }
      date -u +%Y-%m-%dT%H:%M:%SZ > "$state/reset-started-at"; echo "   reset started at $(cat "$state/reset-started-at")"
    fi;;
  stages)   # file 91: every stage before the gate must have passed, or the unattended run does not approve
    o=$(kit bash -c "grep -E '^(source|copy|repairs) ' /kit/runs/$run/flow/87-flow.out | cut -c1-120") || { echo "refused: the stage results could not be read"; exit 1; }
    echo "$o" | sed 's/^/   /'; [ "$(echo "$o" | grep -c -E '^(source|copy|repairs) +PASS ')" = 3 ] || { echo "refused: a stage before the gate did not pass. A person reads it and decides."; exit 3; };;
  again)   # determinism: the same source backups distilled a second time in the pod, compared with the first result. Acceptance is not touched.
    say "IN THE POD: distil the same source a second time and compare. Acceptance is not touched."; confirm
    [ -z "${PRINT:-}" ] || { echo "   would run in the pod, detached: 87-distill-flow.sh ${run}-again ... ${DIST}_again, then 92-compare-runs.sh in-pod $DIST ${DIST}_again"; exit 0; }
    # started detached and then asked for its result: a dropped connection (seen 2026-11-18) must not lose the outcome
    kit bash -c "cd /kit && rm -f /volumes/reports/92-again.out && nohup bash -c 'FREE_PLAN_RULED=${FREE_PLAN_RULED:-no} SWITCH_GATE=1 ALK_DB=none ./87-distill-flow.sh ${run}-again src_alkemio ${DIST}_again src_kratos src_synapse src_kratos src_hydra src_assistant src_filebackup src_wopi > /volumes/reports/again.log 2>&1; ./92-compare-runs.sh in-pod $DIST ${DIST}_again > /volumes/reports/92-again.tmp 2>&1; mv /volumes/reports/92-again.tmp /volumes/reports/92-again.out' > /dev/null 2>&1 &"
    ok=0; for i in $(seq 1 120); do sleep 15; kit test -f /volumes/reports/92-again.out 2>/dev/null && { ok=1; break; }; done
    [ $ok -eq 1 ] || { echo "STOP: the second distil did not finish in 30 minutes"; exit 1; }
    kit bash -c "grep -E '^(source|copy|repairs) ' /volumes/reports/again.log | cut -c1-120; cat /volumes/reports/92-again.out"; kit grep -q '^VERDICT: PASS' /volumes/reports/92-again.out;;
  collect)   # copy the results (reports, guard outputs since 2026-11-19 (counts only, *.out, never the .csv detail files), counts, fingerprints: no backups) from the pod to this workstation, so they survive the pod
    say "COPY the reports of run $run from the pod to $here/runs/$run/result (read only)"; [ -z "${PRINT:-}" ] || { echo "   would copy reports, guard outputs, counts and fingerprints from the pod (no backups)"; exit 0; }; mkdir -p "$here/runs/$run/result"
    ok=0; for try in $(seq 1 12); do
      k exec "$POD" -c kit -- bash -c "cd / && tar czf - --ignore-failed-read --exclude='85-model-digests.tsv' --exclude='89-policies-*.tsv' kit/runs/$run/flow kit/runs/${run}-again/flow kit/runs/$run/*.out kit/runs/${run}-source/*.out kit/runs/${run}-again/*.out kit/runs/${run}-again-source/*.out volumes/reports/*.out volumes/reports/*.log volumes/*/MANIFEST.tsv volumes/*/*.fingerprint volumes/source/SHA256SUMS 2>/dev/null" > "$state/result.tgz" 2>/dev/null || true
      tar tzf "$state/result.tgz" > /dev/null 2>&1 && [ "$(tar tzf "$state/result.tgz" | wc -l)" -gt 5 ] && { ok=1; break; }; sleep 10; done
    [ $ok -eq 1 ] || { echo "STOP: the reports could not be copied (12 tries). Nothing is lost: they are in the pod. Run: $0 $run collect"; exit 1; }
    tar xzf "$state/result.tgz" -C "$here/runs/$run/result" && rm -f "$state/result.tgz"; cp -f "$state"/*-at "$state"/timing.tsv "$here/runs/$run/result/" 2>/dev/null || true
    echo "   $(find "$here/runs/$run/result" -type f | wc -l) files";;
  backup-after)
    say "COPY the live $LIVE (after the reset) into the pod as ${DIST}_after (read only on acceptance)"; confirm
    do_ kit bash -c "psql -d postgres -X -q -c 'create database \"${DIST}_after\"'"
    if [ -z "${PRINT:-}" ]; then ok=0; for try in 1 2 3 4 5; do
        if k exec "$(pgpod)" -c postgres -- sh -c 'pg_dump -U "$POSTGRES_USER" -Fc -d "$1"' _ "$LIVE" 2> "$state/after.err" | kit_in bash -c "pg_restore -d ${DIST}_after --no-owner --no-acl --exit-on-error" 2>> "$state/after.err"; then ok=1; break; fi
        echo "   repeated on a clean copy"; kit bash -c "psql -d postgres -X -q -c 'drop database \"${DIST}_after\"' -c 'create database \"${DIST}_after\"'"; sleep 3; done
      [ $ok -eq 1 ] || { echo "STOP: the copy did not complete: see $state/after.err"; exit 1; }; fi
    [ -n "${PRINT:-}" ] || { [ -f "$state/worker.log" ] && kit_in bash -c "cat > /volumes/reports/worker.log" < "$state/worker.log"; echo "   done"; };;
  checks)
    say "IN THE POD: guards and access checks on the state after the reset. Acceptance is not touched."; confirm
    do_ kit bash -c "cd /kit && FREE_PLAN_RULED=${FREE_PLAN_RULED:-no} SWITCH_GATE=1 AFTER_RESET_DB=${DIST}_after ALK_DB=none FROM=reset ./87-distill-flow.sh $run src_alkemio $DIST src_kratos src_synapse src_kratos src_hydra src_assistant src_filebackup src_wopi; echo \"flow exit \$?\"";;
  back)
    say "WAY BACK: stop writers, rename $LIVE -> ${NEW}_set_aside and $OLD -> $LIVE, start again."; echo "   Whatever users did since the switch stays in ${NEW}_set_aside only."; confirm
    if [ -z "${PRINT:-}" ]; then
      [ "$(exists "$OLD")" = 1 ] || { echo "refused: $OLD does not exist: nothing to go back to"; exit 3; }
      for d in $WRITERS; do k scale deploy "$d" --replicas=0; done; sleep 20
      [ "$(conns | cut -d'|' -f1)" = 0 ] || { echo "refused: $LIVE still has connections ($(conns)). Run status."; exit 3; }
      printf 'begin;\nalter database "%s" rename to "%s";\nalter database "%s" rename to "%s";\ncommit;\n' "$LIVE" "${NEW}_set_aside" "$OLD" "$LIVE" | pg; echo "   renamed back at $(date -u +%H:%M:%SZ)"
    fi
    step=unfreeze PRINT=${PRINT:-} "$0" "$run" unfreeze < /dev/tty
    [ -n "${PRINT:-}" ] || record back
    echo "   After a way back run the authorization reset once more only if a deploy happened in between. The old database was never changed.";;
  *) echo "unknown step $step"; exit 2;;
esac
