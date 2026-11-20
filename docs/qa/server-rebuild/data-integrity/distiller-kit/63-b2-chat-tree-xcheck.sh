#!/usr/bin/env bash
# 63-b2-chat-tree-xcheck.sh  (2026-11-16, written in the B2 second pass)
# Guard, not a repair. Reads only, prints counts only, never an id.
# The chat server keeps its own copy of the space tree: every space has a chat space, and a
# subspace is linked to the chat space of its parent (state events m.space.parent on the child
# and m.space.child on the parent). The server moves these links when it moves a space
# (space.move.rooms.service.ts, develop of 2026-11-10). A change of a parent pointer made in
# the platform database alone does not move them.
# Question it serves: does the chat tree agree with the platform tree, overall and for the
# spaces of finding B2 (a top-level space that still points at a parent, a sub-subspace under
# a sub-subspace)? The answer says which side a hierarchy repair has to follow up.
# The two databases cannot be joined, so the platform tree is exported as hashes to a temp
# file and loaded into a temp table on the chat side. The temp file is removed at the end.
# Both databases must be backups of the same moment.
#
# usage: 63-b2-chat-tree-xcheck.sh <alkemio_db> <synapse_db>
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./63-b2-chat-tree-xcheck.sh alkemio acc_synapse > runs/acc-2026-11-11/63-alkemio.out
set -uo pipefail
adb=${1:?usage: 63-b2-chat-tree-xcheck.sh <alkemio_db> <synapse_db>}
sdb=${2:?usage: 63-b2-chat-tree-xcheck.sh <alkemio_db> <synapse_db>}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
# md5 of space id | md5 of parent id (empty for none) | level | kind
$PSQL -d "$adb" -X -q -At -F '|' -c "
SELECT md5(s.id::text), coalesce(md5(s.\"parentSpaceId\"::text), ''), s.level,
       CASE WHEN s.level=0 AND s.\"parentSpaceId\" IS NOT NULL THEN '1 top-level space that still points at a parent'
            WHEN s.level>0 AND p.level=s.level THEN '2 sub-subspace under a sub-subspace'
            WHEN s.level=0 THEN '3 top-level space' ELSE '4 subspace' END
  FROM space s LEFT JOIN space p ON p.id=s.\"parentSpaceId\" ORDER BY 1" > "$tmp" || exit 1
{
cat <<'SQL'
\pset footer off
CREATE TEMP TABLE t (sp text PRIMARY KEY, par text, level int, kind text);
\copy t FROM pstdin WITH (FORMAT csv, DELIMITER '|')
SQL
cat "$tmp"
cat <<'SQL'
\.
UPDATE t SET par=NULL WHERE par='';
ANALYZE t;
-- the chat space of a platform space: its alias holds the id of the space
CREATE TEMP TABLE sr AS
SELECT md5(substring(ra.room_alias from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')) AS sp, ra.room_id
  FROM room_aliases ra WHERE ra.room_alias ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
CREATE INDEX ON sr (sp); CREATE INDEX ON sr (room_id); ANALYZE sr;
-- live parent links on the chat side (a removed link is a state event with empty content)
CREATE TEMP TABLE lk AS
SELECT c.sp AS child, p.sp AS parent FROM current_state_events e JOIN event_json j ON j.event_id=e.event_id
  JOIN sr c ON c.room_id=e.room_id JOIN sr p ON p.room_id=e.state_key
 WHERE e.type='m.space.parent' AND (j.json::jsonb->'content') ? 'via';
CREATE TEMP TABLE lc AS
SELECT c.sp AS child, p.sp AS parent FROM current_state_events e JOIN event_json j ON j.event_id=e.event_id
  JOIN sr p ON p.room_id=e.room_id JOIN sr c ON c.room_id=e.state_key
 WHERE e.type='m.space.child' AND (j.json::jsonb->'content') ? 'via';
\echo === 63 X1 spaces of the platform and their chat space (acceptance 2026-11-11: 1,948 spaces, all with a chat space)
SELECT count(*) AS spaces, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM sr WHERE sr.sp=t.sp)) AS with_a_chat_space FROM t;
\echo === 63 X2 the parent link on the chat side against the parent pointer of the platform, by kind of space
\echo ===     (acceptance: the top-level space with a leftover pointer has NO chat parent, so the chat side already shows it as top-level;
\echo ===      of the 2 deep spaces 1 hangs under its sub-subspace parent on the chat side as well and 1 has no chat parent at all)
SELECT t.kind, count(*) AS spaces,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM lk WHERE lk.child=t.sp)) AS no_chat_parent,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lk WHERE lk.child=t.sp AND lk.parent=t.par)) AS chat_parent_is_the_platform_parent,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lk WHERE lk.child=t.sp AND lk.parent IS DISTINCT FROM t.par)) AS chat_parent_is_another_space,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lc WHERE lc.child=t.sp AND lc.parent=t.par)) AS listed_as_child_by_the_platform_parent,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lc WHERE lc.child=t.sp AND lc.parent IS DISTINCT FROM t.par)) AS listed_as_child_by_another_space
  FROM t GROUP BY 1 ORDER BY 1;
\echo === 63 X3 for a sub-subspace under a sub-subspace: is the subspace two steps above its chat parent already (acceptance: 0)
SELECT count(*) AS deep_spaces, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lk JOIN t p ON p.sp=t.par WHERE lk.child=t.sp AND lk.parent=p.par)) AS chat_parent_is_the_subspace_two_steps_above
  FROM t WHERE t.kind LIKE '2 %';
\echo === 63 done
SQL
} | $PSQL -d "$sdb" -X -q 2>&1
