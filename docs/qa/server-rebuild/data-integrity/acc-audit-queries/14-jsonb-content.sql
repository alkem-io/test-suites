\pset footer off
\echo ===M user_settings payload shapes
SELECT 'notification keys: '||k AS chk, count(*) FROM user_settings, jsonb_object_keys(notification) k GROUP BY k
UNION ALL SELECT 'notification key-count '||(SELECT count(*) FROM jsonb_object_keys(notification)), count(*) FROM user_settings GROUP BY 1
UNION ALL SELECT 'communication keys: '||k, count(*) FROM user_settings, jsonb_object_keys(communication) k GROUP BY k
UNION ALL SELECT 'privacy keys: '||k, count(*) FROM user_settings, jsonb_object_keys(privacy) k GROUP BY k
UNION ALL SELECT 'dashboard keys: '||k, count(*) FROM user_settings, jsonb_object_keys(dashboard) k GROUP BY k
UNION ALL SELECT 'assistant keys: '||k, count(*) FROM user_settings, jsonb_object_keys(assistant) k GROUP BY k
UNION ALL SELECT 'homeSpace.spaceID set', count(*) FROM user_settings WHERE coalesce("homeSpace"->>'spaceID','')<>''
UNION ALL SELECT 'homeSpace.spaceID -> missing space', count(*) FROM user_settings WHERE coalesce("homeSpace"->>'spaceID','')<>'' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text="homeSpace"->>'spaceID')
UNION ALL SELECT 'homeSpace set but user not a member of it', count(*) FROM user_settings us JOIN "user" u ON u."settingsId"=us.id WHERE coalesce("homeSpace"->>'spaceID','')<>'' AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type IN ('space-member','space-admin','space-lead') AND c."resourceID"="homeSpace"->>'spaceID')
UNION ALL SELECT 'language values: '||coalesce(language,'<null>'), count(*) FROM user_settings GROUP BY language;
\echo ===M notification settings: leaf value types and nulls
SELECT k1, jsonb_typeof(v1) AS t, count(*) FROM user_settings, jsonb_each(notification) e(k1,v1) GROUP BY 1,2 ORDER BY 1,2;
\echo ===M space / org / platform settings
SELECT 'space privacy.mode: '||(settings->'privacy'->>'mode') AS chk, count(*) FROM space GROUP BY 1
UNION ALL SELECT 'space membership.policy: '||(settings->'membership'->>'policy'), count(*) FROM space GROUP BY 1
UNION ALL SELECT 'space membership keys: '||k, count(*) FROM space, jsonb_object_keys(settings->'membership') k GROUP BY k
UNION ALL SELECT 'space privacy keys: '||k, count(*) FROM space, jsonb_object_keys(settings->'privacy') k GROUP BY k
UNION ALL SELECT 'space collaboration keys: '||k, count(*) FROM space, jsonb_object_keys(settings->'collaboration') k GROUP BY k
UNION ALL SELECT 'space layout keys: '||k, count(*) FROM space, jsonb_object_keys(settings->'layout') k GROUP BY k
UNION ALL SELECT 'space membership.trustedOrganizations -> missing org', count(*) FROM space s, jsonb_array_elements_text(coalesce(s.settings->'membership'->'trustedOrganizations','[]'::jsonb)) o WHERE NOT EXISTS (SELECT 1 FROM organization org WHERE org.id::text=o)
UNION ALL SELECT 'space membership.trustedOrganizations non-empty', count(*) FROM space WHERE jsonb_array_length(coalesce(settings->'membership'->'trustedOrganizations','[]'::jsonb))>0
UNION ALL SELECT 'space platformRolesAccess typeof '||jsonb_typeof("platformRolesAccess"), count(*) FROM space GROUP BY 1
UNION ALL SELECT 'space platformRolesAccess top keys: '||k, count(*) FROM space, jsonb_object_keys(CASE WHEN jsonb_typeof("platformRolesAccess")='object' THEN "platformRolesAccess" ELSE '{}'::jsonb END) k GROUP BY k
UNION ALL SELECT 'space sortOrder duplicates among siblings', count(*) FROM (SELECT "parentSpaceId","sortOrder" FROM space WHERE "parentSpaceId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'org settings keys: '||k, count(*) FROM organization, jsonb_object_keys(settings) k GROUP BY k
UNION ALL SELECT 'org settings empty', count(*) FROM organization WHERE settings='{}'::jsonb
UNION ALL SELECT 'org domain empty', count(*) FROM organization WHERE domain IS NULL OR domain=''
UNION ALL SELECT 'org legalEntityName empty', count(*) FROM organization WHERE "legalEntityName" IS NULL OR "legalEntityName"=''
UNION ALL SELECT 'platform wellKnownVirtualContributors -> missing VC', count(*) FROM platform p, jsonb_each_text(coalesce(p."wellKnownVirtualContributors",'{}'::jsonb)) e WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=e.value)
UNION ALL SELECT 'platform settings keys: '||k, count(*) FROM platform, jsonb_object_keys(settings) k GROUP BY k
UNION ALL SELECT 'account baselineLicensePlan typeof '||jsonb_typeof("baselineLicensePlan"), count(*) FROM account GROUP BY 1
UNION ALL SELECT 'vc settings keys: '||k, count(*) FROM virtual_contributor, jsonb_object_keys(settings) k GROUP BY k
UNION ALL SELECT 'vc platformSettings keys: '||k, count(*) FROM virtual_contributor, jsonb_object_keys("platformSettings") k GROUP BY k
UNION ALL SELECT 'vc searchVisibility: '||coalesce("searchVisibility"::text,'<null>'), count(*) FROM virtual_contributor GROUP BY 1
UNION ALL SELECT 'vc listedInStore but not public', count(*) FROM virtual_contributor WHERE "listedInStore"=true AND "searchVisibility"::text<>'public';
\echo ===M role policy sanity
SELECT 'role policy max < min (user)' AS chk, count(*) FROM role WHERE ("userPolicy"->>'maximum')::int>=0 AND ("userPolicy"->>'maximum')::int<("userPolicy"->>'minimum')::int
UNION ALL SELECT 'role policy max < min (org)', count(*) FROM role WHERE ("organizationPolicy"->>'maximum')::int>=0 AND ("organizationPolicy"->>'maximum')::int<("organizationPolicy"->>'minimum')::int
UNION ALL SELECT 'space lead count > role max (users)', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='lead' WHERE ("userPolicy"->>'maximum')::int>=0 AND (SELECT count(*) FROM credential cr JOIN actor a ON a.id=cr."actorId" AND a.type='user' WHERE cr.type='space-lead' AND cr."resourceID"=s.id::text)>("userPolicy"->>'maximum')::int
UNION ALL SELECT 'space lead count > role max (orgs)', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name='lead' WHERE ("organizationPolicy"->>'maximum')::int>=0 AND (SELECT count(*) FROM credential cr JOIN actor a ON a.id=cr."actorId" AND a.type='organization' WHERE cr.type='space-lead' AND cr."resourceID"=s.id::text)>("organizationPolicy"->>'maximum')::int
UNION ALL SELECT 'org admin/owner held by non-user actor', count(*) FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type IN ('organization-owner','organization-admin') AND a.type<>'user'
UNION ALL SELECT 'VC holding lead/admin', count(*) FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type IN ('space-lead','space-admin') AND a.type='virtual-contributor'
UNION ALL SELECT 'org holding space-admin (policy max 0)', count(*) FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type='space-admin' AND a.type='organization'
UNION ALL SELECT 'space with zero admins AND zero leads (users)', count(*) FROM space s WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text)
UNION ALL SELECT 'L0 space with zero members', count(*) FROM space s WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='space-member' AND c."resourceID"=s.id::text)
UNION ALL SELECT 'L0 space whose account host is not a member', count(*) FROM space s JOIN account ac ON ac.id=s."accountId" LEFT JOIN "user" u ON u."accountID"=ac.id LEFT JOIN organization o ON o."accountID"=ac.id WHERE s.level=0 AND coalesce(u.id,o.id) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='space-member' AND c."resourceID"=s.id::text AND c."actorId"=coalesce(u.id,o.id));
\echo ===M callouts, classification, flow states
SELECT 'callout framing keys: '||k AS chk, count(*) FROM callout, jsonb_object_keys(settings->'framing') k GROUP BY k
UNION ALL SELECT 'callout contribution keys: '||k, count(*) FROM callout, jsonb_object_keys(settings->'contribution') k GROUP BY k
UNION ALL SELECT 'callout visibility: '||(settings->>'visibility'), count(*) FROM callout GROUP BY 1
UNION ALL SELECT 'callout published without publishedDate', count(*) FROM callout WHERE settings->>'visibility'='published' AND "publishedDate" IS NULL
UNION ALL SELECT 'callout draft with publishedDate', count(*) FROM callout WHERE settings->>'visibility'='draft' AND "publishedDate" IS NOT NULL
UNION ALL SELECT 'callout sortOrder duplicates within set', count(*) FROM (SELECT "calloutsSetId","sortOrder" FROM callout WHERE "calloutsSetId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'callout flow-state tag not among its flow states', count(*) FROM callout c JOIN classification cl ON cl.id=c."classificationId" JOIN tagset t ON t."classificationId"=cl.id AND t.name='flow-state' JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id, unnest(string_to_array(t.tags,',')) tag WHERE tag<>'' AND NOT EXISTS (SELECT 1 FROM innovation_flow_state st WHERE st."innovationFlowId"=col."innovationFlowId" AND st."displayName"=tag)
UNION ALL SELECT 'callout in a space collaboration with no flow-state tag', count(*) FROM callout c JOIN callouts_set cs ON cs.id=c."calloutsSetId" JOIN collaboration col ON col."calloutsSetId"=cs.id JOIN space s ON s."collaborationId"=col.id WHERE NOT EXISTS (SELECT 1 FROM classification cl JOIN tagset t ON t."classificationId"=cl.id AND t.name='flow-state' AND t.tags<>'' WHERE cl.id=c."classificationId")
UNION ALL SELECT 'innovation_flow_state duplicate displayName within flow', count(*) FROM (SELECT "innovationFlowId","displayName" FROM innovation_flow_state GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'innovation_flow_state sortOrder duplicates within flow', count(*) FROM (SELECT "innovationFlowId","sortOrder" FROM innovation_flow_state GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'innovation_flow with >8 states', count(*) FROM innovation_flow f WHERE (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id)>8
UNION ALL SELECT 'classification_entry selectedValueIDs not in valueSet', count(*) FROM classification_entry ce, jsonb_array_elements_text(coalesce(ce."selectedValueIDs",'[]'::jsonb)) v WHERE NOT (ce."valueSet"::text LIKE '%'||v||'%')
UNION ALL SELECT 'tagset with tags but allowedValues violated', count(*) FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId" WHERE tt."allowedValues" IS NOT NULL AND tt."allowedValues"<>'' AND t.tags<>'' AND EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags,',')) x WHERE x<>'' AND NOT (','||tt."allowedValues"||',' LIKE '%,'||x||',%'))
UNION ALL SELECT 'tagset duplicate name within profile', count(*) FROM (SELECT "profileId",name FROM tagset WHERE "profileId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'poll votes referencing non-existent option', count(*) FROM poll_vote pv, jsonb_array_elements_text(pv."selectedOptionIds") o WHERE NOT EXISTS (SELECT 1 FROM poll_option po WHERE po.id::text=o)
UNION ALL SELECT 'calendar_event end before start', count(*) FROM calendar_event WHERE "startDate" IS NOT NULL AND "durationMinutes" IS NOT NULL AND "durationMinutes"<0
UNION ALL SELECT 'callout_form_response without form', count(*) FROM callout_form_response r WHERE NOT EXISTS (SELECT 1 FROM callout_form f WHERE f.id=r."formId")
UNION ALL SELECT 'template_default pointing to template of another templates set', count(*) FROM template_default d JOIN template t ON t.id=d."templateId" JOIN templates_manager m ON m.id=d."templatesManagerId" WHERE t."templatesSetId"<>m."templatesSetId" AND NOT EXISTS (SELECT 1 FROM platform p WHERE p."templatesManagerId"=m.id)
UNION ALL SELECT 'template_content_space level>0 without parent', count(*) FROM template_content_space WHERE level>0 AND "parentSpaceId" IS NULL
UNION ALL SELECT 'template_content_space settings missing privacy', count(*) FROM template_content_space WHERE settings->'privacy' IS NULL;
\echo ===M visuals, references, files, locations
SELECT 'visual uri empty' AS chk, count(*) FROM visual WHERE uri IS NULL OR uri=''
UNION ALL SELECT 'visual uri -> storage document id that does not exist', count(*) FROM visual v WHERE v.uri LIKE '%/storage/document/%' AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text=substring(v.uri from '/storage/document/([0-9a-f-]{36})'))
UNION ALL SELECT 'visual uri external (not storage)', count(*) FROM visual WHERE uri<>'' AND uri NOT LIKE '%/storage/document/%'
UNION ALL SELECT 'visual duplicate name within profile', count(*) FROM (SELECT "profileId",name FROM visual WHERE "profileId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'reference uri empty', count(*) FROM reference WHERE uri IS NULL OR uri=''
UNION ALL SELECT 'reference uri -> storage document missing', count(*) FROM reference r WHERE r.uri LIKE '%/storage/document/%' AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text=substring(r.uri from '/storage/document/([0-9a-f-]{36})'))
UNION ALL SELECT 'link uri empty', count(*) FROM link WHERE uri IS NULL OR uri=''
UNION ALL SELECT 'file externalID duplicated across files', count(*) FROM (SELECT "externalID" FROM file WHERE "externalID"<>'' GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'file size 0', count(*) FROM file WHERE size=0
UNION ALL SELECT 'file mimeType empty', count(*) FROM file WHERE "mimeType" IS NULL OR "mimeType"=''
UNION ALL SELECT 'file not referenced by any visual/reference/link/markdown? (uri check visual+reference only)', count(*) FROM file f WHERE NOT EXISTS (SELECT 1 FROM visual v WHERE v.uri LIKE '%'||f.id::text||'%') AND NOT EXISTS (SELECT 1 FROM reference r WHERE r.uri LIKE '%'||f.id::text||'%') AND NOT EXISTS (SELECT 1 FROM link l WHERE l.uri LIKE '%'||f.id::text||'%')
UNION ALL SELECT 'location geoLocation typeof '||coalesce(jsonb_typeof("geoLocation"),'null'), count(*) FROM location GROUP BY 1
UNION ALL SELECT 'location with city but no geoLocation', count(*) FROM location WHERE coalesce(city,'')<>'' AND ("geoLocation" IS NULL OR "geoLocation"='{}'::jsonb OR "geoLocation"='null'::jsonb)
UNION ALL SELECT 'profile without location', count(*) FROM profile WHERE "locationId" IS NULL
UNION ALL SELECT 'profile without tagline/description/visuals (fully empty) by type user', count(*) FROM profile p WHERE p.type='user' AND coalesce(p.description,'')='' AND coalesce(p.tagline,'')='' AND NOT EXISTS (SELECT 1 FROM visual v WHERE v."profileId"=p.id AND v.uri<>'');
\echo ===M in-app notifications, audit, push
SELECT 'in_app_notification state: '||state AS chk, count(*) FROM in_app_notification GROUP BY state
UNION ALL SELECT 'in_app_notification category: '||category, count(*) FROM in_app_notification GROUP BY category
UNION ALL SELECT 'in_app_notification receiver deleted', count(*) FROM in_app_notification n WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=n."receiverID")
UNION ALL SELECT 'in_app_notification contributionID -> missing', count(*) FROM in_app_notification n WHERE n."contributionID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c.id=n."contributionID")
UNION ALL SELECT 'in_app_notification invitationID -> missing', count(*) FROM in_app_notification n WHERE n."invitationID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM invitation i WHERE i.id=n."invitationID")
UNION ALL SELECT 'in_app_notification applicationID -> missing', count(*) FROM in_app_notification n WHERE n."applicationID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM application a WHERE a.id=n."applicationID")
UNION ALL SELECT 'in_app_notification organizationID -> missing', count(*) FROM in_app_notification n WHERE n."organizationID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id=n."organizationID")
UNION ALL SELECT 'in_app_notification roomID -> missing', count(*) FROM in_app_notification n WHERE n."roomID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM room r WHERE r.id=n."roomID")
UNION ALL SELECT 'in_app_notification contributorActorId -> missing', count(*) FROM in_app_notification n WHERE n."contributorActorId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=n."contributorActorId")
UNION ALL SELECT 'push_subscription -> deleted user', count(*) FROM push_subscription p WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=p."userId")
UNION ALL SELECT 'platform_audit_entry subjectUserId -> deleted', count(*) FROM platform_audit_entry e WHERE e."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=e."subjectUserId")
UNION ALL SELECT 'platform_audit_entry subjectOrganizationId -> deleted', count(*) FROM platform_audit_entry e WHERE e."subjectOrganizationId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id=e."subjectOrganizationId")
UNION ALL SELECT 'mcp_api_key active but expired', count(*) FROM mcp_api_key WHERE "isActive"=true AND "expiresAt" IS NOT NULL AND "expiresAt"<now()
UNION ALL SELECT 'signing_attempt -> deleted actor', count(*) FROM signing_attempt s WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=s."actorId");
\echo ===M licences & entitlements
SELECT 'license_entitlement types: '||type AS chk, count(*) FROM license_entitlement GROUP BY type
UNION ALL SELECT 'license_entitlement duplicate type within license', count(*) FROM (SELECT "licenseId",type FROM license_entitlement GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'license with zero entitlements', count(*) FROM license l WHERE NOT EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId"=l.id)
UNION ALL SELECT 'space license type != space', count(*) FROM space s JOIN license l ON l.id=s."licenseId" WHERE l.type<>'space'
UNION ALL SELECT 'account license type != account', count(*) FROM account a JOIN license l ON l.id=a."licenseId" WHERE l.type<>'account'
UNION ALL SELECT 'entitlement enabled but limit 0 (space)', count(*) FROM license_entitlement e JOIN license l ON l.id=e."licenseId" WHERE l.type='space' AND e.enabled=true AND e."limit"=0
UNION ALL SELECT 'space-license-* credential type disagrees with entitlements? spaces holding plus/premium cred but no corresponding account plan credential', count(*) FROM space s JOIN credential c ON c."actorId"=s.id AND c.type IN ('space-license-plus','space-license-premium','space-license-enterprise') JOIN account ac ON ac.id=s."accountId" WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential a WHERE a."actorId"=ac.id AND a.type LIKE 'account-license-%')
UNION ALL SELECT 'license_plan rows', count(*) FROM license_plan
UNION ALL SELECT 'space-feature-* credential with no matching entitlement enabled', count(*) FROM space s JOIN credential c ON c."actorId"=s.id AND c.type LIKE 'space-feature-%' JOIN license l ON l.id=s."licenseId" WHERE NOT EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId"=l.id AND e.enabled=true AND e.type::text=c.type);
\echo ===M whiteboards & memos
SELECT 'whiteboard content empty' AS chk, count(*) FROM whiteboard WHERE content IS NULL OR content='' OR content='{}'
UNION ALL SELECT 'whiteboard content not JSON', count(*) FROM whiteboard WHERE content<>'' AND content NOT LIKE '{%'
UNION ALL SELECT 'whiteboard content > 1 MB', count(*) FROM whiteboard WHERE length(content)>1048576
UNION ALL SELECT 'whiteboard createdBy deleted', count(*) FROM whiteboard w WHERE w."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=w."createdBy"::text)
UNION ALL SELECT 'whiteboard content references storage document missing', count(*) FROM (SELECT DISTINCT w.id, m[1] AS fid FROM whiteboard w, regexp_matches(w.content, '/storage/document/([0-9a-f-]{36})', 'g') m) x WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text=x.fid)
UNION ALL SELECT 'memo content empty', count(*) FROM memo WHERE content IS NULL OR content=''
UNION ALL SELECT 'memo createdBy deleted', count(*) FROM memo m WHERE m."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=m."createdBy"::text)
UNION ALL SELECT 'post createdBy deleted', count(*) FROM post p WHERE p."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=p."createdBy"::text)
UNION ALL SELECT 'discussion createdBy deleted', count(*) FROM discussion d WHERE d."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=d."createdBy"::text)
UNION ALL SELECT 'collabora_document without file?', count(*) FROM collabora_document d WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id=d."fileId");
