-- 54-c4-repair.sql: the C4 repair as QA proposes it (2026-11-13). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- What a credential is: one row of table credential says that a holder (an actor: a user,
-- an organization, a space, an account) holds a type of right on a target ("resourceID").
-- A repeated credential is the same holder, type and target stored on more than one row.
-- Target state, from what the server does (server develop 39d7aff38, 2026-11-10):
--   actor.service.ts hasValidCredential            a check asks whether a row with this type and target exists.
--                                                  One row or two give the same answer. expires and issuer are not read.
--   credential.service.ts deleteCredentialByTypeAndResource   a revoke deletes every row of this holder, type and target.
--   agent.service.ts before commit da5929e632 (2026-02-23)    a grant threw "Agent already has credential of this type on
--                                                  this resource". One row per holder, type and target was the rule until then.
--   role.set.service.ts:798-842, 1009-1017         the role paths still check before they grant.
--   credential.service.ts:83-140, role.set.service.ts getMembersCount   counts are counts of rows, so a second copy
--                                                  adds one to a member count or a lead count.
-- So the state the server expects is one row per holder, type and target, and the repair reaches it by removing
-- the later copies. Nothing a check can ask for is lost: every holder, type and target that had a row keeps one.
-- R1 keeps the oldest row of each group (first by creation time, then by id) and deletes the others.
--    The oldest row is the first grant; a later copy is a second grant of a right the holder already had.
-- R0 stops the repair when the copies of one group differ in expiry or issuer (then the choice of row would matter),
--    or when anything in the database points at a credential row.
-- Not touched: credentials with no holder (the classifier rejects those rows), every column of every row that stays.
-- Not repaired here: what makes new repeats. Two licence plans grant the same credential type to every new space,
-- and a grant no longer checks for an existing row. Until that is fixed the count grows again (guards C4 G6 to G8).
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: credential
\set ON_ERROR_STOP on
\pset footer off
\echo === C4 repair: image of credential before the repair
CREATE TEMP TABLE rp_cred AS SELECT * FROM credential;
CREATE INDEX ON rp_cred (id); ANALYZE rp_cred;
-- every credential with a holder, with its place inside its group of holder, type and target
CREATE TEMP TABLE rp_rank AS
SELECT c.id, c."actorId", c.type, c."resourceID", c.expires, c.issuer, c."createdDate",
       row_number() OVER (PARTITION BY c."actorId", c.type, c."resourceID" ORDER BY c."createdDate", c.id) AS rn,
       count(*)     OVER (PARTITION BY c."actorId", c.type, c."resourceID") AS n
  FROM credential c WHERE c."actorId" IS NOT NULL;
CREATE INDEX ON rp_rank (id); ANALYZE rp_rank;

\echo === R0: stop when copies differ in expiry or issuer, or when something points at a credential row (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM rp_rank GROUP BY "actorId", type, "resourceID"
             HAVING count(*) > 1 AND (count(DISTINCT expires) > 1 OR (count(expires) > 0 AND count(expires) < count(*))
                                   OR count(DISTINCT issuer) > 1 OR (count(issuer) > 0 AND count(issuer) < count(*))))
    THEN RAISE EXCEPTION 'copies of one credential differ in expiry or issuer: decide which copy to keep first'; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.credential'::regclass)
    THEN RAISE EXCEPTION 'a foreign key points at credential: a deleted copy could be referenced'; END IF;
END $$;

\echo === R1: of every group of holder, type and target only the oldest row stays (expected on acceptance: DELETE 179)
DELETE FROM credential c USING rp_rank r WHERE r.id = c.id AND r.rn > 1;

\echo === check 1: the rule on the repaired state. Expected: with a holder 0 groups; with no holder as before (3 groups, 9 rows on acceptance, rows the classifier rejects)
SELECT CASE WHEN "actorId" IS NULL THEN 'no holder (not touched)' ELSE 'with a holder' END AS holder, count(*) AS repeated_groups, coalesce(sum(n), 0) AS rows_in_them
  FROM (SELECT "actorId", count(*) n FROM credential GROUP BY "actorId", type, "resourceID" HAVING count(*) > 1) d GROUP BY 1
UNION ALL SELECT 'with a holder (line shown when 0)', 0, 0 WHERE NOT EXISTS (SELECT 1 FROM credential WHERE "actorId" IS NOT NULL GROUP BY "actorId", type, "resourceID" HAVING count(*) > 1)
 ORDER BY 1;

\echo === check 2: rows gone by type, rows new, rows changed. Expected on acceptance: gone 179 (84 + 53 + 21 + 19 + 1 + 1), new 0, changed 0
SELECT a.type, count(*) AS rows_gone FROM rp_cred a WHERE NOT EXISTS (SELECT 1 FROM credential b WHERE b.id = a.id) GROUP BY 1 ORDER BY 2 DESC, 1;
SELECT (SELECT count(*) FROM rp_cred a WHERE NOT EXISTS (SELECT 1 FROM credential b WHERE b.id = a.id)) AS rows_gone,
       (SELECT count(*) FROM credential b WHERE NOT EXISTS (SELECT 1 FROM rp_cred a WHERE a.id = b.id)) AS rows_new,
       (SELECT count(*) FROM rp_cred a JOIN credential b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS rows_changed,
       (SELECT count(*) FROM rp_cred) AS rows_before, (SELECT count(*) FROM credential) AS rows_after;

\echo === check 3: no right is lost. Every holder, type and target that had a row still has one, and no new one appeared
\echo ===     Expected: the two counts equal (12,886 on acceptance), lost 0, appeared 0, holders_with_fewer_rights 0
SELECT (SELECT count(*) FROM (SELECT DISTINCT "actorId", type, "resourceID" FROM rp_cred WHERE "actorId" IS NOT NULL) x) AS rights_before,
       (SELECT count(*) FROM (SELECT DISTINCT "actorId", type, "resourceID" FROM credential WHERE "actorId" IS NOT NULL) x) AS rights_after,
       (SELECT count(*) FROM (SELECT DISTINCT "actorId", type, "resourceID" FROM rp_cred WHERE "actorId" IS NOT NULL) a
         WHERE NOT EXISTS (SELECT 1 FROM credential b WHERE b."actorId" = a."actorId" AND b.type = a.type AND b."resourceID" = a."resourceID")) AS lost,
       (SELECT count(*) FROM (SELECT DISTINCT "actorId", type, "resourceID" FROM credential WHERE "actorId" IS NOT NULL) b
         WHERE NOT EXISTS (SELECT 1 FROM rp_cred a WHERE b."actorId" = a."actorId" AND b.type = a.type AND b."resourceID" = a."resourceID")) AS appeared,
       (SELECT count(*) FROM (SELECT "actorId", count(DISTINCT (type, "resourceID")) k FROM rp_cred WHERE "actorId" IS NOT NULL GROUP BY 1) a
          LEFT JOIN (SELECT "actorId", count(DISTINCT (type, "resourceID")) k FROM credential WHERE "actorId" IS NOT NULL GROUP BY 1) b USING ("actorId")
         WHERE b.k IS DISTINCT FROM a.k) AS holders_with_fewer_rights;

\echo === check 4: row by row. Every deleted row against the row that stays for it
\echo ===     Expected on acceptance: deleted 179, with_a_row_that_stays 179, and 0 on the other columns
SELECT count(*) AS deleted,
       count(*) FILTER (WHERE k.id IS NOT NULL) AS with_a_row_that_stays,
       count(*) FILTER (WHERE k.id IS NULL) AS with_no_row_that_stays,
       count(*) FILTER (WHERE k.expires IS DISTINCT FROM d.expires) AS expiry_differs,
       count(*) FILTER (WHERE k.issuer IS DISTINCT FROM d.issuer) AS issuer_differs,
       count(*) FILTER (WHERE k."createdDate" > d."createdDate") AS kept_row_is_younger,
       count(*) FILTER (WHERE d."actorId" IS NULL) AS deleted_with_no_holder,
       (SELECT count(*) FROM rp_rank r WHERE r.n = 1 AND NOT EXISTS (SELECT 1 FROM credential b WHERE b.id = r.id)) AS deleted_that_was_never_repeated
  FROM rp_cred d
  LEFT JOIN credential k ON k."actorId" = d."actorId" AND k.type = d.type AND k."resourceID" = d."resourceID"
 WHERE NOT EXISTS (SELECT 1 FROM credential b WHERE b.id = d.id);

\echo === check 5: shape. The rows that stay for a merged group against rows of the same type that were never repeated,
\echo ===     by kind of holder, kind of target and whether an expiry is set. Every line must show never_repeated above 0:
\echo ===     then a merged row looks like rows the server made without any repeat
SELECT b.type, coalesce(a.type::text, '(no actor row)') AS holder_kind,
       CASE WHEN b."resourceID" = '' THEN 'empty'
            WHEN b."resourceID" = b."actorId"::text THEN 'the holder itself'
            WHEN EXISTS (SELECT 1 FROM space s WHERE s.id::text = b."resourceID") THEN 'a space'
            WHEN EXISTS (SELECT 1 FROM account x WHERE x.id::text = b."resourceID") THEN 'an account'
            WHEN EXISTS (SELECT 1 FROM organization o WHERE o.id::text = b."resourceID") THEN 'an organization'
            ELSE 'nothing that exists' END AS target_kind,
       (b.expires IS NOT NULL) AS expiry_set,
       count(*) FILTER (WHERE r.n > 1) AS merged_rows_that_stay, count(*) FILTER (WHERE r.n = 1) AS never_repeated
  FROM credential b JOIN rp_rank r ON r.id = b.id LEFT JOIN actor a ON a.id = b."actorId"
 WHERE b.type IN (SELECT type FROM rp_rank WHERE n > 1)
 GROUP BY 1, 2, 3, 4 HAVING count(*) FILTER (WHERE r.n > 1) > 0 ORDER BY 1, 2, 3, 4;

\echo === check 6: what the server counts from rows. Spaces where the rows of a role outnumber its holders, before and after
\echo ===     (rows with no holder left out: the repair does not touch them). Expected on acceptance: member 21 then 0, lead 53 then 0
SELECT t.role_credential,
       (SELECT count(*) FROM (SELECT 1 FROM rp_cred c WHERE c.type = t.role_credential AND c."actorId" IS NOT NULL GROUP BY c."resourceID" HAVING count(*) > count(DISTINCT c."actorId")) x) AS spaces_counting_too_high_before,
       (SELECT count(*) FROM (SELECT 1 FROM credential c WHERE c.type = t.role_credential AND c."actorId" IS NOT NULL GROUP BY c."resourceID" HAVING count(*) > count(DISTINCT c."actorId")) x) AS spaces_counting_too_high_after,
       (SELECT count(DISTINCT (c."resourceID", c."actorId")) FROM rp_cred c WHERE c.type = t.role_credential AND c."actorId" IS NOT NULL) AS holders_before,
       (SELECT count(DISTINCT (c."resourceID", c."actorId")) FROM credential c WHERE c.type = t.role_credential AND c."actorId" IS NOT NULL) AS holders_after
  FROM (VALUES ('space-member'), ('space-lead'), ('space-admin'), ('organization-associate'), ('organization-owner')) t(role_credential) ORDER BY 1;

\echo === check 7: licences. The stored licence of a space is built from the credential types the space holds, so it must not move.
\echo ===     Expected: 0 spaces whose set of licence credential types changed
SELECT count(*) AS spaces_whose_licence_types_changed FROM (
  SELECT s.id,
         (SELECT string_agg(DISTINCT c.type, ',' ORDER BY c.type) FROM rp_cred c WHERE c."actorId" = s.id AND (c.type LIKE 'space-license-%' OR c.type LIKE 'space-feature-%')) AS before_types,
         (SELECT string_agg(DISTINCT c.type, ',' ORDER BY c.type) FROM credential c WHERE c."actorId" = s.id AND (c.type LIKE 'space-license-%' OR c.type LIKE 'space-feature-%')) AS after_types
    FROM space s) x WHERE before_types IS DISTINCT FROM after_types;
\echo === C4 repair done
