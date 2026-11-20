#!/usr/bin/env bash
# 83-snapshot.sh: backups of a distilled database, so that every change made by a check can be undone.
# Rule (QA lead, 2026-11-17): there is always a backup of the state before any change starts, and one after
# every authorization reset. Every kit script that writes through the application or by SQL calls "need" first.
#   83-snapshot.sh take <distill_db> <tag>            write a backup now (custom format) and record it
#   83-snapshot.sh need <distill_db> <tag>            take one unless the newest backup already equals the database
#   83-snapshot.sh list [<distill_db>]                the recorded backups, newest last
#   83-snapshot.sh diff <distill_db>                  tables whose content differs from the newest backup (counts only)
#   83-snapshot.sh restore <dump> <new distill_db>    restore a backup into a NEW database (never over an existing one)
# With VOLUME_ROOT set (cluster run, file 88) every backup is written to the volume of its stage:
# $VOLUME_ROOT/<volume>/, where the volume follows from the tag (88-cluster-volumes.sh list). The index folder
# then holds links only. A backup is refused when its volume is not mounted or is sealed: nothing falls back
# to the disk of the pod. SNAPSHOT_DIR moves the index folder (in the cluster: onto the reports volume).
# Refuses any database whose name does not start with distill_. Backups hold personal data: local only.
# The fingerprint is count + hash of every row of every table, so "equal" means equal content.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); dir="${SNAPSHOT_DIR:-$here/dumps/distilled}"; idx="$dir/snapshots.tsv"; mkdir -p "$dir"
C=${DOCKER:-alkemio_dev_postgres}; U=${PGUSER_:-synapse}
cmd=${1:?usage: 83-snapshot.sh take|need|list|diff|restore ...}; shift
guard() { case "$1" in distill_*) ;; *) echo "refused: $1 is not a distill_ database" >&2; exit 2;; esac; }
psqlq() { docker exec -i "$C" psql -U "$U" -d "$1" -X -q -At; }
fingerprint() {  # one line per table: name|rows|hash
  local db=$1
  psqlq "$db" <<'SQL' | psqlq "$db"
select format('select %L || ''|'' || count(*) || ''|'' || coalesce(md5(string_agg(h, '''' order by h)), ''-'') from (select md5(t::text) h from %I t) x;', tablename, tablename)
from pg_tables where schemaname = 'public' order by tablename;
SQL
}
case "$cmd" in
  take|need)
    db=${1:?database}; tag=${2:?tag}; guard "$db"
    fp=$(fingerprint "$db"); sum=$(printf '%s' "$fp" | md5sum | cut -c1-32)
    if [ "$cmd" = need ] && [ -f "$idx" ]; then
      last=$(awk -F'\t' -v d="$db" '$2==d{l=$0} END{print l}' "$idx")
      if [ -n "$last" ] && [ "$(printf '%s' "$last" | cut -f4)" = "$sum" ] && [ -f "$dir/$(printf '%s' "$last" | cut -f5)" ]; then
        echo "snapshot: $db equals its newest backup ($(printf '%s' "$last" | cut -f3)); none taken"; exit 0; fi
    fi
    ts=$(date -u +%Y%m%dT%H%M%SZ); f="$db-$ts-$tag.dump"
    out="$dir"; vol=
    if [ -n "${VOLUME_ROOT:-}" ]; then
      vol=$("$here/88-cluster-volumes.sh" volume-for-tag "$tag"); out="$VOLUME_ROOT/$vol"
      { [ -d "$out" ] && { mountpoint -q "$out" || [ -n "${VOLUME_PLAIN_OK:-}" ]; }; } || { echo "refused: the volume for '$tag' ($out) is not mounted. No backup, so no change may start." >&2; exit 3; }
      [ ! -f "$out/SEALED" ] || { echo "refused: volume $vol is sealed" >&2; exit 3; }
    fi
    docker exec "$C" pg_dump -U "$U" -Fc -d "$db" > "$out/$f"
    printf '%s\n' "$fp" > "$out/$f.fingerprint"
    if [ -n "$vol" ]; then
      ln -sf "$out/$f" "$dir/$f"; ln -sf "$out/$f.fingerprint" "$dir/$f.fingerprint"
      printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$ts" "$db" "$tag" "$sum" "$f" "$(sha256sum < "$out/$f" | cut -c1-64)" >> "$out/MANIFEST.tsv"
    fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$ts" "$db" "$tag" "$sum" "$f" >> "$idx"
    echo "snapshot: $db backed up as $f ($(du -h "$out/$f" | cut -f1))${vol:+ on volume $vol}";;
  list)
    [ -f "$idx" ] || { echo "no backups recorded"; exit 0; }
    awk -F'\t' -v d="${1:-}" 'd==""||$2==d{printf "%s  %-24s %-34s %s\n",$1,$2,$3,$5}' "$idx";;
  diff)
    db=${1:?database}; guard "$db"
    last=$(awk -F'\t' -v d="$db" '$2==d{l=$5} END{print l}' "$idx"); [ -n "$last" ] || { echo "no backup of $db"; exit 1; }
    echo "=== $db against its newest backup $last (table: rows then, rows now)"
    join -t'|' -a1 -a2 -e- -o 0,1.2,1.3,2.2,2.3 <(sort "$dir/$last.fingerprint") <(fingerprint "$db" | sort) |
      awk -F'|' '$2!=$4||$3!=$5{n++; printf "    %-40s %8s %8s%s\n",$1,$2,$4,($2==$4?"  (same count, content differs)":"")} END{print "    tables that differ: " n+0}';;
  restore)
    dump=${1:?dump file}; db=${2:?new database}; guard "$db"
    [ -f "$dump" ] || dump="$dir/$dump"
    exists=$(docker exec -i "$C" psql -U "$U" -d postgres -X -q -At -c "select 1 from pg_database where datname='$db'")
    [ -z "$exists" ] || { echo "refused: $db exists. Restore goes into a new database; drop the old one by hand if you mean it." >&2; exit 2; }
    docker exec -i "$C" psql -U "$U" -d postgres -X -q -c "create database \"$db\""
    docker exec -i "$C" pg_restore -U "$U" -d "$db" --no-owner < "$dump"
    echo "restored $(basename "$dump") into $db";;
  *) echo "unknown command $cmd" >&2; exit 2;;
esac
