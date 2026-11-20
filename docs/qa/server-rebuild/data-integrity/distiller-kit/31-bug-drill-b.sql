\echo === F1 callouts comments enabled, no room: isTemplate? in a space collaboration or a template content space?
SELECT c."isTemplate", (sp.id IS NOT NULL) in_space, (tcs.id IS NOT NULL) in_template_space, date_trunc('year', c."createdDate")::date yr, count(*)
FROM callout c LEFT JOIN callouts_set cs ON cs.id=c."calloutsSetId" LEFT JOIN collaboration col ON col."calloutsSetId"=cs.id LEFT JOIN space sp ON sp."collaborationId"=col.id LEFT JOIN template_content_space tcs ON tcs."collaborationId"=col.id
WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;
\echo === F1c real-space callouts without room, 2026 by month, and callout type / visibility
SELECT date_trunc('month', c."createdDate")::date m, c.visibility, count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space sp ON sp."collaborationId"=col.id
WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' AND NOT c."isTemplate" AND c."createdDate">='2026-01-01' GROUP BY 1,2 ORDER BY 1,2;
\echo === F1d sample of real-space callouts without room (space nameID, callout nameID, created, settings.framing)
SELECT a."nameID" space, c."nameID" callout, c."createdDate"::date, c.settings->'framing' framing FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space sp ON sp."collaborationId"=col.id JOIN actor a ON a.id=sp.id
WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' AND NOT c."isTemplate" ORDER BY c."createdDate" DESC LIMIT 5;
\echo === F1e do callouts WITH comments enabled and WITH room exist in 2026 (control)?
SELECT date_trunc('month', c."createdDate")::date m, count(*) FILTER (WHERE c."commentsId" IS NULL) no_room, count(*) FILTER (WHERE c."commentsId" IS NOT NULL) with_room FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space sp ON sp."collaborationId"=col.id WHERE (c.settings->'framing'->>'commentsEnabled')='true' AND NOT c."isTemplate" AND c."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 1;
\echo === F1f callouts without room: created from a template (contribution/framing type) vs via createCalloutOnCalloutsSet — framing type distribution
SELECT cf.type framing_type, count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space sp ON sp."collaborationId"=col.id LEFT JOIN callout_framing cf ON cf.id=c."framingId" WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' AND NOT c."isTemplate" AND c."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 2 DESC;

\echo === A4c user L2 memberships without L1 membership, NOT in an A2 family, by month (2026) + whether the user holds a credential whose resourceID is the L2 id twice (A2 symptom) 
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text),
 m AS (SELECT c."actorId", s.id sid, s."parentSpaceId" pid, s."levelZeroSpaceID" l0, c."createdDate", a.type atype FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN actor a ON a.id=c."actorId" WHERE c.type='space-member' AND s.level=2)
SELECT date_trunc('month', m."createdDate")::date mo, m.atype, count(*) FROM m WHERE NOT EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text) AND NOT EXISTS (SELECT 1 FROM mis WHERE mis.points_to=m.sid OR mis.space_id=m.pid) AND m."createdDate">='2025-06-01' GROUP BY 1,2 ORDER BY 1,2;
\echo === A4d those non-A2 cases: does the parent L1 role set have a parentRoleSet? was the L1 membership revoked (no credential) while L2 kept? sample 8 with space nameIDs + L2 created vs credential created
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text),
 m AS (SELECT c."actorId", s.id sid, s."parentSpaceId" pid, c."createdDate" cred_created FROM credential c JOIN space s ON s.id::text=c."resourceID" WHERE c.type='space-member' AND s.level=2)
SELECT a2."nameID" l2, a1."nameID" l1, m.cred_created::date, (SELECT count(*) FROM credential x WHERE x."actorId"=m."actorId" AND x.type LIKE 'space-%' AND x."resourceID"=m.pid::text) any_cred_on_l1, (SELECT string_agg(DISTINCT x.type, ',') FROM credential x WHERE x."actorId"=m."actorId" AND x."resourceID"=m.sid::text) creds_on_l2
FROM m JOIN actor a2 ON a2.id=m.sid JOIN actor a1 ON a1.id=m.pid WHERE NOT EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text) AND NOT EXISTS (SELECT 1 FROM mis WHERE mis.points_to=m.sid OR mis.space_id=m.pid) ORDER BY m.cred_created DESC LIMIT 8;

\echo === A9b space-invitee credentials with no pending invitation: 2026 by month, and the state of the matching invitation if any
WITH inv AS (SELECT c.id cred_id, c."actorId", c."resourceID", c."createdDate" FROM credential c WHERE c.type='space-invitee')
SELECT date_trunc('month', inv."createdDate")::date m,
 coalesce((SELECT CASE WHEN l."machineState" LIKE '%accepted%' THEN 'accepted' WHEN l."machineState" LIKE '%rejected%' THEN 'rejected' WHEN l."machineState" LIKE '%invited%' OR l."machineState" LIKE '%pending%' THEN 'pending' WHEN l."machineState"='' THEN 'empty' ELSE left(l."machineState",30) END FROM invitation i JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=cm.id JOIN lifecycle l ON l.id=i."lifecycleId" WHERE s.id::text=inv."resourceID" AND i."invitedActorId"=inv."actorId" ORDER BY i."createdDate" DESC LIMIT 1), 'no invitation row') inv_state,
 (EXISTS (SELECT 1 FROM credential mc WHERE mc.type='space-member' AND mc."actorId"=inv."actorId" AND mc."resourceID"=inv."resourceID")) already_member, count(*)
FROM inv WHERE inv."createdDate">='2025-09-01' GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === A9c lifecycle machineState samples for invitations (what do accepted / pending look like)
SELECT left(l."machineState",80), count(*) FROM invitation i JOIN lifecycle l ON l.id=i."lifecycleId" GROUP BY 1 ORDER BY 2 DESC LIMIT 6;

\echo === E2b 2026 orgs with zero owners: other credentials present? who created (account host user)?
SELECT a."nameID", a."createdDate"::date, (SELECT string_agg(c.type||':'||count, ',') FROM (SELECT type, count(*) FROM credential WHERE "resourceID"=o.id::text GROUP BY 1) c) creds, (SELECT count(*) FROM credential WHERE "resourceID"=o.id::text AND type='organization-admin') admins
FROM organization o JOIN actor a ON a.id=o.id WHERE a."createdDate">='2026-01-01' AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text) ORDER BY 2 DESC LIMIT 12;
SELECT count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."resourceID"=o.id::text AND c.type LIKE 'organization-%')) no_org_creds_at_all, count(*) FROM organization o JOIN actor a ON a.id=o.id WHERE a."createdDate">='2026-01-01' AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text);

\echo === G3 file.authorizationId NULL by month (design change or leak?)
SELECT date_trunc('month', f."createdDate")::date m, count(*) FILTER (WHERE f."authorizationId" IS NULL) no_policy, count(*) total FROM file f WHERE f."createdDate">='2025-10-01' GROUP BY 1 ORDER BY 1;

\echo === C2b anything cached? check how far apart duplicate subspace nameIDs were created
SELECT a."nameID", s.level, a."createdDate" FROM actor a JOIN space s ON s.id=a.id WHERE a."nameID" IN (:names) -- psql -v names="'handle-a','handle-b'" ORDER BY 1,3;
