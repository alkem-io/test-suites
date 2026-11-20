-- 94-a1-repair.sql: the repair for QA register A1 (2026-11-19). Asked by the QA lead: "this must be fixed".
-- Run it through rehearse-repair.sh first (BEGIN ... ROLLBACK plus the whole classifier on the repaired state).
-- What is wrong: every subspace has an admin role definition. Its "parentCredentials" list says who ELSE passes as
-- admin of the subspace: the admins of the spaces above. In the wrong rows an entry of that list has the type
-- space-member where space-admin belongs. The server builds the admin rule of the subspace from the list
-- (space.service.authorization.ts, getCredentialsForRoleWithParents(roleSet, ADMIN)), so EVERY MEMBER of that space
-- above gets create, read, update, delete and grant on the subspace, and the admin notifications.
-- Origin: old community policy data, copied as it was by migration 1726843779059-roleSet.ts (2024-09). Subspaces made
-- later under a wrong subspace inherit the entry, because the server copies the list of the parent.
-- Target is what the server writes today (role.set.service.ts:2063 setParentRoleSetAndCredentials, v0.173.0): the list
-- of a role holds the credential of THE SAME ROLE of the parent, then the list of the parent. For an admin role every
-- entry has the type space-admin.
-- R1 in the admin definition of a space, every entry of type space-member takes the type space-admin. The space id
--    of the entry, the order and the length of the list stay.
-- R0 stops the repair when a case needs a person: an entry of another type than member or admin, a member entry
--    that names a space which is not above, a rewrite that would give the same entry twice.
-- Effect: members of the space above who are not admin there stop being admin of the subspace. Admins of the space
-- above who were not listed before become admin of the subspace, as in every sound subspace.
-- Not touched: every credential, the member and lead definitions, every other column and table.
-- Not repaired here: stored authorization policies. The wrong rule stays in authorization_policy until an
-- authorization reset runs on a server (authorizationPolicyResetAll). Lists that miss the top-level space (C8 G13).
-- Counts are acceptance counts (distilled state of 2026-11-18, equal to the copy of 2026-11-11 for these rows).
-- touches: role
\set ON_ERROR_STOP on
\pset footer off
\echo === A1 repair: image of role before the repair
CREATE TEMP TABLE a1_role AS SELECT * FROM role;
CREATE INDEX ON a1_role (id); ANALYZE a1_role;
-- admin definitions of spaces, one row per entry of the list
CREATE TEMP TABLE a1_e AS
SELECT s.id AS space_id, s.level, s."parentSpaceId" AS parent_id, p."parentSpaceId" AS grand_id, r.id AS role_id, x.ord,
       x.e->>'type' AS etype, x.e->>'resourceID' AS rid
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
  LEFT JOIN space p ON p.id=s."parentSpaceId"
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS x(e, ord);
CREATE TEMP TABLE a1_bad AS SELECT * FROM a1_e WHERE etype='space-member';
-- who passes as admin of each space through the stored definition (own credential or an entry of the list), before
CREATE TEMP TABLE a1_eff AS
SELECT DISTINCT s.id AS space_id, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === before: wrong admin definitions and entries, by level (acceptance: level 1 88 and 88, level 2 59 and 110, all 147 and 198)
SELECT level, count(DISTINCT role_id) AS admin_definitions, count(*) AS member_entries FROM a1_bad GROUP BY ROLLUP (1) ORDER BY 1;

\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM a1_e e WHERE e.role_id IN (SELECT role_id FROM a1_bad) AND e.etype NOT IN ('space-member','space-admin')) THEN
    RAISE EXCEPTION 'a wrong admin definition holds an entry that is neither space-member nor space-admin'; END IF;
  IF EXISTS (SELECT 1 FROM a1_bad b WHERE b.rid IS DISTINCT FROM b.parent_id::text AND b.rid IS DISTINCT FROM b.grand_id::text) THEN
    RAISE EXCEPTION 'a member entry names a space that is not above the subspace'; END IF;
  IF EXISTS (SELECT 1 FROM a1_e e WHERE e.role_id IN (SELECT role_id FROM a1_bad) GROUP BY e.role_id, e.rid HAVING count(*)>1) THEN
    RAISE EXCEPTION 'the rewrite would give the same entry twice in one list'; END IF;
END $$;

\echo === R1: every space-member entry of an admin definition of a space takes the type space-admin (expected on acceptance: UPDATE 147)
UPDATE role r SET "parentCredentials" =
       (SELECT jsonb_agg(CASE WHEN x.e->>'type'='space-member' THEN jsonb_set(x.e, '{type}', '"space-admin"') ELSE x.e END ORDER BY x.ord)
          FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS x(e, ord))
 WHERE r.id IN (SELECT role_id FROM a1_bad);

CREATE TEMP TABLE a1_eff_after AS
SELECT DISTINCT s.id AS space_id, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === check 1: the rule on the repaired state. Expected: 0, 0, 0
\echo ===     (admin definitions of spaces with a member entry; role rows of ANY role set, also outside spaces, with an entry of another role; entries with other keys than type and resourceID)
SELECT (SELECT count(DISTINCT r.id) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
         CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-member') AS space_admin_definitions_with_a_member_entry,
       (SELECT count(DISTINCT r.id) FROM role r CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e
         WHERE e->>'type' IS DISTINCT FROM r.credential->>'type') AS definitions_with_an_entry_of_another_type_than_their_own,
       (SELECT count(*) FROM role r CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e
         WHERE (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(e) k) <> 'resourceID,type') AS entries_with_other_keys;

\echo === check 2: only what was meant to change changed. Expected on acceptance: 147 rows changed, all admin, 0 with another column changed,
\echo ===     0 with another list length, 0 with a space id or the order changed, 198 entries changed and all of them from space-member to space-admin
SELECT count(*) AS role_rows_changed,
       count(*) FILTER (WHERE n.name::text='admin') AS of_which_admin,
       count(*) FILTER (WHERE (to_jsonb(n) - 'parentCredentials') IS DISTINCT FROM (to_jsonb(o) - 'parentCredentials')) AS with_another_column_changed,
       count(*) FILTER (WHERE jsonb_array_length(n."parentCredentials") <> jsonb_array_length(o."parentCredentials")) AS with_another_list_length,
       count(*) FILTER (WHERE (SELECT jsonb_agg(e->>'resourceID') FROM jsonb_array_elements(n."parentCredentials") e)
                         IS DISTINCT FROM (SELECT jsonb_agg(e->>'resourceID') FROM jsonb_array_elements(o."parentCredentials") e)) AS with_a_space_id_or_the_order_changed
  FROM role n JOIN a1_role o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o);
SELECT count(*) AS entries_changed,
       count(*) FILTER (WHERE x.e->>'type'='space-member' AND y.e->>'type'='space-admin') AS from_member_to_admin
  FROM role n JOIN a1_role o ON o.id=n.id
  CROSS JOIN LATERAL jsonb_array_elements(o."parentCredentials") WITH ORDINALITY AS x(e, ord)
  JOIN LATERAL jsonb_array_elements(n."parentCredentials") WITH ORDINALITY AS y(e, ord) ON y.ord=x.ord
 WHERE x.e IS DISTINCT FROM y.e;
SELECT (SELECT count(*) FROM role) AS role_rows, (SELECT count(*) FROM a1_role) AS role_rows_before,
       (SELECT count(*) FROM role n JOIN a1_role o ON o.id=n.id WHERE n.name::text<>'admin' AND to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS member_or_lead_definitions_changed;

\echo === check 3: shape twins. A repaired list against the lists of subspaces that were never wrong (parent = the space above, top = the top-level space).
\echo ===     Every repaired shape must exist among the never wrong ones
SELECT s.level,
       (SELECT string_agg(CASE WHEN e->>'resourceID'=s."parentSpaceId"::text THEN 'admin of parent' WHEN e->>'resourceID'=s."levelZeroSpaceID"::text THEN 'admin of top' ELSE 'admin of another space' END, ', ' ORDER BY o)
          FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e, o)) AS admin_list,
       count(*) FILTER (WHERE r.id IN (SELECT role_id FROM a1_bad)) AS repaired,
       count(*) FILTER (WHERE r.id NOT IN (SELECT role_id FROM a1_bad)) AS never_wrong
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
 WHERE s.level>0 GROUP BY 1,2 ORDER BY 1,3 DESC,4 DESC;

\echo === check 4: who passes as admin of a space through its definition, before against after (people and other actors, counted per space)
\echo ===     Expected: 0 changes on a space that was not repaired. Every loss is an actor who is member and not admin of a space above.
\echo ===     Every gain is an admin of a space above. Nobody who holds the admin credential of the subspace itself loses it
WITH l AS (SELECT * FROM a1_eff EXCEPT SELECT * FROM a1_eff_after), g AS (SELECT * FROM a1_eff_after EXCEPT SELECT * FROM a1_eff),
     rep AS (SELECT DISTINCT space_id FROM a1_bad)
SELECT (SELECT count(*) FROM a1_eff) AS admin_pairs_before, (SELECT count(*) FROM a1_eff_after) AS admin_pairs_after,
       (SELECT count(*) FROM l) AS pairs_lost, (SELECT count(DISTINCT actor) FROM l) AS actors_who_lose,
       (SELECT count(DISTINCT l.actor) FROM l JOIN actor a ON a.id=l.actor WHERE a.type::text='user') AS users_who_lose,
       (SELECT count(DISTINCT space_id) FROM l) AS subspaces_with_a_loss,
       (SELECT count(*) FROM g) AS pairs_gained, (SELECT count(DISTINCT actor) FROM g) AS actors_who_gain,
       (SELECT count(*) FROM l WHERE space_id NOT IN (SELECT space_id FROM rep)) + (SELECT count(*) FROM g WHERE space_id NOT IN (SELECT space_id FROM rep)) AS changes_on_a_space_not_repaired,
       (SELECT count(*) FROM l JOIN credential c ON c."actorId"=l.actor AND c.type::text='space-admin' AND c."resourceID"=l.space_id::text) AS losses_of_an_own_admin_of_the_subspace,
       (SELECT count(*) FROM l WHERE NOT EXISTS (SELECT 1 FROM a1_bad b JOIN credential c ON c.type::text='space-member' AND c."resourceID"=b.rid AND c."actorId"=l.actor WHERE b.space_id=l.space_id)) AS losses_not_explained_by_a_member_entry,
       (SELECT count(*) FROM g WHERE NOT EXISTS (SELECT 1 FROM a1_bad b JOIN credential c ON c.type::text='space-admin' AND c."resourceID"=b.rid AND c."actorId"=g.actor WHERE b.space_id=g.space_id)) AS gains_not_explained_by_an_admin_above;

\echo === check 5: how the repaired subspaces stand afterwards: with an admin of their own, and reached by an admin of a space above (a subspace with neither has no admin below platform level; info)
SELECT count(*) AS repaired_subspaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c WHERE c.type::text='space-admin' AND c."resourceID"=q.space_id::text AND c."actorId" IS NOT NULL)) AS with_an_admin_of_their_own,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM a1_eff_after e WHERE e.space_id=q.space_id)) AS with_some_admin_through_the_definition,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM a1_eff_after e WHERE e.space_id=q.space_id)) AS with_no_admin_through_the_definition
  FROM (SELECT DISTINCT space_id FROM a1_bad) q;
\echo === A1 repair done. The stored authorization policies still hold the old rule until an authorization reset runs.
