\echo === G3a file rows without authorization policy since 2026-08: shape
SELECT date_trunc('month', f."createdDate")::date m, (f."storageBucketId" IS NULL) no_bucket, f."temporaryLocation" tmp, (f."externalReference" IS NOT NULL) has_extref, (f."createdBy" IS NULL) no_creator, count(*)
FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;
\echo === G3b mime types / what references them
SELECT f."mimeType", count(*) FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
SELECT count(*) total,
 count(*) FILTER (WHERE EXISTS (SELECT 1 FROM visual v WHERE v.uri LIKE '%'||f.id::text||'%')) in_visual,
 count(*) FILTER (WHERE EXISTS (SELECT 1 FROM reference r WHERE r.uri LIKE '%'||f.id::text||'%')) in_reference,
 count(*) FILTER (WHERE EXISTS (SELECT 1 FROM link l WHERE l.uri LIKE '%'||f.id::text||'%')) in_link,
 count(*) FILTER (WHERE EXISTS (SELECT 1 FROM whiteboard w WHERE w.content LIKE '%'||f.id::text||'%')) in_whiteboard
FROM file f WHERE f."authorizationId" IS NULL;
\echo === G3c bucket owner type for NULL-policy files (which aggregator/owner)
SELECT coalesce(
  (SELECT 'profile:'||p.type FROM profile p WHERE p."storageBucketId"=f."storageBucketId" LIMIT 1),
  (SELECT 'callout-framing' FROM callout_framing cf WHERE cf."storageBucketId"=f."storageBucketId" LIMIT 1),
  (SELECT 'conversation' FROM conversation c WHERE c."storageAggregatorId"=sb."storageAggregatorId" LIMIT 1),
  (SELECT 'aggregator:'||sa.type FROM storage_aggregator sa WHERE sa.id=sb."storageAggregatorId"), 'unknown') owner, count(*)
FROM file f LEFT JOIN storage_bucket sb ON sb.id=f."storageBucketId" WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === G3d which columns reference storage_bucket (to know owners)
SELECT conrelid::regclass child, a.attname FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE contype='f' AND confrelid='storage_bucket'::regclass;
\echo === G3e samples (2 per month) for live probing
(SELECT f.id, f."createdDate"::date, f."mimeType", f.size FROM file f WHERE f."authorizationId" IS NULL AND f."createdDate">='2026-10-01' ORDER BY f."createdDate" DESC LIMIT 3)
UNION ALL (SELECT f.id, f."createdDate"::date, f."mimeType", f.size FROM file f WHERE f."authorizationId" IS NULL AND f."createdDate">='2026-09-01' AND f."createdDate"<'2026-10-01' ORDER BY f."createdDate" DESC LIMIT 2)
UNION ALL (SELECT f.id, f."createdDate"::date, f."mimeType", f.size FROM file f WHERE f."authorizationId" IS NULL AND f."createdDate">='2026-08-01' AND f."createdDate"<'2026-09-01' ORDER BY f."createdDate" DESC LIMIT 2)
UNION ALL (SELECT f.id, f."createdDate"::date, f."mimeType", f.size FROM file f WHERE f."authorizationId" IS NOT NULL AND f."createdDate">='2026-10-01' ORDER BY f."createdDate" DESC LIMIT 2);
\echo === G3f same-day comparison: Oct 2026 files with vs without policy by mime + extref
SELECT (f."authorizationId" IS NULL) no_policy, (f."externalReference" IS NOT NULL) extref, f."mimeType", count(*) FROM file f WHERE f."createdDate">='2026-10-01' GROUP BY 1,2,3 ORDER BY 1,4 DESC LIMIT 14;

\echo === A9d invitee creds with no invitation row: actor type, space exists, platform_invitation for the actor email?
SELECT a.type, (s.id IS NOT NULL) space_exists, count(*), max(c."createdDate")::date FROM credential c JOIN actor a ON a.id=c."actorId" LEFT JOIN space s ON s.id::text=c."resourceID"
WHERE c.type='space-invitee' AND NOT EXISTS (SELECT 1 FROM invitation i JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s2 ON s2."communityId"=cm.id WHERE s2.id::text=c."resourceID" AND i."invitedActorId"=c."actorId") GROUP BY 1,2 ORDER BY 3 DESC;
\echo === A9e invitations table: count by state, and invitations deleted recently? (no soft delete) — count of invitation rows vs invitee creds overall
SELECT (SELECT count(*) FROM invitation) invitations, (SELECT count(*) FROM credential WHERE type='space-invitee') invitee_creds;
