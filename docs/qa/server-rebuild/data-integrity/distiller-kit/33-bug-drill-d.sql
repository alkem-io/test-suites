\echo === G3c bucket owner for NULL-policy files
SELECT coalesce((SELECT 'profile:'||p.type FROM profile p WHERE p."storageBucketId"=f."storageBucketId" LIMIT 1),(SELECT 'media_gallery' FROM media_gallery mg WHERE mg."storageBucketId"=f."storageBucketId" LIMIT 1),(SELECT 'aggregator-direct:'||sa.type FROM storage_aggregator sa WHERE sa."directStorageId"=f."storageBucketId" LIMIT 1),'unknown') owner, (f."mimeType"='application/octet-stream') octet, count(*), min(f."createdDate")::date, max(f."createdDate")::date
FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1,2 ORDER BY 3 DESC;
\echo === G3g what else lives in those buckets (siblings with policy): the aggregator's owner (space/account/user/org)
SELECT sa.type agg_type, count(DISTINCT f.id) files, count(DISTINCT f."storageBucketId") buckets FROM file f JOIN storage_bucket sb ON sb.id=f."storageBucketId" JOIN storage_aggregator sa ON sa.id=sb."storageAggregatorId" WHERE f."authorizationId" IS NULL GROUP BY 1;
\echo === G3h displayName patterns of NULL-policy octet-stream files
SELECT left(regexp_replace(f."displayName", '[0-9a-f]{8,}', '<hex>', 'g'), 40) pattern, count(*) FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
\echo === G3i content_metadata keys
SELECT k, count(*) FROM file f, jsonb_object_keys(f.content_metadata) k WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
\echo === A9f 2026 invitee leftovers: space, actor type, created, and whether a platform_invitation/application exists for that actor on the role set
SELECT a."nameID" space, ac.type actor_type, c."createdDate"::date, EXISTS (SELECT 1 FROM application ap JOIN community cm ON cm."roleSetId"=ap."roleSetId" WHERE cm.id=s."communityId" AND ap."userId"=c."actorId") has_application
FROM credential c JOIN actor ac ON ac.id=c."actorId" JOIN space s ON s.id::text=c."resourceID" JOIN actor a ON a.id=s.id
WHERE c.type='space-invitee' AND c."createdDate">='2026-01-01' AND NOT EXISTS (SELECT 1 FROM invitation i JOIN community cm ON cm."roleSetId"=i."roleSetId" WHERE cm.id=s."communityId" AND i."invitedActorId"=c."actorId") ORDER BY 3 DESC;
