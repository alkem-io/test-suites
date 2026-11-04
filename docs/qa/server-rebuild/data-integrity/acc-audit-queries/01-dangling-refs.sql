\pset footer off
\echo ===A dangling references in columns without FK constraints
SELECT 'space.levelZeroSpaceID -> space' AS chk, count(*) FROM space s WHERE s."levelZeroSpaceID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM space z WHERE z.id=s."levelZeroSpaceID")
UNION ALL SELECT 'space.levelZeroSpaceID null', count(*) FROM space WHERE "levelZeroSpaceID" IS NULL
UNION ALL SELECT 'organization.accountID -> account', count(*) FROM organization o WHERE o."accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id=o."accountID")
UNION ALL SELECT 'organization.accountID null', count(*) FROM organization WHERE "accountID" IS NULL
UNION ALL SELECT 'user.accountID -> account', count(*) FROM "user" u WHERE u."accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id=u."accountID")
UNION ALL SELECT 'user.accountID null', count(*) FROM "user" WHERE "accountID" IS NULL
UNION ALL SELECT 'user.authenticationID null', count(*) FROM "user" WHERE "authenticationID" IS NULL
UNION ALL SELECT 'virtual_contributor.aiPersonaID -> ai_persona', count(*) FROM virtual_contributor v WHERE v."aiPersonaID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ai_persona p WHERE p.id=v."aiPersonaID")
UNION ALL SELECT 'virtual_contributor.aiPersonaID null', count(*) FROM virtual_contributor WHERE "aiPersonaID" IS NULL
UNION ALL SELECT 'ai_persona not referenced by any VC', count(*) FROM ai_persona p WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v."aiPersonaID"=p.id)
UNION ALL SELECT 'innovation_flow.currentStateID -> innovation_flow_state', count(*) FROM innovation_flow f WHERE f."currentStateID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM innovation_flow_state st WHERE st.id=f."currentStateID")
UNION ALL SELECT 'innovation_flow.currentStateID null', count(*) FROM innovation_flow WHERE "currentStateID" IS NULL
UNION ALL SELECT 'innovation_flow.currentState belongs to other flow', count(*) FROM innovation_flow f JOIN innovation_flow_state st ON st.id=f."currentStateID" WHERE st."innovationFlowId"<>f.id
UNION ALL SELECT 'in_app_notification.triggeredByID -> actor', count(*) FROM in_app_notification n WHERE n."triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=n."triggeredByID")
UNION ALL SELECT 'in_app_notification.receiverID -> user', count(*) FROM in_app_notification n WHERE n."receiverID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=n."receiverID"::text)
UNION ALL SELECT 'mcp_api_key.userId -> user', count(*) FROM mcp_api_key k WHERE k."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=k."userId")
UNION ALL SELECT 'mcp_api_key.actorId -> actor', count(*) FROM mcp_api_key k WHERE k."actorId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=k."actorId")
UNION ALL SELECT 'platform_audit_entry.initiatorUserId -> user (deleted users)', count(*) FROM platform_audit_entry e WHERE e."initiatorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=e."initiatorUserId")
UNION ALL SELECT 'community.parentID -> community', count(*) FROM community c WHERE c."parentID" IS NOT NULL AND c."parentID"<>'' AND NOT EXISTS (SELECT 1 FROM community p WHERE p.id::text=c."parentID")
UNION ALL SELECT 'community.parentID empty string', count(*) FROM community WHERE "parentID"=''
UNION ALL SELECT 'communication.spaceID empty', count(*) FROM communication WHERE "spaceID" IS NULL OR "spaceID"=''
UNION ALL SELECT 'communication.spaceID -> space (nonexistent)', count(*) FROM communication c WHERE c."spaceID"<>'' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."spaceID")
UNION ALL SELECT 'communication.spaceID != owning space', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN communication m ON m.id=c."communicationId" WHERE m."spaceID"<>s.id::text
UNION ALL SELECT 'activity.collaborationID -> collaboration', count(*) FROM activity a WHERE NOT EXISTS (SELECT 1 FROM collaboration c WHERE c.id=a."collaborationID")
UNION ALL SELECT 'activity.triggeredBy -> actor', count(*) FROM activity a WHERE a."triggeredBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor x WHERE x.id::text=a."triggeredBy"::text)
UNION ALL SELECT 'organization_verification.organizationID -> organization', count(*) FROM organization_verification v WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o.id::text=v."organizationID")
UNION ALL SELECT 'organization_verification not linked from any org', count(*) FROM organization_verification v WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o."verificationId"=v.id)
UNION ALL SELECT 'file_backup_outbox.fileId -> file', count(*) FROM file_backup_outbox b WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id=b."fileId")
UNION ALL SELECT 'callout.createdBy -> user (deleted)', count(*) FROM callout c WHERE c."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=c."createdBy"::text)
UNION ALL SELECT 'callout_contribution.createdBy -> actor (deleted)', count(*) FROM callout_contribution c WHERE c."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor u WHERE u.id::text=c."createdBy"::text)
UNION ALL SELECT 'invitation.createdBy -> user (deleted)', count(*) FROM invitation i WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=i."createdBy"::text)
UNION ALL SELECT 'platform_invitation.createdBy -> user (deleted)', count(*) FROM platform_invitation i WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=i."createdBy"::text)
UNION ALL SELECT 'file.createdBy -> actor (deleted)', count(*) FROM file f WHERE f."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor u WHERE u.id::text=f."createdBy"::text)
UNION ALL SELECT 'template_default.templateId -> template', count(*) FROM template_default d WHERE d."templateId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template t WHERE t.id=d."templateId")
UNION ALL SELECT 'user_settings.homeSpace -> space (nonexistent)', count(*) FROM user_settings s WHERE s."homeSpace" IS NOT NULL AND s."homeSpace"::text NOT IN ('', 'null') AND NOT EXISTS (SELECT 1 FROM space z WHERE z.id::text = trim(both '"' from s."homeSpace"::text));
