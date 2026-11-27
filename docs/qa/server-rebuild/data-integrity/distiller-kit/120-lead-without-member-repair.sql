-- 120-lead-without-member-repair.sql: lead of a space who is not member of it (open row 5), 2026-11-20.
-- Accepted by the QA lead 2026-11-20: in the default REPAIRS of 87-distill-flow.sh. Guard: 121-lead-without-member-guard.sql.
-- Run AFTER 99-a4-membership-repair.sql (it takes the users who are not in the top-level space).
-- Rulings of the QA lead, 2026-11-20:
--   user: "fix user by cleaning up the subsubspace from his rolesets".
--   organizations: "before it was possible to have membership on l1 without having on l0. I am thinking of adding them
--   as members, so that this is clean".
-- What is wrong: the server gives lead on top of member. An ORGANIZATION lead with no member role is from 2022 and 2023
-- (none made since 2024); it shows in the lead lists and is missing from the member list (walk 119). A USER in this
-- state left as member and kept lead and admin (the leftover of repair 99; here the user is still in the spaces above).
-- R0 stops when a case needs a person: a lead without member that is neither a user nor an organization, or on a top-level space.
-- R1 a USER who is lead of a subspace and not member of it loses lead and admin of that subspace.
-- R2 space-subspace-admin on the parent goes when that user is admin of no subspace of it any more (as the server does).
-- R3 an ORGANIZATION that is lead of a subspace and not member of it gets the member role of that subspace, dated as
--    its lead role (a row dated today would become the newest credential and move the readings that measure against it).
--    The spaces above are NOT touched: an organization may be member of a subspace without the parent (QA lead ruling
--    2026-11-19). So the count "organization member of a subspace without the parent" grows by the ones not in the parent.
-- Users are never deleted. Not touched: every other credential, every other table.
-- No authorization reset is needed: rules name credentials; an organization does not sign in.
-- touches: credential
\set ON_ERROR_STOP on
\pset footer off
\echo === lead without member repair: image before
CREATE TEMP TABLE lm_cred AS SELECT * FROM credential;
CREATE TEMP TABLE lm_fix AS
SELECT c.id AS cid, c."actorId" AS actor, a.type::text AS atype, s.id AS space_id, s.level, s."parentSpaceId" AS parent, c."createdDate" AS lead_since,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=s."parentSpaceId"::text) AS member_of_parent
  FROM credential c JOIN actor a ON a.id=c."actorId" JOIN space s ON s.id::text=c."resourceID"
 WHERE c.type='space-lead' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID");
\echo === before: leads who are not member of the space, by holder and level
SELECT atype, 'L' || level AS level, count(*) AS leads, count(DISTINCT actor) AS holders, count(DISTINCT space_id) AS spaces, count(*) FILTER (WHERE member_of_parent) AS member_of_the_parent FROM lm_fix GROUP BY 1,2 ORDER BY 1,2;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM lm_fix WHERE atype NOT IN ('user','organization')) THEN RAISE EXCEPTION 'a lead without member is neither a user nor an organization'; END IF;
  IF EXISTS (SELECT 1 FROM lm_fix WHERE level=0) THEN RAISE EXCEPTION 'a lead without member on a top-level space: repair 99 takes users; an organization there is for a person'; END IF;
END $$;
\echo === R1: users lose lead and admin of that subspace (acceptance of 11-11 after the repairs: DELETE 2, one user)
DELETE FROM credential c USING lm_fix f WHERE f.atype='user' AND c."actorId"=f.actor AND c."resourceID"=f.space_id::text AND c.type IN ('space-lead','space-admin');
\echo === R2: space-subspace-admin on the parent, when the user is admin of no subspace of it any more (acceptance of 11-11: DELETE 0 or 1)
DELETE FROM credential c USING lm_fix f WHERE f.atype='user' AND c."actorId"=f.actor AND c.type='space-subspace-admin' AND c."resourceID"=f.parent::text
   AND NOT EXISTS (SELECT 1 FROM credential x JOIN space z ON z.id::text=x."resourceID" WHERE x."actorId"=f.actor AND x.type='space-admin' AND z."parentSpaceId"=f.parent);
\echo === R3: organizations get the member role of that subspace (acceptance of 11-11: INSERT 45)
INSERT INTO credential (id, "createdDate", "updatedDate", version, "resourceID", type, issuer, expires, "actorId")
SELECT uuid_generate_v4(), f.lead_since, f.lead_since, 1, f.space_id::text, 'space-member', NULL, NULL, f.actor FROM lm_fix f WHERE f.atype='organization';
\echo === check 1: the rule on the repaired state. Expected: 0 leads who are not member of the space
SELECT count(*) AS leads_without_member FROM credential c JOIN space s ON s.id::text=c."resourceID"
 WHERE c.type='space-lead' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID");
\echo === check 2: only what was meant to change changed. Expected: gone only space-lead, space-admin, space-subspace-admin of the users; added = organization cases, all space-member; 0 changed; no pair twice
SELECT (SELECT count(*) FROM lm_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id)) AS rows_gone,
       (SELECT count(*) FROM lm_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id) AND (o.type NOT IN ('space-lead','space-admin','space-subspace-admin') OR o."actorId" NOT IN (SELECT actor FROM lm_fix WHERE atype='user'))) AS gone_not_meant,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM lm_cred o WHERE o.id=n.id)) AS rows_added,
       (SELECT count(*) FROM lm_fix WHERE atype='organization') AS organization_cases,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM lm_cred o WHERE o.id=n.id) AND (n.type<>'space-member' OR n."actorId" NOT IN (SELECT actor FROM lm_fix WHERE atype='organization'))) AS added_not_meant,
       (SELECT count(*) FROM credential n JOIN lm_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS rows_changed,
       (SELECT count(*) FROM (SELECT 1 FROM credential WHERE type='space-member' GROUP BY "actorId","resourceID" HAVING count(*)>1) d) AS member_pairs_twice;
\echo === check 3: the added rows have the shape of the member rows that were there (expected: true)
SELECT bool_and(n.issuer IS NULL AND n.expires IS NULL AND n.version IN (SELECT DISTINCT version FROM lm_cred WHERE type='space-member')) AS same_shape FROM credential n WHERE NOT EXISTS (SELECT 1 FROM lm_cred o WHERE o.id=n.id);
\echo === check 4: what the users keep (context): member of the parent and of the top-level space, any right left on that subspace
SELECT count(DISTINCT f.actor) AS users, count(*) FILTER (WHERE f.member_of_parent) AS member_of_the_parent, (SELECT count(*) FROM credential c JOIN lm_fix g ON g.atype='user' AND c."actorId"=g.actor AND c."resourceID"=g.space_id::text) AS rights_left_on_the_subspace FROM lm_fix f WHERE f.atype='user';
\echo === check 5: organizations now member of a subspace and not of its parent, made by this repair (context: allowed by the ruling of 2026-11-19; the register count grows by this)
SELECT 'L' || level AS level, count(*) AS added_members, count(*) FILTER (WHERE NOT member_of_parent) AS not_member_of_the_parent FROM lm_fix WHERE atype='organization' GROUP BY 1 ORDER BY 1;
\echo === lead without member repair done. No authorization reset needed.
