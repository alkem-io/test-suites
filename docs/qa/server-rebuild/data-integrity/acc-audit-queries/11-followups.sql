\pset footer off
\echo ===K role/community swap analysis (54 spaces whose role credentials point to another space)
CREATE TEMP TABLE mis AS
SELECT DISTINCT s.id AS space_id, a."nameID" AS space, s.level, (r.credential->>'resourceID')::uuid AS points_to, c.id AS community_id, m."spaceID" AS comm_space_id, r."updatedDate" AS role_updated
FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN communication m ON m.id=c."communicationId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='member'
WHERE r.credential->>'resourceID'<>s.id::text;
SELECT 'mismatched spaces' AS chk, count(*) FROM mis
UNION ALL SELECT 'pairwise swap (A->B and B->A)', count(*) FROM mis x JOIN mis y ON y.space_id=x.points_to AND y.points_to=x.space_id
UNION ALL SELECT 'communication.spaceID == role credential target (community internally consistent, attached to wrong space)', count(*) FROM mis WHERE comm_space_id=points_to::text
UNION ALL SELECT 'communication.spaceID empty', count(*) FROM mis WHERE comm_space_id=''
UNION ALL SELECT 'points_to is own parent', count(*) FROM mis x JOIN space s ON s.id=x.space_id WHERE s."parentSpaceId"=x.points_to
UNION ALL SELECT 'points_to is own child', count(*) FROM mis x JOIN space s ON s."parentSpaceId"=x.space_id WHERE s.id=x.points_to
UNION ALL SELECT 'points_to is sibling', count(*) FROM mis x JOIN space s ON s.id=x.space_id JOIN space o ON o.id=x.points_to WHERE o."parentSpaceId"=s."parentSpaceId" AND o.id<>s.id
UNION ALL SELECT 'by level '||level, count(*) FROM mis GROUP BY level
UNION ALL SELECT 'role updated month '||to_char(role_updated,'YYYY-MM'), count(*) FROM mis GROUP BY 2;
\echo ===K swap rows (first 30)
SELECT x.space, x.level, t."nameID" AS roles_point_to, ts.level AS target_level, (x.comm_space_id=x.points_to::text) AS comm_follows_roles, x.role_updated::date,
  (SELECT count(*) FROM credential c WHERE c.type='space-member' AND c."resourceID"=x.space_id::text) AS members_on_space_id,
  (SELECT count(*) FROM credential c WHERE c.type='space-member' AND c."resourceID"=x.points_to::text) AS members_on_target
FROM mis x JOIN actor t ON t.id=x.points_to JOIN space ts ON ts.id=x.points_to ORDER BY x.role_updated DESC LIMIT 30;
\echo ===K distinct L0 trees containing mismatched spaces
SELECT l0."nameID" AS l0, count(*) FROM mis x JOIN space s ON s.id=x.space_id JOIN actor l0 ON l0.id=s."levelZeroSpaceID" GROUP BY 1 ORDER BY 2 DESC;
\echo ===K communication.spaceID != owning space: where does it point
SELECT CASE WHEN m."spaceID"=s."parentSpaceId"::text THEN 'parent' WHEN EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"=s.id AND ch.id::text=m."spaceID") THEN 'child' WHEN EXISTS (SELECT 1 FROM space o WHERE o.id::text=m."spaceID") THEN 'other existing space' ELSE 'nonexistent' END AS target, count(*)
FROM space s JOIN community c ON c.id=s."communityId" JOIN communication m ON m.id=c."communicationId" WHERE m."spaceID"<>'' AND m."spaceID"<>s.id::text GROUP BY 1;
\echo ===K other follow-ups
SELECT 'callout commentsId null AND comments disabled in settings' AS chk, count(*) FROM callout WHERE "commentsId" IS NULL AND (settings->'framing'->>'commentsEnabled')='false'
UNION ALL SELECT 'callout commentsId null AND comments enabled', count(*) FROM callout WHERE "commentsId" IS NULL AND coalesce(settings->'framing'->>'commentsEnabled','true')<>'false'
UNION ALL SELECT 'callout settings keys: '||k, count(*) FROM callout, jsonb_object_keys(settings) k GROUP BY k
UNION ALL SELECT 'callout isTemplate in template_content_space collaboration', count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id WHERE c."isTemplate"=true AND EXISTS (SELECT 1 FROM template_content_space t WHERE t."collaborationId"=col.id)
UNION ALL SELECT 'callout isTemplate in a real space collaboration', count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id WHERE c."isTemplate"=true AND EXISTS (SELECT 1 FROM space s WHERE s."collaborationId"=col.id)
UNION ALL SELECT 'callout isTemplate=false inside template_content_space', count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id WHERE c."isTemplate"=false AND EXISTS (SELECT 1 FROM template_content_space t WHERE t."collaborationId"=col.id)
UNION ALL SELECT 'callout isTemplate with no calloutsSet and no template ref', count(*) FROM callout c WHERE c."isTemplate"=true AND c."calloutsSetId" IS NULL AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c.id)
UNION ALL SELECT 'callouts_set not owned by collaboration/knowledge_base', count(*) FROM callouts_set cs WHERE NOT EXISTS (SELECT 1 FROM collaboration c WHERE c."calloutsSetId"=cs.id) AND NOT EXISTS (SELECT 1 FROM knowledge_base k WHERE k."calloutsSetId"=cs.id)
UNION ALL SELECT 'visual without profile and without mediaGallery', count(*) FROM visual WHERE "profileId" IS NULL AND "mediaGalleryId" IS NULL
UNION ALL SELECT 'visual in mediaGallery', count(*) FROM visual WHERE "mediaGalleryId" IS NOT NULL
UNION ALL SELECT 'storage_bucket not owned (profile/media_gallery/aggregator)', count(*) FROM storage_bucket b WHERE NOT EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=b.id) AND NOT EXISTS (SELECT 1 FROM media_gallery g WHERE g."storageBucketId"=b.id) AND NOT EXISTS (SELECT 1 FROM storage_aggregator a WHERE a."directStorageId"=b.id)
UNION ALL SELECT 'orphan storage_bucket still holding files', count(*) FROM storage_bucket b WHERE NOT EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=b.id) AND NOT EXISTS (SELECT 1 FROM media_gallery g WHERE g."storageBucketId"=b.id) AND NOT EXISTS (SELECT 1 FROM storage_aggregator a WHERE a."directStorageId"=b.id) AND EXISTS (SELECT 1 FROM file f WHERE f."storageBucketId"=b.id)
UNION ALL SELECT 'profile displayName empty by type: '||type, count(*) FROM profile WHERE "displayName" IS NULL OR trim("displayName")='' GROUP BY type
UNION ALL SELECT 'lifecycle not owned (incl org verification)', count(*) FROM lifecycle l WHERE NOT EXISTS (SELECT 1 FROM invitation i WHERE i."lifecycleId"=l.id) AND NOT EXISTS (SELECT 1 FROM application a WHERE a."lifecycleId"=l.id) AND NOT EXISTS (SELECT 1 FROM organization_verification v WHERE v."lifecycleId"=l.id)
UNION ALL SELECT 'duplicate actor nameID by type: '||type, count(*) FROM (SELECT type, lower("nameID") n FROM actor GROUP BY 1,2 HAVING count(*)>1) d GROUP BY type
UNION ALL SELECT 'account not referenced by user/org by type: '||coalesce(account_type::text,'<empty>'), count(*) FROM account a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id) GROUP BY account_type
UNION ALL SELECT 'unreferenced accounts still owning L0 spaces', count(DISTINCT a.id) FROM account a JOIN space s ON s."accountId"=a.id WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id)
UNION ALL SELECT 'unreferenced accounts owning VCs', count(DISTINCT a.id) FROM account a JOIN virtual_contributor v ON v."accountId"=a.id WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id)
UNION ALL SELECT 'account_type empty', count(*) FROM account WHERE account_type IS NULL OR account_type::text=''
UNION ALL SELECT 'account-admin held by someone who is neither account user nor org owner/admin', count(*) FROM credential c WHERE c.type='account-admin' AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"::text=c."resourceID" AND u.id=c."actorId") AND NOT EXISTS (SELECT 1 FROM organization org JOIN credential o ON o."resourceID"=org.id::text AND o.type IN ('organization-owner','organization-admin') AND o."actorId"=c."actorId" WHERE org."accountID"::text=c."resourceID")
UNION ALL SELECT 'org owner/admin lacking account-admin on org account', count(*) FROM credential o JOIN organization org ON org.id::text=o."resourceID" WHERE o.type IN ('organization-owner','organization-admin') AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=o."actorId" AND c.type='account-admin' AND c."resourceID"=org."accountID"::text)
UNION ALL SELECT 'L0 aggregator parent null by account type: '||coalesce(ac.account_type::text,'<empty>'), count(*) FROM space s JOIN account ac ON ac.id=s."accountId" JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId" WHERE s.level=0 AND sa."parentStorageAggregatorId" IS NULL GROUP BY ac.account_type
UNION ALL SELECT 'file without storageBucket by year '||extract(year FROM "createdDate"), count(*) FROM file WHERE "storageBucketId" IS NULL GROUP BY 2
UNION ALL SELECT 'conversation <2 members by room type: '||coalesce(r.type,'<none>'), count(*) FROM conversation c LEFT JOIN room r ON r.id=c."roomId" WHERE (SELECT count(*) FROM conversation_membership m WHERE m."conversationId"=c.id)<2 GROUP BY r.type
UNION ALL SELECT 'conversation with 0 members', count(*) FROM conversation c WHERE NOT EXISTS (SELECT 1 FROM conversation_membership m WHERE m."conversationId"=c.id)
UNION ALL SELECT 'dup space-feature-virtual-contributors by actor type: '||a.type, count(*) FROM (SELECT "actorId" FROM credential WHERE type='space-feature-virtual-contributors' GROUP BY "actorId","resourceID" HAVING count(*)>1) d JOIN actor a ON a.id=d."actorId" GROUP BY a.type
UNION ALL SELECT 'dup space-lead by actor type: '||a.type, count(*) FROM (SELECT "actorId" FROM credential WHERE type='space-lead' GROUP BY "actorId","resourceID" HAVING count(*)>1) d JOIN actor a ON a.id=d."actorId" GROUP BY a.type
UNION ALL SELECT 'room type empty', count(*) FROM room WHERE type IS NULL OR type=''
UNION ALL SELECT 'storage_aggregator type empty', count(*) FROM storage_aggregator WHERE type IS NULL OR type=''
UNION ALL SELECT 'org zero owners by account type: '||coalesce(ac.account_type::text,'?'), count(*) FROM organization o LEFT JOIN account ac ON ac.id=o."accountID" WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text) GROUP BY ac.account_type
UNION ALL SELECT 'user_settings orphan rows', count(*) FROM user_settings s WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."settingsId"=s.id)
UNION ALL SELECT 'templates_manager orphan: has templates', count(*) FROM templates_manager m JOIN templates_set ts ON ts.id=m."templatesSetId" WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."templatesManagerId"=m.id) AND NOT EXISTS (SELECT 1 FROM platform p WHERE p."templatesManagerId"=m.id) AND EXISTS (SELECT 1 FROM template t WHERE t."templatesSetId"=ts.id)
UNION ALL SELECT 'license orphan by type: '||type, count(*) FROM license l WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM account a WHERE a."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM role_set r WHERE r."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM collaboration c WHERE c."licenseId"=l.id) GROUP BY type;
\echo ===K duplicate actor nameIDs sample
SELECT type, lower("nameID") AS nameid, count(*), min("createdDate")::date AS first, max("createdDate")::date AS last FROM actor GROUP BY 1,2 HAVING count(*)>1 ORDER BY 3 DESC, 1 LIMIT 15;
\echo ===K duplicate callout nameIDs sample
SELECT c."nameID", count(*) FROM callout c WHERE c."calloutsSetId" IS NOT NULL GROUP BY c."calloutsSetId", c."nameID" HAVING count(*)>1 ORDER BY 2 DESC LIMIT 8;
