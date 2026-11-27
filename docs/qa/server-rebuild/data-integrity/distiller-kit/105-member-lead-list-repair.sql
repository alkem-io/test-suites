-- 105-member-lead-list-repair.sql: the member and lead lists of subspaces (register A3 remainder), QA lead 2026-11-19:
-- "should be done and should have a guard about it". Run it through rehearse-repair.sh first. Guard: 106-list-shape-guard.sql.
-- Run AFTER 58 and 98: 98 fills the admin lists and removes entries that name a space not above (its R3 and R4).
-- What is wrong: the member and lead definition of a subspace lists the credential of the same role of the spaces
-- above ("parentCredentials"). 138 sub-subspaces on acceptance hold a short list: 133 the parent only, 4 the
-- top-level space only, 1 nothing. Live cause: a sub-subspace created from a template gets its lists before its
-- parent has its own (server#6785); moves and conversions (server#6592).
-- What the server does with the member list (v0.173.0): the contribute rule with "inheritMembershipRights" on
-- (collaboration.service.authorization.ts, every entry); apply and join for members of the FIRST entry
-- (community.service.authorization.ts, space.service.authorization.ts); which virtual contributors are offered.
-- The lead list is not read with its parents anywhere; it is repaired too so that all three lists have one shape.
-- Target is what the server writes (role.set.service.ts:2063): the credential of the parent, then the list of the
-- parent. So: the same-role credential of every space above, nearest first. The spaces above are found by walking up
-- the parents, not from the level. The credential is the one the definition of that space above stores.
-- R0 stops when a case needs a person: a definition above that does not name its own space (run 58 first), a list
--    that holds an entry which is not in the target (run 98 first).
-- R1 every member or lead list of a subspace that is not the target becomes the target: every space above, the
--    parent FIRST. That adds the missing entries, keeps an entry held twice once (56 lead lists on acceptance hold
--    the top-level space twice and miss the parent, made in 2022 and 2023), and puts the parent first where the
--    top-level space stood first (89 member lists written by the server migration of 2025-06-21, commit fbfb71cabc).
--    No entry that names a space above is removed (R0 stops on any other entry).
-- ORDER, ruled by the QA lead 2026-11-19 after walk 107: parent first. The server takes the first entry of the
--    MEMBER list as "the direct parent" when it writes the join and apply rule. Walk 107 showed that top first gives
--    no membership without the parent (the join checks the real parent), only a Join offer that is refused when the
--    subspace is public with the invite setting off. Parent first removes that offer. Guard 106 G5 expects 0.
-- Effect: members of a space above gain the contribute rule where the setting is on. Nobody loses a working path: the refused Join offer goes away.
-- Not touched: admin lists (98), every credential, every other table.
-- Not repaired here: stored authorization policies: an authorization reset must follow.
-- touches: role
\set ON_ERROR_STOP on
\pset footer off
\echo === member and lead list repair: image of role before the repair
CREATE TEMP TABLE ml_role AS SELECT * FROM role;
CREATE INDEX ON ml_role (id);
CREATE TEMP TABLE ml_anc AS
WITH RECURSIVE up AS (
  SELECT s.id AS space_id, s."parentSpaceId" AS above, 1 AS dist FROM space s WHERE s."parentSpaceId" IS NOT NULL
  UNION ALL SELECT u.space_id, p."parentSpaceId", u.dist+1 FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL AND u.dist<10)
SELECT u.space_id, s.level, r.id AS role_id, r.name::text AS role, u.above, u.dist, ar.credential AS above_cred
  FROM up u JOIN space s ON s.id=u.space_id JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text IN ('member','lead')
  JOIN space x ON x.id=u.above JOIN community xcm ON xcm.id=x."communityId" JOIN role ar ON ar."roleSetId"=xcm."roleSetId" AND ar.name::text=r.name::text;
CREATE TEMP TABLE ml_fix AS
SELECT a.space_id, a.level, a.role_id, a.role, jsonb_agg(a.above_cred ORDER BY a.dist) AS target, o."parentCredentials" AS old,
       jsonb_agg(a.above_cred ORDER BY a.dist) AS filled
  FROM ml_anc a JOIN ml_role o ON o.id=a.role_id GROUP BY 1,2,3,4,o."parentCredentials";
CREATE INDEX ON ml_fix (role_id);
-- who passes as member (or lead) of a space or of a space above it, through the stored definition, before
CREATE TEMP TABLE ml_eff AS
SELECT DISTINCT s.id AS space_id, r.name::text AS role, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text IN ('member','lead')
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === before: member and lead lists of subspaces that are not the target (acceptance: 138 member and 138 lead lists, in 138 subspaces)
SELECT role, level, count(*) FILTER (WHERE old<>target) AS lists_not_the_target,
       count(*) FILTER (WHERE jsonb_array_length(old)=0) AS empty,
       count(*) FILTER (WHERE jsonb_array_length(old)>0 AND old<>target AND old->0 = target->0) AS first_entry_right_but_short,
       count(*) FILTER (WHERE jsonb_array_length(old)>0 AND old->0 <> target->0) AS first_entry_is_not_the_parent
  FROM ml_fix GROUP BY 1,2 ORDER BY 1,2;

\echo === before: lists that hold one entry twice, per role (they keep it once)
SELECT role, count(*) AS lists_with_an_entry_twice FROM ml_fix f WHERE jsonb_array_length(f.old) > (SELECT count(DISTINCT e) FROM jsonb_array_elements(f.old) e) GROUP BY 1 ORDER BY 1;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ml_anc WHERE NOT (above_cred->>'type'='space-'||role AND above_cred->>'resourceID'=above::text)) THEN
    RAISE EXCEPTION 'a member or lead definition of a space above does not name its own space: run 58-c8-repair.sql first'; END IF;
  IF EXISTS (SELECT 1 FROM ml_fix f CROSS JOIN LATERAL jsonb_array_elements(f.old) e WHERE NOT f.target @> jsonb_build_array(e)) THEN
    RAISE EXCEPTION 'a member or lead list holds an entry that is not a space above: run 98-admin-list-repair.sql first'; END IF;
END $$;

\echo === R1: every member or lead list that is not the target becomes the target, parent first
UPDATE role r SET "parentCredentials" = f.filled FROM ml_fix f WHERE f.role_id=r.id AND f.filled <> f.old;

CREATE TEMP TABLE ml_eff_after AS
SELECT DISTINCT s.id AS space_id, r.name::text AS role, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text IN ('member','lead')
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === check 1: the rule on the repaired state. Expected: 0 and 0 (member, lead lists that miss a space above), then 0 and 0 (lists complete but not parent first), then the order count for admin lists (not touched here; order does not matter for admin)
SELECT (SELECT count(*) FROM ml_fix f JOIN role r ON r.id=f.role_id WHERE f.role='member' AND NOT r."parentCredentials" @> f.target) AS member_lists_missing_a_space_above,
       (SELECT count(*) FROM ml_fix f JOIN role r ON r.id=f.role_id WHERE f.role='lead' AND NOT r."parentCredentials" @> f.target) AS lead_lists_missing_a_space_above,
       (SELECT count(*) FROM ml_fix f JOIN role r ON r.id=f.role_id WHERE f.role='member' AND r."parentCredentials" @> f.target AND r."parentCredentials"<>f.target) AS member_lists_complete_not_parent_first,
       (SELECT count(*) FROM ml_fix f JOIN role r ON r.id=f.role_id WHERE f.role='lead' AND r."parentCredentials" @> f.target AND r."parentCredentials"<>f.target) AS lead_lists_complete_not_parent_first,
       (SELECT count(*) FROM (SELECT ar.id, ar."parentCredentials" AS pc, jsonb_agg(jsonb_build_object('type','space-admin','resourceID',a.above::text) ORDER BY a.dist) AS t
                                FROM ml_anc a JOIN community cm ON cm.id=(SELECT "communityId" FROM space WHERE id=a.space_id) JOIN role ar ON ar."roleSetId"=cm."roleSetId" AND ar.name::text='admin'
                               WHERE a.role='member' GROUP BY 1,2) q
         WHERE (SELECT jsonb_agg(jsonb_build_object('type',e->>'type','resourceID',e->>'resourceID') ORDER BY o) FROM jsonb_array_elements(q.pc) WITH ORDINALITY x(e,o)) IS DISTINCT FROM q.t) AS admin_lists_not_the_chain_above;

\echo === check 2: only what was meant to change changed. Expected: member and lead rows only, 0 admin or other, 0 with another column changed, 0 old entries gone
SELECT count(*) AS role_rows_changed, count(*) FILTER (WHERE n.name::text='member') AS member, count(*) FILTER (WHERE n.name::text='lead') AS lead,
       count(*) FILTER (WHERE n.name::text NOT IN ('member','lead')) AS of_another_role,
       count(*) FILTER (WHERE (to_jsonb(n) - 'parentCredentials') IS DISTINCT FROM (to_jsonb(o) - 'parentCredentials')) AS with_another_column_changed,
       (SELECT count(*) FROM role n2 JOIN ml_role o2 ON o2.id=n2.id CROSS JOIN LATERAL jsonb_array_elements(o2."parentCredentials") x(e)
         WHERE to_jsonb(n2) IS DISTINCT FROM to_jsonb(o2) AND NOT n2."parentCredentials" @> jsonb_build_array(x.e)) AS old_entries_gone,
       sum(jsonb_array_length(n."parentCredentials") - jsonb_array_length(o."parentCredentials")) AS entries_added,
       count(DISTINCT (SELECT f.space_id FROM ml_fix f WHERE f.role_id=n.id)) AS subspaces
  FROM role n JOIN ml_role o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o);

\echo === check 3: shape twins. Lists of repaired subspaces against lists that were never touched
SELECT f.role, f.level,
       (SELECT string_agg(CASE WHEN e->>'resourceID'=s."parentSpaceId"::text THEN 'parent' WHEN e->>'resourceID'=s."levelZeroSpaceID"::text THEN 'top' ELSE 'a space above' END, ', ' ORDER BY o)
          FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e, o)) AS list,
       count(*) FILTER (WHERE f.old<>f.filled) AS repaired, count(*) FILTER (WHERE f.old=f.filled) AS never_touched
  FROM ml_fix f JOIN role r ON r.id=f.role_id JOIN space s ON s.id=f.space_id GROUP BY 1,2,3 ORDER BY 1,2,4 DESC,5 DESC;

\echo === check 4: who passes as member or lead from the space or a space above it, through the definition, before against after
\echo ===     Expected: 0 pairs lost, 0 changes on a space not repaired, every gain is a holder of the same role in a space above
WITH l AS (SELECT * FROM ml_eff EXCEPT SELECT * FROM ml_eff_after), g AS (SELECT * FROM ml_eff_after EXCEPT SELECT * FROM ml_eff),
     rep AS (SELECT DISTINCT space_id FROM ml_fix WHERE old<>filled)
SELECT role, (SELECT count(*) FROM g WHERE g.role=x.role) AS pairs_gained, (SELECT count(DISTINCT actor) FROM g WHERE g.role=x.role) AS actors_who_gain,
       (SELECT count(DISTINCT g.actor) FROM g JOIN "user" u ON u.id=g.actor WHERE g.role=x.role) AS of_which_users,
       (SELECT count(DISTINCT space_id) FROM g WHERE g.role=x.role) AS subspaces_with_a_gain,
       (SELECT count(*) FROM l WHERE l.role=x.role) AS pairs_lost,
       (SELECT count(*) FROM g WHERE g.role=x.role AND space_id NOT IN (SELECT space_id FROM rep)) + (SELECT count(*) FROM l WHERE l.role=x.role AND space_id NOT IN (SELECT space_id FROM rep)) AS changes_on_a_space_not_repaired,
       (SELECT count(*) FROM g WHERE g.role=x.role AND NOT EXISTS (SELECT 1 FROM ml_anc f JOIN credential c ON c.type::text='space-'||f.role AND c."resourceID"=f.above::text AND c."actorId"=g.actor WHERE f.space_id=g.space_id AND f.role=g.role)) AS gains_not_explained_by_a_holder_above
  FROM (VALUES ('member'),('lead')) x(role);

\echo === check 5: what the server will do with the gains (member list only; the lead list is not read with its parents)
\echo ===     the contribute rule: gains count only where "inheritMembershipRights" is on
WITH g AS (SELECT * FROM ml_eff_after WHERE role='member' EXCEPT SELECT * FROM ml_eff WHERE role='member')
SELECT (s.settings->'collaboration'->>'inheritMembershipRights')::boolean AS inherit_on, s.settings->'privacy'->>'mode' AS privacy,
       count(*) AS pairs_gained, count(DISTINCT g.actor) AS actors, count(DISTINCT g.actor) FILTER (WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=g.actor)) AS users, count(DISTINCT g.space_id) AS subspaces
  FROM g JOIN space s ON s.id=g.space_id GROUP BY 1,2 ORDER BY 1,2;

\echo === check 6: the first entry. The server takes it of the MEMBER list as "the direct parent" for the join and apply rule. Lists whose first entry changed = lists that had the top-level space first (acceptance: 93 member); after the repair the first entry is the parent everywhere
SELECT f.role, count(*) FILTER (WHERE jsonb_array_length(f.old)>0 AND f.old->0 <> f.filled->0) AS lists_whose_first_entry_changed, count(*) FILTER (WHERE (SELECT r."parentCredentials"->0 FROM role r WHERE r.id=f.role_id) IS DISTINCT FROM f.target->0) AS lists_whose_first_entry_is_not_the_parent_now,
       count(*) FILTER (WHERE jsonb_array_length(f.old)=0) AS lists_that_were_empty_and_get_the_parent_first
  FROM ml_fix f GROUP BY 1 ORDER BY 1;
\echo === member and lead list repair done. The stored authorization policies change only with an authorization reset.
