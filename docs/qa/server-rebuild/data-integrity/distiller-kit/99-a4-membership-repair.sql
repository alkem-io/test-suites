-- 99-a4-membership-repair.sql: the repair for QA register A4, for USERS (2026-11-19). Run through rehearse-repair.sh first.
-- Rulings of the QA lead, 2026-11-19:
--   "When a user is member of a subspace, he should have membership of the parent."
--   "If a user is not member of L0, he should not be member, lead or admin of the subspace: this is a leftover from
--    leaving a space without getting removed from the subspaces."
--   Organizations: "I think it was possible to have membership of a subspace without membership of the parent":
--   organizations and virtual contributors are NOT touched.
-- Cause: leaving or being removed from a space did not remove the roles below (server#6710 family, still live).
-- What the server does today when a user leaves: role.set.service.ts removeActorFromRole deletes the credential of the
-- role, and for an admin also space-subspace-admin on the parent when the user is admin of no other subspace of it.
--   "This can happen if you are admin and member and leave the space: the admin role is not removed. For these users
--    the admin roles should be removed."
-- R0 a user who is admin or lead of a TOP-LEVEL space and NOT member of it loses admin and lead of that space.
-- R1 a user who holds member, lead or admin of a subspace and is NOT member of its top-level space loses these three
--    roles in that subspace (after R0 this also covers the users of R0).
-- R2 a user who is member of a sub-subspace and member of the top-level space but NOT of the parent subspace loses
--    member and lead of that sub-subspace, and admin when he holds it there (the same leftover).
-- R3 space-subspace-admin on a parent is removed when the user is admin of no subspace of it any more.
-- NEVER ON DOUBT (QA lead, 2026-11-19, important for PRODUCTION): the ground for R1 and R2 is "leftover of leaving a
--    space". A move or conversion by older server code is the one other way such a row could exist. So R1 and R2 only
--    touch a subspace that was created under the parent it has today (activity record subspace-created). A holding on
--    a subspace created elsewhere, or with no creation record, is KEPT and counted: a person reads it (guard
--    101-move-signs.sql, lines M2 and M3). On acceptance there is none. Read 101 on production data before a run.
-- Users are never deleted. Only role credentials are deleted; every other credential and table stays.
-- Not repaired here: stored policies need no reset for this (rules name credentials, the credentials go).
-- touches: credential
\set ON_ERROR_STOP on
\pset footer off
\echo === A4 repair: image of credential before the repair
CREATE TEMP TABLE a4_cred AS SELECT * FROM credential;
CREATE TEMP TABLE a4_h AS
SELECT c.id AS cid, c.type::text AS t, c."actorId" AS u, s.id AS sid, s.level, s."parentSpaceId" AS p, s."levelZeroSpaceID" AS l0
  FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId"
 WHERE c.type::text IN ('space-member','space-lead','space-admin') AND s.level>0;
CREATE TEMP TABLE a4_m AS SELECT DISTINCT "actorId" AS u, "resourceID" AS rid FROM credential WHERE type::text='space-member';
-- R0: admin or lead of a top-level space held by a user who is not member of it
CREATE TEMP TABLE a4_top AS
SELECT c.id AS cid, c.type::text AS t, c."actorId" AS u, s.id AS sid, s.level, NULL::uuid AS p, s.id AS l0
  FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId"
 WHERE c.type::text IN ('space-admin','space-lead') AND s.level=0 AND NOT EXISTS (SELECT 1 FROM a4_m m WHERE m.u=c."actorId" AND m.rid=c."resourceID");
CREATE TEMP TABLE a4_born AS
SELECT s.id AS sid, coalesce((SELECT bool_and(ac."parentID"::text=s."parentSpaceId"::text) FROM activity ac WHERE ac."resourceID"::text=s.id::text AND ac.type::text='subspace-created'), false) AS sure
  FROM space s WHERE s.level>0;
CREATE TEMP TABLE a4_all AS
SELECT t.*, 'R0 admin or lead of a top-level space, not member of it' AS why FROM a4_top t
UNION ALL
SELECT h.*, 'R1 not member of the top-level space' AS why FROM a4_h h
 WHERE NOT EXISTS (SELECT 1 FROM a4_m m WHERE m.u=h.u AND m.rid=h.l0::text)
UNION ALL
SELECT h.*, 'R2 member of a sub-subspace, not of its parent' FROM a4_h h
 WHERE EXISTS (SELECT 1 FROM a4_m m WHERE m.u=h.u AND m.rid=h.l0::text) AND h.p<>h.l0
   AND EXISTS (SELECT 1 FROM a4_m m WHERE m.u=h.u AND m.rid=h.sid::text) AND NOT EXISTS (SELECT 1 FROM a4_m m WHERE m.u=h.u AND m.rid=h.p::text);
CREATE TEMP TABLE a4_del AS SELECT d.* FROM a4_all d WHERE d.level=0 OR EXISTS (SELECT 1 FROM a4_born b WHERE b.sid=d.sid AND b.sure);
\echo === KEPT for a person, never deleted on doubt: holdings that break the rule on a subspace created elsewhere or without a creation record (acceptance: 0)
SELECT count(*) AS holdings_kept, count(DISTINCT u) AS users, count(DISTINCT sid) AS subspaces FROM a4_all d WHERE d.level>0 AND NOT EXISTS (SELECT 1 FROM a4_born b WHERE b.sid=d.sid AND b.sure);
\echo === before: role holdings of users to remove, by rule and role (acceptance: 59 holdings of 8 users)
SELECT why, t AS role, level, count(*) AS holdings, count(DISTINCT u) AS users, count(DISTINCT sid) AS subspaces FROM a4_del GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === info, not touched: admin of a SUBSPACE held by a user who is not member of that subspace (the admin rule allows it)
SELECT count(*) AS holdings, count(DISTINCT u) AS users FROM a4_h h WHERE h.t='space-admin' AND NOT EXISTS (SELECT 1 FROM a4_m m WHERE m.u=h.u AND m.rid=h.sid::text) AND NOT EXISTS (SELECT 1 FROM a4_del d WHERE d.cid=h.cid);
\echo === R0, R1 and R2: the role credentials go
DELETE FROM credential c USING a4_del d WHERE c.id=d.cid;
\echo === R3: space-subspace-admin on a parent, held by a user who lost an admin role and is admin of no subspace of that parent any more
DELETE FROM credential c WHERE c.type::text='space-subspace-admin'
   AND EXISTS (SELECT 1 FROM a4_del d WHERE d.t='space-admin' AND d.u=c."actorId" AND d.p::text=c."resourceID")
   AND NOT EXISTS (SELECT 1 FROM credential x JOIN space ch ON ch.id::text=x."resourceID" WHERE x.type::text='space-admin' AND x."actorId"=c."actorId" AND ch."parentSpaceId"::text=c."resourceID");
\echo === check 1: the rule on the repaired state, the kept holdings left out. Expected: 0, 0, 0 (users member of a subspace and not of its parent; users with a role in a subspace who are not member of the top-level space; users admin or lead of a top-level space and not member of it)
SELECT (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text='space-member' AND s.level>0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=s."parentSpaceId"::text)
          AND EXISTS (SELECT 1 FROM a4_born b WHERE b.sid=s.id AND b.sure)) AS user_members_without_parent_membership,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text IN ('space-member','space-lead','space-admin') AND s.level>0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=s."levelZeroSpaceID"::text)
          AND EXISTS (SELECT 1 FROM a4_born b WHERE b.sid=s.id AND b.sure)) AS user_roles_below_without_the_top_level_space,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN "user" us ON us.id=c."actorId" WHERE c.type::text IN ('space-admin','space-lead') AND s.level=0
          AND NOT EXISTS (SELECT 1 FROM credential m WHERE m.type::text='space-member' AND m."actorId"=c."actorId" AND m."resourceID"=c."resourceID")) AS user_admin_or_lead_of_a_top_level_space_without_membership;
\echo === check 2: only what was meant to change changed. Expected: 0 inserted, 0 changed, deleted = the holdings above plus R3, 0 deleted of another type, 0 deleted of an actor that is not a user
SELECT (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM a4_cred o WHERE o.id=n.id)) AS inserted,
       (SELECT count(*) FROM credential n JOIN a4_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS changed,
       count(*) AS deleted, count(*) FILTER (WHERE o.type::text NOT IN ('space-member','space-lead','space-admin','space-subspace-admin')) AS deleted_of_another_type,
       count(*) FILTER (WHERE o.type::text='space-subspace-admin') AS deleted_subspace_admin,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "user" us WHERE us.id=o."actorId")) AS deleted_of_a_non_user,
       count(DISTINCT o."actorId") AS users_touched
  FROM a4_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id);
SELECT (SELECT count(*) FROM "user") AS users_after, (SELECT count(*) FROM credential c JOIN actor a ON a.id=c."actorId" WHERE a.type::text<>'user') AS credentials_of_non_users_after,
       (SELECT count(*) FROM a4_cred c JOIN actor a ON a.id=c."actorId" WHERE a.type::text<>'user') AS credentials_of_non_users_before;
\echo === A4 repair done
