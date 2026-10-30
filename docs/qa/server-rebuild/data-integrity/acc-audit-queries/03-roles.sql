\pset footer off
\echo ===C role / role_set integrity
SELECT 'role_set.type distribution: '||type AS chk, count(*) FROM role_set GROUP BY type
UNION ALL SELECT 'space community role_set missing', count(*) FROM space s LEFT JOIN community c ON c.id=s."communityId" WHERE c."roleSetId" IS NULL
UNION ALL SELECT 'space role_set without member/lead/admin', count(*) FROM space s JOIN community c ON c.id=s."communityId" WHERE (SELECT count(DISTINCT r.name) FROM role r WHERE r."roleSetId"=c."roleSetId" AND r.name IN ('member','lead','admin'))<3
UNION ALL SELECT 'space role_set with duplicate role names', count(*) FROM (SELECT "roleSetId",name FROM role GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'role.credential.resourceID != owning space', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" WHERE r.name IN ('member','lead','admin') AND r.credential->>'resourceID'<>s.id::text
UNION ALL SELECT 'role.credential.type mismatch for name', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" WHERE r.credential->>'type'<>'space-'||r.name
UNION ALL SELECT 'ADMIN parentCredentials contain space-member', count(*) FROM role r WHERE r.name='admin' AND EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-member')
UNION ALL SELECT 'parentCredentials type != own type (any role)', count(*) FROM role r WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'<>r.credential->>'type')
UNION ALL SELECT 'parentCredentials resourceID not an ancestor space', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId", jsonb_array_elements(r."parentCredentials") e WHERE e->>'resourceID' NOT IN (s."parentSpaceId"::text, s."levelZeroSpaceID"::text)
UNION ALL SELECT 'parentCredentials count != level', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" WHERE r.name IN ('member','lead','admin') AND jsonb_array_length(r."parentCredentials")<>s.level
UNION ALL SELECT 'L0 role_set with parentRoleSetId', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role_set rs ON rs.id=c."roleSetId" WHERE s.level=0 AND rs."parentRoleSetId" IS NOT NULL
UNION ALL SELECT 'subspace role_set without parentRoleSetId', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role_set rs ON rs.id=c."roleSetId" WHERE s.level>0 AND rs."parentRoleSetId" IS NULL
UNION ALL SELECT 'subspace parentRoleSetId != parent space role set', count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role_set rs ON rs.id=c."roleSetId" JOIN space p ON p.id=s."parentSpaceId" JOIN community pc ON pc.id=p."communityId" WHERE rs."parentRoleSetId"<>pc."roleSetId"
UNION ALL SELECT 'role_set.entryRoleName not member', count(*) FROM role_set WHERE "entryRoleName"<>'member'
UNION ALL SELECT 'role_set not owned by community or organization', count(*) FROM role_set rs WHERE NOT EXISTS (SELECT 1 FROM community c WHERE c."roleSetId"=rs.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."roleSetId"=rs.id)
UNION ALL SELECT 'org role_set without associate/admin/owner', count(*) FROM organization o WHERE (SELECT count(DISTINCT r.name) FROM role r WHERE r."roleSetId"=o."roleSetId")<3
UNION ALL SELECT 'role with roleSetId null', count(*) FROM role WHERE "roleSetId" IS NULL
UNION ALL SELECT 'role userPolicy malformed', count(*) FROM role WHERE NOT ("userPolicy" ? 'minimum' AND "userPolicy" ? 'maximum')
UNION ALL SELECT 'role_set.applicationFormId null (space)', count(*) FROM community c JOIN role_set rs ON rs.id=c."roleSetId" WHERE rs."applicationFormId" IS NULL;
\echo ===C role names present
SELECT name, count(*) FROM role GROUP BY 1 ORDER BY 2 DESC;
