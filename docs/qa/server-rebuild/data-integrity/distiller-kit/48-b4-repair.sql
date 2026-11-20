-- 48-b4-repair.sql: the B4 repair. R1 to R4 as QA proposes them; R5 and the phase names as the QA lead ruled on 2026-11-13.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state. Every statement carries its
-- own precondition, so a row that does not fit is left alone and stays flagged.
-- The target of every statement is the value the server writes today for that kind
-- of row (server develop 39d7aff38, 2026-11-10):
--   R1 policy type by the table that owns the policy
--        platform.invitation.service.ts:72  invitation
--        ai.persona.service.ts:46           ai-persona
--        template.default.service.ts:35     template-default
--        templates.manager.service.ts:39    templates-manager
--        templates.set.service.ts:43        templates-set
--   R2 role.set.service.ts:190      licence of a role set   roleset
--   R3 account.host.service.ts:57   aggregator of an account  account
--   R4 event.service.ts:66          comment room of a calendar event  calendar_event
--   R5 the server migration DropLegacyPlatformRoles (step 4) takes a retired role out of
--      a pending invitation and leaves the rest. It matches the long names only, so the
--      short spellings beta-tester and vc-campaign survived it. R5 is the same statement
--      for the two short spellings. It does NOT rename them to feature-*: the migration
--      AddFeatureVcCampaignRole says holders are never moved over automatically (FR-012).
--      The invitations are then tracked as case T7 for a hand decision.
--   Phase names with a comma are NOT repaired here. QA lead, 2026-11-13: they are left to
--      the space admins to rename, and the admins are informed (tracked case T8). An
--      earlier draft of this file renamed them (R6, comma to semicolon); that step was
--      taken out. Check 6 proves this file leaves phases, allowed values and callout
--      tags exactly as they were. The invitations of R5 are kept, never rejected
--      (QA lead, 2026-11-13, tracked case T7).
-- Rows with a value outside the list that have no owner (policies of the retired types
-- context and space-defaults, unowned template_default policies) are not touched here.
-- They belong to the reject set, guard B4 G7 proves it.
-- On production: R5 only after every line of B4 G12 was read. Counts in this file are
-- acceptance counts on the full copy. On a distilled copy R1 to R3 are lower by the rows
-- that were rejected (169, 3 and 6).
-- touches: authorization_policy,license,storage_aggregator,room,platform_invitation
\set ON_ERROR_STOP on
\pset footer off
\echo === B4 repair: images of the tables before the repair
CREATE TEMP TABLE rp_policy AS SELECT p.id, p.type, md5((to_jsonb(p) - 'type')::text) AS rest FROM authorization_policy p;
CREATE TEMP TABLE rp_license AS SELECT * FROM license;
CREATE TEMP TABLE rp_aggregator AS SELECT * FROM storage_aggregator;
CREATE TEMP TABLE rp_room AS SELECT * FROM room;
CREATE TEMP TABLE rp_pinv AS SELECT * FROM platform_invitation;
CREATE TEMP TABLE rp_state AS SELECT * FROM innovation_flow_state;
CREATE TEMP TABLE rp_tt AS SELECT * FROM tagset_template;
CREATE TEMP TABLE rp_tagset AS SELECT * FROM tagset;
CREATE INDEX ON rp_policy (id); CREATE INDEX ON rp_tagset (id);
ANALYZE rp_policy; ANALYZE rp_license; ANALYZE rp_aggregator; ANALYZE rp_room; ANALYZE rp_pinv; ANALYZE rp_state; ANALYZE rp_tt; ANALYZE rp_tagset;

\echo === R1: a policy takes the type of the table that owns it (expected on acceptance: UPDATE 28, 390, 239, 236, 1)
\echo ===     precondition: the stored value is the one known wrong spelling for that owner. Any other value is left alone and stays flagged.
UPDATE authorization_policy p SET type='invitation'        FROM platform_invitation t WHERE t."authorizationId"=p.id AND p.type='';
UPDATE authorization_policy p SET type='ai-persona'        FROM ai_persona t          WHERE t."authorizationId"=p.id AND p.type='ai-persona-service';
UPDATE authorization_policy p SET type='template-default'  FROM template_default t    WHERE t."authorizationId"=p.id AND p.type='template_default';
UPDATE authorization_policy p SET type='templates-manager' FROM templates_manager t   WHERE t."authorizationId"=p.id AND p.type='templates_manager';
UPDATE authorization_policy p SET type='templates-set'     FROM templates_set t       WHERE t."authorizationId"=p.id AND p.type='templates_set';

\echo === R2: the licence of a role set takes the type the server gives it (expected on acceptance: UPDATE 108)
UPDATE license l SET type='roleset' FROM role_set rs WHERE rs."licenseId"=l.id AND l.type='role-set';

\echo === R3: the storage aggregator of an account takes the type account (expected on acceptance: UPDATE 118)
\echo ===     precondition: no type at all, and no parent aggregator, as every typed account aggregator.
UPDATE storage_aggregator s SET type='account' FROM account a WHERE a."storageAggregatorId"=s.id AND s.type IS NULL AND s."parentStorageAggregatorId" IS NULL;

\echo === R4: the comment room of a calendar event takes the type calendar_event (expected on acceptance: UPDATE 5)
UPDATE room r SET type='calendar_event' FROM calendar_event e WHERE e."commentsId"=r.id AND r.type='';

\echo === R5: a platform invitation loses the retired role it names, its other roles stay (expected on acceptance: UPDATE 5)
\echo ===     precondition: only the two short spellings the server migration missed. Same statement as step 4 of DropLegacyPlatformRoles.
UPDATE platform_invitation p SET "roleSetExtraRoles" = array_to_string(ARRAY(
         SELECT role FROM unnest(string_to_array(p."roleSetExtraRoles", ',')) WITH ORDINALITY AS entry(role, ordinality)
          WHERE role <> ALL (ARRAY['beta-tester','vc-campaign']) ORDER BY ordinality), ',')
 WHERE string_to_array(p."roleSetExtraRoles", ',') && ARRAY['beta-tester','vc-campaign'];

\echo === check 1: the six B4 rules on the repaired state, every row. Policies left are the ones no table owns (1218 on acceptance: 951 context, 251 space-defaults, 16 template_default). phase_name_rule stays as it was (3 on acceptance): the names are left to the space admins, case T8. All others 0
SELECT (SELECT count(*) FROM authorization_policy WHERE type IS NULL OR type <> ALL (string_to_array('actor,callout,callouts-set,callout-contribution,callout-framing,collaboration,communication-conversation,communication-messaging,innovation-flow,innovation-flow-state,innovation-hub,innovation-pack,link,post,whiteboard,memo,media-gallery,knowledge-base,profile,classification,reference,tagset,visual,communication,room,ai-persona,ai-server,application,role-set,community,community-guidelines,invitation,forum,platform,discussion,user,user-group,user-settings,organization,organization-verification,virtual-contributor,virtual-assistant,space,space-about,account,document,storage-aggregator,storage-bucket,template,template-content-space,templates-set,templates-manager,template-default,poll,calendar,calendar-event,timeline,library,in-memory,licensing,license,license-policy,collabora-document,unknown', ','))) AS policy_rule,
       (SELECT count(*) FROM license WHERE type IS NULL OR type NOT IN ('account','space','whiteboard','roleset','collaboration','template_content_space')) AS licence_rule,
       (SELECT count(*) FROM storage_aggregator WHERE type IS NULL OR type NOT IN ('space','account','user','organization','platform','conversation')) AS aggregator_rule,
       (SELECT count(*) FROM room WHERE type IS NULL OR type NOT IN ('post','calendar_event','discussion_forum','updates','callout','conversation','conversation_direct','conversation_group')) AS room_rule,
       (SELECT count(*) FROM platform_invitation p WHERE EXISTS (SELECT 1 FROM unnest(string_to_array(p."roleSetExtraRoles", ',')) r WHERE r <> ALL (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ',')))) AS invitation_rule,
       (SELECT count(*) FROM innovation_flow_state WHERE "displayName" LIKE '%,%') AS phase_name_rule;

\echo === check 2: which columns changed, per table (expected: authorization_policy type 894, license type 108, storage_aggregator type 118, room type 5, platform_invitation roleSetExtraRoles 5, nothing else.
\echo ===     A line for innovation_flow_state, tagset_template or tagset would mean this file touched a phase, which it must not)
SELECT 'authorization_policy' tbl, 'type' col, count(*) changed_rows FROM rp_policy a JOIN authorization_policy b USING (id) WHERE a.type IS DISTINCT FROM b.type HAVING count(*)>0
UNION ALL SELECT 'authorization_policy', '(any other column)', count(*) FROM rp_policy a JOIN authorization_policy b USING (id) WHERE a.rest IS DISTINCT FROM md5((to_jsonb(b) - 'type')::text) HAVING count(*)>0
UNION ALL SELECT 'license', k.key, count(*) FROM rp_license a JOIN license b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'storage_aggregator', k.key, count(*) FROM rp_aggregator a JOIN storage_aggregator b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'room', k.key, count(*) FROM rp_room a JOIN room b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'platform_invitation', k.key, count(*) FROM rp_pinv a JOIN platform_invitation b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'innovation_flow_state', k.key, count(*) FROM rp_state a JOIN innovation_flow_state b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'tagset_template', k.key, count(*) FROM rp_tt a JOIN tagset_template b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'tagset', k.key, count(*) FROM rp_tagset a JOIN tagset b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
ORDER BY 1,2;

\echo === check 3: rows gone and rows new, per table (expected: 0 everywhere, the repair only changes values)
SELECT 'authorization_policy' tbl, (SELECT count(*) FROM rp_policy a WHERE NOT EXISTS (SELECT 1 FROM authorization_policy b WHERE b.id=a.id)) gone, (SELECT count(*) FROM authorization_policy b WHERE NOT EXISTS (SELECT 1 FROM rp_policy a WHERE a.id=b.id)) new_rows
UNION ALL SELECT 'license', (SELECT count(*) FROM rp_license a WHERE NOT EXISTS (SELECT 1 FROM license b WHERE b.id=a.id)), (SELECT count(*) FROM license b WHERE NOT EXISTS (SELECT 1 FROM rp_license a WHERE a.id=b.id))
UNION ALL SELECT 'storage_aggregator', (SELECT count(*) FROM rp_aggregator a WHERE NOT EXISTS (SELECT 1 FROM storage_aggregator b WHERE b.id=a.id)), (SELECT count(*) FROM storage_aggregator b WHERE NOT EXISTS (SELECT 1 FROM rp_aggregator a WHERE a.id=b.id))
UNION ALL SELECT 'room', (SELECT count(*) FROM rp_room a WHERE NOT EXISTS (SELECT 1 FROM room b WHERE b.id=a.id)), (SELECT count(*) FROM room b WHERE NOT EXISTS (SELECT 1 FROM rp_room a WHERE a.id=b.id))
UNION ALL SELECT 'platform_invitation', (SELECT count(*) FROM rp_pinv a WHERE NOT EXISTS (SELECT 1 FROM platform_invitation b WHERE b.id=a.id)), (SELECT count(*) FROM platform_invitation b WHERE NOT EXISTS (SELECT 1 FROM rp_pinv a WHERE a.id=b.id))
UNION ALL SELECT 'innovation_flow_state', (SELECT count(*) FROM rp_state a WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state b WHERE b.id=a.id)), (SELECT count(*) FROM innovation_flow_state b WHERE NOT EXISTS (SELECT 1 FROM rp_state a WHERE a.id=b.id))
UNION ALL SELECT 'tagset_template', (SELECT count(*) FROM rp_tt a WHERE NOT EXISTS (SELECT 1 FROM tagset_template b WHERE b.id=a.id)), (SELECT count(*) FROM tagset_template b WHERE NOT EXISTS (SELECT 1 FROM rp_tt a WHERE a.id=b.id))
UNION ALL SELECT 'tagset', (SELECT count(*) FROM rp_tagset a WHERE NOT EXISTS (SELECT 1 FROM tagset b WHERE b.id=a.id)), (SELECT count(*) FROM tagset b WHERE NOT EXISTS (SELECT 1 FROM rp_tagset a WHERE a.id=b.id));

\echo === check 4: every repaired row now carries the value of the rows of the same owner that were never broken
\echo ===     one line per owner and value after the repair. A line with repaired rows must also have rows the repair did not touch, and each owner must show one value only.
SELECT own AS owner, value_now, count(*) FILTER (WHERE repaired) AS repaired_rows, count(*) FILTER (WHERE NOT repaired) AS untouched_rows_same_value
  FROM (
    SELECT 'policy of platform_invitation' own, p.type value_now, (a.type IS DISTINCT FROM p.type) repaired FROM platform_invitation t JOIN authorization_policy p ON p.id=t."authorizationId" JOIN rp_policy a ON a.id=p.id
    UNION ALL SELECT 'policy of ai_persona', p.type, (a.type IS DISTINCT FROM p.type) FROM ai_persona t JOIN authorization_policy p ON p.id=t."authorizationId" JOIN rp_policy a ON a.id=p.id
    UNION ALL SELECT 'policy of template_default', p.type, (a.type IS DISTINCT FROM p.type) FROM template_default t JOIN authorization_policy p ON p.id=t."authorizationId" JOIN rp_policy a ON a.id=p.id
    UNION ALL SELECT 'policy of templates_manager', p.type, (a.type IS DISTINCT FROM p.type) FROM templates_manager t JOIN authorization_policy p ON p.id=t."authorizationId" JOIN rp_policy a ON a.id=p.id
    UNION ALL SELECT 'policy of templates_set', p.type, (a.type IS DISTINCT FROM p.type) FROM templates_set t JOIN authorization_policy p ON p.id=t."authorizationId" JOIN rp_policy a ON a.id=p.id
    UNION ALL SELECT 'licence of role_set', l.type, (a.type IS DISTINCT FROM l.type) FROM role_set t JOIN license l ON l.id=t."licenseId" JOIN rp_license a ON a.id=l.id
    UNION ALL SELECT 'aggregator of account', s.type, (a.type IS DISTINCT FROM s.type) FROM account t JOIN storage_aggregator s ON s.id=t."storageAggregatorId" JOIN rp_aggregator a ON a.id=s.id
    UNION ALL SELECT 'room of calendar_event', r.type, (a.type IS DISTINCT FROM r.type) FROM calendar_event t JOIN room r ON r.id=t."commentsId" JOIN rp_room a ON a.id=r.id
    UNION ALL SELECT 'platform invitation, roles named: ' || CASE WHEN p."roleSetExtraRoles"='' THEN 'none' ELSE 'some' END, '(role list)', (a."roleSetExtraRoles" IS DISTINCT FROM p."roleSetExtraRoles") FROM platform_invitation p JOIN rp_pinv a ON a.id=p.id
  ) x GROUP BY 1,2 ORDER BY 1,2;

\echo === check 5: the platform invitations after R5, by kind of role set. A repaired invitation names no role. No untouched invitation on the platform role set exists to compare it with, so its behaviour is not proven here (case T7)
SELECT rs.type AS role_set_kind, (p."roleSetExtraRoles"='') AS names_no_role, count(*) FILTER (WHERE a."roleSetExtraRoles" IS DISTINCT FROM p."roleSetExtraRoles") AS repaired_rows, count(*) FILTER (WHERE a."roleSetExtraRoles" IS NOT DISTINCT FROM p."roleSetExtraRoles") AS untouched_rows
  FROM platform_invitation p JOIN rp_pinv a ON a.id=p.id LEFT JOIN role_set rs ON rs.id=p."roleSetId" GROUP BY 1,2 ORDER BY 1,2;

\echo === check 6: phase names with a comma before and after this file (expected: the same number, 3 on acceptance, and 0 changed). They are tracked as case T8
SELECT (SELECT count(*) FROM rp_state WHERE "displayName" LIKE '%,%') AS before_the_repair,
       (SELECT count(*) FROM innovation_flow_state WHERE "displayName" LIKE '%,%') AS after_the_repair,
       (SELECT count(*) FROM rp_state a JOIN innovation_flow_state b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS phases_changed,
       (SELECT count(*) FROM rp_tt a JOIN tagset_template b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS tagset_templates_changed,
       (SELECT count(*) FROM rp_tagset a JOIN tagset b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS tagsets_changed;
\echo === B4 repair done
