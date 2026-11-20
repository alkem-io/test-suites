-- 97-admin-down-rule.sql: the admin rule of the QA lead (2026-11-19), read for EVERY subspace. Reads only, counts only.
--   "Admin of a top-level space: admin rights on every subspace and sub-subspace below. Admin of a subspace: admin
--    rights on every sub-subspace under it. A role in the child is not required."
--   psql -d <alkemio_db> -X -f 97-admin-down-rule.sql
-- For every subspace and every space above it, two readings:
--   in the list    the admin definition of the subspace names the admin credential of that space above
--                  (its own entry in "parentCredentials"; repair: 98-admin-list-repair.sql)
--   in effect      the stored policy of the subspace gives update, delete and grant to somebody who holds ONLY the
--                  admin credential of that space above (and global-registered). This is what the server enforces;
--                  it changes only with an authorization reset.
-- Archived spaces give nobody below staff level any right, by design: they are counted on their own lines.
-- Expected after the repair 98 AND a reset: on lines that are not archived, not_in_the_list 0 and not_in_effect 0.
\pset footer off
CREATE TEMP TABLE r97 AS
WITH RECURSIVE up AS (
  SELECT s.id AS space_id, s."parentSpaceId" AS above, 1 AS dist FROM space s WHERE s."parentSpaceId" IS NOT NULL
  UNION ALL SELECT u.space_id, p."parentSpaceId", u.dist+1 FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL AND u.dist<10)
SELECT s.id, s.level, s.visibility::text AS vis, u.above, CASE WHEN u.dist=1 THEN 'the parent' ELSE 'a space further above' END AS kind, a."authorizationId" AS pol, r."parentCredentials" AS pc
  FROM up u JOIN space s ON s.id=u.space_id JOIN actor a ON a.id=s.id JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin';
CREATE TEMP TABLE r97b AS
SELECT t.*, EXISTS (SELECT 1 FROM jsonb_array_elements(t.pc) e WHERE e->>'type'='space-admin' AND e->>'resourceID'=t.above::text) AS in_list,
       coalesce((SELECT array_agg(DISTINCT pr) FROM authorization_policy pl CROSS JOIN LATERAL jsonb_array_elements(pl."credentialRules"::jsonb) ru
                  CROSS JOIN LATERAL jsonb_array_elements(ru->'criterias') c CROSS JOIN LATERAL jsonb_array_elements_text(ru->'grantedPrivileges') pr
                 WHERE pl.id=t.pol AND ((c->>'type'='space-admin' AND c->>'resourceID'=t.above::text) OR (c->>'type'='global-registered' AND c->>'resourceID'=''))), '{}') @> '{update,delete,grant}' AS in_effect
  FROM r97 t;
\echo --- R97 G0 the rule in two numbers, subspaces that are not archived (expect 0 and 0 after the repair 98 and a reset; not_in_effect needs the reset)
SELECT count(*) FILTER (WHERE NOT in_list) AS not_in_the_list, count(*) FILTER (WHERE NOT in_effect) AS not_in_effect FROM r97b WHERE vis<>'archived';
\echo --- R97 G1 the admin of a space above against every subspace below it (the breakdown of G0, with the archived ones)
SELECT level AS subspace_level, kind AS admin_of, CASE WHEN vis='archived' THEN 'archived' ELSE 'not archived' END AS state, count(*) AS pairs,
       count(*) FILTER (WHERE NOT in_list) AS not_in_the_list, count(*) FILTER (WHERE NOT in_effect) AS not_in_effect,
       count(*) FILTER (WHERE NOT in_list AND in_effect) AS not_in_the_list_but_in_effect, count(*) FILTER (WHERE in_list AND NOT in_effect) AS in_the_list_but_not_in_effect
  FROM r97b GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- R97 G2 the other direction, for a person to read (expect 0 after the repair 98, step R3; before it acceptance had 5 in 4 subspaces; live cause server#6592): entries of an admin list that name a space which is NOT above the subspace. The admins of that other space pass as admin here
SELECT count(*) AS entries_naming_a_space_not_above, count(DISTINCT s.id) AS subspaces,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM space o WHERE o.id::text=e->>'resourceID')) AS of_which_an_id_no_space_has
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e
 WHERE NOT EXISTS (SELECT 1 FROM r97 t WHERE t.id=s.id AND t.above::text=e->>'resourceID');
\echo --- R97 G3 ruling 2, users only (expect 0, 0 and 0 after the repair 99): users member of a subspace and not of its parent; users with a role in a subspace who are not member of the top-level space; users admin or lead of a top-level space and not member of it
SELECT (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text='space-member' AND s.level>0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=s."parentSpaceId"::text)) AS user_members_without_parent_membership,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text IN ('space-member','space-lead','space-admin') AND s.level>0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=s."levelZeroSpaceID"::text)) AS user_roles_below_without_the_top_level_space,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text IN ('space-admin','space-lead') AND s.level=0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=c."resourceID")) AS user_admin_or_lead_of_a_top_level_space_without_membership;
\echo --- R97 G4 ruling 3 (expect 0 after the repair 100): owner or admin holdings of an organization without associate of it
SELECT count(*) AS holdings_without_associate FROM credential c JOIN organization o ON o.id::text=c."resourceID" WHERE c.type::text IN ('organization-owner','organization-admin')
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text='organization-associate' AND x."resourceID"=c."resourceID");
