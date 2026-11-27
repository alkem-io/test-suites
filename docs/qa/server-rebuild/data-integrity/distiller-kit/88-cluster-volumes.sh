#!/usr/bin/env bash
# 88-cluster-volumes.sh: one cluster volume for each backup and for each stage of a distiller run (ops, 2026-11-18).
# This script NEVER talks to a cluster. "render" prints manifests for an operator to read and apply.
# The other commands run INSIDE the runner pod (or locally for a dry run) and only touch $VOLUME_ROOT.
#
#   88-cluster-volumes.sh list                         the volumes of a run and which backup lands on which
#   88-cluster-volumes.sh render <run>                 manifests (claims + runner pod) on stdout; nothing is applied
#   88-cluster-volumes.sh check                        every volume is mounted, writable, and has room
#   88-cluster-volumes.sh load-source <dir>            copy the source backups onto the source volume, record sha256, seal it
#   88-cluster-volumes.sh seal <volume>                make a volume read-only for the run user and record its content
#   88-cluster-volumes.sh pod-init                     once in the pod: outputs to the reports volume, wait for Postgres
#   88-cluster-volumes.sh restore-source <prefix>      restore every backup of the sealed source volume as <prefix><name>
#   88-cluster-volumes.sh recycle <label>               volumes of an earlier run used again: its content moves to previous/<label>/, nothing deleted
#   88-cluster-volumes.sh recycle-work | mark-run <run>  drop the scratch databases of the earlier run | record which run uses the volumes
#   88-cluster-volumes.sh inventory                    what is on every volume (file names, sizes, sums; no data)
#
# <run> names the run in lower case, for example acc-2026-11-18. Volume names: distill-<run>-<volume>.
# env for render:  SIZE_SOURCE=5Gi SIZE_STAGE=3Gi SIZE_WORK=30Gi SIZE_REPORTS=1Gi   (acceptance sizes; production needs its own)
#                  CLASS_KEEP=sbs-default-retain   backups and stages: the disk survives the deletion of its claim
#                  CLASS_WORK=sbs-default          working database: gone when its claim is deleted
#                  VOLUMES_OF=<earlier run>        use the claims of that run again: no new claim, no new disk
#                  KIT_MODE=copy SERVER_IMAGE=<server image>   no registry: public images only, the kit is copied into /kit
#                  KIT_IMAGE=<registry>/distiller-kit:<tag>   the image built from cluster/Dockerfile.kit
#                  NAMESPACE=                      empty = the namespace of the operator's context, as in infrastructure-operations
# env inside the pod:  VOLUME_ROOT=/volumes (set by the runner pod)   VOLUME_PLAIN_OK=1 accepts plain folders (local dry run only)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
# volume <TAB> class <TAB> what it holds <TAB> backup tags that land on it (shell patterns, read by 83-snapshot.sh)
VOLUMES=$(cat <<'T'
source	keep	the source backups exactly as downloaded, one file per database. Sealed after loading	-
copied	keep	backup of the new database right after the copy of the valid rows	copied-state
repaired	keep	backup after the accepted repairs	repaired-state
reset	keep	backup after every authorization reset	after-reset
checks	keep	backups taken before a check that writes (before a reset, before a walk as a user)	before-*
final	keep	the result: the state at the end of the flow. This is the file that would be loaded into the environment	final-state
reports	keep	guard outputs, flow log, backup index. Counts only	-
work	work	the Postgres data directory of the run. Scratch: not a backup	-
T
)
vol_for_tag() { local tag=$1 v c w pats p; while IFS=$'\t' read -r v c w pats; do for p in $pats; do [ "$p" = - ] && continue
  # shellcheck disable=SC2254
  case "$tag" in $p) echo "$v"; return 0;; esac; done; done <<<"$VOLUMES"; echo checks; }
root() { echo "${VOLUME_ROOT:?VOLUME_ROOT is not set: this command runs where the volumes are mounted}"; }
is_volume() { [ -d "$1" ] && { mountpoint -q "$1" || [ -n "${VOLUME_PLAIN_OK:-}" ]; }; }
cmd=${1:?usage: 88-cluster-volumes.sh list|render|check|load-source|seal|pod-init|restore-source|inventory|volume-for-tag ...}; shift || true
case "$cmd" in
  volume-for-tag) vol_for_tag "${1:?tag}";;
  list) printf '%-9s %-5s %-18s %s\n' VOLUME CLASS 'BACKUP TAGS' HOLDS; while IFS=$'\t' read -r v c w pats; do printf '%-9s %-5s %-18s %s\n' "$v" "$c" "$pats" "$w"; done <<<"$VOLUMES";;
  render)
    run=${1:?run name, for example acc-2026-11-18}
    [[ "$run" =~ ^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$ ]] || { echo "refused: '$run' must be lower case letters, digits and dashes, at most 32" >&2; exit 2; }
    ns=${NAMESPACE:+$'\n'"  namespace: $NAMESPACE"}
    INIT=; KITENV=; KITIMG="${KIT_IMAGE:-REPLACE-WITH-THE-KIT-IMAGE}   # built from cluster/Dockerfile.kit: scripts and agreed counts only, no data"
    if [ "${KIT_MODE:-image}" = copy ]; then   # no registry: public images only, the kit scripts are copied into /kit by the operator (kubectl cp)
      KITIMG="node@sha256:c103d7b5aa3bf627c8b98db941d52556f04e0b5d9352b3d7b6391245d26620f8   # public image: bash, python3, node. Postgres tools and server code come from the two init containers"
      KITENV=$'        - { name: PATH, value: "/kit/shim:/tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" }\n        - { name: LD_LIBRARY_PATH, value: /tools/lib }\n        - { name: SERVER_DIR, value: /server }\n        - { name: HOME, value: /tmp }\n'
      INIT=$(cat <<I
  initContainers:
    - name: pgtools   # the Postgres 18.6 client tools, copied for the kit container
      image: postgres:18.6-trixie@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42
      imagePullPolicy: IfNotPresent
      command: ["bash", "-c", "mkdir -p /tools/bin /tools/lib && cp /usr/lib/postgresql/18/bin/{psql,pg_dump,pg_restore,createdb,dropdb} /tools/bin/ && cp -P /usr/lib/x86_64-linux-gnu/libpq.so.5* /tools/lib/"]
      securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }
      resources: { requests: { cpu: 50m, memory: 64Mi }, limits: { cpu: 500m, memory: 256Mi } }
      volumeMounts: [ { name: tools, mountPath: /tools } ]
    - name: servercode   # the compiled server of the release: file 85 calls its own access function. No server is started
      image: ${SERVER_IMAGE:?SERVER_IMAGE: the server image of the release, for example the one the environment runs}
      imagePullPolicy: IfNotPresent
      command: ["/nodejs/bin/node", "-e", "const fs=require('fs');for(const p of ['dist','node_modules','package.json'])fs.cpSync('/usr/src/app/'+p,'/server/'+p,{recursive:true,verbatimSymlinks:true})"]
      securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }
      resources: { requests: { cpu: 100m, memory: 256Mi }, limits: { cpu: "1", memory: 1Gi } }
      volumeMounts: [ { name: server, mountPath: /server } ]
I
)$'\n'
    fi
    cat <<Y
# Distiller run "$run": one volume for each backup and for each stage. Rendered by 88-cluster-volumes.sh on $(date -u +%Y-%m-%d).
# Operator-run, one-off. Not part of any kustomization: nothing renders, applies or prunes it automatically.
#   kubectl apply -f <this file>        kubectl get pvc -l distiller/run=$run
# The claims stay Pending until the runner pod starts (WaitForFirstConsumer): all bind in the zone of the node that runs it.
# The pod attaches $(wc -l <<<"$VOLUMES") block volumes to ONE node: check the node's attach limit first.
# Removal: delete the pod, then the claims. Disks of class ${CLASS_KEEP:-sbs-default-retain} stay until an operator deletes them.
Y
    [ -n "${VOLUMES_OF:-}" ] && echo "# The claims of run $VOLUMES_OF are used again: no new claim, no new disk."
    while IFS=$'\t' read -r v c w pats; do [ -z "${VOLUMES_OF:-}" ] || continue
      case "$v" in source) size=${SIZE_SOURCE:-5Gi};; work) size=${SIZE_WORK:-30Gi};; reports) size=${SIZE_REPORTS:-1Gi};; *) size=${SIZE_STAGE:-3Gi};; esac
      [ "$c" = work ] && class=${CLASS_WORK:-sbs-default} || class=${CLASS_KEEP:-sbs-default-retain}
      cat <<Y
---
# $v: $w
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: distill-$run-$v$ns
  labels:
    app.kubernetes.io/part-of: data-distiller
    distiller/run: "$run"
    distiller/volume: "$v"
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: $class
  resources:
    requests:
      storage: $size
Y
    done <<<"$VOLUMES"
    cat <<Y
---
# The runner: a private Postgres with no Service in front of it, plus a shell container that holds every volume.
# It carries NO label that the network policies allowlist: it cannot reach the live database or the backup bucket.
# How the source backups reach the "source" volume is the operator's step (for example kubectl cp into /volumes/source).
apiVersion: v1
kind: Pod
metadata:
  name: distill-$run-runner$ns
  labels:
    app.kubernetes.io/part-of: data-distiller
    distiller/run: "$run"
spec:
  restartPolicy: Never
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 999
    runAsGroup: 999
    fsGroup: 999
    fsGroupChangePolicy: OnRootMismatch
$INIT  containers:
    - name: postgres
      image: postgres:18.6-trixie@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42
      imagePullPolicy: IfNotPresent
      args: ["-c", "listen_addresses=localhost"]   # reachable from this pod only
      env:
        - { name: POSTGRES_USER, value: synapse }
        - { name: POSTGRES_HOST_AUTH_METHOD, value: trust }   # local connections inside the pod only
        - { name: PGDATA, value: /volumes/work/pgdata }
      securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }
      resources:
        requests: { cpu: "1", memory: 2Gi }
        limits: { cpu: "4", memory: 8Gi }
      volumeMounts:
        - { name: work, mountPath: /volumes/work }
    - name: kit
      image: $KITIMG
      imagePullPolicy: IfNotPresent
      command: ["sleep", "infinity"]
      env:
        - { name: VOLUME_ROOT, value: /volumes }
        - { name: SNAPSHOT_DIR, value: /volumes/reports/backups }
        - { name: KIT_TMP, value: /volumes/work/tmp }
        - { name: PGHOST, value: localhost }
        - { name: PGUSER, value: synapse }
$KITENV      securityContext: { allowPrivilegeEscalation: false, capabilities: { drop: ["ALL"] } }
      resources:
        requests: { cpu: 500m, memory: 1Gi }
        limits: { cpu: "4", memory: 8Gi }
      volumeMounts:
Y
    while IFS=$'\t' read -r v c w pats; do echo "        - { name: $v, mountPath: /volumes/$v }"; done <<<"$VOLUMES"
    [ "${KIT_MODE:-image}" = copy ] && printf '        - { name: kit, mountPath: /kit }\n        - { name: tools, mountPath: /tools, readOnly: true }\n        - { name: server, mountPath: /server, readOnly: true }\n'
    echo "  volumes:"
    [ "${KIT_MODE:-image}" = copy ] && printf '    - { name: kit, emptyDir: {} }\n    - { name: tools, emptyDir: {} }\n    - { name: server, emptyDir: {} }\n'
    while IFS=$'\t' read -r v c w pats; do echo "    - { name: $v, persistentVolumeClaim: { claimName: distill-${VOLUMES_OF:-$run}-$v } }"; done <<<"$VOLUMES";;
  check)
    r=$(root); bad=0
    while IFS=$'\t' read -r v c w pats; do d="$r/$v"; st=ok
      if ! is_volume "$d"; then st='NOT A MOUNTED VOLUME'; bad=$((bad+1))
      elif [ -f "$d/SEALED" ]; then st="sealed $(cut -f1 "$d/SEALED")"
      elif ! ( : > "$d/.write-test" ) 2>/dev/null; then st='NOT WRITABLE'; bad=$((bad+1)); else rm -f "$d/.write-test"; fi
      printf '    %-9s %-28s free %s\n' "$v" "$st" "$(df -h --output=avail "$d" 2>/dev/null | tail -1 | tr -d ' ')"
    done <<<"$VOLUMES"
    echo "    volumes with a problem: $bad"; [ $bad -eq 0 ];;
  seal)
    v=${1:?volume}; d="$(root)/$v"; is_volume "$d" || { echo "refused: $d is not a mounted volume" >&2; exit 2; }
    [ -f "$d/SEALED" ] && { echo "$v is already sealed"; exit 0; }
    ( cd "$d" && find . -path ./previous -prune -o -type f ! -name SHA256SUMS ! -name SEALED -print0 | sort -z | xargs -0 -r sha256sum > SHA256SUMS )
    printf '%s\t%s files\n' "$(date -u +%Y-%m-%dT%H:%MZ)" "$(wc -l < "$d/SHA256SUMS")" > "$d/SEALED"; chmod -R a-w "$d" 2>/dev/null || true
    echo "sealed $v: $(wc -l < "$d/SHA256SUMS") files, sums in SHA256SUMS";;
  load-source)
    src=${1:?folder with the source backups}; d="$(root)/source"; is_volume "$d" || { echo "refused: $d is not a mounted volume" >&2; exit 2; }
    [ -f "$d/SEALED" ] && { echo "refused: the source volume is sealed. One run, one source." >&2; exit 2; }
    n=0; for f in "$src"/*; do [ -f "$f" ] || continue; cp --preserve=timestamps "$f" "$d/"; n=$((n+1)); done
    [ $n -gt 0 ] || { echo "refused: no file in $src" >&2; exit 2; }
    "$0" seal source; ( cd "$src" && sha256sum -- * 2>/dev/null | sort -k2 ) | diff -q - <(sed 's# \./# #' "$d/SHA256SUMS" | sort -k2) > /dev/null \
      && echo "source volume: $n backups copied, every sum equal to the original" || { echo "FAIL: a copied backup differs from its original" >&2; exit 1; };;
  pod-init)   # once, in the kit container: outputs and new readings go to the reports volume, temp files to the work volume
    r=$(root); is_volume "$r/reports" && is_volume "$r/work" || { echo "refused: reports or work volume not mounted" >&2; exit 2; }
    mkdir -p "$r/reports/runs" "$r/reports/backups" "$r/work/tmp"
    [ -L "$here/runs" ] || { [ ! -e "$here/runs" ] || { echo "refused: $here/runs exists and is not a link" >&2; exit 2; }; ln -s "$r/reports/runs" "$here/runs"; }
    [ -L "$here/66-baselines" ] || { [ -d "$r/reports/66-baselines" ] || cp -r "$here/66-baselines" "$r/reports/66-baselines"; mv "$here/66-baselines" "$here/66-baselines.image"; ln -s "$r/reports/66-baselines" "$here/66-baselines"; }
    for i in $(seq 60); do docker exec -i alkemio_dev_postgres psql -U "${PGUSER:-synapse}" -d postgres -X -q -At -c 'select 1' > /dev/null 2>&1 && break; sleep 2; done
    echo "pod-init: outputs on the reports volume, Postgres $(docker exec -i alkemio_dev_postgres psql -U "${PGUSER:-synapse}" -d postgres -X -q -At -c 'show server_version') answers";;
  restore-source)   # the backups on the sealed source volume -> databases <prefix><name>, one per backup file
    pre=${1:?prefix, for example src_}; d="$(root)/source"; [ -f "$d/SEALED" ] || { echo "refused: the source volume is not sealed: run load-source first" >&2; exit 2; }
    ( cd "$d" && sha256sum --quiet -c SHA256SUMS ) || { echo "FAIL: a backup on the source volume no longer equals its recorded sum" >&2; exit 1; }
    P="docker exec -i alkemio_dev_postgres psql -U ${PGUSER:-synapse} -X -q"; bad=0
    for f in "$d"/*; do [ -f "$f" ] || continue; b=$(basename "$f"); case "$b" in SEALED|SHA256SUMS) continue;; esac; db="$pre${b%%_*}"
      [ -z "$($P -d postgres -At -c "select 1 from pg_database where datname='$db'")" ] || { echo "refused: database $db exists" >&2; exit 2; }
      $P -d postgres -c "create database \"$db\""
      e=$($P -d "$db" < "$f" 2>&1 > /dev/null | grep 'ERROR' | grep -v -c 'role .* does not exist' || true)
      g=$(grep -a -c '^GRANT\|^REVOKE' "$f" || true)
      printf '    %-22s tables %-4s size %-9s errors other than a role that does not exist here: %s\n' "$db" "$($P -d "$db" -At -c "select count(*) from pg_tables where schemaname='public'")" "$($P -d postgres -At -c "select pg_size_pretty(pg_database_size('$db'))")" "$e"
      [ "$e" -eq 0 ] || bad=$((bad+1)); done
    echo "    backups restored with an error: $bad"; [ $bad -eq 0 ];;
  recycle)   # volumes used by an earlier run are used again. Nothing is deleted from a kept volume: the earlier content moves to previous/<label>/.
    lab=${1:?label of the earlier content, for example the name of the earlier run}; r=$(root); [ -f "$r/reports/RUN" ] && lab=$(cat "$r/reports/RUN")
    [[ "$lab" =~ ^[a-z0-9-]+$ ]] || { echo "refused: label" >&2; exit 2; }
    while IFS=$'\t' read -r v c w pats; do d="$r/$v"; [ "$c" = keep ] || continue; is_volume "$d" || { echo "refused: $d is not a mounted volume" >&2; exit 2; }
      chmod -R u+w "$d" 2>/dev/null || true; n=0
      # a source that was never sealed is a copy that stopped half way (disk full, dropped connection): not kept, it would fill the volume
      if [ "$v" = source ] && [ ! -f "$d/SEALED" ]; then u=$(find "$d" -maxdepth 1 -type f | wc -l); find "$d" -maxdepth 1 -type f -delete; [ "$u" -gt 0 ] && echo "    source    $u file(s) of a copy that was never sealed removed (not a kept source)" || true; fi
      for f in "$d"/* "$d"/.[!.]*; do [ -e "$f" ] || [ -L "$f" ] || continue; b=$(basename "$f"); case "$b" in previous|lost+found|.write-test) continue;; esac
        mkdir -p "$d/previous/$lab"; mv "$f" "$d/previous/$lab/"; n=$((n+1)); done
      # the plain source backups are large: packed, so the volume holds several runs. The sums of the originals stay in SHA256SUMS.
      [ "$v" = source ] && [ -d "$d/previous/$lab" ] && find "$d/previous/$lab" -maxdepth 1 -type f -size +20M ! -name '*.gz' -exec gzip -1 {} +
      [ -d "$d/previous" ] && chmod -R a-w "$d/previous" 2>/dev/null; chmod u+w "$d" "$d/previous" 2>/dev/null || true
      printf '    %-9s %s entries of %s moved to previous/, free now %s\n' "$v" "$n" "$lab" "$(df -h --output=avail "$d" 2>/dev/null | tail -1 | tr -d ' ')"
    done <<<"$VOLUMES"
    need=${SOURCE_NEED_MB:-2500}; free=$(df -m --output=avail "$r/source" | tail -1 | tr -d ' ')
    [ "$free" -ge "$need" ] || { echo "refused: the source volume has $free MB free, a run needs $need MB. An operator decides which earlier run under $r/source/previous may go." >&2; exit 3; }
    echo "    earlier runs kept on the volumes: $(ls "$r/source/previous" 2>/dev/null | tr '\n' ' ')";;
  recycle-work)   # the scratch databases of the earlier run (not backups) are dropped, so the names are free. Needs the pod's Postgres.
    P="docker exec -i alkemio_dev_postgres psql -U ${PGUSER:-synapse} -X -q"; n=0
    for db in $($P -d postgres -At -c "select datname from pg_database where datname like 'src\_%' or datname like 'distill\_%' order by 1"); do $P -d postgres -c "drop database \"$db\""; n=$((n+1)); done
    echo "    work volume: $n scratch databases of the earlier run dropped";;
  mark-run) r=$(root); printf '%s\n' "${1:?run}" > "$r/reports/RUN"; echo "    volumes marked as used by run $1";;
  inventory)
    r=$(root); while IFS=$'\t' read -r v c w pats; do d="$r/$v"; [ -d "$d" ] || continue; [ "$v" = work ] && { echo "=== work: Postgres data, $(du -sh "$d" 2>/dev/null | cut -f1)"; continue; }
      echo "=== $v$([ -f "$d/SEALED" ] && echo ' (sealed)')"; ( cd "$d" && find . -maxdepth 2 -type f ! -name '.*' -printf '    %-78P %12s bytes\n' | sort ); done <<<"$VOLUMES";;
  *) echo "unknown command $cmd" >&2; exit 2;;
esac
