-- 101-move-signs.sql: signs that a subspace was MOVED, PROMOTED or DEMOTED, next to the role rows the repairs touch.
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 101-move-signs.sql
--
-- IMPORTANT FOR PRODUCTION (QA lead, 2026-11-19): read this output on a copy of the production data BEFORE a run is
-- planned. The repair 99-a4-membership-repair.sql removes roles of users on the ground "this is a leftover of leaving
-- a space". That ground was checked on ACCEPTANCE only: there every subspace it touches was created under the parent
-- it has today. A move or a conversion is the one other way such a row could come to exist (by older server code;
-- today's code removes the members whenever the parent changes, server specs/083 and conversion.service.ts). On
-- production the numbers below can differ. Every line that is not 0 where 0 is expected is read by a person, row by
-- row, before the freeze is planned. The repair itself keeps the doubtful rows (it never deletes on doubt), so a
-- number above 0 does not break a run: it leaves work for a person.
--
-- The sign: the activity record "subspace-created" keeps the space a subspace was created under. A subspace created
-- under another space than its present parent was moved or converted. A subspace with no record cannot be judged.
\pset footer off
CREATE TEMP TABLE mv_born AS
SELECT s.id AS sid, s.level, s."parentSpaceId" AS p, s."levelZeroSpaceID" AS l0,
       (SELECT string_agg(DISTINCT ac."parentID"::text, ',') FROM activity ac WHERE ac."resourceID"::text=s.id::text AND ac.type::text='subspace-created') AS under
  FROM space s WHERE s.level>0;
ALTER TABLE mv_born ADD COLUMN sign text;
UPDATE mv_born SET sign = CASE WHEN under IS NULL THEN 'no creation record' WHEN under=p::text THEN 'created under its present parent' ELSE 'created elsewhere (moved or converted)' END;
\echo --- M1 every subspace by the sign of a move (info; acceptance: 1241 under the present parent, 3 elsewhere, 236 without a record)
SELECT sign, level, count(*) AS subspaces FROM mv_born GROUP BY 1,2 ORDER BY 1,2;

CREATE TEMP TABLE mv_m AS SELECT DISTINCT "actorId" AS u, "resourceID" AS rid FROM credential WHERE type::text='space-member';
CREATE TEMP TABLE mv_h AS
SELECT c.type::text AS t, c."actorId" AS u, s.id AS sid, s.level, s."parentSpaceId" AS p, s."levelZeroSpaceID" AS l0
  FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId"
 WHERE c.type::text IN ('space-member','space-lead','space-admin') AND s.level>0;
CREATE TEMP TABLE mv_d AS
SELECT h.*, 'R1 a role below, not member of the top-level space' AS why FROM mv_h h WHERE NOT EXISTS (SELECT 1 FROM mv_m m WHERE m.u=h.u AND m.rid=h.l0::text)
UNION ALL
SELECT h.*, 'R2 member of a sub-subspace, not of its parent' FROM mv_h h
 WHERE EXISTS (SELECT 1 FROM mv_m m WHERE m.u=h.u AND m.rid=h.l0::text) AND h.p<>h.l0
   AND EXISTS (SELECT 1 FROM mv_m m WHERE m.u=h.u AND m.rid=h.sid::text) AND NOT EXISTS (SELECT 1 FROM mv_m m WHERE m.u=h.u AND m.rid=h.p::text);
\echo --- M2 the role holdings of users that break ruling 2 (what the repair 99 looks at), by the sign of a move of their subspace.
\echo ---    on_a_subspace_created_elsewhere and on_a_subspace_without_a_record are KEPT by the repair and are for a person (acceptance before the repair: 52, 52, 0, 0; expect 0, 0, 0, 0 after it)
SELECT count(*) AS holdings_breaking_the_rule,
       count(*) FILTER (WHERE b.sign='created under its present parent') AS on_a_subspace_created_under_its_present_parent,
       count(*) FILTER (WHERE b.sign LIKE 'created elsewhere%') AS on_a_subspace_created_elsewhere,
       count(*) FILTER (WHERE b.sign='no creation record') AS on_a_subspace_without_a_record
  FROM mv_d d JOIN mv_born b ON b.sid=d.sid;
\echo --- M3 the same, by rule and role, with users and subspaces (info, for the person who reads M2)
SELECT d.why, d.t AS role, b.sign, count(*) AS holdings, count(DISTINCT d.u) AS users, count(DISTINCT d.sid) AS subspaces FROM mv_d d JOIN mv_born b ON b.sid=d.sid GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- M4 admin list entries that name a space which is not above the subspace (the old place after a move or a promotion), by what the named space is (expect no line after the repair 98, step R3; before it acceptance had 5 entries in 4 subspaces)
WITH RECURSIVE up AS (SELECT s.id AS sid, s."parentSpaceId" AS above FROM space s WHERE s."parentSpaceId" IS NOT NULL
                      UNION ALL SELECT u.sid, p."parentSpaceId" FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL),
e AS (SELECT s.id, s."levelZeroSpaceID" AS l0, s."parentSpaceId" AS p, x.e->>'resourceID' AS named
        FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin', jsonb_array_elements(r."parentCredentials") x(e)
       WHERE NOT EXISTS (SELECT 1 FROM up WHERE up.sid=s.id AND up.above::text=x.e->>'resourceID'))
SELECT CASE WHEN n.id IS NULL THEN 'an id no space has'
            WHEN b.under=e.named THEN 'the space it was created under'
            WHEN n."levelZeroSpaceID"<>e.l0 THEN 'a space of another tree'
            ELSE 'another space of the same tree' END AS the_entry_names,
       count(*) AS entries, count(DISTINCT e.id) AS subspaces
  FROM e LEFT JOIN space n ON n.id::text=e.named LEFT JOIN mv_born b ON b.sid=e.id GROUP BY 1 ORDER BY 1;
\echo --- M5 members of a subspace that was created elsewhere, by whether they are member of its present parent (info; a member without the present parent on such a subspace is the case a move by older code would leave)
SELECT count(*) AS member_holdings_on_moved_subspaces, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM mv_m m WHERE m.u=c."actorId" AND m.rid=b.p::text)) AS of_which_not_member_of_the_present_parent,
       count(*) FILTER (WHERE a.type::text='user') AS held_by_users
  FROM credential c JOIN mv_born b ON b.sid::text=c."resourceID" AND b.sign LIKE 'created elsewhere%' JOIN actor a ON a.id=c."actorId" WHERE c.type::text='space-member';
