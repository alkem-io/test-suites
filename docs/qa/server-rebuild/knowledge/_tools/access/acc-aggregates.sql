-- W1 access matrix — ACC aggregate dump of stored authorization policies and role definitions.
-- Read-only. Aggregate shapes and counts only; resourceIDs are reduced to the marker '@id' and no entity id is emitted.
-- Run per the recipe in data-integrity/acc-audit-queries/README.md (port-forward, psql -U synapse-db -d alkemio -f this-file).
-- Sections 5, 6b, 10 and 11 of the first run were corrected (space policies hang off the actor row; documents live in table file); the versions below are the corrected ones.

-- W1 access matrix — ACC aggregate dump of stored authorization policies and role definitions.
-- Read-only. Aggregate shapes and counts only; no entity ids are emitted (resourceIDs are reduced to the marker '@id').
\pset footer off
\echo === 1. policies per type
SELECT type, count(*) AS policies FROM authorization_policy GROUP BY type ORDER BY 2 DESC;

\echo === 2. distinct credential rules per policy type (rule-level shape: name | cascade | privileges | criteria types)
WITH rules AS (
  SELECT ap.type,
         r->>'name' AS name,
         coalesce((r->>'cascade')::boolean, true) AS cascade,
         (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) AS privileges,
         (SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type')
            FROM jsonb_array_elements(r->'criterias') c) AS criteria
  FROM authorization_policy ap, jsonb_array_elements(ap."credentialRules") r
)
SELECT type, name, cascade, privileges, criteria, count(*) AS rules
FROM rules GROUP BY 1,2,3,4,5 ORDER BY 1, 6 DESC;

\echo === 3. distinct privilege rules per policy type
WITH prules AS (
  SELECT ap.type, r->>'name' AS name, r->>'sourcePrivilege' AS source,
         (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) AS granted
  FROM authorization_policy ap, jsonb_array_elements(ap."privilegeRules") r
)
SELECT type, name, source, granted, count(*) FROM prules GROUP BY 1,2,3,4 ORDER BY 1, 5 DESC;

\echo === 4. policy-level shapes per type: number of distinct full rule-lists, policies with no rules
WITH norm AS (
  SELECT ap.id, ap.type,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape
  FROM authorization_policy ap
)
SELECT type, count(*) AS policies, count(DISTINCT shape) AS distinct_shapes, count(*) FILTER (WHERE shape IS NULL) AS empty_rule_lists
FROM norm GROUP BY type ORDER BY 2 DESC;

\echo === 5. space policies by level x privacy x visibility: distinct shapes (top 4 per group)
WITH norm AS (
  SELECT s.level, s.settings->'privacy'->>'mode' AS privacy, s.visibility,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape
  FROM space s JOIN actor a ON a.id = s.id JOIN authorization_policy ap ON ap.id = a."authorizationId"
), g AS (
  SELECT level, privacy, visibility, shape, count(*) AS n,
         row_number() OVER (PARTITION BY level, privacy, visibility ORDER BY count(*) DESC) AS rn
  FROM norm GROUP BY 1,2,3,4
)
SELECT level, privacy, visibility, n, rn, shape FROM g WHERE rn <= 4 ORDER BY level, privacy, visibility, rn;

\echo === 5b. role-set policies by level x privacy x membership policy: distinct shapes (top 3 per group)
WITH norm AS (
  SELECT s.level, s.settings->'privacy'->>'mode' AS privacy, s.settings->'membership'->>'policy' AS membership,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape
  FROM space s JOIN community c ON c.id = s."communityId" JOIN role_set rs ON rs.id = c."roleSetId"
  JOIN authorization_policy ap ON ap.id = rs."authorizationId"
), g AS (
  SELECT level, privacy, membership, shape, count(*) AS n,
         row_number() OVER (PARTITION BY level, privacy, membership ORDER BY count(*) DESC) AS rn
  FROM norm GROUP BY 1,2,3,4
)
SELECT level, privacy, membership, n, rn, shape FROM g WHERE rn <= 3 ORDER BY level, privacy, membership, rn;

\echo === 5c. callouts-set policies by level x privacy x allowMembersToCreateCallouts: top 3 shapes
WITH norm AS (
  SELECT s.level, s.settings->'privacy'->>'mode' AS privacy, s.settings->'collaboration'->>'allowMembersToCreateCallouts' AS m_callouts,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape,
    (SELECT string_agg((r->>'sourcePrivilege') || '>' || (SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p), ' ;; ' ORDER BY r->>'sourcePrivilege') FROM jsonb_array_elements(ap."privilegeRules") r) AS pshape
  FROM space s JOIN collaboration co ON co.id = s."collaborationId" JOIN callouts_set cs ON cs.id = co."calloutsSetId"
  JOIN authorization_policy ap ON ap.id = cs."authorizationId"
), g AS (
  SELECT level, privacy, m_callouts, shape, pshape, count(*) AS n,
         row_number() OVER (PARTITION BY level, privacy, m_callouts ORDER BY count(*) DESC) AS rn
  FROM norm GROUP BY 1,2,3,4,5
)
SELECT level, privacy, m_callouts, n, rn, pshape, shape FROM g WHERE rn <= 3 ORDER BY level, privacy, m_callouts, rn;

\echo === 6b. subspace role parentCredentials consistency, as counts
SELECT s.level, r.name,
  jsonb_array_length(r."parentCredentials") AS n_parents,
  count(*) FILTER (WHERE coalesce(r.credential->>'resourceID','') = s.id::text) AS cred_is_own_space,
  count(*) FILTER (WHERE coalesce(r."parentCredentials"->0->>'resourceID','') = coalesce(ps.id::text,'')) AS p0_is_parent,
  count(*) FILTER (WHERE jsonb_array_length(r."parentCredentials")>1 AND coalesce(r."parentCredentials"->1->>'resourceID','') = coalesce(pps.id::text,'')) AS p1_is_grandparent,
  count(*) AS total
FROM space s
JOIN community c ON c.id = s."communityId"
JOIN role_set rs ON rs.id = c."roleSetId"
JOIN role r ON r."roleSetId" = rs.id
LEFT JOIN space ps ON ps.id = s."parentSpaceId"
LEFT JOIN space pps ON pps.id = ps."parentSpaceId"
GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo === 10. file (document) policies by owning profile type: top 3 shapes
WITH norm AS (
  SELECT p.type::text AS profile_type,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(x, ',' ORDER BY x) FROM jsonb_array_elements_text(r->'grantedPrivileges') x) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape
  FROM file d
  JOIN storage_bucket sb ON sb.id = d."storageBucketId"
  JOIN profile p ON p."storageBucketId" = sb.id
  JOIN authorization_policy ap ON ap.id = d."authorizationId"
), g AS (
  SELECT profile_type, shape, count(*) AS n, row_number() OVER (PARTITION BY profile_type ORDER BY count(*) DESC) rn FROM norm GROUP BY 1,2
)
SELECT profile_type, n, rn, shape FROM g WHERE rn <= 3 ORDER BY 1, 3;

\echo === 10b. storage-bucket policies by owning profile type: top 3 shapes
WITH norm AS (
  SELECT p.type::text AS profile_type,
    (SELECT string_agg(
        (r->>'name') || '|' || coalesce((r->>'cascade'),'true') || '|' ||
        (SELECT string_agg(x, ',' ORDER BY x) FROM jsonb_array_elements_text(r->'grantedPrivileges') x) || '|' ||
        coalesce((SELECT string_agg(c->>'type' || CASE WHEN coalesce(c->>'resourceID','')='' THEN '' ELSE '@id' END, ',' ORDER BY c->>'type') FROM jsonb_array_elements(r->'criterias') c),'')
        , ' ;; ' ORDER BY r->>'name')
     FROM jsonb_array_elements(ap."credentialRules") r) AS shape
  FROM profile p JOIN storage_bucket sb ON sb.id = p."storageBucketId"
  JOIN authorization_policy ap ON ap.id = sb."authorizationId"
), g AS (
  SELECT profile_type, shape, count(*) AS n, row_number() OVER (PARTITION BY profile_type ORDER BY count(*) DESC) rn FROM norm GROUP BY 1,2
)
SELECT profile_type, n, rn, shape FROM g WHERE rn <= 3 ORDER BY 1, 3;

\echo === 12. platform-support flag vs stored platformRolesAccess (L0)
SELECT level, settings->'privacy'->>'allowPlatformSupportAsAdmin' AS flag,
  (SELECT coalesce((SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p),'-') FROM jsonb_array_elements("platformRolesAccess"->'roles') r WHERE r->>'roleName'='platform-support') AS support_privs,
  count(*)
FROM space GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo === 6. role definitions: role-set type x role name x credential type x parent chain (types) x policies
SELECT rs.type AS roleset_type, r.name,
       r.credential->>'type' AS cred_type,
       CASE WHEN coalesce(r.credential->>'resourceID','')='' THEN 'none' ELSE 'id' END AS cred_resource,
       jsonb_array_length(r."parentCredentials") AS n_parents,
       coalesce((SELECT string_agg(p->>'type', '>' ORDER BY ord) FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS t(p, ord)),'') AS parent_types,
       r."requiresEntryRole", r."requiresSameRoleInParentRoleSet",
       r."userPolicy"::text AS user_policy, r."organizationPolicy"::text AS org_policy, r."virtualContributorPolicy"::text AS vc_policy,
       count(*)
FROM role r JOIN role_set rs ON rs.id = r."roleSetId"
GROUP BY 1,2,3,4,5,6,7,8,9,10,11 ORDER BY 1,2,12 DESC;


\echo === 7. space settings variants
SELECT level, visibility,
  settings->'privacy'->>'mode' AS privacy,
  settings->'membership'->>'policy' AS membership,
  settings->'privacy'->>'allowPlatformSupportAsAdmin' AS support_admin,
  settings->'membership'->>'allowSubspaceAdminsToInviteMembers' AS subadmins_invite,
  (jsonb_array_length(coalesce(settings->'membership'->'trustedOrganizations','[]'::jsonb))>0) AS has_trusted_orgs,
  settings->'collaboration'->>'inheritMembershipRights' AS inherit,
  settings->'collaboration'->>'allowMembersToCreateCallouts' AS m_callouts,
  settings->'collaboration'->>'allowMembersToCreateSubspaces' AS m_subspaces,
  settings->'collaboration'->>'allowGuestContributions' AS guests,
  count(*)
FROM space GROUP BY 1,2,3,4,5,6,7,8,9,10,11 ORDER BY 1,2,3,4,12 DESC;

\echo === 8. platformRolesAccess shapes per level
SELECT level, count(*),
  (SELECT string_agg((r->>'roleName') || ':' || coalesce((SELECT string_agg(p, ',' ORDER BY p) FROM jsonb_array_elements_text(r->'grantedPrivileges') p),'-'), ' ; ' ORDER BY r->>'roleName')
   FROM jsonb_array_elements(space."platformRolesAccess"->'roles') r) AS shape
FROM space GROUP BY 1,3 ORDER BY 1, 2 DESC;

\echo === 9. other settings dimensions
SELECT 'callout.visibility' AS dim, settings->>'visibility' AS value, count(*) FROM callout GROUP BY 2
UNION ALL SELECT 'callout.contribution.allowedTypes', (SELECT string_agg(t, ',' ORDER BY t) FROM jsonb_array_elements_text(settings->'contribution'->'allowedTypes') t), count(*) FROM callout GROUP BY 2
UNION ALL SELECT 'whiteboard.contentUpdatePolicy', "contentUpdatePolicy", count(*) FROM whiteboard GROUP BY 2
UNION ALL SELECT 'memo.contentUpdatePolicy', "contentUpdatePolicy", count(*) FROM memo GROUP BY 2
UNION ALL SELECT 'virtual_contributor.searchVisibility', "searchVisibility", count(*) FROM virtual_contributor GROUP BY 2
UNION ALL SELECT 'account.account_type', account_type, count(*) FROM account GROUP BY 2
UNION ALL SELECT 'discussion.privacy', privacy, count(*) FROM discussion GROUP BY 2
UNION ALL SELECT 'role_set.type', type, count(*) FROM role_set GROUP BY 2
UNION ALL SELECT 'profile.type', type::text, count(*) FROM profile GROUP BY 2
ORDER BY 1, 3 DESC;


\echo === 13. stale policies: per type, policies whose credentialRules mention a credential type that no longer exists in code (pre-027 Slice B), vs total
WITH legacy AS (
  SELECT ap.type, ap.id,
    bool_or((c->>'type') IN ('global-admin','global-support','global-community-read','global-spaces-read','global-license-manager','global-platform-manager','global-support-manager','account-host','beta-tester','vc-campaign','assistant-access','global-spaces-reader','global-community-reader')) AS has_legacy,
    bool_or((c->>'type') LIKE 'platform-%' OR (c->>'type') LIKE 'feature-%') AS has_new
  FROM authorization_policy ap
  LEFT JOIN LATERAL jsonb_array_elements(ap."credentialRules") r ON true
  LEFT JOIN LATERAL jsonb_array_elements(r->'criterias') c ON true
  GROUP BY ap.type, ap.id
)
SELECT type, count(*) AS policies,
  count(*) FILTER (WHERE has_legacy) AS with_legacy_creds,
  count(*) FILTER (WHERE has_new AND NOT has_legacy) AS new_only,
  count(*) FILTER (WHERE has_legacy AND has_new) AS mixed,
  count(*) FILTER (WHERE NOT coalesce(has_legacy,false) AND NOT coalesce(has_new,false)) AS neither
FROM legacy GROUP BY type ORDER BY 2 DESC;

\echo === 13b. legacy credential types still referenced, by type name
SELECT c->>'type' AS cred_type, count(*) AS rule_criteria
FROM authorization_policy ap, jsonb_array_elements(ap."credentialRules") r, jsonb_array_elements(r->'criterias') c
WHERE (c->>'type') NOT IN ('global-anonymous','global-guest','global-registered','platform-operations-admin','platform-roles-admin','platform-content-full-access','platform-resource-admin','platform-settings-admin','platform-users-admin','platform-support','platform-license-manager','platform-spaces-reader','platform-audit-reader','feature-beta-tester','feature-virtual-assistant','feature-organization-creator','feature-vc-campaign','user-self','account-admin','space-admin','space-member','space-lead','space-subspace-admin','space-invitee','organization-owner','organization-admin','organization-associate','user-group-member')
GROUP BY 1 ORDER BY 2 DESC;

\echo === 13c. credentials actually held by actors, by type (counts only)
SELECT type, count(*) FROM credential GROUP BY 1 ORDER BY 2 DESC;

\echo === 13d. space policies: stale vs fresh by level
WITH legacy AS (
  SELECT s.level, ap.id,
    bool_or((c->>'type') IN ('global-admin','global-support','global-community-read','global-spaces-read','global-license-manager','global-platform-manager','account-host')) AS has_legacy
  FROM space s JOIN actor a ON a.id = s.id JOIN authorization_policy ap ON ap.id = a."authorizationId"
  LEFT JOIN LATERAL jsonb_array_elements(ap."credentialRules") r ON true
  LEFT JOIN LATERAL jsonb_array_elements(r->'criterias') c ON true
  GROUP BY s.level, ap.id
)
SELECT level, count(*) AS spaces, count(*) FILTER (WHERE has_legacy) AS stale FROM legacy GROUP BY 1 ORDER BY 1;

\echo === 14. live entities whose policy still carries a pre-redesign credential (stale reset, not orphan)
WITH leg AS (
  SELECT ap.id, bool_or((c->>'type') IN ('global-admin','global-support','global-community-read','global-spaces-read','global-license-manager','global-platform-manager','account-host','beta-tester','global-admin-spaces','global-admin-community','challenge-member','challenge-admin','opportunity-member','opportunity-admin','global-admin-hubs','hub-admin','hub-member')) AS has_legacy
  FROM authorization_policy ap
  LEFT JOIN LATERAL jsonb_array_elements(ap."credentialRules") r ON true
  LEFT JOIN LATERAL jsonb_array_elements(r->'criterias') c ON true
  GROUP BY ap.id
)
SELECT 'file' AS entity, count(*) AS rows_with_policy, count(*) FILTER (WHERE l.has_legacy) AS stale FROM file f JOIN leg l ON l.id = f."authorizationId"
UNION ALL SELECT 'file by owner: '||p.type::text, count(*), count(*) FILTER (WHERE l.has_legacy) FROM file f JOIN leg l ON l.id = f."authorizationId" JOIN storage_bucket sb ON sb.id = f."storageBucketId" LEFT JOIN profile p ON p."storageBucketId" = sb.id GROUP BY p.type
UNION ALL SELECT 'room', count(*), count(*) FILTER (WHERE l.has_legacy) FROM room x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'tagset', count(*), count(*) FILTER (WHERE l.has_legacy) FROM tagset x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'visual', count(*), count(*) FILTER (WHERE l.has_legacy) FROM visual x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'reference', count(*), count(*) FILTER (WHERE l.has_legacy) FROM reference x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'classification', count(*), count(*) FILTER (WHERE l.has_legacy) FROM classification x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'innovation_flow', count(*), count(*) FILTER (WHERE l.has_legacy) FROM innovation_flow x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'innovation_flow_state', count(*), count(*) FILTER (WHERE l.has_legacy) FROM innovation_flow_state x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'community_guidelines', count(*), count(*) FILTER (WHERE l.has_legacy) FROM community_guidelines x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'template', count(*), count(*) FILTER (WHERE l.has_legacy) FROM template x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'storage_bucket', count(*), count(*) FILTER (WHERE l.has_legacy) FROM storage_bucket x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'profile', count(*), count(*) FILTER (WHERE l.has_legacy) FROM profile x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'callout', count(*), count(*) FILTER (WHERE l.has_legacy) FROM callout x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'callout_contribution', count(*), count(*) FILTER (WHERE l.has_legacy) FROM callout_contribution x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'actor (users/orgs/VCs/spaces/accounts)', count(*), count(*) FILTER (WHERE l.has_legacy) FROM actor x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'communication', count(*), count(*) FILTER (WHERE l.has_legacy) FROM communication x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'invitation', count(*), count(*) FILTER (WHERE l.has_legacy) FROM invitation x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'ai_persona', count(*), count(*) FILTER (WHERE l.has_legacy) FROM ai_persona x JOIN leg l ON l.id = x."authorizationId"
UNION ALL SELECT 'user_settings', count(*), count(*) FILTER (WHERE l.has_legacy) FROM user_settings x JOIN leg l ON l.id = x."authorizationId"
ORDER BY 1;

\echo === 15. entity rows vs policies of the matching type (type-lag check)
SELECT 'space_about rows' AS k, count(*) FROM space_about
UNION ALL SELECT 'space rows', count(*) FROM space
UNION ALL SELECT 'template rows', count(*) FROM template
UNION ALL SELECT 'template_content_space rows', count(*) FROM template_content_space
UNION ALL SELECT 'room rows', count(*) FROM room
UNION ALL SELECT 'file rows with policy', count(*) FROM file WHERE "authorizationId" IS NOT NULL
UNION ALL SELECT 'space_about policies typed space', count(*) FROM space_about sa JOIN authorization_policy ap ON ap.id = sa."authorizationId" WHERE ap.type = 'space'
UNION ALL SELECT 'template_content_space policies typed space', count(*) FROM template_content_space t JOIN authorization_policy ap ON ap.id = t."authorizationId" WHERE ap.type = 'space';

\echo === 16b. DIRECT storage buckets of spaces (storage_aggregator.directStorageId): the aggregator-appended anonymous read rule, by level and privacy, and the files in them
WITH b AS (
  SELECT s.level, s.settings->'privacy'->>'mode' AS privacy, sb.id AS bucket_id,
    EXISTS (SELECT 1 FROM jsonb_array_elements(ap."credentialRules") r WHERE r->>'name' = 'Anonymous agent granted ''read'' anonymous registered access') AS agg_anon_rule,
    EXISTS (SELECT 1 FROM jsonb_array_elements(ap."credentialRules") r, jsonb_array_elements(r->'criterias') c WHERE c->>'type'='global-anonymous' AND r->'grantedPrivileges' ? 'read') AS any_anon_read
  FROM space s JOIN storage_aggregator sa ON sa.id = s."storageAggregatorId" JOIN storage_bucket sb ON sb.id = sa."directStorageId"
  JOIN authorization_policy ap ON ap.id = sb."authorizationId"
)
SELECT level, privacy, count(*) AS direct_buckets, count(*) FILTER (WHERE agg_anon_rule) AS with_aggregator_anonymous_rule, count(*) FILTER (WHERE any_anon_read) AS with_any_anonymous_read,
  (SELECT count(*) FROM file f WHERE f."storageBucketId" IN (SELECT bucket_id FROM b b2 WHERE b2.level=b.level AND b2.privacy=b.privacy)) AS files_in_direct_buckets,
  (SELECT count(*) FROM file f JOIN authorization_policy fp ON fp.id = f."authorizationId" WHERE f."storageBucketId" IN (SELECT bucket_id FROM b b2 WHERE b2.level=b.level AND b2.privacy=b.privacy)
     AND EXISTS (SELECT 1 FROM jsonb_array_elements(fp."credentialRules") r, jsonb_array_elements(r->'criterias') c WHERE c->>'type'='global-anonymous' AND r->'grantedPrivileges' ? 'read')) AS files_anonymous_readable
FROM b GROUP BY 1,2 ORDER BY 1,2;
