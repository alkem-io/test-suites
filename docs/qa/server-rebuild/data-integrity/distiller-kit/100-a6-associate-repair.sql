-- 100-a6-associate-repair.sql: the repair for QA register A6 (2026-11-19). Run through rehearse-repair.sh first.
-- Ruling of the QA lead, 2026-11-19: "if a user is admin or owner of an organization, he must be associate of it".
-- R1 every actor who holds organization-owner or organization-admin of an organization that exists, and does not hold
--    organization-associate of it, gets organization-associate of it. The credential takes the date of the oldest
--    owner or admin credential of that actor on that organization. Nobody loses anything.
-- The credential type is read from the associate definition of the role set of the organization (follow the definition).
-- Not repaired here: owner or admin credentials on an id no organization has (counted). No reset is needed: the
-- stored rules already name the associate credential.
-- touches: credential
\set ON_ERROR_STOP on
\pset footer off
CREATE TEMP TABLE a6_cred AS SELECT * FROM credential;
CREATE TEMP TABLE a6_add AS
SELECT c."actorId" AS u, o.id AS org, ar.credential->>'type' AS atype, ar.credential->>'resourceID' AS arid, min(c."createdDate") AS since, min(c.issuer::text) AS issuer
  FROM credential c JOIN organization o ON o.id::text=c."resourceID" JOIN role ar ON ar."roleSetId"=o."roleSetId" AND ar.name::text='associate'
 WHERE c.type::text IN ('organization-owner','organization-admin') AND c."actorId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text=ar.credential->>'type' AND x."resourceID"=ar.credential->>'resourceID')
 GROUP BY 1,2,3,4;
\echo === before: owner or admin holdings without associate, and the associate credentials to add (acceptance: 755 holdings, one associate per actor and organization)
SELECT (SELECT count(*) FROM credential c JOIN organization o ON o.id::text=c."resourceID" WHERE c.type::text IN ('organization-owner','organization-admin')
          AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text='organization-associate' AND x."resourceID"=c."resourceID")) AS holdings_without_associate,
       (SELECT count(*) FROM a6_add) AS associate_credentials_to_add, (SELECT count(DISTINCT u) FROM a6_add) AS actors, (SELECT count(DISTINCT org) FROM a6_add) AS organizations,
       (SELECT count(*) FROM credential c WHERE c.type::text IN ('organization-owner','organization-admin') AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id::text=c."resourceID")) AS on_an_id_no_organization_has;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM a6_add WHERE atype IS DISTINCT FROM 'organization-associate' OR arid IS DISTINCT FROM org::text) THEN
    RAISE EXCEPTION 'an associate definition of an organization does not name organization-associate of its own organization'; END IF;
END $$;
\echo === R1: the associate credentials are added
INSERT INTO credential ("createdDate", "updatedDate", version, "resourceID", type, issuer, "actorId")
SELECT a.since, a.since, 1, a.arid, a.atype, a.issuer::uuid, a.u FROM a6_add a;
\echo === check 1: the rule on the repaired state. Expected: 0 holdings without associate, 0 associate credentials held twice
SELECT (SELECT count(*) FROM credential c JOIN organization o ON o.id::text=c."resourceID" WHERE c.type::text IN ('organization-owner','organization-admin')
          AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text='organization-associate' AND x."resourceID"=c."resourceID")) AS holdings_without_associate,
       (SELECT count(*) FROM (SELECT 1 FROM credential WHERE type::text='organization-associate' GROUP BY "actorId", "resourceID" HAVING count(*)>1) q
         WHERE NOT EXISTS (SELECT 1 FROM (SELECT 1 FROM a6_cred WHERE type::text='organization-associate' GROUP BY "actorId", "resourceID" HAVING count(*)>1) b)) AS new_associate_held_twice;
\echo === check 2: only what was meant to change changed. Expected: 0 deleted, 0 changed, inserted = the number above, all of type organization-associate
SELECT (SELECT count(*) FROM a6_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id)) AS deleted,
       (SELECT count(*) FROM credential n JOIN a6_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS changed,
       count(*) AS inserted, count(*) FILTER (WHERE n.type::text<>'organization-associate') AS inserted_of_another_type
  FROM credential n WHERE NOT EXISTS (SELECT 1 FROM a6_cred o WHERE o.id=n.id);
\echo === check 3: shape twin. A new associate credential against one that was always there: columns that are filled
SELECT CASE WHEN EXISTS (SELECT 1 FROM a6_cred o WHERE o.id=n.id) THEN 'always there' ELSE 'added' END AS kind, count(*), count(n.issuer) AS with_issuer, count(n.expires) AS with_expiry, count(n."actorId") AS with_actor, min(n.version) AS min_version, max(n.version) AS max_version
  FROM credential n WHERE n.type::text='organization-associate' GROUP BY 1;
\echo === A6 repair done
