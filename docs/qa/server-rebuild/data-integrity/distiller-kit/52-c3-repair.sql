-- 52-c3-repair.sql: the C3 repair as QA proposes it (2026-11-13). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- What a binding is: a comment room keeps, per thread, which virtual contributor (VC)
-- answers in that thread. It sits in room."vcData" -> interactionsByThread, keyed by
-- the chat message id that started the thread.
-- Target of every statement is what the server writes today (server develop 39d7aff38,
-- 2026-11-10):
--   room.mentions.service.ts:99-100   virtualContributorActorID: virtualContributor.id
--   room.lookup.service.ts:79-81      the binding is { virtualContributorActorID } and nothing else
--   vc.invocation.service.ts:154-181  a reply in a bound thread calls the VC by that id and
--                                     throws when no VC has it (virtual.contributor.lookup.service.ts:74)
--   message.inbox.service.ts:190-231  a thread with no binding is read as a new thread: mentions are parsed
-- R1 rewrites an id that is the old agent id of a VC that exists to the id of that VC.
--    The only map from old agent id to VC is _agent_backup_virtual_contributor (finding A1).
--    R1 must run before that table is rejected. Guard C3 G3 proves the map is one to one
--    and that no old id equals a current id.
-- R2 removes a binding whose id names no VC: an old agent id of a VC that is gone, or an
--    id nothing knows. The thread then has no binding, like a thread no VC was ever called in.
-- Not touched: the thread keys, the externalThreadId key and its value (JSON null stays
-- JSON null), bindings that already hold a current id, every other column of room.
-- Not repaired here: bindings whose thread no longer exists on the chat server. This file
-- cannot see the chat database. 53-vc-binding-threads-xcheck.sh counts them. R1 and R2
-- treat them like any other binding, which changes nothing a user can see.
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: room
\set ON_ERROR_STOP on
\pset footer off
\echo === C3 repair: image of room before the repair
CREATE TEMP TABLE rp_room AS SELECT * FROM room;
CREATE INDEX ON rp_room (id); ANALYZE rp_room;
CREATE TEMP TABLE rp_binding AS
SELECT r.id AS room, e.k AS thread, e.v AS v, e.v->>'virtualContributorActorID' AS vc
  FROM room r, jsonb_each(r."vcData"->'interactionsByThread') AS e(k, v) WHERE jsonb_typeof(r."vcData"->'interactionsByThread')='object';
-- the map, limited to VCs that exist, and only where the old id is not itself a current VC id
CREATE TEMP TABLE rp_map AS
SELECT m."agentId"::text AS old_id, v.id::text AS vc_id FROM _agent_backup_virtual_contributor m JOIN virtual_contributor v ON v.id::text=m.id::text
 WHERE m."agentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM virtual_contributor x WHERE x.id::text=m."agentId"::text);

\echo === R0: stop when the map is not one to one (expected: no error)
DO $$ BEGIN
  IF (SELECT count(*) - count(DISTINCT old_id) FROM rp_map) <> 0 THEN RAISE EXCEPTION 'an old agent id maps to more than one virtual contributor'; END IF;
  IF (SELECT count(*) - count(DISTINCT vc_id) FROM rp_map) <> 0 THEN RAISE EXCEPTION 'a virtual contributor has more than one old agent id'; END IF;
END $$;

\echo === R1: a binding that holds the old agent id of a VC that exists takes the id of that VC (expected on acceptance: UPDATE 205, that is 428 bindings in 205 rooms)
UPDATE room r SET "vcData" = jsonb_set(r."vcData", '{interactionsByThread}', n.new_map)
  FROM (SELECT r2.id,
               jsonb_object_agg(e.k, CASE WHEN mp.vc_id IS NOT NULL THEN jsonb_set(e.v, '{virtualContributorActorID}', to_jsonb(mp.vc_id)) ELSE e.v END) AS new_map,
               bool_or(mp.vc_id IS NOT NULL) AS hit
          FROM room r2 CROSS JOIN LATERAL jsonb_each(r2."vcData"->'interactionsByThread') AS e(k, v)
          LEFT JOIN rp_map mp ON mp.old_id = e.v->>'virtualContributorActorID'
         WHERE jsonb_typeof(r2."vcData"->'interactionsByThread')='object' GROUP BY r2.id) n
 WHERE n.id=r.id AND n.hit;

\echo === R2: a binding whose id names no VC is removed, the other bindings of the room stay (expected on acceptance: UPDATE 18, that is 25 bindings in 18 rooms)
\echo ===     precondition: the id is no current VC id and no old agent id of a VC that exists. So R2 never removes what R1 could have rewritten, in any order
UPDATE room r SET "vcData" = jsonb_set(r."vcData", '{interactionsByThread}', n.new_map)
  FROM (SELECT r2.id,
               COALESCE(jsonb_object_agg(e.k, e.v) FILTER (WHERE NOT d.dead), '{}'::jsonb) AS new_map,
               bool_or(d.dead) AS hit
          FROM room r2 CROSS JOIN LATERAL jsonb_each(r2."vcData"->'interactionsByThread') AS e(k, v)
          CROSS JOIN LATERAL (SELECT NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text = e.v->>'virtualContributorActorID')
                                 AND NOT EXISTS (SELECT 1 FROM rp_map mp WHERE mp.old_id = e.v->>'virtualContributorActorID') AS dead) d
         WHERE jsonb_typeof(r2."vcData"->'interactionsByThread')='object' GROUP BY r2.id) n
 WHERE n.id=r.id AND n.hit;

CREATE TEMP TABLE rp_after AS
SELECT r.id AS room, e.k AS thread, e.v AS v, e.v->>'virtualContributorActorID' AS vc
  FROM room r, jsonb_each(r."vcData"->'interactionsByThread') AS e(k, v) WHERE jsonb_typeof(r."vcData"->'interactionsByThread')='object';

\echo === check 1: the rule on the repaired state. Expected: one line, every binding holds the current id of a VC that exists (490 on acceptance)
SELECT CASE WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=a.vc) THEN '1 current id of a VC that exists'
            WHEN EXISTS (SELECT 1 FROM _agent_backup_virtual_contributor m WHERE m."agentId"::text=a.vc) THEN '2 or 3 still an old agent id (expect none)'
            ELSE '5 names nothing (expect none)' END AS situation, count(*) AS bindings, count(DISTINCT a.vc) AS vcs, count(DISTINCT a.room) AS rooms
  FROM rp_after a GROUP BY 1 ORDER BY 1;

\echo === check 2: which columns of room changed (expected: one line, vcData, 212 rooms on acceptance: 205 by R1, 18 by R2, 11 by both. Any other line is a fault)
SELECT k.key AS col, count(*) AS changed_rows FROM rp_room a JOIN room b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1 ORDER BY 1;

\echo === check 3: rooms gone, rooms new, and rooms that changed without holding a bad binding before (expected: 0, 0, 0)
SELECT (SELECT count(*) FROM rp_room a WHERE NOT EXISTS (SELECT 1 FROM room b WHERE b.id=a.id)) AS gone,
       (SELECT count(*) FROM room b WHERE NOT EXISTS (SELECT 1 FROM rp_room a WHERE a.id=b.id)) AS new_rooms,
       (SELECT count(*) FROM rp_room a JOIN room b USING (id) WHERE a."vcData" IS DISTINCT FROM b."vcData"
           AND NOT EXISTS (SELECT 1 FROM rp_binding x WHERE x.room=a.id AND NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=x.vc))) AS changed_without_a_bad_binding;

\echo === check 4: binding by binding, before against after.
\echo ===     Expected on acceptance: removed 25, added 0, id_rewritten 428, id_as_before 62, rest_of_binding_changed 0, rewritten_not_as_the_map_says 0, removed_that_had_a_vc 0
SELECT (SELECT count(*) FROM rp_binding b WHERE NOT EXISTS (SELECT 1 FROM rp_after a WHERE a.room=b.room AND a.thread=b.thread)) AS removed,
       (SELECT count(*) FROM rp_after a WHERE NOT EXISTS (SELECT 1 FROM rp_binding b WHERE a.room=b.room AND a.thread=b.thread)) AS added,
       (SELECT count(*) FROM rp_binding b JOIN rp_after a USING (room, thread) WHERE a.vc IS DISTINCT FROM b.vc) AS id_rewritten,
       (SELECT count(*) FROM rp_binding b JOIN rp_after a USING (room, thread) WHERE a.vc IS NOT DISTINCT FROM b.vc) AS id_as_before,
       (SELECT count(*) FROM rp_binding b JOIN rp_after a USING (room, thread) WHERE (a.v - 'virtualContributorActorID') IS DISTINCT FROM (b.v - 'virtualContributorActorID')) AS rest_of_binding_changed,
       (SELECT count(*) FROM rp_binding b JOIN rp_after a USING (room, thread) WHERE a.vc IS DISTINCT FROM b.vc
           AND NOT EXISTS (SELECT 1 FROM _agent_backup_virtual_contributor m WHERE m."agentId"::text=b.vc AND m.id::text=a.vc)) AS rewritten_not_as_the_map_says,
       (SELECT count(*) FROM rp_binding b WHERE NOT EXISTS (SELECT 1 FROM rp_after a WHERE a.room=b.room AND a.thread=b.thread)
           AND (EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc) OR EXISTS (SELECT 1 FROM rp_map mp WHERE mp.old_id=b.vc))) AS removed_that_had_a_vc;

\echo === check 5: shape. A repaired binding against the bindings the repair did not touch, by the keys it holds.
\echo ===     The line with only the id key must show both repaired and untouched bindings. The lines with externalThreadId have no untouched twin: that key is only on bindings moved over from the old table in 2025-12, and the server reads a missing key and JSON null the same way (room.controller.service.ts:75-81)
SELECT (SELECT string_agg(key, ' + ' ORDER BY key) FROM jsonb_object_keys(a.v) key) AS keys_held,
       CASE WHEN a.v ? 'externalThreadId' THEN jsonb_typeof(a.v->'externalThreadId') ELSE 'no key' END AS external_thread_key,
       count(*) FILTER (WHERE a.vc IS DISTINCT FROM b.vc) AS repaired, count(*) FILTER (WHERE a.vc IS NOT DISTINCT FROM b.vc) AS untouched
  FROM rp_after a JOIN rp_binding b USING (room, thread) GROUP BY 1,2 ORDER BY 1,2;

\echo === check 6: rooms left with no binding after R2 hold exactly what a room holds that never had one (expected: every emptied room on the first line)
SELECT e.value_after, e.rooms_emptied_by_the_repair,
       (SELECT count(*) FROM rp_room n WHERE n."vcData"::text = e.value_after) AS rooms_with_this_value_before_the_repair
  FROM (SELECT b."vcData"::text AS value_after, count(*) AS rooms_emptied_by_the_repair
          FROM rp_room a JOIN room b USING (id)
         WHERE a."vcData" IS DISTINCT FROM b."vcData" AND NOT EXISTS (SELECT 1 FROM rp_after x WHERE x.room=b.id) GROUP BY 1) e;

\echo === check 7: every VC a repaired binding now names, against the VCs of bindings that were never broken (expected: 0 on the first three columns)
SELECT count(*) FILTER (WHERE v.id IS NULL) AS names_no_vc,
       count(*) FILTER (WHERE v.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account ac WHERE ac.id=v."accountId")) AS vc_without_account,
       count(*) FILTER (WHERE v.id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor ac WHERE ac.id=v.id)) AS vc_without_actor,
       count(DISTINCT a.vc) FILTER (WHERE a.vc IS DISTINCT FROM b.vc) AS vcs_named_by_repaired_bindings,
       count(DISTINCT a.vc) FILTER (WHERE a.vc IS NOT DISTINCT FROM b.vc) AS vcs_named_by_untouched_bindings
  FROM rp_after a JOIN rp_binding b USING (room, thread) LEFT JOIN virtual_contributor v ON v.id::text=a.vc;
\echo === C3 repair done
