-- 106-list-shape-guard.sql: the lists of every subspace against what the server should have written (2026-11-19).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 106-list-shape-guard.sql
-- Every space stores, per role (member, lead, admin), the credential of the same role of the spaces above
-- ("parentCredentials"): the parent first, then the space above the parent, up to the top-level space.
-- The server reads these lists for: the contribute rule with "inheritMembershipRights" (member, every entry),
-- apply and join (member, first entry), admin rights from above (admin, every entry).
-- Repairs: 98-admin-list-repair.sql (admin lists, entries naming a space not above), 105-member-lead-list-repair.sql.
-- Live causes, open in the server: #6785 (sub-subspace created from a template gets the parent only),
-- #6592 (a move or conversion leaves the old place). Until they are fixed G1 can read above 0 again on new data:
-- G4 shows whether the short lists are new.
\pset footer off
CREATE TEMP TABLE g106 AS
WITH RECURSIVE up AS (
  SELECT s.id AS space_id, s."parentSpaceId" AS above, 1 AS dist FROM space s WHERE s."parentSpaceId" IS NOT NULL
  UNION ALL SELECT u.space_id, p."parentSpaceId", u.dist+1 FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL AND u.dist<10),
t AS (SELECT u.space_id, r.id AS role_id, r.name::text AS role,
             jsonb_agg(jsonb_build_object('type','space-'||r.name::text,'resourceID',u.above::text) ORDER BY u.dist) AS target
        FROM up u JOIN space s ON s.id=u.space_id JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text IN ('member','lead','admin') GROUP BY 1,2,3)
SELECT t.space_id, s.level, a."createdDate" AS made, t.role, t.target,
       coalesce((SELECT jsonb_agg(jsonb_build_object('type',e->>'type','resourceID',e->>'resourceID') ORDER BY o) FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY x(e,o)), '[]'::jsonb) AS list
  FROM t JOIN role r ON r.id=t.role_id JOIN space s ON s.id=t.space_id JOIN actor a ON a.id=s.id;
\echo --- L106 G1 lists of subspaces that miss a space above or name anything else, per role (expect 0, 0 and 0 after the repairs 98 and 105)
SELECT count(*) FILTER (WHERE role='member') AS member_lists, count(*) FILTER (WHERE role='lead') AS lead_lists, count(*) FILTER (WHERE role='admin') AS admin_lists
  FROM g106 WHERE NOT list @> target OR NOT target @> list OR jsonb_array_length(list)<>jsonb_array_length(target);
\echo --- L106 G2 the same, by what is wrong (reads nothing after the repairs; any line is for a person)
SELECT role, level,
       CASE WHEN jsonb_array_length(list)=0 THEN 'empty'
            WHEN NOT target @> list THEN 'names a space not above, or another role'
            WHEN NOT list @> target THEN 'a space above is missing'
            ELSE 'an entry twice' END AS what, count(*) AS lists, count(DISTINCT space_id) AS subspaces
  FROM g106 WHERE NOT list @> target OR NOT target @> list OR jsonb_array_length(list)<>jsonb_array_length(target) GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- L106 G3 every list by its length, per level and role (context: a level 1 list holds 1 entry, a level 2 list 2)
SELECT level, role, jsonb_array_length(list) AS entries, count(*) AS lists FROM g106 GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- L106 G4 is it still being made: lists that are not the chain, by the month the subspace was made, last 12 months (context for server#6785 and #6592)
SELECT to_char(made,'YYYY-MM') AS made_in, count(DISTINCT space_id) AS subspaces_made, count(DISTINCT space_id) FILTER (WHERE NOT list @> target OR NOT target @> list) AS of_which_with_a_wrong_list
  FROM g106 WHERE made >= date_trunc('month', now()) - interval '12 months' GROUP BY 1 ORDER BY 1;
\echo --- L106 G5 member lists that hold every space above but NOT the parent first (expect 0 after repair 105; QA lead 2026-11-19: parent first). The server takes the first entry of the MEMBER list as the direct parent for the join and apply rule; top first shows a Join offer that is refused (walk 107)
SELECT count(*) AS member_lists_complete_but_not_parent_first
  FROM g106 WHERE role='member' AND list @> target AND target @> list AND jsonb_array_length(list)=jsonb_array_length(target) AND list<>target;
\echo --- L106 G6 the same for lead and admin lists (context: the server reads no order there; lead 0 after repair 105, admin lists are not reordered)
SELECT role, level, count(*) AS lists_complete_but_not_parent_first, min(made)::date AS oldest, max(made)::date AS newest
  FROM g106 WHERE role<>'member' AND list @> target AND target @> list AND jsonb_array_length(list)=jsonb_array_length(target) AND list<>target GROUP BY 1,2 ORDER BY 1,2;
