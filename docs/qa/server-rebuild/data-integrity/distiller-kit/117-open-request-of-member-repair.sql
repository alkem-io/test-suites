-- 117-open-request-of-member-repair.sql: open invitation or application of an actor who is already a member (open row 4),
-- 2026-11-20. Accepted by the QA lead 2026-11-20: in the default REPAIRS of 87-distill-flow.sh. Guard: 118-open-request-of-member-guard.sql.
-- What is wrong: the server refuses a NEW request for a member, but closes no OPEN request when the actor becomes a
-- member another way: an admin adds them (assignActorToRole), or a request on a subspace below adds the spaces above
-- (ensureMemberOfRoleSetAndAncestors). The request stays open in the admin lists for good. On acceptance of 11-11:
-- 2 invitations and 4 applications; in all six the membership was made after the request.
-- Open = no lifecycle state stored, "invited" (invitation) or "new" (application). "accepting" is NOT touched (for a person).
-- R0 stops when a case needs a person: an open request of a member with no lifecycle row, or no closed request in the
--    data to take the stored form of the final state from.
-- R1 writes the final state on the lifecycle of those requests: invitation "accepted", application "approved". This is
--    what the request would read had the membership come through it. The stored form is copied from a closed request
--    of the same kind in the same data (the plain form: no history, empty context), so no form is invented.
-- R2 deletes the "space-invitee" credential of those invited actors on that space: accepting does the same.
-- Not touched: the invitation and application rows, memberships, every other credential, extra roles named on an
--    invitation are NOT given (check 3 counts them), every other table.
-- No authorization reset is needed: the holder is a member already; the invitee credential adds nothing for a member.
-- touches: lifecycle,credential
\set ON_ERROR_STOP on
\pset footer off
\echo === open request of a member repair: image before
CREATE TEMP TABLE om_life AS SELECT * FROM lifecycle;
CREATE TEMP TABLE om_cred AS SELECT * FROM credential;
CREATE TEMP TABLE om_req AS
SELECT 'invitation'::text AS kind, i.id, i."invitedActorId" AS actor, i."roleSetId", i."lifecycleId", i."createdDate" AS made, i."extraRoles" AS extra FROM invitation i
UNION ALL SELECT 'application', a.id, a."userId", a."roleSetId", a."lifecycleId", a."createdDate", '' FROM application a;
CREATE TEMP TABLE om_fix AS
SELECT q.*, s.id AS space_id, s.level, m."createdDate" AS member_since
  FROM om_req q LEFT JOIN lifecycle l ON l.id=q."lifecycleId"
  JOIN community cm ON cm."roleSetId"=q."roleSetId" JOIN space s ON s."communityId"=cm.id
  JOIN credential m ON m."actorId"=q.actor AND m.type='space-member' AND m."resourceID"=s.id::text
 WHERE l."machineState" IS NULL OR (q.kind='invitation' AND l."machineState"::jsonb->>'value'='invited') OR (q.kind='application' AND l."machineState"::jsonb->>'value'='new');
-- the stored form of the final state: a closed request of the same kind, plain form
CREATE TEMP TABLE om_form AS
SELECT k.kind, (SELECT l."machineState" FROM om_req q JOIN lifecycle l ON l.id=q."lifecycleId"
                 WHERE q.kind=k.kind AND l."machineState"::jsonb->>'value'=k.final AND l."machineState"::jsonb->>'status'='done'
                   AND l."machineState"::jsonb->'context'='{}'::jsonb AND l."machineState"::jsonb->'historyValue'='{}'::jsonb AND l."machineState"::jsonb->'children'='{}'::jsonb
                 ORDER BY length(l."machineState"), q.made DESC LIMIT 1) AS form
  FROM (VALUES ('invitation','accepted'),('application','approved')) k(kind, final);
\echo === before: open requests of an actor who is already a member, by kind and level
SELECT kind, 'L' || level AS level, count(*) AS requests, count(*) FILTER (WHERE member_since > made) AS member_after_the_request, count(*) FILTER (WHERE member_since <= made) AS member_before_the_request FROM om_fix GROUP BY 1,2 ORDER BY 1,2;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM om_fix WHERE "lifecycleId" IS NULL) THEN RAISE EXCEPTION 'an open request of a member has no lifecycle row'; END IF;
  IF EXISTS (SELECT 1 FROM om_fix f JOIN om_form o ON o.kind=f.kind WHERE o.form IS NULL) THEN RAISE EXCEPTION 'no closed request in the data to take the stored form of the final state from'; END IF;
END $$;
\echo === R1: write the final state on those requests (acceptance of 11-11 after the repairs: UPDATE 6)
UPDATE lifecycle l SET "machineState"=o.form FROM om_fix f JOIN om_form o ON o.kind=f.kind WHERE l.id=f."lifecycleId";
\echo === R2: delete the invitee right of those invited members (acceptance of 11-11: DELETE 2)
DELETE FROM credential c USING om_fix f WHERE f.kind='invitation' AND c."actorId"=f.actor AND c.type='space-invitee' AND c."resourceID"=f.space_id::text;
\echo === check 1: the rule on the repaired state. Expected: 0 open requests of a member; every one of them now reads accepted or approved
SELECT (SELECT count(*) FROM om_req q LEFT JOIN lifecycle l ON l.id=q."lifecycleId" JOIN community cm ON cm."roleSetId"=q."roleSetId" JOIN space s ON s."communityId"=cm.id
          JOIN credential m ON m."actorId"=q.actor AND m.type='space-member' AND m."resourceID"=s.id::text
         WHERE l."machineState" IS NULL OR l."machineState"::jsonb->>'value' IN ('invited','new')) AS open_requests_of_a_member,
       (SELECT count(*) FROM om_fix) AS meant_to_close,
       (SELECT count(*) FROM om_fix f JOIN lifecycle l ON l.id=f."lifecycleId" WHERE l."machineState"::jsonb->>'value' = CASE f.kind WHEN 'invitation' THEN 'accepted' ELSE 'approved' END) AS now_closed;
\echo === check 2: only what was meant to change changed. Expected: lifecycle rows changed = meant to close, only the state column, 0 gone, 0 added; credentials gone all of type space-invitee, 0 changed, 0 added
SELECT (SELECT count(*) FROM lifecycle n JOIN om_life o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS lifecycle_changed,
       (SELECT count(*) FROM lifecycle n JOIN om_life o ON o.id=n.id WHERE to_jsonb(n)-'machineState' IS DISTINCT FROM to_jsonb(o)-'machineState') AS changed_in_another_column,
       (SELECT count(*) FROM lifecycle n JOIN om_life o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o) AND n.id NOT IN (SELECT "lifecycleId" FROM om_fix)) AS changed_not_meant,
       (SELECT count(*) FROM om_life o WHERE NOT EXISTS (SELECT 1 FROM lifecycle n WHERE n.id=o.id)) AS lifecycle_gone,
       (SELECT count(*) FROM lifecycle n WHERE NOT EXISTS (SELECT 1 FROM om_life o WHERE o.id=n.id)) AS lifecycle_added,
       (SELECT count(*) FROM om_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id)) AS credentials_gone,
       (SELECT count(*) FROM om_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id) AND o.type<>'space-invitee') AS gone_of_another_type,
       (SELECT count(*) FROM credential n JOIN om_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS credentials_changed,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM om_cred o WHERE o.id=n.id)) AS credentials_added;
\echo === check 3: nobody loses anything. Expected: every actor is still a member of that space; invitations that name extra roles which the actor does not hold (context, for a person: the repair gives no role)
SELECT (SELECT count(*) FROM om_fix f WHERE NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=f.actor AND m.type='space-member' AND m."resourceID"=f.space_id::text)) AS no_longer_member,
       (SELECT count(*) FROM om_fix f WHERE f.kind='invitation' AND f.extra ~* 'lead' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=f.actor AND m.type='space-lead' AND m."resourceID"=f.space_id::text))
     + (SELECT count(*) FROM om_fix f WHERE f.kind='invitation' AND f.extra ~* 'admin' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=f.actor AND m.type='space-admin' AND m."resourceID"=f.space_id::text)) AS invitations_with_an_extra_role_not_held;
\echo === check 4: the stored form written is one the data already holds for that final state (expected: true, true)
SELECT bool_and(EXISTS (SELECT 1 FROM om_life o WHERE o."machineState"=f.form)) AS form_exists_in_the_data, bool_and(length(f.form) < 120) AS plain_form FROM om_form f;
\echo === open request of a member repair done. No authorization reset needed.
