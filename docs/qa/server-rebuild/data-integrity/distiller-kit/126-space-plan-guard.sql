-- 126-space-plan-guard.sql: top-level spaces that hold no plan (open row 7, 2026-11-20).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 126-space-plan-guard.sql
-- Repair: 125-space-free-plan-repair.sql, which runs ONLY with FREE_PLAN_RULED=yes (QA lead 2026-11-20).
-- PRODUCTION: when G1 reads above 0, a person asks product before any plan is given. Acceptance of 11-11: 4, ruled.
\pset footer off
CREATE TEMP TABLE g126 AS
SELECT s.id, s."accountId", a."createdDate" AS made,
       EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type LIKE 'space-license-%') AS has_plan,
       EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-free') AS free_cred,
       coalesce((SELECT e.enabled FROM license_entitlement e WHERE e."licenseId"=s."licenseId" AND e.type='space-free' LIMIT 1), false) AS free_ent
  FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0;
\echo --- L126 G1 top-level spaces that hold no plan (expect 0 after repair 125; on PRODUCTION a number means ask product first, then run with FREE_PLAN_RULED=yes)
SELECT count(*) AS top_level_with_no_plan FROM g126 WHERE NOT has_plan;
\echo --- L126 G2 the same, by the month the space was made (reads nothing after repair 125)
SELECT to_char(made,'YYYY-MM') AS made_in, count(*) AS spaces, count(DISTINCT "accountId") AS accounts FROM g126 WHERE NOT has_plan GROUP BY 1 ORDER BY 1;
\echo --- L126 G3 top-level spaces where the free plan credential and the space-free entitlement disagree (expect 0 and 0)
SELECT count(*) FILTER (WHERE free_cred AND NOT free_ent) AS credential_without_entitlement, count(*) FILTER (WHERE free_ent AND NOT free_cred) AS entitlement_without_credential FROM g126;
\echo --- L126 G4 top-level spaces by the plans they hold (context)
SELECT coalesce((SELECT string_agg(replace(c.type,'space-license-',''), '+' ORDER BY c.type) FROM credential c WHERE c."actorId"=g.id AND c.type LIKE 'space-license-%'), 'none') AS plans, count(*) AS top_level_spaces FROM g126 g GROUP BY 1 ORDER BY 2 DESC;
