\pset footer off
\echo ===H collaboration / communication / invitations / lifecycles
SELECT 'callout without framing' AS chk, count(*) FROM callout WHERE "framingId" IS NULL
UNION ALL SELECT 'callout without calloutsSet (non-template)', count(*) FROM callout WHERE "calloutsSetId" IS NULL AND "isTemplate"=false AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=callout.id)
UNION ALL SELECT 'callout isTemplate but referenced by no template', count(*) FROM callout c WHERE c."isTemplate"=true AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c.id)
UNION ALL SELECT 'callout without comments room', count(*) FROM callout WHERE "commentsId" IS NULL
UNION ALL SELECT 'callout without contributionDefaults', count(*) FROM callout WHERE "contributionDefaultsId" IS NULL
UNION ALL SELECT 'callout without classification', count(*) FROM callout WHERE "classificationId" IS NULL
UNION ALL SELECT 'callout duplicate nameID within calloutsSet', count(*) FROM (SELECT "calloutsSetId","nameID" FROM callout WHERE "calloutsSetId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'callout publishedBy -> deleted user', count(*) FROM callout c WHERE c."publishedBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=c."publishedBy"::text)
UNION ALL SELECT 'callout_framing without profile', count(*) FROM callout_framing WHERE "profileId" IS NULL
UNION ALL SELECT 'callout_framing type/content mismatch', count(*) FROM callout_framing f WHERE (f.type='whiteboard' AND f."whiteboardId" IS NULL) OR (f.type='memo' AND f."memoId" IS NULL) OR (f.type='link' AND f."linkId" IS NULL) OR (f.type='poll' AND f."pollId" IS NULL) OR (f.type='media-gallery' AND f."mediaGalleryId" IS NULL)
UNION ALL SELECT 'callout_framing none-type with content attached', count(*) FROM callout_framing f WHERE f.type='none' AND ("whiteboardId" IS NOT NULL OR "memoId" IS NOT NULL OR "linkId" IS NOT NULL OR "pollId" IS NOT NULL OR "mediaGalleryId" IS NOT NULL)
UNION ALL SELECT 'contribution with no content', count(*) FROM callout_contribution WHERE "postId" IS NULL AND "whiteboardId" IS NULL AND "linkId" IS NULL AND "memoId" IS NULL AND "collaboraDocumentId" IS NULL
UNION ALL SELECT 'contribution type/content mismatch', count(*) FROM callout_contribution c WHERE (c.type='post' AND "postId" IS NULL) OR (c.type='whiteboard' AND "whiteboardId" IS NULL) OR (c.type='link' AND "linkId" IS NULL) OR (c.type='memo' AND "memoId" IS NULL)
UNION ALL SELECT 'contribution without callout', count(*) FROM callout_contribution WHERE "calloutId" IS NULL
UNION ALL SELECT 'collaboration without calloutsSet', count(*) FROM collaboration WHERE "calloutsSetId" IS NULL
UNION ALL SELECT 'collaboration without innovationFlow', count(*) FROM collaboration WHERE "innovationFlowId" IS NULL
UNION ALL SELECT 'collaboration without timeline (non-template)', count(*) FROM collaboration WHERE "timelineId" IS NULL AND "isTemplate"=false
UNION ALL SELECT 'collaboration not owned by space or template', count(*) FROM collaboration c WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."collaborationId"=c.id) AND NOT EXISTS (SELECT 1 FROM template_content_space t WHERE t."collaborationId"=c.id)
UNION ALL SELECT 'innovation_flow with zero states', count(*) FROM innovation_flow f WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id)
UNION ALL SELECT 'community without communication', count(*) FROM community WHERE "communicationId" IS NULL
UNION ALL SELECT 'community not owned by space', count(*) FROM community c WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."communityId"=c.id)
UNION ALL SELECT 'communication without updates room', count(*) FROM communication WHERE "updatesId" IS NULL

UNION ALL SELECT 'room types: see below', 0
UNION ALL SELECT 'invitation -> invitedActor missing', count(*) FROM invitation i WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=i."invitedActorId")
UNION ALL SELECT 'invitation without lifecycle', count(*) FROM invitation WHERE "lifecycleId" IS NULL
UNION ALL SELECT 'invitation without roleSet', count(*) FROM invitation WHERE "roleSetId" IS NULL
UNION ALL SELECT 'invitation pending but actor already member', count(*) FROM invitation i JOIN lifecycle l ON l.id=i."lifecycleId" JOIN community c ON c."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=c.id WHERE l."machineState"::text ILIKE '%invited%' AND EXISTS (SELECT 1 FROM credential cr WHERE cr."actorId"=i."invitedActorId" AND cr.type='space-member' AND cr."resourceID"=s.id::text)
UNION ALL SELECT 'duplicate pending invitation (actor, roleSet)', count(*) FROM (SELECT i."invitedActorId", i."roleSetId" FROM invitation i JOIN lifecycle l ON l.id=i."lifecycleId" WHERE l."machineState"::text ILIKE '%invited%' GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'application -> user missing', count(*) FROM application a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=a."userId")
UNION ALL SELECT 'application without lifecycle', count(*) FROM application WHERE "lifecycleId" IS NULL
UNION ALL SELECT 'application pending but user already member', count(*) FROM application ap JOIN lifecycle l ON l.id=ap."lifecycleId" JOIN community c ON c."roleSetId"=ap."roleSetId" JOIN space s ON s."communityId"=c.id WHERE l."machineState"::text ILIKE '%new%' AND EXISTS (SELECT 1 FROM credential cr WHERE cr."actorId"=ap."userId" AND cr.type='space-member' AND cr."resourceID"=s.id::text)
UNION ALL SELECT 'duplicate pending application (user, roleSet)', count(*) FROM (SELECT ap."userId", ap."roleSetId" FROM application ap JOIN lifecycle l ON l.id=ap."lifecycleId" WHERE l."machineState"::text ILIKE '%new%' GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'platform_invitation email already a user', count(*) FROM platform_invitation p WHERE EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email)=lower(p.email))
UNION ALL SELECT 'platform_invitation profileCreated but roleSet still set', count(*) FROM platform_invitation WHERE "profileCreated"=true AND "roleSetId" IS NOT NULL
UNION ALL SELECT 'lifecycle not owned', count(*) FROM lifecycle l WHERE NOT EXISTS (SELECT 1 FROM invitation i WHERE i."lifecycleId"=l.id) AND NOT EXISTS (SELECT 1 FROM application a WHERE a."lifecycleId"=l.id)
UNION ALL SELECT 'conversation_membership -> missing actor', count(*) FROM conversation_membership m WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=m."actorId")
UNION ALL SELECT 'conversation with <2 members', count(*) FROM conversation c WHERE (SELECT count(*) FROM conversation_membership m WHERE m."conversationId"=c.id)<2
UNION ALL SELECT 'conversation without room', count(*) FROM conversation WHERE "roomId" IS NULL
UNION ALL SELECT 'in_app_notification spaceID -> missing', count(*) FROM in_app_notification n WHERE n."spaceID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id=n."spaceID")
UNION ALL SELECT 'in_app_notification calloutID -> missing', count(*) FROM in_app_notification n WHERE n."calloutID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM callout s WHERE s.id=n."calloutID")
UNION ALL SELECT 'template without profile', count(*) FROM template WHERE "profileId" IS NULL
UNION ALL SELECT 'template type/content mismatch', count(*) FROM template t WHERE (t.type='callout' AND t."calloutId" IS NULL) OR (t.type='whiteboard' AND t."whiteboardId" IS NULL) OR (t.type='space' AND t."contentSpaceId" IS NULL) OR (t.type='community-guidelines' AND t."communityGuidelinesId" IS NULL)
UNION ALL SELECT 'template without templatesSet', count(*) FROM template WHERE "templatesSetId" IS NULL
UNION ALL SELECT 'template_default -> templateId wrong type', count(*) FROM template_default d JOIN template t ON t.id=d."templateId" WHERE t.type<>d."allowedTemplateType"
UNION ALL SELECT 'templates_manager not owned by L0 space', count(*) FROM templates_manager m WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."templatesManagerId"=m.id) AND NOT EXISTS (SELECT 1 FROM platform p WHERE p."templatesManagerId"=m.id)
UNION ALL SELECT 'file without storageBucket', count(*) FROM file WHERE "storageBucketId" IS NULL
UNION ALL SELECT 'file externalID empty', count(*) FROM file WHERE "externalID" IS NULL OR "externalID"=''
UNION ALL SELECT 'file temporaryLocation=true (never attached)', count(*) FROM file WHERE "temporaryLocation"=true
UNION ALL SELECT 'storage_bucket not owned by profile/aggregator-direct', count(*) FROM storage_bucket b WHERE NOT EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=b.id) AND NOT EXISTS (SELECT 1 FROM storage_aggregator a WHERE a."directStorageId"=b.id)
UNION ALL SELECT 'visual without profile', count(*) FROM visual WHERE "profileId" IS NULL
UNION ALL SELECT 'tagset without profile (and not template)', count(*) FROM tagset t WHERE t."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM classification c WHERE t."classificationId"=c.id) AND NOT EXISTS (SELECT 1 FROM file f WHERE f."tagsetId"=t.id)
UNION ALL SELECT 'reference without profile', count(*) FROM reference WHERE "profileId" IS NULL
UNION ALL SELECT 'whiteboard not referenced (framing/contribution/template)', count(*) FROM whiteboard w WHERE NOT EXISTS (SELECT 1 FROM callout_framing f WHERE f."whiteboardId"=w.id) AND NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c."whiteboardId"=w.id) AND NOT EXISTS (SELECT 1 FROM template t WHERE t."whiteboardId"=w.id)
UNION ALL SELECT 'post not referenced by contribution', count(*) FROM post p WHERE NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c."postId"=p.id)
UNION ALL SELECT 'memo not referenced', count(*) FROM memo m WHERE NOT EXISTS (SELECT 1 FROM callout_framing f WHERE f."memoId"=m.id) AND NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c."memoId"=m.id)
UNION ALL SELECT 'link not referenced', count(*) FROM link l WHERE NOT EXISTS (SELECT 1 FROM callout_framing f WHERE f."linkId"=l.id) AND NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c."linkId"=l.id)
UNION ALL SELECT 'calendar_event without calendar', count(*) FROM calendar_event WHERE "calendarId" IS NULL
UNION ALL SELECT 'license_entitlement without license', count(*) FROM license_entitlement WHERE "licenseId" IS NULL
UNION ALL SELECT 'license not owned (space/account/role_set/collaboration)', count(*) FROM license l WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM account a WHERE a."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM role_set r WHERE r."licenseId"=l.id) AND NOT EXISTS (SELECT 1 FROM collaboration c WHERE c."licenseId"=l.id);
\echo ===H room types
SELECT type, count(*), count(*) FILTER (WHERE "messagesCount"=0) AS empty_rooms FROM room GROUP BY 1 ORDER BY 2 DESC;
\echo ===H lifecycle state formats
SELECT kind, fmt, value, count(*) FROM (
 SELECT 'invitation' AS kind, CASE WHEN l."machineState" IS NULL OR l."machineState" IN ('','null','{}') THEN 'empty' WHEN l."machineState" LIKE '{%' AND l."machineState"::jsonb ? 'status' THEN 'xstate5' WHEN l."machineState" LIKE '{%' AND l."machineState"::jsonb ? '_event' THEN 'xstate4-legacy' ELSE 'other' END AS fmt, CASE WHEN l."machineState" LIKE '{%' THEN l."machineState"::jsonb->>'value' END AS value FROM invitation i JOIN lifecycle l ON l.id=i."lifecycleId"
 UNION ALL SELECT 'application', CASE WHEN l."machineState" IS NULL OR l."machineState" IN ('','null','{}') THEN 'empty' WHEN l."machineState" LIKE '{%' AND l."machineState"::jsonb ? 'status' THEN 'xstate5' WHEN l."machineState" LIKE '{%' AND l."machineState"::jsonb ? '_event' THEN 'xstate4-legacy' ELSE 'other' END, CASE WHEN l."machineState" LIKE '{%' THEN l."machineState"::jsonb->>'value' END FROM application a JOIN lifecycle l ON l.id=a."lifecycleId"
) x GROUP BY 1,2,3 ORDER BY 1,2,4 DESC;
\echo ===H platform_invitation
SELECT "profileCreated", ("roleSetId" IS NOT NULL) AS has_roleset, count(*) FROM platform_invitation GROUP BY 1,2;
