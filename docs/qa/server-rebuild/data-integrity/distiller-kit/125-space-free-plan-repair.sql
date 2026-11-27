-- 125-space-free-plan-repair.sql: top-level spaces that hold no plan (open row 7), 2026-11-20.
-- Ruling of the QA lead 2026-11-20: "give the free plan, but for production, this must be checked with product, before
-- giving any plans if there are such spaces".
-- So this file is NOT in the default REPAIRS of 87-distill-flow.sh. It runs only when the run is started with
-- FREE_PLAN_RULED=yes. Acceptance data of 11-11: ruled (4 spaces). PRODUCTION: read guard 126-space-plan-guard.sql
-- first; when it shows any such space, a person asks product, and only after their answer the run gets the switch.
-- What is wrong: every new space gets the plan SPACE_LICENSE_FREE (credential space-license-free held by the space on
-- itself, entitlement space-free enabled with limit 1). 4 top-level spaces made in 2024-11 hold no plan at all; their
-- entitlements say the same (free, plus, premium all off). Effect: the account's count of free spaces leaves them out.
-- R0 stops when a case needs a person: a space with no plan whose license has no space-free entitlement row, or with
--    a plan entitlement that is on without its credential (then the license was changed by hand).
-- R1 gives each such space the credential space-license-free on itself, dated as the space.
-- R2 sets its space-free entitlement to enabled with limit 1, the form of every free space.
-- Not touched: other plans, feature credentials, accounts, every other table.
-- No authorization reset is needed: no rule names the plan credential of a space.
-- touches: credential,license_entitlement
\set ON_ERROR_STOP on
\pset footer off
\echo === space free plan repair: image before
CREATE TEMP TABLE fp_cred AS SELECT * FROM credential;
CREATE TEMP TABLE fp_ent AS SELECT * FROM license_entitlement;
CREATE TEMP TABLE fp_fix AS
SELECT s.id, s."accountId", s."licenseId", a."createdDate" AS made FROM space s JOIN actor a ON a.id=s.id
 WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type LIKE 'space-license-%');
\echo === before: top-level spaces with no plan, by the month they were made
SELECT to_char(made,'YYYY-MM') AS made_in, count(*) AS spaces, count(DISTINCT "accountId") AS accounts FROM fp_fix GROUP BY 1 ORDER BY 1;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM fp_fix f WHERE (SELECT count(*) FROM license_entitlement e WHERE e."licenseId"=f."licenseId" AND e.type='space-free')<>1) THEN RAISE EXCEPTION 'a space with no plan has no single space-free entitlement row'; END IF;
  IF EXISTS (SELECT 1 FROM fp_fix f JOIN license_entitlement e ON e."licenseId"=f."licenseId" AND e.type IN ('space-free','space-plus','space-premium') AND e.enabled) THEN RAISE EXCEPTION 'a space with no plan credential has a plan entitlement that is on'; END IF;
END $$;
\echo === R1: the free plan credential (acceptance of 11-11 after the repairs: INSERT 4)
INSERT INTO credential (id, "createdDate", "updatedDate", version, "resourceID", type, issuer, expires, "actorId")
SELECT uuid_generate_v4(), f.made, f.made, 1, f.id::text, 'space-license-free', NULL, NULL, f.id FROM fp_fix f;
\echo === R2: the space-free entitlement on, limit 1 (acceptance of 11-11: UPDATE 4)
UPDATE license_entitlement e SET enabled=true, "limit"=1 FROM fp_fix f WHERE e."licenseId"=f."licenseId" AND e.type='space-free';
\echo === check 1: the rule on the repaired state. Expected: 0 top-level spaces with no plan; 0 spaces where the free credential and the free entitlement disagree
SELECT (SELECT count(*) FROM space s WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type LIKE 'space-license-%')) AS top_level_with_no_plan,
       (SELECT count(*) FROM fp_fix f JOIN license_entitlement e ON e."licenseId"=f."licenseId" AND e.type='space-free' WHERE NOT e.enabled OR e."limit"<>1) AS repaired_with_entitlement_off;
\echo === check 2: only what was meant to change changed. Expected: credentials added = meant, all space-license-free, 0 gone, 0 changed; entitlements changed = meant, only enabled and limit, 0 gone, 0 added
SELECT (SELECT count(*) FROM fp_fix) AS meant,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM fp_cred o WHERE o.id=n.id)) AS credentials_added,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM fp_cred o WHERE o.id=n.id) AND (n.type<>'space-license-free' OR n."actorId" NOT IN (SELECT id FROM fp_fix))) AS added_not_meant,
       (SELECT count(*) FROM fp_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id)) AS credentials_gone,
       (SELECT count(*) FROM credential n JOIN fp_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS credentials_changed,
       (SELECT count(*) FROM license_entitlement n JOIN fp_ent o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS entitlements_changed,
       (SELECT count(*) FROM license_entitlement n JOIN fp_ent o ON o.id=n.id WHERE to_jsonb(n)-'enabled'-'limit' IS DISTINCT FROM to_jsonb(o)-'enabled'-'limit') AS changed_in_another_column,
       (SELECT count(*) FROM fp_ent o WHERE NOT EXISTS (SELECT 1 FROM license_entitlement n WHERE n.id=o.id)) + (SELECT count(*) FROM license_entitlement n WHERE NOT EXISTS (SELECT 1 FROM fp_ent o WHERE o.id=n.id)) AS entitlements_gone_or_added;
\echo === check 3: the added rows have the shape of the free plan rows that were there (expected: true)
SELECT bool_and(n."resourceID"=n."actorId"::text AND n.issuer IS NULL AND n.expires IS NULL) AS same_shape FROM credential n WHERE NOT EXISTS (SELECT 1 FROM fp_cred o WHERE o.id=n.id);
\echo === check 4: the free-space limit of the accounts of those spaces, after the repair (for a person: used above the limit means the account now reads as over its limit)
SELECT count(*) AS accounts, count(*) FILTER (WHERE used > lim) AS accounts_over_their_limit, string_agg(used || ' of ' || lim, ', ' ORDER BY lim, used) AS used_of_limit
  FROM (SELECT ac.id, (SELECT e."limit" FROM license_entitlement e WHERE e."licenseId"=ac."licenseId" AND e.type='account-space-free') AS lim,
               (SELECT count(*) FROM space s JOIN license_entitlement e ON e."licenseId"=s."licenseId" AND e.type='space-free' AND e.enabled WHERE s."accountId"=ac.id AND s.level=0
                   AND NOT EXISTS (SELECT 1 FROM license_entitlement p WHERE p."licenseId"=s."licenseId" AND p.type IN ('space-plus','space-premium') AND p.enabled)) AS used
          FROM account ac WHERE ac.id IN (SELECT "accountId" FROM fp_fix)) q;
\echo === space free plan repair done. No authorization reset needed.
