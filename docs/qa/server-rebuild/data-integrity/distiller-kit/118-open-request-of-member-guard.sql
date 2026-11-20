-- 118-open-request-of-member-guard.sql: open invitation or application of an actor who is already a member (open row 4, 2026-11-20).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 118-open-request-of-member-guard.sql
-- The server closes no open request when the actor becomes a member another way (an admin adds them, or a request on a
-- subspace below adds the spaces above). Repair: 117-open-request-of-member-repair.sql. No server issue filed yet.
-- Until the server closes them, G1 can read above 0 again on new data: G2 shows whether they are new.
\pset footer off
CREATE TEMP TABLE g118 AS
WITH q AS (SELECT 'invitation'::text AS kind, i."invitedActorId" AS actor, i."roleSetId", i."lifecycleId", i."createdDate" AS made FROM invitation i
           UNION ALL SELECT 'application', a."userId", a."roleSetId", a."lifecycleId", a."createdDate" FROM application a)
SELECT q.kind, s.level, q.made, m."createdDate" AS member_since, q.actor, s.id AS space_id,
       CASE WHEN l."machineState" IS NULL THEN 'no state' ELSE l."machineState"::jsonb->>'value' END AS st
  FROM q LEFT JOIN lifecycle l ON l.id=q."lifecycleId" JOIN community cm ON cm."roleSetId"=q."roleSetId" JOIN space s ON s."communityId"=cm.id
  JOIN credential m ON m."actorId"=q.actor AND m.type='space-member' AND m."resourceID"=s.id::text;
\echo --- L118 G1 open requests of an actor who is already a member of that space (expect 0 and 0 after repair 117)
SELECT count(*) FILTER (WHERE kind='invitation') AS invitations, count(*) FILTER (WHERE kind='application') AS applications FROM g118 WHERE st IN ('no state','invited','new');
\echo --- L118 G2 is it still being made: the same, by the month the membership was made and by which came first (reads nothing after repair 117; a line means the server made a new one)
SELECT to_char(member_since,'YYYY-MM') AS member_since, kind, 'L' || level AS level, CASE WHEN member_since > made THEN 'member after the request' ELSE 'member before the request' END AS which_first, count(*) AS requests
  FROM g118 WHERE st IN ('no state','invited','new') GROUP BY 1,2,3,4 ORDER BY 1,2,3;
\echo --- L118 G3 for a person: invitations stuck in accepting whose actor is a member of that space (context; repair 117 does not touch them)
SELECT count(*) AS stuck_in_accepting_and_member FROM g118 WHERE st='accepting';
\echo --- L118 G4 members of those requests who still hold the invitee right on that space (expect 0 after repairs 117 and 110)
SELECT count(*) AS members_with_invitee_right_and_no_open_invitation FROM credential c WHERE c.type='space-invitee'
   AND EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID")
   AND NOT EXISTS (SELECT 1 FROM g118 g WHERE g.actor=c."actorId" AND g.space_id::text=c."resourceID" AND g.kind='invitation' AND g.st IN ('no state','invited','accepting'));
