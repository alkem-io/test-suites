\echo === A2 cases: parent, child, timing
WITH mis AS (
 SELECT s.id space_id, a."nameID" space, s.level, a."createdDate" created, (r.credential->>'resourceID')::uuid points_to
 FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member'
 WHERE r.credential->>'resourceID'<>s.id::text)
SELECT m.level, m.space, m.created, ca."nameID" points_to_nameid, cs.level pt_level, (cs."parentSpaceId"=m.space_id) pt_is_child, ca."createdDate" pt_created, round(extract(epoch from ca."createdDate"-m.created)) delta_s,
 (SELECT count(*) FROM space x WHERE x."parentSpaceId"=m.space_id) n_children, pa."nameID" parent_of_affected
FROM mis m LEFT JOIN actor ca ON ca.id=m.points_to LEFT JOIN space cs ON cs.id=m.points_to LEFT JOIN space ps ON ps.id=(SELECT "parentSpaceId" FROM space WHERE id=m.space_id) LEFT JOIN actor pa ON pa.id=ps.id
ORDER BY m.created;
\echo === A2 affected parents: do all their roles (member/lead/admin) point to the child? and the child's own roles?
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT r.name, (r.credential->>'resourceID')::uuid = m.points_to AS pts_child, count(*) FROM mis m JOIN space s ON s.id=m.space_id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" GROUP BY 1,2 ORDER BY 1,2;
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT 'child roles ok' k, count(*) FILTER (WHERE r.credential->>'resourceID'=m.points_to::text) ok, count(*) FILTER (WHERE r.credential->>'resourceID'<>m.points_to::text) bad FROM mis m JOIN space s ON s.id=m.points_to JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId";
\echo === A2 child's parentCredentials: point to parent id or to child?
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT r.name, e->>'type' ptype, (e->>'resourceID')=m.space_id::text AS is_parent, (e->>'resourceID')=m.points_to::text AS is_self, count(*) FROM mis m JOIN space s ON s.id=m.points_to JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId", jsonb_array_elements(r."parentCredentials") e GROUP BY 1,2,3,4 ORDER BY 1,2;
\echo === A2 affected parents: anyone holding space-member on the parent's own id? on the child's id?
WITH mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential cr WHERE cr.type='space-member' AND cr."resourceID"=m.space_id::text)) parents_with_own_members,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential cr WHERE cr.type='space-member' AND cr."resourceID"=m.points_to::text)) children_with_members, count(*) FROM mis m;
\echo === A2 recent examples (2026) with L0 nameID for URL
WITH mis AS (SELECT s.id space_id, a."nameID" space, s.level, a."createdDate" created, (r.credential->>'resourceID')::uuid points_to, s."levelZeroSpaceID" l0 FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT m.created::date, m.level, l0a."nameID" l0, m.space, ca."nameID" child FROM mis m JOIN actor l0a ON l0a.id=m.l0 LEFT JOIN actor ca ON ca.id=m.points_to WHERE m.created>='2026-01-01' ORDER BY 1;
\echo === A2 affected parent: created via template? (space_about / collaboration innovation flow template refs) — check if parent and child share createdDate second with the L0
WITH mis AS (SELECT s.id space_id, a."createdDate" created, s."parentSpaceId" FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT count(*) FILTER (WHERE abs(extract(epoch from m.created - pa."createdDate"))<120) parent_created_within_2min_of_grandparent, count(*) FROM mis m JOIN actor pa ON pa.id=m."parentSpaceId";

\echo === F1 callouts comments enabled, no room: by year
SELECT date_trunc('year', c."createdDate")::date yr, count(*) FROM callout c WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' GROUP BY 1 ORDER BY 1;
SELECT jsonb_typeof(c.settings->'framing'->'commentsEnabled'), count(*) FROM callout c WHERE c."commentsId" IS NULL GROUP BY 1;
\echo === F1b of those: callout type / in template content space vs real space
SELECT (cs.id IS NULL) AS in_template_or_orphan, date_trunc('year', c."createdDate")::date yr, count(*) FROM callout c LEFT JOIN callouts_set cs ON cs.id=c."calloutsSetId" LEFT JOIN collaboration col ON col."calloutsSetId"=cs.id LEFT JOIN space sp ON sp."collaborationId"=col.id WHERE c."commentsId" IS NULL AND (c.settings->'framing'->>'commentsEnabled')='true' GROUP BY (sp.id IS NULL), 2 ORDER BY 1,2;
\echo === T1 orphan room rows by month
SELECT r.type, date_trunc('month', r."createdDate")::date m, count(*) FROM room r WHERE NOT EXISTS (SELECT 1 FROM callout c WHERE c."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM post p WHERE p."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM discussion d WHERE d."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM communication m WHERE m."updatesId"=r.id) AND NOT EXISTS (SELECT 1 FROM conversation v WHERE v."roomId"=r.id) AND NOT EXISTS (SELECT 1 FROM calendar_event e WHERE e."commentsId"=r.id) GROUP BY 1,2 ORDER BY 2;

\echo === L1 flow-state tags outside allowedValues: by tagset updated year; template updated vs flow updated
SELECT date_trunc('year', t."updatedDate")::date yr, count(*) FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" WHERE tt.name='flow-state' AND EXISTS (SELECT 1 FROM unnest(t.tags) tg WHERE NOT (tg = ANY(tt."allowedValues"))) GROUP BY 1 ORDER BY 1;
SELECT count(DISTINCT tt.id) templates, count(DISTINCT tt.id) FILTER (WHERE tt."updatedDate" < f."updatedDate") template_older_than_flow FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" JOIN tagset_template_set tts ON tts.id=tt."tagsetTemplateSetId" JOIN callouts_set cs ON cs."tagsetTemplateSetId"=tts.id JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN innovation_flow f ON f.id=col."innovationFlowId" WHERE tt.name='flow-state' AND EXISTS (SELECT 1 FROM unnest(t.tags) tg WHERE NOT (tg = ANY(tt."allowedValues")));
\echo === L1b sample: tag vs allowedValues vs actual flow state names
SELECT t.tags, tt."allowedValues", (SELECT array_agg(st."displayName" ORDER BY st."sortOrder") FROM innovation_flow_state st WHERE st."innovationFlowId"=f.id) states FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" JOIN tagset_template_set tts ON tts.id=tt."tagsetTemplateSetId" JOIN callouts_set cs ON cs."tagsetTemplateSetId"=tts.id JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN innovation_flow f ON f.id=col."innovationFlowId" WHERE tt.name='flow-state' AND EXISTS (SELECT 1 FROM unnest(t.tags) tg WHERE NOT (tg = ANY(tt."allowedValues"))) LIMIT 5;

\echo === C2 duplicate L0 nameID pairs: creation timestamps
SELECT a."nameID", a."createdDate", a.id FROM actor a JOIN space s ON s.id=a.id WHERE s.level=0 AND a."nameID" IN (SELECT a2."nameID" FROM actor a2 JOIN space s2 ON s2.id=a2.id WHERE s2.level=0 GROUP BY 1 HAVING count(*)>1) ORDER BY 1,2;
SELECT indexdef FROM pg_indexes WHERE tablename='actor';

\echo === B1 credentials with actorId NULL by type / year
SELECT type, date_trunc('year', "createdDate")::date yr, count(*) FROM credential WHERE "actorId" IS NULL GROUP BY 1,2 ORDER BY 2,1;
\echo === B2 space-* credentials pointing at deleted spaces by year
SELECT date_trunc('year', c."createdDate")::date yr, count(*) FROM credential c WHERE c.type LIKE 'space-%' AND c.type NOT LIKE 'space-license%' AND c.type NOT LIKE 'space-feature%' AND c.type NOT LIKE 'space-flag%' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID") GROUP BY 1 ORDER BY 1;
\echo === A9 space-invitee without pending invitation by year
SELECT date_trunc('year', c."createdDate")::date yr, count(*) FROM credential c WHERE c.type='space-invitee' AND NOT EXISTS (SELECT 1 FROM invitation i JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=cm.id JOIN lifecycle l ON l.id=i."lifecycleId" WHERE s.id::text=c."resourceID" AND i."invitedActorId"=c."actorId" AND l."machineState" NOT LIKE '%accepted%' AND l."machineState" NOT LIKE '%rejected%') GROUP BY 1 ORDER BY 1;

\echo === A4 user memberships without parent membership: level pattern (has L0? has L1?) and 2026 by month
WITH m AS (
 SELECT c."actorId", s.id sid, s.level, s."parentSpaceId" pid, s."levelZeroSpaceID" l0, c."createdDate", a.type atype
 FROM credential c JOIN space s ON s.id::text=c."resourceID" JOIN actor a ON a.id=c."actorId" WHERE c.type='space-member' AND s.level>0)
SELECT m.atype, m.level, EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text) has_parent, EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.l0::text) has_l0, count(*), max(m."createdDate")::date latest
FROM m WHERE NOT EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text) GROUP BY 1,2,3,4 ORDER BY 1,2;
WITH m AS (SELECT c."actorId", s.id sid, s."parentSpaceId" pid, c."createdDate" FROM credential c JOIN space s ON s.id::text=c."resourceID" WHERE c.type='space-member' AND s.level>0)
SELECT date_trunc('month', m."createdDate")::date mo, count(*) FROM m WHERE m."createdDate">='2026-01-01' AND NOT EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text) GROUP BY 1 ORDER BY 1;
\echo === A4b are the orphan subspace memberships in A2-affected spaces? (membership resolves against child)
WITH m AS (SELECT c."actorId", s.id sid, s."parentSpaceId" pid FROM credential c JOIN space s ON s.id::text=c."resourceID" WHERE c.type='space-member' AND s.level>0),
 mis AS (SELECT s.id space_id, (r.credential->>'resourceID')::uuid points_to FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member' WHERE r.credential->>'resourceID'<>s.id::text)
SELECT count(*) total, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM mis WHERE mis.points_to=m.sid OR mis.space_id=m.pid)) in_a2_family FROM m WHERE NOT EXISTS (SELECT 1 FROM credential p WHERE p.type='space-member' AND p."actorId"=m."actorId" AND p."resourceID"=m.pid::text);

\echo === E2 orgs with zero owners by creation year
SELECT date_trunc('year', a."createdDate")::date yr, count(*) FROM organization o JOIN actor a ON a.id=o.id WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text) GROUP BY 1 ORDER BY 1;

\echo === F6 files without bucket by month 2026; temp files never attached by year
SELECT date_trunc('month', f."createdDate")::date m, count(*), count(*) FILTER (WHERE f."authorizationId" IS NULL) no_auth FROM file f WHERE f."storageBucketId" IS NULL AND f."createdDate">='2025-06-01' GROUP BY 1 ORDER BY 1;
SELECT date_trunc('year', f."createdDate")::date yr, count(*) FROM file f WHERE f."temporaryLocation" GROUP BY 1 ORDER BY 1;
SELECT date_trunc('year', f."createdDate")::date yr, count(*) FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 1;
\echo === F6b bucketless files: created by whom / mime / are they referenced by a visual or whiteboard?
SELECT f."mimeType", count(*) FROM file f WHERE f."storageBucketId" IS NULL AND f."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM visual v WHERE v.uri LIKE '%'||f.id::text||'%')) in_visual, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reference r WHERE r.uri LIKE '%'||f.id::text||'%')) in_reference, count(*) FROM file f WHERE f."storageBucketId" IS NULL AND f."createdDate">='2026-01-01';
\echo === FK on file.storageBucketId
SELECT conname, confdeltype FROM pg_constraint WHERE conrelid='file'::regclass AND contype='f';
