#!/usr/bin/env bash
# 89-switch-gate.sh: the gate before an environment is switched to the distilled database.
# Rule (QA lead, 2026-11-18): the switch is asked first and approved, and is made by a person. The kit never switches
# an environment, never stops a server and never loads a database into one. It prepares the request, and it refuses
# to go on until a person has recorded the approval and the switch.
#
#   89-switch-gate.sh request <run> <distill_db>   write the request for approval (counts and sums only) and print where it is
#   89-switch-gate.sh advance <run>                used by file 91 only: record that a person confirmed the WHOLE run at its start
#   89-switch-gate.sh approve <run>                A PERSON, at a terminal: approve exactly the file named in the request
#   89-switch-gate.sh switched <run>               A PERSON, at a terminal: record that the switch was made
#   89-switch-gate.sh back <run>                   A PERSON, at a terminal: record that the environment was switched back
#   89-switch-gate.sh check <run>                  exit 0 only when approved AND switched AND the approved file is unchanged
#   89-switch-gate.sh status <run>                 where the gate stands
# approve, switched and back need a terminal and ask the person to type part of the file's sum. That stops a script or
# an agent from passing the gate by accident. It is not a security control: the approval itself is the control.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); dir="${SNAPSHOT_DIR:-$here/dumps/distilled}"; idx="$dir/snapshots.tsv"
cmd=${1:?usage: 89-switch-gate.sh request|approve|switched|back|check|status <run> ...}; run=${2:?run}
out="$here/runs/$run/flow"; req="$out/89-switch-request.md"; rec="$out/89-switch-record.tsv"; mkdir -p "$out"
field() { sed -n "s/^- $1: //p" "$req" | head -1; }
person() {  # $1 = what is recorded
  if [ -n "${IN_ADVANCE:-}" ]; then   # an unattended timed run (file 91): the person confirmed the whole run at its start, at a terminal on the workstation
    [ -f "$out/89-advance.tsv" ] || { echo "refused: no confirmation in advance is recorded for run $run" >&2; exit 4; }
    [ -f "$req" ] || { echo "refused: no request for run $run" >&2; exit 2; }
    f=$(field 'file to load'); sum=$(field 'sha256'); [ "$(sha256sum < "$dir/$f" | cut -c1-64)" = "$sum" ] || { echo "refused: the file changed after the request was written." >&2; exit 2; }
    who="$(tail -1 "$out/89-advance.tsv" | cut -f2) (in advance)"; printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$who" "$sum" >> "$rec"; echo "recorded: $1 by $who"; return 0; fi
  [ -t 0 ] && [ -t 1 ] || { echo "refused: '$1' is recorded by a person at a terminal, never by a script or an agent" >&2; exit 4; }
  [ -f "$req" ] || { echo "refused: no request for run $run" >&2; exit 2; }
  f=$(field 'file to load'); sum=$(field 'sha256'); [ "$(sha256sum < "$dir/$f" | cut -c1-64)" = "$sum" ] || { echo "refused: the file changed after the request was written. Write a new request." >&2; exit 2; }
  echo "Run $run. File to load: $f"; echo "sha256: $sum"
  read -r -p "Your name: " who; [ -n "$who" ] || exit 4
  read -r -p "Type the first 8 characters of the sha256 to record '$1': " typed; [ "$typed" = "${sum:0:8}" ] || { echo "not equal: nothing recorded" >&2; exit 4; }
  printf '%s\t%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$1" "$who" "$sum" >> "$rec"; echo "recorded: $1 by $who"; }
last() { [ -f "$rec" ] && awk -F'\t' -v k="$1" '$2==k{l=$0} END{print l}' "$rec" || true; }
case "$cmd" in
  request)
    db=${3:?distilled database}; flow="$out/87-flow.out"; [ -f "$flow" ] || { echo "refused: no flow log for run $run" >&2; exit 2; }
    for st in source copy repairs; do l=$(grep -E "^$st +" "$flow" | tail -1); case "$l" in *" PASS "*) ;; *) echo "refused: stage '$st' has not passed: no request is written" >&2; exit 2;; esac; done
    row=$(awk -F'\t' -v d="$db" '$2==d && $3=="repaired-state"{l=$0} END{print l}' "$idx"); [ -n "$row" ] || { echo "refused: no repaired-state backup of $db" >&2; exit 2; }
    f=$(printf '%s' "$row" | cut -f5); sum=$(sha256sum < "$dir/$f" | cut -c1-64)
    [ -z "$("$here/83-snapshot.sh" diff "$db" | grep -v 'tables that differ: 0' | sed 1d)" ] || echo "note: $db changed after its newest backup; the request names the repaired-state backup, not the live database"
    { echo "# Request to switch an environment to the distilled database"; echo
      echo "- run: $run"; echo "- written: $(date -u +%Y-%m-%dT%H:%MZ)"; echo "- file to load: $f"; echo "- sha256: $sum"; echo "- size: $(du -hL "$dir/$f" | cut -f1)"
      echo "- state: after the copy of the valid rows and the accepted repairs. NOT yet reset: the authorization reset is the first step after the switch"; echo
      echo "## What was checked before this request"; echo; echo '```'; grep -E '^(source|copy|repairs) ' "$flow" | cut -c1-240; echo '```'; echo
      echo "## Source backups this file was made from"; echo; echo '```'
      if [ -f "${VOLUME_ROOT:-/nonexistent}/source/SHA256SUMS" ]; then sed -E 's/_[0-9_]{19}_[a-z0-9]+\./_<stamp>./' "$VOLUME_ROOT/source/SHA256SUMS"; else echo "(not a volume run: no sealed source volume)"; fi; echo '```'; echo
      cat <<'T'
## What is asked

Approval to switch ONE environment to the file above, in an agreed window, by a person.

## Steps for the person who switches

1. Announce the window. Stop the server and every service that writes to the database.
2. Take a backup of the current database and check that it restores. This is the way back. Write down its name.
3. Load the file above into a NEW database next to the current one. Never over the current one. Check the sha256 first.
4. Point the server at the new database. Start the server and the services.
5. Run the full authorization reset with the reset workers of the same release. Wait for the queue to empty. Save the worker logs.
6. Record the switch: `89-switch-gate.sh switched <run>`.
7. Take a backup of the new database after the reset and hand it to the run. The checks after the switch read that backup.

## Way back

Stop the server, point it at the old database again, start it. The old database was never changed, so nothing has
to be restored. Record it: `89-switch-gate.sh back <run>`. Whatever users did between the switch and the way back
is in the new database only and is lost for the environment.

## What this request does not prove

- The reset has not run on this file. Two repairs take effect only after it.
- Files outside the database, the chat server and the login service are not changed by the switch. Rows that were
  rejected keep their counterparts there.
- The window length is not known. On a workstation the reset took about ten minutes on acceptance data.

## To approve

A person runs `89-switch-gate.sh approve <run>` at a terminal. The approval names the sha256 above. A changed file
needs a new request.
T
    } > "$req"
    echo "request written: $req"; echo "file to load: $f"; echo "sha256: $sum";;
  advance)   # written by file 91 after a person confirmed the whole run at a terminal on the workstation. Valid for this run only.
    [ -n "${ADVANCE_BY:-}" ] || { echo "refused: ADVANCE_BY (the person's name) is missing" >&2; exit 4; }
    printf '%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$ADVANCE_BY" >> "$out/89-advance.tsv"; echo "recorded: the whole run $run was confirmed in advance by $ADVANCE_BY";;
  approve) person approved;;
  switched) [ -n "$(last approved)" ] || { echo "refused: not approved" >&2; exit 4; }; person switched;;
  back) person switched-back;;
  check|status)
    a=$(last approved); s=$(last switched); b=$(last switched-back); ok=1; why=
    [ -f "$req" ] || { ok=0; why="no request written"; }
    if [ $ok -eq 1 ]; then f=$(field 'file to load'); sum=$(field 'sha256')
      [ -n "$a" ] || { ok=0; why="not approved by a person"; }
      [ -z "$a" ] || [ "$(printf '%s' "$a" | cut -f4)" = "$sum" ] || { ok=0; why="the approval names another file than the request"; }
      [ $ok -eq 0 ] || [ -n "$s" ] || { ok=0; why="approved, the switch is not recorded yet"; }
      [ $ok -eq 0 ] || [ "$(sha256sum < "$dir/$f" | cut -c1-64)" = "$sum" ] || { ok=0; why="the approved file changed"; }
      [ $ok -eq 0 ] || [ -z "$b" ] || [[ "$(printf '%s' "$b" | cut -f1)" < "$(printf '%s' "$s" | cut -f1)" ]] || { ok=0; why="the environment was switched back"; }
    fi
    if [ $ok -eq 1 ]; then echo "gate open: approved by $(printf '%s' "$a" | cut -f3) at $(printf '%s' "$a" | cut -f1), switched by $(printf '%s' "$s" | cut -f3) at $(printf '%s' "$s" | cut -f1)"; else echo "gate closed: $why"; fi
    [ "$cmd" = status ] || [ $ok -eq 1 ];;
  *) echo "unknown command $cmd" >&2; exit 2;;
esac
