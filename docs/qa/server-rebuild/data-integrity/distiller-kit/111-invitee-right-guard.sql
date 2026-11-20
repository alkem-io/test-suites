-- 111-invitee-right-guard.sql: invitee rights against open invitations (2026-11-19). Reads only, counts only.
--   psql -d <alkemio_db> -X -f 111-invitee-right-guard.sql
-- The credential "space-invitee" lets its holder read the About part of the space, also of a private one. Only accepting
-- an invitation removes it (server#6731, open): until that is fixed G1 can read above 0 again; G3 shows whether it is new.
-- Repair: 110-invitee-right-repair.sql. Open invitation = pending, "invited" or "accepting".
\pset footer off
CREATE TEMP TABLE g111 AS
WITH inv AS (SELECT i.id, i."invitedActorId" AS actor, i."roleSetId", i."createdDate", CASE WHEN l."machineState" IS NULL THEN 'pending' ELSE coalesce(l."machineState"::jsonb->>'value','other') END AS st
               FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId")
SELECT c.id, c."createdDate" AS made, a.type::text AS atype, s.level, s.settings->'privacy'->>'mode' AS privacy,
       (SELECT z.settings->'privacy'->>'mode' FROM space z WHERE z.id=s."levelZeroSpaceID") AS top_privacy,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=s."levelZeroSpaceID"::text) AS member_of_top,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID") AS member,
       EXISTS (SELECT 1 FROM inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId" AND v.st IN ('pending','invited','accepting')) AS open_invitation,
       EXISTS (SELECT 1 FROM inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId" AND v.st='accepting') AS accepting
  FROM credential c JOIN actor a ON a.id=c."actorId" LEFT JOIN space s ON s.id::text=c."resourceID" LEFT JOIN community cm ON cm.id=s."communityId" WHERE c.type='space-invitee';
\echo --- L111 G1 invitee rights with no open invitation (expect 0 after repair 110)
SELECT count(*) FROM g111 WHERE NOT open_invitation;
\echo --- L111 G2 of them: users on a public subspace of a private top-level space who are not in that top-level space: they read the subspace content without an invitation (expect 0; walk 113)
SELECT count(*) FROM g111 WHERE NOT open_invitation AND atype='user' AND level>0 AND privacy='public' AND top_privacy='private' AND NOT member AND NOT member_of_top;
\echo --- L111 G3 is it still being made: invitee rights with no open invitation, by the month the right was given, last 12 months (context for server#6731)
SELECT to_char(made,'YYYY-MM') AS given_in, count(*) AS left_behind FROM g111 WHERE NOT open_invitation AND made >= date_trunc('month', now()) - interval '12 months' GROUP BY 1 ORDER BY 1;
\echo --- L111 G4 for a person: invitations stuck in "accepting" whose invitee right is kept (acceptance: 5, made in 2025)
SELECT count(*) FROM g111 WHERE accepting;
\echo --- L111 G5 open invitations of users that have NO invitee right (context: open row 3)
SELECT count(*) FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId" JOIN "user" u ON u.id=i."invitedActorId" JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=cm.id
 WHERE (l."machineState" IS NULL OR l."machineState"::jsonb->>'value' IN ('invited','accepting')) AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=i."invitedActorId" AND c.type='space-invitee' AND c."resourceID"=s.id::text);
\echo --- L111 G6 for a person: users with an OPEN invitation on a public subspace of a private top-level space who are not in that top-level space: they read the subspace content while the invitation is open; by the year the right was given (invitations do not expire)
SELECT to_char(made,'YYYY') AS given_in, count(*) AS users_reading_as_invitee FROM g111 WHERE open_invitation AND NOT accepting AND atype='user' AND level>0 AND privacy='public' AND top_privacy='private' AND NOT member AND NOT member_of_top GROUP BY 1 ORDER BY 1;
-- Row 3, for any dataset (QA lead 2026-11-19: "what will production show and how to handle it"). Ruling in use: an open
-- invitation with no invitee right is LEFT as it is when it is older than the right itself (the server gives the right
-- since 2025-02; such invitations cost the invitee nothing, or at most the preview). A NEWER one is not expected: it
-- means the right was lost or written on a wrong id (register C8, repair 58 moves those) and a person looks.
CREATE TEMP TABLE g111_open AS
SELECT i.id, i."createdDate" AS invited, a.type::text AS atype, s.level, s.settings->'privacy'->>'mode' AS privacy,
       (SELECT z.settings->'privacy'->>'mode' FROM space z WHERE z.id=s."levelZeroSpaceID") AS top_privacy,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=i."invitedActorId" AND m.type='space-member' AND m."resourceID"=s."levelZeroSpaceID"::text) AS member_of_top
  FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId" JOIN actor a ON a.id=i."invitedActorId" JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=cm.id
 WHERE (l."machineState" IS NULL OR l."machineState"::jsonb->>'value'='invited')
   AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=i."invitedActorId" AND c.type='space-invitee' AND c."resourceID"=s.id::text);
\echo --- L111 G7 open invitations with no invitee right that were made since 2025-03-01, when the server already gave the right (expect 0 after repair 58; a number is for a person)
SELECT count(*) FROM g111_open WHERE invited >= DATE '2025-03-01';
\echo --- L111 G8 open invitations with no invitee right made before 2025-03-01, by what the invitee misses (context: left as they are; walks 112 and 113)
SELECT atype, CASE WHEN atype<>'user' THEN 'nothing: nobody signs in as this actor'
                   WHEN level>0 AND privacy='public' AND top_privacy='private' AND NOT member_of_top THEN 'cannot open the subspace before accepting'
                   ELSE 'nothing: the space or its About part is open to them anyway' END AS misses, count(*) AS invitations, min(invited)::date AS oldest, max(invited)::date AS newest
  FROM g111_open WHERE invited < DATE '2025-03-01' GROUP BY 1,2 ORDER BY 1,2;
