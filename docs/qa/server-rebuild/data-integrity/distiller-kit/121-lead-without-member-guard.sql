-- 121-lead-without-member-guard.sql: lead of a space who is not member of it (open row 5, 2026-11-20).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 121-lead-without-member-guard.sql
-- Repairs: 99-a4-membership-repair.sql (users not in the top-level space), 120-lead-without-member-repair.sql.
-- Live cause for users: leaving as member keeps lead and admin (server#6710 family). For organizations none since 2024.
\pset footer off
CREATE TEMP TABLE g121 AS
SELECT c."actorId" AS actor, a.type::text AS atype, s.level, c."createdDate" AS lead_since, c.type::text AS role
  FROM credential c JOIN actor a ON a.id=c."actorId" JOIN space s ON s.id::text=c."resourceID"
 WHERE c.type IN ('space-lead','space-admin') AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID");
\echo --- L121 G1 leads who are not member of that space, users and organizations and others (expect 0, 0 and 0 after the repairs 99 and 120)
SELECT count(*) FILTER (WHERE atype='user') AS users, count(*) FILTER (WHERE atype='organization') AS organizations, count(*) FILTER (WHERE atype NOT IN ('user','organization')) AS others FROM g121 WHERE role='space-lead';
\echo --- L121 G2 is it still being made: the same, by the year the lead role was given (reads nothing after the repairs; a line means a new one)
SELECT to_char(lead_since,'YYYY') AS lead_since, atype, 'L' || level AS level, count(*) AS leads FROM g121 WHERE role='space-lead' GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- L121 G3 admins who are not member of that space, by holder and level (context: an admin of a space above, or the leftover of leaving; users not in the top-level space are taken by repair 99)
SELECT atype, 'L' || level AS level, count(*) AS admins FROM g121 WHERE role='space-admin' GROUP BY 1,2 ORDER BY 1,2;
