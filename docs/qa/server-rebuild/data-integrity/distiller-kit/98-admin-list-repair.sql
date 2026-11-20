-- 98-admin-list-repair.sql: the repair for the admin rule of the QA lead (2026-11-19), register A3 for the admin lists.
-- Run it through rehearse-repair.sh first. Guard: 97-admin-down-rule.sql.
-- Rule: "Admin of a top-level space: admin rights on every subspace and sub-subspace below. Admin of a subspace: admin
-- rights on every sub-subspace under it. A role in the child is not required."
-- What is wrong: the admin definition of a subspace lists the admin credential of the spaces above ("parentCredentials").
-- In some sub-subspaces the list misses the top-level space, in a few it misses the parent. Where no inherited rule
-- covers it, the admin of that space above has no right on the sub-subspace.
-- Target is what the server writes for a sub-subspace today (role.set.service.ts:2063, v0.173.0): the admin credential
-- of the parent, then the list of the parent, which holds the admin credential of the top-level space.
-- R1 an admin list of a subspace that misses the admin credential of its parent gets it as FIRST entry.
-- R2 an admin list that misses the admin credential of a space further above (for a sub-subspace: the top-level
--    space) gets it as LAST entry. The spaces above are found by walking up the parents, not from the level.
--    The credential added is the one the admin definition of that space above stores (follow the definition).
-- R0 stops when a case needs a person: a space above whose admin definition does not name its own space (run 58 first),
--    an admin list that still holds a member entry (run 94 first).
-- R3 (QA lead, 2026-11-19: "Yes, remove them") an entry of an admin list that names a space which is NOT above the
--    subspace is removed. It is the old place after a move or a promotion: the server calls the function that
--    rewrites the list but does not save the result (server#6592, open; the same pattern is in every move and
--    conversion of conversion.service.ts). The admins of the old place lose their admin rights on the subspace.
-- Effect of R1 and R2: only gains, admins of a space above become admin of the subspace.
-- Effect of R3: only losses, and only for admins of a space the subspace is not under.
-- R4 (QA lead, 2026-11-19: "yes") the same removal for the member and lead lists of spaces: an entry naming a space not above is removed.
-- Not touched: every other entry of the member and lead lists (the rule is about admins), every credential, every other table.
-- Not repaired here: stored authorization policies: an authorization reset must follow.
-- The live generator is open: the server still writes one-entry lists when a subspace is created with nested
-- subspaces (C8 G13: 3 after 2026-09-11). Until that is fixed in the server the guard 97 can read above 0 again.
-- touches: role
\set ON_ERROR_STOP on
\pset footer off
\echo === admin list repair: image of role before the repair
CREATE TEMP TABLE al_role AS SELECT * FROM role;
CREATE INDEX ON al_role (id);
-- every space above every subspace (walked up through the parent, so a subspace that sits deeper than level 2 gets
-- all of them), with the admin credential that space above stores in its own admin definition
CREATE TEMP TABLE al_anc AS
WITH RECURSIVE up AS (
  SELECT s.id AS space_id, s."parentSpaceId" AS above, 1 AS dist FROM space s WHERE s."parentSpaceId" IS NOT NULL
  UNION ALL SELECT u.space_id, p."parentSpaceId", u.dist+1 FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL AND u.dist<10)
SELECT u.space_id, s.level, r.id AS role_id, u.above, u.dist, ar.credential AS above_cred,
       NOT r."parentCredentials" @> jsonb_build_array(ar.credential) AS missing
  FROM up u JOIN space s ON s.id=u.space_id JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  JOIN space x ON x.id=u.above JOIN community xcm ON xcm.id=x."communityId" JOIN role ar ON ar."roleSetId"=xcm."roleSetId" AND ar.name::text='admin';
CREATE TEMP TABLE al_fix AS
SELECT space_id, level, role_id, bool_or(missing AND dist=1) AS miss_parent, bool_or(missing AND dist>1) AS miss_higher,
       (SELECT jsonb_agg(a2.above_cred ORDER BY a2.dist) FROM al_anc a2 WHERE a2.role_id=a.role_id AND a2.missing AND a2.dist=1) AS add_first,
       (SELECT jsonb_agg(a2.above_cred ORDER BY a2.dist) FROM al_anc a2 WHERE a2.role_id=a.role_id AND a2.missing AND a2.dist>1) AS add_last
  FROM al_anc a GROUP BY 1,2,3;
-- who passes as admin of each space through the stored definition, before
CREATE TEMP TABLE al_eff AS
SELECT DISTINCT s.id AS space_id, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === before: admin lists that miss a space above (acceptance: 5 miss the parent, 136 miss a space further above, 140 subspaces)
SELECT level, count(*) FILTER (WHERE miss_parent) AS miss_the_parent, count(*) FILTER (WHERE miss_higher) AS miss_a_space_further_above,
       count(*) FILTER (WHERE miss_parent OR miss_higher) AS subspaces FROM al_fix GROUP BY ROLLUP (1) ORDER BY 1;

\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM al_anc WHERE missing AND NOT (above_cred->>'type'='space-admin' AND above_cred->>'resourceID'=above::text)) THEN
    RAISE EXCEPTION 'the admin definition of a space above does not name its own space: run 58-c8-repair.sql first'; END IF;
  IF EXISTS (SELECT 1 FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin', jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'<>'space-admin') THEN
    RAISE EXCEPTION 'an admin list holds an entry of another type: run 94-a1-repair.sql first'; END IF;
END $$;

\echo === R1: the admin credential of the parent becomes the first entry where it is missing (expected on acceptance: UPDATE 5)
UPDATE role r SET "parentCredentials" = f.add_first || r."parentCredentials" FROM al_fix f WHERE f.role_id=r.id AND f.miss_parent;
\echo === R2: the admin credential of every space further above becomes a last entry where it is missing (expected on acceptance: UPDATE 136)
UPDATE role r SET "parentCredentials" = r."parentCredentials" || f.add_last FROM al_fix f WHERE f.role_id=r.id AND f.miss_higher;

\echo === R3: entries of an admin list that name a space not above the subspace are removed (expected on acceptance: UPDATE 4, that is 5 entries)
CREATE TEMP TABLE al_old AS
SELECT s.id AS space_id, r.id AS role_id, x.e->>'resourceID' AS named
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") x(e)
 WHERE NOT EXISTS (SELECT 1 FROM al_anc a WHERE a.space_id=s.id AND a.above::text=x.e->>'resourceID');
UPDATE role r SET "parentCredentials" =
       coalesce((SELECT jsonb_agg(x.e ORDER BY x.ord) FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e, ord)
                  WHERE EXISTS (SELECT 1 FROM al_anc a WHERE a.role_id=r.id AND a.above::text=x.e->>'resourceID')), '[]'::jsonb)
 WHERE r.id IN (SELECT role_id FROM al_old);

\echo === R4 (QA lead, 2026-11-19: "yes", the same for the member and lead lists): entries of a member or lead list of a space that name a space not above it are removed (expected on acceptance: UPDATE 8, that is 5 member and 5 lead entries in 4 subspaces)
CREATE TEMP TABLE al_up AS
WITH RECURSIVE up AS (SELECT s.id AS sid, s."parentSpaceId" AS above FROM space s WHERE s."parentSpaceId" IS NOT NULL
                      UNION ALL SELECT u.sid, p."parentSpaceId" FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL)
SELECT sid, above FROM up;
CREATE TEMP TABLE al_old_ml AS
SELECT s.id AS space_id, r.id AS role_id, r.name::text AS role, x.e->>'type' AS typ, x.e->>'resourceID' AS named
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text IN ('member','lead')
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") x(e)
 WHERE NOT EXISTS (SELECT 1 FROM al_up a WHERE a.sid=s.id AND a.above::text=x.e->>'resourceID');
CREATE TEMP TABLE al_role_ml AS SELECT r.* FROM role r WHERE r.id IN (SELECT role_id FROM al_old_ml);
UPDATE role r SET "parentCredentials" =
       coalesce((SELECT jsonb_agg(x.e ORDER BY x.ord) FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e, ord)
                  WHERE EXISTS (SELECT 1 FROM al_up a JOIN community cm ON cm."roleSetId"=r."roleSetId" JOIN space s ON s."communityId"=cm.id AND s.id=a.sid WHERE a.above::text=x.e->>'resourceID')), '[]'::jsonb)
 WHERE r.id IN (SELECT role_id FROM al_old_ml);
\echo === check R4: entries removed by role; what is left of such entries in any space role (expect 0); rows where another column changed (expect 0); actors who hold a named credential (they no longer pass as member or lead from above)
SELECT (SELECT count(*) FROM al_old_ml WHERE role='member') AS member_entries_removed, (SELECT count(*) FROM al_old_ml WHERE role='lead') AS lead_entries_removed,
       (SELECT count(DISTINCT space_id) FROM al_old_ml) AS subspaces,
       (SELECT count(*) FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") x(e)
         WHERE NOT EXISTS (SELECT 1 FROM al_up a WHERE a.sid=s.id AND a.above::text=x.e->>'resourceID')) AS such_entries_left_in_any_space_role,
       (SELECT count(*) FROM role n JOIN al_role_ml o ON o.id=n.id WHERE (to_jsonb(n) - 'parentCredentials' - 'updatedDate' - 'version') <> (to_jsonb(o) - 'parentCredentials' - 'updatedDate' - 'version')) AS with_another_column_changed,
       (SELECT count(DISTINCT c."actorId") FROM credential c JOIN al_old_ml d ON d.typ=c.type::text AND d.named=c."resourceID" WHERE d.role='member') AS member_holders_of_an_old_place,
       (SELECT count(DISTINCT c."actorId") FROM credential c JOIN al_old_ml d ON d.typ=c.type::text AND d.named=c."resourceID" WHERE d.role='lead') AS lead_holders_of_an_old_place;

CREATE TEMP TABLE al_eff_after AS
SELECT DISTINCT s.id AS space_id, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL (SELECT r.credential AS e UNION ALL SELECT jsonb_array_elements(r."parentCredentials")) d
  JOIN credential c ON c.type::text=d.e->>'type' AND c."resourceID"=d.e->>'resourceID' WHERE c."actorId" IS NOT NULL;

\echo === check 1: the rule on the repaired state. Expected: 0, 0, 0, 0 (admin lists missing the parent; missing a space further above; holding the same entry twice; entries naming a space not above)
SELECT (SELECT count(*) FROM al_anc a JOIN role r ON r.id=a.role_id WHERE a.dist=1 AND NOT r."parentCredentials" @> jsonb_build_array(a.above_cred)) AS admin_lists_missing_the_parent,
       (SELECT count(*) FROM al_anc a JOIN role r ON r.id=a.role_id WHERE a.dist>1 AND NOT r."parentCredentials" @> jsonb_build_array(a.above_cred)) AS admin_lists_missing_a_space_further_above,
       (SELECT count(*) FROM (SELECT r.id FROM role r, jsonb_array_elements(r."parentCredentials") e WHERE r.name::text='admin' GROUP BY r.id, e HAVING count(*)>1) q) AS admin_lists_with_an_entry_twice,
       (SELECT count(*) FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
          CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") x(e)
         WHERE NOT EXISTS (SELECT 1 FROM al_anc a WHERE a.space_id=s.id AND a.above::text=x.e->>'resourceID')) AS entries_naming_a_space_not_above;

\echo === check 2: admin lists only (member and lead lists: check R4). Only what was meant to change changed. Expected on acceptance: 140 rows, all admin, 0 with another column changed,
\echo ===     entries gone = the 5 of R3 and no other, 141 entries added
SELECT count(*) AS role_rows_changed, count(*) FILTER (WHERE n.name::text='admin') AS of_which_admin,
       count(*) FILTER (WHERE (to_jsonb(n) - 'parentCredentials') IS DISTINCT FROM (to_jsonb(o) - 'parentCredentials')) AS with_another_column_changed,
       (SELECT count(*) FROM al_old) AS entries_removed_by_r3,
       (SELECT count(*) FROM role n2 JOIN al_role o2 ON o2.id=n2.id CROSS JOIN LATERAL jsonb_array_elements(o2."parentCredentials") x(e)
         WHERE n2.name::text='admin' AND NOT n2."parentCredentials" @> jsonb_build_array(x.e) AND NOT EXISTS (SELECT 1 FROM al_old d WHERE d.role_id=n2.id AND d.named=x.e->>'resourceID')) AS other_old_entries_gone_or_changed,
       sum(jsonb_array_length(n."parentCredentials") - jsonb_array_length(o."parentCredentials")) + (SELECT count(*) FROM al_old) AS entries_added
  FROM role n JOIN al_role o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o) AND n.name::text='admin';

\echo === check 3: shape twins. Lists of repaired subspaces against lists that were never touched
SELECT s.level,
       (SELECT string_agg(CASE WHEN e->>'resourceID'=s."parentSpaceId"::text THEN 'admin of parent' WHEN e->>'resourceID'=s."levelZeroSpaceID"::text THEN 'admin of top' WHEN EXISTS (SELECT 1 FROM al_anc z WHERE z.space_id=s.id AND z.above::text=e->>'resourceID') THEN 'admin of a space above' ELSE 'admin of another space' END, ', ' ORDER BY o)
          FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e, o)) AS admin_list,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM al_fix f WHERE f.role_id=r.id AND (f.miss_parent OR f.miss_higher))) AS repaired,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM al_fix f WHERE f.role_id=r.id AND (f.miss_parent OR f.miss_higher))) AS never_touched
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
 WHERE s.level>0 GROUP BY 1,2 ORDER BY 1,3 DESC,4 DESC;

\echo === check 4: who passes as admin of a space through its definition, before against after
\echo ===     Expected: 0 changes on a space not repaired, every gain is an admin of a space above, every loss is an admin of a removed old place and not admin of the subspace itself or of a space above it
WITH l AS (SELECT * FROM al_eff EXCEPT SELECT * FROM al_eff_after), g AS (SELECT * FROM al_eff_after EXCEPT SELECT * FROM al_eff),
     rep AS (SELECT space_id FROM al_fix WHERE miss_parent OR miss_higher UNION SELECT space_id FROM al_old)
SELECT (SELECT count(*) FROM g) AS pairs_gained, (SELECT count(DISTINCT actor) FROM g) AS actors_who_gain,
       (SELECT count(*) FROM l) AS pairs_lost, (SELECT count(DISTINCT actor) FROM l) AS actors_who_lose, (SELECT count(DISTINCT space_id) FROM l) AS subspaces_with_a_loss,
       (SELECT count(*) FROM g WHERE space_id NOT IN (SELECT space_id FROM rep)) + (SELECT count(*) FROM l WHERE space_id NOT IN (SELECT space_id FROM rep)) AS changes_on_a_space_not_repaired,
       (SELECT count(*) FROM g WHERE NOT EXISTS (SELECT 1 FROM al_anc f JOIN credential c ON c.type::text='space-admin' AND c."resourceID"=f.above::text AND c."actorId"=g.actor WHERE f.space_id=g.space_id)) AS gains_not_explained_by_an_admin_above,
       (SELECT count(*) FROM l WHERE NOT EXISTS (SELECT 1 FROM al_old d JOIN credential c ON c.type::text='space-admin' AND c."resourceID"=d.named AND c."actorId"=l.actor WHERE d.space_id=l.space_id)) AS losses_not_explained_by_an_old_place,
       (SELECT count(*) FROM l JOIN credential c ON c."actorId"=l.actor AND c.type::text='space-admin' AND c."resourceID"=l.space_id::text) AS losses_of_an_own_admin_of_the_subspace;
\echo === admin list repair done. The stored authorization policies change only with an authorization reset.
