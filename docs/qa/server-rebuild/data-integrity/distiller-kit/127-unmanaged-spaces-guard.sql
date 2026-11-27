-- 127-unmanaged-spaces-guard.sql: top-level spaces that no user can manage (2026-11-20).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 127-unmanaged-spaces-guard.sql
-- A consequence of two rulings (organizations without an owner are kept; users without a login are kept), not damage.
-- Nothing is repaired. QA lead 2026-11-20: on PRODUCTION the list goes to product, who may settle the spaces one by one.
-- The list with names (local only): 127-unmanaged-spaces-list.sh <alkemio_db> <label>.
\pset footer off
CREATE TEMP TABLE g127 AS
SELECT s.id, s.visibility::text AS vis,
       EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text) AS user_manager,
       EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text) AS user_manager_login,
       EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type='account-admin' AND c."resourceID"=s."accountId"::text) AS account_admin_login,
       CASE WHEN EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=s."accountId") THEN 'user' WHEN EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=s."accountId") THEN 'organization' ELSE 'none' END AS host
  FROM space s WHERE s.level=0;
\echo --- L127 G1 top-level spaces with no user as admin or lead, and of them with no account admin who can sign in (acceptance 11-11: 83 and 41 of 468; only platform staff can manage the second group)
SELECT count(*) AS top_level_spaces, count(*) FILTER (WHERE NOT user_manager) AS no_user_admin_or_lead, count(*) FILTER (WHERE NOT user_manager AND NOT account_admin_login) AS and_no_account_admin_with_login FROM g127;
\echo --- L127 G2 the same when only an admin or lead who can sign in counts (acceptance 11-11: 99 and 50)
SELECT count(*) FILTER (WHERE NOT user_manager_login) AS no_admin_or_lead_with_login, count(*) FILTER (WHERE NOT user_manager_login AND NOT account_admin_login) AS and_no_account_admin_with_login FROM g127;
\echo --- L127 G3 the spaces nobody but platform staff can manage, by visibility and kind of account (the strict reading of G2; context for product)
SELECT vis AS visibility, host AS account_of, count(*) AS spaces FROM g127 WHERE NOT user_manager_login AND NOT account_admin_login GROUP BY 1,2 ORDER BY 3 DESC;
