-- 30-architect-classifier-reconstruction.sql
--
-- RECONSTRUCTION of the queries behind the architect's report
-- "Data issues found in the Alkemio acceptance database" (2026-11-04).
--
-- The architect's real rules live in the server-go repository,
-- specs/000-domain-model/ -> cmd/importer/classify/rules/<table>.sql
-- (develop 28e643dc1). That repository is not on this machine, so every
-- query below is rebuilt from (a) the rule NAMES and counts he published
-- per table, (b) the legacy ACC schema (00-schema.out, 2026-10-24) and
-- (c) the legacy server enums (server clone db6e9def6).
--
-- Each query carries the architect's expected ACC count as "arch=NNN".
-- A match confirms the reconstruction; a mismatch tells you where his rule
-- differs from the obvious reading. Run on the restored sealed archive:
--   psql -X -A -d alkemio -f 30-architect-classifier-reconstruction.sql
--
-- Layout
--   0  seed table + ownership edges (the classifier's data model)
--   1  direct orphan rules (91 in his set; the ~45 that fire on ACC)
--   2  fixpoint propagation -> dependants (his "8 rounds")
--   3  per-table classification (compare with his appendix)
--   4  bug-heritage rules (24)
--   5  section C censuses (valid-but-problematic)
\pset footer off
\set ON_ERROR_STOP on

-- ===================================================================
-- 0. seed table
-- ===================================================================
DROP TABLE IF EXISTS orphan;
CREATE TEMP TABLE orphan (tbl text NOT NULL, id text NOT NULL, rule text NOT NULL, round int NOT NULL DEFAULT 0, PRIMARY KEY (tbl, id));

-- ===================================================================
-- 1. DIRECT ORPHAN RULES  (round 0)
--    "a row is judged only by what the old code itself accepts": a row
--    is orphaned when the thing that owns it does not exist.
-- ===================================================================
\echo === 1 direct orphan rules

-- A1 agent-*-dropped-agent: the agent table was dropped, so every backup row
-- that names an agent is ownerless. arch: _agent_backup_account 503,
-- _organization 134, _space 1,420 (3 with NULL agentId counted valid),
-- _user 328, _virtual_contributor 269, _agent_table_backup 2,668
INSERT INTO orphan SELECT '_agent_backup_account', id::text, 'agent-backup-account-dropped-agent', 0 FROM _agent_backup_account WHERE "agentId" IS NOT NULL;
INSERT INTO orphan SELECT '_agent_backup_organization', id::text, 'agent-backup-organization-dropped-agent', 0 FROM _agent_backup_organization WHERE "agentId" IS NOT NULL;
INSERT INTO orphan SELECT '_agent_backup_space', id::text, 'agent-backup-space-dropped-agent', 0 FROM _agent_backup_space WHERE "agentId" IS NOT NULL;
INSERT INTO orphan SELECT '_agent_backup_user', id::text, 'agent-backup-user-dropped-agent', 0 FROM _agent_backup_user WHERE "agentId" IS NOT NULL;
INSERT INTO orphan SELECT '_agent_backup_virtual_contributor', id::text, 'agent-backup-virtual-contributor-dropped-agent', 0 FROM _agent_backup_virtual_contributor WHERE "agentId" IS NOT NULL;
INSERT INTO orphan SELECT '_agent_table_backup', id::text, 'agent-table-backup-dropped-agent', 0 FROM _agent_table_backup;

-- A2 account-unhosted  arch=43
-- An account is owned by the user or organization whose accountID names it.
-- (If this gives != 43 try the credential variant: no 'account-host' credential.)
INSERT INTO orphan SELECT 'account', a.id::text, 'account-unhosted', 0 FROM account a
 WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id)
   AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id);

-- A2 pre-delete guards (QA, 2026-11-09). Not part of the classification;
-- run before deleting the unhosted accounts on a live database.
-- (1) An externalSubscriptionID is the only pointer to a billing record
--     outside the database. Expect 0 rows; any hit must be reconciled with
--     the subscription provider before the account row goes.
\echo === A1 guards
\echo --- A1 G1: old agent ids from the backup tables that a live column still holds (expect none; a hit means the backup table is the only map for that data)
DROP TABLE IF EXISTS a1_old; DROP TABLE IF EXISTS a1_hit;
CREATE TEMP TABLE a1_old AS
  SELECT b.id::text AS old_id FROM _agent_table_backup b WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text = b.id::text);
CREATE INDEX ON a1_old(old_id);
CREATE TEMP TABLE a1_hit (tbl text, col text, rows_holding_an_old_agent_id bigint, distinct_old_ids bigint);
DO $$ DECLARE r record; n bigint; d bigint; BEGIN
  FOR r IN SELECT c.table_name, c.column_name FROM information_schema.columns c
             JOIN information_schema.tables t ON t.table_name=c.table_name AND t.table_schema=c.table_schema
            WHERE c.table_schema='public' AND t.table_type='BASE TABLE' AND c.table_name NOT LIKE '\_%'
              AND (c.data_type='uuid' OR (c.data_type IN ('character varying','character') AND (c.character_maximum_length=36 OR c.column_name ILIKE '%id'))) LOOP
    EXECUTE format('SELECT count(*), count(DISTINCT x.%I::text) FROM %I x WHERE EXISTS (SELECT 1 FROM a1_old o WHERE o.old_id = x.%I::text)',
                   r.column_name, r.table_name, r.column_name) INTO n, d;
    IF n > 0 THEN INSERT INTO a1_hit VALUES (r.table_name, r.column_name, n, d); END IF;
  END LOOP;
END $$;
SELECT (SELECT count(*) FROM a1_old) AS old_agent_ids_that_are_no_actor_today;
SELECT * FROM a1_hit ORDER BY 3 DESC;
\echo --- A1 G2: the same check inside stored JSON, the VC bindings of comment rooms (see C3 resolution; a hit means keep _agent_backup_virtual_contributor until the bindings are rewritten)
SELECT count(*) AS bindings_holding_an_old_agent_id, count(DISTINCT v->>'virtualContributorActorID') AS distinct_old_ids, count(DISTINCT r.id) AS rooms
  FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v)
 WHERE EXISTS (SELECT 1 FROM _agent_backup_virtual_contributor m WHERE m."agentId"::text = v->>'virtualContributorActorID');

\echo --- A2 guard 1: unhosted accounts carrying an external subscription id (expect 0)
SELECT a.id, a.account_type, a."baselineLicensePlan", a."externalSubscriptionID"
  FROM account a
 WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id)
   AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id)
   AND coalesce(a."externalSubscriptionID",'') <> '';
-- (2) The inverse defect: a user or organization that still exists but has
--     lost its account link (NULL, or pointing at an account that is gone).
--     That would be a half-finished deletion, not an orphan account. ACC
--     2026-11-09: 0 for both (checked by QA).
\echo --- A2 guard 2: users / organizations with no account or a dangling account link (expect 0)
SELECT 'user' kind, count(*) FILTER (WHERE "accountID" IS NULL) AS no_account,
       count(*) FILTER (WHERE "accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id="user"."accountID")) AS dangling
  FROM "user"
UNION ALL
SELECT 'organization', count(*) FILTER (WHERE "accountID" IS NULL),
       count(*) FILTER (WHERE "accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id=organization."accountID"))
  FROM organization;
-- (3) Belt and braces for "none hosts anything": anything still hosted by an
--     unhosted account would be live content with no owner path (expect 0).
\echo --- A2 guard 3: content still hosted by an unhosted account (expect 0)
WITH unhosted AS (
  SELECT a.id FROM account a
   WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id)
     AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id))
SELECT 'space' kind, count(*) FROM space WHERE "accountId" IN (SELECT id FROM unhosted)
UNION ALL SELECT 'innovation_pack', count(*) FROM innovation_pack WHERE "accountId" IN (SELECT id FROM unhosted)
UNION ALL SELECT 'innovation_hub', count(*) FROM innovation_hub WHERE "accountId" IN (SELECT id FROM unhosted)
UNION ALL SELECT 'virtual_contributor', count(*) FROM virtual_contributor WHERE "accountId" IN (SELECT id FROM unhosted)
UNION ALL SELECT 'credential account-%', count(*) FROM credential WHERE type LIKE 'account-%' AND "resourceID" IN (SELECT id::text FROM unhosted);
-- (4) Lost pointer: the rule license-unowned cannot tell "the owner is gone"
--     from "a live owner lost its licence pointer". Every account, space,
--     role set and collaboration gets a licence at creation, so each count
--     must be 0; a hit means one of the unowned licences may be that owner's
--     missing one and has to be matched by type and creation date first.
\echo --- A2 guard 4: live owners with an empty or dangling licence pointer (expect 0)
SELECT 'account' owner_table, count(*) FILTER (WHERE "licenseId" IS NULL) AS no_licence,
       count(*) FILTER (WHERE "licenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM license l WHERE l.id=account."licenseId")) AS dangling FROM account
UNION ALL SELECT 'space', count(*) FILTER (WHERE "licenseId" IS NULL),
       count(*) FILTER (WHERE "licenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM license l WHERE l.id=space."licenseId")) FROM space
UNION ALL SELECT 'role_set', count(*) FILTER (WHERE "licenseId" IS NULL),
       count(*) FILTER (WHERE "licenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM license l WHERE l.id=role_set."licenseId")) FROM role_set
UNION ALL SELECT 'collaboration', count(*) FILTER (WHERE "licenseId" IS NULL),
       count(*) FILTER (WHERE "licenseId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM license l WHERE l.id=collaboration."licenseId")) FROM collaboration;

-- A2 license-unowned  arch=12
INSERT INTO orphan SELECT 'license', l.id::text, 'license-unowned', 0 FROM license l
 WHERE NOT EXISTS (SELECT 1 FROM account x WHERE x."licenseId"=l.id)
   AND NOT EXISTS (SELECT 1 FROM space x WHERE x."licenseId"=l.id)
   AND NOT EXISTS (SELECT 1 FROM role_set x WHERE x."licenseId"=l.id)
   AND NOT EXISTS (SELECT 1 FROM collaboration x WHERE x."licenseId"=l.id);

-- A2 actor-cti-child-missing  arch=0 direct (53 as dependants)
-- class-table-inheritance: an actor row must have its concrete child row.
INSERT INTO orphan SELECT 'actor', a.id::text, 'actor-cti-child-missing', 0 FROM actor a
 WHERE NOT EXISTS (SELECT 1 FROM "user" x WHERE x.id=a.id)
   AND NOT EXISTS (SELECT 1 FROM organization x WHERE x.id=a.id)
   AND NOT EXISTS (SELECT 1 FROM virtual_contributor x WHERE x.id=a.id)
   AND NOT EXISTS (SELECT 1 FROM space x WHERE x.id=a.id)
   AND NOT EXISTS (SELECT 1 FROM account x WHERE x.id=a.id)
   AND NOT EXISTS (SELECT 1 FROM virtual_assistant x WHERE x.id=a.id);

-- A3 space structure  (22 tables; direct rules below, rest are dependants)
INSERT INTO orphan SELECT 'collaboration', c.id::text, 'collaboration-owner-missing', 0 FROM collaboration c          -- arch=3
 WHERE NOT EXISTS (SELECT 1 FROM space x WHERE x."collaborationId"=c.id)
   AND NOT EXISTS (SELECT 1 FROM template_content_space x WHERE x."collaborationId"=c.id);
INSERT INTO orphan SELECT 'community', c.id::text, 'community-space-missing', 0 FROM community c                    -- arch=3
 WHERE NOT EXISTS (SELECT 1 FROM space x WHERE x."communityId"=c.id);
INSERT INTO orphan SELECT 'communication', c.id::text, 'communication-community-missing', 0 FROM communication c    -- arch=20
 WHERE NOT EXISTS (SELECT 1 FROM community x WHERE x."communicationId"=c.id);
INSERT INTO orphan SELECT 'role_set', r.id::text, 'role-set-unowned', 0 FROM role_set r                             -- arch=17
 WHERE NOT EXISTS (SELECT 1 FROM community x WHERE x."roleSetId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM organization x WHERE x."roleSetId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM platform x WHERE x."roleSetId"=r.id);
INSERT INTO orphan SELECT 'innovation_flow', f.id::text, 'innovation_flow-collaboration-missing', 0 FROM innovation_flow f  -- arch=16
 WHERE NOT EXISTS (SELECT 1 FROM collaboration x WHERE x."innovationFlowId"=f.id);
INSERT INTO orphan SELECT 'innovation_flow_state', s.id::text, 'innovation_flow_state-flow-missing', 0 FROM innovation_flow_state s  -- arch=5
 WHERE s."innovationFlowId" IS NULL OR NOT EXISTS (SELECT 1 FROM innovation_flow x WHERE x.id=s."innovationFlowId");
-- template_content_space: a root content space is owned by its template; a
-- child content space by its parent content space.  arch=16
-- (the QA register's F4=310 counts every content space with no template,
--  i.e. it also counts the L1/L2 children that are owned via parentSpaceId)
INSERT INTO orphan SELECT 'template_content_space', t.id::text, 'template_content_space-owner-missing', 0 FROM template_content_space t
 WHERE (t."parentSpaceId" IS NULL AND NOT EXISTS (SELECT 1 FROM template x WHERE x."contentSpaceId"=t.id))
    OR (t."parentSpaceId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM template_content_space p WHERE p.id=t."parentSpaceId"));
INSERT INTO orphan SELECT 'templates_manager', m.id::text, 'templates_manager-owner-missing', 0 FROM templates_manager m  -- arch=11
 WHERE NOT EXISTS (SELECT 1 FROM space x WHERE x."templatesManagerId"=m.id)
   AND NOT EXISTS (SELECT 1 FROM platform x WHERE x."templatesManagerId"=m.id);
INSERT INTO orphan SELECT 'callouts_set', c.id::text, 'callouts_set-owner-missing', 0 FROM callouts_set c           -- arch=12
 WHERE NOT EXISTS (SELECT 1 FROM collaboration x WHERE x."calloutsSetId"=c.id)
   AND NOT EXISTS (SELECT 1 FROM knowledge_base x WHERE x."calloutsSetId"=c.id);
INSERT INTO orphan SELECT 'community_guidelines', g.id::text, 'community_guidelines-owner-missing', 0 FROM community_guidelines g  -- arch=17
 WHERE NOT EXISTS (SELECT 1 FROM space_about x WHERE x."guidelinesId"=g.id)
   AND NOT EXISTS (SELECT 1 FROM template x WHERE x."communityGuidelinesId"=g.id);
INSERT INTO orphan SELECT 'space_about', a.id::text, 'space_about-owner-missing', 0 FROM space_about a               -- arch=1
 WHERE NOT EXISTS (SELECT 1 FROM space x WHERE x."aboutId"=a.id)
   AND NOT EXISTS (SELECT 1 FROM template_content_space x WHERE x."aboutId"=a.id);

-- A4 classification + tag templates
INSERT INTO orphan SELECT 'classification', c.id::text, 'classification-owner-missing', 0 FROM classification c      -- arch=3,021
 WHERE NOT EXISTS (SELECT 1 FROM callout x WHERE x."classificationId"=c.id)
   AND NOT EXISTS (SELECT 1 FROM callout_contribution x WHERE x."classificationId"=c.id);
INSERT INTO orphan SELECT 'tagset_template_set', s.id::text, 'tagset_template_set-callouts_set-missing', 0 FROM tagset_template_set s  -- arch=548
 WHERE NOT EXISTS (SELECT 1 FROM callouts_set x WHERE x."tagsetTemplateSetId"=s.id);

-- A5 profile chain
-- arch=62. The QA register's F5=33 is lower because 06-orphans.sql also
-- requires the profile to have no CHILD (tagset/reference/visual); the
-- architect only asks whether an OWNER exists.
INSERT INTO orphan SELECT 'profile', p.id::text, 'profile-unowned', 0 FROM profile p
 WHERE NOT EXISTS (SELECT 1 FROM actor x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM calendar_event x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM collabora_document x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM community_guidelines x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM discussion x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM innovation_flow x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM innovation_hub x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM innovation_pack x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM knowledge_base x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM link x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM memo x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM post x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM space_about x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM template x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM user_group x WHERE x."profileId"=p.id)
   AND NOT EXISTS (SELECT 1 FROM whiteboard x WHERE x."profileId"=p.id);
INSERT INTO orphan SELECT 'location', l.id::text, 'location-profile-missing', 0 FROM location l                      -- arch=14
 WHERE NOT EXISTS (SELECT 1 FROM profile x WHERE x."locationId"=l.id);
INSERT INTO orphan SELECT 'tagset', t.id::text, 'tagset-owner-missing', 0 FROM tagset t                              -- arch=9
 WHERE t."profileId" IS NULL AND t."classificationId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM file x WHERE x."tagsetId"=t.id);
INSERT INTO orphan SELECT 'visual', v.id::text, 'visual-owner-missing', 0 FROM visual v                              -- arch=0 direct
 WHERE v."profileId" IS NULL AND v."mediaGalleryId" IS NULL;
INSERT INTO orphan SELECT 'reference', r.id::text, 'reference-profile-missing', 0 FROM reference r                   -- arch=0 direct
 WHERE r."profileId" IS NULL;

-- A6 storage / files / documents
INSERT INTO orphan SELECT 'file', f.id::text, 'file-no-bucket', 0 FROM file f WHERE f."storageBucketId" IS NULL;      -- arch=573
INSERT INTO orphan SELECT 'storage_bucket', b.id::text, 'storage-bucket-unowned', 0 FROM storage_bucket b            -- arch=840
 WHERE NOT EXISTS (SELECT 1 FROM profile x WHERE x."storageBucketId"=b.id)
   AND NOT EXISTS (SELECT 1 FROM media_gallery x WHERE x."storageBucketId"=b.id)
   AND NOT EXISTS (SELECT 1 FROM storage_aggregator x WHERE x."directStorageId"=b.id)
   -- the reserved Matrix media staging bucket (server migration 1782300000001,
   -- fixed seeded id): no profile, gallery or aggregator points at it by design.
   -- Synapse lands every media upload in it. Rejecting it breaks chat uploads.
   AND b.id <> '00000000-0000-4000-8000-000000000013';
INSERT INTO orphan SELECT 'storage_aggregator', s.id::text, 'storage-aggregator-unowned', 0 FROM storage_aggregator s  -- arch=42
 WHERE NOT EXISTS (SELECT 1 FROM account x WHERE x."storageAggregatorId"=s.id)
   AND NOT EXISTS (SELECT 1 FROM space x WHERE x."storageAggregatorId"=s.id)
   AND NOT EXISTS (SELECT 1 FROM "user" x WHERE x."storageAggregatorId"=s.id)
   AND NOT EXISTS (SELECT 1 FROM organization x WHERE x."storageAggregatorId"=s.id)
   AND NOT EXISTS (SELECT 1 FROM platform x WHERE x."storageAggregatorId"=s.id)
   AND NOT EXISTS (SELECT 1 FROM conversation x WHERE x."storageAggregatorId"=s.id);
INSERT INTO orphan SELECT 'media_gallery', g.id::text, 'media_gallery-framing-missing', 0 FROM media_gallery g        -- arch=40
 WHERE NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."mediaGalleryId"=g.id);
INSERT INTO orphan SELECT 'file_backup_outbox', o.id::text, 'file-backup-outbox-file-gone', 0 FROM file_backup_outbox o  -- arch=8
 WHERE NOT EXISTS (SELECT 1 FROM file x WHERE x.id=o."fileId");
INSERT INTO orphan SELECT 'whiteboard', w.id::text, 'whiteboard-owner-missing', 0 FROM whiteboard w                  -- arch=13
 WHERE NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."whiteboardId"=w.id)
   AND NOT EXISTS (SELECT 1 FROM callout_contribution x WHERE x."whiteboardId"=w.id)
   AND NOT EXISTS (SELECT 1 FROM template x WHERE x."whiteboardId"=w.id);
INSERT INTO orphan SELECT 'memo', m.id::text, 'memo-owner-missing', 0 FROM memo m                                    -- arch=6
 WHERE NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."memoId"=m.id)
   AND NOT EXISTS (SELECT 1 FROM callout_contribution x WHERE x."memoId"=m.id);
INSERT INTO orphan SELECT 'collabora_document', d.id::text, 'collabora_document-owner-missing', 0 FROM collabora_document d  -- arch=3
 WHERE NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."collaboraDocumentId"=d.id)
   AND NOT EXISTS (SELECT 1 FROM callout_contribution x WHERE x."collaboraDocumentId"=d.id);

-- A7 AI
INSERT INTO orphan SELECT 'ai_persona', p.id::text, 'ai-persona-no-virtual-contributor', 0 FROM ai_persona p         -- arch=159
 WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor x WHERE x."aiPersonaID"=p.id);
INSERT INTO orphan SELECT 'virtual_contributor', v.id::text,                                                         -- arch=10 (both rules)
       CASE WHEN v."accountId" IS NULL OR NOT EXISTS (SELECT 1 FROM account a WHERE a.id=v."accountId")
            THEN 'virtual-contributor-no-account' ELSE 'virtual-contributor-body-of-knowledge-gone' END, 0
  FROM virtual_contributor v
 WHERE v."accountId" IS NULL OR NOT EXISTS (SELECT 1 FROM account a WHERE a.id=v."accountId")
    OR (v."bodyOfKnowledgeType" IN ('alkemio-space','alkemio-knowledge-base')
        AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=v."bodyOfKnowledgeID")
        AND NOT EXISTS (SELECT 1 FROM knowledge_base k WHERE k.id::text=v."bodyOfKnowledgeID"));
INSERT INTO orphan SELECT 'knowledge_base', k.id::text, 'knowledge-base-no-virtual-contributor', 0 FROM knowledge_base k  -- arch=3
 WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor x WHERE x."knowledgeBaseId"=k.id);

-- A8 credentials  arch=171 (both rules together)
INSERT INTO orphan SELECT 'credential', c.id::text, 'credential-no-holder', 0 FROM credential c
 WHERE c."actorId" IS NULL OR NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=c."actorId");
INSERT INTO orphan SELECT 'credential', c.id::text, 'credential-scope-gone', 0 FROM credential c
 WHERE c."resourceID" IS NOT NULL AND c."resourceID"<>''
   AND ((c.type LIKE 'space-%'        AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID"))
     OR (c.type LIKE 'organization-%' AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id::text=c."resourceID"))
     OR (c.type LIKE 'account-%'      AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id::text=c."resourceID"))
     OR (c.type = 'user-self'         AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=c."resourceID")))
   -- 2026-11-12: an id that is some other actor is not gone. On acceptance this
   -- excludes 4 licence credentials of an old type that an account holds on an
   -- account id, and brings the direct count to the architect's 171. A8 G11 lists them.
   AND NOT EXISTS (SELECT 1 FROM actor x WHERE x.id::text=c."resourceID")
ON CONFLICT DO NOTHING;

-- A9 authorization-policy-unowned  arch=9,414 (951 of them type='context')
-- referrers = every column named authorizationId in the schema (+ parent links)
DROP TABLE IF EXISTS auth_ref;
CREATE TEMP TABLE auth_ref (id uuid);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%' LOOP
    EXECUTE format('INSERT INTO auth_ref SELECT %I FROM %I WHERE %I IS NOT NULL', 'authorizationId', r.table_name, 'authorizationId');
  END LOOP;
END $$;
INSERT INTO orphan SELECT 'authorization_policy', p.id::text, 'authorization-policy-unowned', 0 FROM authorization_policy p
 WHERE NOT EXISTS (SELECT 1 FROM auth_ref x WHERE x.id=p.id);

-- A10 activity / rooms / conversations
INSERT INTO orphan SELECT 'activity', a.id::text, 'activity-collaboration-missing', 0 FROM activity a               -- arch=911
 WHERE NOT EXISTS (SELECT 1 FROM collaboration c WHERE c.id=a."collaborationID");
INSERT INTO orphan SELECT 'room', r.id::text, 'room-owner-missing', 0 FROM room r                                    -- arch=21
 WHERE NOT EXISTS (SELECT 1 FROM callout x WHERE x."commentsId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM post x WHERE x."commentsId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM calendar_event x WHERE x."commentsId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM discussion x WHERE x."commentsId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM communication x WHERE x."updatesId"=r.id)
   AND NOT EXISTS (SELECT 1 FROM conversation x WHERE x."roomId"=r.id);
INSERT INTO orphan SELECT 'conversation', c.id::text, 'conversation-messaging-missing', 0 FROM conversation c        -- arch=5
 WHERE c."messagingId" IS NULL OR NOT EXISTS (SELECT 1 FROM messaging m WHERE m.id=c."messagingId");

-- A11 small leftovers
INSERT INTO orphan SELECT 'lifecycle', l.id::text, 'lifecycle-unowned', 0 FROM lifecycle l                           -- arch=85
 WHERE NOT EXISTS (SELECT 1 FROM application x WHERE x."lifecycleId"=l.id)
   AND NOT EXISTS (SELECT 1 FROM invitation x WHERE x."lifecycleId"=l.id)
   AND NOT EXISTS (SELECT 1 FROM organization_verification x WHERE x."lifecycleId"=l.id);
INSERT INTO orphan SELECT 'nvp', n.id::text, 'nvp-no-application', 0 FROM nvp n                                      -- arch=129
 WHERE NOT EXISTS (SELECT 1 FROM application_questions x WHERE x."nvpId"=n.id);
INSERT INTO orphan SELECT 'organization_verification', v.id::text, 'organization-verification-no-organization', 0 FROM organization_verification v  -- arch=3
 WHERE NOT EXISTS (SELECT 1 FROM organization o WHERE o."verificationId"=v.id);
INSERT INTO orphan SELECT 'user_settings', s.id::text, 'user-settings-no-user', 0 FROM user_settings s               -- arch=2
 WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."settingsId"=s.id);
INSERT INTO orphan SELECT 'mcp_api_key', k.id::text, 'mcp-api-key-principal-missing', 0 FROM mcp_api_key k           -- arch=1
 -- Exactly one of userId / actorId is set (mcp-api-key.entity.ts on develop 39d7aff38): a key bound
 -- to an actor has no user by design (the web assistant's system actor). Corrected 2026-11-12: the
 -- first version of this rule rejected every actor-bound key because its userId is null.
 WHERE (k."userId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=k."userId"))
    OR (k."actorId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=k."actorId"))
    OR (k."userId" IS NULL AND k."actorId" IS NULL);

\echo --- direct rule counts (compare with arch=…)
SELECT rule, count(*) FROM orphan WHERE round=0 GROUP BY 1 ORDER BY 1;

-- ===================================================================
-- 2. FIXPOINT PROPAGATION  ("orphan rules read owners through the
--    admitted rows and repeat until nothing changes": his run took 8 rounds)
--    edge kinds:
--      fk : child.col  -> owner.id   (child goes when owner goes)
--      ptr: owner.col  -> child.id   (owner points at the child; child goes when owner goes)
-- ===================================================================
\echo === 2 fixpoint propagation
DROP TABLE IF EXISTS edge;
CREATE TEMP TABLE edge (kind text, child text, col text, owner text);
INSERT INTO edge VALUES
 -- actor CTI
 ('fk','actor','id','account'), ('fk','actor','id','virtual_contributor'), ('fk','actor','id','user'), ('fk','actor','id','organization'), ('fk','actor','id','space'),
 ('fk','user','id','actor'), ('fk','organization','id','actor'), ('fk','virtual_contributor','id','actor'), ('fk','space','id','actor'), ('fk','account','id','actor'),
 -- account
 ('ptr','license','licenseId','account'), ('ptr','storage_aggregator','storageAggregatorId','account'),
 ('fk','credential','actorId','actor'), ('fk','innovation_pack','accountId','account'), ('fk','innovation_hub','accountId','account'),
 -- virtual contributor
 ('ptr','ai_persona','aiPersonaID','virtual_contributor'), ('ptr','knowledge_base','knowledgeBaseId','virtual_contributor'),
 -- space / template content space
 ('ptr','collaboration','collaborationId','space'), ('ptr','community','communityId','space'), ('ptr','space_about','aboutId','space'),
 ('ptr','templates_manager','templatesManagerId','space'), ('ptr','license','licenseId','space'), ('ptr','storage_aggregator','storageAggregatorId','space'),
 ('ptr','collaboration','collaborationId','template_content_space'), ('ptr','space_about','aboutId','template_content_space'),
 ('fk','template_content_space','parentSpaceId','template_content_space'), ('fk','space','parentSpaceId','space'),
 -- collaboration
 ('fk','activity','collaborationID','collaboration'), ('ptr','callouts_set','calloutsSetId','collaboration'), ('ptr','innovation_flow','innovationFlowId','collaboration'),
 ('ptr','license','licenseId','collaboration'), ('ptr','timeline','timelineId','collaboration'),
 ('ptr','calendar','calendarId','timeline'), ('fk','calendar_event','calendarId','calendar'),
 ('fk','innovation_flow_state','innovationFlowId','innovation_flow'), ('ptr','profile','profileId','innovation_flow'), ('ptr','tagset_template','flowStatesTagsetTemplateId','innovation_flow'),
 -- callouts
 ('ptr','callouts_set','calloutsSetId','knowledge_base'), ('fk','callout','calloutsSetId','callouts_set'), ('ptr','tagset_template_set','tagsetTemplateSetId','callouts_set'),
 ('fk','tagset_template','tagsetTemplateSetId','tagset_template_set'),
 ('fk','callout_contribution','calloutId','callout'), ('ptr','callout_contribution_defaults','contributionDefaultsId','callout'), ('ptr','callout_framing','framingId','callout'),
 ('ptr','classification','classificationId','callout'), ('ptr','room','commentsId','callout'),
 ('ptr','classification','classificationId','callout_contribution'), ('ptr','link','linkId','callout_contribution'), ('ptr','post','postId','callout_contribution'),
 ('ptr','whiteboard','whiteboardId','callout_contribution'), ('ptr','memo','memoId','callout_contribution'), ('ptr','collabora_document','collaboraDocumentId','callout_contribution'),
 ('ptr','whiteboard','whiteboardId','callout_framing'), ('ptr','memo','memoId','callout_framing'), ('ptr','link','linkId','callout_framing'), ('ptr','media_gallery','mediaGalleryId','callout_framing'),
 ('ptr','poll','pollId','callout_framing'), ('ptr','profile','profileId','callout_framing'), ('ptr','collabora_document','collaboraDocumentId','callout_framing'),
 ('fk','callout_form','framingId','callout_framing'), ('fk','callout_form_response','formId','callout_form'), ('fk','poll_option','pollId','poll'), ('fk','poll_vote','pollId','poll'),
 ('ptr','room','commentsId','post'), ('ptr','profile','profileId','post'), ('ptr','profile','profileId','whiteboard'), ('ptr','profile','profileId','memo'), ('ptr','profile','profileId','link'),
 ('ptr','profile','profileId','collabora_document'), ('ptr','file','documentId','collabora_document'), ('fk','signing_attempt','memoId','memo'),
 ('ptr','room','commentsId','calendar_event'), ('ptr','profile','profileId','calendar_event'),
 -- community
 ('ptr','communication','communicationId','community'), ('ptr','role_set','roleSetId','community'), ('fk','user_group','communityId','community'),
 ('ptr','room','updatesId','communication'),
 ('fk','role','roleSetId','role_set'), ('ptr','form','applicationFormId','role_set'), ('ptr','license','licenseId','role_set'),
 ('fk','application','roleSetId','role_set'), ('fk','invitation','roleSetId','role_set'), ('fk','platform_invitation','roleSetId','role_set'),
 -- application_questions and conversation_membership have no id column (join tables): handled by the FK cascade, not modelled here
 ('ptr','lifecycle','lifecycleId','application'), ('ptr','lifecycle','lifecycleId','invitation'),
 ('ptr','community_guidelines','guidelinesId','space_about'), ('ptr','profile','profileId','space_about'), ('fk','classification_entry','spaceAboutId','space_about'),
 ('ptr','profile','profileId','community_guidelines'),
 -- messaging
 ('ptr','room','roomId','conversation'), ('ptr','storage_aggregator','storageAggregatorId','conversation'),
 ('fk','in_app_notification','roomID','room'), ('fk','in_app_notification','calloutID','callout'), ('fk','in_app_notification','contributionID','callout_contribution'),
 ('fk','in_app_notification','calendarEventID','calendar_event'), ('fk','in_app_notification','invitationID','invitation'), ('fk','in_app_notification','applicationID','application'),
 -- profile chain
 ('ptr','profile','profileId','actor'), ('ptr','profile','profileId','discussion'), ('ptr','profile','profileId','innovation_hub'), ('ptr','profile','profileId','innovation_pack'),
 ('ptr','profile','profileId','knowledge_base'), ('ptr','profile','profileId','template'), ('ptr','profile','profileId','user_group'),
 ('ptr','location','locationId','profile'), ('ptr','storage_bucket','storageBucketId','profile'),
 ('fk','tagset','profileId','profile'), ('fk','visual','profileId','profile'), ('fk','reference','profileId','profile'),
 ('fk','tagset','classificationId','classification'), ('ptr','tagset','tagsetId','file'),
 -- storage
 ('fk','storage_bucket','storageAggregatorId','storage_aggregator'), ('ptr','storage_bucket','directStorageId','storage_aggregator'),
 ('fk','file','storageBucketId','storage_bucket'), ('fk','file_backup_outbox','fileId','file'),
 ('fk','visual','mediaGalleryId','media_gallery'), ('ptr','storage_bucket','storageBucketId','media_gallery'),
 -- templates
 ('ptr','templates_set','templatesSetId','templates_manager'), ('fk','template_default','templatesManagerId','templates_manager'),
 ('fk','template','templatesSetId','templates_set'), ('fk','innovation_pack','templatesSetId','templates_set'),
 ('ptr','template_content_space','contentSpaceId','template'), ('ptr','callout','calloutId','template'), ('ptr','whiteboard','whiteboardId','template'), ('ptr','community_guidelines','communityGuidelinesId','template'),
 -- licensing
 ('fk','license_entitlement','licenseId','license'),
 -- organization
 ('ptr','role_set','roleSetId','organization'), ('ptr','storage_aggregator','storageAggregatorId','organization'), ('ptr','organization_verification','verificationId','organization'),
 ('ptr','lifecycle','lifecycleId','organization_verification'), ('fk','user_group','organizationId','organization'),
 -- user
 ('ptr','user_settings','settingsId','user'), ('ptr','storage_aggregator','storageAggregatorId','user'), ('fk','mcp_api_key','userId','user'),
 ('fk','device_push_token','userId','user'), ('fk','push_subscription','userId','user'), ('fk','application','userId','user');
-- every table with an authorizationId owns its policy
INSERT INTO edge SELECT 'ptr','authorization_policy','authorizationId',table_name FROM information_schema.columns
 WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%';

DO $$
DECLARE e record; n bigint; total bigint; rnd int := 0;
BEGIN
  LOOP
    rnd := rnd + 1; total := 0;
    FOR e IN SELECT * FROM edge LOOP
      IF e.kind = 'fk' THEN
        EXECUTE format($q$INSERT INTO orphan SELECT %L, c.id::text, %L, %s FROM %I c
                          WHERE c.%I IS NOT NULL AND EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=%L AND o.id=c.%I::text)
                          ON CONFLICT DO NOTHING$q$,
                       e.child, 'dependant-of-'||e.owner, rnd, e.child, e.col, e.owner, e.col);
      ELSE
        EXECUTE format($q$INSERT INTO orphan SELECT %L, c.id::text, %L, %s FROM %I c
                          WHERE EXISTS (SELECT 1 FROM %I p JOIN orphan o ON o.tbl=%L AND o.id=p.id::text WHERE p.%I=c.id)
                            AND NOT EXISTS (SELECT 1 FROM %I p2 WHERE p2.%I=c.id AND NOT EXISTS (SELECT 1 FROM orphan o2 WHERE o2.tbl=%L AND o2.id=p2.id::text))
                          ON CONFLICT DO NOTHING$q$,
                       e.child, 'dependant-of-'||e.owner, rnd, e.child, e.owner, e.owner, e.col, e.owner, e.col, e.owner);
      END IF;
      GET DIAGNOSTICS n = ROW_COUNT; total := total + n;
    END LOOP;
    RAISE NOTICE 'round % added % rows', rnd, total;
    EXIT WHEN total = 0 OR rnd > 20;
  END LOOP;
END $$;

-- ===================================================================
-- 3. PER-TABLE CLASSIFICATION  (compare with his appendix:
--    total | valid | orphaned = direct + dependants)
-- ===================================================================
\echo === 3 per-table classification
DROP TABLE IF EXISTS tcount;
CREATE TEMP TABLE tcount (tbl text, total bigint);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' LOOP
    EXECUTE format('INSERT INTO tcount SELECT %L, count(*) FROM %I', r.table_name, r.table_name);
  END LOOP;
END $$;
SELECT t.tbl, t.total,
       t.total - coalesce(o.orphaned,0) AS valid,
       coalesce(o.orphaned,0) AS orphaned, coalesce(o.direct,0) AS direct, coalesce(o.dependant,0) AS dependant
  FROM tcount t
  LEFT JOIN (SELECT tbl, count(*) orphaned, count(*) FILTER (WHERE round=0) direct, count(*) FILTER (WHERE round>0) dependant FROM orphan GROUP BY tbl) o USING (tbl)
 ORDER BY orphaned DESC, tbl;
SELECT sum(total) AS all_rows, sum(total)-(SELECT count(*) FROM orphan) AS valid, (SELECT count(*) FROM orphan) AS orphaned,
       (SELECT count(*) FROM orphan WHERE round=0) AS direct, (SELECT count(*) FROM orphan WHERE round>0) AS dependant FROM tcount;
-- arch: 854,532 | 806,937 | 46,409 = 21,591 + 24,818
\echo --- finding totals (A1..A11)
SELECT f, sum(n) FROM (
  SELECT 'A1' f, count(*) n FROM orphan WHERE tbl LIKE '\_agent%'
  UNION ALL SELECT 'A2', count(*) FROM orphan WHERE tbl IN ('account','actor','license','license_entitlement')
  UNION ALL SELECT 'A3', count(*) FROM orphan WHERE tbl IN ('collaboration','community','communication','role_set','role','form','innovation_flow','innovation_flow_state','template_content_space','templates_manager','templates_set','template_default','callouts_set','community_guidelines','space_about','timeline','calendar','callout','callout_framing','callout_contribution','callout_contribution_defaults','link')
  UNION ALL SELECT 'A4', count(*) FROM orphan WHERE tbl IN ('classification','tagset_template_set','tagset_template')
  UNION ALL SELECT 'A5', count(*) FROM orphan WHERE tbl IN ('profile','location','tagset','visual','reference')
  UNION ALL SELECT 'A6', count(*) FROM orphan WHERE tbl IN ('file','storage_bucket','storage_aggregator','media_gallery','file_backup_outbox','whiteboard','memo','collabora_document')
  UNION ALL SELECT 'A7', count(*) FROM orphan WHERE tbl IN ('ai_persona','virtual_contributor','knowledge_base')
  UNION ALL SELECT 'A8', count(*) FROM orphan WHERE tbl='credential'
  UNION ALL SELECT 'A9', count(*) FROM orphan WHERE tbl='authorization_policy'
  UNION ALL SELECT 'A10', count(*) FROM orphan WHERE tbl IN ('activity','room','conversation')
  UNION ALL SELECT 'A11', count(*) FROM orphan WHERE tbl IN ('lifecycle','nvp','organization_verification','user_settings','mcp_api_key')) x GROUP BY 1 ORDER BY 1;
-- arch: A1 5,322 | A2 712 | A3 762 | A4 4,295 | A5 6,729 | A6 3,772 | A7 192 | A8 178 | A9 23,258 | A10 966 | A11 223

-- ===================================================================
-- 4. BUG-HERITAGE RULES (24): "the old code refuses these values, yet the
--    rows exist". Imported, handled by a recorded rule. Rows already
--    orphaned are excluded ("every row gets one class; orphaned wins").
-- ===================================================================

-- ===================================================================
-- A3 pre-delete guards (QA, 2026-11-09). Need the propagated `orphan`
-- set from sections 1-2. These find the places where a LIVE actor still
-- touches an orphaned space structure, which is the only way a deletion
-- in A3 can be felt by anyone. Expectation per guard is in its \echo.
-- ===================================================================
\echo === A3 guards
-- G1 pending invitations / applications / platform invitations whose role
--    set is orphaned, split by whether the invitee or applicant still exists.
--    A live invitee with a pending invitation to a gone space is the one
--    user-visible risk (dashboard "pending invitations" resolves the space).
\echo --- A3 G1: invitations/applications under orphaned role sets (live actor + pending = user-visible)
SELECT 'invitation' kind, (EXISTS (SELECT 1 FROM actor x WHERE x.id=i."invitedActorId")) AS actor_exists,
       coalesce(l."machineState",'?') AS state, count(*)
  FROM invitation i JOIN orphan o ON o.tbl='role_set' AND o.id=i."roleSetId"::text
  LEFT JOIN lifecycle l ON l.id=i."lifecycleId"
 GROUP BY 1,2,3
UNION ALL
SELECT 'application', (EXISTS (SELECT 1 FROM "user" x WHERE x.id=a."userId")), coalesce(l."machineState",'?'), count(*)
  FROM application a JOIN orphan o ON o.tbl='role_set' AND o.id=a."roleSetId"::text
  LEFT JOIN lifecycle l ON l.id=a."lifecycleId"
 GROUP BY 1,2,3
UNION ALL
SELECT 'platform_invitation', ("profileCreated"), 'n/a', count(*)
  FROM platform_invitation p JOIN orphan o ON o.tbl='role_set' AND o.id=p."roleSetId"::text
 GROUP BY 1,2,3
ORDER BY 1,2,3;
-- G2 in-app notifications of EXISTING receivers that point at an orphaned
--    callout, room, invitation, application, contribution, or at a space that
--    is gone. Each is a bell item whose link already leads nowhere; deleting
--    the target changes nothing for the receiver, but these rows should be
--    removed in the same pass.
\echo --- A3 G2: in-app notifications of live receivers pointing at orphaned structure (remove together)
WITH n AS (SELECT * FROM in_app_notification n WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=n."receiverID"))
SELECT target, state, count(*) FROM (
  SELECT 'callout' target, n.state FROM n JOIN orphan o ON o.tbl='callout' AND o.id=n."calloutID"::text
  UNION ALL SELECT 'room', n.state FROM n JOIN orphan o ON o.tbl='room' AND o.id=n."roomID"::text
  UNION ALL SELECT 'invitation', n.state FROM n JOIN orphan o ON o.tbl='invitation' AND o.id=n."invitationID"::text
  UNION ALL SELECT 'application', n.state FROM n JOIN orphan o ON o.tbl='application' AND o.id=n."applicationID"::text
  UNION ALL SELECT 'contribution', n.state FROM n JOIN orphan o ON o.tbl='callout_contribution' AND o.id=n."contributionID"::text
  UNION ALL SELECT 'space (gone)', n.state FROM n WHERE n."spaceID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id=n."spaceID")
) x GROUP BY 1,2 ORDER BY 1,2;
-- G3 rooms under orphaned structure (callout comments, post comments,
--    communication updates, discussions, calendar events). The room row
--    carries no Matrix id; the Matrix room lives on in Synapse with its
--    members unless the adapter deletes it. Deleting only the row adds to
--    the orphan-Matrix-room count. Export these ids for the Matrix cleanup.
\echo --- A3 G3: rooms owned by orphaned structure, by owner kind and message count (Matrix cleanup list)
SELECT owner, count(*) rooms, sum(r."messagesCount") messages FROM (
  SELECT 'callout.comments' owner, c."commentsId" rid FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text
  UNION ALL SELECT 'post.comments', p."commentsId" FROM post p JOIN orphan o ON o.tbl='post' AND o.id=p.id::text
  UNION ALL SELECT 'communication.updates', m."updatesId" FROM communication m JOIN orphan o ON o.tbl='communication' AND o.id=m.id::text
  UNION ALL SELECT 'discussion.comments', d."commentsId" FROM discussion d JOIN orphan o ON o.tbl='discussion' AND o.id=d.id::text
  UNION ALL SELECT 'calendar_event.comments', e."commentsId" FROM calendar_event e JOIN orphan o ON o.tbl='calendar_event' AND o.id=e.id::text
) x JOIN room r ON r.id=x.rid GROUP BY 1 ORDER BY 1;
-- G4 content authored by LIVE users inside orphaned callouts: this is what
--    is actually destroyed. It is already unreachable, so nobody loses
--    access, but the authors are identifiable and the count belongs in the
--    deletion record.
\echo --- A3 G4: contributions and posts by live authors inside orphaned callouts (what is destroyed)
SELECT 'callout_contribution' kind, count(*) rows_, count(DISTINCT cc."createdBy") live_authors
  FROM callout_contribution cc JOIN orphan o ON o.tbl='callout_contribution' AND o.id=cc.id::text
 WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=cc."createdBy")
UNION ALL
SELECT 'callout', count(*), count(DISTINCT c."createdBy")
  FROM callout c JOIN orphan o ON o.tbl='callout' AND o.id=c.id::text
 WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=c."createdBy");
-- G5 user groups under orphaned communities, and live-held credentials whose
--    scope is the (gone) space of an orphaned space role set. The latter is
--    A8 credential-scope-gone seen from the A3 side: the credential must go
--    in the same pass or the user keeps a role on nothing.
\echo --- A3 G5: user groups under orphaned communities (expect 0) / live credentials scoped to the gone spaces behind orphaned role sets
SELECT 'user_group under orphaned community' what, count(*) FROM user_group g JOIN orphan o ON o.tbl='community' AND o.id=g."communityId"::text
UNION ALL
SELECT 'live credential on gone space (A8 overlap)', count(*)
  FROM credential c JOIN actor a ON a.id=c."actorId"
 WHERE c.type LIKE 'space-%' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID");
-- G6 anything LIVE that points INTO an orphaned A3 container would be a
--    propagation error, not an orphan: a live space whose community /
--    collaboration / about / templates manager is in the orphan set. Expect 0.
\echo --- A3 G6: live spaces pointing at an orphaned child container (expect 0 = propagation is sound)
SELECT 'space.communityId' ref, count(*) FROM space s JOIN orphan o ON o.tbl='community' AND o.id=s."communityId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=s.id::text)
UNION ALL SELECT 'space.collaborationId', count(*) FROM space s JOIN orphan o ON o.tbl='collaboration' AND o.id=s."collaborationId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=s.id::text)
UNION ALL SELECT 'space.aboutId', count(*) FROM space s JOIN orphan o ON o.tbl='space_about' AND o.id=s."aboutId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=s.id::text)
UNION ALL SELECT 'space.templatesManagerId', count(*) FROM space s JOIN orphan o ON o.tbl='templates_manager' AND o.id=s."templatesManagerId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=s.id::text)
UNION ALL SELECT 'organization.roleSetId', count(*) FROM organization g JOIN orphan o ON o.tbl='role_set' AND o.id=g."roleSetId"::text
UNION ALL SELECT 'platform.roleSetId/templatesManagerId', count(*) FROM platform p JOIN orphan o ON (o.tbl='role_set' AND o.id=p."roleSetId"::text) OR (o.tbl='templates_manager' AND o.id=p."templatesManagerId"::text)
UNION ALL SELECT 'template.contentSpaceId', count(*) FROM template t JOIN orphan o ON o.tbl='template_content_space' AND o.id=t."contentSpaceId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='template' AND q.id=t.id::text);

-- G7 lost-pointer check (QA, 2026-11-10). An A3 orphan can also be a part
--    of a LIVE owner whose pointer to it was nulled. The orphan rule cannot
--    tell the two apart; this can. Any live owner with an empty pointer means
--    one of the "orphans" may be its missing part and needs matching by hand
--    (createdDate / displayName) before deletion. Expect 0 everywhere.
\echo --- A3 G7: live owners with an empty pointer to a part that A3 would delete (expect 0)
SELECT 'community.communicationId NULL (live space)' what, count(*) FROM community c
  JOIN space s ON s."communityId"=c.id WHERE c."communicationId" IS NULL
UNION ALL SELECT 'community.roleSetId NULL (live space)', count(*) FROM community c
  JOIN space s ON s."communityId"=c.id WHERE c."roleSetId" IS NULL
UNION ALL SELECT 'organization.roleSetId NULL', count(*) FROM organization WHERE "roleSetId" IS NULL
UNION ALL SELECT 'space.communityId NULL', count(*) FROM space WHERE "communityId" IS NULL
UNION ALL SELECT 'space.collaborationId NULL', count(*) FROM space WHERE "collaborationId" IS NULL
UNION ALL SELECT 'space.aboutId NULL', count(*) FROM space WHERE "aboutId" IS NULL
UNION ALL SELECT 'space L0.templatesManagerId NULL', count(*) FROM space WHERE level=0 AND "templatesManagerId" IS NULL
UNION ALL SELECT 'platform.templatesManagerId NULL', count(*) FROM platform WHERE "templatesManagerId" IS NULL
UNION ALL SELECT 'template(space).contentSpaceId NULL', count(*) FROM template WHERE type='space' AND "contentSpaceId" IS NULL
UNION ALL SELECT 'collaboration.innovationFlowId NULL', count(*) FROM collaboration WHERE "innovationFlowId" IS NULL
UNION ALL SELECT 'collaboration.calloutsSetId NULL', count(*) FROM collaboration WHERE "calloutsSetId" IS NULL
UNION ALL SELECT 'space_about.guidelinesId NULL (live space)', count(*) FROM space_about a JOIN space s ON s."aboutId"=a.id WHERE a."guidelinesId" IS NULL
UNION ALL SELECT 'template(community-guidelines).communityGuidelinesId NULL', count(*) FROM template WHERE type::text='community-guidelines' AND "communityGuidelinesId" IS NULL;
-- Ownership facts behind the A3 reading (schema 2026-10-24):
--   templates_manager  <- space.templatesManagerId | platform.templatesManagerId   (packs own a templates_set, never a manager)
--   communication      <- community.communicationId                                (communities exist only for spaces)
--   template_content_space <- template.contentSpaceId | template_content_space.parentSpaceId
--       (the template may have sat in a space library, the platform library or an innovation pack; the orphan does not say which)

-- ===================================================================
-- A4 pre-delete guards (QA, 2026-11-10). classification is owned by
-- callout.classificationId / callout_contribution.classificationId and holds
-- the tagsets that place a callout in a flow phase; tagset_template_set is
-- owned by callouts_set.tagsetTemplateSetId and holds the tagset_template
-- rows (allowed values) that live tagsets point at via tagsetTemplateId.
-- ===================================================================
\echo === A4 guards
-- G1 the one real risk: a LIVE tagset (on a live profile or a live
--    classification) whose template sits in an orphaned template set.
--    Deleting the template nulls the tagset's allowed values (the flow-state
--    selector of a live callout would lose its options). Expect 0.
\echo --- A4 G1: live tagsets whose tagset_template is in an orphaned set (expect 0)
SELECT t.type, tt.name AS template_name, count(*)
  FROM tagset t JOIN tagset_template tt ON tt.id=t."tagsetTemplateId"
  JOIN orphan o ON o.tbl='tagset_template_set' AND o.id=tt."tagsetTemplateSetId"::text
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='tagset' AND q.id=t.id::text)
 GROUP BY 1,2 ORDER BY 3 DESC;
-- G2 what is inside the orphaned classifications: their tagsets and whether
--    any still carries tags. All of it goes with the classification; this is
--    the deletion record, nothing live reads it.
\echo --- A4 G2: tagsets under orphaned classifications (deletion record)
SELECT t.name, count(*) AS tagsets, count(*) FILTER (WHERE coalesce(t.tags,'')<>'') AS with_tags
  FROM tagset t JOIN orphan o ON o.tbl='classification' AND o.id=t."classificationId"::text
 GROUP BY 1 ORDER BY 2 DESC;
-- G3 soundness: a LIVE callout, contribution or callouts set pointing at an
--    orphaned container would be a propagation error. Expect 0.
\echo --- A4 G3: live owners pointing at an orphaned classification / template set (expect 0)
SELECT 'callout.classificationId' ref, count(*) FROM callout c JOIN orphan o ON o.tbl='classification' AND o.id=c."classificationId"::text
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout' AND q.id=c.id::text)
UNION ALL SELECT 'callout_contribution.classificationId', count(*) FROM callout_contribution c JOIN orphan o ON o.tbl='classification' AND o.id=c."classificationId"::text
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_contribution' AND q.id=c.id::text)
UNION ALL SELECT 'callouts_set.tagsetTemplateSetId', count(*) FROM callouts_set s JOIN orphan o ON o.tbl='tagset_template_set' AND o.id=s."tagsetTemplateSetId"::text
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callouts_set' AND q.id=s.id::text);
-- G4 lost-pointer: a LIVE owner with an empty slot. One of the 3,021 / 548
--    "orphans" could be its nulled part. Expect 0 for callout and
--    callouts_set; contributions are informational.
\echo --- A4 G4: live owners with an empty classification / template-set pointer (expect 0)
SELECT 'callout.classificationId NULL (live)' what, count(*) FROM callout c WHERE c."classificationId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout' AND q.id=c.id::text)
UNION ALL SELECT 'callouts_set.tagsetTemplateSetId NULL (live)', count(*) FROM callouts_set s WHERE s."tagsetTemplateSetId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callouts_set' AND q.id=s.id::text)
UNION ALL SELECT 'callout_contribution.classificationId NULL (live, info)', count(*) FROM callout_contribution c WHERE c."classificationId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_contribution' AND q.id=c.id::text);
-- G5 standalone tagset templates (no set): the architect counts 4 as valid by
--    design (task-board). Anything beyond that number needs a look.
\echo --- A4 G5: tagset templates with no set (arch: 4 valid by design)
SELECT name, type, count(*) FROM tagset_template WHERE "tagsetTemplateSetId" IS NULL GROUP BY 1,2 ORDER BY 3 DESC;

-- G6-G8 added 2026-11-12 from the A4 review: what the reject bundle shares
--    with rows that stay. The bundle is the orphaned classifications, the
--    tagsets under them and the policies of both.
\echo --- A4 G6: policies of orphaned classifications or their tagsets that another row also uses (expect 0)
WITH bundle AS (
  SELECT c."authorizationId" AS pid FROM classification c JOIN orphan o ON o.tbl='classification' AND o.id=c.id::text WHERE c."authorizationId" IS NOT NULL
  UNION ALL
  SELECT t."authorizationId" FROM tagset t JOIN orphan o ON o.tbl='classification' AND o.id=t."classificationId"::text WHERE t."authorizationId" IS NOT NULL)
SELECT (SELECT count(*) FROM bundle) AS bundle_policies,
       (SELECT count(*) FROM (SELECT a.id FROM auth_ref a WHERE a.id IN (SELECT pid FROM bundle) GROUP BY a.id HAVING count(*) > 1) s) AS used_by_another_row,
       (SELECT count(*) FROM bundle b WHERE NOT EXISTS (SELECT 1 FROM authorization_policy p WHERE p.id=b.pid)) AS policy_row_missing;
\echo --- A4 G7: tagsets under an orphaned classification that also sit on a profile or are the tagset of a file (expect 0)
SELECT count(*) AS tagsets_in_bundle,
       count(*) FILTER (WHERE t."profileId" IS NOT NULL) AS also_on_a_profile,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file f WHERE f."tagsetId"=t.id)) AS used_by_a_file
  FROM tagset t JOIN orphan o ON o.tbl='classification' AND o.id=t."classificationId"::text;
\echo --- A4 G8: every callout has exactly one classification of its own (missing and shared expect 0)
SELECT count(*) AS callouts, count(*) FILTER (WHERE c."classificationId" IS NULL) AS missing,
       count(*) - count(DISTINCT c."classificationId") - count(*) FILTER (WHERE c."classificationId" IS NULL) AS shared,
       (SELECT count(*) FROM callout_contribution cc JOIN callout c2 ON c2."classificationId"=cc."classificationId") AS shared_with_a_contribution
  FROM callout c;

-- ===================================================================
-- A5 pre-delete guards (QA, 2026-11-10). profile is owned by 17 tables
-- (actor and 16 content tables); location / tagset / visual / reference are
-- owned by a profile (tagset also by a classification, visual also by a
-- media gallery). A profile owns a storage bucket, so its files and blobs
-- (counted in A6) go with it.
-- ===================================================================
\echo === A5 guards
-- G1 the one real risk: LIVE content that embeds a document stored in the
--    bucket of an orphaned profile. Images pasted into descriptions, visuals
--    and references are stored as /document/<file id> URLs; legacy cloning
--    (space from template, callout from template) copies the URL text, not
--    always the file, so a live page can point into a bucket A5/A6 would
--    delete. Expect 0; a hit = broken image/link on a live page after
--    deletion unless the file is moved first.
\echo --- A5 G1: live URLs pointing at files in buckets of orphaned profiles (expect 0)
WITH dead_file AS (
  SELECT f.id::text AS fid FROM file f
  JOIN profile p ON p."storageBucketId"=f."storageBucketId"
  JOIN orphan o ON o.tbl='profile' AND o.id=p.id::text),
live_url AS (
  SELECT 'visual.uri' src, v.id, (regexp_matches(v.uri, '/document/([0-9a-f-]{36})', 'g'))[1] fid FROM visual v
   WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='visual' AND q.id=v.id::text)
  UNION ALL SELECT 'reference.uri', r.id, (regexp_matches(r.uri, '/document/([0-9a-f-]{36})', 'g'))[1] FROM reference r
   WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='reference' AND q.id=r.id::text)
  UNION ALL SELECT 'link.uri', l.id, (regexp_matches(l.uri, '/document/([0-9a-f-]{36})', 'g'))[1] FROM link l
   WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='link' AND q.id=l.id::text)
  UNION ALL SELECT 'profile.description', p.id, (regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g'))[1] FROM profile p
   WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=p.id::text)
  UNION ALL SELECT 'community_guidelines (profile.description)', p.id, (regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g'))[1]
    FROM community_guidelines g JOIN profile p ON p.id=g."profileId"
   WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='community_guidelines' AND q.id=g.id::text))
SELECT u.src, count(*) AS live_links, count(DISTINCT u.fid) AS dead_files
  FROM live_url u JOIN dead_file d ON d.fid=u.fid GROUP BY 1 ORDER BY 2 DESC;
-- G2 deletion record: orphaned profiles by type, with their buckets, files
--    and bytes; plus what the orphaned tagsets / visuals / references hold.
\echo --- A5 G2: orphaned profiles by type with bucket, file and byte counts (deletion record)
SELECT p.type, count(*) AS profiles, count(p."storageBucketId") AS buckets,
       (SELECT count(*) FROM file f WHERE f."storageBucketId" IN (SELECT "storageBucketId" FROM profile p2 JOIN orphan o2 ON o2.tbl='profile' AND o2.id=p2.id::text WHERE p2.type=p.type)) AS files,
       (SELECT coalesce(sum(f.size),0) FROM file f WHERE f."storageBucketId" IN (SELECT "storageBucketId" FROM profile p2 JOIN orphan o2 ON o2.tbl='profile' AND o2.id=p2.id::text WHERE p2.type=p.type)) AS bytes
  FROM profile p JOIN orphan o ON o.tbl='profile' AND o.id=p.id::text GROUP BY 1 ORDER BY 2 DESC;
\echo --- A5 G2b: orphaned tagsets / visuals / references content (deletion record)
SELECT 'tagset' kind, count(*) rows_, count(*) FILTER (WHERE coalesce(t.tags,'')<>'') AS with_content FROM tagset t JOIN orphan o ON o.tbl='tagset' AND o.id=t.id::text
UNION ALL SELECT 'visual', count(*), count(*) FILTER (WHERE coalesce(v.uri,'')<>'') FROM visual v JOIN orphan o ON o.tbl='visual' AND o.id=v.id::text
UNION ALL SELECT 'reference', count(*), count(*) FILTER (WHERE coalesce(r.uri,'')<>'') FROM reference r JOIN orphan o ON o.tbl='reference' AND o.id=r.id::text
UNION ALL SELECT 'location', count(*), count(*) FILTER (WHERE coalesce(l.city,'')<>'' OR coalesce(l.country,'')<>'') FROM location l JOIN orphan o ON o.tbl='location' AND o.id=l.id::text;
-- G3 soundness: a LIVE owner pointing at an orphaned profile, or a LIVE
--    profile whose location / tagset / visual / reference is marked orphaned.
--    Expect 0 everywhere.
\echo --- A5 G3: live owners pointing at an orphaned profile / live profiles with orphaned parts (expect 0)
SELECT 'actor.profileId' ref, count(*) FROM actor x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='actor' AND q.id=x.id::text) UNION ALL SELECT 'calendar_event.profileId' ref, count(*) FROM calendar_event x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='calendar_event' AND q.id=x.id::text) UNION ALL SELECT 'callout_framing.profileId' ref, count(*) FROM callout_framing x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_framing' AND q.id=x.id::text) UNION ALL SELECT 'collabora_document.profileId' ref, count(*) FROM collabora_document x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='collabora_document' AND q.id=x.id::text) UNION ALL SELECT 'community_guidelines.profileId' ref, count(*) FROM community_guidelines x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='community_guidelines' AND q.id=x.id::text) UNION ALL SELECT 'discussion.profileId' ref, count(*) FROM discussion x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='discussion' AND q.id=x.id::text) UNION ALL SELECT 'innovation_flow.profileId' ref, count(*) FROM innovation_flow x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_flow' AND q.id=x.id::text) UNION ALL SELECT 'innovation_hub.profileId' ref, count(*) FROM innovation_hub x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_hub' AND q.id=x.id::text) UNION ALL SELECT 'innovation_pack.profileId' ref, count(*) FROM innovation_pack x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_pack' AND q.id=x.id::text) UNION ALL SELECT 'knowledge_base.profileId' ref, count(*) FROM knowledge_base x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='knowledge_base' AND q.id=x.id::text) UNION ALL SELECT 'link.profileId' ref, count(*) FROM link x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='link' AND q.id=x.id::text) UNION ALL SELECT 'memo.profileId' ref, count(*) FROM memo x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='memo' AND q.id=x.id::text) UNION ALL SELECT 'post.profileId' ref, count(*) FROM post x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='post' AND q.id=x.id::text) UNION ALL SELECT 'space_about.profileId' ref, count(*) FROM space_about x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space_about' AND q.id=x.id::text) UNION ALL SELECT 'template.profileId' ref, count(*) FROM template x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='template' AND q.id=x.id::text) UNION ALL SELECT 'user_group.profileId' ref, count(*) FROM user_group x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='user_group' AND q.id=x.id::text) UNION ALL SELECT 'whiteboard.profileId' ref, count(*) FROM whiteboard x JOIN orphan o ON o.tbl='profile' AND o.id=x."profileId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='whiteboard' AND q.id=x.id::text)
UNION ALL SELECT 'profile.locationId -> orphaned location', count(*) FROM profile p JOIN orphan o ON o.tbl='location' AND o.id=p."locationId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=p.id::text)
UNION ALL SELECT 'tagset.profileId live but tagset orphaned', count(*) FROM tagset t JOIN orphan o ON o.tbl='tagset' AND o.id=t.id::text WHERE t."profileId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=t."profileId"::text)
UNION ALL SELECT 'visual.profileId live but visual orphaned', count(*) FROM visual v JOIN orphan o ON o.tbl='visual' AND o.id=v.id::text WHERE v."profileId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=v."profileId"::text)
UNION ALL SELECT 'reference.profileId live but reference orphaned', count(*) FROM reference r JOIN orphan o ON o.tbl='reference' AND o.id=r.id::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=r."profileId"::text);
-- G4 lost-pointer: a LIVE owner with no profile at all. The legacy client
--    cannot render such an entity (it reads profile.displayName everywhere),
--    so a hit is a broken live record whose profile may be among the 62.
--    Expect 0. Profiles without location / bucket are informational.
\echo --- A5 G4: live owners with an empty profile pointer (expect 0) + live profiles without location / bucket (info)
SELECT 'actor.profileId NULL (live)' what, count(*) FROM actor x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='actor' AND q.id=x.id::text) UNION ALL SELECT 'calendar_event.profileId NULL (live)' what, count(*) FROM calendar_event x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='calendar_event' AND q.id=x.id::text) UNION ALL SELECT 'callout_framing.profileId NULL (live)' what, count(*) FROM callout_framing x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_framing' AND q.id=x.id::text) UNION ALL SELECT 'collabora_document.profileId NULL (live)' what, count(*) FROM collabora_document x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='collabora_document' AND q.id=x.id::text) UNION ALL SELECT 'community_guidelines.profileId NULL (live)' what, count(*) FROM community_guidelines x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='community_guidelines' AND q.id=x.id::text) UNION ALL SELECT 'discussion.profileId NULL (live)' what, count(*) FROM discussion x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='discussion' AND q.id=x.id::text) UNION ALL SELECT 'innovation_flow.profileId NULL (live)' what, count(*) FROM innovation_flow x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_flow' AND q.id=x.id::text) UNION ALL SELECT 'innovation_hub.profileId NULL (live)' what, count(*) FROM innovation_hub x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_hub' AND q.id=x.id::text) UNION ALL SELECT 'innovation_pack.profileId NULL (live)' what, count(*) FROM innovation_pack x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_pack' AND q.id=x.id::text) UNION ALL SELECT 'knowledge_base.profileId NULL (live)' what, count(*) FROM knowledge_base x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='knowledge_base' AND q.id=x.id::text) UNION ALL SELECT 'link.profileId NULL (live)' what, count(*) FROM link x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='link' AND q.id=x.id::text) UNION ALL SELECT 'memo.profileId NULL (live)' what, count(*) FROM memo x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='memo' AND q.id=x.id::text) UNION ALL SELECT 'post.profileId NULL (live)' what, count(*) FROM post x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='post' AND q.id=x.id::text) UNION ALL SELECT 'space_about.profileId NULL (live)' what, count(*) FROM space_about x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space_about' AND q.id=x.id::text) UNION ALL SELECT 'template.profileId NULL (live)' what, count(*) FROM template x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='template' AND q.id=x.id::text) UNION ALL SELECT 'user_group.profileId NULL (live)' what, count(*) FROM user_group x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='user_group' AND q.id=x.id::text) UNION ALL SELECT 'whiteboard.profileId NULL (live)' what, count(*) FROM whiteboard x WHERE x."profileId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='whiteboard' AND q.id=x.id::text)
UNION ALL SELECT 'profile.locationId NULL (live, info)', count(*) FROM profile p WHERE p."locationId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=p.id::text)
UNION ALL SELECT 'profile.storageBucketId NULL (live, info)', count(*) FROM profile p WHERE p."storageBucketId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=p.id::text);

-- ===================================================================
-- A6 pre-delete guards (QA, 2026-11-10). storage_aggregator <- space /
-- account / user / organization / platform / conversation (+ parent chain);
-- storage_bucket <- profile / media_gallery / aggregator.directStorageId;
-- file <- storage_bucket (blob = file.externalID in the file store);
-- media_gallery / whiteboard / memo / collabora_document <- callout_framing /
-- callout_contribution (/ template for whiteboards); file_backup_outbox <- file.
-- Whiteboard and memo bodies live in the collaboration service store
-- (contentPointer), so file references inside them cannot be scanned here.
-- ===================================================================
\echo === A6 guards
-- G1 the real risk: LIVE content pointing at a file A6 would delete (any
--    orphaned file: no bucket, or in an orphaned bucket). Same scan as A5 G1
--    but over the whole orphaned file set, plus live office documents whose
--    documentId is an orphaned file. Expect 0.
\echo --- A6 G1: live URLs / office documents pointing at orphaned files (expect 0)
WITH dead_file AS (SELECT id AS fid FROM orphan WHERE tbl='file'),
live_url AS (
  SELECT 'visual.uri' src, (regexp_matches(v.uri, '/document/([0-9a-f-]{36})', 'g'))[1] fid FROM visual v WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='visual' AND q.id=v.id::text)
  UNION ALL SELECT 'reference.uri', (regexp_matches(r.uri, '/document/([0-9a-f-]{36})', 'g'))[1] FROM reference r WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='reference' AND q.id=r.id::text)
  UNION ALL SELECT 'link.uri', (regexp_matches(l.uri, '/document/([0-9a-f-]{36})', 'g'))[1] FROM link l WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='link' AND q.id=l.id::text)
  UNION ALL SELECT 'profile.description', (regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g'))[1] FROM profile p WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=p.id::text)
  UNION ALL SELECT 'collabora_document.documentId', d."documentId"::text FROM collabora_document d WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='collabora_document' AND q.id=d.id::text)
  -- whiteboard and memo bodies are NOT read here: the inline copy is compressed
  -- (whiteboard) or binary (memo), a text match never fires. 41-inline-body-scan.py reads them.
  )
SELECT u.src, count(*) AS live_links, count(DISTINCT u.fid) AS dead_files
  FROM live_url u JOIN dead_file d ON d.fid=u.fid GROUP BY 1 ORDER BY 2 DESC;
-- G1b how much of the live whiteboard / memo text can be read from the
--    database at all. The body lives in file storage (contentPointer names
--    its file row). The database keeps an inline copy for most rows. The
--    inline copy is current only while contentVersion is 0, which means the
--    body was not saved again after it moved to file storage. 41-inline-body-scan.py reads the inline copies;
--    everything in the last column needs the bodies from file storage.
\echo --- A6 G1b: live whiteboard and memo bodies readable from the database (info; last column is NOT covered by any scan)
SELECT 'whiteboard' AS kind, count(*) AS live_rows,
       count(*) FILTER (WHERE length(coalesce(w.content,'')) > 2) AS with_inline_copy,
       count(*) FILTER (WHERE length(coalesce(w.content,'')) > 2 AND coalesce(w."contentVersion",0) = 0) AS inline_copy_is_current,
       count(*) FILTER (WHERE NOT (length(coalesce(w.content,'')) > 2 AND coalesce(w."contentVersion",0) = 0)) AS body_only_in_file_storage
  FROM whiteboard w
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='whiteboard' AND q.id=w.id::text)
UNION ALL SELECT 'memo', count(*), count(*) FILTER (WHERE length(coalesce(m.content,'')) > 2),
       count(*) FILTER (WHERE length(coalesce(m.content,'')) > 2 AND coalesce(m."contentVersion",0) = 0),
       count(*) FILTER (WHERE NOT (length(coalesce(m.content,'')) > 2 AND coalesce(m."contentVersion",0) = 0))
  FROM memo m
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='memo' AND q.id=m.id::text);
-- G2 blobs: file rows share blobs (externalID) through copies. A blob may be
--    deleted from the file store only when NO live file row names it.
--    G2a = what the deletion destroys; G2b = blobs that must be KEPT.
\echo --- A6 G2a: orphaned files by where they sit (rows, bytes, distinct blobs, never-attached uploads)
SELECT CASE WHEN f."storageBucketId" IS NULL THEN 'no bucket'
            WHEN NOT EXISTS (SELECT 1 FROM storage_bucket b WHERE b.id=f."storageBucketId") THEN 'bucket row gone'
            WHEN EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=f."storageBucketId") THEN 'orphaned profile bucket'
            WHEN EXISTS (SELECT 1 FROM media_gallery g WHERE g."storageBucketId"=f."storageBucketId") THEN 'orphaned media-gallery bucket'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator a JOIN orphan q ON q.tbl='storage_aggregator' AND q.id=a.id::text WHERE a."directStorageId"=f."storageBucketId") THEN 'direct bucket of a rejected aggregator'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator a WHERE a."directStorageId"=f."storageBucketId") THEN 'direct bucket of a KEPT aggregator (see G7)'
            ELSE 'bucket held by nothing' END AS where_,
       count(*) AS files, coalesce(sum(f.size),0) AS bytes, count(DISTINCT f."externalID") AS blobs,
       count(*) FILTER (WHERE f."temporaryLocation") AS temporary_uploads
  FROM file f JOIN orphan o ON o.tbl='file' AND o.id=f.id::text GROUP BY 1 ORDER BY 2 DESC;
\echo --- A6 G2b: blobs of orphaned files that a LIVE file row still uses (keep these blobs; delete only the rows)
SELECT count(DISTINCT f."externalID") AS shared_blobs, count(*) AS orphaned_rows_on_shared_blobs
  FROM file f JOIN orphan o ON o.tbl='file' AND o.id=f.id::text
 WHERE EXISTS (SELECT 1 FROM file l WHERE l."externalID"=f."externalID"
                  AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='file' AND q.id=l.id::text));
-- G3 soundness: LIVE owners pointing at an orphaned storage/content part, and
--    live buckets / aggregators under an orphaned aggregator. Expect 0.
\echo --- A6 G3: live owners pointing at orphaned storage / content parts (expect 0)
SELECT 'profile.storageBucketId' ref, count(*) FROM profile x JOIN orphan o ON o.tbl='storage_bucket' AND o.id=x."storageBucketId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='profile' AND q.id=x.id::text)
UNION ALL SELECT 'media_gallery.storageBucketId', count(*) FROM media_gallery x JOIN orphan o ON o.tbl='storage_bucket' AND o.id=x."storageBucketId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='media_gallery' AND q.id=x.id::text)
UNION ALL SELECT 'storage_aggregator.directStorageId', count(*) FROM storage_aggregator x JOIN orphan o ON o.tbl='storage_bucket' AND o.id=x."directStorageId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='storage_aggregator' AND q.id=x.id::text)
UNION ALL SELECT 'storage_bucket.storageAggregatorId (live bucket under orphaned aggregator)', count(*) FROM storage_bucket x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='storage_bucket' AND q.id=x.id::text)
UNION ALL SELECT 'storage_aggregator.parentStorageAggregatorId (live child under orphaned parent)', count(*) FROM storage_aggregator x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."parentStorageAggregatorId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='storage_aggregator' AND q.id=x.id::text)
UNION ALL SELECT 'space/account/user/organization/platform/conversation.storageAggregatorId', (
    (SELECT count(*) FROM space x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=x.id::text))
  + (SELECT count(*) FROM account x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='account' AND q.id=x.id::text))
  + (SELECT count(*) FROM "user" x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text)
  + (SELECT count(*) FROM organization x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text)
  + (SELECT count(*) FROM platform x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text)
  + (SELECT count(*) FROM conversation x JOIN orphan o ON o.tbl='storage_aggregator' AND o.id=x."storageAggregatorId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='conversation' AND q.id=x.id::text)))
UNION ALL SELECT 'callout_framing -> orphaned whiteboard/memo/collabora/gallery', count(*) FROM callout_framing x JOIN orphan o ON (o.tbl='whiteboard' AND o.id=x."whiteboardId"::text) OR (o.tbl='memo' AND o.id=x."memoId"::text) OR (o.tbl='collabora_document' AND o.id=x."collaboraDocumentId"::text) OR (o.tbl='media_gallery' AND o.id=x."mediaGalleryId"::text) WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_framing' AND q.id=x.id::text)
UNION ALL SELECT 'callout_contribution -> orphaned whiteboard/memo/collabora', count(*) FROM callout_contribution x JOIN orphan o ON (o.tbl='whiteboard' AND o.id=x."whiteboardId"::text) OR (o.tbl='memo' AND o.id=x."memoId"::text) OR (o.tbl='collabora_document' AND o.id=x."collaboraDocumentId"::text) WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_contribution' AND q.id=x.id::text)
UNION ALL SELECT 'template.whiteboardId -> orphaned whiteboard', count(*) FROM template x JOIN orphan o ON o.tbl='whiteboard' AND o.id=x."whiteboardId"::text WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='template' AND q.id=x.id::text)
UNION ALL SELECT 'signing_attempt.memoId -> orphaned memo', count(*) FROM signing_attempt x JOIN orphan o ON o.tbl='memo' AND o.id=x."memoId"::text;
-- G4 lost-pointer, the strongest one in A6: B3 says 94 whiteboard framings
--    have no whiteboard while A6 has 13 whiteboards with no owner. Some of
--    the 13 may be the nulled whiteboards of live framings. Same for memo,
--    office document and media gallery. A hit here is matched by hand
--    (createdDate, createdBy, nameID) before deletion.
\echo --- A6 G4: live framings / contributions whose typed content pointer is empty (candidates for the orphaned whiteboards/memos/docs/galleries)
SELECT 'callout_framing' tbl, f.type, count(*) FROM callout_framing f
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_framing' AND q.id=f.id::text)
   AND ((f.type='whiteboard' AND f."whiteboardId" IS NULL) OR (f.type='memo' AND f."memoId" IS NULL)
     OR (f.type='collabora_document' AND f."collaboraDocumentId" IS NULL) OR (f.type='media_gallery' AND f."mediaGalleryId" IS NULL))
 GROUP BY 1,2
UNION ALL
SELECT 'callout_contribution', c.type, count(*) FROM callout_contribution c
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout_contribution' AND q.id=c.id::text)
   AND ((c.type='whiteboard' AND c."whiteboardId" IS NULL) OR (c.type='memo' AND c."memoId" IS NULL) OR (c.type='collabora_document' AND c."collaboraDocumentId" IS NULL))
 GROUP BY 1,2
UNION ALL SELECT 'storage_aggregator', 'directStorageId NULL (live)', count(*) FROM storage_aggregator a WHERE a."directStorageId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='storage_aggregator' AND q.id=a.id::text)
ORDER BY 1,2;
\echo --- A6 G4b: the orphaned whiteboards / memos / docs / galleries with the fields needed to match them by hand
SELECT 'whiteboard' kind, w.id::text, w."createdDate"::date, w."createdBy"::text, w."nameID" AS name FROM whiteboard w JOIN orphan o ON o.tbl='whiteboard' AND o.id=w.id::text
UNION ALL SELECT 'memo', m.id::text, m."createdDate"::date, m."createdBy"::text, m."nameID" FROM memo m JOIN orphan o ON o.tbl='memo' AND o.id=m.id::text
UNION ALL SELECT 'collabora_document', d.id::text, d."createdDate"::date, d."createdBy"::text, d."documentType" FROM collabora_document d JOIN orphan o ON o.tbl='collabora_document' AND o.id=d.id::text
UNION ALL SELECT 'media_gallery', g.id::text, g."createdDate"::date, g."createdBy"::text, NULL FROM media_gallery g JOIN orphan o ON o.tbl='media_gallery' AND o.id=g.id::text
ORDER BY 1,3;
-- G5 the 2026-08-31 gallery batch (40 galleries, 13:59-14:59): who created
--    them and what else was created in that window. Expect one creator and a
--    matching burst of live media_gallery framings (a migration/backfill that
--    ran twice) or none (a test run).
\echo --- A6 G5: the 2026-08-31 media-gallery batch, by creator, with live framings created in the same window
SELECT g."createdBy"::text AS creator, count(*) AS orphan_galleries,
       (SELECT count(*) FROM callout_framing f WHERE f.type='media_gallery' AND f."createdDate" BETWEEN '2026-08-31 13:00+00' AND '2026-08-31 16:00+00') AS live_gallery_framings_same_window,
       (SELECT count(*) FROM media_gallery g2 WHERE g2."createdDate" BETWEEN '2026-08-31 13:00+00' AND '2026-08-31 16:00+00') AS all_galleries_same_window
  FROM media_gallery g JOIN orphan o ON o.tbl='media_gallery' AND o.id=g.id::text GROUP BY 1;
-- G6 backup outbox: orphaned rows by status (a pending/failed row for a gone
--    file makes the file-backup worker retry forever); plus LIVE files whose
--    outbox row is not done (those must not be touched).
\echo --- A6 G6: orphaned outbox rows by status / live files with unfinished outbox rows (info)
SELECT 'orphaned outbox' what, o2.status, count(*), max(o2.attempts) AS max_attempts FROM file_backup_outbox o2 JOIN orphan o ON o.tbl='file_backup_outbox' AND o.id=o2.id::text GROUP BY 1,2
UNION ALL SELECT 'live file, outbox not done', o2.status, count(*), max(o2.attempts) FROM file_backup_outbox o2 JOIN file f ON f.id=o2."fileId"
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='file' AND q.id=f.id::text) AND o2.status <> 'done' GROUP BY 1,2
ORDER BY 1,2;
-- G7 rejected files that sit in a KEPT bucket. They are rejected through
--    their content owner (an ownerless office document), not through the
--    bucket. The architect's rule keeps them. Each rule listed is a decision.
\echo --- A6 G7: rejected files sitting in a kept bucket, by the rule that rejected them (each row is a decision)
SELECT o.rule, a.type::text AS direct_bucket_of_aggregator_type, count(*) AS files, count(DISTINCT b.id) AS buckets, coalesce(sum(f.size),0) AS bytes,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file l WHERE l."externalID"=f."externalID" AND l.id<>f.id)) AS share_a_blob
  FROM file f JOIN orphan o ON o.tbl='file' AND o.id=f.id::text
  JOIN storage_bucket b ON b.id=f."storageBucketId"
  LEFT JOIN storage_aggregator a ON a."directStorageId"=b.id
 WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='storage_bucket' AND q.id=b.id::text) GROUP BY 1,2;
-- G8 the reserved Matrix media staging bucket must survive, with its policy
--    row and its place under the platform aggregator. Expect t, t, t, 0.
--    The file columns are info: media is meant to leave staging within 24 h.
\echo --- A6 G8: reserved Matrix media staging bucket (expect present t, policy t, platform t, rejected 0)
SELECT EXISTS (SELECT 1 FROM storage_bucket b WHERE b.id='00000000-0000-4000-8000-000000000013') AS present,
       EXISTS (SELECT 1 FROM storage_bucket b JOIN authorization_policy p ON p.id=b."authorizationId" WHERE b.id='00000000-0000-4000-8000-000000000013'
                  AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='authorization_policy' AND q.id=p.id::text)) AS policy_kept,
       EXISTS (SELECT 1 FROM storage_bucket b JOIN storage_aggregator a ON a.id=b."storageAggregatorId" AND a.type::text='platform' WHERE b.id='00000000-0000-4000-8000-000000000013') AS under_platform,
       (SELECT count(*) FROM orphan q WHERE (q.tbl='storage_bucket' AND q.id='00000000-0000-4000-8000-000000000013')
           OR (q.tbl='file' AND q.id IN (SELECT f.id::text FROM file f WHERE f."storageBucketId"='00000000-0000-4000-8000-000000000013'))) AS rejected_rows,
       (SELECT count(*) FROM file f WHERE f."storageBucketId"='00000000-0000-4000-8000-000000000013') AS files_in_staging,
       (SELECT count(*) FROM file f WHERE f."storageBucketId"='00000000-0000-4000-8000-000000000013'
           AND f."createdDate" < (SELECT max("createdDate") FROM file) - interval '24 hours') AS older_than_24h,
       (SELECT count(*) FROM file f WHERE f."storageBucketId"='00000000-0000-4000-8000-000000000013'
           AND EXISTS (SELECT 1 FROM file l WHERE l."externalID"=f."externalID" AND l."storageBucketId"<>f."storageBucketId")) AS already_copied_elsewhere;

-- G9 who can still open a rejected file today. The file service (public route
--    /rest/storage/document/<id>, file-service develop 2026-11-11) checks the
--    policy of the FILE row, not the policy of its bucket. A file without a
--    bucket, or in an ownerless bucket, is therefore still served to whoever
--    its own policy admits. Only a file without a policy is denied.
--    Info, widest reader per file; not a pass/fail guard.
\echo --- A6 G9: rejected files by the widest reader their own policy still admits (info)
WITH rf AS (
  SELECT f.id, ap.id AS pol, ap."credentialRules" AS cr
    FROM file f JOIN orphan o ON o.tbl='file' AND o.id=f.id::text
    LEFT JOIN authorization_policy ap ON ap.id=f."authorizationId"),
rd AS (
  SELECT rf.id, c->>'type' AS ctype,
         EXISTS (SELECT 1 FROM space sp WHERE sp.id::text = c->>'resourceID'
                    AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=sp.id::text)) AS kept_space
    FROM rf,
         jsonb_array_elements(CASE WHEN jsonb_typeof(rf.cr)='array' THEN rf.cr ELSE '[]'::jsonb END) r,
         jsonb_array_elements(CASE WHEN jsonb_typeof(r->'criterias')='array' THEN r->'criterias' ELSE '[]'::jsonb END) c
   WHERE r->'grantedPrivileges' ? 'read'),
w AS (
  SELECT rf.id,
         CASE WHEN rf.pol IS NULL THEN '6 no policy: denied to everyone'
              WHEN bool_or(rd.ctype='global-anonymous') THEN '1 anyone, signed in or not'
              WHEN bool_or(rd.ctype='global-registered') THEN '2 any signed-in user'
              WHEN bool_or(rd.ctype LIKE 'space-%' AND rd.kept_space) THEN '3 members or admins of a kept space'
              WHEN bool_or(rd.ctype IS NOT NULL) THEN '4 platform roles, the uploader, or roles on something gone'
              ELSE '5 policy without a read rule: denied to everyone' END AS widest_reader
    FROM rf LEFT JOIN rd ON rd.id=rf.id GROUP BY rf.id, rf.pol)
SELECT widest_reader, count(*) AS files FROM w GROUP BY 1 ORDER BY 1;

\echo === A7 guards
-- Ownership facts (legacy server db6e9def6):
--   ai_persona      <- virtual_contributor."aiPersonaID" only (NOT NULL but NO foreign key)
--   knowledge_base  <- virtual_contributor."knowledgeBaseId" only
--   virtual_contributor = an actor (id = actor.id, cascade) OWNED BY an account.
--   Rule virtual-contributor-body-of-knowledge-gone does NOT mean "no owner":
--   the VC still has its account; only the space it used as knowledge source
--   was deleted. Space deletion never looks at VCs that use the space as
--   knowledge source (live generator). So those VCs are a REPAIR candidate.
-- G1 what a live user loses if the orphaned VCs are deleted. One row per VC.
--    A live account or any count > 0 means: repair (clear the knowledge
--    source), do not delete.
\echo --- A7 G1: orphaned virtual contributors: owner and live use
SELECT v.id::text AS vc, o.rule,
  CASE WHEN a.id IS NULL THEN 'no account'
       WHEN EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='account' AND q.id=a.id::text) THEN 'orphaned account'
       ELSE 'LIVE account' END AS owner,
  v."bodyOfKnowledgeType" AS source_type, v."listedInStore" AS in_store, v."searchVisibility" AS visibility,
  (SELECT count(*) FROM credential c WHERE c."actorId"=v.id AND c.type LIKE 'space-%'
      AND EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID")) AS live_space_roles,
  (SELECT count(*) FROM conversation_membership m WHERE m."actorId"=v.id) AS conversations,
  (SELECT count(*) FROM invitation i WHERE i."invitedActorId"=v.id) AS invitations,
  (SELECT count(*) FROM in_app_notification n WHERE n."contributorActorId"=v.id) AS notifications,
  (SELECT count(*) FROM room r WHERE r."vcData"::text LIKE '%'||v.id::text||'%') AS rooms_with_threads,
  (SELECT count(*) FROM mcp_api_key k WHERE k."actorId"=v.id) AS api_keys,
  (SELECT count(*) FROM platform p WHERE p."wellKnownVirtualContributors"::text LIKE '%'||v.id::text||'%') AS well_known
FROM virtual_contributor v JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text
LEFT JOIN account a ON a.id=v."accountId" ORDER BY 3, 1;
-- G2 the personas: nothing reaches them, so nothing user-facing. The only
--    asset is the stored external config (provider API key, encrypted with the
--    server key). A quarantine copy of rejected rows must NOT carry it.
\echo --- A7 G2: orphaned AI personas by rule and engine, with a stored API key
SELECT o.rule, p.engine, count(*) AS personas,
       count(*) FILTER (WHERE p."externalConfig" ~ '"apiKey"') AS with_stored_key,
       min(p."createdDate")::date AS first_created, max(p."createdDate")::date AS last_created
  FROM ai_persona p JOIN orphan o ON o.tbl='ai_persona' AND o.id=p.id::text GROUP BY 1,2 ORDER BY 1,3 DESC;
-- G3 soundness + lost pointers. Expect 0 on every row. A hit on a "lost
--    pointer" row means one of the orphans may be a live VC's missing part:
--    match by createdDate, re-link, re-run.
\echo --- A7 G3: soundness and lost pointers (expect 0 everywhere)
WITH live_vc AS (SELECT v.* FROM virtual_contributor v WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='virtual_contributor' AND q.id=v.id::text))
SELECT 'live VC -> orphaned persona' chk, count(*) FROM live_vc v WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='ai_persona' AND q.id=v."aiPersonaID"::text)
UNION ALL SELECT 'live VC -> orphaned knowledge base', count(*) FROM live_vc v WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='knowledge_base' AND q.id=v."knowledgeBaseId"::text)
UNION ALL SELECT 'live VC: aiPersonaID names no persona (lost pointer)', count(*) FROM live_vc v WHERE NOT EXISTS (SELECT 1 FROM ai_persona p WHERE p.id=v."aiPersonaID")
UNION ALL SELECT 'live VC: knowledgeBaseId empty (lost pointer)', count(*) FROM live_vc v WHERE v."knowledgeBaseId" IS NULL
UNION ALL SELECT 'two VCs share one persona', count(*) FROM (SELECT "aiPersonaID" FROM virtual_contributor GROUP BY 1 HAVING count(*)>1) x
UNION ALL SELECT 'two VCs share one knowledge base', count(*) FROM (SELECT "knowledgeBaseId" FROM virtual_contributor WHERE "knowledgeBaseId" IS NOT NULL GROUP BY 1 HAVING count(*)>1) x
UNION ALL SELECT 'live knowledge base: calloutsSetId or profileId empty', count(*) FROM knowledge_base k WHERE (k."calloutsSetId" IS NULL OR k."profileId" IS NULL) AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='knowledge_base' AND q.id=k.id::text)
UNION ALL SELECT 'well-known mapping names an orphaned VC', count(*) FROM platform p JOIN orphan q ON q.tbl='virtual_contributor' AND p."wellKnownVirtualContributors"::text LIKE '%'||q.id||'%'
UNION ALL SELECT 'actor of type virtual-contributor without a VC row', count(*) FROM actor a WHERE a.type::text='virtual-contributor' AND NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id=a.id);
-- G4 knowledge bases that would be deleted: every VC gets default callouts,
--    so callouts > 0 is normal; CONTRIBUTIONS and FILES are user-written
--    content and need a look before deletion.
\echo --- A7 G4: orphaned knowledge bases and what they hold
SELECT k.id::text AS kb, o.rule, k."createdDate"::date AS created,
  (SELECT v.id::text FROM virtual_contributor v WHERE v."knowledgeBaseId"=k.id LIMIT 1) AS of_vc,
  (SELECT count(*) FROM callout c WHERE c."calloutsSetId"=k."calloutsSetId") AS callouts,
  (SELECT count(*) FROM callout_contribution cc JOIN callout c ON c.id=cc."calloutId" WHERE c."calloutsSetId"=k."calloutsSetId") AS contributions,
  (SELECT count(*) FROM file f JOIN storage_bucket b ON b.id=f."storageBucketId" JOIN profile p ON p."storageBucketId"=b.id WHERE p.id=k."profileId") AS profile_files
FROM knowledge_base k JOIN orphan o ON o.tbl='knowledge_base' AND o.id=k.id::text ORDER BY 2, 3;
-- G5 the gone knowledge sources. The server sends this id to the engine on
--    every question and has no command that removes ingested knowledge, so the
--    engine's vector store may still hold the deleted space's content. Hand
--    these ids to whoever owns that store. Not checkable from this database.
\echo --- A7 G5: gone knowledge sources (ids to purge from the engine store), VCs and engines per source
SELECT v."bodyOfKnowledgeID" AS gone_source, v."bodyOfKnowledgeType" AS source_type, count(*) AS vcs,
       string_agg(DISTINCT p.engine, ',') AS engines, max(p."bodyOfKnowledgeLastUpdated")::date AS last_ingest
  FROM virtual_contributor v JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text AND o.rule='virtual-contributor-body-of-knowledge-gone'
  LEFT JOIN ai_persona p ON p.id=v."aiPersonaID" GROUP BY 1,2 ORDER BY 3 DESC;

-- G6 the Repair path needs to know what a flagged VC still holds. Its role
--    credentials: "LIVE space" rows are memberships somebody sees today and
--    are classed rejected ONLY because the VC is (dependant-of-actor). Keep
--    the VC and they must be kept too. "space gone" rows are A8 rejects
--    either way.
\echo --- A7 G6: role credentials held by the orphaned virtual contributors, by state of the resource
SELECT c.type,
  CASE WHEN EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=c."resourceID") THEN 'space rejected'
       WHEN EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID") THEN 'LIVE space' ELSE 'space gone' END AS resource,
  (SELECT string_agg(DISTINCT q.rule, ',') FROM orphan q WHERE q.tbl='credential' AND q.id=c.id::text) AS credential_rule,
  count(*) AS credentials, count(DISTINCT c."actorId") AS vcs,
  count(*) FILTER (WHERE c."resourceID" = v."bodyOfKnowledgeID") AS on_its_own_gone_source
FROM credential c JOIN virtual_contributor v ON v.id=c."actorId"
JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text GROUP BY 1,2,3 ORDER BY 4 DESC;
-- G7 activity feed entries that name a flagged VC. "kept" rows sit in the
--    feed of a live space; reject the VC and they point at nothing.
\echo --- A7 G7: activity entries naming an orphaned virtual contributor
SELECT a.type, CASE WHEN EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='activity' AND q.id=a.id::text) THEN 'rejected with its collaboration' ELSE 'KEPT, live collaboration' END AS entry,
       count(*) AS entries, min(a."createdDate")::date AS first, max(a."createdDate")::date AS last
  FROM activity a JOIN orphan o ON o.tbl='virtual_contributor' AND (a."resourceID"::text=o.id OR a."triggeredBy"::text=o.id OR a."parentID"::text=o.id OR a.description LIKE '%'||o.id||'%')
 GROUP BY 1,2 ORDER BY 2,1;
-- G8 who owns the flagged VCs. Hosts are live users / organizations; the
--    other columns show the accounts are in real use.
\echo --- A7 G8: accounts behind the orphaned virtual contributors
WITH f AS (SELECT v.* FROM virtual_contributor v JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text)
SELECT (SELECT count(*) FROM f) AS flagged_vcs, count(DISTINCT f."accountId") AS accounts,
  count(DISTINCT u.id) AS user_hosts, count(DISTINCT g.id) AS organization_hosts,
  (SELECT count(*) FROM virtual_contributor v2 WHERE v2."accountId" IN (SELECT "accountId" FROM f) AND v2.id NOT IN (SELECT id FROM f)) AS other_vcs_of_these_accounts,
  (SELECT count(*) FROM space s WHERE s."accountId" IN (SELECT "accountId" FROM f) AND s.level=0) AS top_level_spaces_of_these_accounts
FROM f LEFT JOIN "user" u ON u."accountID"=f."accountId" LEFT JOIN organization g ON g."accountID"=f."accountId";
-- G9 the same defect made by the distiller. A KEPT VC whose knowledge source
--    (a space, a knowledge base) is rejected by another finding becomes a new
--    A7 row in the new database. Expect 0 on every row.
\echo --- A7 G9: kept virtual contributors that would lose their knowledge source or owner (expect 0 everywhere)
WITH live_vc AS (SELECT v.* FROM virtual_contributor v WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='virtual_contributor' AND q.id=v.id::text))
SELECT 'kept VC -> rejected space as knowledge source' chk, count(*) FROM live_vc v WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=v."bodyOfKnowledgeID")
UNION ALL SELECT 'kept VC -> rejected knowledge base as knowledge source', count(*) FROM live_vc v WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='knowledge_base' AND q.id=v."bodyOfKnowledgeID")
UNION ALL SELECT 'kept VC, source type space or knowledge base, source row missing (rule missed it)', count(*) FROM live_vc v WHERE v."bodyOfKnowledgeType" IN ('alkemio-space','alkemio-knowledge-base') AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=v."bodyOfKnowledgeID") AND NOT EXISTS (SELECT 1 FROM knowledge_base k WHERE k.id::text=v."bodyOfKnowledgeID")
UNION ALL SELECT 'kept VC whose account is rejected', count(*) FROM live_vc v WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='account' AND q.id=v."accountId"::text)
UNION ALL SELECT 'VC with no account at all', count(*) FROM virtual_contributor v WHERE v."accountId" IS NULL OR NOT EXISTS (SELECT 1 FROM account a WHERE a.id=v."accountId");
-- G10 the secret column. externalConfig is JSON; apiKey should be the
--    encrypted form. "clear provider key" must read 0: a hit is a secret in
--    clear in every backup. No value is printed. The "kept" rows show the
--    column also exists on rows that stay, so a distiller copies it for those
--    and must never write it to a reject log or quarantine table.
\echo --- A7 G10: stored provider keys by state of the persona, engine and shape of the value (no values shown)
SELECT CASE WHEN o.id IS NULL THEN 'kept' ELSE 'rejected: '||o.rule END AS persona, p.engine,
  CASE WHEN x.k ~ '^(sk-|pk-|AIza|xox|gh[pousr]_)' THEN 'CLEAR PROVIDER KEY' WHEN x.k='' THEN 'empty'
       WHEN x.k ~ '^[A-Za-z0-9+/=]+$' AND length(x.k) >= 100 THEN 'encrypted form (base64, 100+ chars)' ELSE 'OTHER, look at it' END AS shape,
  count(*) AS personas
FROM ai_persona p LEFT JOIN orphan o ON o.tbl='ai_persona' AND o.id=p.id::text,
     LATERAL (SELECT CASE WHEN p."externalConfig" ~ '^\s*\{' THEN p."externalConfig"::jsonb->>'apiKey' END AS k) x
WHERE x.k IS NOT NULL GROUP BY 1,2,3 ORDER BY 1,2;
\echo --- A7 G10b: field names inside the stored external configuration (names only) and non-JSON values
SELECT CASE WHEN o.id IS NULL THEN 'kept' ELSE 'rejected' END AS persona, k.k AS field, count(*) AS personas
  FROM ai_persona p LEFT JOIN orphan o ON o.tbl='ai_persona' AND o.id=p.id::text,
       LATERAL jsonb_object_keys(CASE WHEN p."externalConfig" ~ '^\s*\{' THEN p."externalConfig"::jsonb ELSE '{}'::jsonb END) k(k) GROUP BY 1,2
UNION ALL SELECT 'any', 'NOT JSON (unread)', count(*) FROM ai_persona p WHERE coalesce(p."externalConfig",'')<>'' AND p."externalConfig" !~ '^\s*\{'
ORDER BY 1,3 DESC;
-- G11 what "clear the knowledge source" looks like. The repaired shape must
--    be one the product already has: a row with source type none.
\echo --- A7 G11: all virtual contributors by knowledge source type and engine (the repaired shape must already exist)
SELECT v."bodyOfKnowledgeType" AS source_type, p.engine, count(*) AS vcs,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='virtual_contributor' AND q.id=v.id::text)) AS flagged,
       count(*) FILTER (WHERE coalesce(v."bodyOfKnowledgeID",'')='') AS no_source_id,
       count(*) FILTER (WHERE v."listedInStore") AS in_store, max(p."bodyOfKnowledgeLastUpdated")::date AS last_ingest
  FROM virtual_contributor v LEFT JOIN ai_persona p ON p.id=v."aiPersonaID" GROUP BY 1,2 ORDER BY 1,3 DESC;
-- G12 the Repair keep-set: rows classed rejected ONLY because their VC is
--    flagged. A distiller that repairs the VC must copy every one of them.
--    Safest: do not patch by list. Change the rule (missing knowledge source
--    = repair, not orphan) and classify again, so no dependant is ever marked.
--    Rows below the knowledge base callout set (callouts) are in G4.
\echo --- A7 G12: rows that must be kept when the orphaned virtual contributors are repaired
DROP TABLE IF EXISTS a7_keep;
CREATE TEMP TABLE a7_keep AS
WITH f AS (SELECT v.* FROM virtual_contributor v JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text),
     part(what, tbl, id) AS (
       SELECT 'virtual contributor', 'virtual_contributor', f.id::text FROM f
 UNION ALL SELECT 'its actor', 'actor', a.id::text FROM f JOIN actor a ON a.id=f.id
 UNION ALL SELECT 'actor profile', 'profile', a."profileId"::text FROM f JOIN actor a ON a.id=f.id WHERE a."profileId" IS NOT NULL
 UNION ALL SELECT 'actor authorization policy', 'authorization_policy', a."authorizationId"::text FROM f JOIN actor a ON a.id=f.id WHERE a."authorizationId" IS NOT NULL
 UNION ALL SELECT 'AI persona', 'ai_persona', f."aiPersonaID"::text FROM f
 UNION ALL SELECT 'persona authorization policy', 'authorization_policy', p."authorizationId"::text FROM f JOIN ai_persona p ON p.id=f."aiPersonaID" WHERE p."authorizationId" IS NOT NULL
 UNION ALL SELECT 'knowledge base', 'knowledge_base', f."knowledgeBaseId"::text FROM f WHERE f."knowledgeBaseId" IS NOT NULL
 UNION ALL SELECT 'knowledge base profile', 'profile', k."profileId"::text FROM f JOIN knowledge_base k ON k.id=f."knowledgeBaseId"
 UNION ALL SELECT 'knowledge base callout set', 'callouts_set', k."calloutsSetId"::text FROM f JOIN knowledge_base k ON k.id=f."knowledgeBaseId"
 UNION ALL SELECT 'knowledge base authorization policy', 'authorization_policy', k."authorizationId"::text FROM f JOIN knowledge_base k ON k.id=f."knowledgeBaseId"
 UNION ALL SELECT 'below the two profiles: tagset', 'tagset', t.id::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN tagset t ON t."profileId" IN (a."profileId", k."profileId")
 UNION ALL SELECT 'below the two profiles: visual (avatar, banner)', 'visual', t.id::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN visual t ON t."profileId" IN (a."profileId", k."profileId")
 UNION ALL SELECT 'below the two profiles: reference', 'reference', t.id::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN reference t ON t."profileId" IN (a."profileId", k."profileId")
 UNION ALL SELECT 'below the two profiles: location', 'location', pr."locationId"::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN profile pr ON pr.id IN (a."profileId", k."profileId") WHERE pr."locationId" IS NOT NULL
 UNION ALL SELECT 'below the two profiles: storage bucket', 'storage_bucket', pr."storageBucketId"::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN profile pr ON pr.id IN (a."profileId", k."profileId") WHERE pr."storageBucketId" IS NOT NULL
 UNION ALL SELECT 'below the two profiles: file (avatar image and the like)', 'file', fl.id::text FROM f JOIN actor a ON a.id=f.id LEFT JOIN knowledge_base k ON k.id=f."knowledgeBaseId" JOIN profile pr ON pr.id IN (a."profileId", k."profileId") JOIN file fl ON fl."storageBucketId"=pr."storageBucketId"
 UNION ALL SELECT 'role credential on a LIVE space', 'credential', c.id::text FROM f JOIN credential c ON c."actorId"=f.id
            WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID") AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=c."resourceID"))
SELECT what, tbl, id FROM part;
SELECT part.what, count(*) AS rows_, count(*) FILTER (WHERE q.id IS NOT NULL) AS classed_rejected,
       string_agg(DISTINCT q.rule, ',') AS under_rule
  FROM a7_keep part LEFT JOIN (SELECT tbl, id, min(rule) rule FROM orphan GROUP BY 1,2) q ON q.tbl=part.tbl AND q.id=part.id GROUP BY 1 ORDER BY min(part.tbl), 1;
-- G13 traces of the gone knowledge sources: anything that still names the
--    deleted space ids. The engine store is outside this database (G5).
\echo --- A7 G13: what still names the gone knowledge sources (distinct sources per holder)
WITH g AS (SELECT DISTINCT v."bodyOfKnowledgeID" AS sid FROM virtual_contributor v JOIN orphan o ON o.tbl='virtual_contributor' AND o.id=v.id::text AND o.rule='virtual-contributor-body-of-knowledge-gone')
SELECT 'gone sources' AS holder, count(*) AS sources FROM g
UNION ALL SELECT 'still a space row (rule would be wrong)', count(*) FROM g WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text=g.sid)
UNION ALL SELECT 'named by a credential', count(*) FROM g WHERE EXISTS (SELECT 1 FROM credential c WHERE c."resourceID"=g.sid)
UNION ALL SELECT 'named by an activity entry', count(*) FROM g WHERE EXISTS (SELECT 1 FROM activity a WHERE a."resourceID"::text=g.sid OR a."parentID"::text=g.sid)
UNION ALL SELECT 'named by a migration backup table (A1)', count(*) FROM g WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl LIKE '\_%' AND q.id=g.sid);

-- G14-G15 added 2026-11-12 from the A7 ruling: a virtual contributor whose
--    space was deleted is KEPT unchanged, with the id of the gone space, and
--    tracked. G14 is the list to track and to send to the owners. It prints
--    ids and short names: keep the output local.
\echo --- A7 G14: tracked list, one row per virtual contributor whose knowledge source is gone (ids, keep local)
SELECT v.id AS virtual_contributor, a."nameID" AS vc_name,
       CASE WHEN u.id IS NOT NULL THEN 'user' WHEN o.id IS NOT NULL THEN 'organization' ELSE 'NO HOST' END AS owner_kind,
       coalesce(u.id, o.id) AS owner_id,
       v."listedInStore" AS in_store,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text = c."resourceID"
         WHERE c."actorId" = v.id AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id = s.id::text)) AS live_space_roles,
       v."bodyOfKnowledgeID" AS gone_source,
       p."bodyOfKnowledgeLastUpdated"::date AS last_ingest,
       v."dataAccessMode"::text AS data_access
  FROM virtual_contributor v
  JOIN orphan q ON q.tbl='virtual_contributor' AND q.id = v.id::text
  JOIN actor a ON a.id = v.id
  LEFT JOIN ai_persona p ON p.id::text = v."aiPersonaID"::text
  LEFT JOIN "user" u ON u."accountID" = v."accountId"
  LEFT JOIN organization o ON o."accountID" = v."accountId"
 ORDER BY owner_kind, owner_id, vc_name;
-- G15: where the ownerless personas come from. Until the two persona tables
--    were merged (server commit of 2025-09-10) deleting a virtual contributor
--    never removed its AI-server persona row. Rows created after the merge
--    reached the environment mean a generator is live again.
\echo --- A7 G15: ownerless personas by quarter created, next to kept ones (expect no ownerless rows created after the 2025-09 persona merge)
SELECT to_char(p."createdDate",'YYYY-"Q"Q') AS quarter,
       count(*) FILTER (WHERE q.id IS NOT NULL) AS ownerless,
       count(*) FILTER (WHERE q.id IS NULL) AS kept,
       count(*) FILTER (WHERE q.id IS NOT NULL AND p."bodyOfKnowledgeLastUpdated" IS NOT NULL) AS ownerless_that_had_ingested
  FROM ai_persona p
  LEFT JOIN orphan q ON q.tbl='ai_persona' AND q.id = p.id::text AND q.rule NOT LIKE 'dependant%'
 GROUP BY 1 ORDER BY 1;
SELECT max(p."createdDate")::date AS newest_ownerless_persona
  FROM ai_persona p JOIN orphan q ON q.tbl='ai_persona' AND q.id = p.id::text AND q.rule NOT LIKE 'dependant%';

\echo === A8 guards
-- Ownership facts (legacy server db6e9def6):
--   credential."actorId" -> actor.id ON DELETE CASCADE (nullable). Nothing
--   points AT a credential, so deleting one never breaks a link.
--   A credential only has effect when (type, resourceID) matches a criterion
--   in some authorization_policy."credentialRules", or a role definition
--   (role.credential / role."parentCredentials") that membership queries use.
--   Holder NULL comes from migration 1771000007000 (agent -> actor): an agent
--   whose owner row was already gone matched none of the five UPDATEs. The
--   agentId column was dropped in 1771000013000, so the old holder cannot be
--   recovered from this database, only from a pre-migration backup.
--   Space deletion revokes the regular role credentials (member, lead, admin)
--   but leaves the two implicit ones, space-invitee and space-subspace-admin
--   (role.set.service.ts removeAllRoleAssignments revokes the regular role for
--   those holders, never the implicit credential). Live generator.
-- NOTE orphan has one row per credential: a credential that is both holderless
--   and scope-gone carries only the first rule. a8 recomputes both facts.
DROP TABLE IF EXISTS a8;
CREATE TEMP TABLE a8 AS
SELECT c.id, c.type, c."resourceID" AS rid, c."actorId" AS actor, c."createdDate" AS created,
  CASE WHEN c."actorId" IS NULL THEN 'no holder'
       WHEN a.id IS NULL THEN 'holder row missing'
       WHEN EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='actor' AND q.id=a.id::text) THEN 'orphaned '||a.type
       ELSE 'live '||a.type END AS holder,
  (c."resourceID" IS NOT NULL AND c."resourceID"<>'' AND (
        (c.type LIKE 'space-%'        AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID"))
     OR (c.type LIKE 'organization-%' AND NOT EXISTS (SELECT 1 FROM organization g WHERE g.id::text=c."resourceID"))
     OR (c.type LIKE 'account-%'      AND NOT EXISTS (SELECT 1 FROM account n WHERE n.id::text=c."resourceID"))
     OR (c.type = 'user-self'         AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=c."resourceID")))
   AND NOT EXISTS (SELECT 1 FROM actor x WHERE x.id::text=c."resourceID")) AS scope_gone,
  o.rule
FROM credential c LEFT JOIN actor a ON a.id=c."actorId"
LEFT JOIN orphan o ON o.tbl='credential' AND o.id=c.id::text;
-- G1 deletion record: what goes, who holds it, when it was created. A
--    last_created after the last release means the generator is still live.
\echo --- A8 G1: credentials on a deleted space / organization / account / user, by type and holder
SELECT type, holder, count(*) AS credentials, count(DISTINCT rid) AS gone_resources,
       min(created)::date AS first_created, max(created)::date AS last_created
  FROM a8 WHERE scope_gone GROUP BY 1,2 ORDER BY 1,2;
-- G2 soundness: is the "deleted" thing really gone, and does nothing live
--    still read these credentials? Expect 0 on rows 1-3. A hit on row 2 is the
--    C8 case (a role definition scoped to another space's id): the holder is a
--    real member of a live space and the credential must be KEPT and the
--    definition repaired. Row 4 is information: types the rule never tests.
\echo --- A8 G2: soundness (expect 0 on the first three rows)
WITH g AS (SELECT * FROM a8 WHERE scope_gone),
live_role AS (SELECT r.* FROM role r WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='role' AND q.id=r.id::text)),
defs AS (
  SELECT r.id AS role_id, r.credential->>'type' AS type, r.credential->>'resourceID' AS rid FROM live_role r
  UNION ALL
  SELECT r.id, k->>'type', k->>'resourceID' FROM live_role r,
         jsonb_array_elements(CASE WHEN jsonb_typeof(r."parentCredentials")='array' THEN r."parentCredentials" ELSE '[]'::jsonb END) k),
crit AS (
  SELECT DISTINCT k->>'type' AS type, k->>'resourceID' AS rid
    FROM authorization_policy p,
         jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) r,
         jsonb_array_elements(CASE WHEN jsonb_typeof(r->'criterias')='array' THEN r->'criterias' ELSE '[]'::jsonb END) k
   WHERE k->>'resourceID' <> ''
     AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='authorization_policy' AND q.id=p.id::text))
SELECT 1 AS n, 'gone resource id is some other live thing (actor, group, role set, community)' AS chk, count(*) FROM g
  WHERE EXISTS (SELECT 1 FROM actor x WHERE x.id::text=g.rid) OR EXISTS (SELECT 1 FROM user_group x WHERE x.id::text=g.rid)
     OR EXISTS (SELECT 1 FROM role_set x WHERE x.id::text=g.rid) OR EXISTS (SELECT 1 FROM community x WHERE x.id::text=g.rid)
UNION ALL SELECT 2, 'a live role definition still names this type + resource (KEEP, repair definition)', count(*) FROM g
  WHERE EXISTS (SELECT 1 FROM defs d WHERE d.type=g.type AND d.rid=g.rid)
UNION ALL SELECT 3, 'a live authorization policy still grants on this type + resource', count(*) FROM g
  WHERE EXISTS (SELECT 1 FROM crit k WHERE k.type=g.type AND k.rid=g.rid)
UNION ALL SELECT 4, 'info: credentials with a resource id whose type no rule tests', count(*) FROM a8
  WHERE rid<>'' AND type NOT LIKE 'space-%' AND type NOT LIKE 'organization-%' AND type NOT LIKE 'account-%' AND type<>'user-self'
ORDER BY 1;
-- G3 the holderless credentials. No actor means nobody can present them, so
--    they grant nothing today. The question is only whether a live thing lost
--    its last holder: sole_on_live_resource > 0 means a live space /
--    organization / account has this role held by nobody else. That is a
--    REPAIR case (find the holder in a pre-migration backup), not a delete.
\echo --- A8 G3: holderless credentials by type and target
SELECT h.type,
  CASE WHEN h.rid='' THEN 'global (no resource)' WHEN h.scope_gone THEN 'resource gone'
       WHEN EXISTS (SELECT 1 FROM orphan q WHERE q.id=h.rid AND q.tbl IN ('account','organization','space','user')) THEN 'resource rejected by another finding'
       ELSE 'resource LIVE' END AS target,
  count(*) AS credentials,
  count(*) FILTER (WHERE h.rid<>'' AND NOT h.scope_gone
     AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.id=h.rid AND q.tbl IN ('account','organization','space','user'))
     AND NOT EXISTS (
     SELECT 1 FROM a8 o WHERE o.type=h.type AND o.rid=h.rid AND o.holder LIKE 'live %')) AS sole_on_live_resource,
  min(h.created)::date AS first_created, max(h.created)::date AS last_created
  FROM a8 h WHERE h.holder IN ('no holder','holder row missing') GROUP BY 1,2 ORDER BY 2,1;
-- G4 lost pointers on the live side. Expect 0. A live user without the two
--    credentials every user gets at registration may be the lost holder of a
--    holderless row.
\echo --- A8 G4: lost pointers (expect 0 everywhere)
WITH live_user AS (SELECT u.id FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='user' AND q.id=u.id::text))
SELECT 'live user without user-self' chk, count(*) FROM live_user u
  WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type='user-self')
UNION ALL SELECT 'live user whose user-self names another id', count(*) FROM live_user u
  WHERE EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type='user-self' AND c."resourceID"<>u.id::text)
UNION ALL SELECT 'live user without global-registered', count(*) FROM live_user u
  WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type='global-registered')
UNION ALL SELECT 'live user holding no credential at all', count(*) FROM live_user u
  WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id);
-- G5 followers: credentials whose holder is itself an orphan. They follow
--    their holder's ruling. Holders ruled KEEP AND TRACK under A7 (virtual
--    contributor with a live account) keep their credentials on live spaces.
\echo --- A8 G5: credentials held by orphaned actors, by the rule of the holder
SELECT f.holder, coalesce(ho.tbl||': '||ho.rule, 'actor only') AS holder_rule,
  CASE WHEN ho.tbl='virtual_contributor' AND EXISTS (
         SELECT 1 FROM virtual_contributor v JOIN account n ON n.id=v."accountId"
          WHERE v.id=f.actor AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='account' AND q.id=n.id::text))
       THEN 'KEEP with the tracked VC' ELSE 'follows the holder' END AS ruling,
  f.type, count(*) AS credentials, count(*) FILTER (WHERE f.scope_gone) AS also_scope_gone
  FROM a8 f LEFT JOIN orphan ho ON ho.id=f.actor::text AND ho.tbl IN ('account','virtual_contributor','user','organization','space')
 WHERE f.holder LIKE 'orphaned %' GROUP BY 1,2,3,4 ORDER BY 1,2,4;
-- G6 detail behind G2 row 3: every live policy that still names a gone
--    type + id, by the table that owns the policy, the rule and the privilege.
--    A rule that only lets a holder read its own data is no access for anyone
--    else (G7 proves that). Anything else here needs a look before a reject.
\echo --- A8 G6: live policies that still name a gone type + id, by owner, rule and privilege
DROP TABLE IF EXISTS a8_crit;
CREATE TEMP TABLE a8_crit AS
SELECT p.id AS pid, p.type AS ptype, r->>'name' AS rule_name, r->'grantedPrivileges' AS privs, k->>'type' AS type, k->>'resourceID' AS rid,
       EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='authorization_policy' AND q.id=p.id::text) AS pol_orphan
  FROM authorization_policy p,
       jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) r,
       jsonb_array_elements(CASE WHEN jsonb_typeof(r->'criterias')='array' THEN r->'criterias' ELSE '[]'::jsonb END) k
 WHERE k->>'resourceID' <> '' AND EXISTS (SELECT 1 FROM a8 g WHERE g.scope_gone AND g.type=k->>'type' AND g.rid=k->>'resourceID');
DROP TABLE IF EXISTS a8_own;
CREATE TEMP TABLE a8_own (pid uuid, owner text, owner_id text);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%' LOOP
    EXECUTE format('INSERT INTO a8_own SELECT t."authorizationId", %L, t.id::text FROM %I t WHERE t."authorizationId" IN (SELECT pid FROM a8_crit WHERE NOT pol_orphan)', r.table_name, r.table_name);
  END LOOP; END $$;
SELECT CASE WHEN c.pol_orphan THEN 'rejected with its policy (A9)' ELSE 'LIVE policy' END AS policy_state,
       count(DISTINCT c.pid) AS policies, count(DISTINCT (c.type, c.rid)) AS gone_type_and_id
  FROM a8_crit c GROUP BY 1 ORDER BY 1;
SELECT coalesce(o.owner,'(no owner)') AS live_policy_owned_by, c.type AS credential_type, c.rule_name, c.privs::text AS privileges,
       count(DISTINCT c.pid) AS policies, count(DISTINCT c.rid) AS gone_ids
  FROM a8_crit c LEFT JOIN a8_own o ON o.pid=c.pid WHERE NOT c.pol_orphan GROUP BY 1,2,3,4 ORDER BY 2,1;
SELECT g.type, g.holder, count(*) AS credentials_matched_by_a_live_policy, count(DISTINCT g.rid) AS gone_ids, count(DISTINCT g.actor) AS holders
  FROM a8 g WHERE g.scope_gone AND EXISTS (SELECT 1 FROM a8_crit c WHERE NOT c.pol_orphan AND c.type=g.type AND c.rid=g.rid) GROUP BY 1,2 ORDER BY 1,2;
-- G7 the access that a reject would take away: a user's own policy lets the
--    admins of the user's spaces and organizations read the user's personal
--    data. If the space is gone but both credentials stayed, the old admin can
--    still read it. Expect reader_is_someone_else = 0; a hit is access that
--    exists today and ends with the reject, so it must be a decision.
\echo --- A8 G7: who can read whose personal data through a gone space or organization (expect 0 for someone else)
WITH own AS (SELECT DISTINCT c.type, c.rid, a.id AS subject, c.pid
               FROM a8_crit c JOIN actor a ON a."authorizationId"=c.pid
              WHERE NOT c.pol_orphan AND c.rule_name='credentialRule-userReadPii'),
pair AS (SELECT o.subject, o.pid, g.actor AS reader, o.rid FROM own o JOIN a8 g ON g.scope_gone AND g.type=o.type AND g.rid=o.rid AND g.actor IS NOT NULL)
SELECT count(DISTINCT subject) AS users_whose_policy_names_a_gone_thing, count(DISTINCT reader) AS holders_matching,
       count(*) AS pairs, count(*) FILTER (WHERE subject=reader) AS reader_is_the_user,
       count(*) FILTER (WHERE subject<>reader) AS reader_is_someone_else
  FROM pair;
SELECT c.rule_name, coalesce(o.owner,'(no owner)') AS live_policy_owned_by, count(DISTINCT c.pid) AS policies,
       (SELECT count(*) FROM a8 g WHERE g.type=c.type AND g.rid=c.rid AND g.actor IS NOT NULL) AS holders_with_an_actor
  FROM a8_crit c LEFT JOIN a8_own o ON o.pid=c.pid
 WHERE NOT c.pol_orphan AND c.rule_name<>'credentialRule-userReadPii' GROUP BY 1,2,c.type,c.rid ORDER BY 1,2;
-- G8 the holderless credentials that are the only holder of a role on a row
--    that still exists: is that row kept or rejected, and is anything under it.
--    Rejected resource: the credential follows it. Kept resource: nobody holds
--    the role today and the old holder was already deleted, so there is nothing
--    to restore. An organization without an owner is VALID data (user ruling
--    2026-11-12): keep it as it is, never reject or repair it for that reason.
--    The second result is a baseline only. A kept account without an
--    account-admin needs a look.
\echo --- A8 G8: holderless sole holders, by the state of the resource
WITH h AS (SELECT * FROM a8 h WHERE h.holder IN ('no holder','holder row missing') AND h.rid<>'' AND NOT h.scope_gone
            AND NOT EXISTS (SELECT 1 FROM a8 o WHERE o.type=h.type AND o.rid=h.rid AND o.holder LIKE 'live %'))
SELECT h.type, h.created::date AS created,
  CASE WHEN h.type LIKE 'account-%' THEN
         CASE WHEN EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"::text=h.rid) THEN 'user-hosted'
              WHEN EXISTS (SELECT 1 FROM organization g WHERE g."accountID"::text=h.rid) THEN 'organization-hosted' ELSE 'NO HOST' END
       ELSE '' END AS account_host,
  coalesce((SELECT string_agg(DISTINCT q.rule, ',') FROM orphan q WHERE q.id=h.rid AND q.tbl IN ('account','organization','space','user')), 'KEPT') AS resource_state,
  (SELECT count(*) FROM space s WHERE s."accountId"::text=h.rid) AS spaces_in_account,
  (SELECT count(*) FROM virtual_contributor v WHERE v."accountId"::text=h.rid) AS vcs_in_account,
  (SELECT count(*) FROM a8 o WHERE o.rid=h.rid AND o.holder LIKE 'live %') AS other_live_credentials_on_it
FROM h ORDER BY 1,2;
SELECT count(*) AS kept_organizations,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM a8 o WHERE o.type='organization-owner' AND o.rid=g.id::text AND o.holder LIKE 'live %')) AS with_no_owner_today
  FROM organization g WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='organization' AND q.id=g.id::text);
-- G9 a gone space id must not be the parent or the top-level space of any
--    space row. A hit means part of the tree survived its parent (A3).
\echo --- A8 G9: gone space ids still used as parent or as top-level space (expect 0, 0)
SELECT count(DISTINCT g.rid) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s."parentSpaceId"::text=g.rid)) AS as_parent,
       count(DISTINCT g.rid) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s."levelZeroSpaceID"::text=g.rid)) AS as_top_level,
       count(DISTINCT g.rid) AS gone_space_ids
  FROM a8 g WHERE g.scope_gone AND g.type LIKE 'space-%';
-- G10 who is touched by the reject of the scope-gone credentials.
\echo --- A8 G10: holders of credentials on gone things, by kind of holder
SELECT g.holder, count(DISTINCT g.actor) AS holders, count(*) AS credentials FROM a8 g WHERE g.scope_gone GROUP BY 1 ORDER BY 1;
-- G11 information: credentials of a space type whose resource id is not a
--    space but some other actor. The rule does not call them gone (see the
--    classifier). They are kept; credential hygiene is finding C4.
\echo --- A8 G11: credentials of a space, organization or account type whose resource is some other actor (kept)
SELECT c.type, a.type AS holder_kind, x.type AS resource_is, (c."resourceID"=c."actorId"::text) AS resource_is_the_holder,
       EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='actor' AND q.id=x.id::text) AS resource_rejected,
       count(*) AS credentials, min(c."createdDate")::date AS first_created, max(c."createdDate")::date AS last_created
  FROM credential c JOIN actor x ON x.id::text=c."resourceID" LEFT JOIN actor a ON a.id=c."actorId"
 WHERE (c.type LIKE 'space-%'        AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID"))
    OR (c.type LIKE 'organization-%' AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id::text=c."resourceID"))
    OR (c.type LIKE 'account-%'      AND NOT EXISTS (SELECT 1 FROM account n WHERE n.id::text=c."resourceID"))
 GROUP BY 1,2,3,4,5 ORDER BY 1;
-- G12 generator check on rows that are kept: the subspace-admin credential is
--    granted on the PARENT space when someone becomes admin of a subspace. If
--    the holder administers no direct subspace of that space any more, the
--    credential is a leftover on a live space. Read on server develop
--    39d7aff38 (2026-11-10): the grant names the parent space, the revoke names
--    the subspace itself, so the revoke finds nothing. Not reproduced live.
--    These rows are valid for the classifier and are KEPT; this is a C4 topic.
\echo --- A8 G12: subspace-admin credentials on existing spaces whose holder administers no direct subspace (information, kept)
SELECT count(*) AS subspace_admin_credentials_on_existing_spaces,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM space ch JOIN credential a ON a.type='space-admin' AND a."resourceID"=ch.id::text AND a."actorId"=c."actorId"
                                           WHERE ch."parentSpaceId"::text=c."resourceID")) AS holder_administers_no_direct_subspace,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"::text=c."resourceID")) AS space_has_no_subspace_at_all,
       max(c."createdDate")::date AS last_created
  FROM credential c
 WHERE c.type='space-subspace-admin' AND c."actorId" IS NOT NULL AND EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID");
\echo === A9 guards
-- Ownership facts (legacy server db6e9def6):
--   Every entity points AT its policy through a column named authorizationId
--   (FK ON DELETE SET NULL). A policy never points at its owner, so "unowned"
--   means no authorizationId column anywhere holds its id.
--   authorization_policy."parentAuthorizationPolicyId" -> authorization_policy
--   ON DELETE SET NULL. The server reads it in one place: the space
--   authorization reset (space.service.authorization.ts). A space below L0, or
--   a private one, that is reset on its own with no stored parent throws
--   "Non L0 or private Space found without a parent Authorization set".
--   Access checks read only the rules stored on the policy itself; an entity
--   whose authorizationId is NULL throws "Authorization: no definition
--   provided" on every access check until a reset creates a policy.
DROP TABLE IF EXISTS a9;
CREATE TEMP TABLE a9 AS
SELECT p.id, p.type, p."parentAuthorizationPolicyId" AS parent, p."createdDate" AS created, o.rule, o.round
FROM authorization_policy p JOIN orphan o ON o.tbl='authorization_policy' AND o.id=p.id::text;
CREATE INDEX ON a9(id);

\echo --- A9 G1: deletion record, orphaned policies by rule and type
SELECT rule, type, count(*) AS policies, min(created)::date AS first_created, max(created)::date AS last_created
FROM a9 GROUP BY 1,2 ORDER BY 1, 3 DESC;

\echo --- A9 G2: cross-link, live policies whose stored parent is an orphaned policy (expect 0; a hit loses its parent on delete)
SELECT p.type AS live_policy_type, a.rule AS parent_rule, count(*) AS live_policies,
       count(*) FILTER (WHERE s.id IS NOT NULL AND s.level > 0) AS of_live_subspaces
FROM authorization_policy p
JOIN a9 a ON a.id = p."parentAuthorizationPolicyId"
LEFT JOIN actor ac ON ac."authorizationId" = p.id
LEFT JOIN space s ON s.id = ac.id
WHERE NOT EXISTS (SELECT 1 FROM a9 x WHERE x.id = p.id)
GROUP BY 1,2 ORDER BY 3 DESC;

\echo --- A9 G3: soundness, columns that could hold a policy id under another name (info; only authorizationId and the parent link are expected)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND column_name ILIKE '%authorization%'
  AND column_name NOT IN ('authorizationId','parentAuthorizationPolicyId') AND table_name NOT LIKE '\_%'
ORDER BY 1,2;

\echo --- A9 G4: lost pointers, live rows whose authorizationId is NULL, by table (expect 0; a hit fails every access check until a reset)
DROP TABLE IF EXISTS a9_null;
CREATE TEMP TABLE a9_null (tbl text, live_rows_without_policy bigint);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns
           WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%' LOOP
    EXECUTE format(
      'INSERT INTO a9_null SELECT %L, count(*) FROM %I t WHERE t."authorizationId" IS NULL
         AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=%L AND o.id=t.id::text)',
      r.table_name, r.table_name, r.table_name);
  END LOOP;
END $$;
SELECT * FROM a9_null WHERE live_rows_without_policy > 0 ORDER BY 2 DESC;
\echo --- A9 G4b: file rows without a policy, split (a whiteboard or memo body has none by design; expect 0 on every other row)
SELECT CASE WHEN EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text) THEN '1 body of a whiteboard (by design)'
            WHEN EXISTS (SELECT 1 FROM memo m WHERE m."contentPointer"=f.id::text) THEN '2 body of a memo (by design)'
            ELSE '3 other file: '||coalesce((SELECT p.type::text FROM profile p WHERE p."storageBucketId"=f."storageBucketId" LIMIT 1),
                                           CASE WHEN f."storageBucketId" IS NULL THEN 'no bucket' ELSE 'bucket without a profile' END) END AS kind,
       count(*) AS files,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=f.id::text)) AS already_orphaned,
       count(*) FILTER (WHERE f."createdBy" IS NOT NULL) AS with_creator, min(f."createdDate")::date AS oldest, max(f."createdDate")::date AS newest
  FROM file f WHERE f."authorizationId" IS NULL GROUP BY 1 ORDER BY 1;
\echo --- A9 G4c soundness: every whiteboard and memo has exactly one body file (expect the two counts equal on each row, and 0 without)
SELECT 'whiteboard' AS tbl, count(*) AS rows, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file f WHERE f.id::text=w."contentPointer")) AS with_body_file,
       count(*) FILTER (WHERE "contentPointer" IS NULL OR "contentPointer"='') AS without_pointer FROM whiteboard w
UNION ALL SELECT 'memo', count(*), count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file f WHERE f.id::text=m."contentPointer")),
       count(*) FILTER (WHERE "contentPointer" IS NULL OR "contentPointer"='') FROM memo m;

\echo --- A9 G4d soundness: file rows classed as orphaned that are the body of a LIVE whiteboard or memo (expect 0; rejecting such a row empties a live board)
SELECT x.kind, count(*) AS body_files_classed_orphaned,
       count(*) FILTER (WHERE NOT x.owner_orphaned) AS owner_is_live,
       string_agg(DISTINCT x.rule, ', ') FILTER (WHERE NOT x.owner_orphaned) AS file_rules_that_hit_a_live_owner
  FROM (SELECT 'whiteboard' AS kind, o.rule, EXISTS (SELECT 1 FROM orphan w2 WHERE w2.tbl='whiteboard' AND w2.id=w.id::text) AS owner_orphaned
          FROM orphan o JOIN whiteboard w ON w."contentPointer"=o.id WHERE o.tbl='file'
        UNION ALL
        SELECT 'memo', o.rule, EXISTS (SELECT 1 FROM orphan m2 WHERE m2.tbl='memo' AND m2.id=m.id::text)
          FROM orphan o JOIN memo m ON m."contentPointer"=o.id WHERE o.tbl='file') x GROUP BY 1;

\echo --- A9 G5: one policy shared by two live owners (expect 0; a delete or reset of one owner changes the other)
SELECT count(*) AS shared_policies FROM (SELECT id FROM auth_ref GROUP BY id HAVING count(*) > 1) s;

\echo --- A9 G6: policies holding a credential rule with empty criteria, live against orphaned (a live hit throws on access checks; expect 0 live)
SELECT CASE WHEN EXISTS (SELECT 1 FROM a9 x WHERE x.id=p.id) THEN 'orphaned policy' ELSE 'LIVE policy' END AS policy,
       p.type, count(DISTINCT p.id) AS policies, count(*) AS empty_rules
FROM authorization_policy p
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) r
WHERE jsonb_typeof(r->'criterias') IS DISTINCT FROM 'array' OR jsonb_array_length(r->'criterias') = 0
GROUP BY 1,2 ORDER BY 1,3 DESC;

-- G7 kept and tracked (A7 ruling 2026-11-12): the virtual contributors whose
--    knowledge source is gone are KEPT, with everything under them. Their
--    policies are classed as dependants here and must be copied with their
--    owners. a7_keep comes from A7 G12.
\echo --- A9 G7: policies owned by rows kept with the tracked virtual contributors (KEEP; classed_rejected shows what the classifier would drop)
DROP TABLE IF EXISTS a9_keep_pol;
CREATE TEMP TABLE a9_keep_pol (owner_tbl text, id uuid);
INSERT INTO a9_keep_pol SELECT 'named in A7 G12', id::uuid FROM a7_keep WHERE tbl='authorization_policy';
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns
           WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%' LOOP
    EXECUTE format(
      'INSERT INTO a9_keep_pol SELECT %L, t."authorizationId" FROM %I t JOIN a7_keep k ON k.tbl=%L AND k.id=t.id::text
        WHERE t."authorizationId" IS NOT NULL', r.table_name, r.table_name, r.table_name);
  END LOOP;
END $$;
SELECT coalesce(x.owner_tbl,'ALL') AS owner_table, count(DISTINCT x.id) AS policies,
       count(DISTINCT x.id) FILTER (WHERE EXISTS (SELECT 1 FROM a9 a WHERE a.id=x.id)) AS classed_rejected
  FROM (SELECT DISTINCT ON (id) owner_tbl, id FROM a9_keep_pol ORDER BY id, (owner_tbl='named in A7 G12'), owner_tbl) x
 GROUP BY ROLLUP (x.owner_tbl) ORDER BY (x.owner_tbl IS NULL), 2 DESC;
\echo --- A9 G7b soundness: callouts inside the kept knowledge-base callout sets (expect 0; a hit means more rows and policies to keep)
SELECT count(*) AS callouts FROM callout c JOIN a7_keep k ON k.tbl='callouts_set' AND k.id=c."calloutsSetId"::text;

-- G8 the empty rule explained (server develop 39d7aff38,
--    conversation.service.authorization.ts): the conversation policy holds one
--    rule, built from the USER members only. A conversation with no user member
--    gets a rule with no criteria; room, storage aggregator and bucket inherit
--    it. authorization.service.ts isCredentialMatch throws "Credential rule
--    without criteria" when a caller with at least one credential is checked
--    against such a rule. A hit on the row "has a user member" is unexplained.
\echo --- A9 G8: live conversations by who is in them, against a policy with an empty rule (expect empty rule only where no user is a member)
SELECT CASE WHEN m.users > 0 THEN '3 has a user member' WHEN m.n > 0 THEN '2 only virtual contributors' ELSE '1 no member at all' END AS members,
       count(*) AS conversations,
       count(*) FILTER (WHERE e.id IS NOT NULL) AS policy_has_empty_rule,
       count(*) FILTER (WHERE e.id IS NOT NULL AND r."messagesCount" > 0) AS of_those_with_messages
  FROM conversation c
  LEFT JOIN (SELECT cm."conversationId", count(*) n, count(*) FILTER (WHERE a.type='user') users
               FROM conversation_membership cm JOIN actor a ON a.id=cm."actorId" GROUP BY 1) m ON m."conversationId"=c.id
  LEFT JOIN room r ON r.id=c."roomId"
  LEFT JOIN (SELECT DISTINCT p.id FROM authorization_policy p
              CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) x
              WHERE jsonb_typeof(x->'criterias') IS DISTINCT FROM 'array' OR jsonb_array_length(x->'criterias')=0) e ON e.id=c."authorizationId"
 WHERE NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='conversation' AND o.id=c.id::text)
 GROUP BY 1 ORDER BY 1;

-- G9 retired names. The lists are the AuthorizationCredential and
--    AuthorizationPrivilege enums of server develop 39d7aff38 (2026-11-10).
--    REFRESH BOTH LISTS when the server version of the data set differs.
--    A retired credential type never matches. A retired privilege name that
--    reaches a GraphQL enum field (myPrivileges) fails the response.
\echo --- A9 G9: policies holding a credential type or privilege name the server no longer knows, live against orphaned (expect 0 LIVE)
DROP TABLE IF EXISTS a9_cred; CREATE TEMP TABLE a9_cred(v text);
INSERT INTO a9_cred SELECT unnest(string_to_array('global-anonymous global-guest global-registered platform-operations-admin platform-roles-admin platform-content-full-access platform-resource-admin platform-settings-admin platform-users-admin platform-support platform-license-manager platform-spaces-reader platform-audit-reader feature-beta-tester feature-virtual-assistant feature-organization-creator feature-vc-campaign user-self account-admin space-admin space-member space-lead space-subspace-admin space-invitee organization-owner organization-admin organization-associate user-group-member',' '));
DROP TABLE IF EXISTS a9_priv; CREATE TEMP TABLE a9_priv(v text);
INSERT INTO a9_priv SELECT unnest(string_to_array('create read update delete grant platform-roles-assign authorization-reset license-reset platform-operations-admin platform-settings-admin contribute create-callout create-post create-discussion create-message create-message-reply create-message-reaction create-whiteboard create-space create-subspace create-organization create-virtual-contributor create-innovation-pack create-innovation-hub file-upload file-delete update-innovation-flow roleset-entry-role-join roleset-entry-role-apply roleset-entry-role-invite roleset-entry-role-invite-accept roleset-entry-role-assign roleset-entry-role-assign-organization community-assign-vc-from-account update-callout-publisher read-about read-license read-users read-user-pii read-user-settings move-post move-contribution move-task access-interactive-guidance access-virtual-assistant update-content receive-notifications receive-notifications-admin receive-notifications-organization-admin receive-notifications-space-admin receive-notifications-space-lead transfer-resource-offer transfer-resource-accept account-license-manage public-share feature-role-assign platform-content-full-access platform-promote-manage platform-users-admin platform-support-org-resources platform-support-org-membership platform-support-lists-read platform-licensing-lists-read platform-forum-manage delete-organization platform-audit-read platform-role-holders-read feature-role-holders-read set-service-profile update-nameid',' '));
DROP TABLE IF EXISTS a9_stale;
CREATE TEMP TABLE a9_stale AS
SELECT p.id, 'retired credential type' AS what, c->>'type' AS name
  FROM authorization_policy p
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) r
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r->'criterias')='array' THEN r->'criterias' ELSE '[]'::jsonb END) c
 WHERE NOT EXISTS (SELECT 1 FROM a9_cred x WHERE x.v=c->>'type')
UNION ALL
SELECT p.id, 'retired privilege name', g
  FROM authorization_policy p
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) r
  CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(r->'grantedPrivileges')='array' THEN r->'grantedPrivileges' ELSE '[]'::jsonb END) g
 WHERE NOT EXISTS (SELECT 1 FROM a9_priv x WHERE x.v=g)
UNION ALL
SELECT p.id, 'retired privilege name', g.g
  FROM authorization_policy p
  CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."privilegeRules")='array' THEN p."privilegeRules" ELSE '[]'::jsonb END) r
  CROSS JOIN LATERAL (SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(r->'grantedPrivileges')='array' THEN r->'grantedPrivileges' ELSE '[]'::jsonb END) AS g
                      UNION ALL SELECT r->>'sourcePrivilege') g
 WHERE g.g IS NOT NULL AND NOT EXISTS (SELECT 1 FROM a9_priv x WHERE x.v=g.g);
SELECT CASE WHEN EXISTS (SELECT 1 FROM a9 x WHERE x.id=s.id) THEN 'orphaned policy' ELSE 'LIVE policy' END AS policy, what,
       count(DISTINCT id) AS policies, count(DISTINCT name) AS names, string_agg(DISTINCT name, ', ') AS which
  FROM a9_stale s GROUP BY 1,2 ORDER BY 1,2;
\echo --- A9 G9b: of the orphaned policies with a retired name, direct against dependant (info)
SELECT a.rule='authorization-policy-unowned' AS referenced_by_nothing, count(DISTINCT s.id) AS policies
  FROM a9_stale s JOIN a9 a ON a.id=s.id GROUP BY 1;

\echo --- A9 G9c: kept-and-tracked policies (G7) holding a retired name or an empty rule (expect 0; a hit must be rewritten by an authorization reset before or after the copy)
SELECT count(DISTINCT k.id) AS kept_policies,
       count(DISTINCT k.id) FILTER (WHERE EXISTS (SELECT 1 FROM a9_stale s WHERE s.id=k.id)) AS with_retired_name,
       count(DISTINCT k.id) FILTER (WHERE EXISTS (SELECT 1 FROM authorization_policy p CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p."credentialRules")='array' THEN p."credentialRules" ELSE '[]'::jsonb END) x
                                                   WHERE p.id=k.id AND (jsonb_typeof(x->'criterias') IS DISTINCT FROM 'array' OR jsonb_array_length(x->'criterias')=0))) AS with_empty_rule,
       min(p2."updatedDate")::date AS oldest_update, max(p2."updatedDate")::date AS newest_update
  FROM a9_keep_pol k JOIN authorization_policy p2 ON p2.id=k.id;

\echo --- A9 G10: generator trend, policies referenced by nothing by month of creation, last 12 months (info; a non-zero recent month means something still leaves policies behind)
SELECT to_char(created,'YYYY-MM') AS month, count(*) AS policies, count(DISTINCT type) AS types,
       (array_agg(type ORDER BY n DESC))[1] AS most_frequent_type
  FROM (SELECT a9.*, count(*) OVER (PARTITION BY to_char(created,'YYYY-MM'), type) AS n FROM a9
         WHERE rule='authorization-policy-unowned' AND created >= (SELECT max("createdDate") FROM authorization_policy) - interval '12 months') z
 GROUP BY 1 ORDER BY 1;

\echo --- A9 G10b: generator hint, policies referenced by nothing by whether rules were ever written into them (info; no rules = owner never got an authorization pass)
SELECT CASE WHEN created >= (SELECT max("createdDate") FROM authorization_policy) - interval '12 months' THEN 'created in the last 12 months' ELSE 'older' END AS age,
       count(*) AS policies,
       count(*) FILTER (WHERE jsonb_typeof(p."credentialRules")<>'array' OR jsonb_array_length(p."credentialRules")=0) AS without_any_rule,
       count(*) FILTER (WHERE p."updatedDate" > p."createdDate" + interval '1 minute') AS updated_after_creation
  FROM a9 JOIN authorization_policy p ON p.id=a9.id WHERE a9.rule='authorization-policy-unowned' GROUP BY 1 ORDER BY 1;

\echo --- A9 G11: files without a policy that are no whiteboard or memo body, by holder of their bucket (info; each row needs an owner who says it is by design)
SELECT CASE WHEN EXISTS (SELECT 1 FROM profile p JOIN memo m ON m."profileId"=p.id WHERE p."storageBucketId"=f."storageBucketId") THEN 'bucket of a memo profile'
            WHEN EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=f."storageBucketId") THEN 'bucket of another profile'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator sa JOIN conversation c ON c."storageAggregatorId"=sa.id WHERE sa."directStorageId"=f."storageBucketId") THEN 'direct bucket of a conversation'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator sa JOIN space sp ON sp."storageAggregatorId"=sa.id WHERE sa."directStorageId"=f."storageBucketId") THEN 'direct bucket of a space'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator sa WHERE sa."directStorageId"=f."storageBucketId") THEN 'direct bucket of another aggregator'
            WHEN EXISTS (SELECT 1 FROM media_gallery g WHERE g."storageBucketId"=f."storageBucketId") THEN 'bucket of a media gallery'
            WHEN f."storageBucketId" IS NULL THEN 'no bucket'
            ELSE 'bucket nothing points at, aggregator type '||coalesce((SELECT sa.type::text FROM storage_bucket b JOIN storage_aggregator sa ON sa.id=b."storageAggregatorId" WHERE b.id=f."storageBucketId"),'none') END AS holder,
       count(*) AS files, count(DISTINCT f."storageBucketId") AS buckets, string_agg(DISTINCT f."mimeType", ', ') AS mime_types,
       count(*) FILTER (WHERE f."createdBy" IS NOT NULL) AS with_creator,
       count(*) FILTER (WHERE (SELECT b."authorizationId" FROM storage_bucket b WHERE b.id=f."storageBucketId") IS NOT NULL) AS bucket_has_policy,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=f.id::text)) AS classed_orphaned,
       min(f."createdDate")::date AS oldest, max(f."createdDate")::date AS newest
  FROM file f WHERE f."authorizationId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text) AND NOT EXISTS (SELECT 1 FROM memo m WHERE m."contentPointer"=f.id::text)
 GROUP BY 1 ORDER BY 2 DESC;

-- A9 narrowing of the generator (added 2026-11-12). Facts from the server code
-- (develop 39d7aff38): every FK from an owner table to authorization_policy is
-- ON DELETE SET NULL, so deleting a policy never removes its owner and deleting
-- an owner never removes its policy; the service code must do it. Two
-- migrations delete conversation, room and conversations_set rows by SQL and
-- leave their policies: 1764897584127-conversationArchitectureRefactor
-- (2025-12-05) and 1769181627991-cleanupOrphanedConversationRooms (2026-01-23).
\echo --- A9 G12: policies referenced by nothing created in the last 12 months of the data, grouped by sets created within 20 seconds (info; names the shape of each generator)
DROP TABLE IF EXISTS a9_lk; DROP TABLE IF EXISTS a9_lkc; DROP TABLE IF EXISTS a9_sig; DROP TABLE IF EXISTS a9_sg;
CREATE TEMP TABLE a9_lk AS
SELECT p.id, p.type, p."createdDate" c, p."updatedDate" u,
       (p."credentialRules"::text IN ('[]','') AND p."privilegeRules"::text IN ('[]','')) AS norule
  FROM orphan q JOIN authorization_policy p ON p.id::text=q.id
 WHERE q.tbl='authorization_policy' AND q.rule='authorization-policy-unowned'
   AND p."createdDate" >= (SELECT max("createdDate") FROM authorization_policy) - interval '12 months';
CREATE TEMP TABLE a9_lkc AS
SELECT *, sum(brk) OVER (ORDER BY c) AS cl FROM (
  SELECT *, CASE WHEN c - lag(c) OVER (ORDER BY c) > interval '20 seconds' THEN 1 ELSE 0 END brk
    FROM a9_lk WHERE type <> 'communication-messaging') x;
CREATE TEMP TABLE a9_sig AS
SELECT cl, min(c0) c0, max(c1) c1, sum(k) n, bool_and(norule) all_norule, string_agg(type||'='||k, ', ' ORDER BY type) sig
  FROM (SELECT cl, type, count(*) k, min(c) c0, max(c) c1, bool_and(norule) norule FROM a9_lkc GROUP BY cl, type) t GROUP BY cl;
CREATE TEMP TABLE a9_sg AS SELECT s.*,
  CASE WHEN sig LIKE 'community=1, license=1, profile=1, space=1, storage-aggregator=1' THEN 'B space set that never got a rule (failed creation)'
       WHEN sig LIKE 'communication=%community-guidelines=%innovation-flow=%' THEN 'C1 space content set'
       WHEN sig ~ '^(account=1, )?(communication-conversation=\d, )?(room=1, )?user-settings=1$' THEN 'C2 user set'
       WHEN sig ~ '^room=\d+$' THEN 'C3 room alone'
       WHEN sig LIKE '%template=1%' THEN 'C4 template set'
       WHEN sig ~ '^innovation-flow-state=\d+(, room=\d+)?(, template-default=1)?$' THEN 'C5 flow states alone'
       WHEN sig LIKE 'communication-conversation=%' THEN 'C6 conversation'
       ELSE 'other' END grp
  FROM a9_sig s;
SELECT grp, count(*) AS sets, sum(n) AS policies, count(*) FILTER (WHERE all_norule) AS sets_without_any_rule,
       min(c0)::date AS first, max(c0)::date AS last,
       count(*) FILTER (WHERE c0 >= (SELECT max("createdDate") FROM authorization_policy) - interval '2 months') AS sets_last_2_months
  FROM a9_sg GROUP BY 1
UNION ALL
SELECT 'A communication-messaging (deleted by a migration)', count(DISTINCT date_trunc('minute', c)), count(*), NULL, min(c)::date, max(c)::date,
       count(*) FILTER (WHERE c >= (SELECT max("createdDate") FROM authorization_policy) - interval '2 months')
  FROM a9_lk WHERE type = 'communication-messaging'
 ORDER BY 3 DESC;

\echo --- A9 G13: failed space creations, the sets of G12 group B against the structure rows they left behind (expect each set to match A3 leftovers; a set with a live space would be a different defect)
SELECT t.tbl, count(DISTINCT w.cl) AS sets, count(*) AS rows_left, count(*) FILTER (WHERE q.id IS NOT NULL) AS classed_orphaned, min(q.rule) AS rule
  FROM (SELECT cl, c0, c1 FROM a9_sg WHERE grp LIKE 'B %') w JOIN LATERAL (
        SELECT 'space' tbl, sp.id::text id FROM actor a JOIN space sp ON sp.id=a.id WHERE a."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'communication', id::text FROM communication s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'room', id::text FROM room s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'role_set', id::text FROM role_set s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'innovation_flow', id::text FROM innovation_flow s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'templates_manager', id::text FROM templates_manager s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  UNION ALL SELECT 'callouts_set', id::text FROM callouts_set s WHERE s."createdDate" BETWEEN w.c0-interval '10 s' AND w.c1+interval '10 s'
  ) t ON true LEFT JOIN orphan q ON q.tbl=t.tbl AND q.id=t.id GROUP BY 1 ORDER BY 1;

\echo --- A9 G14: delete actions that can leave a policy behind (info; 14a expect only SET NULL toward the policy table, 14b lists child tables with a policy that a database cascade removes without their policy)
SELECT CASE confdeltype WHEN 'n' THEN 'SET NULL' WHEN 'a' THEN 'NO ACTION' WHEN 'c' THEN 'CASCADE' WHEN 'r' THEN 'RESTRICT' ELSE confdeltype::text END AS on_delete_toward_policy, count(*) AS fks
  FROM pg_constraint WHERE contype='f' AND confrelid='authorization_policy'::regclass GROUP BY 1;
SELECT c.conrelid::regclass AS child_with_policy, a.attname AS child_col, c.confrelid::regclass AS parent
  FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
 WHERE c.contype='f' AND c.confdeltype='c'
   AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid=c.conrelid AND x.attname='authorizationId' AND NOT x.attisdropped)
 ORDER BY 1,2;

\echo --- A9 G15: detail of the files without a policy of G11 (info; staged chat uploads carry an external reference and should have a twin with a policy)
DROP TABLE IF EXISTS a9_pf;
CREATE TEMP TABLE a9_pf AS
SELECT f.*, CASE WHEN f."externalReference" IS NOT NULL THEN '2 staged chat upload (external reference set)'
                 WHEN EXISTS (SELECT 1 FROM profile p JOIN memo m ON m."profileId"=p.id WHERE p."storageBucketId"=f."storageBucketId") THEN '3 in the bucket of a memo'
                 WHEN EXISTS (SELECT 1 FROM storage_aggregator sa JOIN space sp ON sp."storageAggregatorId"=sa.id WHERE sa."directStorageId"=f."storageBucketId") THEN '1 in the direct bucket of a space'
                 ELSE '4 elsewhere' END AS grp
  FROM file f WHERE f."authorizationId" IS NULL
   AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text) AND NOT EXISTS (SELECT 1 FROM memo m WHERE m."contentPointer"=f.id::text);
SELECT grp, count(*) AS files, count(DISTINCT "storageBucketId") AS buckets, string_agg(DISTINCT "mimeType", ', ') AS mime_types,
       count("createdBy") AS with_creator, count("tagsetId") AS with_tagset, count(*) FILTER (WHERE content_metadata::text LIKE '%imageWidth%') AS with_image_size,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file o WHERE o."externalID"=a9_pf."externalID" AND o.id<>a9_pf.id AND o."authorizationId" IS NOT NULL)) AS same_body_as_a_file_with_policy,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file o WHERE o."externalID"=a9_pf."externalID" AND o.id<>a9_pf.id AND o."authorizationId" IS NULL)) AS same_body_as_another_without,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM visual v WHERE v.uri LIKE '%'||a9_pf.id||'%') OR EXISTS (SELECT 1 FROM reference r WHERE r.uri LIKE '%'||a9_pf.id||'%') OR EXISTS (SELECT 1 FROM profile p WHERE p.description LIKE '%'||a9_pf.id||'%')) AS id_found_in_visual_reference_or_text,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file b JOIN whiteboard w ON w."contentPointer"=b.id::text WHERE abs(extract(epoch from b."createdDate"-a9_pf."createdDate"))<120 OR abs(extract(epoch from b."updatedDate"-a9_pf."createdDate"))<120)) AS within_2_min_of_a_whiteboard_body_write,
       min("createdDate")::date AS oldest, max("createdDate")::date AS newest, count(DISTINCT "createdDate"::date) AS days
  FROM a9_pf GROUP BY 1 ORDER BY 1;
\echo --- A9 G15b: all files with an external reference, with and without a policy (info)
SELECT ("authorizationId" IS NOT NULL) AS has_policy, count(*) AS files, min("createdDate")::date AS oldest, max("createdDate")::date AS newest FROM file WHERE "externalReference" IS NOT NULL GROUP BY 1;

-- Guards added 2026-11-13: where the leftovers come from. Reference points in
-- the server history: server#6596 (space creation from a space template fails
-- half way; fix merged 2026-10-14), server#6614 (13 delete paths left the
-- policy of the deleted row; fix merged 2026-10-19; its clean-up migration is a
-- separate pull request), server#6635 (saving a space template fails; fix
-- merged 2026-11-06).
\echo --- A9 G15c: files without a policy of G11 by file name shape (info; one name on every row points at one writer; all_files_with_that_name_that_have_a_policy = 0 means that writer never sets a policy)
SELECT grp, CASE WHEN "displayName" = 'collabora-preview.png' THEN 'collabora-preview.png' WHEN "displayName" ~* '\.pdf$' THEN 'a pdf name' ELSE 'another name' END AS name_shape,
       count(*) AS files, count(DISTINCT "externalID") AS distinct_bodies,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM collabora_document d WHERE abs(extract(epoch from d."createdDate"-a9_pf."createdDate"))<120 OR abs(extract(epoch from d."updatedDate"-a9_pf."createdDate"))<120)) AS within_2_min_of_an_office_document_write,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM visual v WHERE v.uri LIKE '%'||a9_pf.id||'%')) AS named_by_a_visual
  FROM a9_pf GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) AS all_files_named_collabora_preview, count("authorizationId") AS all_files_with_that_name_that_have_a_policy FROM file WHERE "displayName"='collabora-preview.png';
\echo --- A9 G16: failed space creations of G12 group B, what each left and whether its innovation flow equals a live space template (info; a flow equal to a template that is not used as a default means the caller picked a space template: compare the dates with server#6596)
DROP TABLE IF EXISTS a9_fb; DROP TABLE IF EXISTS a9_fsig; DROP TABLE IF EXISTS a9_tsig; DROP TABLE IF EXISTS a9_fl;
CREATE TEMP TABLE a9_fb AS SELECT cl, c0, c1 FROM a9_sg WHERE grp LIKE 'B %';
CREATE TEMP TABLE a9_fsig AS
 SELECT f.id, f."createdDate" c, md5(string_agg(st."displayName", '|' ORDER BY st."sortOrder")) sig, count(*) states
   FROM innovation_flow f JOIN innovation_flow_state st ON st."innovationFlowId"=f.id GROUP BY f.id, f."createdDate";
CREATE TEMP TABLE a9_tsig AS
 SELECT g.sig, count(DISTINCT t.id) templates, count(DISTINCT t.id) FILTER (WHERE EXISTS (SELECT 1 FROM template_default d WHERE d."templateId"=t.id)) used_as_default
   FROM template t JOIN template_content_space cs ON cs.id=t."contentSpaceId" JOIN collaboration c ON c.id=cs."collaborationId" JOIN a9_fsig g ON g.id=c."innovationFlowId" GROUP BY g.sig;
CREATE TEMP TABLE a9_fl AS
 SELECT b.cl, f.id, f.sig, f.states FROM a9_fb b JOIN a9_fsig f ON f.c BETWEEN b.c0-interval '10 s' AND b.c1+interval '10 s'
  WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='innovation_flow' AND q.id=f.id::text);
SELECT to_char(b.c0,'YYYY-MM-DD HH24:MI') AS set_made,
       (SELECT count(*) FROM callouts_set s WHERE s."createdDate" BETWEEN b.c0-interval '10 s' AND b.c1+interval '10 s' AND NOT EXISTS (SELECT 1 FROM collaboration co WHERE co."calloutsSetId"=s.id)) AS callouts_sets_left,
       (SELECT count(*) FROM callouts_set s JOIN callout c ON c."calloutsSetId"=s.id WHERE s."createdDate" BETWEEN b.c0-interval '10 s' AND b.c1+interval '10 s' AND NOT EXISTS (SELECT 1 FROM collaboration co WHERE co."calloutsSetId"=s.id)) AS callouts_on_them,
       (SELECT count(*) FROM a9_fl f WHERE f.cl=b.cl) AS flows_left,
       (SELECT max(f.states) FROM a9_fl f WHERE f.cl=b.cl) AS flow_states,
       (SELECT coalesce(max(t.templates),0) FROM a9_fl f JOIN a9_tsig t ON t.sig=f.sig WHERE f.cl=b.cl) AS live_space_templates_with_the_same_states,
       (SELECT coalesce(max(t.used_as_default),0) FROM a9_fl f JOIN a9_tsig t ON t.sig=f.sig WHERE f.cl=b.cl) AS of_them_used_as_a_default,
       (SELECT count(*) FROM actor a JOIN space sp ON sp.id=a.id WHERE a."createdDate" BETWEEN b.c0-interval '2 min' AND b.c1+interval '2 min') AS live_spaces_made_within_2_min
  FROM a9_fb b ORDER BY b.c0;
SELECT count(*) AS live_space_templates, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM template_default d WHERE d."templateId"=t.id)) AS used_as_a_default FROM template t WHERE t."contentSpaceId" IS NOT NULL;
\echo --- A9 G17: policies referenced by nothing of the last 12 months by type, against the 13 delete paths fixed by server#6614 (info; a newest date after the day the fix reached this environment means a delete path still leaves its policy)
SELECT type, count(*) AS policies, max(c)::date AS newest,
       (type IN ('innovation-flow-state','room','user-settings','community-guidelines','innovation-flow','communication','template','template-default','poll','discussion','innovation-pack','forum','license-policy')) AS on_a_delete_path_fixed_by_6614
  FROM a9_lk GROUP BY 1 ORDER BY 2 DESC;
SELECT count(*) AS total, count(*) FILTER (WHERE type IN ('innovation-flow-state','room','user-settings','community-guidelines','innovation-flow','communication','template','template-default','poll','discussion','innovation-pack','forum','license-policy')) AS on_fixed_paths,
       max(c)::date AS newest_of_all FROM a9_lk;
\echo --- A9 G18: clean-up migrations recorded as run, and tables named like a backup (info; the orphan clean-up migration of server#6614 is absent until its pull request is merged; once it ran, the reject set shrinks and its backup tables become new A1 rows)
SELECT name, to_timestamp("timestamp"::bigint/1000)::date AS dated FROM migrations_typeorm WHERE name ~* 'orphan|cleanup|clean_up' ORDER BY "timestamp";
SELECT count(*) AS tables_named_like_a_backup FROM information_schema.tables WHERE table_schema='public' AND table_name ~* 'backup|_bak$|orphan';
\echo --- A9 G19: orphaned collaborations by template flag and year (info; a template collaboration made after 2026-10-08 would be a leftover of server#6635)
SELECT c."isTemplate" AS is_template, extract(year from c."createdDate")::int AS year, count(*) FROM orphan q JOIN collaboration c ON c.id::text=q.id WHERE q.tbl='collaboration' GROUP BY 1,2 ORDER BY 2,1;
\echo --- A3 G8: orphaned template content spaces by day, against the template saves of that day (info; all on one day, beside live templates and duplicate template names of the same day, points at template saves that were repeated or did not finish)
DROP TABLE IF EXISTS a9_un;
CREATE TEMP TABLE a9_un AS SELECT p.id, p.type, p."createdDate" c FROM orphan q JOIN authorization_policy p ON p.id::text=q.id WHERE q.tbl='authorization_policy' AND q.rule='authorization-policy-unowned';
ANALYZE a9_un;
WITH x AS (SELECT t.*, t."createdDate"::date d FROM orphan q JOIN template_content_space t ON t.id::text=q.id WHERE q.tbl='template_content_space' AND q.rule='template_content_space-owner-missing')
SELECT d AS day, count(*) AS orphaned_content_spaces, to_char(min("createdDate"),'HH24:MI') AS first, to_char(max("createdDate"),'HH24:MI') AS last,
       count("collaborationId") AS with_collaboration, count("authorizationId") AS with_policy,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM template y WHERE abs(extract(epoch from y."createdDate"-x."createdDate"))<30)) AS template_row_within_30s,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM a9_un u WHERE u.type='template' AND abs(extract(epoch from u.c-x."createdDate"))<30)) AS unowned_template_policy_within_30s,
       (SELECT count(*) FROM template y WHERE y."contentSpaceId" IS NOT NULL AND y."createdDate"::date=x.d) AS live_space_templates_saved_that_day,
       (SELECT count(*) FROM template y JOIN (SELECT "templatesSetId","nameID" FROM template GROUP BY 1,2 HAVING count(*)>1) g ON g."templatesSetId"=y."templatesSetId" AND g."nameID"=y."nameID" WHERE y."createdDate"::date=x.d) AS templates_in_a_duplicate_name_group_that_day
  FROM x GROUP BY d ORDER BY d;

\echo === A10 guards
-- Ownership facts (legacy server db6e9def6):
--   activity."collaborationID" is NOT NULL with no FK. The activity log is
--   read only by collaboration id (activity.service.ts), so a row on a deleted
--   collaboration is never shown. A callout move re-stamps its activity onto
--   the destination collaboration (moveActivitiesForCallout); a move made
--   before that code existed could leave activity of a live callout behind.
--   room: owners point AT the room (callout, post, calendar_event, discussion
--   commentsId; communication updatesId; conversation roomId).
--   in_app_notification."roomID" -> room ON DELETE CASCADE.
--   conversation."messagingId" -> messaging ON DELETE CASCADE, nullable. A
--   user's chat list is read with conversation."messagingId" = the platform
--   messaging (getConversationsForActor), so a conversation with no messaging
--   parent is invisible. Creation writes the conversation first and attaches
--   the messaging parent in a second step.
\echo --- A10 G1: deletion record, orphaned activity by type
SELECT o.rule, a.type, count(*) AS entries, count(DISTINCT a."collaborationID") AS collaborations,
       min(a."createdDate")::date AS first_created, max(a."createdDate")::date AS last_created
FROM activity a JOIN orphan o ON o.tbl='activity' AND o.id=a.id::text
GROUP BY 1,2 ORDER BY 1, 3 DESC;

\echo --- A10 G2: soundness, orphaned activity whose subject is still a live thing (expect 0; a hit is re-pointed, not deleted)
SELECT a.type, x.kind AS live_subject, count(*) AS entries
FROM activity a JOIN orphan o ON o.tbl='activity' AND o.id=a.id::text
JOIN LATERAL (
  SELECT 'callout' AS kind WHERE EXISTS (SELECT 1 FROM callout c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='callout' AND q.id=c.id::text))
  UNION ALL SELECT 'post' WHERE EXISTS (SELECT 1 FROM post c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='post' AND q.id=c.id::text))
  UNION ALL SELECT 'whiteboard' WHERE EXISTS (SELECT 1 FROM whiteboard c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='whiteboard' AND q.id=c.id::text))
  UNION ALL SELECT 'memo' WHERE EXISTS (SELECT 1 FROM memo c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='memo' AND q.id=c.id::text))
  UNION ALL SELECT 'link' WHERE EXISTS (SELECT 1 FROM link c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='link' AND q.id=c.id::text))
  UNION ALL SELECT 'calendar_event' WHERE EXISTS (SELECT 1 FROM calendar_event c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='calendar_event' AND q.id=c.id::text))
  UNION ALL SELECT 'space' WHERE EXISTS (SELECT 1 FROM space c WHERE c.id=a."resourceID" AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='space' AND q.id=c.id::text))
) x ON true
WHERE a.type <> 'member-joined'
GROUP BY 1,2 ORDER BY 3 DESC;

\echo --- A10 G3: orphaned rooms by rule and type, with what they hold
SELECT o.rule, r.type, count(*) AS rooms, count(*) FILTER (WHERE r."messagesCount" > 0) AS with_messages,
       coalesce(sum(r."messagesCount"),0) AS messages,
       count(*) FILTER (WHERE r."vcData" IS NOT NULL AND r."vcData"::text NOT IN ('null','{}')) AS with_vc_data,
       (SELECT count(*) FROM in_app_notification n JOIN orphan q ON q.tbl='room' AND q.id=n."roomID"::text
         JOIN room r2 ON r2.id=n."roomID" WHERE r2.type=r.type AND q.rule=o.rule) AS notifications_that_cascade
FROM room r JOIN orphan o ON o.tbl='room' AND o.id=r.id::text
GROUP BY 1,2 ORDER BY 1, 3 DESC;

\echo --- A10 G4: soundness, every column that can hold a room id (info) and orphaned rooms still named by a live row (expect 0)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' AND (column_name ILIKE '%roomid%' OR column_name IN ('commentsId','updatesId')) AND table_name NOT LIKE '\_%'
ORDER BY 1,2;
SELECT count(*) AS orphaned_rooms_named_by_a_live_conversation
FROM conversation c JOIN orphan o ON o.tbl='room' AND o.id=c."roomId"::text
WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='conversation' AND q.id=c.id::text);

\echo --- A10 G5: lost pointers, live owners that should have a room and have none (expect 0)
SELECT 'post without comments room' AS check, count(*) FROM post p WHERE p."commentsId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='post' AND q.id=p.id::text)
UNION ALL SELECT 'calendar event without comments room', count(*) FROM calendar_event p WHERE p."commentsId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='calendar_event' AND q.id=p.id::text)
UNION ALL SELECT 'forum discussion without comments room', count(*) FROM discussion p WHERE p."commentsId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='discussion' AND q.id=p.id::text)
UNION ALL SELECT 'communication without updates room', count(*) FROM communication p WHERE p."updatesId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='communication' AND q.id=p.id::text)
UNION ALL SELECT 'conversation without room', count(*) FROM conversation p WHERE p."roomId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='conversation' AND q.id=p.id::text);

\echo --- A10 G6: conversations with no messaging parent, one row each with a ruling
SELECT c."createdDate"::date AS created, r.type AS room_type, coalesce(r."messagesCount",0) AS messages,
       (SELECT count(*) FROM conversation_membership m WHERE m."conversationId"=c.id) AS members,
       (SELECT count(*) FROM conversation_membership m JOIN actor a ON a.id=m."actorId" WHERE m."conversationId"=c.id
          AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='actor' AND q.id=a.id::text)) AS live_members,
       CASE WHEN coalesce(r."messagesCount",0) > 0
              OR EXISTS (SELECT 1 FROM conversation_membership m WHERE m."conversationId"=c.id)
            THEN 'REPAIR attach to the platform messaging' ELSE 'REJECT empty shell' END AS ruling
FROM conversation c JOIN orphan o ON o.tbl='conversation' AND o.id=c.id::text AND o.rule='conversation-messaging-missing'
LEFT JOIN room r ON r.id=c."roomId"
ORDER BY 1;
SELECT count(*) AS messaging_rows, (SELECT count(*) FROM platform WHERE "messagingId" IS NOT NULL) AS platform_points_at_one FROM messaging;

-- A10 additions of 2026-11-12. Facts from the server code (develop 39d7aff38):
--   deleting a user removes its conversation memberships through the actor
--   cascade and leaves the conversation ("Conversations belong to the platform
--   Messaging"), so a chat can end up with no user in it. Every new user gets
--   a guidance chat with the one well-known virtual contributor.
\echo --- A10 G7: live conversations that no user is a member of (info; nobody can open them. Rows are kept; the count is the size of the product question)
CREATE TEMP TABLE a10_du AS SELECT p."createdDate" AS created FROM authorization_policy p
 WHERE p.type IN ('user-settings','account') AND p.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='authorization_policy' AND q.rule='authorization-policy-unowned');
WITH c AS (SELECT c.*, (SELECT count(*) FROM conversation_membership m WHERE m."conversationId"=c.id) AS members,
                  (SELECT count(*) FROM conversation_membership m JOIN "user" u ON u.id=m."actorId" WHERE m."conversationId"=c.id) AS users
             FROM conversation c WHERE c."messagingId" IS NOT NULL)
SELECT CASE WHEN members=0 THEN 'no member' ELSE 'only virtual contributors' END AS kind, count(*) AS conversations,
       count(*) FILTER (WHERE r."messagesCount">0) AS with_messages, sum(r."messagesCount") AS messages,
       (SELECT count(DISTINCT m."actorId") FROM conversation_membership m WHERE m."conversationId" IN (SELECT id FROM c c2 WHERE c2.users=0 AND c2.members>0)) AS distinct_virtual_contributors,
       min(c."createdDate")::date AS first, max(c."createdDate")::date AS last,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM a10_du d WHERE abs(extract(epoch from d.created-c."createdDate"))<15)) AS created_with_a_since_deleted_user,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='conversation' AND q.id=c.id::text)) AS classed_orphaned
  FROM c JOIN room r ON r.id=c."roomId" WHERE users=0 GROUP BY 1 ORDER BY 1;

\echo --- A10 G8: the G2 hits in detail (info; an entry whose callout sits on a kept collaboration and has no entry there is a re-point, not a delete)
CREATE TEMP TABLE a10_hit AS
  SELECT a.id, a.type, a."resourceID"::text AS res, a."createdDate" FROM activity a
   WHERE a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='activity')
     AND ((a.type='callout-published' AND EXISTS (SELECT 1 FROM callout co WHERE co.id::text=a."resourceID"::text))
       OR (a.type='callout-link-added' AND EXISTS (SELECT 1 FROM link l WHERE l.id::text=a."resourceID"::text)));
CREATE TEMP TABLE a10_hx AS
  SELECT h.*, coalesce((SELECT co.id FROM callout co WHERE co.id::text=h.res),
                       (SELECT cc."calloutId" FROM callout_contribution cc WHERE cc."linkId"::text=h.res LIMIT 1)) AS callout_id FROM a10_hit h;
SELECT x.type, count(*) AS entries,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM activity b WHERE b."resourceID"::text=x.res AND b.type=x.type AND b.id<>x.id AND b.id::text NOT IN (SELECT o.id FROM orphan o WHERE o.tbl='activity'))) AS has_a_kept_twin_entry,
       count(*) FILTER (WHERE x.callout_id IS NOT NULL) AS callout_found,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM callout co JOIN collaboration cc ON cc."calloutsSetId"=co."calloutsSetId" WHERE co.id=x.callout_id AND cc.id::text NOT IN (SELECT o.id FROM orphan o WHERE o.tbl='collaboration'))) AS callout_sits_on_a_kept_collaboration,
       count(*) FILTER (WHERE x.callout_id::text IN (SELECT o.id FROM orphan o WHERE o.tbl='callout')) AS callout_is_rejected,
       min(x."createdDate")::date AS first, max(x."createdDate")::date AS last
  FROM a10_hx x GROUP BY 1 ORDER BY 1;

\echo --- A10 G9: orphaned rooms by year created (info), and the list written to /tmp/a10-rooms.txt for the chat server check in script 39
SELECT q.rule, r.type, extract(year from r."createdDate") AS year, count(*) AS rooms FROM orphan q JOIN room r ON r.id::text=q.id WHERE q.tbl='room' GROUP BY 1,2,3 ORDER BY 1,2,3;
\copy (SELECT q.id, q.rule, r.type, r."messagesCount", r."createdDate"::date FROM orphan q JOIN room r ON r.id::text=q.id WHERE q.tbl='room') to '/tmp/a10-rooms.txt' with (format csv, delimiter '|')

\echo
\echo '--- A10 G10: guidance chats in the data, by whether a live user is in them (info; the guidance chat is hidden in the client and waits for a rework on the new server, so this is the size of the question "does the distiller copy guidance chats at all")'
DROP TABLE IF EXISTS a10_gv; DROP TABLE IF EXISTS a10_gc;
CREATE TEMP TABLE a10_gv AS
 SELECT (m->>'virtualContributorID')::uuid vc FROM platform, jsonb_array_elements("wellKnownVirtualContributors"::jsonb->'mappings') m WHERE m->>'wellKnown'='CHAT_GUIDANCE';
CREATE TEMP TABLE a10_gc AS
 SELECT c.id, c."createdDate", COALESCE(r."messagesCount",0) msgs,
        (SELECT count(*) FROM conversation_membership m JOIN "user" u ON u.id=m."actorId" WHERE m."conversationId"=c.id) users
   FROM conversation c LEFT JOIN room r ON r.id=c."roomId"
  WHERE EXISTS (SELECT 1 FROM conversation_membership m WHERE m."conversationId"=c.id AND m."actorId" IN (SELECT vc FROM a10_gv));
SELECT (SELECT count(*) FROM conversation) AS all_conversations, count(*) AS guidance_chats,
       count(*) FILTER (WHERE users>=1) AS with_a_live_user, count(*) FILTER (WHERE users>=1 AND msgs>0) AS of_those_with_messages,
       COALESCE(sum(msgs) FILTER (WHERE users>=1),0) AS messages_in_them,
       count(*) FILTER (WHERE users=0) AS with_no_user, count(*) FILTER (WHERE users=0 AND msgs>0) AS of_those_with_messages_2,
       COALESCE(sum(msgs) FILTER (WHERE users=0),0) AS messages_in_them_2, max("createdDate")::date AS latest_created,
       count(*) FILTER (WHERE id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='conversation')) AS in_the_reject_set
  FROM a10_gc;
SELECT (SELECT count(*) FROM "user") AS live_users,
       (SELECT count(DISTINCT m."actorId") FROM conversation_membership m JOIN a10_gc g ON g.id=m."conversationId" JOIN "user" u ON u.id=m."actorId") AS live_users_with_a_guidance_chat;

\echo === A11 guards
-- Ownership facts (legacy server db6e9def6):
--   lifecycle: owners point AT it (application, invitation,
--   organization_verification lifecycleId, FK ON DELETE SET NULL).
--   nvp: reached only through application_questions (CASCADE on both sides).
--   organization_verification: organization."verificationId" points at it;
--   the row also keeps the organization id as text in "organizationID".
--   user_settings: "user"."settingsId" points at it; no column points back.
--   mcp_api_key has no foreign key at all. A user-bound key authenticates by
--   loading the user with findOneOrFail (actor.context.service.ts
--   buildForUser), so a key whose user is gone fails at that step. User
--   deletion does not revoke the keys of the user.
\echo --- A11 G1: deletion record, small leftovers by table and rule
SELECT o.tbl, o.rule, o.round, count(*) AS n FROM orphan o
WHERE o.tbl IN ('lifecycle','nvp','organization_verification','user_settings','mcp_api_key')
GROUP BY 1,2,3 ORDER BY 1,3,2;

\echo --- A11 G2: lost pointers, live owners with no lifecycle, verification or settings row (expect 0)
SELECT 'application without lifecycle' AS check, count(*) FROM application p WHERE p."lifecycleId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='application' AND q.id=p.id::text)
UNION ALL SELECT 'invitation without lifecycle', count(*) FROM invitation p WHERE p."lifecycleId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='invitation' AND q.id=p.id::text)
UNION ALL SELECT 'organization verification without lifecycle', count(*) FROM organization_verification p WHERE p."lifecycleId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='organization_verification' AND q.id=p.id::text)
UNION ALL SELECT 'organization without verification', count(*) FROM organization p WHERE p."verificationId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='organization' AND q.id=p.id::text)
UNION ALL SELECT 'user without settings', count(*) FROM "user" p WHERE p."settingsId" IS NULL AND NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='user' AND q.id=p.id::text);

\echo --- A11 G3: soundness, an orphaned verification whose own organizationID still names a live organization (expect 0; a hit is re-linked, not deleted)
SELECT v.status,
       CASE WHEN org.id IS NULL THEN 'organization gone'
            WHEN org."verificationId" IS NULL THEN 'LIVE organization with no verification: re-link'
            ELSE 'live organization already has another verification: duplicate' END AS finding,
       count(*) AS n
FROM organization_verification v JOIN orphan o ON o.tbl='organization_verification' AND o.id=v.id::text
LEFT JOIN organization org ON org.id::text = v."organizationID"
GROUP BY 1,2 ORDER BY 3 DESC;

\echo --- A11 G4: orphaned application answers, any still attached to a live application (expect 0)
SELECT count(*) AS orphaned_answers_on_a_live_application
FROM application_questions aq JOIN orphan o ON o.tbl='nvp' AND o.id=aq."nvpId"::text
WHERE NOT EXISTS (SELECT 1 FROM orphan q WHERE q.tbl='application' AND q.id=aq."applicationId"::text);

\echo --- A11 G5: orphaned MCP API keys, shape only (never print keyHash)
SELECT k."isActive" AS active, (k."userId" IS NOT NULL) AS user_bound, (k."actorId" IS NOT NULL) AS actor_bound,
       (k."expiresAt" IS NOT NULL AND k."expiresAt" < now()) AS expired, k."createdDate"::date AS created,
       k."lastUsedAt"::date AS last_used, jsonb_array_length(CASE WHEN jsonb_typeof(k.scopes)='array' THEN k.scopes ELSE '[]'::jsonb END) AS scopes
FROM mcp_api_key k JOIN orphan o ON o.tbl='mcp_api_key' AND o.id=k.id::text;
SELECT count(*) FILTER (WHERE "isActive") AS active_keys, count(*) AS all_keys FROM mcp_api_key;

\echo --- A11 G6: every MCP API key by state of its principal (expect kept_with_rejected_principal 0 and rejected_with_live_principal 0)
SELECT CASE WHEN q.id IS NOT NULL THEN 'rejected' ELSE 'kept' END AS key, CASE WHEN k."actorId" IS NOT NULL THEN 'actor-bound' WHEN k."userId" IS NOT NULL THEN 'user-bound' ELSE 'bound to nothing' END AS kind,
       (SELECT a.type::text FROM actor a WHERE a.id::text=coalesce(k."actorId"::text,k."userId"::text)) AS principal_type, k."isActive" AS active, count(*) AS keys,
       count(*) FILTER (WHERE q.id IS NULL AND coalesce(k."actorId"::text,k."userId"::text) IN (SELECT o.id FROM orphan o WHERE o.tbl IN ('user','actor','virtual_contributor','organization'))) AS kept_with_rejected_principal,
       count(*) FILTER (WHERE q.id IS NOT NULL AND EXISTS (SELECT 1 FROM actor a WHERE a.id::text=coalesce(k."actorId"::text,k."userId"::text))) AS rejected_with_live_principal,
       count(*) FILTER (WHERE k."expiresAt" < (SELECT max("updatedDate") FROM mcp_api_key)) AS expired, count(*) FILTER (WHERE k."lastUsedFromIp" IS NOT NULL) AS holds_an_ip_address,
       max(k."lastUsedAt")::date AS last_used
  FROM mcp_api_key k LEFT JOIN orphan q ON q.tbl='mcp_api_key' AND q.id=k.id::text GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;

\echo --- A11 G7: leftovers by year created (info; rows in the last 12 months of the data mean something still creates them)
SELECT t.tbl, t.rule, extract(year from t.created) AS year, count(*) AS n, count(*) FILTER (WHERE t.created > (SELECT max("createdDate") FROM lifecycle) - interval '12 months') AS in_last_12_months, max(t.created)::date AS last
  FROM (SELECT q.tbl, q.rule, l."createdDate" created FROM orphan q JOIN lifecycle l ON l.id::text=q.id WHERE q.tbl='lifecycle'
        UNION ALL SELECT q.tbl, q.rule, n."createdDate" FROM orphan q JOIN nvp n ON n.id::text=q.id WHERE q.tbl='nvp'
        UNION ALL SELECT q.tbl, q.rule, s."createdDate" FROM orphan q JOIN user_settings s ON s.id::text=q.id WHERE q.tbl='user_settings'
        UNION ALL SELECT q.tbl, q.rule, v."createdDate" FROM orphan q JOIN organization_verification v ON v.id::text=q.id WHERE q.tbl='organization_verification'
        UNION ALL SELECT q.tbl, q.rule, k."createdDate" FROM orphan q JOIN mcp_api_key k ON k.id::text=q.id WHERE q.tbl='mcp_api_key') t GROUP BY 1,2,3 ORDER BY 1,2,3;

\echo --- A11 G8: personal text in the rejected application answers (info; size of what must not be kept in a quarantine copy), and kept answers with no application (expect 0)
SELECT count(*) AS rejected_answers, count(*) FILTER (WHERE coalesce(n.value,'')<>'') AS with_text, sum(length(coalesce(n.value,''))) AS characters,
       (SELECT count(*) FROM nvp k WHERE k.id::text NOT IN (SELECT o.id FROM orphan o WHERE o.tbl='nvp') AND NOT EXISTS (SELECT 1 FROM application_questions aq WHERE aq."nvpId"=k.id)) AS kept_answers_without_application
  FROM orphan q JOIN nvp n ON n.id::text=q.id WHERE q.tbl='nvp';

\echo --- A11 G9: kept state rows against their owners (expect difference 0: one state row per kept application, invitation and verification)
SELECT (SELECT count(*) FROM lifecycle l WHERE l.id::text NOT IN (SELECT o.id FROM orphan o WHERE o.tbl='lifecycle')) AS kept_lifecycles,
       (SELECT count(*) FROM application)+(SELECT count(*) FROM invitation)+(SELECT count(*) FROM organization_verification v WHERE v.id::text NOT IN (SELECT o.id FROM orphan o WHERE o.tbl='organization_verification')) AS kept_owners;

\echo === 4 bug heritage
DROP TABLE IF EXISTS heritage;
CREATE TEMP TABLE heritage (tbl text, id text, rule text);

-- B1 names ----------------------------------------------------------- arch=96
-- *-nameid-surplus = every duplicate beyond the first (oldest) in its scope
INSERT INTO heritage SELECT 'callout', id::text, 'callout-set-nameid-surplus' FROM (
  SELECT id, row_number() OVER (PARTITION BY "calloutsSetId", "nameID" ORDER BY "createdDate", id) rn FROM callout) x WHERE rn>1;
INSERT INTO heritage SELECT 'callout', id::text, 'callout-empty-nameid' FROM callout WHERE "nameID" IS NULL OR "nameID"='';
INSERT INTO heritage SELECT 'innovation_pack', id::text, 'innovation-pack-duplicate-nameid' FROM (
  SELECT id, row_number() OVER (PARTITION BY "nameID" ORDER BY "createdDate", id) rn FROM innovation_pack) x WHERE rn>1;   -- arch=11
INSERT INTO heritage SELECT 'template', id::text, 'template-set-nameid-surplus' FROM (
  SELECT id, row_number() OVER (PARTITION BY "templatesSetId", "nameID" ORDER BY "createdDate", id) rn FROM template) x WHERE rn>1;  -- arch=3
-- whiteboard nameID must be unique within its callout (framing + contributions)
INSERT INTO heritage SELECT 'whiteboard', id::text, 'whiteboard-callout-nameid-surplus' FROM (
  SELECT w.id, row_number() OVER (PARTITION BY c.id, w."nameID" ORDER BY w."createdDate", w.id) rn
    FROM whiteboard w
    JOIN callout c ON c.id = (SELECT cc."calloutId" FROM callout_contribution cc WHERE cc."whiteboardId"=w.id)
                   OR c."framingId" = (SELECT f.id FROM callout_framing f WHERE f."whiteboardId"=w.id)) x WHERE rn>1;   -- arch=8
-- direct conversations: one per actor pair
INSERT INTO heritage SELECT 'conversation', id::text, 'conversation-direct-pair-surplus' FROM (
  SELECT c.id, row_number() OVER (PARTITION BY pair ORDER BY c."createdDate", c.id) rn
    FROM conversation c JOIN room r ON r.id=c."roomId" AND r.type='conversation_direct'
    JOIN LATERAL (SELECT string_agg(m."actorId"::text, ',' ORDER BY m."actorId") pair, count(*) members FROM conversation_membership m WHERE m."conversationId"=c.id) p ON true
   WHERE p.members = 2) x WHERE rn>1;  -- arch=3  (rooms with <2 members are not a pair and are left out)
-- tagset names unique within a profile
INSERT INTO heritage SELECT 'tagset', id::text, 'tagset-profile-name-surplus' FROM (
  SELECT id, row_number() OVER (PARTITION BY "profileId", name ORDER BY "createdDate", id) rn FROM tagset WHERE "profileId" IS NOT NULL) x WHERE rn>1;
-- flow-state tagset on a callout whose tag is not a state of the owning flow (approximation)
INSERT INTO heritage SELECT 'tagset', t.id::text, 'tagset-flow-state-unmatched'
  FROM tagset t JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
  JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
 WHERE t.name='flow-state' AND t.tags IS NOT NULL AND t.tags<>''
   AND EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags, ',')) tg WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=tg));
-- (arch: tagset-profile-name-surplus + tagset-flow-state-unmatched = 32)

-- B2 spaces ---------------------------------------------------------- arch=13
INSERT INTO heritage SELECT 'space', s.id::text, 'space-wrong-level-parent' FROM space s LEFT JOIN space p ON p.id=s."parentSpaceId"
 WHERE (s.level=0 AND s."parentSpaceId" IS NOT NULL) OR (s.level>0 AND (p.id IS NULL OR s.level<>p.level+1));
INSERT INTO heritage SELECT 'space', s.id::text, 'space-level-zero-not-chain-root' FROM (
  WITH RECURSIVE ch AS (SELECT id, id AS cur, "parentSpaceId" AS par, 0 AS d FROM space
                        UNION ALL SELECT ch.id, p.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10)  -- capped: a cyclic parent chain must not hang the run (B2 G10 counts them)
  SELECT ch.id FROM ch JOIN space s ON s.id=ch.id WHERE ch.par IS NULL AND s."levelZeroSpaceID" IS DISTINCT FROM ch.cur) s;
INSERT INTO heritage SELECT 'space', id::text, 'space-l0-nameid-surplus' FROM (
  SELECT s.id, row_number() OVER (PARTITION BY lower(a."nameID") ORDER BY a."createdDate", s.id) rn FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0) x WHERE rn>1;
INSERT INTO heritage SELECT 'space', id::text, 'space-subspace-nameid-surplus' FROM (
  SELECT s.id, row_number() OVER (PARTITION BY s."levelZeroSpaceID", lower(a."nameID") ORDER BY a."createdDate", s.id) rn FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0) x WHERE rn>1;
-- (scope = the whole tree of the top-level space, as the server checks it in getReservedNameIDsInLevelZeroSpace; by parent it found 2, by root 3)
-- the full restricted list of the server: src/common/enums/restricted.space.names.ts on develop of 2026-11-10 (136 words, added 2025-05-21)
DROP TABLE IF EXISTS restricted_names;
CREATE TEMP TABLE restricted_names (w text PRIMARY KEY);
INSERT INTO restricted_names VALUES ('404'),('500'),('about'),('access-token'),('admin'),('admin-help'),('alchemy'),('alkemio'),('alkemio-bv'),('alkemiobv'),('alkemio-foundation'),('alkemiofoundation'),('announcements'),('api'),('auth'),('authentication'),('authorization'),('bitcoin'),('calendar'),('callback'),('cherrytwist'),('community'),('confirm'),('confirmation'),('contact'),('contact-us'),('contributors'),('cookie'),('cookie-policy'),('create-account'),('create-space'),('create-subspace'),('create-user'),('create-vc'),('crypto'),('dashboard'),('docs'),('documentation'),('error'),('eula'),('event'),('events'),('fake'),('faq'),('features'),('feedback'),('flows'),('forum'),('free'),('gdpr'),('giveaway'),('graphql'),('graphql-api'),('guides'),('hacker'),('help'),('home'),('hub'),('identity'),('identity-verification'),('initiative'),('innovation-hub'),('innovation-hubs'),('innovation-library'),('innovation-pack'),('innovation-packs'),('landing'),('legal'),('legal-notice'),('legal-terms'),('login'),('logout'),('malware'),('moderator'),('money'),('nda'),('news'),('null'),('oauth'),('office'),('official'),('official-features'),('official-support'),('org'),('organization'),('partners'),('phishing'),('privacy'),('privacy-notice'),('privacy-policy'),('profile'),('project'),('register'),('releases'),('report'),('resources'),('rest'),('restricted'),('root'),('root-admin'),('root-user'),('scam'),('security'),('settings'),('socket'),('space'),('spaces'),('start'),('subspace'),('support'),('support-team'),('system'),('team'),('terms'),('terms-and-conditions'),('terms-of-service'),('test'),('timeline'),('token'),('undefined'),('updates'),('user'),('validate'),('validation'),('vc'),('verify'),('verify-account'),('verify-email'),('verify-identity'),('verify-phone'),('virtual-contributor'),('virtualcontributor'),('virtual-contributors'),('websocket'),('workspace'),('ws');
INSERT INTO heritage SELECT 'space', s.id::text, 'space-l0-restricted-nameid' FROM space s JOIN actor a ON a.id=s.id
 WHERE s.level=0 AND lower(a."nameID") IN (SELECT w FROM restricted_names);
-- (until 2026-11-13 this rule held only the first 30 words and found 0; the full list finds the architect's 2)

-- B3 declared type vs content ---------------------------------------- arch=115
INSERT INTO heritage SELECT 'callout_framing', f.id::text, 'callout_framing-type-child-mismatch' FROM callout_framing f   -- arch=96
 WHERE CASE f.type
         WHEN 'whiteboard'        THEN f."whiteboardId" IS NULL
         WHEN 'link'              THEN f."linkId" IS NULL
         WHEN 'memo'              THEN f."memoId" IS NULL
         WHEN 'media_gallery'     THEN f."mediaGalleryId" IS NULL
         WHEN 'poll'              THEN f."pollId" IS NULL
         WHEN 'collabora_document'THEN f."collaboraDocumentId" IS NULL
         WHEN 'form'              THEN NOT EXISTS (SELECT 1 FROM callout_form x WHERE x."framingId"=f.id)
         WHEN 'none'              THEN f."whiteboardId" IS NOT NULL OR f."linkId" IS NOT NULL OR f."memoId" IS NOT NULL OR f."mediaGalleryId" IS NOT NULL OR f."pollId" IS NOT NULL OR f."collaboraDocumentId" IS NOT NULL
         ELSE false END;
INSERT INTO heritage SELECT 'callout_contribution', c.id::text, 'callout_contribution-type-child-mismatch' FROM callout_contribution c  -- arch=17
 WHERE CASE c.type
         WHEN 'post'              THEN c."postId" IS NULL
         WHEN 'whiteboard'        THEN c."whiteboardId" IS NULL
         WHEN 'link'              THEN c."linkId" IS NULL
         WHEN 'memo'              THEN c."memoId" IS NULL
         WHEN 'collabora_document'THEN c."collaboraDocumentId" IS NULL
         ELSE true END;
INSERT INTO heritage SELECT 'collabora_document', id::text, 'collabora_document-no-file' FROM collabora_document WHERE "documentId" IS NULL;   -- arch=1
INSERT INTO heritage SELECT 'invitation', i.id::text, 'invitation-to-parent-without-parent' FROM invitation i JOIN role_set r ON r.id=i."roleSetId"
 WHERE i."invitedToParent" AND r."parentRoleSetId" IS NULL;                                                                          -- arch=1

-- B4 values outside the enum ----------------------------------------- arch=955
-- enum lists = legacy server src/common/enums/*.ts (clone db6e9def6)
INSERT INTO heritage SELECT 'authorization_policy', id::text, 'authorization-policy-non-enum-type' FROM authorization_policy                -- arch=725
 WHERE type IS NULL OR type NOT IN ('actor','callout','callouts-set','callout-contribution','callout-framing','collaboration','communication-conversation','communication-messaging','innovation-flow','innovation-flow-state','innovation-hub','innovation-pack','link','post','whiteboard','memo','media-gallery','knowledge-base','profile','classification','reference','tagset','visual','communication','room','ai-persona','ai-server','application','role-set','community','community-guidelines','invitation','forum','platform','discussion','user','user-group','user-settings','organization','organization-verification','virtual-contributor','virtual-assistant','space','space-about','account','document','storage-aggregator','storage-bucket','template','template-content-space','templates-set','templates-manager','template-default','poll','calendar','calendar-event','timeline','library','in-memory','licensing','license','license-policy','collabora-document','unknown');
INSERT INTO heritage SELECT 'license', id::text, 'license-non-enum-type' FROM license                                                       -- arch=105 (e.g. 'role-set' vs 'roleset')
 WHERE type IS NULL OR type NOT IN ('account','space','whiteboard','roleset','collaboration','template_content_space');
INSERT INTO heritage SELECT 'storage_aggregator', id::text, 'storage-aggregator-non-enum-type' FROM storage_aggregator                     -- arch=112
 WHERE type IS NULL OR type NOT IN ('space','account','user','organization','platform','conversation');
INSERT INTO heritage SELECT 'room', id::text, 'room-type-not-enum' FROM room                                                                -- arch=5
 WHERE type IS NULL OR type NOT IN ('post','calendar_event','discussion_forum','updates','callout','conversation','conversation_direct','conversation_group');
INSERT INTO heritage SELECT 'platform_invitation', id::text, 'platform-invitation-non-enum-extra-role' FROM platform_invitation p         -- arch=5
 WHERE EXISTS (SELECT 1 FROM unnest(string_to_array(p."roleSetExtraRoles", ',')) r WHERE r NOT IN ('member','lead','admin','associate','owner','platform-operations-admin','platform-roles-admin','platform-content-full-access','platform-resource-admin','platform-settings-admin','platform-users-admin','platform-support','platform-license-manager','platform-spaces-reader','platform-audit-reader','feature-beta-tester','feature-virtual-assistant','feature-organization-creator','feature-vc-campaign','registered','guest','anonymous'));
INSERT INTO heritage SELECT 'innovation_flow_state', id::text, 'innovation_flow_state-comma-name' FROM innovation_flow_state WHERE "displayName" LIKE '%,%';  -- arch=3

-- B5 files vs bucket limits ------------------------------------------ arch=7
-- 2026-11-13, B5 review: a size limit of 0 and an empty type list mean "no limit", they are not a limit that every file breaks.
-- The reserved Matrix media staging bucket is set that way on purpose (server migration 1785800000000-MatrixMediaStagingBucketUnrestricted,
-- read the same way by MessageAttachmentService.checkAgainstBucketPolicy). Before this fix the rule read 29 on acceptance: the 7 plus
-- the 22 files of that bucket. Guard B5 G3 keeps the no-limit buckets in view.
INSERT INTO heritage SELECT 'file', f.id::text, 'file-outside-bucket-limits' FROM file f JOIN storage_bucket b ON b.id=f."storageBucketId"
 WHERE (b."maxFileSize" > 0 AND f.size > b."maxFileSize")
    OR (coalesce(b."allowedMimeTypes",'')<>'' AND NOT (f."mimeType" = ANY (string_to_array(b."allowedMimeTypes", ',')))
        -- 2026-11-11, acceptance run: the body of every whiteboard and memo is a file row (contentPointer = file.id,
        -- application/octet-stream, no creator, no policy). The server writes it, so the upload limits do not apply.
        AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer" = f.id::text)
        AND NOT EXISTS (SELECT 1 FROM memo m WHERE m."contentPointer" = f.id::text));

-- orphaned wins
DELETE FROM heritage h USING orphan o WHERE o.tbl=h.tbl AND o.id=h.id;
\echo --- bug-heritage rule counts (compare with arch=…)
SELECT rule, count(*) FROM heritage GROUP BY 1 ORDER BY 1;
SELECT count(*) AS bug_heritage_total FROM heritage;   -- arch=1,186

-- -------------------------------------------------------------------
-- B guards. Section B rows are KEPT and repaired, so these checks ask
-- "what would the proposed repair change for users", not "is it safe to delete".
-- -------------------------------------------------------------------
\echo === B1 guards
\echo --- B1 G1 duplicate callout names: which twin carries the content (the proposed fix renames the LATER one)
WITH g AS (
  SELECT c.id, c."calloutsSetId", c."nameID", c."createdDate",
         row_number() OVER (PARTITION BY c."calloutsSetId", c."nameID" ORDER BY c."createdDate", c.id) rn,
         count(*)     OVER (PARTITION BY c."calloutsSetId", c."nameID") n,
         coalesce((SELECT r."messagesCount" FROM room r WHERE r.id=c."commentsId"),0)
           + (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id) AS weight
    FROM callout c WHERE c."nameID" IS NOT NULL AND c."nameID"<>''),
 grp AS (SELECT "calloutsSetId", "nameID", max(n) n,
                max(weight) FILTER (WHERE rn=1) first_weight, max(weight) FILTER (WHERE rn>1) later_weight
           FROM g WHERE n>1 GROUP BY 1,2)
SELECT count(*) AS duplicate_groups, coalesce(sum(n),0) AS rows_in_groups,
       count(*) FILTER (WHERE later_weight > first_weight) AS groups_where_the_later_twin_holds_more,
       count(*) FILTER (WHERE later_weight = 0 AND first_weight = 0) AS groups_both_empty
  FROM grp;
\echo --- B1 G2 callout with an empty name: what it carries
SELECT c.id, c."createdDate"::date AS created, c.settings->>'visibility' AS visibility,
       coalesce((SELECT r."messagesCount" FROM room r WHERE r.id=c."commentsId"),0) AS comments,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id) AS contributions
  FROM callout c WHERE c."nameID" IS NULL OR c."nameID"='';
\echo --- B1 G3 duplicate innovation packs, templates and whiteboards: content per twin
SELECT 'innovation_pack' AS kind, p."nameID" AS name, p."createdDate"::date AS created, p."listedInStore" AS listed,
       (SELECT count(*) FROM template t WHERE t."templatesSetId"=p."templatesSetId") AS templates,
       EXISTS (SELECT 1 FROM heritage h WHERE h.tbl='innovation_pack' AND h.id=p.id::text) AS would_be_renamed
  FROM innovation_pack p WHERE p."nameID" IN (SELECT "nameID" FROM innovation_pack GROUP BY 1 HAVING count(*)>1)
 ORDER BY 2,3;
SELECT rule, count(*) AS rows, count(*) FILTER (WHERE w.content IS NOT NULL AND length(w.content) > 200) AS with_drawn_content
  FROM heritage h JOIN whiteboard w ON w.id::text=h.id WHERE h.tbl='whiteboard' GROUP BY 1;
\echo --- B1 G4 duplicate direct conversations: messages on each twin (a merge must carry both histories)
WITH d AS (
  SELECT c.id, c."createdDate", r."messagesCount", p.pair,
         row_number() OVER (PARTITION BY p.pair ORDER BY c."createdDate", c.id) rn,
         count(*)     OVER (PARTITION BY p.pair) n
    FROM conversation c JOIN room r ON r.id=c."roomId" AND r.type='conversation_direct'
    JOIN LATERAL (SELECT string_agg(m."actorId"::text, ',' ORDER BY m."actorId") pair, count(*) members FROM conversation_membership m WHERE m."conversationId"=c.id) p ON true
   WHERE p.members = 2)
SELECT md5(pair) AS pair_ref, rn AS twin, "createdDate"::date AS created, "messagesCount" AS messages,
       CASE WHEN rn=1 THEN 'kept by the rule' ELSE 'surplus by the rule' END AS rule_says
  FROM d WHERE n>1 ORDER BY 1,2;
\echo --- B1 G5 duplicate tag sets on one profile: same tags or different (different = dropping one loses tags)
SELECT t.name, count(*) AS surplus_rows,
       count(*) FILTER (WHERE coalesce(t.tags,'') = coalesce(k.tags,'')) AS same_tags_as_kept,
       count(*) FILTER (WHERE coalesce(t.tags,'') <> coalesce(k.tags,'') AND coalesce(t.tags,'')<>'') AS different_and_not_empty,
       count(*) FILTER (WHERE coalesce(t.tags,'') = '' AND coalesce(k.tags,'')<>'') AS surplus_is_empty
  FROM heritage h JOIN tagset t ON t.id::text=h.id
  JOIN LATERAL (SELECT k.tags FROM tagset k WHERE k."profileId"=t."profileId" AND k.name=t.name ORDER BY k."createdDate", k.id LIMIT 1) k ON true
 WHERE h.rule='tagset-profile-name-surplus' GROUP BY 1 ORDER BY 2 DESC;
\echo --- B1 G6 phase tags matching no phase: exact miss versus case-only miss (the server matches the tag value without case)
SELECT count(*) AS unmatched_exact,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND lower(s."displayName") = ANY (string_to_array(lower(t.tags), ',')))) AS matched_when_case_is_ignored,
       count(*) FILTER (WHERE c.settings->>'visibility'='published') AS on_published_callouts
  FROM heritage h JOIN tagset t ON t.id::text=h.id JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
  JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
 WHERE h.rule='tagset-flow-state-unmatched';

-- B1 guards added 2026-11-13 (review of B1 on the acceptance copy).
\echo --- B1 G7: B1 rows that are also in the reject set (expect 0; a hit is not copied, so it needs no repair)
SELECT h.rule, count(*) AS b1_rows, count(q.id) AS also_in_reject_set
  FROM heritage h LEFT JOIN (SELECT DISTINCT tbl, id FROM orphan) q ON q.tbl=h.tbl AND q.id=h.id
 WHERE h.rule IN ('callout-empty-nameid','callout-set-nameid-surplus','conversation-direct-pair-surplus','innovation-pack-duplicate-nameid','tagset-flow-state-unmatched','tagset-profile-name-surplus','template-set-nameid-surplus','whiteboard-callout-nameid-surplus')
 GROUP BY 1 ORDER BY 1;
\echo --- B1 G8: duplicate callout names, where the twins live and when the later one was made (info; twins made in the same second as their space, together with the rest of the set, come from the bulk create of a space or template, not from a user)
DROP TABLE IF EXISTS b1_c;
CREATE TEMP TABLE b1_c AS
 SELECT c.id, c."calloutsSetId" cs, c."nameID", c."createdDate" c, c."createdBy", c."framingId", c.settings->>'visibility' vis,
        row_number() OVER (PARTITION BY c."calloutsSetId", c."nameID" ORDER BY c."createdDate", c.id) rn,
        count(*) OVER (PARTITION BY c."calloutsSetId", c."nameID") n
   FROM callout c WHERE c."nameID" IS NOT NULL AND c."nameID"<>'';
DELETE FROM b1_c WHERE n<2;
SELECT count(*) AS groups, max(n) AS largest_group, count(DISTINCT "nameID") AS distinct_handles,
       count(*) FILTER (WHERE lvl=0) AS in_a_top_level_space, count(*) FILTER (WHERE lvl>0) AS in_a_subspace, count(*) FILTER (WHERE tp IS NOT NULL) AS in_a_space_template,
       count(*) FILTER (WHERE lvl IS NULL AND tp IS NULL) AS elsewhere,
       count(*) FILTER (WHERE sp IS NOT NULL AND abs(extract(epoch from c-sp))<30) AS later_twin_within_30s_of_its_space,
       count(*) FILTER (WHERE gap<2) AS twins_under_2_seconds_apart, count(*) FILTER (WHERE same_creator) AS same_creator,
       count(*) FILTER (WHERE same_title) AS same_title, count(*) FILTER (WHERE others>=5) AS made_with_5_or_more_other_callouts,
       count(*) FILTER (WHERE vis1='published' AND vis='published') AS both_published,
       min(c)::date AS first, max(c)::date AS last
  FROM (SELECT b.*, a.vis vis1, extract(epoch from b.c-a.c) gap, a."createdBy" IS NOT DISTINCT FROM b."createdBy" same_creator,
               (SELECT p1."displayName"=p2."displayName" FROM callout_framing f1 JOIN profile p1 ON p1.id=f1."profileId", callout_framing f2 JOIN profile p2 ON p2.id=f2."profileId" WHERE f1.id=a."framingId" AND f2.id=b."framingId") same_title,
               (SELECT count(*) FROM callout o WHERE o."calloutsSetId"=b.cs AND o.id<>b.id AND abs(extract(epoch from o."createdDate"-b.c))<10) others,
               (SELECT ac."createdDate" FROM collaboration co JOIN space s ON s."collaborationId"=co.id JOIN actor ac ON ac.id=s.id WHERE co."calloutsSetId"=b.cs) sp,
               (SELECT s.level FROM collaboration co JOIN space s ON s."collaborationId"=co.id WHERE co."calloutsSetId"=b.cs) lvl,
               (SELECT s."createdDate" FROM collaboration co JOIN template_content_space s ON s."collaborationId"=co.id WHERE co."calloutsSetId"=b.cs) tp
          FROM b1_c b JOIN b1_c a ON a.cs=b.cs AND a."nameID"=b."nameID" AND a.rn=1 WHERE b.rn=2) x;
SELECT md5("nameID") AS handle_ref, count(*) AS sets_with_this_duplicate, min(c)::date AS first, max(c)::date AS last FROM b1_c WHERE rn=2 GROUP BY 1 ORDER BY 2 DESC;
\echo --- B1 G9: whiteboards sharing a name inside one callout, framing against contributions (info; a link names a contribution whiteboard by its handle, the framing whiteboard is reached through the callout, so only contribution twins collide)
DROP TABLE IF EXISTS b1_w;
CREATE TEMP TABLE b1_w AS
 SELECT w.id, w."nameID", w."createdDate" c, c.id callout, (cc.id IS NOT NULL) AS is_contribution, (f.id IS NOT NULL) AS is_framing
   FROM whiteboard w LEFT JOIN callout_contribution cc ON cc."whiteboardId"=w.id LEFT JOIN callout_framing f ON f."whiteboardId"=w.id
   JOIN callout c ON c.id=cc."calloutId" OR c."framingId"=f.id;
SELECT count(*) AS groups, sum(n) AS rows, sum(n-1) AS surplus,
       count(*) FILTER (WHERE framings>0) AS groups_with_the_framing_whiteboard, sum(n-1) FILTER (WHERE framings>0) AS surplus_there,
       count(*) FILTER (WHERE framings=0) AS groups_of_contributions_only, sum(n-1) FILTER (WHERE framings=0) AS surplus_there_2,
       min(first)::date AS oldest, max(last)::date AS newest
  FROM (SELECT callout, "nameID", count(*) n, count(*) FILTER (WHERE is_framing) framings, min(c) first, max(c) last FROM b1_w GROUP BY 1,2 HAVING count(*)>1) g;
SELECT count(*) AS surplus_when_only_contributions_are_compared FROM (SELECT row_number() OVER (PARTITION BY callout, "nameID" ORDER BY c, id) rn FROM b1_w WHERE is_contribution) x WHERE rn>1;
\echo --- B1 G10: duplicate direct conversations by who is in the pair (info; a pair of a user and the guidance virtual contributor is a guidance chat, which is kept unchanged and not repaired)
WITH d AS (
  SELECT c.id, c."createdDate", p.pair, p.users, p.vcs, p.guidance, count(*) OVER (PARTITION BY p.pair) n, row_number() OVER (PARTITION BY p.pair ORDER BY c."createdDate", c.id) rn
    FROM conversation c JOIN room r ON r.id=c."roomId" AND r.type='conversation_direct'
    JOIN LATERAL (SELECT string_agg(m."actorId"::text, ',' ORDER BY m."actorId") pair, count(*) members,
                         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=m."actorId")) users,
                         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id=m."actorId")) vcs,
                         count(*) FILTER (WHERE m."actorId" IN (SELECT vc FROM a10_gv)) guidance
                    FROM conversation_membership m WHERE m."conversationId"=c.id) p ON true
   WHERE p.members = 2)
SELECT CASE WHEN guidance=1 AND users=1 THEN 'a user and the guidance virtual contributor' WHEN users=2 THEN 'two users' WHEN vcs=1 AND users=1 THEN 'a user and another virtual contributor' ELSE 'other' END AS pair_kind,
       count(*) FILTER (WHERE rn=2) AS duplicate_pairs, count(*) FILTER (WHERE rn>1) AS surplus_rows,
       min("createdDate") FILTER (WHERE rn>1)::date AS first_surplus, max("createdDate") FILTER (WHERE rn>1)::date AS last_surplus
  FROM d WHERE n>1 GROUP BY 1 ORDER BY 1;
\echo --- B1 G11: duplicate tag sets, innovation packs and templates by when they were made (info; every row on one day points at one event, a migration or a repeated save, not at a generator that still runs)
SELECT 'tag set surplus on a '||p.type||' profile' AS what, t."createdDate"::date AS day, count(*) AS rows
  FROM heritage h JOIN tagset t ON t.id::text=h.id JOIN profile p ON p.id=t."profileId" WHERE h.rule='tagset-profile-name-surplus' GROUP BY 1,2
UNION ALL
SELECT 'template of type '||t.type||' in a duplicate name group', t."createdDate"::date, count(*)
  FROM template t JOIN (SELECT "templatesSetId", "nameID" FROM template GROUP BY 1,2 HAVING count(*)>1) d ON d."templatesSetId"=t."templatesSetId" AND d."nameID"=t."nameID" GROUP BY 1,2
UNION ALL
SELECT 'innovation pack in a duplicate name group, year', date_trunc('year', i."createdDate")::date, count(*)
  FROM innovation_pack i WHERE i."nameID" IN (SELECT "nameID" FROM innovation_pack GROUP BY 1 HAVING count(*)>1) GROUP BY 1,2
 ORDER BY 1,2;
\echo --- B1 G12: unique rules the database holds on a handle or name column (info; no row for callout, innovation_pack, template, whiteboard or tagset means only the application guards uniqueness there)
SELECT indrelid::regclass AS tbl, indexrelid::regclass AS unique_index FROM pg_index
 WHERE indisunique AND NOT indisprimary AND pg_get_indexdef(indexrelid) ~ '"nameID"|\(name\)|\(name,|, name\)' ORDER BY 1::text, 2::text;

\echo --- B1 G13 (2026-11-13, found in the B4 review): unmatched phase tags that equal a phase name of their flow when the tag is read whole. These sit on a phase with a comma in its name (finding B4). They stay as they are until the space admin renames the phase (QA lead ruling of 2026-11-13, tracked case T8). The B1 repair must never move them to the first phase. truly_unmatched is the number B1 repairs
SELECT count(*) AS unmatched_phase_tags,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=t.tags)) AS whole_tag_is_a_phase_name,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=t.tags)) AS truly_unmatched,
       count(*) FILTER (WHERE t.tags LIKE '%,%' AND NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=t.tags)) AS truly_unmatched_with_a_comma
  FROM heritage h JOIN tagset t ON t.id::text=h.id JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
  JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
 WHERE h.rule='tagset-flow-state-unmatched';

-- B1 guards added 2026-11-16 (B1 pass under the repair check standard, phase tag part, repair 60-b1-repair.sql).
-- Insert after B1 G13 and before the line "\echo === B2 guards". They read the temp table heritage.
DROP TABLE IF EXISTS b1_fs;
CREATE TEMP TABLE b1_fs AS
  SELECT t.id AS tid, t.tags, t.type AS ttype, t."tagsetTemplateId" AS t_ttid, c.id AS cid, c."createdDate" AS callout_made, c.settings->>'visibility' AS visibility, c."commentsId" AS room_id,
         co.id AS coid, co."isTemplate" AS in_template, f.id AS fid, f."currentStateID" AS cur, f."flowStatesTagsetTemplateId" AS ttid,
         EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=t.tags) AS whole_is_a_phase,
         (t.tags<>'' AND EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags, ',')) tg WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName"=tg))) AS rule_hit
    FROM tagset t JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
    JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
   WHERE t.name='flow-state';
CREATE INDEX ON b1_fs (fid); ANALYZE b1_fs;

\echo --- B1 G14 (2026-11-16): the phase tags that are no phase of their flow, one line each, no names. These are the rows 60-b1-repair.sql moves to the current phase of their flow. Read every line on other data. made_after_the_last_phase_change = the callout is younger than the newest phase of its flow, so it was put on a value that was no phase at that moment. old_value_is_on_the_list = the value is still on the list of allowed values of the flow, so the list is out of date and not the callout. Expected after the repair: no line
SELECT md5(x.tid::text) AS tag_ref, md5(x.fid::text) AS flow_ref,
       CASE WHEN x.in_template THEN 'space template' ELSE 'space level '||coalesce((SELECT s.level::text FROM space s WHERE s."collaborationId"=x.coid), '?') END AS sits_in,
       x.visibility, coalesce((SELECT r."messagesCount" FROM room r WHERE r.id=x.room_id),0) AS comments,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=x.cid) AS responses,
       x.callout_made::date AS callout_made,
       (SELECT max(s."createdDate")::date FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid) AS newest_phase_made,
       (x.callout_made > (SELECT max(s."createdDate") FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid)) AS made_after_the_last_phase_change,
       (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid) AS phases_in_flow,
       (x.tags = ANY (string_to_array((SELECT tt."allowedValues" FROM tagset_template tt WHERE tt.id=x.ttid), ','))) AS old_value_is_on_the_list,
       ((SELECT s.id FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid ORDER BY s."sortOrder", s.id LIMIT 1) IS NOT DISTINCT FROM x.cur) AS current_phase_is_the_first,
       (SELECT count(*) FROM b1_fs y WHERE y.fid=x.fid AND y.tags=(SELECT s."displayName" FROM innovation_flow_state s WHERE s.id=x.cur AND s."innovationFlowId"=x.fid)) AS callouts_on_the_current_phase
  FROM b1_fs x WHERE x.rule_hit AND NOT x.whole_is_a_phase ORDER BY 3, 2, 1;

\echo --- B1 G15 (2026-11-16): what stops 60-b1-repair.sql. Each of the first five columns must read 0 before the repair runs: a target tag with a comma, a target flow with no phase or no usable current phase, a current phase with a comma in its name, a target that is not select-one, a target that is also in the reject set. same_name_in_other_case is set to the spelling of the phase and not to the current phase (0 on acceptance). current_differs_from_first counts the targets for which current phase and first phase are two different phases, so the choice of rule matters (6 of 10 on acceptance)
SELECT count(*) AS targets,
       count(*) FILTER (WHERE x.tags LIKE '%,%') AS target_tag_with_a_comma,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid)) AS target_flow_with_no_phase,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s.id=x.cur AND s."innovationFlowId"=x.fid AND s."displayName" LIKE '%,%')) AS current_phase_has_a_comma,
       count(*) FILTER (WHERE x.ttype<>'select-one') AS target_not_select_one,
       count(*) FILTER (WHERE x.tid::text IN (SELECT q.id FROM orphan q WHERE q.tbl='tagset')) AS target_in_the_reject_set,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s.id=x.cur AND s."innovationFlowId"=x.fid)) AS no_valid_current_phase_first_phase_is_used,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND lower(s."displayName")=lower(x.tags))) AS same_name_in_other_case,
       count(*) FILTER (WHERE (SELECT s.id FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid ORDER BY s."sortOrder", s.id LIMIT 1) IS DISTINCT FROM x.cur) AS current_differs_from_first
  FROM b1_fs x WHERE x.rule_hit AND NOT x.whole_is_a_phase;

\echo --- B1 G16 (2026-11-16): what the repair relies on, over every callout in a flow. Expected: the five middle columns read 0 (a callout with no phase tag set or with more than one, an empty phase tag, a phase tag that is not select-one, a phase tag bound to another list than the list of its flow). on_a_phase + truly_unmatched = phase_tags
SELECT (SELECT count(*) FROM callout c JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId") AS callouts_in_a_flow,
       (SELECT count(*) FROM b1_fs) AS phase_tags,
       (SELECT count(*) FROM callout c JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId" WHERE NOT EXISTS (SELECT 1 FROM b1_fs x WHERE x.cid=c.id)) AS callouts_with_no_phase_tag_set,
       (SELECT count(*) FROM (SELECT cid FROM b1_fs GROUP BY cid HAVING count(*)>1) z) AS callouts_with_more_than_one,
       (SELECT count(*) FROM b1_fs WHERE tags='') AS empty_phase_tags,
       (SELECT count(*) FROM b1_fs WHERE ttype<>'select-one') AS not_select_one,
       (SELECT count(*) FROM b1_fs WHERE t_ttid IS DISTINCT FROM ttid) AS bound_to_another_list,
       (SELECT count(*) FROM b1_fs WHERE whole_is_a_phase) AS on_a_phase,
       (SELECT count(*) FROM b1_fs WHERE rule_hit AND NOT whole_is_a_phase) AS truly_unmatched;

\echo --- B1 G17 (2026-11-16): the current phase of every flow that a collaboration uses. Expected: no_current_phase 0 and current_phase_of_another_flow 0 (the repair then falls back to the first phase and says so). The other columns inform: in how many flows the current phase is not the first one, flows where two phases share a sort position, flows where two phases share a name
SELECT count(*) AS flows,
       count(*) FILTER (WHERE f."currentStateID" IS NULL) AS no_current_phase,
       count(*) FILTER (WHERE f."currentStateID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s.id=f."currentStateID" AND s."innovationFlowId"=f.id)) AS current_phase_of_another_flow,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id)) AS flows_with_no_phase,
       count(*) FILTER (WHERE (SELECT s.id FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id ORDER BY s."sortOrder", s.id LIMIT 1) IS DISTINCT FROM f."currentStateID") AS current_is_not_the_first_phase,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id GROUP BY s."sortOrder" HAVING count(*)>1)) AS two_phases_on_one_sort_position,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id GROUP BY s."displayName" HAVING count(*)>1)) AS two_phases_with_one_name
  FROM innovation_flow f WHERE EXISTS (SELECT 1 FROM collaboration co WHERE co."innovationFlowId"=f.id);

\echo --- B1 G18 (2026-11-16, info, the live cause): flows in which a callout made without a phase lands on no tab. The server gives such a callout the default value of the list of allowed values of the flow (the declared default when it is on the list, otherwise the first value of the list). Here that value is no phase of the flow. The repair does not change this: the lists are not repaired (guard file 50). with_an_unmatched_callout_today = flows of this kind that already hold a callout on no tab
WITH d AS (
  SELECT f.id AS fid, co."isTemplate" AS in_template,
         CASE WHEN tt."defaultSelectedValue" = ANY (array_remove(string_to_array(tt."allowedValues", ','), '')) THEN tt."defaultSelectedValue"
              ELSE (array_remove(string_to_array(tt."allowedValues", ','), ''))[1] END AS value_a_new_callout_gets
    FROM innovation_flow f JOIN collaboration co ON co."innovationFlowId"=f.id LEFT JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId"),
 bad AS (SELECT d.* FROM d WHERE d.value_a_new_callout_gets IS NULL
            OR NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=d.fid AND lower(s."displayName")=lower(d.value_a_new_callout_gets)))
SELECT (SELECT count(*) FROM d) AS flows,
       count(*) AS flows_where_a_new_callout_lands_on_no_tab,
       count(*) FILTER (WHERE NOT in_template) AS in_spaces, count(*) FILTER (WHERE in_template) AS in_space_templates,
       count(*) FILTER (WHERE value_a_new_callout_gets IS NULL) AS list_is_empty_or_missing,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=bad.fid AND s."displayName" LIKE '%,%')) AS flow_has_a_comma_named_phase,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM b1_fs x WHERE x.fid=bad.fid AND x.rule_hit AND NOT x.whole_is_a_phase)) AS with_an_unmatched_callout_today
  FROM bad;
\echo === B2 guards
\echo --- B2 G1 the spaces with a hierarchy fault: what they hold and whether the repair changes the owning account
WITH RECURSIVE ch AS (SELECT id, id AS cur, "parentSpaceId" AS par, 0 AS d FROM space
                      UNION ALL SELECT ch.id, p.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10),
 root AS (SELECT id, cur AS chain_root FROM ch WHERE par IS NULL)
SELECT md5(s.id::text) AS space_ref, string_agg(DISTINCT h.rule, ' + ') AS rules, s.level, p.level AS parent_level,
       (s."levelZeroSpaceID" = r.chain_root) AS stored_root_is_real_root,
       (SELECT d."accountId" FROM space d WHERE d.id = s."levelZeroSpaceID") IS DISTINCT FROM (SELECT d."accountId" FROM space d WHERE d.id = r.chain_root) AS account_changes_on_repair,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id) AS subspaces,
       (SELECT count(*) FROM credential c WHERE c."resourceID"=s.id::text AND c.type='space-member') AS members,
       (SELECT count(*) FROM callout c JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" WHERE co.id=s."collaborationId") AS callouts
  FROM heritage h JOIN space s ON s.id::text=h.id LEFT JOIN space p ON p.id=s."parentSpaceId" LEFT JOIN root r ON r.id=s.id
 WHERE h.tbl='space' AND h.rule IN ('space-wrong-level-parent','space-level-zero-not-chain-root')
 GROUP BY s.id, s.level, p.level, r.chain_root ORDER BY 1;
\echo --- B2 G2 the spaces to rename: what they hold and how many stored links mention their handle (strict = a platform address with the handle as a whole path part; loose = any text with slash plus handle, which over-counts for a common word)
SELECT md5(s.id::text) AS space_ref, h.rule, s.level, a."createdDate"::date AS created, s.visibility,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id) AS subspaces,
       (SELECT count(*) FROM credential c WHERE c."resourceID"=s.id::text AND c.type='space-member') AS members,
       (SELECT count(*) FROM reference r WHERE r.uri ~* ('alkem\.io/([^?#]*/)?' || a."nameID" || '([/?#]|$)')) AS references_naming_it,
       (SELECT count(*) FROM profile p WHERE p.description ~* ('alkem\.io/([^?#"<> ]*/)?' || a."nameID" || '([/?#"<> ]|$)')) AS descriptions_naming_it,
       (SELECT count(*) FROM reference r WHERE r.uri LIKE '%/' || a."nameID" || '%') AS references_loose_match,
       (SELECT count(*) FROM profile p WHERE p.description LIKE '%/' || a."nameID" || '%') AS descriptions_loose_match
  FROM heritage h JOIN space s ON s.id::text=h.id JOIN actor a ON a.id=s.id
 WHERE h.tbl='space' AND h.rule IN ('space-l0-nameid-surplus','space-subspace-nameid-surplus','space-l0-restricted-nameid') ORDER BY 2,1;
\echo --- B2 G3 soundness: subspaces whose stored root differs from their parent stored root (expect only the rows of G1)
SELECT count(*) AS subspaces_root_differs_from_parent FROM space s JOIN space p ON p.id=s."parentSpaceId" WHERE s."levelZeroSpaceID" IS DISTINCT FROM p."levelZeroSpaceID";

\echo --- B2 G4 rule totals and distinct spaces (acceptance 2026-11-11: 13 spaces, same as the architect)
DROP TABLE IF EXISTS b2s;
CREATE TEMP TABLE b2s AS SELECT s.id, h.rule FROM heritage h JOIN space s ON s.id::text=h.id
 WHERE h.tbl='space' AND h.rule IN ('space-wrong-level-parent','space-level-zero-not-chain-root','space-l0-nameid-surplus','space-subspace-nameid-surplus','space-l0-restricted-nameid');
ANALYZE b2s;
SELECT coalesce(rule,'ALL RULES') AS rule, count(*) AS n_rows, count(DISTINCT id) AS spaces FROM b2s GROUP BY ROLLUP(rule) ORDER BY 1;
SELECT count(DISTINCT id) FILTER (WHERE rule IN ('space-wrong-level-parent','space-level-zero-not-chain-root')) AS hierarchy_spaces,
       count(DISTINCT id) FILTER (WHERE rule LIKE '%nameid%') AS rename_spaces FROM b2s;
-- every member of a duplicate-handle group (the kept twin as well as the surplus one)
DROP TABLE IF EXISTS b2tw;
CREATE TEMP TABLE b2tw AS
 SELECT s.id, 'top-level'::text AS scope, md5(lower(a."nameID")) AS grp FROM space s JOIN actor a ON a.id=s.id
  WHERE s.level=0 AND lower(a."nameID") IN (SELECT lower(a2."nameID") FROM space s2 JOIN actor a2 ON a2.id=s2.id WHERE s2.level=0 GROUP BY 1 HAVING count(*)>1)
 UNION ALL
 SELECT s.id, 'subspace', md5(s."levelZeroSpaceID"::text||lower(a."nameID")) FROM space s JOIN actor a ON a.id=s.id
  WHERE s.level>0 AND (s."levelZeroSpaceID", lower(a."nameID")) IN (SELECT s2."levelZeroSpaceID", lower(a2."nameID") FROM space s2 JOIN actor a2 ON a2.id=s2.id WHERE s2.level>0 GROUP BY 1,2 HAVING count(*)>1);
ANALYZE b2tw;
-- usage of every space named by B2 or twinned with one
DROP TABLE IF EXISTS b2u;
CREATE TEMP TABLE b2u AS
 SELECT s.id, s.level, a."createdDate" AS created,
  (SELECT count(*) FROM space k WHERE k."levelZeroSpaceID"=s.id AND k.id<>s.id) AS tree_subs,
  (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id) AS subs,
  (SELECT count(*) FROM credential c WHERE c."resourceID"=s.id::text AND c.type='space-member') AS members,
  (SELECT count(*) FROM credential c WHERE c."resourceID"=s.id::text AND c.type='space-admin') AS admins,
  (SELECT count(*) FROM callout c WHERE c."calloutsSetId"=co."calloutsSetId") AS callouts,
  (SELECT count(*) FROM callout_contribution cc JOIN callout c ON c.id=cc."calloutId" WHERE c."calloutsSetId"=co."calloutsSetId") AS contributions,
  (SELECT count(*) FROM activity ac WHERE ac."collaborationID"=co.id) AS activity_rows,
  (SELECT max(ac."createdDate")::date FROM activity ac WHERE ac."collaborationID"=co.id) AS last_activity,
  (SELECT count(DISTINCT ac."triggeredBy") FROM activity ac WHERE ac."collaborationID"=co.id) AS people_active
 FROM space s JOIN actor a ON a.id=s.id LEFT JOIN collaboration co ON co.id=s."collaborationId"
 WHERE s.id IN (SELECT id FROM b2s UNION SELECT id FROM b2tw);
ANALYZE b2u;
\echo --- B2 G5 overlap: B2 spaces or their twins that are also rejected, or sit in another repair rule (expect 0 everywhere)
SELECT (SELECT count(*) FROM b2s b JOIN orphan o ON o.tbl='space' AND o.id=b.id::text) AS b2_spaces_also_rejected,
       (SELECT count(*) FROM b2tw t JOIN orphan o ON o.tbl='space' AND o.id=t.id::text) AS twins_also_rejected,
       (SELECT count(*) FROM b2u u JOIN space s ON s.id=u.id JOIN orphan o ON o.id IN (s."collaborationId"::text, s."communityId"::text, s."aboutId"::text, s."storageAggregatorId"::text, s."licenseId"::text)) AS their_structure_rows_rejected,
       (SELECT count(*) FROM heritage h JOIN b2u u ON u.id::text=h.id WHERE h.rule NOT IN ('space-wrong-level-parent','space-level-zero-not-chain-root','space-l0-nameid-surplus','space-subspace-nameid-surplus','space-l0-restricted-nameid')) AS in_another_repair_rule;
\echo --- B2 G6 duplicate handles, every twin: how far apart they were created, what each holds, which one the rule renames and which one is used less
WITH t AS (
 SELECT w.scope, w.grp, u.*, s."parentSpaceId" AS par, s."levelZeroSpaceID" AS root,
        (SELECT r."accountId" FROM space r WHERE r.id=s."levelZeroSpaceID") AS acct,
        (SELECT md5(p."displayName") FROM space_about sa JOIN profile p ON p.id=sa."profileId" WHERE sa.id=s."aboutId") AS title_hash
   FROM b2tw w JOIN b2u u ON u.id=w.id JOIN space s ON s.id=w.id)
SELECT scope, left(grp,6) AS grp, left(md5(id::text),6) AS space_ref, level, created::date AS created,
       round(extract(epoch FROM created - min(created) OVER g)::numeric, 3) AS seconds_after_first,
       min(acct::text) OVER g = max(acct::text) OVER g AS same_account, min(coalesce(par::text,'')) OVER g = max(coalesce(par::text,'')) OVER g AS same_parent, min(title_hash) OVER g = max(title_hash) OVER g AS same_title,
       root IN (SELECT id FROM b2tw WHERE scope='top-level') AS root_is_a_twin,
       tree_subs, members, admins, callouts, contributions, activity_rows, last_activity, people_active,
       id IN (SELECT id FROM b2s WHERE rule LIKE '%nameid-surplus') AS rule_renames_it,
       row_number() OVER (PARTITION BY grp ORDER BY last_activity DESC NULLS LAST, activity_rows DESC, callouts DESC, tree_subs DESC, created) > 1 AS used_less
  FROM t WINDOW g AS (PARTITION BY grp) ORDER BY scope DESC, grp, created;
\echo --- B2 G7 restricted handles by level (the server refuses them for top-level spaces only) and when the spaces were made (list added 2025-05-21)
SELECT s.level, count(*) AS spaces_with_restricted_handle, count(*) FILTER (WHERE a."createdDate" < '2025-05-21') AS created_before_the_list
  FROM space s JOIN actor a ON a.id=s.id WHERE lower(a."nameID") IN (SELECT w FROM restricted_names) GROUP BY 1 ORDER BY 1;
SELECT left(md5(u.id::text),6) AS space_ref, u.created::date AS created, u.tree_subs, u.members, u.admins, u.callouts, u.contributions, u.activity_rows, u.last_activity
  FROM b2u u JOIN b2s b ON b.id=u.id AND b.rule='space-l0-restricted-nameid' ORDER BY 2;
\echo --- B2 G8 hierarchy faults, per space: depth, what the roles and storage point at, and use
WITH RECURSIVE anc AS (SELECT s.id, s."parentSpaceId" AS a, 1 AS d FROM space s WHERE s."parentSpaceId" IS NOT NULL
                       UNION ALL SELECT anc.id, p."parentSpaceId", anc.d+1 FROM anc JOIN space p ON p.id=anc.a WHERE p."parentSpaceId" IS NOT NULL AND anc.d<10)
SELECT left(md5(s.id::text),6) AS space_ref, (SELECT string_agg(rule, ' + ' ORDER BY rule) FROM b2s b WHERE b.id=s.id) AS rules,
       s.level, p.level AS parent_level, (SELECT count(*) FROM anc WHERE anc.id=s.id) AS ancestors, u.created::timestamp(0) AS created,
       s."accountId" IS NOT NULL AS has_account,
       rs."parentRoleSetId" IS NOT NULL AS role_set_has_parent, rs."parentRoleSetId"=pc."roleSetId" AS role_set_parent_is_parent_space,
       (SELECT string_agg(DISTINCT coalesce(anc.d::text,'none'), ',') FROM role r CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e LEFT JOIN anc ON anc.id=s.id AND anc.a::text=e->>'resourceID' WHERE r."roleSetId"=rs.id) AS role_parent_credentials_name_ancestor_depths,
       sa."parentStorageAggregatorId" IS NOT NULL AS storage_has_parent, sa."parentStorageAggregatorId"=p."storageAggregatorId" AS storage_parent_is_parent_space,
       u.subs, u.members, u.admins, u.callouts, u.contributions, u.activity_rows, u.last_activity
  FROM b2u u JOIN space s ON s.id=u.id LEFT JOIN space p ON p.id=s."parentSpaceId"
  JOIN community c ON c.id=s."communityId" JOIN role_set rs ON rs.id=c."roleSetId" LEFT JOIN community pc ON pc.id=p."communityId"
  JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId"
 WHERE u.id IN (SELECT id FROM b2s WHERE rule IN ('space-wrong-level-parent','space-level-zero-not-chain-root')) ORDER BY u.created;
\echo --- B2 G9 simulation: clear the parent pointer of every level-0 space, then count what the two hierarchy rules still flag (acceptance: 2 left, the L2 under an L2)
WITH RECURSIVE sp AS (SELECT id, level, "levelZeroSpaceID" AS root, CASE WHEN level=0 THEN NULL ELSE "parentSpaceId" END AS par FROM space),
 ch AS (SELECT id, id AS cur, par, 0 AS d FROM sp UNION ALL SELECT ch.id, p.id, p.par, ch.d+1 FROM ch JOIN sp p ON p.id=ch.par WHERE ch.d<10),
 wl AS (SELECT s.id FROM sp s LEFT JOIN sp p ON p.id=s.par WHERE s.level>0 AND (p.id IS NULL OR s.level<>p.level+1)),
 nr AS (SELECT ch.id FROM ch JOIN sp s ON s.id=ch.id WHERE ch.par IS NULL AND s.root IS DISTINCT FROM ch.cur)
SELECT (SELECT count(*) FROM space WHERE level=0 AND "parentSpaceId" IS NOT NULL) AS pointers_cleared,
       (SELECT count(*) FROM wl) AS wrong_level_parent_left, (SELECT count(*) FROM nr) AS not_chain_root_left,
       (SELECT count(*) FROM (SELECT id FROM wl UNION SELECT id FROM nr) x) AS spaces_left;
\echo --- B2 G10 tree-wide soundness: cycles, depth, levels, accounts, roots (acceptance: max depth 3, 4 chains deeper than 2, 1 level-0 with a parent, the rest 0)
WITH RECURSIVE ch AS (SELECT id, "parentSpaceId" AS par, 0 AS d FROM space UNION ALL SELECT ch.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10)
SELECT (SELECT max(d) FROM ch) AS max_depth, (SELECT count(DISTINCT id) FROM ch WHERE d>2) AS deeper_than_2, (SELECT count(DISTINCT id) FROM ch WHERE d>=10) AS cyclic_or_10_plus,
 (SELECT count(*) FROM space WHERE level NOT IN (0,1,2)) AS level_out_of_range,
 (SELECT count(*) FROM space WHERE level=0 AND "parentSpaceId" IS NOT NULL) AS l0_with_parent,
 (SELECT count(*) FROM space WHERE level>0 AND "parentSpaceId" IS NULL) AS sub_without_parent,
 (SELECT count(*) FROM space WHERE level>0 AND "accountId" IS NOT NULL) AS sub_with_account,
 (SELECT count(*) FROM space WHERE level=0 AND "accountId" IS NULL) AS l0_without_account,
 (SELECT count(*) FROM space WHERE level=0 AND "levelZeroSpaceID"<>id) AS l0_root_not_self,
 (SELECT count(*) FROM space s WHERE NOT EXISTS (SELECT 1 FROM space r WHERE r.id=s."levelZeroSpaceID")) AS root_missing,
 (SELECT count(*) FROM space s JOIN space r ON r.id=s."levelZeroSpaceID" WHERE r.level<>0) AS root_not_l0;
\echo --- B2 G11 tree-wide: do role sets and storage follow the space tree (acceptance: all subspaces follow; 95 top-level storage without a parent, 2 under another account)
SELECT s.level, count(*) AS spaces,
       count(*) FILTER (WHERE rs."parentRoleSetId" IS NULL) AS role_set_no_parent,
       count(*) FILTER (WHERE rs."parentRoleSetId" IS NOT NULL AND rs."parentRoleSetId" IS DISTINCT FROM pc."roleSetId") AS role_set_parent_not_parent_space,
       count(*) FILTER (WHERE sa."parentStorageAggregatorId" IS NULL) AS storage_no_parent,
       count(*) FILTER (WHERE s.level>0 AND sa."parentStorageAggregatorId" IS NOT NULL AND sa."parentStorageAggregatorId" IS DISTINCT FROM p."storageAggregatorId") AS sub_storage_parent_not_parent_space,
       count(*) FILTER (WHERE s.level=0 AND sa."parentStorageAggregatorId" IS NOT NULL AND sa."parentStorageAggregatorId" IS DISTINCT FROM ac."storageAggregatorId") AS top_storage_parent_not_own_account
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role_set rs ON rs.id=c."roleSetId" JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId"
  LEFT JOIN space p ON p.id=s."parentSpaceId" LEFT JOIN community pc ON pc.id=p."communityId" LEFT JOIN account ac ON ac.id=s."accountId" GROUP BY 1 ORDER BY 1;
\echo --- B2 G12 handle format by level (informational, no rule): the server pads generated handles to 5 characters and accepts up to 28 on input, so short or long handles matter only if the new server sets a length rule
SELECT s.level, count(*) AS spaces, count(*) FILTER (WHERE length(a."nameID")<5) AS shorter_than_5, count(*) FILTER (WHERE length(a."nameID")>25) AS longer_than_25,
       count(*) FILTER (WHERE a."nameID"<>lower(a."nameID")) AS not_lower_case, count(*) FILTER (WHERE a."nameID" !~ '^[a-zA-Z0-9-]+$') AS other_characters
  FROM space s JOIN actor a ON a.id=s.id GROUP BY 1 ORDER BY 1;
\echo --- B2 G13 top-level space handle that another kind of actor also uses; informational, the address prefix differs
SELECT a2.type, count(*) AS n FROM space s JOIN actor a ON a.id=s.id JOIN actor a2 ON lower(a2."nameID")=lower(a."nameID") AND a2.id<>a.id AND a2.type<>'space' WHERE s.level=0 GROUP BY 1 ORDER BY 1;
\echo --- B2 G14 origin of the hierarchy faults: how many were created per day (one test session shows as one day)
SELECT u.created::date AS created_on, count(*) AS hierarchy_spaces, sum(u.members) AS members, max(u.last_activity) AS last_activity
  FROM b2u u WHERE u.id IN (SELECT id FROM b2s WHERE rule IN ('space-wrong-level-parent','space-level-zero-not-chain-root')) GROUP BY 1 ORDER BY 1;

\echo --- B2 G15 top-level spaces that still point at a parent: is every other part of the row the shape of a top-level space (acceptance: 1 space; all t except roles_name_own_space f, which is finding C8, and storage_under_account f, which is the storage open item)
SELECT left(md5(s.id::text),6) AS space_ref, p.level AS pointer_level, s."accountId" IS NOT NULL AS has_account, s."levelZeroSpaceID"=s.id AS root_is_itself,
       s."templatesManagerId" IS NOT NULL AS has_templates_manager, s."licenseId" IS NOT NULL AS has_licence,
       rs."parentRoleSetId" IS NULL AS role_set_has_no_parent,
       NOT EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND jsonb_array_length(r."parentCredentials")>0) AS roles_inherit_from_nobody,
       NOT EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND r.credential->>'resourceID' IS DISTINCT FROM s.id::text) AS roles_name_own_space,
       sa."parentStorageAggregatorId" IS NOT DISTINCT FROM ac."storageAggregatorId" AS storage_under_account,
       CASE WHEN ap."parentAuthorizationPolicyId" IS NULL THEN 'none' WHEN ap."parentAuthorizationPolicyId"=pa."authorizationId" THEN 'policy of the pointer space' ELSE 'other' END AS stored_policy_parent,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id) AS subspaces,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id AND k."levelZeroSpaceID"=s.id AND k.level=1) AS subspaces_that_name_it_as_root
  FROM space s JOIN space p ON p.id=s."parentSpaceId" JOIN actor a ON a.id=s.id LEFT JOIN actor pa ON pa.id=p.id LEFT JOIN authorization_policy ap ON ap.id=a."authorizationId"
  LEFT JOIN account ac ON ac.id=s."accountId" LEFT JOIN community c ON c.id=s."communityId" LEFT JOIN role_set rs ON rs.id=c."roleSetId" LEFT JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId"
 WHERE s.level=0 ORDER BY 1;
\echo --- B2 G16 what the server does through a leftover parent pointer (acceptance: 1 space listed as subspace of its old parent, old parent cannot be deleted, 3 spaces swept by a member removal above, 0 people who would lose a credential today)
-- role.set.service.ts:1363-1368: removing a member of a space revokes that person's space credentials in every space below it, found by walking the parent pointers.
-- space.service.ts:549-554: a space with subspaces cannot be deleted.
WITH RECURSIVE l0p AS (SELECT s.id FROM space s WHERE s.level=0 AND s."parentSpaceId" IS NOT NULL),
 below AS (SELECT id AS top, id FROM l0p UNION ALL SELECT b.top, k.id FROM below b JOIN space k ON k."parentSpaceId"=b.id),
 above AS (SELECT l.id AS top, s."parentSpaceId" AS anc, 1 AS d FROM l0p l JOIN space s ON s.id=l.id UNION ALL SELECT a.top, s."parentSpaceId", a.d+1 FROM above a JOIN space s ON s.id=a.anc WHERE s."parentSpaceId" IS NOT NULL AND a.d<10)
SELECT (SELECT count(*) FROM l0p) AS top_level_spaces_listed_under_an_old_parent,
       (SELECT count(DISTINCT s."parentSpaceId") FROM space s JOIN l0p ON l0p.id=s.id) AS old_parents_that_cannot_be_deleted,
       (SELECT count(*) FROM below) AS spaces_swept_by_a_member_removal_above,
       (SELECT count(*) FROM above) AS spaces_above_through_the_pointer,
       (SELECT count(DISTINCT c."actorId") FROM below b JOIN credential c ON c."resourceID"=b.id::text AND c.type LIKE 'space-%' AND c.type NOT LIKE 'space-license-%' AND c.type NOT LIKE 'space-feature-%'
          WHERE EXISTS (SELECT 1 FROM above a JOIN credential m ON m."resourceID"=a.anc::text AND m.type='space-member' AND m."actorId"=c."actorId" WHERE a.top=b.top)) AS people_who_would_lose_a_credential_today;
\echo --- B2 G17 sub-subspaces under a sub-subspace, per space: what a move to the subspace above would have to settle (acceptance: 2 spaces; subspaces, credentials, pending 0; both parents give the same platform access; no handle clash)
SELECT left(md5(s.id::text),6) AS space_ref, g.level AS level_two_above, g."levelZeroSpaceID"=s."levelZeroSpaceID" AS same_top_level_space,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=s.id) AS subspaces,
       (SELECT count(*) FROM credential c WHERE c."resourceID"=s.id::text) AS credentials_on_it,
       (SELECT count(*) FROM invitation i WHERE i."roleSetId"=cm."roleSetId")+(SELECT count(*) FROM application i WHERE i."roleSetId"=cm."roleSetId")+(SELECT count(*) FROM platform_invitation i WHERE i."roleSetId"=cm."roleSetId") AS pending_invitations_and_applications,
       s.settings->'privacy'->>'mode' AS privacy, md5(p."platformRolesAccess"::text)=md5(g."platformRolesAccess"::text) AS both_parents_give_same_platform_access,
       (SELECT count(*) FROM callout c JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" WHERE co.id=s."collaborationId") AS callouts,
       (SELECT count(*) FROM storage_bucket b JOIN file f ON f."storageBucketId"=b.id WHERE b."storageAggregatorId"=s."storageAggregatorId") AS files,
       (SELECT count(*) FROM space k WHERE k."parentSpaceId"=g.id AND k."sortOrder"=s."sortOrder") AS new_siblings_on_its_sort_position,
       (SELECT count(*) FROM activity ac WHERE ac.type='subspace-created' AND ac."resourceID"::text=s.id::text) AS subspace_created_entries_in_old_parent_log
  FROM space s JOIN space p ON p.id=s."parentSpaceId" LEFT JOIN space g ON g.id=p."parentSpaceId" LEFT JOIN community cm ON cm.id=s."communityId"
 WHERE s.level=2 AND p.level=2 ORDER BY 1;
\echo --- B2 G18 every subspace against what the server writes for a subspace (role.set.service.ts:2063-2088, conversion.service.ts:988-1002, space.service.authorization.ts:125-128): spaces per level that differ
\echo ---     (acceptance: level not parent plus one 2; role set, storage and policy parent 0; parent list differs from the server formula 92 at level 1 and 283 at level 2, first entry not the parent 1 and 157: these are the groups of C8 G12 and G13 and of finding C8, not of B2)
SELECT s.level, count(*) AS subspaces,
       count(*) FILTER (WHERE p.id IS NULL OR s.level<>p.level+1) AS level_is_not_parent_plus_one,
       count(*) FILTER (WHERE s."levelZeroSpaceID" IS DISTINCT FROM p."levelZeroSpaceID") AS other_top_level_space_than_parent,
       count(*) FILTER (WHERE rs."parentRoleSetId" IS DISTINCT FROM pc."roleSetId") AS role_set_parent_is_not_parent_space,
       count(*) FILTER (WHERE sa."parentStorageAggregatorId" IS DISTINCT FROM p."storageAggregatorId") AS storage_parent_is_not_parent_space,
       count(*) FILTER (WHERE ap."parentAuthorizationPolicyId" IS DISTINCT FROM pa."authorizationId") AS policy_parent_is_not_parent_space,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM role r LEFT JOIN role pr ON pr."roleSetId"=pc."roleSetId" AND pr.name=r.name
                                       WHERE r."roleSetId"=rs.id AND r."parentCredentials" IS DISTINCT FROM (jsonb_build_array(pr.credential) || pr."parentCredentials"))) AS parent_list_differs_from_server_formula,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND r."parentCredentials"->0->>'resourceID' IS DISTINCT FROM s."parentSpaceId"::text)) AS first_parent_entry_is_not_the_parent
  FROM space s LEFT JOIN space p ON p.id=s."parentSpaceId" JOIN actor a ON a.id=s.id LEFT JOIN actor pa ON pa.id=p.id LEFT JOIN authorization_policy ap ON ap.id=a."authorizationId"
  LEFT JOIN community c ON c.id=s."communityId" LEFT JOIN role_set rs ON rs.id=c."roleSetId" LEFT JOIN community pc ON pc.id=p."communityId" LEFT JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId"
 WHERE s.level>0 GROUP BY 1 ORDER BY 1;
\echo --- B2 G19 the rename plan, per twin that would get a new handle (the twin that is used less, ordering of G6): is the new handle free, does it fit, what changes address with it, who is in it
\echo ---     (acceptance: 6 twins; new handle free 6, fits 28 characters 6; stored links to the old handle 0; 6 subspaces and 47 callouts of the twins themselves change address; in the 5 twins that have a member, that member is also in the twin that keeps the handle)
WITH tw AS (
 SELECT w.scope, w.grp, u.id, s.level, s."levelZeroSpaceID" AS root, a."nameID" AS h,
        row_number() OVER (PARTITION BY w.grp ORDER BY u.last_activity DESC NULLS LAST, u.activity_rows DESC, u.callouts DESC, u.tree_subs DESC, u.created) AS rk,
        row_number() OVER (PARTITION BY w.grp ORDER BY u.created, u.id) AS age_rank, u.members, u.admins, u.callouts, u.tree_subs
   FROM b2tw w JOIN b2u u ON u.id=w.id JOIN space s ON s.id=w.id JOIN actor a ON a.id=s.id),
 pl AS (SELECT t.*, (SELECT min(n) FROM generate_series(1,99) n WHERE NOT EXISTS (
            SELECT 1 FROM space x JOIN actor xa ON xa.id=x.id WHERE lower(xa."nameID")=lower(t.h)||'-'||n::text AND ((t.level=0 AND x.level=0) OR (t.level>0 AND x.level>0 AND x."levelZeroSpaceID"=t.root)))
            AND NOT (t.level=0 AND lower(t.h)||'-'||n::text IN (SELECT w FROM restricted_names))) AS suffix FROM tw t WHERE t.rk>1)
SELECT scope, left(grp,6) AS grp, left(md5(id::text),6) AS space_ref, level, age_rank=1 AS is_the_earlier_twin, suffix AS number_added,
       length(h)+1+length(suffix::text) AS new_length, length(h)+1+length(suffix::text)<=28 AS fits_28_characters,
       (lower(h)||'-'||suffix::text) ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AS new_handle_passes_strict_rule,
       members, admins, callouts AS callouts_changing_address,
       (SELECT count(*) FROM credential c WHERE c.type='space-member' AND c."resourceID"=pl.id::text AND EXISTS (SELECT 1 FROM tw k JOIN credential c2 ON c2."resourceID"=k.id::text AND c2.type='space-member' WHERE k.grp=pl.grp AND k.rk=1 AND c2."actorId"=c."actorId")) AS members_also_in_the_kept_twin,
       (SELECT count(*) FROM space k WHERE k.id<>pl.id AND (k."levelZeroSpaceID"=pl.id OR k."parentSpaceId"=pl.id)) AS subspaces_changing_address,
       (SELECT count(*) FROM reference r WHERE r.uri ~* ('alkem\.io/([^?#]*/)?' || h || '([/?#]|$)'))+(SELECT count(*) FROM profile p WHERE p.description ~* ('alkem\.io/([^?#"<> ]*/)?' || h || '([/?#"<> ]|$)')) AS stored_links_to_the_old_handle
  FROM pl ORDER BY scope DESC, grp;
\echo --- B2 G20 space handles that end in a hyphen and a number, the form the server gives a taken handle, by level: the population a renamed twin joins (acceptance: 39 of 468, 222 of 995, 182 of 485)
SELECT s.level, count(*) FILTER (WHERE a."nameID" ~ '-[0-9]+$') AS handles_ending_in_a_number, count(*) AS spaces FROM space s JOIN actor a ON a.id=s.id GROUP BY 1 ORDER BY 1;
\echo === B3 guards
\echo --- B3 G1 callouts whose declared type has no content: what a delete of the empty shell would remove
SELECT f.type AS declared_type, count(*) AS callouts,
       count(*) FILTER (WHERE c.settings->>'visibility'='published') AS published,
       count(*) FILTER (WHERE coalesce(p.description,'')<>'') AS with_description,
       count(*) FILTER (WHERE coalesce(r."messagesCount",0) > 0) AS with_comments,
       coalesce(sum(r."messagesCount"),0) AS comments,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."calloutId"=c.id)) AS with_responses,
       (SELECT count(*) FROM callout_contribution cc JOIN callout c2 ON c2.id=cc."calloutId" JOIN callout_framing f2 ON f2.id=c2."framingId" JOIN heritage h2 ON h2.id=f2.id::text AND h2.rule='callout_framing-type-child-mismatch' WHERE f2.type=f.type) AS responses,
       count(*) FILTER (WHERE c."isTemplate") AS inside_templates
  FROM heritage h JOIN callout_framing f ON f.id::text=h.id LEFT JOIN callout c ON c."framingId"=f.id
  LEFT JOIN profile p ON p.id=f."profileId" LEFT JOIN room r ON r.id=c."commentsId"
 WHERE h.rule='callout_framing-type-child-mismatch' AND f.type<>'none' GROUP BY 1 ORDER BY 2 DESC;
\echo --- B3 G1b the same callouts by creation month (one closed window points at one cause, a spread points at a live generator)
SELECT to_char(c."createdDate",'YYYY-MM') AS month, count(*) AS callouts, count(DISTINCT c."calloutsSetId") AS callout_sets
  FROM callout c JOIN callout_framing f ON f.id=c."framingId" WHERE f.type::text='whiteboard' AND f."whiteboardId" IS NULL GROUP BY 1 ORDER BY 1;

\echo --- B3 G2 callouts declared without a type that carry content: the server deletes that content on the next edit
SELECT md5(f.id::text) AS framing_ref, (f."whiteboardId" IS NOT NULL) AS whiteboard, (f."memoId" IS NOT NULL) AS memo, (f."linkId" IS NOT NULL) AS link,
       (f."mediaGalleryId" IS NOT NULL) AS media_gallery, (f."pollId" IS NOT NULL) AS poll, (f."collaboraDocumentId" IS NOT NULL) AS office_document,
       coalesce((SELECT length(w.content) FROM whiteboard w WHERE w.id=f."whiteboardId"),0) AS whiteboard_content_chars, c.settings->>'visibility' AS visibility
  FROM heritage h JOIN callout_framing f ON f.id::text=h.id LEFT JOIN callout c ON c."framingId"=f.id
 WHERE h.rule='callout_framing-type-child-mismatch' AND f.type='none';
\echo --- B3 G3 responses whose declared type has no content: is another kind of content attached (wrong type) or nothing (empty shell)
SELECT cc.type AS declared_type,
       CASE WHEN cc."postId" IS NOT NULL THEN 'carries a post' WHEN cc."whiteboardId" IS NOT NULL THEN 'carries a whiteboard' WHEN cc."linkId" IS NOT NULL THEN 'carries a link'
            WHEN cc."memoId" IS NOT NULL THEN 'carries a memo' WHEN cc."collaboraDocumentId" IS NOT NULL THEN 'carries an office document' ELSE 'carries nothing' END AS actual,
       count(*) AS responses, count(*) FILTER (WHERE cc."createdBy" IS NOT NULL) AS with_author, min(cc."createdDate")::date AS oldest, max(cc."createdDate")::date AS newest
  FROM heritage h JOIN callout_contribution cc ON cc.id::text=h.id WHERE h.rule='callout_contribution-type-child-mismatch' GROUP BY 1,2 ORDER BY 1,2;
\echo --- B3 G4 office document with no file, and the invitation to a parent that does not exist
SELECT 'office document with no file' AS item, d."createdDate"::date AS created,
       CASE WHEN EXISTS (SELECT 1 FROM callout_framing f WHERE f."collaboraDocumentId"=d.id) THEN 'framing of a callout'
            WHEN EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."collaboraDocumentId"=d.id) THEN 'response to a callout' ELSE 'not attached' END AS attached_to
  FROM heritage h JOIN collabora_document d ON d.id::text=h.id WHERE h.rule='collabora_document-no-file'
UNION ALL
SELECT 'invitation to parent without parent', i."createdDate"::date, 'role set type ' || rs.type || ', state ' || coalesce(l."machineState"::jsonb->>'value','no state stored')
  FROM heritage h JOIN invitation i ON i.id::text=h.id JOIN role_set rs ON rs.id=i."roleSetId" LEFT JOIN lifecycle l ON l.id=i."lifecycleId"
 WHERE h.rule='invitation-to-parent-without-parent';

\echo --- B3 G5 whiteboard callouts with no whiteboard: where they sit (info; a template or a template content space would spread the defect by copy)
DROP TABLE IF EXISTS b3_w;
CREATE TEMP TABLE b3_w AS
SELECT c.id, c."calloutsSetId", c."isTemplate", c.settings, c."commentsId", c."createdDate", c."updatedDate", f.id AS framing_id, f."profileId" AS framing_profile
  FROM callout c JOIN callout_framing f ON f.id=c."framingId"
 WHERE f.type::text='whiteboard' AND f."whiteboardId" IS NULL;
ANALYZE b3_w;
SELECT CASE WHEN s.id IS NOT NULL AND EXISTS (SELECT 1 FROM template t WHERE t."contentSpaceId"=s.id) THEN 'template content space'
            WHEN s.id IS NOT NULL THEN 'space level ' || s.level
            WHEN co.id IS NOT NULL THEN 'collaboration with no space'
            WHEN EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=w.id) THEN 'callout template'
            WHEN EXISTS (SELECT 1 FROM knowledge_base kb WHERE kb."calloutsSetId"=w."calloutsSetId") THEN 'knowledge base'
            ELSE 'no owner found' END AS place,
       count(*) AS callouts, count(DISTINCT w."calloutsSetId") AS callout_sets,
       count(*) FILTER (WHERE w.settings->>'visibility'='published') AS published,
       count(DISTINCT s.id) AS spaces
  FROM b3_w w LEFT JOIN collaboration co ON co."calloutsSetId"=w."calloutsSetId" LEFT JOIN space s ON s."collaborationId"=co.id
 GROUP BY 1 ORDER BY 2 DESC;
\echo --- B3 G5b the same callouts: how many spaces, top-level spaces and accounts are touched (info; the account is that of the top-level space)
SELECT count(DISTINCT s.id) AS spaces, count(DISTINCT s."levelZeroSpaceID") AS top_level_spaces, count(DISTINCT z."accountId") AS accounts,
       (SELECT count(*) FROM callout x WHERE x."calloutsSetId" IN (SELECT "calloutsSetId" FROM b3_w)) AS callouts_in_the_same_callout_sets
  FROM b3_w w JOIN collaboration co ON co."calloutsSetId"=w."calloutsSetId" JOIN space s ON s."collaborationId"=co.id
  LEFT JOIN space z ON z.id=s."levelZeroSpaceID";
\echo --- B3 G6 the same callouts: when they were last written and what their settings allow (info; one update day points at one migration; contributions off and no room is what a plain callout looks like)
SELECT count(*) AS callouts, min(w."updatedDate")::date AS first_update, max(w."updatedDate")::date AS last_update,
       count(*) FILTER (WHERE (w.settings->'contribution'->>'enabled')::boolean) AS responses_enabled,
       count(*) FILTER (WHERE jsonb_array_length(w.settings->'contribution'->'allowedTypes')>0) AS with_allowed_response_types,
       count(*) FILTER (WHERE w."commentsId" IS NOT NULL) AS with_comment_room,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."calloutId"=w.id)) AS with_responses,
       count(*) FILTER (WHERE coalesce(p.description,'')<>'') AS with_description
  FROM b3_w w LEFT JOIN profile p ON p.id=w.framing_profile;
\echo --- B3 G6b the same callouts by the day of their last write (info; one day that carries nearly all rows is the day one migration wrote them; rows on another day have another origin and are read alone)
SELECT w."updatedDate"::date AS last_write_day, count(*) AS callouts, min(w."createdDate")::date AS oldest_created, max(w."createdDate")::date AS newest_created
  FROM b3_w w GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 15;
\echo --- B3 G6c origin: whiteboard callouts by creation month, with and without a whiteboard (info; a closed run of months with losses and none after it means one past event, not a live generator; on acceptance the run is 2023-09 to 2024-02, the months of the old real-time whiteboard table)
SELECT to_char(c."createdDate",'YYYY-MM') AS created,
       count(*) FILTER (WHERE f."whiteboardId" IS NOT NULL) AS with_whiteboard,
       count(*) FILTER (WHERE f."whiteboardId" IS NOT NULL AND extract(microseconds FROM w."createdDate")::bigint % 1000000 = 0) AS of_them_copied_from_the_old_table,
       count(*) FILTER (WHERE f."whiteboardId" IS NULL) AS without_whiteboard
  FROM callout c JOIN callout_framing f ON f.id=c."framingId" LEFT JOIN whiteboard w ON w.id=f."whiteboardId"
 WHERE f.type::text='whiteboard'
 GROUP BY 1 HAVING count(*) FILTER (WHERE f."whiteboardId" IS NULL) > 0 OR to_char(min(c."createdDate"),'YYYY-MM') < '2024-09'
 ORDER BY 1;
\echo --- B3 G6d origin: storage buckets that no profile and no aggregator uses, by what their frozen policy says they were and whether one was created within 3 seconds of a lost callout (info; a whiteboard bucket next to a lost callout proves the board existed; files in it prove it was used and are the last remains of the board)
DROP TABLE IF EXISTS b3_ob;
CREATE TEMP TABLE b3_ob AS
SELECT b.id, b."createdDate" AS cd, ap."updatedDate" AS pud, ap.version AS pv, ap."credentialRules"::jsonb AS cr,
       false AS next_lost, NULL::text AS kind
  FROM storage_bucket b LEFT JOIN authorization_policy ap ON ap.id=b."authorizationId"
 WHERE NOT EXISTS (SELECT 1 FROM profile p WHERE p."storageBucketId"=b.id)
   AND NOT EXISTS (SELECT 1 FROM storage_aggregator sa WHERE sa."directStorageId"=b.id);
UPDATE b3_ob o SET next_lost = true WHERE EXISTS (SELECT 1 FROM b3_w l WHERE o.cd BETWEEN l."createdDate" - interval '3 s' AND l."createdDate" + interval '3 s');
UPDATE b3_ob SET kind = CASE
  WHEN cr IS NULL THEN 'no policy'
  WHEN cr @? '$[*] ? (@.name == "credentialRule-whiteboardCreatedBy")' AND cr @? '$[*] ? (@.name == "credentialRule-calloutCreatedBy")' THEN 'whiteboard under a callout'
  WHEN cr @? '$[*] ? (@.name == "credentialRule-whiteboardCreatedBy")' THEN 'whiteboard, no callout rule'
  WHEN jsonb_array_length(cr)=0 THEN 'empty rules'
  ELSE 'other' END;
ANALYZE b3_ob;
SELECT o.kind, o.next_lost AS next_to_a_lost_callout, count(DISTINCT o.id) AS buckets,
       count(DISTINCT o.id) FILTER (WHERE fl.id IS NOT NULL) AS buckets_with_files, count(fl.id) AS files,
       pg_size_pretty(coalesce(sum(fl.size),0)::bigint) AS file_bytes, min(fl."createdDate")::date AS first_upload, max(fl."createdDate")::date AS last_upload
  FROM b3_ob o LEFT JOIN file fl ON fl."storageBucketId"=o.id
 GROUP BY 1,2 ORDER BY 1,2;
\echo --- B3 G6e origin, dating method 1: rule shape frozen in the policies of the leftover whiteboard buckets (info; a policy keeps the rules of the last authorization reset that reached it, so the shape names the last release on which the board was still linked; account-host sat in the space admin rule from v0.77.0 of 2024-05-27 to v0.88.2 of 2024-08-20 and left with v0.89.0 of 2024-08-26; the update day can be a bulk migration stamp and is not a reset date by itself)
SELECT o.kind, o.next_lost AS next_to_a_lost_callout,
       (o.cr @? '$[*].criterias[*] ? (@.type == "account-host")') AS has_account_host,
       (o.cr @? '$[*] ? (@.name == "credentialRuleTypes-spaceGlobalRead")') AS has_space_global_read_rule,
       o.pud::date AS policy_last_update, min(o.pv) AS min_version, max(o.pv) AS max_version, count(*) AS buckets,
       min(o.cd)::date AS oldest_bucket, max(o.cd)::date AS newest_bucket
  FROM b3_ob o WHERE o.kind LIKE 'whiteboard%' GROUP BY 1,2,3,4,5 ORDER BY 1,2,8 DESC;
\echo --- B3 G6f origin: was the removal clean (expect 0 in the first three columns; then the whiteboard row, its policy and its profile all went and only the bucket stayed, which no delete path in the server code does; a non-zero value means half-deleted boards and another cause)
DROP TABLE IF EXISTS b3_used;
SELECT 'CREATE TEMP TABLE b3_used AS ' || string_agg(format('SELECT %I::text AS id FROM %I WHERE %I IS NOT NULL', column_name, table_name, column_name), ' UNION ALL ')
  FROM information_schema.columns WHERE table_schema='public' AND column_name='authorizationId' AND table_name NOT LIKE '\_%' \gexec
CREATE INDEX ON b3_used(id);
ANALYZE b3_used;
DROP TABLE IF EXISTS b3_op;
CREATE TEMP TABLE b3_op AS
SELECT ap.id, coalesce(nullif(ap.type::text,''),'(no type)') AS type, ap."createdDate" AS cd, ap."credentialRules"::jsonb AS cr
  FROM authorization_policy ap WHERE NOT EXISTS (SELECT 1 FROM b3_used u WHERE u.id = ap.id::text);
ANALYZE b3_op;
SELECT (SELECT count(*) FROM b3_op WHERE cr @? '$[*] ? (@.name == "credentialRule-whiteboardCreatedBy")') AS unowned_policies_with_the_whiteboard_creator_rule,
       (SELECT count(*) FROM b3_op WHERE type='whiteboard') AS unowned_policies_of_type_whiteboard,
       (SELECT count(*) FROM profile p WHERE p.type::text='whiteboard' AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."profileId"=p.id)) AS whiteboard_profiles_with_no_whiteboard,
       (SELECT count(*) FROM b3_op o WHERE EXISTS (SELECT 1 FROM b3_w l WHERE o.cd BETWEEN l."createdDate" - interval '3 s' AND l."createdDate" + interval '3 s')) AS unowned_policies_of_any_type_within_3_s_of_a_lost_callout;
\echo --- B3 G6g origin, dating method 2: framing version by kind and creation month, callouts that are not templates (info; observed on acceptance: until v0.88.0 of 2024-08-16 the authorization reset saved entities, a framing with no whiteboard gained one version per saving reset and a framing with a whiteboard did not; so a kept board shows one residue class and a lost board shows the same class plus the resets it went through without the board; the rule is read off the data and is not proven from the code)
SELECT to_char(c."createdDate",'YYYY-MM') AS created,
       CASE WHEN f.type::text='whiteboard' AND f."whiteboardId" IS NULL THEN 'wb lost'
            WHEN f.type::text='whiteboard' AND extract(microseconds FROM w."createdDate")::bigint % 1000000 = 0 THEN 'wb kept, old table'
            WHEN f.type::text='whiteboard' THEN 'wb kept, new'
            ELSE 'not whiteboard' END AS kind,
       f.version % 4 AS version_mod_4, count(*) AS framings, percentile_disc(0.5) WITHIN GROUP (ORDER BY f.version) AS median_version, min(f.version) AS min_version, max(f.version) AS max_version
  FROM callout c JOIN callout_framing f ON f.id=c."framingId" LEFT JOIN whiteboard w ON w.id=f."whiteboardId"
 WHERE c."createdDate" >= (SELECT date_trunc('month', min("createdDate")) FROM b3_w)
   AND c."createdDate" <  (SELECT date_trunc('month', max("createdDate")) + interval '7 months' FROM b3_w)
   AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c.id)
 GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- B3 G6h origin, dating method 2: the clock of saving resets, read from framings that never had a whiteboard (info; each row is one version value with the first and last creation time that carries it; the last creation time of version N+1 and the first of version N bracket one saving reset; version 1 starts after the last saving reset)
SELECT f.version, count(*) AS framings, min(c."createdDate") AS first_created, max(c."createdDate") AS last_created
  FROM callout c JOIN callout_framing f ON f.id=c."framingId"
 WHERE f."whiteboardId" IS NULL AND f.type::text <> 'whiteboard' AND f.version <= 12
   AND c."createdDate" < (SELECT min(c2."createdDate") + interval '60 days' FROM callout c2 JOIN callout_framing f2 ON f2.id=c2."framingId"
                           WHERE f2."whiteboardId" IS NULL AND f2.type::text <> 'whiteboard' AND f2.version = 1 AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c2.id))
   AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c.id)
 GROUP BY 1 ORDER BY 1 DESC;
\echo --- B3 G6i origin: the lost callouts by template, version parity, leftover bucket and its rule shape (info; on acceptance a kept board from before the merge has an odd framing version, so an even version is one save more than a kept board; the same class on nearly all rows means one event; every other class lost its board at another time and is read alone on production)
SELECT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=l.id) AS is_template,
       CASE WHEN fr.version > 100 THEN 'high, counted like a callout with no board'
            WHEN fr.version % 2 = 0 THEN 'even, one save more than a kept board'
            ELSE 'odd, the same as a kept board' END AS version_class,
       (x.id IS NOT NULL) AS leftover_bucket,
       (x.cr @? '$[*].criterias[*] ? (@.type == "account-host")') AS bucket_has_account_host,
       count(*) AS callouts, min(l."createdDate")::date AS first_created, max(l."createdDate")::date AS last_created
  FROM b3_w l JOIN callout_framing fr ON fr.id=l.framing_id
  LEFT JOIN LATERAL (SELECT o.id, o.cr FROM b3_ob o WHERE o.cd BETWEEN l."createdDate" - interval '3 s' AND l."createdDate" + interval '3 s'
                      ORDER BY abs(extract(epoch FROM o.cd - l."createdDate")) LIMIT 1) x ON true
 GROUP BY 1,2,3,4 ORDER BY 1,5 DESC;
\echo --- B3 G6i2 origin: version parity of the kept whiteboard framings from the same months (info; this is the baseline that G6i is read against)
SELECT CASE WHEN f.version % 2 = 0 THEN 'even' ELSE 'odd' END AS version_parity, count(*) AS kept_whiteboard_framings
  FROM callout c JOIN callout_framing f ON f.id=c."framingId"
 WHERE f.type::text='whiteboard' AND f."whiteboardId" IS NOT NULL
   AND c."createdDate" >= (SELECT date_trunc('month', min("createdDate")) FROM b3_w)
   AND c."createdDate" <  (SELECT date_trunc('month', max("createdDate")) + interval '1 month' FROM b3_w)
   AND NOT EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=c.id)
 GROUP BY 1 ORDER BY 1;
\echo --- B3 G6j origin: uploads per month into the leftover whiteboard buckets, next to uploads into whiteboards that still exist, by where the board came from (info; a stop in the leftover buckets that the kept old boards share is a change of habit and not a sign of the loss)
WITH lo AS (SELECT to_char(fl."createdDate",'YYYY-MM') AS m, count(*) AS n FROM file fl JOIN b3_ob o ON o.id=fl."storageBucketId" WHERE o.kind LIKE 'whiteboard%' GROUP BY 1),
     ke AS (SELECT to_char(fl."createdDate",'YYYY-MM') AS m,
                   count(*) FILTER (WHERE extract(microseconds FROM w."createdDate")::bigint % 1000000 = 0) AS old_n,
                   count(*) FILTER (WHERE extract(microseconds FROM w."createdDate")::bigint % 1000000 <> 0) AS new_n
              FROM file fl JOIN profile p ON p."storageBucketId"=fl."storageBucketId" JOIN whiteboard w ON w."profileId"=p.id GROUP BY 1)
SELECT coalesce(lo.m, ke.m) AS uploaded, coalesce(lo.n,0) AS into_leftover_whiteboard_buckets,
       coalesce(ke.old_n,0) AS into_kept_boards_copied_from_the_old_table, coalesce(ke.new_n,0) AS into_kept_boards_created_later
  FROM lo FULL JOIN ke ON ke.m=lo.m
 WHERE coalesce(lo.m, ke.m) <= (SELECT to_char(max(fl."createdDate") + interval '7 months','YYYY-MM') FROM file fl JOIN b3_ob o ON o.id=fl."storageBucketId" WHERE o.kind LIKE 'whiteboard%')
 ORDER BY 1;
\echo --- B3 G6k origin: the leftover whiteboard buckets and their files against the reject set (info; a file here is the last remains of a lost board; if the reject set takes it, the distiller drops it; this needs a ruling before any run on production data)
DROP TABLE IF EXISTS b3_rej;
CREATE TEMP TABLE b3_rej AS SELECT tbl, id FROM orphan WHERE tbl IN ('storage_bucket','file');
CREATE INDEX ON b3_rej(id);
ANALYZE b3_rej;
SELECT o.kind, o.next_lost AS next_to_a_lost_callout, count(DISTINCT o.id) AS buckets,
       count(DISTINCT o.id) FILTER (WHERE EXISTS (SELECT 1 FROM b3_rej r WHERE r.tbl='storage_bucket' AND r.id=o.id::text)) AS buckets_in_the_reject_set,
       count(fl.id) AS files,
       count(fl.id) FILTER (WHERE EXISTS (SELECT 1 FROM b3_rej r WHERE r.tbl='file' AND r.id=fl.id::text)) AS files_in_the_reject_set
  FROM b3_ob o LEFT JOIN file fl ON fl."storageBucketId"=o.id
 WHERE o.kind LIKE 'whiteboard%' GROUP BY 1,2 ORDER BY 1,2;
\echo --- B3 G7 can a lost whiteboard be linked back: whiteboards that nothing points at, and pairs that match one of the callouts by name and creation time (expect 0 pairs; more means a re-link must be tried before the type is changed)
DROP TABLE IF EXISTS b3_free;
CREATE TEMP TABLE b3_free AS
SELECT w.id, w."createdDate", w."profileId" FROM whiteboard w
 WHERE NOT EXISTS (SELECT 1 FROM callout_framing f WHERE f."whiteboardId"=w.id)
   AND NOT EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."whiteboardId"=w.id)
   AND NOT EXISTS (SELECT 1 FROM template t WHERE t."whiteboardId"=w.id);
SELECT (SELECT count(*) FROM b3_free) AS whiteboards_nothing_points_at,
       (SELECT min("createdDate")::date FROM b3_free) AS oldest, (SELECT max("createdDate")::date FROM b3_free) AS newest,
       (SELECT count(*) FROM b3_w w JOIN profile p ON p.id=w.framing_profile JOIN b3_free wf ON abs(extract(epoch FROM wf."createdDate"-w."createdDate"))<5
          JOIN profile wp ON wp.id=wf."profileId" AND wp."displayName"=p."displayName") AS pairs_by_name_and_time,
       (SELECT count(*) FROM b3_w w JOIN b3_free wf ON abs(extract(epoch FROM wf."createdDate"-w."createdDate"))<2) AS pairs_by_time_only;
\echo --- B3 G8 the population the repaired callouts would join: callouts of type none with no content, by the same settings shape (info; the repair is safe only if such callouts already exist and work)
SELECT c."isTemplate" AS is_template, count(*) AS plain_callouts,
       count(*) FILTER (WHERE c."commentsId" IS NULL AND NOT (c.settings->'contribution'->>'enabled')::boolean AND jsonb_array_length(c.settings->'contribution'->'allowedTypes')=0) AS no_room_and_responses_off_like_the_defect_rows
  FROM callout_framing f JOIN callout c ON c."framingId"=f.id
 WHERE f.type::text='none' AND f."whiteboardId" IS NULL AND f."linkId" IS NULL AND f."memoId" IS NULL AND f."mediaGalleryId" IS NULL AND f."pollId" IS NULL AND f."collaboraDocumentId" IS NULL
 GROUP BY 1 ORDER BY 1;
\echo --- B3 G8b whiteboard callouts with no whiteboard that do not fit the shape seen on acceptance (expect 0; the repair R1 skips such a row and it is read alone; the shape is: no response, no comment room, responses off, no allowed response type, no whiteboard that could be linked back by creation time, written on the commonest last-write day)
DROP TABLE IF EXISTS b3_w_odd;
CREATE TEMP TABLE b3_w_odd AS
SELECT w.id,
       EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."calloutId"=w.id) AS has_responses,
       (w."commentsId" IS NOT NULL) AS has_comment_room,
       ((w.settings->'contribution'->>'enabled')::boolean OR jsonb_array_length(w.settings->'contribution'->'allowedTypes')>0) AS responses_allowed,
       EXISTS (SELECT 1 FROM b3_free wf WHERE abs(extract(epoch FROM wf."createdDate"-w."createdDate"))<2) AS whiteboard_could_be_linked_back,
       (w."updatedDate"::date IS DISTINCT FROM (SELECT x."updatedDate"::date FROM b3_w x GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1)) AS not_on_the_commonest_write_day
  FROM b3_w w;
SELECT count(*) FILTER (WHERE has_responses OR has_comment_room OR responses_allowed OR whiteboard_could_be_linked_back OR not_on_the_commonest_write_day) AS callouts_that_do_not_fit,
       count(*) FILTER (WHERE has_responses) AS with_responses, count(*) FILTER (WHERE has_comment_room) AS with_comment_room,
       count(*) FILTER (WHERE responses_allowed) AS responses_allowed, count(*) FILTER (WHERE whiteboard_could_be_linked_back) AS whiteboard_could_be_linked_back,
       count(*) FILTER (WHERE not_on_the_commonest_write_day) AS not_on_the_commonest_write_day
  FROM b3_w_odd;
\echo --- B3 G8c the callouts that do not fit, one line each (expect no lines; on production every line is read before any repair of that row)
SELECT md5(w.id::text) AS callout_ref, w."isTemplate" AS is_template, w.settings->>'visibility' AS visibility, w."createdDate"::date AS created, w."updatedDate"::date AS last_written,
       o.has_responses, o.has_comment_room, o.responses_allowed, o.whiteboard_could_be_linked_back, o.not_on_the_commonest_write_day
  FROM b3_w w JOIN b3_w_odd o ON o.id=w.id
 WHERE o.has_responses OR o.has_comment_room OR o.responses_allowed OR o.whiteboard_could_be_linked_back OR o.not_on_the_commonest_write_day
 ORDER BY 4;
\echo --- B3 G9 typeless callouts that carry a whiteboard, one line each: is the whiteboard empty and was the top part ever edited (ruling of 2026-11-13: an empty whiteboard is never deleted, so these rows are kept and tracked as case T6; an empty board is 61 bytes or less; a bigger body is a real drawing and that row is read alone)
SELECT md5(f.id::text) AS framing_ref, c."isTemplate" AS is_template, c.settings->>'visibility' AS visibility, c."createdDate"::date AS created,
       f."createdDate"::date AS top_part_created, f."updatedDate"::date AS top_part_last_updated, (f."updatedDate"-f."createdDate" > interval '5 seconds') AS top_part_edited_after_creation,
       (c.settings->'contribution'->'allowedTypes')::text AS allowed_response_types,
       (SELECT count(*) FROM template t WHERE t."calloutId"=c.id) AS templates, fi.size AS stored_body_bytes, (fi.size>61) AS body_holds_a_drawing, fi."updatedDate"::date AS body_last_written,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id) AS responses
  FROM callout_framing f JOIN callout c ON c."framingId"=f.id JOIN whiteboard w ON w.id=f."whiteboardId" LEFT JOIN file fi ON fi.id::text=w."contentPointer"
 WHERE f.type::text='none';
\echo --- B3 G9b comparison: stored body size of the whiteboards whose content column holds the commonest content, the empty board (info)
WITH e AS (SELECT md5(content) AS m FROM whiteboard GROUP BY 1 ORDER BY count(*) DESC LIMIT 1)
SELECT count(*) AS whiteboards, count(fi.id) AS with_stored_body, min(fi.size) AS smallest_bytes, max(fi.size) AS largest_bytes
  FROM whiteboard w LEFT JOIN file fi ON fi.id::text=w."contentPointer" WHERE md5(w.content)=(SELECT m FROM e);
\echo --- B3 G9c rows that hang under those whiteboards (info; they stay, because the whiteboard is kept)
WITH wb AS (SELECT w.id, w."profileId" FROM callout_framing f JOIN whiteboard w ON w.id=f."whiteboardId" WHERE f.type::text='none'),
     pb AS (SELECT p.id, p."storageBucketId" FROM profile p WHERE p.id IN (SELECT "profileId" FROM wb))
SELECT 'whiteboard' AS what, count(*) AS n FROM wb
UNION ALL SELECT 'profile', count(*) FROM pb
UNION ALL SELECT 'visual', count(*) FROM visual v WHERE v."profileId" IN (SELECT id FROM pb)
UNION ALL SELECT 'tagset', count(*) FROM tagset t WHERE t."profileId" IN (SELECT id FROM pb)
UNION ALL SELECT 'reference', count(*) FROM reference r WHERE r."profileId" IN (SELECT id FROM pb)
UNION ALL SELECT 'location', count(*) FROM location l WHERE l.id IN (SELECT p."locationId" FROM profile p WHERE p.id IN (SELECT id FROM pb))
UNION ALL SELECT 'storage bucket', count(*) FROM storage_bucket b WHERE b.id IN (SELECT "storageBucketId" FROM pb)
UNION ALL SELECT 'file', count(*) FROM file fi WHERE fi."storageBucketId" IN (SELECT "storageBucketId" FROM pb);
\echo --- B3 G10 empty responses per callout (info; shows who is affected and whether a response carries anything worth keeping)
DROP TABLE IF EXISTS b3_r;
CREATE TEMP TABLE b3_r AS
SELECT cc.id, cc.type::text AS type, cc."calloutId", cc."createdBy", cc."createdDate", cc."authorizationId", cc."classificationId", cc."sortOrder"
  FROM callout_contribution cc
 WHERE cc."postId" IS NULL AND cc."whiteboardId" IS NULL AND cc."linkId" IS NULL AND cc."memoId" IS NULL AND cc."collaboraDocumentId" IS NULL;
ANALYZE b3_r;
SELECT r.type AS declared_type, md5(r."calloutId"::text) AS callout_ref, count(*) AS empty_responses,
       (SELECT count(*) FROM callout_contribution x WHERE x."calloutId"=r."calloutId") AS all_responses_on_the_callout,
       c.settings->>'visibility' AS visibility, c."isTemplate" AS is_template,
       count(DISTINCT r."createdBy") AS authors, count(DISTINCT r."createdBy") FILTER (WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=r."createdBy")) AS authors_still_users,
       count(*) FILTER (WHERE r."classificationId" IS NOT NULL) AS with_classification, count(*) FILTER (WHERE r."authorizationId" IS NOT NULL) AS with_policy,
       min(r."createdDate")::date AS first_created, max(r."createdDate")::date AS last_created
  FROM b3_r r LEFT JOIN callout c ON c.id=r."calloutId" GROUP BY r.type, r."calloutId", c.settings, c."isTemplate" ORDER BY 1, 3 DESC;
\echo --- B3 G10b what a user sees on each callout that holds an empty response (info; by code reading the client draws no card for an empty response, but the counter and the more-button count it; the first page is 4 responses by sort order)
WITH co AS (
  SELECT cc."calloutId", cc.id, cc.type::text AS t, (cc.id IN (SELECT id FROM b3_r)) AS empty,
         row_number() OVER (PARTITION BY cc."calloutId" ORDER BY cc."sortOrder", cc.id) AS pos
    FROM callout_contribution cc WHERE cc."calloutId" IN (SELECT "calloutId" FROM b3_r))
SELECT md5(co."calloutId"::text) AS callout_ref, min(co.t) AS response_type, ca.settings->>'visibility' AS visibility, ca."isTemplate" AS is_template,
       count(*) AS counter_shown, count(*) FILTER (WHERE NOT co.empty) AS can_be_drawn, count(*) FILTER (WHERE co.empty) AS empty_rows,
       count(*) FILTER (WHERE co.empty AND co.pos<=4) AS empty_in_first_page_of_4, count(*) FILTER (WHERE NOT co.empty AND co.pos<=4) AS drawn_in_first_page_of_4
  FROM co JOIN callout ca ON ca.id=co."calloutId" GROUP BY co."calloutId", ca.settings, ca."isTemplate" ORDER BY 5 DESC, 1;
\echo --- B3 G10c where those callouts sit (info)
SELECT CASE WHEN s.id IS NOT NULL THEN 'space level ' || s.level WHEN EXISTS (SELECT 1 FROM template t WHERE t."calloutId"=ca.id) THEN 'callout template' ELSE 'other' END AS place,
       count(DISTINCT ca.id) AS callouts, count(DISTINCT s.id) AS spaces, count(DISTINCT s."levelZeroSpaceID") AS top_level_spaces
  FROM callout ca LEFT JOIN collaboration co ON co."calloutsSetId"=ca."calloutsSetId" LEFT JOIN space s ON s."collaborationId"=co.id
 WHERE ca.id IN (SELECT "calloutId" FROM b3_r) GROUP BY 1 ORDER BY 2 DESC;
\echo --- B3 G11 proof that the missing content once existed: activity rows by the author within 5 seconds of an empty response, and what their resource is today (a resource that is no live whiteboard or link was deleted after the response was made)
SELECT r.type AS response_type, a.type AS activity_type, count(DISTINCT a.id) AS activity_rows, count(DISTINCT r.id) AS empty_responses_covered,
       count(DISTINCT a.id) FILTER (WHERE a."parentID"=r."calloutId") AS parent_is_the_callout,
       count(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM whiteboard w WHERE w.id=a."resourceID")) AS resource_is_a_live_whiteboard,
       count(DISTINCT a.id) FILTER (WHERE EXISTS (SELECT 1 FROM link l WHERE l.id=a."resourceID")) AS resource_is_a_live_link,
       count(DISTINCT a.id) FILTER (WHERE a."resourceID"=r.id) AS resource_is_the_response
  FROM b3_r r JOIN activity a ON a."triggeredBy"=r."createdBy" AND abs(extract(epoch FROM a."createdDate"-r."createdDate"))<5
 GROUP BY 1,2 ORDER BY 1,2;
\echo --- B3 G11b comparison: for healthy link and whiteboard responses the activity row names the content itself (info)
SELECT r.type AS response_type, a.type AS activity_type, count(DISTINCT r.id) AS healthy_responses_covered,
       count(DISTINCT r.id) FILTER (WHERE a."resourceID"=r."whiteboardId") AS resource_is_its_whiteboard,
       count(DISTINCT r.id) FILTER (WHERE a."resourceID"=r."linkId") AS resource_is_its_link
  FROM callout_contribution r JOIN activity a ON a."triggeredBy"=r."createdBy" AND a."parentID"=r."calloutId" AND abs(extract(epoch FROM a."createdDate"-r."createdDate"))<5
 WHERE r.type::text IN ('link','whiteboard') AND r."createdDate">='2025-10-09' AND r.id NOT IN (SELECT id FROM b3_r) AND a.type IN ('callout-link-added','whiteboard-created')
 GROUP BY 1,2 ORDER BY 1,2;
\echo --- B3 G12 activity rows that name an empty response itself (expect 0; a hit means removing the response leaves a dangling activity row)
SELECT count(*) AS activity_rows_naming_an_empty_response FROM activity a WHERE a."resourceID" IN (SELECT id FROM b3_r) OR a."parentID" IN (SELECT id FROM b3_r);
\echo --- B3 G12b any other row that names an empty response: every uuid, text and json column of every table is scanned (expect columns with a hit: 0; a hit means that leaving the response out leaves a pointer to nothing)
DO $$
DECLARE r record; n bigint; hits int := 0; cols int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM b3_r) THEN RAISE NOTICE 'no empty responses, so nothing can name one: columns with a hit: 0'; RETURN; END IF;
  FOR r IN SELECT c.table_name, c.column_name, c.data_type FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
            WHERE c.table_schema='public' AND t.table_type='BASE TABLE' AND c.data_type IN ('uuid','character varying','text','character','json','jsonb')
              AND NOT (c.table_name='callout_contribution' AND c.column_name='id') LOOP
    cols := cols + 1;
    IF r.data_type='uuid' THEN
      EXECUTE format('SELECT count(*) FROM %I x WHERE x.%I IN (SELECT id FROM b3_r)', r.table_name, r.column_name) INTO n;
    ELSIF r.data_type IN ('json','jsonb') THEN
      EXECUTE format('SELECT count(*) FROM %I x WHERE EXISTS (SELECT 1 FROM b3_r b WHERE x.%I::text LIKE ''%%''||b.id::text||''%%'')', r.table_name, r.column_name) INTO n;
    ELSE
      EXECUTE format('SELECT count(*) FROM %I x WHERE length(x.%I)>=36 AND EXISTS (SELECT 1 FROM b3_r b WHERE x.%I LIKE ''%%''||b.id::text||''%%'')', r.table_name, r.column_name, r.column_name) INTO n;
    END IF;
    IF n>0 THEN hits := hits+1; RAISE NOTICE 'named in %.%: % rows', r.table_name, r.column_name, n; END IF;
  END LOOP;
  RAISE NOTICE 'columns scanned: %, columns with a hit: %', cols, hits;
END $$;
\echo --- B3 G13 office document with no file, one line each: is there any file that could be its body, and who is affected (kept for now and tracked as case T5; the number of lines is the count to read first on production; 0 candidate files means nothing can be linked back)
SELECT d."createdDate"::date AS created, (SELECT count(*) FROM "user" u WHERE u.id=d."createdBy") AS creator_still_a_user,
       c.settings->>'visibility' AS callout_visibility, c."isTemplate" AS is_template,
       (SELECT s.level FROM collaboration co JOIN space s ON s."collaborationId"=co.id WHERE co."calloutsSetId"=c."calloutsSetId") AS space_level,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id) AS responses,
       coalesce((SELECT r."messagesCount" FROM room r WHERE r.id=c."commentsId"),0) AS comments,
       length(coalesce(p.description,'')) AS description_chars,
       (SELECT count(*) FROM file x WHERE x."storageBucketId"=dp."storageBucketId") AS files_in_its_own_bucket,
       (SELECT count(*) FROM file x WHERE x."createdBy"=d."createdBy" AND abs(extract(epoch FROM x."createdDate"-d."createdDate"))<60) AS files_by_the_creator_within_60s
  FROM collabora_document d LEFT JOIN profile dp ON dp.id=d."profileId"
  LEFT JOIN callout_framing f ON f."collaboraDocumentId"=d.id LEFT JOIN callout c ON c."framingId"=f.id LEFT JOIN profile p ON p.id=f."profileId"
 WHERE d."documentId" IS NULL;
\echo --- B3 G14 invitations with the add-to-parent option, by whether the space has a parent and by state (the defect row is option on with no parent; only a state that can still be accepted can fail for a user)
SELECT i."invitedToParent" AS add_to_parent, (rs."parentRoleSetId" IS NULL) AS space_has_no_parent, (l."machineState"::jsonb->>'value') AS state,
       count(*) AS invitations,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=i."invitedActorId")) AS invitee_is_a_user,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id=i."invitedActorId")) AS invitee_is_a_virtual_contributor,
       min(i."createdDate")::date AS oldest, max(i."createdDate")::date AS newest
  FROM invitation i JOIN role_set rs ON rs.id=i."roleSetId" LEFT JOIN lifecycle l ON l.id=i."lifecycleId"
 WHERE i."invitedToParent" GROUP BY 1,2,3 ORDER BY 2 DESC, 4 DESC;
\echo --- B3 G14b the defect invitations, one line each (on production every line is read before the repair R4; a space that was created as a subspace and is top-level today explains the row: the space was promoted and the option was never cleared)
SELECT md5(i.id::text) AS invitation_ref, i."createdDate"::date AS created, i."updatedDate"::date AS last_updated, (l."machineState"::jsonb->>'value') AS state,
       (coalesce(l."machineState"::jsonb->>'value','') NOT IN ('accepted','rejected','archived')) AS can_still_be_accepted,
       CASE WHEN EXISTS (SELECT 1 FROM "user" u WHERE u.id=i."invitedActorId") THEN 'user'
            WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id=i."invitedActorId") THEN 'virtual contributor'
            WHEN EXISTS (SELECT 1 FROM organization o WHERE o.id=i."invitedActorId") THEN 'organization' ELSE 'not found' END AS invitee,
       rs.type AS role_set_type, s.level AS space_level_today, (s."parentSpaceId" IS NOT NULL) AS space_has_a_parent_pointer,
       (SELECT min(a."createdDate")::date FROM activity a WHERE a.type='subspace-created' AND a."resourceID"=s.id) AS space_created_as_subspace_on,
       (SELECT count(*) FROM space ch WHERE ch."parentSpaceId"=s.id) AS child_spaces
  FROM invitation i JOIN role_set rs ON rs.id=i."roleSetId" LEFT JOIN lifecycle l ON l.id=i."lifecycleId"
  LEFT JOIN community cm ON cm."roleSetId"=rs.id LEFT JOIN space s ON s."communityId"=cm.id
 WHERE i."invitedToParent" AND rs."parentRoleSetId" IS NULL ORDER BY 2, 1;
\echo --- B3 G14c top-level spaces that an activity row shows were created as a subspace, and their invitations (info; these are the promoted spaces, the one place the server code allows the defect to come from)
SELECT count(*) AS promoted_spaces,
       coalesce(sum((SELECT count(*) FROM community cm JOIN invitation i ON i."roleSetId"=cm."roleSetId" WHERE cm.id=s."communityId")),0) AS their_invitations,
       coalesce(sum((SELECT count(*) FROM community cm JOIN invitation i ON i."roleSetId"=cm."roleSetId" WHERE cm.id=s."communityId" AND i."invitedToParent")),0) AS with_the_option
  FROM space s WHERE s.level=0 AND EXISTS (SELECT 1 FROM activity a WHERE a.type='subspace-created' AND a."resourceID"=s.id);
\echo --- B3 G14d invitations of people not yet on the platform with the same option (expect with_the_option_and_no_parent 0; the option is copied to a real invitation when the person registers)
SELECT count(*) AS platform_invitations, count(*) FILTER (WHERE pi."roleSetInvitedToParent") AS with_the_option,
       count(*) FILTER (WHERE pi."roleSetInvitedToParent" AND rs.id IS NOT NULL AND rs."parentRoleSetId" IS NULL) AS with_the_option_and_no_parent
  FROM platform_invitation pi LEFT JOIN role_set rs ON rs.id=pi."roleSetId";
\echo --- B3 G15 B3 rows that the reject set already takes (expect 0; a hit would be repaired and rejected at once)
SELECT h.rule, count(*) AS rows_also_rejected
  FROM heritage h JOIN orphan o ON o.tbl=h.tbl AND o.id=h.id
 WHERE h.rule IN ('callout_framing-type-child-mismatch','callout_contribution-type-child-mismatch','collabora_document-no-file','invitation-to-parent-without-parent')
 GROUP BY 1 ORDER BY 1;
\echo --- B3 G15b B3 callouts whose callout row is rejected (expect 0)
SELECT count(*) AS defect_callouts_in_the_reject_set FROM b3_w w JOIN orphan o ON o.tbl='callout' AND o.id=w.id::text;

\echo === B4 guards
\echo --- B4 G1 policies with a type outside the vocabulary: which table owns them (proves the mapping per value)
DROP TABLE IF EXISTS b4_pol;
CREATE TEMP TABLE b4_pol AS SELECT p.id, p.type FROM heritage h JOIN authorization_policy p ON p.id::text=h.id WHERE h.rule='authorization-policy-non-enum-type';
DROP TABLE IF EXISTS b4_own;
CREATE TEMP TABLE b4_own (id uuid, owner text);
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='authorizationId' LOOP
    EXECUTE format('INSERT INTO b4_own SELECT t.%I, %L FROM %I t JOIN b4_pol b ON b.id=t.%I', 'authorizationId', r.table_name, r.table_name, 'authorizationId');
  END LOOP; END $$;
SELECT coalesce(nullif(b.type,''),'(empty)') AS stored_type, coalesce(o.owner,'(no owner)') AS owning_table, count(*) AS policies
  FROM b4_pol b LEFT JOIN b4_own o ON o.id=b.id GROUP BY 1,2 ORDER BY 1,3 DESC;
\echo --- B4 G2 licences with a type outside the vocabulary: who owns them
SELECT coalesce(l.type,'(null)') AS stored_type,
       CASE WHEN EXISTS (SELECT 1 FROM role_set x WHERE x."licenseId"=l.id) THEN 'role_set' WHEN EXISTS (SELECT 1 FROM space x WHERE x."licenseId"=l.id) THEN 'space'
            WHEN EXISTS (SELECT 1 FROM account x WHERE x."licenseId"=l.id) THEN 'account' WHEN EXISTS (SELECT 1 FROM collaboration x WHERE x."licenseId"=l.id) THEN 'collaboration' ELSE '(no owner)' END AS owning_table,
       count(*) AS licences, (SELECT count(*) FROM license_entitlement e JOIN heritage h2 ON h2.id=e."licenseId"::text AND h2.rule='license-non-enum-type') AS entitlements_in_all
  FROM heritage h JOIN license l ON l.id::text=h.id WHERE h.rule='license-non-enum-type' GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- B4 G3 storage aggregators with no type: derive the type from the row that points at them
SELECT CASE WHEN EXISTS (SELECT 1 FROM space x WHERE x."storageAggregatorId"=s.id) THEN 'space' WHEN EXISTS (SELECT 1 FROM account x WHERE x."storageAggregatorId"=s.id) THEN 'account'
            WHEN EXISTS (SELECT 1 FROM "user" x WHERE x."storageAggregatorId"=s.id) THEN 'user' WHEN EXISTS (SELECT 1 FROM organization x WHERE x."storageAggregatorId"=s.id) THEN 'organization'
            WHEN EXISTS (SELECT 1 FROM platform x WHERE x."storageAggregatorId"=s.id) THEN 'platform' WHEN EXISTS (SELECT 1 FROM conversation x WHERE x."storageAggregatorId"=s.id) THEN 'conversation'
            ELSE '(no owner: type cannot be derived)' END AS derived_type,
       count(*) AS aggregators,
       count(*) FILTER (WHERE s."parentStorageAggregatorId" IS NOT NULL) AS with_parent,
       (SELECT count(*) FROM storage_bucket b JOIN heritage h2 ON h2.id=b."storageAggregatorId"::text AND h2.rule='storage-aggregator-non-enum-type') AS buckets_in_all,
       (SELECT count(*) FROM file f JOIN storage_bucket b ON b.id=f."storageBucketId" JOIN heritage h2 ON h2.id=b."storageAggregatorId"::text AND h2.rule='storage-aggregator-non-enum-type') AS files_in_all
  FROM heritage h JOIN storage_aggregator s ON s.id::text=h.id WHERE h.rule='storage-aggregator-non-enum-type' GROUP BY 1 ORDER BY 2 DESC;
\echo --- B4 G4 rooms with an empty type: derive the type from the row that points at them
SELECT CASE WHEN EXISTS (SELECT 1 FROM callout x WHERE x."commentsId"=r.id) THEN 'callout' WHEN EXISTS (SELECT 1 FROM post x WHERE x."commentsId"=r.id) THEN 'post'
            WHEN EXISTS (SELECT 1 FROM calendar_event x WHERE x."commentsId"=r.id) THEN 'calendar_event' WHEN EXISTS (SELECT 1 FROM discussion x WHERE x."commentsId"=r.id) THEN 'discussion_forum'
            WHEN EXISTS (SELECT 1 FROM communication x WHERE x."updatesId"=r.id) THEN 'updates' WHEN EXISTS (SELECT 1 FROM conversation x WHERE x."roomId"=r.id) THEN 'conversation (direct or group: count the members)'
            ELSE '(no owner: type cannot be derived)' END AS derived_type,
       count(*) AS rooms, coalesce(sum(r."messagesCount"),0) AS messages, min(r."createdDate")::date AS oldest, max(r."createdDate")::date AS newest
  FROM heritage h JOIN room r ON r.id::text=h.id WHERE h.rule='room-type-not-enum' GROUP BY 1 ORDER BY 2 DESC;
\echo --- B4 G5 platform invitations naming a role outside the vocabulary: the role values only, never the e-mail
SELECT role_value, CASE WHEN role_value IN ('vc-campaign','beta-tester') THEN 'retired role: take it out, never rename (server rule), then decide by hand' ELSE '(not a known retired role: decide by hand)' END AS what_to_do,
       count(*) AS invitations, min(p."createdDate")::date AS oldest, max(p."createdDate")::date AS newest
  FROM heritage h JOIN platform_invitation p ON p.id::text=h.id, unnest(string_to_array(p."roleSetExtraRoles", ',')) role_value
 WHERE h.rule='platform-invitation-non-enum-extra-role' AND role_value NOT IN ('member','lead','admin','associate','owner','platform-operations-admin','platform-roles-admin','platform-content-full-access','platform-resource-admin','platform-settings-admin','platform-users-admin','platform-support','platform-license-manager','platform-spaces-reader','platform-audit-reader','feature-beta-tester','feature-virtual-assistant','feature-organization-creator','feature-vc-campaign','registered','guest','anonymous') GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- B4 G6 phase names with a comma: the callouts tagged with them (name and tags must be renamed together)
SELECT md5(s.id::text) AS state_ref, length(s."displayName") AS name_length,
       (SELECT count(*) FROM tagset t JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
          JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId"
         WHERE co."innovationFlowId"=s."innovationFlowId" AND t.name='flow-state' AND t.tags = s."displayName") AS callouts_tagged_with_it,
       (SELECT count(*) FROM tagset_template tt JOIN innovation_flow f ON f."flowStatesTagsetTemplateId"=tt.id WHERE f.id=s."innovationFlowId" AND tt."allowedValues" LIKE '%' || s."displayName" || '%') AS allowed_values_holding_it,
       (SELECT (f."currentStateID" = s.id) FROM innovation_flow f WHERE f.id=s."innovationFlowId") AS is_current_state
  FROM heritage h JOIN innovation_flow_state s ON s.id::text=h.id WHERE h.rule='innovation_flow_state-comma-name';
\echo --- B4 second pass (2026-11-13): the checks behind the repair, kept so they run on any dataset
DROP TABLE IF EXISTS b4_rej;
CREATE TEMP TABLE b4_rej AS SELECT tbl, id FROM orphan WHERE tbl IN ('authorization_policy','license','storage_aggregator','room','platform_invitation','innovation_flow_state','innovation_flow','ai_persona','template_default','templates_manager','templates_set','role_set','account','calendar_event','space','callout') GROUP BY 1,2;
CREATE INDEX ON b4_rej (tbl, id); ANALYZE b4_rej;
\echo --- B4 G7 every policy whose type is outside the list: flagged by B4, in the reject set, or neither (neither must be 0; a type with no B4 flag at all is a retired table whose policies are rejected)
SELECT coalesce(nullif(p.type,''),'(empty)') AS stored_type, count(*) AS policies,
       count(*) FILTER (WHERE h.id IS NOT NULL) AS flagged_b4,
       count(*) FILTER (WHERE o.id IS NOT NULL) AS in_reject_set,
       count(*) FILTER (WHERE h.id IS NULL AND o.id IS NULL) AS neither
  FROM authorization_policy p
  LEFT JOIN (SELECT id FROM heritage WHERE rule='authorization-policy-non-enum-type') h ON h.id=p.id::text
  LEFT JOIN b4_rej o ON o.tbl='authorization_policy' AND o.id=p.id::text
 WHERE p.type IS NULL OR p.type <> ALL (string_to_array('actor,callout,callouts-set,callout-contribution,callout-framing,collaboration,communication-conversation,communication-messaging,innovation-flow,innovation-flow-state,innovation-hub,innovation-pack,link,post,whiteboard,memo,media-gallery,knowledge-base,profile,classification,reference,tagset,visual,communication,room,ai-persona,ai-server,application,role-set,community,community-guidelines,invitation,forum,platform,discussion,user,user-group,user-settings,organization,organization-verification,virtual-contributor,virtual-assistant,space,space-about,account,document,storage-aggregator,storage-bucket,template,template-content-space,templates-set,templates-manager,template-default,poll,calendar,calendar-event,timeline,library,in-memory,licensing,license,license-policy,collabora-document,unknown', ','))
 GROUP BY 1 ORDER BY 2 DESC;
\echo --- B4 G8 policy type per owner table, every owner row: the broken rows beside the never-broken rows of the same table (after the repair: one type per table)
\echo ---       the broken rows must sit in the window of their origin: empty before 2024-08-16, ai-persona-service until the persona tables were merged, the three underscore types on the day the templates migration ran
SELECT own AS owning_table, stored_type, count(*) AS policies, count(*) FILTER (WHERE rejected) AS owner_in_reject_set, min(created)::date AS first_owner, max(created)::date AS last_owner,
       count(*) FILTER (WHERE has_parent) AS with_parent_policy, min(cred) AS fewest_rules, max(cred) AS most_rules
  FROM (
    SELECT 'platform_invitation' own, coalesce(nullif(p.type,''),'(empty)') stored_type, t."createdDate" created, p."parentAuthorizationPolicyId" IS NOT NULL has_parent, jsonb_array_length(p."credentialRules") cred, EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='platform_invitation' AND r.id=t.id::text) rejected FROM platform_invitation t JOIN authorization_policy p ON p.id=t."authorizationId"
    UNION ALL SELECT 'ai_persona', coalesce(nullif(p.type,''),'(empty)'), t."createdDate", p."parentAuthorizationPolicyId" IS NOT NULL, jsonb_array_length(p."credentialRules"), EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='ai_persona' AND r.id=t.id::text) FROM ai_persona t JOIN authorization_policy p ON p.id=t."authorizationId"
    UNION ALL SELECT 'template_default', coalesce(nullif(p.type,''),'(empty)'), t."createdDate", p."parentAuthorizationPolicyId" IS NOT NULL, jsonb_array_length(p."credentialRules"), EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='template_default' AND r.id=t.id::text) FROM template_default t JOIN authorization_policy p ON p.id=t."authorizationId"
    UNION ALL SELECT 'templates_manager', coalesce(nullif(p.type,''),'(empty)'), t."createdDate", p."parentAuthorizationPolicyId" IS NOT NULL, jsonb_array_length(p."credentialRules"), EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='templates_manager' AND r.id=t.id::text) FROM templates_manager t JOIN authorization_policy p ON p.id=t."authorizationId"
    UNION ALL SELECT 'templates_set', coalesce(nullif(p.type,''),'(empty)'), t."createdDate", p."parentAuthorizationPolicyId" IS NOT NULL, jsonb_array_length(p."credentialRules"), EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='templates_set' AND r.id=t.id::text) FROM templates_set t JOIN authorization_policy p ON p.id=t."authorizationId"
  ) x GROUP BY 1,2 ORDER BY 1,2;
\echo --- B4 G8b a row that two owners point at cannot be mapped by its owner (expect 0 0 0 0)
SELECT (SELECT count(*) FROM (SELECT a FROM (SELECT "authorizationId" a FROM platform_invitation UNION ALL SELECT "authorizationId" FROM ai_persona UNION ALL SELECT "authorizationId" FROM template_default UNION ALL SELECT "authorizationId" FROM templates_manager UNION ALL SELECT "authorizationId" FROM templates_set) x WHERE a IS NOT NULL GROUP BY a HAVING count(*)>1) y) AS policies_with_two_owners,
       (SELECT count(*) FROM (SELECT "licenseId" FROM role_set WHERE "licenseId" IS NOT NULL GROUP BY 1 HAVING count(*)>1) x) AS licences_with_two_role_sets,
       (SELECT count(*) FROM (SELECT "storageAggregatorId" FROM account WHERE "storageAggregatorId" IS NOT NULL GROUP BY 1 HAVING count(*)>1) x) AS aggregators_with_two_accounts,
       (SELECT count(*) FROM (SELECT "commentsId" FROM calendar_event WHERE "commentsId" IS NOT NULL GROUP BY 1 HAVING count(*)>1) x) AS rooms_with_two_events;
\echo --- B4 G9 licences of role sets: licence type per role set kind, with the entitlement shape (after the repair: only roleset)
\echo ---       non_flag_entitlements must be 0: only a flag entitlement returns before the server reads the licence type
SELECT rs.type AS role_set_kind, coalesce(l.type,'(no licence)') AS licence_type, count(DISTINCT rs.id) AS role_sets,
       count(DISTINCT rs.id) FILTER (WHERE EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='role_set' AND r.id=rs.id::text)) AS role_set_in_reject_set,
       min(l."createdDate")::date AS first_licence, max(l."createdDate")::date AS last_licence,
       count(e.id) AS entitlements, count(DISTINCT e.type::text) AS entitlement_types, count(e.id) FILTER (WHERE e."dataType"::text<>'flag') AS non_flag_entitlements
  FROM role_set rs LEFT JOIN license l ON l.id=rs."licenseId" LEFT JOIN license_entitlement e ON e."licenseId"=l.id GROUP BY 1,2 ORDER BY 1,2;
\echo --- B4 G9b every licence whose type is outside the list: owner kind, flagged by B4, in the reject set, or neither (neither must be 0, owner must be role_set for the value role-set)
SELECT coalesce(l.type,'(null)') AS stored_type,
       CASE WHEN EXISTS (SELECT 1 FROM role_set x WHERE x."licenseId"=l.id) THEN 'role_set' WHEN EXISTS (SELECT 1 FROM space x WHERE x."licenseId"=l.id) THEN 'space'
            WHEN EXISTS (SELECT 1 FROM account x WHERE x."licenseId"=l.id) THEN 'account' WHEN EXISTS (SELECT 1 FROM collaboration x WHERE x."licenseId"=l.id) THEN 'collaboration' ELSE '(no owner)' END AS owning_table,
       count(*) AS licences, count(*) FILTER (WHERE h.id IS NOT NULL) AS flagged_b4, count(*) FILTER (WHERE o.id IS NOT NULL) AS in_reject_set, count(*) FILTER (WHERE h.id IS NULL AND o.id IS NULL) AS neither
  FROM license l LEFT JOIN (SELECT id FROM heritage WHERE rule='license-non-enum-type') h ON h.id=l.id::text LEFT JOIN b4_rej o ON o.tbl='license' AND o.id=l.id::text
 WHERE l.type IS NULL OR l.type NOT IN ('account','space','whiteboard','roleset','collaboration','template_content_space') GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- B4 G10 storage aggregators of accounts: stored type with the creation window (after the repair: only account). The untyped ones must share one moment, the run of the migration that made them
SELECT coalesce(s.type,'(null)') AS stored_type, count(*) AS aggregators, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='account' AND r.id=a.id::text)) AS account_in_reject_set,
       min(s."createdDate")::date AS first_made, max(s."createdDate")::date AS last_made, count(DISTINCT date_trunc('minute', s."createdDate")) AS distinct_minutes,
       count(*) FILTER (WHERE s."parentStorageAggregatorId" IS NOT NULL) AS with_parent, count(*) FILTER (WHERE s."directStorageId" IS NULL) AS without_direct_bucket, count(*) FILTER (WHERE s."authorizationId" IS NULL) AS without_policy
  FROM account a JOIN storage_aggregator s ON s.id=a."storageAggregatorId" GROUP BY 1 ORDER BY 1;
\echo --- B4 G10b every aggregator whose type is outside the list: who points at it, flagged by B4, in the reject set, or neither (neither must be 0)
SELECT coalesce(s.type,'(null)') AS stored_type,
       CASE WHEN EXISTS (SELECT 1 FROM space x WHERE x."storageAggregatorId"=s.id) THEN 'space' WHEN EXISTS (SELECT 1 FROM account x WHERE x."storageAggregatorId"=s.id) THEN 'account'
            WHEN EXISTS (SELECT 1 FROM "user" x WHERE x."storageAggregatorId"=s.id) THEN 'user' WHEN EXISTS (SELECT 1 FROM organization x WHERE x."storageAggregatorId"=s.id) THEN 'organization'
            WHEN EXISTS (SELECT 1 FROM platform x WHERE x."storageAggregatorId"=s.id) THEN 'platform' WHEN EXISTS (SELECT 1 FROM conversation x WHERE x."storageAggregatorId"=s.id) THEN 'conversation' ELSE '(nobody)' END AS pointed_at_by,
       count(*) AS aggregators, count(*) FILTER (WHERE h.id IS NOT NULL) AS flagged_b4, count(*) FILTER (WHERE o.id IS NOT NULL) AS in_reject_set, count(*) FILTER (WHERE h.id IS NULL AND o.id IS NULL) AS neither
  FROM storage_aggregator s LEFT JOIN (SELECT id FROM heritage WHERE rule='storage-aggregator-non-enum-type') h ON h.id=s.id::text LEFT JOIN b4_rej o ON o.tbl='storage_aggregator' AND o.id=s.id::text
 WHERE s.type IS NULL OR s.type NOT IN ('space','account','user','organization','platform','conversation') GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- B4 G11 comment rooms of calendar events: stored type with the creation window (after the repair: only calendar_event)
SELECT coalesce(nullif(r.type,''),'(empty)') AS stored_type, count(*) AS rooms, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM b4_rej x WHERE x.tbl='calendar_event' AND x.id=e.id::text)) AS event_in_reject_set,
       min(r."createdDate")::date AS first_made, max(r."createdDate")::date AS last_made, coalesce(sum(r."messagesCount"),0) AS messages
  FROM calendar_event e JOIN room r ON r.id=e."commentsId" GROUP BY 1 ORDER BY 1;
\echo --- B4 G11b every room whose type is outside the list: who points at it, flagged by B4, in the reject set, or neither (neither must be 0)
SELECT coalesce(nullif(r.type,''),'(empty)') AS stored_type,
       CASE WHEN EXISTS (SELECT 1 FROM callout x WHERE x."commentsId"=r.id) THEN 'callout' WHEN EXISTS (SELECT 1 FROM post x WHERE x."commentsId"=r.id) THEN 'post'
            WHEN EXISTS (SELECT 1 FROM calendar_event x WHERE x."commentsId"=r.id) THEN 'calendar_event' WHEN EXISTS (SELECT 1 FROM discussion x WHERE x."commentsId"=r.id) THEN 'discussion_forum'
            WHEN EXISTS (SELECT 1 FROM communication x WHERE x."updatesId"=r.id) THEN 'updates' WHEN EXISTS (SELECT 1 FROM conversation x WHERE x."roomId"=r.id) THEN 'conversation' ELSE '(nobody)' END AS pointed_at_by,
       count(*) AS rooms, count(*) FILTER (WHERE h.id IS NOT NULL) AS flagged_b4, count(*) FILTER (WHERE o.id IS NOT NULL) AS in_reject_set, count(*) FILTER (WHERE h.id IS NULL AND o.id IS NULL) AS neither
  FROM room r LEFT JOIN (SELECT id FROM heritage WHERE rule='room-type-not-enum') h ON h.id=r.id::text LEFT JOIN b4_rej o ON o.tbl='room' AND o.id=r.id::text
 WHERE r.type IS NULL OR r.type NOT IN ('post','calendar_event','discussion_forum','updates','callout','conversation','conversation_direct','conversation_group') GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- B4 G12 platform invitations that name a role outside the list, one line each (never the e-mail). Read every line on production
\echo ---       roles_left_after is what stays once the retired value is taken out. 0 means the invitation then offers nothing but the entry role
SELECT md5(p.id::text) AS invitation_ref, p."createdDate"::date AS created, coalesce(rs.type::text,'(no role set)') AS role_set_kind,
       cardinality(string_to_array(p."roleSetExtraRoles", ',')) AS roles_named,
       (SELECT string_agg(v, ',' ORDER BY v) FROM unnest(string_to_array(p."roleSetExtraRoles", ',')) v WHERE v <> ALL (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ','))) AS values_outside_the_list,
       (SELECT count(*) FROM unnest(string_to_array(p."roleSetExtraRoles", ',')) v WHERE v = ANY (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ','))) AS roles_left_after,
       p."profileCreated" AS profile_created, EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email)=lower(p.email)) AS invitee_registered_since,
       EXISTS (SELECT 1 FROM "user" u WHERE u.id::text=p."createdBy"::text) AS inviter_still_exists,
       EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='platform_invitation' AND r.id=p.id::text) AS in_reject_set
  FROM heritage h JOIN platform_invitation p ON p.id::text=h.id LEFT JOIN role_set rs ON rs.id=p."roleSetId"
 WHERE h.rule='platform-invitation-non-enum-extra-role' ORDER BY 2,1;
\echo --- B4 G12b all platform invitations by role set kind: how many name a role, how many name none (shows whether an invitation with no role exists untouched on that kind of role set)
SELECT coalesce(rs.type::text,'(no role set)') AS role_set_kind, count(*) AS invitations, count(*) FILTER (WHERE coalesce(p."roleSetExtraRoles",'')='') AS naming_no_role,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM heritage h WHERE h.rule='platform-invitation-non-enum-extra-role' AND h.id=p.id::text)) AS flagged_b4
  FROM platform_invitation p LEFT JOIN role_set rs ON rs.id=p."roleSetId" GROUP BY 1 ORDER BY 1;
\echo --- B4 G13 the same wrong role values in the two other places the server keeps role names: invitations and role rows (expect no rows)
SELECT 'invitation.extraRoles' AS place, v AS value_outside_the_list, count(*) AS row_count FROM invitation i, unnest(string_to_array(i."extraRoles", ',')) v
 WHERE v <> ALL (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ',')) GROUP BY 1,2
UNION ALL SELECT 'role.name', r.name::text, count(*) FROM role r
 WHERE r.name::text <> ALL (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ',')) GROUP BY 1,2
ORDER BY 1,2;
\echo --- B4 G13b seen in passing, not one of the six B4 rules: the entry role of each kind of role set, whether the name is on the server list and whether the role set has that role (a platform invitation is accepted into the entry role)
SELECT rs.type AS role_set_kind, rs."entryRoleName" AS entry_role, count(*) AS role_sets,
       (rs."entryRoleName"::text = ANY (string_to_array('member,lead,admin,associate,owner,platform-operations-admin,platform-roles-admin,platform-content-full-access,platform-resource-admin,platform-settings-admin,platform-users-admin,platform-support,platform-license-manager,platform-spaces-reader,platform-audit-reader,feature-beta-tester,feature-virtual-assistant,feature-organization-creator,feature-vc-campaign,registered,guest,anonymous', ','))) AS name_on_the_list,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND r.name::text=rs."entryRoleName"::text)) AS role_sets_without_that_role
  FROM role_set rs GROUP BY 1,2 ORDER BY 1,2;
\echo --- B4 G14 did the migration that retires the old platform roles run on this dataset, and did it leave a retired credential (the migration matches the long role names only, so the short spellings in G12 survive it)
SELECT (SELECT count(*) FROM migrations_typeorm WHERE name LIKE 'DropLegacyPlatformRoles%') AS retire_migration_ran,
       (SELECT count(*) FROM credential WHERE type::text IN ('global-admin','global-support','global-license-manager','global-platform-manager','global-support-manager','beta-tester','vc-campaign','assistant-access','global-spaces-reader','global-spaces-read','global-community-reader','global-community-read')) AS retired_credentials_left,
       (SELECT count(*) FROM credential WHERE type::text='feature-beta-tester') AS feature_beta_tester_holders,
       (SELECT count(*) FROM credential WHERE type::text='feature-vc-campaign') AS feature_vc_campaign_holders;
\echo --- B4 G15 phase names with a comma, one line each (letters masked). Read every line on production
\echo ---       made_before_the_check: the server refuses a comma since 2026-06-10. allowed_values_read_back against phases_in_flow shows the split. collides: the name with the comma taken out equals another phase of the flow
SELECT md5(s.id::text) AS state_ref, regexp_replace(s."displayName", '[^,; ]', 'x', 'g') AS masked_name, length(s."displayName") AS name_length,
       s."createdDate"::date AS created, s."updatedDate"::date AS updated, (s."updatedDate" < timestamp '2026-06-10') AS made_before_the_check,
       (SELECT count(*) FROM innovation_flow_state s2 WHERE s2."innovationFlowId"=s."innovationFlowId") AS phases_in_flow,
       (SELECT cardinality(string_to_array(tt."allowedValues", ',')) FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId" WHERE f.id=s."innovationFlowId") AS allowed_values_read_back,
       (SELECT (position(s."displayName" in tt."allowedValues")>0) FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId" WHERE f.id=s."innovationFlowId") AS allowed_values_hold_it,
       (SELECT count(*) FROM innovation_flow f JOIN tagset t ON t."tagsetTemplateId"=f."flowStatesTagsetTemplateId" WHERE f.id=s."innovationFlowId" AND t.tags=s."displayName") AS tagsets_holding_it,
       (SELECT (tt."defaultSelectedValue"=s."displayName") FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId" WHERE f.id=s."innovationFlowId") AS is_default_value,
       (SELECT (f."currentStateID"=s.id) FROM innovation_flow f WHERE f.id=s."innovationFlowId") AS is_current_phase,
       EXISTS (SELECT 1 FROM innovation_flow_state s2 WHERE s2."innovationFlowId"=s."innovationFlowId" AND s2.id<>s.id AND s2."displayName" IN (replace(s."displayName",',',';'), replace(s."displayName",',',''), replace(s."displayName",',',' '), replace(s."displayName",', ',' '))) AS collides,
       CASE WHEN EXISTS (SELECT 1 FROM collaboration co JOIN space sp ON sp."collaborationId"=co.id WHERE co."innovationFlowId"=s."innovationFlowId") THEN 'space'
            WHEN EXISTS (SELECT 1 FROM collaboration co JOIN template_content_space x ON x."collaborationId"=co.id WHERE co."innovationFlowId"=s."innovationFlowId") THEN 'template content space'
            WHEN EXISTS (SELECT 1 FROM collaboration co WHERE co."innovationFlowId"=s."innovationFlowId") THEN 'collaboration with no holder' ELSE 'no collaboration' END AS held_by,
       EXISTS (SELECT 1 FROM b4_rej r WHERE r.tbl='innovation_flow_state' AND r.id=s.id::text) AS in_reject_set
  FROM innovation_flow_state s WHERE s."displayName" LIKE '%,%' ORDER BY 3,1;
\echo --- B4 G16 seen in passing, not part of B4: callouts of a space whose phase value is no phase name of their flow, and flows whose allowed values differ in number from their phases
SELECT (SELECT count(DISTINCT c.id) FROM collaboration co JOIN space sp ON sp."collaborationId"=co.id JOIN callout c ON c."calloutsSetId"=co."calloutsSetId"
          JOIN tagset t ON t."classificationId"=c."classificationId" AND t.name='flow-state'
         WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=co."innovationFlowId" AND s."displayName"=t.tags)) AS callouts_with_a_phase_value_that_is_no_phase,
       (SELECT count(*) FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId"
         WHERE cardinality(string_to_array(tt."allowedValues", ',')) < (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id)) AS flows_with_fewer_allowed_values_than_phases,
       (SELECT count(*) FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId"
         WHERE cardinality(string_to_array(tt."allowedValues", ',')) > (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id)) AS flows_with_more_allowed_values_than_phases;

\echo === B5 guards
-- The rule is evaluated again here from the tables, not read from heritage: "orphaned wins" removes from heritage every file that is
-- also in the reject set, and G1 has to show those too (column rejected).
CREATE TEMP TABLE b5_files AS
SELECT f.id, f."createdDate", f."updatedDate", f."mimeType", f.size, f."externalID", f."createdBy", f."authorizationId", f."tagsetId", f."storageBucketId",
       f."displayName", b."maxFileSize" AS bucket_max, b."allowedMimeTypes" AS bucket_types,
       (b."maxFileSize" > 0 AND f.size > b."maxFileSize") AS too_large,
       (coalesce(b."allowedMimeTypes",'')<>'' AND NOT (f."mimeType" = ANY (string_to_array(b."allowedMimeTypes", ',')))) AS type_not_allowed
  FROM file f JOIN storage_bucket b ON b.id=f."storageBucketId"
 WHERE (b."maxFileSize" > 0 AND f.size > b."maxFileSize")
    OR (coalesce(b."allowedMimeTypes",'')<>'' AND NOT (f."mimeType" = ANY (string_to_array(b."allowedMimeTypes", ',')))
        AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer" = f.id::text)
        AND NOT EXISTS (SELECT 1 FROM memo m WHERE m."contentPointer" = f.id::text));
CREATE TEMP TABLE b5_rej AS SELECT o.id FROM orphan o WHERE o.tbl='file' AND o.id IN (SELECT id::text FROM b5_files);
ANALYZE b5_files; ANALYZE b5_rej;
\echo --- B5 G1 the files outside their bucket limits: by how much, whether rejected, and whether anything shows them
SELECT md5(f.id::text) AS file_ref, f."createdDate"::date AS created, f."mimeType", f.size, f.bucket_max, f.too_large, f.type_not_allowed,
       lower(substring(f."displayName" from '\.([A-Za-z0-9]+)$')) AS name_ext,
       (f."createdBy" IS NOT NULL) AS has_creator, (f."authorizationId" IS NOT NULL) AS has_policy,
       EXISTS (SELECT 1 FROM b5_rej r WHERE r.id=f.id::text) AS rejected,
       coalesce((SELECT p.type::text FROM profile p WHERE p."storageBucketId"=f."storageBucketId" LIMIT 1), CASE WHEN EXISTS (SELECT 1 FROM storage_aggregator sa WHERE sa."directStorageId"=f."storageBucketId") THEN 'direct storage of an aggregator' ELSE '(bucket has no owner)' END) AS bucket_of,
       (SELECT count(*) FROM visual v WHERE v.uri LIKE '%' || f.id::text || '%') + (SELECT count(*) FROM reference r WHERE r.uri LIKE '%' || f.id::text || '%')
         + (SELECT count(*) FROM link l WHERE l.uri LIKE '%' || f.id::text || '%') AS shown_by_links
  FROM b5_files f ORDER BY 2;
\echo --- B5 G1b rule count in heritage against the count evaluated here (expect equal; a difference is files that are also rejected)
SELECT (SELECT count(*) FROM heritage WHERE rule='file-outside-bucket-limits') AS in_heritage, (SELECT count(*) FROM b5_files) AS evaluated, (SELECT count(*) FROM b5_rej) AS also_rejected;
\echo --- B5 G2 bucket limit shapes: size limit, number of allowed types, buckets, files, when such buckets were made
SELECT b."maxFileSize" AS size_limit, CASE WHEN coalesce(b."allowedMimeTypes",'')='' THEN 0 ELSE array_length(string_to_array(b."allowedMimeTypes", ','),1) END AS allowed_types,
       count(*) AS buckets, (SELECT count(*) FROM file f JOIN storage_bucket b2 ON b2.id=f."storageBucketId" WHERE b2."maxFileSize" IS NOT DISTINCT FROM b."maxFileSize" AND coalesce(b2."allowedMimeTypes",'')=coalesce(b."allowedMimeTypes",'')) AS files,
       min(b."createdDate")::date AS first_bucket, max(b."createdDate")::date AS last_bucket
  FROM storage_bucket b GROUP BY b."maxFileSize", b."allowedMimeTypes" ORDER BY 3 DESC;
\echo --- B5 G3 buckets with no limit, size limit 0 or empty type list (expect 1 bucket: the reserved Matrix media staging bucket)
SELECT (b.id='00000000-0000-4000-8000-000000000013') AS is_reserved_staging_bucket, b."maxFileSize" AS size_limit, (coalesce(b."allowedMimeTypes",'')='') AS empty_type_list,
       count(DISTINCT b.id) AS buckets, count(f.id) AS files, count(DISTINCT f."externalID") AS blobs,
       count(f.id) FILTER (WHERE f."externalReference" IS NOT NULL) AS with_media_reference,
       count(f.id) FILTER (WHERE f."createdBy" IS NOT NULL) AS with_creator, count(f.id) FILTER (WHERE f."authorizationId" IS NOT NULL) AS with_policy,
       min(f."createdDate")::date AS first_file, max(f."createdDate")::date AS last_file
  FROM storage_bucket b LEFT JOIN file f ON f."storageBucketId"=b.id
 WHERE NOT (b."maxFileSize" > 0) OR coalesce(b."allowedMimeTypes",'')='' GROUP BY 1,2,3;
\echo --- B5 G4 the files over the size limit: rows per blob, the link that shows each, and whether the callout lives
SELECT md5(f."externalID") AS blob_ref, f.size, f.bucket_max, count(*) AS file_rows, min(f."createdDate")::date AS first_row, max(f."createdDate")::date AS last_row,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM b5_rej r WHERE r.id=f.id::text)) AS rejected_rows,
       sum((SELECT count(*) FROM link l WHERE l.uri LIKE '%' || f.id::text || '%')) AS links,
       sum((SELECT count(*) FROM link l JOIN callout_contribution cc ON cc."linkId"=l.id JOIN callout c ON c.id=cc."calloutId" WHERE l.uri LIKE '%' || f.id::text || '%')) AS links_on_a_live_callout,
       sum((SELECT count(*) FROM link l JOIN callout_contribution cc ON cc."linkId"=l.id JOIN callout c ON c.id=cc."calloutId" WHERE l.uri LIKE '%' || f.id::text || '%'
              AND (c."isTemplate" OR EXISTS (SELECT 1 FROM collaboration co WHERE co."calloutsSetId"=c."calloutsSetId" AND co."isTemplate")))) AS of_those_in_a_template,
       (SELECT count(*) FROM file f2 WHERE f2."externalID"=f."externalID") AS all_rows_of_this_blob
  FROM b5_files f WHERE f.too_large GROUP BY f."externalID", f.size, f.bucket_max ORDER BY 2 DESC;
\echo --- B5 G4b every file larger than 15 MB, by year (the default limit since 2024-06-05; before that 5 MB)
SELECT extract(year FROM f."createdDate")::int AS year, count(*) AS files, count(DISTINCT f."externalID") AS blobs, max(f.size) AS largest FROM file f WHERE f.size > 15728640 GROUP BY 1 ORDER BY 1;
\echo --- B5 G5 the files whose type the bucket does not list: office document or not, the type the document itself holds, and where it sits
SELECT md5(f.id::text) AS file_ref, f."createdDate"::date AS created, f."mimeType" AS file_type, f.size,
       lower(substring(f."displayName" from '\.([A-Za-z0-9]+)$')) AS name_ext,
       (cd.id IS NOT NULL) AS is_office_document, right(cd."originalMimeType", 24) AS document_own_type_tail,
       (cd."originalMimeType" = ANY (string_to_array(f.bucket_types, ','))) AS own_type_allowed_by_bucket,
       round(extract(epoch FROM f."updatedDate" - f."createdDate")) AS secs_created_to_last_write,
       EXISTS (SELECT 1 FROM b5_rej r WHERE r.id=f.id::text) AS rejected,
       (SELECT count(*) FROM callout_framing cf JOIN callout c ON c."framingId"=cf.id WHERE cf."collaboraDocumentId"=cd.id) AS on_callout_framing,
       (SELECT count(*) FROM callout_contribution cc JOIN callout c ON c.id=cc."calloutId" WHERE cc."collaboraDocumentId"=cd.id) AS on_callout_response,
       (SELECT count(*) FROM callout_framing cf JOIN callout c ON c."framingId"=cf.id WHERE cf."collaboraDocumentId"=cd.id
              AND (c."isTemplate" OR EXISTS (SELECT 1 FROM collaboration co WHERE co."calloutsSetId"=c."calloutsSetId" AND co."isTemplate"))) AS of_those_in_a_template
  FROM b5_files f LEFT JOIN collabora_document cd ON cd."documentId"=f.id WHERE f.type_not_allowed ORDER BY 2;
\echo --- B5 G6 every empty file, size 0: is it a blank office document, and does the file type equal the type the document holds (expect: every empty file is an office document)
SELECT (cd.id IS NOT NULL) AS is_office_document, (cd."originalMimeType" = f."mimeType") AS file_type_equals_document_type, f."mimeType" LIKE 'text/plain%' AS file_type_is_plain_text,
       (f."updatedDate" - f."createdDate" > interval '1 second') AS written_after_creation,
       count(*) AS files, count(DISTINCT f."externalID") AS blobs, min(f."createdDate")::date AS first_created, max(f."createdDate")::date AS last_created
  FROM file f LEFT JOIN collabora_document cd ON cd."documentId"=f.id WHERE f.size=0 GROUP BY 1,2,3,4 ORDER BY 1,2;
\echo --- B5 G7 all office documents: file type against the type the document holds (expect differs only for the files of G5)
SELECT CASE WHEN f.id IS NULL THEN 'no file' WHEN cd."originalMimeType" = f."mimeType" THEN 'same type' ELSE 'file type differs' END AS state, (f.size=0) AS empty,
       count(*) AS documents, min(cd."createdDate")::date AS first_created, max(cd."createdDate")::date AS last_created
  FROM collabora_document cd LEFT JOIN file f ON f.id=cd."documentId" GROUP BY 1,2 ORDER BY 1,2;
\echo --- B5 G8 office documents per month and how many are still empty
SELECT to_char(cd."createdDate",'YYYY-MM') AS month, count(*) AS documents, count(*) FILTER (WHERE f.size=0) AS still_empty,
       count(*) FILTER (WHERE f.size=0 AND cd."originalMimeType" IS DISTINCT FROM f."mimeType") AS empty_and_type_differs
  FROM collabora_document cd LEFT JOIN file f ON f.id=cd."documentId" GROUP BY 1 ORDER BY 1;

-- ===================================================================
-- 5. SECTION C — valid but problematic (per-domain censuses)
-- ===================================================================
\echo === C1 organizations without an owner (arch 124 + 1 holder-less owner cred; 84 admin-only, 9 associates-only, 32 neither; the fallback split below counts credentials with or without a holder, the C1 guards count holders only)
SELECT CASE WHEN EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-admin' AND c."resourceID"=o.id::text) THEN 'has admin'
            WHEN EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-associate' AND c."resourceID"=o.id::text) THEN 'associates only'
            ELSE 'neither' END AS fallback, count(*)
  FROM organization o
 WHERE NOT EXISTS (SELECT 1 FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type='organization-owner' AND c."resourceID"=o.id::text)
 GROUP BY 1;
SELECT 'owner credential with no holder' AS chk, count(*) FROM credential c WHERE c.type='organization-owner' AND (c."actorId" IS NULL OR NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=c."actorId"))
UNION ALL SELECT 'orgs with > 6 admins', count(*) FROM (SELECT "resourceID" FROM credential WHERE type='organization-admin' GROUP BY 1 HAVING count(*)>6) x
UNION ALL SELECT 'orgs with > 3 owners', count(*) FROM (SELECT "resourceID" FROM credential WHERE type='organization-owner' GROUP BY 1 HAVING count(*)>3) x;

\echo === C2 users without a login binding (arch 13 = 12 regular + 1 service)
SELECT "serviceProfile", count(*) FROM "user" WHERE "authenticationID" IS NULL GROUP BY 1;

\echo === C3 VC bindings in comment rooms (arch 514 bindings; 22 -> 5 missing VCs; 3 resolve to nothing; 359 externalThreadId JSON null)
WITH b AS (
  SELECT r.id AS room_id, k AS thread, v->>'virtualContributorActorID' AS vc, v->'externalThreadId' AS ext
    FROM room r, jsonb_each(coalesce(r."vcData"->'interactionsByThread','{}'::jsonb)) AS e(k, v))
SELECT 'bindings' AS chk, count(*) FROM b
UNION ALL SELECT 'bindings -> VC missing', count(*) FROM b WHERE vc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc)
UNION ALL SELECT 'distinct missing VCs', count(DISTINCT vc) FROM b WHERE vc IS NOT NULL AND NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc)
UNION ALL SELECT 'bindings with no VC id at all', count(*) FROM b WHERE vc IS NULL OR vc=''
UNION ALL SELECT 'externalThreadId key present but JSON null', count(*) FROM b WHERE ext IS NOT NULL AND jsonb_typeof(ext)='null'
UNION ALL SELECT 'externalThreadId with a value', count(*) FROM b WHERE ext IS NOT NULL AND jsonb_typeof(ext)<>'null';
\echo --- C3 resolution: a binding holds either the actor id of the VC or, for older rooms, its agent id from before the agent to actor migration
\echo --- (the only map from that agent id is the backup table _agent_backup_virtual_contributor, finding A1; arch 22 -> 5 gone, 3 nothing)
WITH b AS (
  SELECT r.id AS room, v->>'virtualContributorActorID' AS vc
    FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v))
SELECT CASE WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc) THEN '1 current id of a live VC (works today)'
            WHEN m.id IS NULL THEN '5 resolves to nothing'
            WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=m.id::text) THEN '2 old agent id of a LIVE VC (broken today, repair by rewriting the id)'
            ELSE '3 old agent id of a VC that is gone (remove the binding)' END AS situation,
       count(*) AS bindings, count(DISTINCT b.vc) AS distinct_ids, count(DISTINCT b.room) AS rooms
  FROM b LEFT JOIN _agent_backup_virtual_contributor m ON m."agentId"::text = b.vc GROUP BY 1 ORDER BY 1;
SELECT 'VCs hosted by accounts of ownerless orgs' AS chk, count(*) FROM virtual_contributor v JOIN organization o ON o."accountID"=v."accountId"   -- arch=65
 WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text);

\echo === C4 credential hygiene (arch 181 groups/365 rows; 467 empty target, 435 global-registered; 54 of 56 plus trials lapsed; 52 L0 spaces hold only lapsed plus creds)
SELECT 'duplicate groups' AS chk, count(*) FROM (SELECT 1 FROM credential GROUP BY "actorId", type, "resourceID" HAVING count(*)>1) d
UNION ALL SELECT 'rows in duplicate groups', coalesce(sum(n),0) FROM (SELECT count(*) n FROM credential GROUP BY "actorId", type, "resourceID" HAVING count(*)>1) d
UNION ALL SELECT 'empty target', count(*) FROM credential WHERE "resourceID" IS NULL OR "resourceID"=''
UNION ALL SELECT 'empty target: global-registered', count(*) FROM credential WHERE ("resourceID" IS NULL OR "resourceID"='') AND type='global-registered'
UNION ALL SELECT 'plus-licence trial credentials', count(*) FROM credential WHERE type='space-license-plus' AND expires IS NOT NULL
UNION ALL SELECT 'plus-licence trials lapsed (at run time)', count(*) FROM credential WHERE type='space-license-plus' AND expires IS NOT NULL AND expires < now()
UNION ALL SELECT 'L0 spaces whose plus credentials are all lapsed (arch 52)', count(*) FROM space s WHERE s.level=0
   AND EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-plus' AND c.expires < now())
   AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-plus' AND (c.expires IS NULL OR c.expires >= now()))
UNION ALL SELECT '  of those: no live licence credential of any plan', count(*) FROM space s WHERE s.level=0
   AND EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-plus' AND c.expires < now())
   AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type LIKE 'space-license-%' AND (c.expires IS NULL OR c.expires >= now()));
SELECT type, count(*) FROM credential WHERE "resourceID" IS NULL OR "resourceID"='' GROUP BY 1 ORDER BY 2 DESC;

\echo === C5 creator / author attribution (arch: creator gone — callouts 2,160 posts 406 contributions 247 whiteboards 576 memos 31 office docs 18 calendar events 29 discussions 34; empty — callouts 5,418 contributions 1,225 files 5,705)
SELECT 'callout' AS tbl, count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")) AS creator_gone, count(*) FILTER (WHERE "createdBy" IS NULL) AS creator_empty FROM callout
UNION ALL SELECT 'post', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM post
UNION ALL SELECT 'callout_contribution', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM callout_contribution
UNION ALL SELECT 'whiteboard', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM whiteboard
UNION ALL SELECT 'memo', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM memo
UNION ALL SELECT 'collabora_document', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM collabora_document
UNION ALL SELECT 'calendar_event', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM calendar_event
UNION ALL SELECT 'discussion', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM discussion
UNION ALL SELECT 'file', count(*) FILTER (WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="createdBy")), count(*) FILTER (WHERE "createdBy" IS NULL) FROM file
UNION ALL SELECT 'activity (triggeredBy)', count(*) FILTER (WHERE "triggeredBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="triggeredBy")), count(*) FILTER (WHERE "triggeredBy" IS NULL) FROM activity
UNION ALL SELECT 'in_app_notification (triggeredByID)', count(*) FILTER (WHERE "triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="triggeredByID")), count(*) FILTER (WHERE "triggeredByID" IS NULL) FROM in_app_notification
UNION ALL SELECT 'platform_audit_entry (initiator)', count(*) FILTER (WHERE "initiatorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id="initiatorUserId")), count(*) FILTER (WHERE "initiatorUserId" IS NULL) FROM platform_audit_entry
UNION ALL SELECT 'platform_audit_entry (subject user)', count(*) FILTER (WHERE "subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id="subjectUserId")), count(*) FILTER (WHERE "subjectUserId" IS NULL) FROM platform_audit_entry;
-- Note: tagset.tags, platform_invitation.roleSetExtraRoles and storage_bucket.allowedMimeTypes are TypeORM simple-array text columns (comma-separated), hence string_to_array().
SELECT 'activity: distinct deleted actors' AS chk, count(DISTINCT "triggeredBy") FROM activity WHERE "triggeredBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="triggeredBy")   -- arch 106
UNION ALL SELECT 'notifications: distinct deleted actors', count(DISTINCT "triggeredByID") FROM in_app_notification WHERE "triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id="triggeredByID");  -- arch 4

\echo === C6 file contents missing from storage — NOT answerable from the DB alone
-- Export the stored keys, then check each against the file-service store / backup bucket:
--   \copy (SELECT DISTINCT "externalID" FROM file WHERE "externalID" IS NOT NULL) TO 'file-keys.txt'
-- arch: 1,500 file rows / 729 distinct blobs missing; 5 present files differ from declared size.
SELECT count(*) AS file_rows, count(DISTINCT "externalID") AS distinct_blobs, count(*) FILTER (WHERE "externalID" IS NULL OR "externalID"='') AS no_key FROM file;
-- links pointing at files that do not exist (arch: visual 4, reference 10, link 1, profile descriptions 10)
SELECT 'visual.uri -> missing file' AS chk, count(*) FROM visual v WHERE v.uri ~ '/api/private/rest/storage/document/' AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text = substring(v.uri from '/document/([0-9a-f-]{36})'))
UNION ALL SELECT 'reference.uri -> missing file', count(*) FROM reference r WHERE r.uri ~ '/api/private/rest/storage/document/' AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text = substring(r.uri from '/document/([0-9a-f-]{36})'))
UNION ALL SELECT 'link.uri -> missing file', count(*) FROM link l WHERE l.uri ~ '/api/private/rest/storage/document/' AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text = substring(l.uri from '/document/([0-9a-f-]{36})'))
UNION ALL SELECT 'profile.description -> missing file', count(*) FROM (SELECT DISTINCT p.id, m[1] AS fid FROM profile p, regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g') m) d WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text=d.fid);

\echo === C7 URL handles (arch: 67 invalid; 10 proposed-reserved + 2 reserved; dup groups L0 3/6, subspaces 2/4, callouts 34/68, packs 9/20, pack templates 3/6; 22 cross-kind; 303 subspace/callout; 91 groups old-URL)
-- new URL rule: lowercase letters, digits, single hyphens, no leading/trailing hyphen
WITH h AS (
  SELECT 'user' kind, a."nameID" n FROM actor a WHERE a.type='user'
  UNION ALL SELECT 'organization', a."nameID" FROM actor a WHERE a.type='organization'
  UNION ALL SELECT 'virtual-contributor', a."nameID" FROM actor a WHERE a.type='virtual-contributor'
  UNION ALL SELECT 'space-l0', a."nameID" FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0
  UNION ALL SELECT 'subspace', a."nameID" FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0
  UNION ALL SELECT 'callout', "nameID" FROM callout
  UNION ALL SELECT 'post', "nameID" FROM post
  UNION ALL SELECT 'whiteboard', "nameID" FROM whiteboard
  UNION ALL SELECT 'template', "nameID" FROM template
  UNION ALL SELECT 'innovation-pack', "nameID" FROM innovation_pack
  UNION ALL SELECT 'memo', "nameID" FROM memo
  UNION ALL SELECT 'discussion', "nameID" FROM discussion
  UNION ALL SELECT 'calendar-event', "nameID" FROM calendar_event)
SELECT kind, count(*) FILTER (WHERE n IS NULL OR n='') AS empty, count(*) FILTER (WHERE n <> '' AND n !~ '^[a-z0-9]+(-[a-z0-9]+)*$') AS invalid FROM h GROUP BY 1 ORDER BY 1;
-- same-kind duplicates
SELECT 'space-l0' AS kind, count(*) AS groups, sum(n) AS rows FROM (SELECT count(*) n FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0 GROUP BY lower(a."nameID") HAVING count(*)>1) x
UNION ALL SELECT 'subspace (per parent)', count(*), sum(n) FROM (SELECT count(*) n FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0 GROUP BY s."parentSpaceId", lower(a."nameID") HAVING count(*)>1) x
UNION ALL SELECT 'callout (per set)', count(*), sum(n) FROM (SELECT count(*) n FROM callout GROUP BY "calloutsSetId", lower("nameID") HAVING count(*)>1) x
UNION ALL SELECT 'innovation-pack', count(*), sum(n) FROM (SELECT count(*) n FROM innovation_pack GROUP BY lower("nameID") HAVING count(*)>1) x
UNION ALL SELECT 'template (per set)', count(*), sum(n) FROM (SELECT count(*) n FROM template GROUP BY "templatesSetId", lower("nameID") HAVING count(*)>1) x;
-- cross-kind top-level collisions (space L0 / organization / VC / user share one URL root)
SELECT k1||'/'||k2 AS pair, count(*) FROM (
  SELECT DISTINCT least(a.kind,b.kind) k1, greatest(a.kind,b.kind) k2, a.n FROM
    (SELECT 'space' kind, lower(a."nameID") n FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0
     UNION ALL SELECT a.type, lower(a."nameID") FROM actor a WHERE a.type IN ('organization','virtual-contributor','user')) a
  JOIN (SELECT 'space' kind, lower(a."nameID") n FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0
     UNION ALL SELECT a.type, lower(a."nameID") FROM actor a WHERE a.type IN ('organization','virtual-contributor','user')) b
    ON a.n=b.n AND a.kind<b.kind) x GROUP BY 1 ORDER BY 1;
-- subspace sharing a name with a sibling callout of its parent
SELECT 'subspace = sibling callout name' AS chk, count(*) FROM space s JOIN actor a ON a.id=s.id JOIN space p ON p.id=s."parentSpaceId"
  JOIN collaboration co ON co.id=p."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" AND lower(c."nameID")=lower(a."nameID") WHERE s.level>0;
-- reserved words
SELECT 'L0 on reserved word' AS chk, count(*) FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0 AND lower(a."nameID") IN (SELECT w FROM restricted_names);

\echo === C8 role definitions scoped to the wrong space (arch 162 definitions in 54 spaces; QA register A2 = 54 L1 role sets carrying their L2 child id)
SELECT count(*) AS definitions, count(DISTINCT s.id) AS spaces
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
 WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text;
SELECT s.level, t.level AS points_to_level, (t."parentSpaceId"=s.id) AS points_to_own_child, count(*)
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
  LEFT JOIN space t ON t.id::text = r.credential->>'resourceID'
 WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text GROUP BY 1,2,3 ORDER BY 1,2;
-- "excluding them would drop 189 spaces through dependencies" = the 54 + their descendants:
WITH RECURSIVE bad AS (SELECT DISTINCT s.id FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text),
 tree AS (SELECT id FROM bad UNION SELECT s.id FROM space s JOIN tree t ON s."parentSpaceId"=t.id)
SELECT count(*) AS spaces_dropped_if_excluded FROM tree;   -- arch 189

\echo === C9 other visible inconsistencies
SELECT 'spaces whose actor profile != about profile (two profiles)' AS chk, count(*) FROM space s JOIN actor a ON a.id=s.id JOIN space_about sa ON sa.id=s."aboutId" JOIN profile p1 ON p1.id=a."profileId" JOIN profile p2 ON p2.id=sa."profileId" WHERE p1.id<>p2.id AND p1."displayName"<>p2."displayName"   -- arch 43
UNION ALL SELECT 'profiles with tagsets differing only by case', count(DISTINCT "profileId") FROM (SELECT "profileId", lower(name) FROM tagset WHERE "profileId" IS NOT NULL GROUP BY 1,2 HAVING count(DISTINCT name)>1) x   -- arch 48
UNION ALL SELECT 'flow-state tagsets with comma tags', count(*) FROM tagset t WHERE t.name='flow-state' AND EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags, ',')) g WHERE g LIKE '%,%')
UNION ALL SELECT 'flow states with blank name', count(*) FROM innovation_flow_state WHERE "displayName" IS NULL OR trim("displayName")=''   -- arch 12
UNION ALL SELECT 'flows repeating a state name', count(*) FROM (SELECT "innovationFlowId" FROM innovation_flow_state GROUP BY "innovationFlowId", "displayName" HAVING count(*)>1) x   -- arch 3
UNION ALL SELECT 'flows over the state maximum', count(*) FROM (SELECT f.id FROM innovation_flow f JOIN innovation_flow_state s ON s."innovationFlowId"=f.id GROUP BY f.id HAVING count(*) > coalesce((f.settings->>'maximumNumberOfStates')::int, 8)) x   -- arch 10
UNION ALL SELECT 'profile displayName > 128', count(*) FROM profile WHERE length("displayName")>128   -- arch 6
UNION ALL SELECT 'profile displayName empty', count(*) FROM profile WHERE "displayName" IS NULL OR trim("displayName")=''   -- arch 1,622
UNION ALL SELECT 'link with empty uri', count(*) FROM link WHERE uri IS NULL OR trim(uri)=''   -- arch 468
UNION ALL SELECT 'VC display names shared', count(*) FROM (SELECT lower(p."displayName") FROM virtual_contributor v JOIN actor a ON a.id=v.id JOIN profile p ON p.id=a."profileId" GROUP BY 1 HAVING count(*)>1) x   -- arch 14 names / 49 VCs
UNION ALL SELECT 'org email-domain groups spanning >1 org', count(*) FROM (SELECT lower(split_part("contactEmail",'@',2)) FROM organization WHERE "contactEmail" LIKE '%@%' GROUP BY 1 HAVING count(*)>1) x
UNION ALL SELECT 'org dummy legal name', count(*) FROM organization WHERE "legalEntityName" ~* '^(test|dummy|n/?a|none|-|\.|x+)$'   -- arch 25 (adjust pattern)
UNION ALL SELECT 'org dummy website', count(*) FROM organization WHERE website ~* '(example\.com|test\.com|localhost|^https?://(www\.)?(test|dummy))'   -- arch 38 (adjust pattern)
UNION ALL SELECT 'org test domain', count(*) FROM organization WHERE domain ~* '(example|test|dummy|localhost)';   -- arch 35 (adjust pattern)
-- posts on no phase: post's callout classification tag not among the flow's states
SELECT 'callouts whose flow-state tag matches no state' AS chk, count(*) FROM tagset t JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
  JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
 WHERE t.name='flow-state' AND t.tags IS NOT NULL AND t.tags<>''
   AND NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id AND s."displayName" = ANY (string_to_array(t.tags, ',')));   -- arch 10 (+2 comma)

-- -------------------------------------------------------------------
-- C guards. Section C rows are valid and are KEPT. These checks ask what
-- the proposed clean-up would change for the people and content attached.
-- -------------------------------------------------------------------
\echo === C guards
\echo --- C1 G1 organizations without an owner (an owner credential with no holder does not count): who can act for them today and what their account hosts, in real numbers. Ruling: all kept, an organization without an owner is valid data. in_reject_set expects 0
CREATE TEMP TABLE c1_org AS
SELECT o.id, o."accountID", a."createdDate" AS made,
       (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-owner' AND c."resourceID"=o.id::text) AS owners,
       (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-admin' AND c."resourceID"=o.id::text) AS admins,
       (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-associate' AND c."resourceID"=o.id::text) AS associates,
       (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='account-admin' AND c."resourceID"=o."accountID"::text) AS account_admins,
       EXISTS (SELECT 1 FROM orphan x WHERE x.id=o.id::text AND x.tbl NOT LIKE '\_%') AS rejected
  FROM organization o LEFT JOIN actor a ON a.id=o.id;
ANALYZE c1_org;
SELECT CASE WHEN admins>0 THEN '1 has an admin' WHEN associates>0 THEN '2 associates only, nobody can act for it' ELSE '3 no admin and no associate, nobody can act for it' END AS situation,
       count(*) AS organizations,
       count(*) FILTER (WHERE account_admins>0) AS with_an_account_admin,
       sum((SELECT count(*) FROM space s WHERE s."accountId"=c1_org."accountID" AND s.level=0)) AS top_level_spaces,
       sum((SELECT count(*) FROM space s JOIN space l0 ON l0.id=s."levelZeroSpaceID" WHERE l0."accountId"=c1_org."accountID")) AS spaces_all_levels,
       sum((SELECT count(*) FROM virtual_contributor v WHERE v."accountId"=c1_org."accountID")) AS vcs,
       sum((SELECT count(*) FROM innovation_pack p WHERE p."accountId"=c1_org."accountID")) AS packs,
       sum((SELECT count(*) FROM innovation_hub h WHERE h."accountId"=c1_org."accountID")) AS hubs,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s."accountId"=c1_org."accountID") OR EXISTS (SELECT 1 FROM virtual_contributor v WHERE v."accountId"=c1_org."accountID")
                           OR EXISTS (SELECT 1 FROM innovation_pack p WHERE p."accountId"=c1_org."accountID") OR EXISTS (SELECT 1 FROM innovation_hub h WHERE h."accountId"=c1_org."accountID")) AS hosting_anything,
       count(*) FILTER (WHERE rejected) AS in_reject_set
  FROM c1_org WHERE owners=0 GROUP BY 1 ORDER BY 1;
\echo --- C1 G2 soundness of account control, both directions, holders only (expect 0 and 0): an admin or owner without the account-admin credential the server grants with the role, and an account-admin on an organization account who is neither admin nor owner
SELECT (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" JOIN organization o ON o.id::text=c."resourceID"
         WHERE c.type IN ('organization-admin','organization-owner')
           AND NOT EXISTS (SELECT 1 FROM credential a WHERE a."actorId"=c."actorId" AND a.type='account-admin' AND a."resourceID"=o."accountID"::text)) AS admin_or_owner_without_account_admin,
       (SELECT count(*) FROM credential a JOIN actor h ON h.id=a."actorId" JOIN organization o ON o."accountID"::text=a."resourceID"
         WHERE a.type='account-admin'
           AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=a."actorId" AND c.type IN ('organization-admin','organization-owner') AND c."resourceID"=o.id::text)) AS account_admin_without_the_role;
\echo --- C1 G3 organization role and account credentials with no holder (they follow A8, they are not people): count by type
SELECT c.type::text, count(*) AS credentials, count(DISTINCT c."resourceID") AS organizations_or_accounts
  FROM credential c
 WHERE NOT EXISTS (SELECT 1 FROM actor h WHERE h.id=c."actorId")
   AND ((c.type IN ('organization-owner','organization-admin','organization-associate') AND EXISTS (SELECT 1 FROM organization o WHERE o.id::text=c."resourceID"))
     OR (c.type='account-admin' AND EXISTS (SELECT 1 FROM organization o WHERE o."accountID"::text=c."resourceID")))
 GROUP BY 1 ORDER BY 1;
\echo --- C1 G4 the comparison shape, organizations WITH an owner: how many lack an admin or an account admin (no_account_admin expects 0) and what they host
SELECT count(*) AS organizations, count(*) FILTER (WHERE admins=0) AS no_admin, count(*) FILTER (WHERE account_admins=0) AS no_account_admin,
       sum((SELECT count(*) FROM space s WHERE s."accountId"=c1_org."accountID" AND s.level=0)) AS top_level_spaces,
       sum((SELECT count(*) FROM virtual_contributor v WHERE v."accountId"=c1_org."accountID")) AS vcs,
       sum((SELECT count(*) FROM innovation_pack p WHERE p."accountId"=c1_org."accountID")) AS packs,
       count(*) FILTER (WHERE rejected) AS in_reject_set
  FROM c1_org WHERE owners>0;
\echo --- C1 G5 is an owner the normal shape: by year the organization was made
SELECT extract(year FROM made)::int AS year_made, count(*) FILTER (WHERE owners=0) AS without_owner, count(*) FILTER (WHERE owners>0) AS with_owner FROM c1_org GROUP BY 1 ORDER BY 1;
\echo --- C1 G6 bulk batches that bend the picture: one user who owns more than 20 organizations (each row is one such user; read the with_owner numbers of G5 without these)
SELECT md5(c."actorId"::text) AS holder_ref, count(*) AS organizations_owned, min(o.made)::date AS first_made, max(o.made)::date AS last_made,
       sum((SELECT count(*) FROM space s WHERE s."accountId"=o."accountID")) AS spaces_hosted
  FROM credential c JOIN c1_org o ON o.id::text=c."resourceID"
 WHERE c.type='organization-owner' GROUP BY c."actorId" HAVING count(*)>20 ORDER BY 2 DESC;
\echo --- C1 G7 when the owner came, organizations with an owner: with the creation or later (the creation path gives admin and associate, never owner)
SELECT CASE WHEN d < interval '1 hour' THEN '1 within an hour of creation' WHEN d < interval '30 days' THEN '2 within 30 days' ELSE '3 later' END AS owner_came, count(*) AS organizations
  FROM (SELECT (SELECT min(c."createdDate") FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-owner' AND c."resourceID"=c1_org.id::text) - made AS d
          FROM c1_org WHERE owners>0) q GROUP BY 1 ORDER BY 1;
\echo --- C1 G8 role limits stored on organization role sets (server definition today: admin 0 to 6, associate no limit, owner 1 to 3)
SELECT r.name::text AS role, r."userPolicy"::text AS user_limits, count(*) AS role_sets
  FROM role r JOIN role_set rs ON rs.id=r."roleSetId" WHERE rs.type::text='organization' GROUP BY 1,2 ORDER BY 1,3 DESC;
\echo --- C1 G9 organizations above the stored limits (kept; the server checks a limit only when a role is assigned or removed)
SELECT count(*) FILTER (WHERE admins>6) AS more_than_6_admins, max(admins) AS most_admins, count(*) FILTER (WHERE owners>3) AS more_than_3_owners, max(owners) AS most_owners FROM c1_org;
\echo --- C1 G10 top-level spaces of organizations nobody can act for (no owner and no admin): does the space have its own admin
SELECT count(*) AS top_level_spaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='space-admin' AND c."resourceID"=s.id::text)) AS with_a_space_admin,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='space-admin' AND c."resourceID"=s.id::text)) AS no_space_admin_either,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=s.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM space s JOIN c1_org o ON o."accountID"=s."accountId" WHERE s.level=0 AND o.owners=0 AND o.admins=0;
\echo --- C1 G11 organization role sets with no organization (expect all of them in the reject set)
SELECT count(*) AS role_sets, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=rs.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM role_set rs WHERE rs.type::text='organization' AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."roleSetId"=rs.id);

\echo --- C2 G1 users without a login binding: what each one holds (a delete removes all of it)
SELECT md5(u.id::text) AS user_ref, u."serviceProfile" AS service, a."createdDate"::date AS created,
       (SELECT count(*) FROM credential c WHERE c."actorId"=u.id AND c.type NOT IN ('global-registered','user-self','account-admin')) AS roles_held,
       (SELECT count(*) FROM space s WHERE s."accountId"=u."accountID") AS spaces_hosted,
       (SELECT count(*) FROM callout c WHERE c."createdBy"=u.id) + (SELECT count(*) FROM post p WHERE p."createdBy"=u.id)
         + (SELECT count(*) FROM callout_contribution cc WHERE cc."createdBy"=u.id) + (SELECT count(*) FROM whiteboard w WHERE w."createdBy"=u.id) AS content_created,
       (SELECT count(*) FROM application ap WHERE ap."userId"=u.id) AS applications,
       (SELECT count(*) FROM invitation i WHERE i."invitedActorId"=u.id) AS invitations
  FROM "user" u JOIN actor a ON a.id=u.id WHERE u."authenticationID" IS NULL ORDER BY 3;
\echo --- C2 G2 soundness: two users sharing one login identity or one e-mail (expect 0 and 0)
SELECT (SELECT count(*) FROM (SELECT "authenticationID" FROM "user" WHERE "authenticationID" IS NOT NULL GROUP BY 1 HAVING count(*)>1) x) AS shared_login_identity,
       (SELECT count(*) FROM (SELECT lower(email) FROM "user" GROUP BY 1 HAVING count(*)>1) x) AS shared_email;
\echo --- C2 G3 users by year made, with and without a login binding. The binding column exists since 2025-12-01 (migration userIdentityCleanup, no backfill in it).
\echo ---       unbound_in_reject_set: expect 0, a user without a binding is not rejected for it
SELECT to_char(a."createdDate",'YYYY') AS made, count(*) FILTER (WHERE u."authenticationID" IS NOT NULL) AS bound,
       count(*) FILTER (WHERE u."authenticationID" IS NULL) AS unbound,
       count(*) FILTER (WHERE u."authenticationID" IS NULL AND EXISTS (SELECT 1 FROM orphan x WHERE x.id=u.id::text AND x.tbl NOT LIKE '\_%')) AS unbound_in_reject_set
  FROM "user" u JOIN actor a ON a.id=u.id GROUP BY 1 ORDER BY 1;
\echo --- C2 G4 stored e-mail that is not all lower case or has spaces around it, by binding. At login the server looks a user up by e-mail letter for letter
\echo ---       (identity-resolve.service.ts, user.lookup.service.ts getUserByEmail), so for a user without a binding the letter case decides whether the person gets the user back
SELECT ("authenticationID" IS NOT NULL) AS bound, count(*) AS users, count(*) FILTER (WHERE email<>lower(email)) AS has_upper_case,
       count(*) FILTER (WHERE email<>trim(email)) AS has_spaces_around
  FROM "user" GROUP BY 1 ORDER BY 1;
\echo --- C2 G5 what the users without a binding hold: credentials by type (a delete removes all of them)
SELECT c.type, count(DISTINCT c."actorId") AS users, count(*) AS credentials
  FROM credential c JOIN "user" u ON u.id=c."actorId"
 WHERE u."authenticationID" IS NULL AND c.type NOT IN ('global-registered','user-self') GROUP BY 1 ORDER BY 3 DESC, 1;
\echo --- C2 G6 organizations and spaces where a user without a binding is in charge, and how many of them have nobody with a binding in the same role
\echo ---       (a delete of the users leaves the second number with nobody in that role)
WITH pw AS (SELECT c."resourceID" AS res, c.type, (u."authenticationID" IS NOT NULL) AS bound
              FROM credential c JOIN "user" u ON u.id=c."actorId" WHERE c.type IN ('organization-owner','organization-admin','space-admin')),
     g AS (SELECT res, type, bool_or(NOT bound) AS has_unbound, bool_or(bound) AS has_bound FROM pw GROUP BY 1,2)
SELECT g.type || COALESCE(' level ' || s.level, '') AS role_on, count(*) FILTER (WHERE has_unbound) AS with_an_unbound_holder,
       count(*) FILTER (WHERE has_unbound AND NOT has_bound) AS of_which_no_bound_holder
  FROM g LEFT JOIN space s ON g.type='space-admin' AND s.id::text=g.res GROUP BY 1 HAVING count(*) FILTER (WHERE has_unbound)>0 ORDER BY 1;
\echo --- C2 G7 users without a binding: last sign of life and what else hangs on them. One line per user, same order as G1
\echo ---       newest_credential_row can be the date of a migration that rewrote the row, not of a grant by a person
SELECT md5(u.id::text) AS user_ref, a."createdDate"::date AS created, (u.email<>lower(u.email)) AS upper_case_email,
       (SELECT max(ac."createdDate")::date FROM activity ac WHERE ac."triggeredBy"=u.id) AS last_activity,
       (SELECT max(c."createdDate")::date FROM credential c WHERE c."actorId"=u.id) AS newest_credential_row,
       (SELECT max(n."triggeredAt")::date FROM in_app_notification n WHERE n."receiverID"=u.id) AS last_notification,
       (SELECT count(*) FROM conversation_membership m WHERE m."actorId"=u.id) AS chats,
       (SELECT count(*) FROM virtual_contributor v WHERE v."accountId"=u."accountID") AS vcs_hosted,
       (SELECT count(*) FROM innovation_pack p WHERE p."accountId"=u."accountID") AS packs_hosted,
       (SELECT count(*) FROM mcp_api_key k WHERE k."userId"=u.id) AS api_keys,
       (SELECT string_agg(DISTINCT c.type, ', ' ORDER BY c.type) FROM credential c WHERE c."actorId"=u.id AND (c.type LIKE 'global-%' OR c.type LIKE 'platform-%' OR c.type LIKE 'feature-%') AND c.type<>'global-registered') AS platform_level_credentials
  FROM "user" u JOIN actor a ON a.id=u.id WHERE u."authenticationID" IS NULL ORDER BY 2, 1;

\echo --- C3 G1 rooms holding a binding to a virtual contributor that is gone: where they sit
WITH b AS (
  SELECT r.id, r.type, r."messagesCount", v->>'virtualContributorActorID' AS vc
    FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v))
SELECT b.type AS room_type, count(*) AS dead_bindings,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM _agent_backup_virtual_contributor m JOIN virtual_contributor v ON v.id::text=m.id::text WHERE m."agentId"::text=b.vc)) AS of_which_old_id_of_a_live_vc,
       count(DISTINCT b.id) AS rooms,
       count(DISTINCT b.id) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='room' AND o.id=b.id::text)) AS rooms_already_orphaned
  FROM b WHERE b.vc IS NULL OR b.vc='' OR NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc) GROUP BY 1 ORDER BY 2 DESC;

\echo --- C3 G2 every binding by what its id names and by the state of the externalThreadId key (added in the C3 review, 2026-11-13).
\echo ---    Acceptance 2026-11-11: 62 current id, 428 old agent id of a VC that exists, 22 old agent id of a VC that is gone, 3 name nothing. The JSON null key sits only on old ids.
\echo ---    Lines 3 and 5 grow when a virtual contributor is deleted: the server leaves its bindings behind. Whether the thread still exists on the chat server is a cross-database check: 53-vc-binding-threads-xcheck.sh
WITH b AS (
  SELECT r.id AS room, e.k AS thread, e.v->>'virtualContributorActorID' AS vc, e.v AS v
    FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v))
SELECT CASE WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc) THEN '1 current id of a VC that exists'
            WHEN m.id IS NULL THEN '5 names nothing'
            WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=m.id::text) THEN '2 old agent id of a VC that exists'
            ELSE '3 old agent id of a VC that is gone' END AS situation,
       CASE WHEN NOT (b.v ? 'externalThreadId') THEN 'no key' WHEN jsonb_typeof(b.v->'externalThreadId')='null' THEN 'JSON null' ELSE 'has a value' END AS external_thread_key,
       count(*) AS bindings, count(DISTINCT b.vc) AS distinct_ids, count(DISTINCT b.room) AS rooms
  FROM b LEFT JOIN _agent_backup_virtual_contributor m ON m."agentId"::text = b.vc GROUP BY 1,2 ORDER BY 1,2;

\echo --- C3 G3 can the old ids be rewritten safely: the map from old agent id to virtual contributor (table _agent_backup_virtual_contributor).
\echo ---    Expect 0 on: rows_without_old_id, old_id_used_twice, vc_listed_twice, old_id_equals_a_current_actor, old_id_equals_a_current_vc. vcs_gone are the VCs deleted since the map was made
SELECT count(*) AS map_rows, count(*) FILTER (WHERE m."agentId" IS NULL) AS rows_without_old_id,
       count(*) - count(DISTINCT m."agentId") AS old_id_used_twice, count(*) - count(DISTINCT m.id) AS vc_listed_twice,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM actor a WHERE a.id::text=m."agentId"::text)) AS old_id_equals_a_current_actor,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=m."agentId"::text)) AS old_id_equals_a_current_vc,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=m.id::text)) AS vcs_gone
  FROM _agent_backup_virtual_contributor m;

\echo --- C3 G4 shape of the binding data (expect 0 on every column but the first two): anything the repair and the distiller do not know how to read
WITH e AS (
  SELECT r.id AS room, r.type, x.k, x.v FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS x(k, v))
SELECT (SELECT count(*) FROM e) AS bindings, (SELECT count(DISTINCT room) FROM e) AS rooms_with_bindings,
       (SELECT count(*) FROM room r WHERE r."vcData" IS NULL OR jsonb_typeof(r."vcData")<>'object' OR jsonb_typeof(r."vcData"->'interactionsByThread') IS DISTINCT FROM 'object') AS rooms_without_the_map,
       (SELECT count(*) FROM room r, jsonb_object_keys(CASE WHEN jsonb_typeof(r."vcData")='object' THEN r."vcData" ELSE '{}'::jsonb END) AS top(key) WHERE top.key<>'interactionsByThread') AS other_top_keys,
       (SELECT count(*) FROM e WHERE jsonb_typeof(v)<>'object') AS binding_not_an_object,
       (SELECT count(*) FROM e, jsonb_object_keys(CASE WHEN jsonb_typeof(v)='object' THEN v ELSE '{}'::jsonb END) AS inner_key(name) WHERE inner_key.name NOT IN ('virtualContributorActorID','externalThreadId')) AS unknown_binding_keys,
       (SELECT count(*) FROM e WHERE COALESCE(v->>'virtualContributorActorID','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS vc_id_missing_or_not_a_uuid,
       (SELECT count(*) FROM e WHERE k !~ '^\$[A-Za-z0-9_-]{43}$') AS thread_not_a_chat_message_id,
       (SELECT count(*) FROM e WHERE type NOT IN ('callout','post')) AS binding_in_another_kind_of_room,
       (SELECT count(DISTINCT room) FROM e WHERE NOT EXISTS (SELECT 1 FROM callout c WHERE c."commentsId"=e.room) AND NOT EXISTS (SELECT 1 FROM post p WHERE p."commentsId"=e.room)) AS rooms_with_bindings_nothing_owns;

\echo --- C3 G5 bindings against the reject set (expect 0 and 0 on the first two columns): a binding that is kept while its virtual contributor is rejected becomes a new dead binding, and a rejected room takes its bindings with it
WITH b AS (
  SELECT r.id AS room, e.v->>'virtualContributorActorID' AS vc
    FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r."vcData"->'interactionsByThread')='object' THEN r."vcData"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v)),
x AS (SELECT b.*, COALESCE((SELECT v.id::text FROM virtual_contributor v WHERE v.id::text=b.vc),
                           (SELECT v.id::text FROM _agent_backup_virtual_contributor m JOIN virtual_contributor v ON v.id::text=m.id::text WHERE m."agentId"::text=b.vc)) AS vcid FROM b)
SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='virtual_contributor' AND o.id=x.vcid)) AS bindings_whose_vc_is_in_the_reject_set,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='room' AND o.id=x.room::text)) AS bindings_in_a_rejected_room,
       count(*) FILTER (WHERE x.vcid IS NULL) AS bindings_with_no_vc,
       count(DISTINCT x.vcid) AS vcs_named,
       count(DISTINCT x.vcid) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v JOIN organization o ON o."accountID"=v."accountId" WHERE v.id::text=x.vcid)) AS vcs_of_an_organization,
       count(DISTINCT x.vcid) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v JOIN "user" u ON u."accountID"=v."accountId" WHERE v.id::text=x.vcid)) AS vcs_of_a_user
  FROM x;

\echo --- C3 G6 virtual contributors of organizations without an owner, counted two ways. The architect counts an owner credential even when nobody holds it (65 on acceptance).
\echo ---    Counted by people who hold the credential it is 66, the number of C1 G1. The difference is the organization whose owner credential has no holder (C1 G3). They are kept: they follow C1
SELECT count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text)) AS vcs_no_owner_credential_row,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type='organization-owner' AND c."resourceID"=o.id::text)) AS vcs_no_owner_who_is_a_person_or_actor
  FROM virtual_contributor v JOIN organization o ON o."accountID"=v."accountId";

\echo --- C4 G1 repeated credentials: do the copies differ in expiry or issuer (then which copy is kept matters)
SELECT count(*) AS duplicate_groups,
       count(*) FILTER (WHERE expiries > 1 OR (with_expiry > 0 AND with_expiry < n)) AS groups_with_different_expiry,
       count(*) FILTER (WHERE issuers > 1) AS groups_with_different_issuer
  FROM (SELECT count(*) n, count(DISTINCT expires) expiries, count(expires) with_expiry, count(DISTINCT issuer) issuers
          FROM credential GROUP BY "actorId", type, "resourceID" HAVING count(*)>1) d;
SELECT type, count(*) AS duplicate_groups, sum(n) AS rows FROM (SELECT type, count(*) n FROM credential GROUP BY "actorId", type, "resourceID" HAVING count(*)>1) d GROUP BY 1 ORDER BY 2 DESC;
\echo --- C4 G2 credentials with an empty target whose type is NOT global by design (expect none)
SELECT type, count(*) FROM credential
 WHERE ("resourceID" IS NULL OR "resourceID"='') AND type NOT LIKE 'global-%' AND type NOT LIKE 'platform-%' AND type NOT LIKE 'feature-%'
 GROUP BY 1 ORDER BY 2 DESC;
\echo --- C4 G3 top-level spaces holding only lapsed plus credentials: who is affected if the lapse is enforced
WITH sp AS (
  SELECT s.id, s."collaborationId",
         EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type LIKE 'space-license-%' AND c.type<>'space-license-plus' AND (c.expires IS NULL OR c.expires >= now())) AS other_plan
    FROM space s WHERE s.level=0
     AND EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-plus' AND c.expires < now())
     AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=s.id AND c.type='space-license-plus' AND (c.expires IS NULL OR c.expires >= now())))
SELECT count(*) AS spaces, count(*) FILTER (WHERE other_plan) AS also_hold_another_live_plan,
       (SELECT count(*) FROM space k JOIN sp ON k."levelZeroSpaceID"=sp.id WHERE k.level>0) AS subspaces_below,
       (SELECT count(DISTINCT c."actorId") FROM credential c JOIN sp ON c."resourceID"=sp.id::text WHERE c.type='space-member') AS members,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM activity a WHERE a."collaborationID"::text=sp."collaborationId"::text AND a."createdDate" > now() - interval '90 days')) AS active_in_last_90_days
  FROM sp;

\echo --- C4 G4 repeated credentials (same holder, type and target on more than one row) by type, crossed with the reject set
\echo ---     (expect: partly_rejected 0, so no merge has to choose between a kept and a rejected copy. Acceptance: 182 groups, 3 fully rejected, 179 groups and 179 surplus rows left)
DROP TABLE IF EXISTS c4_cred;
CREATE TEMP TABLE c4_cred AS
SELECT c.id, c."actorId", c.type, c."resourceID", c.expires, c.issuer, c."createdDate",
       EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='credential' AND o.id=c.id::text) AS rej,
       coalesce(a.type::text, CASE WHEN c."actorId" IS NULL THEN '(no holder)' ELSE '(holder row gone)' END) AS holder_kind
  FROM credential c LEFT JOIN actor a ON a.id=c."actorId";
CREATE INDEX ON c4_cred ("actorId", type); CREATE INDEX ON c4_cred (type, "resourceID"); ANALYZE c4_cred;
DROP TABLE IF EXISTS c4_grp;
CREATE TEMP TABLE c4_grp AS
SELECT "actorId", type, "resourceID", min(holder_kind) AS holder_kind, count(*) AS n, count(*) FILTER (WHERE rej) AS n_rej,
       min("createdDate") AS first_made, max("createdDate") AS last_made,
       (count(DISTINCT expires) > 1 OR (count(expires) > 0 AND count(expires) < count(*))) AS expiry_differs,
       (count(DISTINCT issuer) > 1 OR (count(issuer) > 0 AND count(issuer) < count(*))) AS issuer_differs
  FROM c4_cred GROUP BY "actorId", type, "resourceID" HAVING count(*) > 1;
SELECT coalesce(type, 'ALL TYPES') AS type, count(*) AS repeated_groups, sum(n) AS rows_in_them, sum(n - 1) AS surplus_rows,
       count(*) FILTER (WHERE "actorId" IS NULL) AS groups_with_no_holder,
       count(*) FILTER (WHERE n_rej = n) AS fully_rejected, count(*) FILTER (WHERE n_rej > 0 AND n_rej < n) AS partly_rejected,
       count(*) FILTER (WHERE n_rej = 0) AS groups_left_after_the_reject, coalesce(sum(n - 1) FILTER (WHERE n_rej = 0), 0) AS surplus_rows_left
  FROM c4_grp GROUP BY ROLLUP (type) ORDER BY (type IS NULL), 2 DESC, 1;
\echo --- C4 G5 the copies inside a repeated group that has a holder: how many copies, and what differs between them
\echo ---     (expect 0 on expiry_differs and issuer_differs: then keeping the oldest row of a group loses nothing. Acceptance: 179 groups, each of 2 copies)
SELECT n AS copies, holder_kind, count(*) AS groups, count(*) FILTER (WHERE expiry_differs) AS expiry_differs, count(*) FILTER (WHERE issuer_differs) AS issuer_differs,
       count(*) FILTER (WHERE last_made - first_made < interval '1 second') AS copies_made_in_the_same_second,
       count(*) FILTER (WHERE last_made - first_made >= interval '1 day') AS later_copy_a_day_or_more_after
  FROM c4_grp WHERE "actorId" IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 2;
\echo --- C4 G6 when the later copy of a repeated group was made, by type and month. One moment for many groups is a one-off script,
\echo ---     a row in every recent month is a generator that is still live (acceptance: space-lead and space-member 2025-04, account-admin 2025-01, the licence flag every month from 2026-03)
SELECT type, to_char(last_made, 'YYYY-MM') AS month_of_the_later_copy, count(*) AS groups, count(DISTINCT date_trunc('minute', last_made)) AS distinct_minutes
  FROM c4_grp WHERE "actorId" IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 2;
\echo --- C4 G7 the live generator: enabled licence plans that grant the same credential type (expect none once it is fixed. Acceptance: 1 line, 2 plans.
\echo ---     Every new space gets each plan that is assigned to new accounts, and a grant no longer checks for an existing row, so each such pair stores the credential twice)
SELECT "licenseCredential" AS credential_type, type AS plan_type, count(*) AS plans,
       count(*) FILTER (WHERE "assignToNewUserAccounts") AS given_to_new_user_accounts, count(*) FILTER (WHERE "assignToNewOrganizationAccounts") AS given_to_new_organization_accounts,
       min("createdDate")::date AS first_plan_made, max("createdDate")::date AS last_plan_made
  FROM license_plan WHERE enabled GROUP BY 1, 2 HAVING count(*) > 1 ORDER BY 1;
\echo --- C4 G8 the live generator in the data: top-level spaces by the month they were made, and how many hold a licence credential twice
\echo ---     (the 14 latest months with a new space. Acceptance: every space made since 2026-03 holds one twice, none of the months before)
SELECT * FROM (
  SELECT to_char(a."createdDate", 'YYYY-MM') AS month_made, count(*) AS top_level_spaces,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c4_grp g WHERE g."actorId" = s.id AND (g.type LIKE 'space-feature-%' OR g.type LIKE 'space-license-%'))) AS hold_a_licence_credential_twice
    FROM space s JOIN actor a ON a.id = s.id WHERE s.level = 0 GROUP BY 1 ORDER BY 1 DESC LIMIT 14) m ORDER BY 1;
\echo --- C4 G9 what a repeat changes today. The server counts members and leads as credential rows (role.set.service.ts getMembersCount,
\echo ---     credential.service.ts countMatchingCredentials), so a space or organization with more rows than holders shows a count that is too high
\echo ---     (acceptance: space-lead 53 by a repeat, space-member 21 by a repeat; rows with no holder are rejected rows and leave with the reject)
SELECT t.type, count(*) AS targets_with_this_role, count(*) FILTER (WHERE t.n_rows > t.holders) AS count_is_too_high,
       count(*) FILTER (WHERE t.held_rows > t.holders) AS too_high_by_a_repeat, coalesce(sum(t.held_rows - t.holders), 0) AS rows_too_many_by_a_repeat,
       count(*) FILTER (WHERE t.no_holder_rows > 0) AS too_high_by_rows_with_no_holder, coalesce(sum(t.no_holder_rows), 0) AS rows_with_no_holder,
       count(*) FILTER (WHERE t.kept_rows > t.kept_holders) AS too_high_after_the_reject
  FROM (SELECT c.type, c."resourceID", count(*) AS n_rows, count(DISTINCT c."actorId") AS holders, count(c."actorId") AS held_rows,
               count(*) FILTER (WHERE c."actorId" IS NULL) AS no_holder_rows,
               count(*) FILTER (WHERE NOT c.rej) AS kept_rows, count(DISTINCT c."actorId") FILTER (WHERE NOT c.rej) AS kept_holders
          FROM c4_cred c
         WHERE c.type IN ('space-member', 'space-lead', 'space-admin', 'organization-associate', 'organization-admin', 'organization-owner')
           AND (EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID") OR EXISTS (SELECT 1 FROM organization o WHERE o.id::text = c."resourceID"))
         GROUP BY 1, 2) t GROUP BY 1 ORDER BY 1;
\echo --- C4 G10 soundness of a merge: a repeated owner credential would hide a sole owner from the account deletion check
\echo ---     (account.deletion.blocker.service.ts reads one owner row as sole owner), and nothing may point at a credential row (expect 0 and 0)
SELECT (SELECT count(*) FROM c4_grp WHERE type = 'organization-owner' AND "actorId" IS NOT NULL) AS repeated_owner_credentials,
       (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND confrelid = 'public.credential'::regclass) AS foreign_keys_pointing_at_credential;
\echo --- C4 G11 credentials with an empty target, by type and kind of holder, crossed with the reject set
\echo ---     (expect: only types that name no target by design, that is global-, platform- and feature-; rejected only where there is no holder. Acceptance 498 rows, 4 rejected)
SELECT type, holder_kind, count(*) AS credentials, count(*) FILTER (WHERE rej) AS rejected,
       (type LIKE 'global-%' OR type LIKE 'platform-%' OR type LIKE 'feature-%') AS no_target_by_design
  FROM c4_cred WHERE "resourceID" IS NULL OR "resourceID" = '' GROUP BY 1, 2 ORDER BY 3 DESC, 1, 2;
\echo --- C4 G12 soundness of the empty target: a type that is stored both with and without a target, and a target that is NULL (expect 0 and 0)
SELECT (SELECT count(*) FROM (SELECT type FROM credential GROUP BY type HAVING count(*) FILTER (WHERE "resourceID" = '') > 0 AND count(*) FILTER (WHERE "resourceID" <> '') > 0) x) AS types_with_and_without_a_target,
       (SELECT count(*) FROM credential WHERE "resourceID" IS NULL) AS targets_that_are_null;
\echo --- C4 G13 the three credentials every user gets when the user is made (user.service.authorization.ts grantCredentialsAllUsersReceive):
\echo ---     registered (no target), self (target the user), account admin (target the own account). Expect 0 on every column after the first
SELECT count(*) AS users,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = u.id AND c.type = 'global-registered')) AS without_registered,
       count(*) FILTER (WHERE (SELECT count(*) FROM credential c WHERE c."actorId" = u.id AND c.type = 'global-registered') > 1) AS registered_more_than_once,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = u.id AND c.type = 'user-self' AND c."resourceID" = u.id::text)) AS without_self,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = u.id AND c.type = 'account-admin' AND c."resourceID" = u."accountID"::text)) AS without_admin_of_own_account
  FROM "user" u;
\echo --- C4 G14 credentials with an expiry date, by type. The lapse is measured twice: against the newest credential in the data and against the day of the run
\echo ---     (acceptance: only the plus plan, the one plan with a trial; 57 rows, none without expiry, 28 to 31 days, 54 lapsed, 3 live, 1 rejected for having no holder)
SELECT c.type, count(*) AS credentials, count(c.expires) AS with_expiry, count(*) - count(c.expires) AS without_expiry, count(*) FILTER (WHERE c.rej) AS rejected,
       min((c.expires::date - c."createdDate"::date)) AS shortest_days, max((c.expires::date - c."createdDate"::date)) AS longest_days,
       count(*) FILTER (WHERE c.expires < (SELECT max("createdDate") FROM credential)) AS lapsed_at_the_data_date,
       count(*) FILTER (WHERE c.expires < now()) AS lapsed_at_the_run,
       count(*) FILTER (WHERE c.expires >= now()) AS still_live_at_the_run
  FROM c4_cred c
 WHERE c.type IN (SELECT type FROM credential WHERE expires IS NOT NULL UNION SELECT "licenseCredential" FROM license_plan WHERE "trialEnabled")
 GROUP BY 1 ORDER BY 1;
\echo --- C4 G15 the plan of a top-level space, read two ways: the highest plan it holds a credential for (what the stored licence is built from,
\echo ---     expiry not read: licensing.credential.based.service.ts) against the plan the server names as active (space.service.ts activeSubscription, which skips a lapsed credential)
\echo ---     (lines where the two differ are spaces with a lapsed trial. Acceptance: plus held and free named 44, plus held and none named 5, 3 where a higher plan is named anyway)
DROP TABLE IF EXISTS c4_plan;
CREATE TEMP TABLE c4_plan AS
SELECT s.id, s."licenseId",
       (SELECT p."licenseCredential" FROM credential c JOIN license_plan p ON p."licenseCredential" = c.type AND p.type = 'space-plan'
         WHERE c."actorId" = s.id ORDER BY p."sortOrder" DESC LIMIT 1) AS held,
       (SELECT p."licenseCredential" FROM credential c JOIN license_plan p ON p."licenseCredential" = c.type AND p.type = 'space-plan'
         WHERE c."actorId" = s.id AND (c.expires IS NULL OR c.expires > now()) ORDER BY p."sortOrder" DESC LIMIT 1) AS named,
       EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = s.id AND c.type = 'space-license-plus' AND c.expires <= now())
         AND NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = s.id AND c.type = 'space-license-plus' AND (c.expires IS NULL OR c.expires > now())) AS only_lapsed_plus,
       EXISTS (SELECT 1 FROM orphan o WHERE o.tbl = 'space' AND o.id = s.id::text) AS rej
  FROM space s WHERE s.level = 0;
SELECT coalesce(held, '(none)') AS highest_plan_held, coalesce(named, '(none)') AS plan_named_as_active, count(*) AS top_level_spaces,
       count(*) FILTER (WHERE only_lapsed_plus) AS hold_only_lapsed_plus, count(*) FILTER (WHERE rej) AS rejected
  FROM c4_plan GROUP BY 1, 2 ORDER BY 1, 2;
\echo --- C4 G16 is the lapse enforced? The stored licence of the spaces whose plus credentials have all lapsed
\echo ---     (acceptance: 52 spaces, plus still switched on for all 52, although the server names another plan or none; so nothing is taken away today)
SELECT count(*) AS spaces_with_only_lapsed_plus,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId" = p."licenseId" AND e.type = 'space-plus' AND e.enabled)) AS plus_still_switched_on,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId" = p."licenseId" AND e.type = 'space-flag-whiteboard-multi-user' AND e.enabled)) AS shared_whiteboards_on,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = p.id AND c.type = 'space-feature-whiteboard-multi-user')) AS hold_the_whiteboard_flag_themselves,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId" = p."licenseId" AND e.type = 'space-flag-save-as-template' AND e.enabled)) AS save_as_template_on,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = p.id AND c.type = 'space-feature-save-as-template')) AS hold_the_template_flag_themselves,
       count(*) FILTER (WHERE named IS NULL) AS no_plan_named_as_active,
       (SELECT count(*) FROM space k JOIN c4_plan q ON q.id = k."levelZeroSpaceID" WHERE k.level > 0 AND q.only_lapsed_plus AND q.named IS NULL) AS subspaces_below_those,
       count(*) FILTER (WHERE rej) AS rejected
  FROM c4_plan p WHERE only_lapsed_plus;
\echo --- C4 G17 soundness of G16: top-level spaces that hold no plus, premium or enterprise credential at all, and how many of them have plus switched on
\echo ---     (expect 0: then the plus on the lapsed spaces can only come from the lapsed credential)
SELECT count(*) AS spaces_with_no_plus_or_higher_credential,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM license_entitlement e WHERE e."licenseId" = p."licenseId" AND e.type = 'space-plus' AND e.enabled)) AS plus_switched_on
  FROM c4_plan p WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId" = p.id AND c.type IN ('space-license-plus', 'space-license-premium', 'space-license-enterprise'));
\echo --- C4 G18 licence credentials by type: who holds them, on what, and whether a plan and a rule of the licence policy exist for the type
\echo ---     (expect: a space or an account holds it on itself, a plan and a rule exist. Acceptance: 4 space credentials held by 2 accounts, and the enterprise plan has no rule, so it grants nothing by itself)
SELECT c.type, c.holder_kind,
       CASE WHEN c."resourceID" = c."actorId"::text THEN 'the holder itself' WHEN c."resourceID" = '' THEN 'empty' ELSE 'something else' END AS target,
       count(*) AS credentials, count(DISTINCT c."actorId") AS holders, count(*) FILTER (WHERE c.rej) AS rejected,
       EXISTS (SELECT 1 FROM license_plan p WHERE p."licenseCredential" = c.type) AS has_a_plan,
       EXISTS (SELECT 1 FROM license_policy lp, jsonb_array_elements(lp."credentialRules") r WHERE r->>'credentialType' = c.type) AS has_a_policy_rule
  FROM c4_cred c WHERE c.type LIKE 'space-license-%' OR c.type LIKE 'space-feature-%' OR c.type LIKE 'account-license-%'
 GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
\echo --- C4 G19 the subspace admin credential that stays behind (carried over from A8 G12). It sits on the parent space of a subspace the holder administers.
\echo ---     Read from role.set.service.ts: the grant writes it on the parent space, the removal asks to revoke it on the subspace itself, so the one on the parent stays.
\echo ---     Left over means: the holder administers no direct subspace of that space today (kept, tracked; acceptance 47 of 354, none rejected)
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID") THEN '3 target is not a space that exists'
            WHEN EXISTS (SELECT 1 FROM space ch JOIN credential a ON a.type = 'space-admin' AND a."resourceID" = ch.id::text AND a."actorId" = c."actorId"
                          WHERE ch."parentSpaceId"::text = c."resourceID") THEN '0 holder administers a direct subspace (as intended)'
            WHEN EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"::text = c."resourceID") THEN '1 left over: the space has subspaces, the holder administers none'
            ELSE '2 left over: the space has no subspace at all' END AS situation,
       count(*) AS credentials, count(DISTINCT c."actorId") AS holders, count(DISTINCT c."resourceID") AS spaces,
       count(*) FILTER (WHERE c.rej) AS rejected,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential a WHERE a."actorId" = c."actorId" AND a.type = 'space-admin' AND a."resourceID" = c."resourceID")) AS holder_is_admin_of_that_space_anyway,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID" AND (s.settings::jsonb #>> '{membership,allowSubspaceAdminsToInviteMembers}') = 'true')) AS space_lets_subspace_admins_invite,
       min(c."createdDate")::date AS first_made, max(c."createdDate")::date AS last_made
  FROM c4_cred c WHERE c.type = 'space-subspace-admin' AND c."actorId" IS NOT NULL GROUP BY 1 ORDER BY 1;
\echo --- C4 G20 the subspace admin credentials by the level of the space they sit on. A level 2 subspace cannot have a subspace,
\echo ---     so a credential there is left over by definition (information. Acceptance: 358 with a holder, 18 on a level 2 subspace; how those came to be is not traced)
SELECT count(*) AS subspace_admin_credentials_with_a_holder,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID" AND s."parentSpaceId" IS NULL)) AS on_a_top_level_space,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID" AND s.level = 1)) AS on_a_level_1_subspace,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s.id::text = c."resourceID" AND s.level = 2)) AS on_a_level_2_subspace_which_can_have_no_subspace
  FROM c4_cred c WHERE c.type = 'space-subspace-admin' AND c."actorId" IS NOT NULL;

\echo --- C5 G1 creator gone: distinct missing ids per table, and whether the column allows an empty value
SELECT x.tbl, x.rows_with_creator_gone, x.distinct_missing_ids,
       (SELECT is_nullable FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=x.tbl AND c.column_name='createdBy') AS column_allows_empty
  FROM (
    SELECT 'callout' AS tbl, count(*) AS rows_with_creator_gone, count(DISTINCT "createdBy") AS distinct_missing_ids FROM callout t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'post', count(*), count(DISTINCT "createdBy") FROM post t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'callout_contribution', count(*), count(DISTINCT "createdBy") FROM callout_contribution t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'whiteboard', count(*), count(DISTINCT "createdBy") FROM whiteboard t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'memo', count(*), count(DISTINCT "createdBy") FROM memo t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'collabora_document', count(*), count(DISTINCT "createdBy") FROM collabora_document t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'calendar_event', count(*), count(DISTINCT "createdBy") FROM calendar_event t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'discussion', count(*), count(DISTINCT "createdBy") FROM discussion t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")
    UNION ALL SELECT 'file', count(*), count(DISTINCT "createdBy") FROM file t WHERE "createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."createdBy")) x ORDER BY 2 DESC;
\echo --- C5 G2 soundness: a creator that is a live actor but not a user (a placeholder must never be one of these; expect 0)
SELECT x.tbl, a.type AS creator_actor_type, count(*) FROM (
    SELECT 'callout' AS tbl, "createdBy" FROM callout UNION ALL SELECT 'post', "createdBy" FROM post UNION ALL SELECT 'callout_contribution', "createdBy" FROM callout_contribution
    UNION ALL SELECT 'whiteboard', "createdBy" FROM whiteboard UNION ALL SELECT 'memo', "createdBy" FROM memo UNION ALL SELECT 'file', "createdBy" FROM file) x
  JOIN actor a ON a.id=x."createdBy" WHERE a.type::text <> 'user' GROUP BY 1,2 ORDER BY 1,2;
\echo --- C5 G3 soundness: no row may already use the all-zero placeholder id of the legacy server (expect 0)
SELECT (SELECT count(*) FROM callout WHERE "createdBy"='00000000-0000-0000-0000-000000000000') + (SELECT count(*) FROM post WHERE "createdBy"='00000000-0000-0000-0000-000000000000')
     + (SELECT count(*) FROM callout_contribution WHERE "createdBy"='00000000-0000-0000-0000-000000000000') + (SELECT count(*) FROM actor WHERE id='00000000-0000-0000-0000-000000000000') AS rows_using_placeholder_id;

\echo --- C5 G4 every column that names a person (added in the C5 review, 2026-11-13): rows, empty, a live user, a live actor that is not a user, an id that no actor row holds (gone), distinct gone ids, and whether the column allows an empty value. The architect listed eight creator columns; this lists all nineteen.
DROP TABLE IF EXISTS c5_pc; DROP TABLE IF EXISTS c5_gone;
CREATE TEMP TABLE c5_pc AS
 SELECT 'callout'::text AS tbl,'createdBy'::text AS col,id::text AS rid,"createdBy" AS pid,"createdDate" AS made FROM callout
 UNION ALL SELECT 'callout','publishedBy',id::text,"publishedBy","createdDate" FROM callout
 UNION ALL SELECT 'post','createdBy',id::text,"createdBy","createdDate" FROM post
 UNION ALL SELECT 'callout_contribution','createdBy',id::text,"createdBy","createdDate" FROM callout_contribution
 UNION ALL SELECT 'whiteboard','createdBy',id::text,"createdBy","createdDate" FROM whiteboard
 UNION ALL SELECT 'memo','createdBy',id::text,"createdBy","createdDate" FROM memo
 UNION ALL SELECT 'collabora_document','createdBy',id::text,"createdBy","createdDate" FROM collabora_document
 UNION ALL SELECT 'calendar_event','createdBy',id::text,"createdBy","createdDate" FROM calendar_event
 UNION ALL SELECT 'discussion','createdBy',id::text,"createdBy","createdDate" FROM discussion
 UNION ALL SELECT 'file','createdBy',id::text,"createdBy","createdDate" FROM file
 UNION ALL SELECT 'media_gallery','createdBy',id::text,"createdBy","createdDate" FROM media_gallery
 UNION ALL SELECT 'platform_invitation','createdBy',id::text,"createdBy","createdDate" FROM platform_invitation
 UNION ALL SELECT 'invitation','createdBy',id::text,"createdBy","createdDate" FROM invitation
 UNION ALL SELECT 'callout_form_response','createdBy',id::text,"createdBy","createdDate" FROM callout_form_response
 UNION ALL SELECT 'activity','triggeredBy',id::text,"triggeredBy","createdDate" FROM activity
 UNION ALL SELECT 'in_app_notification','triggeredByID',id::text,"triggeredByID","createdDate" FROM in_app_notification
 UNION ALL SELECT 'mcp_api_key','userId',id::text,"userId","createdDate" FROM mcp_api_key
 UNION ALL SELECT 'platform_audit_entry','initiatorUserId',id::text,"initiatorUserId","createdDate" FROM platform_audit_entry
 UNION ALL SELECT 'platform_audit_entry','subjectUserId',id::text,"subjectUserId","createdDate" FROM platform_audit_entry;
CREATE INDEX ON c5_pc(pid);
CREATE TEMP TABLE c5_gone AS SELECT DISTINCT p.pid FROM c5_pc p WHERE p.pid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p.pid);
SELECT p.tbl, p.col, count(*) AS total_rows, count(*) FILTER (WHERE p.pid IS NULL) AS empty,
       count(*) FILTER (WHERE a.type::text='user') AS live_user,
       count(*) FILTER (WHERE a.id IS NOT NULL AND a.type::text<>'user') AS live_actor_not_a_user,
       count(*) FILTER (WHERE g.pid IS NOT NULL) AS gone, count(DISTINCT g.pid) AS distinct_gone_ids,
       (SELECT c.is_nullable FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=p.tbl AND c.column_name=p.col) AS column_allows_empty,
       (SELECT count(*) FROM information_schema.key_column_usage k JOIN information_schema.table_constraints tc ON tc.constraint_name=k.constraint_name AND tc.table_schema=k.table_schema
         WHERE tc.constraint_type='FOREIGN KEY' AND k.table_schema='public' AND k.table_name=p.tbl AND k.column_name=p.col) AS foreign_keys_on_column
  FROM c5_pc p LEFT JOIN actor a ON a.id=p.pid LEFT JOIN c5_gone g ON g.pid=p.pid GROUP BY p.tbl, p.col ORDER BY p.tbl, p.col;

\echo --- C5 G5 the same columns against the reject set of the reconstruction: rows with a gone or an empty person that are kept and that are rejected for another reason. The kept ones are what a distiller meets.
SELECT p.tbl, p.col, count(*) FILTER (WHERE g.pid IS NOT NULL AND o.id IS NULL) AS gone_kept, count(*) FILTER (WHERE g.pid IS NOT NULL AND o.id IS NOT NULL) AS gone_in_reject_set,
       count(*) FILTER (WHERE p.pid IS NULL AND o.id IS NULL) AS empty_kept, count(*) FILTER (WHERE p.pid IS NULL AND o.id IS NOT NULL) AS empty_in_reject_set
  FROM c5_pc p LEFT JOIN c5_gone g ON g.pid=p.pid LEFT JOIN (SELECT DISTINCT tbl, id FROM orphan) o ON o.tbl=p.tbl AND o.id=p.rid
 GROUP BY p.tbl, p.col HAVING count(*) FILTER (WHERE g.pid IS NOT NULL OR p.pid IS NULL) > 0 ORDER BY p.tbl, p.col;

\echo --- C5 G6 who the gone ids were: distinct ids over all columns, how many are an old agent id (expect 0: then no id can be rewritten the way C3 was), how many were a user when the agent tables were backed up, how many have an account deletion record, and the two system ids of the legacy server
SELECT count(*) AS distinct_gone_ids,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM _agent_table_backup b WHERE b.id::text=g.pid::text)
                           OR EXISTS (SELECT 1 FROM _agent_backup_user b WHERE b."agentId"::text=g.pid::text)
                           OR EXISTS (SELECT 1 FROM _agent_backup_organization b WHERE b."agentId"::text=g.pid::text)
                           OR EXISTS (SELECT 1 FROM _agent_backup_virtual_contributor b WHERE b."agentId"::text=g.pid::text)) AS is_an_old_agent_id,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM _agent_backup_user b WHERE b.id::text=g.pid::text)) AS was_a_user_in_the_agent_backup,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM platform_audit_entry p WHERE p."subjectUserId"=g.pid AND p.category::text='account_deletion')) AS has_a_deletion_record,
       count(*) FILTER (WHERE g.pid='00000000-0000-0000-0000-000000000000') AS is_the_all_zero_id,
       count(*) FILTER (WHERE g.pid='ffffffff-ffff-ffff-ffff-fffffffffff0') AS is_the_deleted_actor_id
  FROM c5_gone g;
SELECT count(DISTINCT p.pid) FILTER (WHERE p.tbl NOT IN ('platform_audit_entry')) AS gone_ids_outside_audit,
       count(DISTINCT p.pid) FILTER (WHERE p.tbl='platform_audit_entry') AS gone_ids_in_audit
  FROM c5_pc p JOIN c5_gone g ON g.pid=p.pid;
\echo --- C5 G6b gone ids by the year of their first row and of their last row in any of the columns (a last row in the current year means the person was removed this year: the generator is live)
SELECT y AS year, count(*) FILTER (WHERE which='first') AS ids_first_seen, count(*) FILTER (WHERE which='last') AS ids_last_seen
  FROM (SELECT 'first' AS which, extract(year FROM min(p.made))::int AS y FROM c5_pc p JOIN c5_gone g ON g.pid=p.pid GROUP BY p.pid
        UNION ALL SELECT 'last', extract(year FROM max(p.made))::int FROM c5_pc p JOIN c5_gone g ON g.pid=p.pid GROUP BY p.pid) x GROUP BY y ORDER BY y;

\echo --- C5 G7 rows that store a system id of the legacy server as the person, in any column, and actor rows with such an id (expect 0 actor rows). G3 looks at three creator columns only and misses the activity table.
SELECT p.tbl, p.col, count(*) FILTER (WHERE p.pid='00000000-0000-0000-0000-000000000000') AS all_zero_id, count(*) FILTER (WHERE p.pid='ffffffff-ffff-ffff-ffff-fffffffffff0') AS deleted_actor_id,
       min(p.made)::date AS first_row, max(p.made)::date AS last_row
  FROM c5_pc p WHERE p.pid IN ('00000000-0000-0000-0000-000000000000','ffffffff-ffff-ffff-ffff-fffffffffff0') GROUP BY p.tbl, p.col ORDER BY p.tbl, p.col;
SELECT (SELECT count(*) FROM actor WHERE id IN ('00000000-0000-0000-0000-000000000000','ffffffff-ffff-ffff-ffff-fffffffffff0')) AS actor_rows_with_a_system_id,
       (SELECT count(*) FROM activity WHERE "triggeredBy"='00000000-0000-0000-0000-000000000000') AS activity_rows_with_the_all_zero_id,
       (SELECT count(DISTINCT type) FROM activity WHERE "triggeredBy"='00000000-0000-0000-0000-000000000000') AS activity_types_among_them;

\echo --- C5 G8 columns that do not allow an empty value and hold a gone person: these rows cannot be set to empty, so the only choices are keep the id or write another id
SELECT p.tbl, p.col, count(*) AS rows_with_gone_person, count(DISTINCT p.pid) AS distinct_gone_ids
  FROM c5_pc p JOIN c5_gone g ON g.pid=p.pid
 WHERE (SELECT c.is_nullable FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=p.tbl AND c.column_name=p.col)='NO'
 GROUP BY p.tbl, p.col ORDER BY 3 DESC;

\echo --- C5 G9 audit entries by category: person who acted and person acted on, gone or empty. A deletion record must name a gone person; a gone person elsewhere is a later deletion. Reading an e-mail change entry whose subject is gone fails in the legacy server (read from code).
SELECT p.category::text AS category, count(*) AS entries,
       count(*) FILTER (WHERE p."initiatorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."initiatorUserId")) AS initiator_gone,
       count(*) FILTER (WHERE p."initiatorUserId" IS NULL) AS initiator_empty,
       count(*) FILTER (WHERE p."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId")) AS subject_gone,
       count(*) FILTER (WHERE p."subjectUserId" IS NULL) AS subject_empty
  FROM platform_audit_entry p GROUP BY 1 ORDER BY 1;
SELECT count(*) AS entries, min(p."createdDate")::date AS first_entry, max(p."createdDate")::date AS last_entry,
       count(*) FILTER (WHERE (p."initiatorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."initiatorUserId")) OR (p."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId"))) AS either_person_gone,
       count(*) FILTER (WHERE p.category::text<>'account_deletion' AND ((p."initiatorUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."initiatorUserId")) OR (p."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId")))) AS either_gone_outside_deletion_records,
       count(*) FILTER (WHERE p.category::text='email_change' AND p."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId")) AS email_change_entries_with_subject_gone,
       count(DISTINCT p."subjectUserId") FILTER (WHERE p.category::text='email_change' AND p."subjectUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId")) AS distinct_subjects_among_them,
       count(*) FILTER (WHERE p.category::text='account_deletion' AND p."subjectUserId" IS NOT NULL AND EXISTS (SELECT 1 FROM actor a WHERE a.id=p."subjectUserId")) AS deletion_records_whose_subject_still_exists
  FROM platform_audit_entry p;

\echo --- C5 G10 in-app notifications: the stored row is pruned by a retention job, so the count moves between snapshots. Triggering person gone by type, and person ids inside the payload that are gone (expect 0).
SELECT count(*) AS notifications, min("createdDate")::date AS first_row, max("createdDate")::date AS last_row,
       count(*) FILTER (WHERE n."triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=n."triggeredByID")) AS triggering_person_gone,
       count(DISTINCT n."triggeredByID") FILTER (WHERE n."triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=n."triggeredByID")) AS distinct_gone_ids,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM (VALUES ('userID'),('actorID'),('organizationID'),('virtualContributorID'),('contributorID'),('triggeredByID')) AS k(key)
                                       WHERE n.payload ->> k.key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                                         AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text = n.payload ->> k.key))) AS payload_names_a_gone_actor
  FROM in_app_notification n;
SELECT n.type, count(*) AS rows_with_triggering_person_gone, count(DISTINCT n."triggeredByID") AS distinct_gone_ids
  FROM in_app_notification n WHERE n."triggeredByID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=n."triggeredByID") GROUP BY 1 ORDER BY 2 DESC, 1;

\echo --- C5 G11 where the empty creators come from. Callouts: templates and callouts in a space. Contributions: how many distinct days they were made on (one day means one migration). Files: stored bodies of whiteboards and memos against images and other uploads.
SELECT CASE WHEN c."isTemplate" THEN 'template callout' ELSE 'callout in a space or knowledge base' END AS kind,
       count(*) AS callouts, count(*) FILTER (WHERE c."createdBy" IS NULL) AS creator_empty,
       count(*) FILTER (WHERE c."publishedBy" IS NULL) AS publisher_empty, count(*) FILTER (WHERE c."createdBy" IS NULL AND c."publishedBy" IS NOT NULL) AS creator_empty_but_publisher_set
  FROM callout c GROUP BY 1 ORDER BY 1;
SELECT extract(year FROM c."createdDate")::int AS year, count(*) AS callouts, count(*) FILTER (WHERE c."createdBy" IS NULL) AS creator_empty FROM callout c GROUP BY 1 ORDER BY 1;
SELECT count(*) AS contributions_with_empty_creator, count(DISTINCT cc."createdDate"::date) AS distinct_days_made,
       count(*) FILTER (WHERE c."createdBy" IS NULL) AS parent_callout_creator_also_empty
  FROM callout_contribution cc JOIN callout c ON c.id=cc."calloutId" WHERE cc."createdBy" IS NULL;
SELECT CASE WHEN f."mimeType"='application/octet-stream' THEN 'stored body (octet-stream)' WHEN f."mimeType" LIKE 'image/%' THEN 'image' ELSE 'other upload' END AS kind,
       count(*) AS files_with_empty_creator, min(f."createdDate")::date AS first_row, max(f."createdDate")::date AS last_row
  FROM file f WHERE f."createdBy" IS NULL GROUP BY 1 ORDER BY 2 DESC;
SELECT 'whiteboard' AS tbl, count(*) FILTER (WHERE "createdBy" IS NULL) AS creator_empty, count(*) AS total_rows FROM whiteboard
UNION ALL SELECT 'memo', count(*) FILTER (WHERE "createdBy" IS NULL), count(*) FROM memo
UNION ALL SELECT 'collabora_document', count(*) FILTER (WHERE "createdBy" IS NULL), count(*) FROM collabora_document
UNION ALL SELECT 'media_gallery', count(*) FILTER (WHERE "createdBy" IS NULL), count(*) FROM media_gallery ORDER BY 1;

\echo --- C5 G12 activity: what the feed shows. The legacy server shows a fixed former member for every triggering id that is not a live user, so rows of gone people, of live actors that are not users, and of the all-zero id all read the same.
SELECT count(*) AS activity_rows,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "user" u WHERE u.id=t."triggeredBy")) AS shown_with_the_real_user,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=t."triggeredBy")) AS shown_as_former_member,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."triggeredBy")) AS of_which_id_gone,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM actor a WHERE a.id=t."triggeredBy" AND a.type::text<>'user')) AS of_which_live_actor_not_a_user,
       count(DISTINCT t."triggeredBy") FILTER (WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=t."triggeredBy")) AS distinct_gone_ids
  FROM activity t;
DROP TABLE IF EXISTS c5_pc; DROP TABLE IF EXISTS c5_gone;

\echo --- C5 G13 stored creator rights (slow, about a minute): authorization rules of the kind user-self that name one person. A rule that names a gone person can be matched by nobody; a placeholder that was a real account would match all of them after the next authorization reset.
DROP TABLE IF EXISTS c5_self;
CREATE TEMP TABLE c5_self AS
SELECT p.id AS pol, p.type AS policy_type, c.c ->> 'resourceID' AS rid
  FROM authorization_policy p, jsonb_array_elements(p."credentialRules") AS r(rule), jsonb_array_elements(r.rule -> 'criterias') AS c(c)
 WHERE jsonb_typeof(p."credentialRules")='array' AND p."credentialRules"::text LIKE '%"user-self"%' AND jsonb_typeof(r.rule -> 'criterias')='array' AND c.c ->> 'type'='user-self';
SELECT count(*) AS self_rules, count(DISTINCT s.pol) AS policies, count(DISTINCT s.rid) FILTER (WHERE coalesce(s.rid,'')<>'') AS distinct_persons_named,
       count(*) FILTER (WHERE coalesce(s.rid,'')='') AS rules_with_empty_person,
       count(*) FILTER (WHERE coalesce(s.rid,'')<>'' AND a.id IS NULL) AS rules_naming_a_gone_person,
       count(DISTINCT s.pol) FILTER (WHERE coalesce(s.rid,'')<>'' AND a.id IS NULL) AS policies_naming_a_gone_person,
       count(DISTINCT s.rid) FILTER (WHERE coalesce(s.rid,'')<>'' AND a.id IS NULL) AS distinct_gone_ids,
       count(*) FILTER (WHERE s.rid IN ('00000000-0000-0000-0000-000000000000','ffffffff-ffff-ffff-ffff-fffffffffff0')) AS rules_naming_a_system_id
  FROM c5_self s LEFT JOIN actor a ON a.id::text=s.rid;
SELECT s.policy_type, count(DISTINCT s.pol) AS policies_naming_a_gone_person
  FROM c5_self s LEFT JOIN actor a ON a.id::text=s.rid WHERE coalesce(s.rid,'')<>'' AND a.id IS NULL GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 12;
\echo --- C5 G13b creator rules with an empty person, by policy type, and how many user-self credentials have an empty resource (expect 0: then no holder can match such a rule)
SELECT s.policy_type, count(*) AS rules_with_empty_person, count(DISTINCT s.pol) AS policies,
       (SELECT count(*) FROM credential c WHERE c.type='user-self' AND coalesce(c."resourceID",'')='') AS credentials_that_could_match
  FROM c5_self s WHERE coalesce(s.rid,'')='' GROUP BY 1 ORDER BY 2 DESC, 1;
DROP TABLE IF EXISTS c5_self;

\echo --- C6 G1 how many file rows share one stored blob (a missing blob takes all its rows with it; a deleted row may leave the blob in use)
SELECT rows_per_blob, count(*) AS blobs, sum(rows_per_blob) AS file_rows
  FROM (SELECT CASE WHEN count(*) >= 5 THEN 5 ELSE count(*) END AS rows_per_blob FROM file WHERE "externalID" IS NOT NULL AND "externalID"<>'' GROUP BY "externalID") x GROUP BY 1 ORDER BY 1;
\echo --- C6 G2 office documents: pointer to a file row that does not exist (the blob check itself needs the file store)
SELECT count(*) AS office_documents, count(*) FILTER (WHERE d."documentId" IS NULL) AS no_pointer,
       count(*) FILTER (WHERE d."documentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM file f WHERE f.id=d."documentId")) AS pointer_to_missing_file_row
  FROM collabora_document d;

\echo --- C6 G3 file rows by what the backup queue holds for their blob. A blob is the stored content, named by its content hash; several file rows can share one. skipped means: the backup worker asked the file service for the bytes and the answer was not found. The queue drops rows that were backed up, so no queue row says nothing either way (acceptance 2026-11-11: skipped 826 rows on 117 blobs with content plus 25 empty rows on 1 blob; dead_letter 5 rows on 4 blobs)
CREATE TEMP TABLE c6_f AS
SELECT f.id, f."externalID" AS h, f.size, f."createdDate" AS made,
       COALESCE((SELECT string_agg(DISTINCT x.status::text, ',' ORDER BY x.status::text) FROM file_backup_outbox x WHERE x."externalID" = f."externalID"), 'no queue row') AS st,
       EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=f.id::text) AS rejected
  FROM file f;
CREATE INDEX ON c6_f (id); CREATE INDEX ON c6_f (h); ANALYZE c6_f;
SELECT st AS queue_status, (size = 0) AS empty_file, count(*) AS file_rows, count(DISTINCT h) AS blobs,
       count(*) FILTER (WHERE rejected) AS rejected_rows, count(*) FILTER (WHERE NOT rejected) AS kept_rows,
       count(DISTINCT h) FILTER (WHERE NOT rejected) AS blobs_with_a_kept_row
  FROM c6_f GROUP BY 1,2 ORDER BY 1,2;
\echo --- C6 G4 the file rows with content on a skipped blob, by the month the row was made. first_row_of_blob is the upload. later_row is a row made afterwards on the same content: a copy, or the same bytes uploaded again. Rows made after the upload month are copies of a file whose bytes were already gone; the count grows while copying does not check the bytes (acceptance: 2026-08 368 and 2026-10 5, all later rows)
SELECT to_char(c.made, 'YYYY-MM') AS row_made, count(*) AS file_rows,
       count(*) FILTER (WHERE c.made = b.first_made) AS first_row_of_blob, count(*) FILTER (WHERE c.made > b.first_made) AS later_row,
       count(DISTINCT c.h) AS blobs, count(*) FILTER (WHERE c.rejected) AS rejected_rows
  FROM c6_f c JOIN (SELECT h, min(made) AS first_made FROM c6_f GROUP BY h) b ON b.h = c.h
 WHERE c.st LIKE '%skipped%' AND c.size > 0 GROUP BY 1 ORDER BY 1;
\echo --- C6 G5 every place that points at a file row, by the state of that row. Lines file row does not exist are the links the architect counted (25: visual 4, reference 10, link 1, profile description 10). on_kept_holder counts the links whose own row is not in the reject set
CREATE TEMP TABLE c6_use AS
SELECT CASE WHEN v."mediaGalleryId" IS NOT NULL THEN 'visual in a media gallery' ELSE 'visual on a profile' END AS place, substring(v.uri from '/document/([0-9a-f-]{36})') AS fid,
       NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='visual' AND o.id=v.id::text) AS holder_kept
  FROM visual v WHERE v.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'reference', substring(r.uri from '/document/([0-9a-f-]{36})'), NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='reference' AND o.id=r.id::text)
  FROM reference r WHERE r.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'link', substring(l.uri from '/document/([0-9a-f-]{36})'), NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='link' AND o.id=l.id::text)
  FROM link l WHERE l.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'profile description', d.fid, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='profile' AND o.id=d.id::text)
  FROM (SELECT DISTINCT p.id, m.m[1] AS fid FROM profile p, regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g') AS m(m)) d
UNION ALL SELECT 'office document body', c."documentId"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='collabora_document' AND o.id=c.id::text)
  FROM collabora_document c WHERE c."documentId" IS NOT NULL
UNION ALL SELECT 'whiteboard body', w."contentPointer"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='whiteboard' AND o.id=w.id::text)
  FROM whiteboard w WHERE w."contentPointer" IS NOT NULL
UNION ALL SELECT 'memo body', w."contentPointer"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='memo' AND o.id=w.id::text)
  FROM memo w WHERE w."contentPointer" IS NOT NULL;
CREATE INDEX ON c6_use (fid); ANALYZE c6_use;
SELECT CASE WHEN c.id IS NULL THEN '1 file row does not exist' WHEN c.st LIKE '%skipped%' AND c.size > 0 THEN '2 file row on a skipped blob'
            WHEN c.size = 0 THEN '3 file row is an empty file' ELSE '4 file row with no finding here' END AS file_row_state,
       u.place, count(*) AS pointers, count(*) FILTER (WHERE u.holder_kept) AS on_kept_holder, count(DISTINCT u.fid) AS file_rows,
       count(*) FILTER (WHERE c.rejected) AS pointers_to_a_rejected_file_row
  FROM c6_use u LEFT JOIN c6_f c ON c.id::text = u.fid GROUP BY 1,2 ORDER BY 1,2;
\echo --- C6 G6 soundness of G5: a kept holder that points at a rejected file row would lose its file in the copy (expect 0), and the pointers that do not hold a file id of 36 characters (expect 0)
SELECT count(*) FILTER (WHERE u.holder_kept AND c.rejected) AS kept_holder_pointing_at_rejected_file_row,
       count(*) FILTER (WHERE u.fid IS NULL OR u.fid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') AS pointers_without_a_file_id
  FROM c6_use u LEFT JOIN c6_f c ON c.id::text = u.fid;
\echo --- C6 G7 file rows with content that none of the places of G5 points at, by queue status. Not a defect by itself: files of chat messages, signing snapshots and uploads that were never linked are not in G5
SELECT c.st AS queue_status, count(*) AS file_rows_with_content, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM c6_use u WHERE u.fid = c.id::text)) AS no_pointer_found,
       count(*) FILTER (WHERE NOT c.rejected AND NOT EXISTS (SELECT 1 FROM c6_use u WHERE u.fid = c.id::text)) AS kept_and_no_pointer_found
  FROM c6_f c WHERE c.size > 0 GROUP BY 1 ORDER BY 1;
\echo --- C6 G8 blobs shared between kept and rejected file rows. The bytes of such a blob must stay when the rejected rows are dropped: deleting bytes per rejected row would empty kept files
SELECT count(*) AS blobs, count(*) FILTER (WHERE kept > 0 AND rej > 0) AS blobs_with_kept_and_rejected_rows, count(*) FILTER (WHERE kept = 0) AS blobs_with_only_rejected_rows,
       sum(rej) FILTER (WHERE kept > 0 AND rej > 0) AS rejected_rows_on_a_shared_blob
  FROM (SELECT h, count(*) FILTER (WHERE NOT rejected) AS kept, count(*) FILTER (WHERE rejected) AS rej FROM c6_f GROUP BY h) x;
\echo --- C6 G9 file rows whose key is not a content hash of 64 lowercase hex characters. The one-time sweep of the file service rewrites an old key only when it finds the bytes, so a key left in the old form is a file the sweep did not find (acceptance: 1 row, made 2023, kept)
SELECT length(c.h) AS key_length, count(*) AS file_rows, count(DISTINCT c.h) AS blobs, count(*) FILTER (WHERE c.rejected) AS rejected_rows,
       min(c.made)::date AS first_made, max(c.made)::date AS last_made, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c6_use u WHERE u.fid = c.id::text)) AS rows_something_points_at
  FROM c6_f c WHERE c.h !~ '^[0-9a-f]{64}$' GROUP BY 1 ORDER BY 1;
\echo --- C6 G10 the backup queue itself: rows by status and the month they were made, and whether the file row still exists (the history of the worker; rows that were backed up are gone from the queue)
SELECT x.status::text AS status, to_char(x."createdDate", 'YYYY-MM') AS queue_row_made, count(*) AS queue_rows, count(DISTINCT x."externalID") AS blobs,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM file f WHERE f.id = x."fileId")) AS file_row_exists, max(x.attempts) AS most_attempts
  FROM file_backup_outbox x GROUP BY 1,2 ORDER BY 1,2;
\echo --- C6 G11 where the storage of each top-level space hangs. Storage forms a tree: a space under its account. The architect lists 2 spaces under another account and 95 with no parent; this is the structure of the tree, not missing bytes (acceptance: 371 own account, 95 no parent, 2 another account, none rejected)
SELECT CASE WHEN sa.id IS NULL THEN 'space has no storage row'
            WHEN sa."parentStorageAggregatorId" IS NULL THEN 'no storage parent'
            WHEN sa."parentStorageAggregatorId" = a."storageAggregatorId" THEN 'parent is the storage of its own account'
            WHEN EXISTS (SELECT 1 FROM account a2 WHERE a2."storageAggregatorId" = sa."parentStorageAggregatorId") THEN 'parent is the storage of another account'
            WHEN EXISTS (SELECT 1 FROM storage_aggregator p WHERE p.id = sa."parentStorageAggregatorId") THEN 'parent is some other storage'
            ELSE 'parent does not exist' END AS situation,
       count(*) AS top_level_spaces, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='space' AND o.id=s.id::text)) AS rejected,
       min(sa."createdDate")::date AS storage_first_made, max(sa."createdDate")::date AS storage_last_made
  FROM space s LEFT JOIN account a ON a.id = s."accountId" LEFT JOIN storage_aggregator sa ON sa.id = s."storageAggregatorId"
 WHERE s.level = 0 GROUP BY 1 ORDER BY 2 DESC;
\echo --- C6 G12 the links of G5 whose file row does not exist, by the kind of host the link names. Read it against the environment the data comes from: a link that names the host of another environment was never a file of this one, it was pasted or copied in. A link that names this environment is a file that was deleted while the link stayed (acceptance: 13 name the acceptance host, 10 the development host, 2 the production host)
SELECT x.place, CASE WHEN x.h IS NULL THEN 'no host, a relative link' WHEN x.h ~ 'localhost' THEN 'localhost' WHEN x.h ~ 'dev' THEN 'development host' WHEN x.h ~ 'test' THEN 'test host' WHEN x.h ~ 'sandbox' THEN 'sandbox host'
                     WHEN x.h ~ 'acc' THEN 'acceptance host' ELSE 'host with no environment word in it, the production form' END AS host_kind,
       count(*) AS links, count(DISTINCT x.fid) AS file_ids
  FROM (SELECT 'visual' AS place, substring(v.uri from '^https?://([^/]+)') AS h, substring(v.uri from '/document/([0-9a-f-]{36})') AS fid FROM visual v WHERE v.uri ~ '/api/private/rest/storage/document/'
        UNION ALL SELECT 'reference', substring(r.uri from '^https?://([^/]+)'), substring(r.uri from '/document/([0-9a-f-]{36})') FROM reference r WHERE r.uri ~ '/api/private/rest/storage/document/'
        UNION ALL SELECT 'link', substring(l.uri from '^https?://([^/]+)'), substring(l.uri from '/document/([0-9a-f-]{36})') FROM link l WHERE l.uri ~ '/api/private/rest/storage/document/'
        UNION ALL SELECT 'profile description', m.m[1], m.m[2] FROM profile p, regexp_matches(p.description, '(?:https?://([a-z0-9.:-]+))?/api/private/rest/storage/document/([0-9a-f-]{36})', 'g') AS m(m)) x
 WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text = x.fid) GROUP BY 1,2 ORDER BY 1,2;

\echo --- C7 G1 stored text that holds platform URLs: the population a rename can break
SELECT 'reference.uri' AS place, count(*) AS rows_with_platform_url FROM reference WHERE uri ~* 'alkem\.io/'
UNION ALL SELECT 'link.uri', count(*) FROM link WHERE uri ~* 'alkem\.io/'
UNION ALL SELECT 'profile.description', count(*) FROM profile WHERE description ~* 'alkem\.io/'
UNION ALL SELECT 'in_app_notification payload', count(*) FROM in_app_notification WHERE payload::text ~* 'alkem\.io/';
\echo --- C7 G2 handles the current server would itself refuse (shorter than 3, longer than 28, upper case, other characters)
SELECT kind, count(*) FILTER (WHERE length(n) < 3) AS too_short, count(*) FILTER (WHERE length(n) > 28) AS too_long,
       count(*) FILTER (WHERE n <> lower(n)) AS upper_case, count(*) FILTER (WHERE n !~ '^[a-zA-Z0-9-]+$') AS other_characters
  FROM (SELECT a.type::text AS kind, a."nameID" AS n FROM actor a UNION ALL SELECT 'callout', "nameID" FROM callout UNION ALL SELECT 'post', "nameID" FROM post
        UNION ALL SELECT 'whiteboard', "nameID" FROM whiteboard UNION ALL SELECT 'template', "nameID" FROM template UNION ALL SELECT 'innovation-pack', "nameID" FROM innovation_pack) h
 WHERE n IS NOT NULL AND n<>'' GROUP BY 1 ORDER BY 1;

\echo --- C7 G3 handles that fail the new rule (lowercase letters, digits, single hyphens, no hyphen at an edge), per kind: how many stay after the copy and what shape they have (expect rejected 0 and other_shape 0: every one is a handle the current server accepts, see C7 G2)
DROP TABLE IF EXISTS c7_handle;
CREATE TEMP TABLE c7_handle AS
  SELECT 'user'::text AS kind, a.id::text AS id, a."nameID" AS n, a."createdDate" AS created, NULL::text AS scope, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','user'))) AS rej FROM actor a WHERE a.type='user'
  UNION ALL SELECT 'organization', a.id::text, a."nameID", a."createdDate", NULL, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','organization'))) FROM actor a WHERE a.type='organization'
  UNION ALL SELECT 'virtual-contributor', a.id::text, a."nameID", a."createdDate", NULL, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','virtual_contributor'))) FROM actor a WHERE a.type='virtual-contributor'
  UNION ALL SELECT 'space-l0', a.id::text, a."nameID", a."createdDate", NULL, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','space'))) FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0
  UNION ALL SELECT 'subspace', a.id::text, a."nameID", a."createdDate", s."levelZeroSpaceID"::text, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','space'))) FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0
  UNION ALL SELECT 'callout', c.id::text, c."nameID", c."createdDate", c."calloutsSetId"::text, (c.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='callout')) FROM callout c
  UNION ALL SELECT 'post', p.id::text, p."nameID", p."createdDate", (SELECT cc."calloutId"::text FROM callout_contribution cc WHERE cc."postId"=p.id LIMIT 1), (p.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='post')) FROM post p
  UNION ALL SELECT 'whiteboard', w.id::text, w."nameID", w."createdDate", (SELECT cc."calloutId"::text FROM callout_contribution cc WHERE cc."whiteboardId"=w.id LIMIT 1), (w.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='whiteboard')) FROM whiteboard w
  UNION ALL SELECT 'memo', m.id::text, m."nameID", m."createdDate", (SELECT cc."calloutId"::text FROM callout_contribution cc WHERE cc."memoId"=m.id LIMIT 1), (m.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='memo')) FROM memo m
  UNION ALL SELECT 'template', t.id::text, t."nameID", t."createdDate", t."templatesSetId"::text, (t.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='template')) FROM template t
  UNION ALL SELECT 'innovation-pack', i.id::text, i."nameID", i."createdDate", NULL, (i.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='innovation_pack')) FROM innovation_pack i
  UNION ALL SELECT 'innovation-hub', i.id::text, i."nameID", i."createdDate", NULL, (i.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='innovation_hub')) FROM innovation_hub i
  UNION ALL SELECT 'discussion', d.id::text, d."nameID", d."createdDate", d."forumId"::text, (d.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='discussion')) FROM discussion d
  UNION ALL SELECT 'calendar-event', e.id::text, e."nameID", e."createdDate", e."calendarId"::text, (e.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='calendar_event')) FROM calendar_event e;
SELECT coalesce(kind, 'ALL KINDS') AS kind, count(*) AS failing, count(*) FILTER (WHERE rej) AS rejected, count(*) FILTER (WHERE NOT rej) AS kept_after_copy,
       count(*) FILTER (WHERE n IS NULL OR n='') AS empty, count(*) FILTER (WHERE n ~ '^-') AS leading_hyphen, count(*) FILTER (WHERE n ~ '-$') AS trailing_hyphen,
       count(*) FILTER (WHERE n ~ '--') AS double_hyphen, count(*) FILTER (WHERE n <> '' AND n !~ '^-' AND n !~ '-$' AND n !~ '--') AS other_shape
  FROM c7_handle WHERE n IS NULL OR n !~ '^[a-z0-9]+(-[a-z0-9]+)*$' GROUP BY ROLLUP(kind) ORDER BY (kind IS NULL), kind;
\echo --- C7 G4 the same handles by the year they were made: is the generator still live (made_in_last_12_months above 0 means yes; 25 is the length the server cuts a generated handle to, a cut can leave a hyphen at the end)
SELECT coalesce(extract(year FROM h.created)::int::text, 'ALL YEARS') AS year_made, count(*) AS failing, count(*) FILTER (WHERE h.kind='user') AS users, count(*) FILTER (WHERE h.kind='template') AS templates,
       count(*) FILTER (WHERE h.kind NOT IN ('user','template')) AS other_kinds, count(*) FILTER (WHERE length(h.n)=25) AS exactly_25_long, count(*) FILTER (WHERE length(h.n)>25) AS longer_than_25,
       count(*) FILTER (WHERE h.created > z.newest - interval '12 months') AS made_in_last_12_months, max(h.created)::date AS last_made
  FROM c7_handle h CROSS JOIN (SELECT max(created) AS newest FROM c7_handle) z
 WHERE h.n IS NULL OR h.n !~ '^[a-z0-9]+(-[a-z0-9]+)*$' GROUP BY ROLLUP(extract(year FROM h.created)) ORDER BY (extract(year FROM h.created) IS NULL), 1;
\echo --- C7 G5 handles on a restricted word, per kind (the word list of the current server, enforced today only for top-level spaces), and top-level spaces on a route word (expect on_server_route_word 0 and on_client_route_word 0: such a space could not be opened by its address)
WITH base(w) AS (VALUES ('home'),('user'),('admin'),('vc'),('organization'),('documentation'),('innovation-library'),('innovation-packs'),('hub'),('forum'),('spaces'),('contributors'),('about'),('profile'),('restricted'),('docs'),('contact'),('create-space'),('login'),('logout'),('registration'),('sign_up'),('verify'),('recovery'),('required'),('error'),('landing'),('identity'),('flows')),
 cli(w) AS (VALUES ('admin'),('user'),('vc'),('organization'),('innovation-library'),('innovation-packs'),('innovation-hubs'),('hub'),('create-space'),('home'),('spaces'),('contributors'),('forum'),('profile'),('restricted'),('docs'),('documentation'),('contact'),('help'),('about'),('landing'),('identity'),('login'),('logout'),('registration'),('sign_up'),('verify'),('recovery'),('required'),('error'),('settings'),('public'))
SELECT kind, count(*) AS all_rows, count(*) FILTER (WHERE lower(n) IN (SELECT w FROM restricted_names)) AS on_restricted_word,
       count(*) FILTER (WHERE lower(n) IN (SELECT w FROM restricted_names) AND NOT rej) AS kept_after_copy,
       count(*) FILTER (WHERE lower(n) IN (SELECT w FROM base)) AS on_server_route_word, count(*) FILTER (WHERE lower(n) IN (SELECT w FROM cli)) AS on_client_route_word
  FROM c7_handle WHERE kind IN ('space-l0','organization','virtual-contributor','user','innovation-pack','innovation-hub') GROUP BY 1 ORDER BY 1;
\echo --- C7 G6 the word lists themselves, read from the code (server develop 39d7aff38, client develop 9a43c38ce): route words the restricted list does not hold
WITH base(w) AS (VALUES ('home'),('user'),('admin'),('vc'),('organization'),('documentation'),('innovation-library'),('innovation-packs'),('hub'),('forum'),('spaces'),('contributors'),('about'),('profile'),('restricted'),('docs'),('contact'),('create-space'),('login'),('logout'),('registration'),('sign_up'),('verify'),('recovery'),('required'),('error'),('landing'),('identity'),('flows')),
 cli(w) AS (VALUES ('admin'),('user'),('vc'),('organization'),('innovation-library'),('innovation-packs'),('innovation-hubs'),('hub'),('create-space'),('home'),('spaces'),('contributors'),('forum'),('profile'),('restricted'),('docs'),('documentation'),('contact'),('help'),('about'),('landing'),('identity'),('login'),('logout'),('registration'),('sign_up'),('verify'),('recovery'),('required'),('error'),('settings'),('public'))
SELECT 'words in the restricted list' AS what, count(*) AS words FROM restricted_names
UNION ALL SELECT 'server route words', count(*) FROM base
UNION ALL SELECT 'server route words not in the restricted list', count(*) FROM base WHERE w NOT IN (SELECT r.w FROM restricted_names r)
UNION ALL SELECT 'client route words', count(*) FROM cli
UNION ALL SELECT 'client route words not among the server route words', count(*) FROM cli WHERE w NOT IN (SELECT b.w FROM base b)
UNION ALL SELECT 'client route words in neither server list', count(*) FROM cli WHERE w NOT IN (SELECT b.w FROM base b) AND w NOT IN (SELECT r.w FROM restricted_names r);
\echo --- C7 G7 two rows of one kind on one handle, in the scope where the current server looks a handle up: groups, rows, and groups left after the copy (groups_gone_with_copy above 0 would mean the reject set removes a twin; the callout, pack, template and whiteboard lines are finding B1, the space lines are finding B2)
WITH g AS (
  SELECT 'top-level space'::text AS scope_kind, lower(n) AS ln, NULL::text AS sc, count(*) AS c, count(*) FILTER (WHERE NOT rej) AS kept FROM c7_handle WHERE kind='space-l0' AND n<>'' GROUP BY 2 HAVING count(*)>1
  UNION ALL SELECT 'subspace, per top-level space (how the server looks it up)', lower(n), scope, count(*), count(*) FILTER (WHERE NOT rej) FROM c7_handle WHERE kind='subspace' AND n<>'' GROUP BY 2,3 HAVING count(*)>1
  UNION ALL SELECT 'subspace, per parent space', lower(a."nameID"), s."parentSpaceId"::text, count(*), count(*) FILTER (WHERE a.id::text NOT IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','space'))) FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0 AND a."nameID"<>'' GROUP BY 2,3 HAVING count(*)>1
  UNION ALL SELECT CASE WHEN EXISTS (SELECT 1 FROM collaboration co JOIN space s ON s."collaborationId"=co.id WHERE co."calloutsSetId"::text=h.scope) THEN 'callout, per set, set of a space' ELSE 'callout, per set, set of a template or other' END,
                   lower(n), scope, count(*), count(*) FILTER (WHERE NOT rej) FROM c7_handle h WHERE kind='callout' AND n<>'' GROUP BY 1,2,3 HAVING count(*)>1
  UNION ALL SELECT 'contribution (post, whiteboard, memo), per callout', lower(n), scope, count(*), count(*) FILTER (WHERE NOT rej) FROM c7_handle WHERE kind IN ('post','whiteboard','memo') AND scope IS NOT NULL AND n<>'' GROUP BY 2,3 HAVING count(*)>1
  UNION ALL SELECT CASE WHEN EXISTS (SELECT 1 FROM innovation_pack ip WHERE ip."templatesSetId"::text=h.scope) THEN 'template, per set, set of a pack' ELSE 'template, per set, set of a space or the platform' END,
                   lower(n), scope, count(*), count(*) FILTER (WHERE NOT rej) FROM c7_handle h WHERE kind='template' AND n<>'' GROUP BY 1,2,3 HAVING count(*)>1
  UNION ALL SELECT kind, lower(n), scope, count(*), count(*) FILTER (WHERE NOT rej) FROM c7_handle WHERE kind IN ('innovation-pack','innovation-hub','user','organization','virtual-contributor','discussion','calendar-event') AND n<>'' GROUP BY 1,2,3 HAVING count(*)>1)
SELECT scope_kind, count(*) AS groups, sum(c) AS rows_in_groups, count(DISTINCT ln) AS distinct_handles, count(*) FILTER (WHERE kept>1) AS groups_after_copy,
       coalesce(sum(kept) FILTER (WHERE kept>1), 0) AS rows_after_copy, count(*) FILTER (WHERE kept<=1) AS groups_gone_with_copy
  FROM g GROUP BY 1 ORDER BY 1;
\echo --- C7 G8 one handle held by rows of two kinds (top-level space, organization, virtual contributor, user, pack, hub): pairs and pairs left after the copy. Each kind has its own address prefix in the current scheme, so no pair shares an address today
WITH t AS (SELECT CASE kind WHEN 'space-l0' THEN 'space' ELSE kind END AS kind, lower(n) AS ln, bool_or(NOT rej) AS any_kept
             FROM c7_handle WHERE kind IN ('space-l0','organization','virtual-contributor','user','innovation-pack','innovation-hub') AND n<>'' GROUP BY 1,2)
SELECT coalesce(a.kind||' and '||b.kind, 'ALL PAIRS') AS kinds, count(*) AS pairs, count(*) FILTER (WHERE a.any_kept AND b.any_kept) AS pairs_after_copy,
       count(*) FILTER (WHERE a.kind NOT IN ('innovation-pack','innovation-hub') AND b.kind NOT IN ('innovation-pack','innovation-hub')) AS of_which_space_org_vc_user
  FROM t a JOIN t b ON a.ln=b.ln AND a.kind<b.kind GROUP BY ROLLUP(a.kind||' and '||b.kind) ORDER BY (a.kind||' and '||b.kind IS NULL), 1;
\echo --- C7 G9 a subspace whose handle is also the handle of a callout in its parent space (the two sit under different address words, so both open today): by level, where they are and which was made first
WITH x AS (SELECT s.id AS sid, s.level, p.id AS pid, a."createdDate" AS s_created, c.id AS cid, c."createdDate" AS c_created,
                  (c.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='callout')) AS c_rej, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','space'))) AS s_rej
             FROM space s JOIN actor a ON a.id=s.id JOIN space p ON p.id=s."parentSpaceId" JOIN collaboration co ON co.id=p."collaborationId"
             JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" AND lower(c."nameID")=lower(a."nameID") WHERE s.level>0 AND a."nameID"<>'')
SELECT coalesce(level::text, 'ALL LEVELS') AS subspace_level, count(*) AS pairs, count(DISTINCT sid) AS subspaces, count(*) FILTER (WHERE NOT c_rej AND NOT s_rej) AS pairs_after_copy,
       count(DISTINCT pid) AS parent_spaces, (SELECT max(k) FROM (SELECT count(*) AS k FROM x x2 WHERE x2.level IS NOT DISTINCT FROM coalesce(x.level, x2.level) GROUP BY x2.pid) m) AS pairs_in_the_biggest_parent,
       count(*) FILTER (WHERE c_created < s_created) AS callout_made_first, count(DISTINCT s_created::date) AS days_the_subspaces_were_made_on, min(s_created)::date AS first_made, max(s_created)::date AS last_made
  FROM x GROUP BY ROLLUP(level) ORDER BY (level IS NULL), level;
\echo --- C7 G10 rows that share one full address in the current scheme (space, callout, post, whiteboard, memo), counted two ways: by the address text, and by the key the server looks up (it ignores the parent of a subspace). same parent = the two rows are twins themselves (B1, B2); other parent = the rows differ only because a space above them has a twin (expect the other parent lines to reach 0 once the twin spaces of B2 are renamed)
DROP TABLE IF EXISTS c7_addr;
CREATE TEMP TABLE c7_addr AS
WITH sp AS (
  SELECT s.id, s.level, s."parentSpaceId" AS parent, s."collaborationId" AS collab, (a.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl IN ('actor','space'))) AS rej,
    CASE s.level WHEN 0 THEN '/'||lower(a."nameID")
      WHEN 1 THEN '/'||lower(a0."nameID")||'/challenges/'||lower(a."nameID")
      ELSE '/'||lower(a0."nameID")||'/challenges/'||coalesce(lower(a1."nameID"),'?')||'/opportunities/'||lower(a."nameID") END AS path,
    CASE s.level WHEN 0 THEN '/'||lower(a."nameID") ELSE '/'||lower(a0."nameID")||'/sub/'||lower(a."nameID") END AS k
  FROM space s JOIN actor a ON a.id=s.id LEFT JOIN actor a0 ON a0.id=s."levelZeroSpaceID" LEFT JOIN actor a1 ON a1.id=s."parentSpaceId")
SELECT 'space'::text AS kind, sp.id::text AS id, coalesce(sp.parent::text,'-') AS parent, sp.path, sp.k, sp.rej FROM sp
UNION ALL SELECT 'callout', c.id::text, c."calloutsSetId"::text, sp.path||'/collaboration/'||lower(c."nameID"), sp.k||'/collaboration/'||lower(c."nameID"), (c.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='callout'))
  FROM sp JOIN collaboration co ON co.id=sp.collab JOIN callout c ON c."calloutsSetId"=co."calloutsSetId"
UNION ALL SELECT 'post', p.id::text, cc."calloutId"::text, sp.path||'/collaboration/'||lower(c."nameID")||'/posts/'||lower(p."nameID"), sp.k||'/collaboration/'||lower(c."nameID")||'/posts/'||lower(p."nameID"), (p.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='post'))
  FROM sp JOIN collaboration co ON co.id=sp.collab JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_contribution cc ON cc."calloutId"=c.id JOIN post p ON p.id=cc."postId"
UNION ALL SELECT 'whiteboard', w.id::text, cc."calloutId"::text, sp.path||'/collaboration/'||lower(c."nameID")||'/whiteboards/'||lower(w."nameID"), sp.k||'/collaboration/'||lower(c."nameID")||'/whiteboards/'||lower(w."nameID"), (w.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='whiteboard'))
  FROM sp JOIN collaboration co ON co.id=sp.collab JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_contribution cc ON cc."calloutId"=c.id JOIN whiteboard w ON w.id=cc."whiteboardId"
UNION ALL SELECT 'memo', m.id::text, cc."calloutId"::text, sp.path||'/collaboration/'||lower(c."nameID")||'/memos/'||lower(m."nameID"), sp.k||'/collaboration/'||lower(c."nameID")||'/memos/'||lower(m."nameID"), (m.id::text IN (SELECT q.id FROM orphan q WHERE q.tbl='memo'))
  FROM sp JOIN collaboration co ON co.id=sp.collab JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" JOIN callout_contribution cc ON cc."calloutId"=c.id JOIN memo m ON m.id=cc."memoId";
WITH g AS (
  SELECT '1 by address text'::text AS counted, path AS a, min(kind) AS kind, count(*) AS c, count(DISTINCT parent) AS parents, count(*) FILTER (WHERE NOT rej) AS kept FROM c7_addr GROUP BY path HAVING count(*)>1
  UNION ALL SELECT '2 by lookup key', k, min(kind), count(*), count(DISTINCT parent), count(*) FILTER (WHERE NOT rej) FROM c7_addr GROUP BY k HAVING count(*)>1)
SELECT counted, CASE WHEN parents>1 THEN 'other parent' ELSE 'same parent' END AS twins_are, coalesce(kind, 'all kinds') AS kind, count(*) AS groups, sum(c) AS rows_in_groups,
       count(*) FILTER (WHERE kept>1) AS groups_after_copy, coalesce(sum(kept) FILTER (WHERE kept>1), 0) AS rows_after_copy
  FROM g GROUP BY counted, (parents>1), ROLLUP(kind) ORDER BY 1, 2, (kind IS NULL), 3;
\echo --- C7 G11 the other parent groups of C7 G10 by where the twin space sits (by address text): below a top-level twin, a subspace twin or a sub-subspace twin
WITH g AS (SELECT path, min(kind) AS kind, count(*) AS c, count(DISTINCT parent) AS parents FROM c7_addr GROUP BY path HAVING count(*)>1)
SELECT kind, CASE WHEN kind='space' THEN 'the rows are subspaces of twin spaces' WHEN path ~ '/opportunities/' THEN 'in a sub-subspace' WHEN path ~ '/challenges/' THEN 'in a subspace' ELSE 'in a top-level space' END AS where_the_rows_sit,
       count(*) AS groups, sum(c) AS rows_in_groups
  FROM g WHERE parents>1 GROUP BY 1,2 ORDER BY 1,2;
\echo --- C7 G12 rows with no handle at all (empty or missing): no address can be formed for them. Per kind, with what hangs on them (the population of repair 57-c7-repair.sql; expect 0 rows after that repair)
SELECT h.kind, count(*) AS no_handle, count(*) FILTER (WHERE h.rej) AS rejected, count(*) FILTER (WHERE NOT h.rej) AS kept_after_copy,
       count(*) FILTER (WHERE h.kind='callout' AND EXISTS (SELECT 1 FROM collaboration co JOIN space s ON s."collaborationId"=co.id WHERE co."calloutsSetId"::text=h.scope)) AS callouts_in_a_space,
       count(*) FILTER (WHERE h.kind='callout' AND EXISTS (SELECT 1 FROM callout c WHERE c.id::text=h.id AND c.settings->>'visibility'='published')) AS callouts_published,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"::text IN (SELECT h2.id FROM c7_handle h2 WHERE h2.kind='callout' AND (h2.n IS NULL OR h2.n=''))) AS contributions_in_such_callouts,
       min(h.created)::date AS first_made, max(h.created)::date AS last_made
  FROM c7_handle h WHERE h.n IS NULL OR h.n='' GROUP BY h.kind ORDER BY 1;
SELECT 'stored links that end at the collaboration word with no handle after it' AS what,
       (SELECT count(*) FROM reference WHERE uri ~* 'alkem\.io/.*/collaboration/?$') + (SELECT count(*) FROM link WHERE uri ~* 'alkem\.io/.*/collaboration/?$') AS links_and_references,
       (SELECT count(*) FROM profile WHERE description ~* 'alkem\.io/[^ ")<]*/collaboration/?[ ")<]') AS profile_texts;
\echo --- C7 G13 stored platform addresses that name one of the failing handles of C7 G3 as a whole part of the path: the stored links a rename of those handles would break (0 in the third column means no stored link has to be rewritten; the control column proves the search finds handles at all; shared links, e-mails and chat messages are outside this count)
WITH f AS (SELECT kind, lower(n) AS n, (n !~ '^[a-z0-9]+(-[a-z0-9]+)*$') AS failing FROM c7_handle
            WHERE n IS NOT NULL AND n<>'' AND (kind='space-l0' OR n !~ '^[a-z0-9]+(-[a-z0-9]+)*$')),
 src AS (SELECT 'reference.uri'::text AS place, id::text AS id, lower(uri) AS t FROM reference WHERE uri ~* 'alkem\.io/'
   UNION ALL SELECT 'link.uri', id::text, lower(uri) FROM link WHERE uri ~* 'alkem\.io/'
   UNION ALL SELECT 'profile.description', id::text, lower(description) FROM profile WHERE description ~* 'alkem\.io/'
   UNION ALL SELECT 'in_app_notification payload', id::text, lower(payload::text) FROM in_app_notification WHERE payload::text ~* 'alkem\.io/'),
 hit AS (SELECT s.place, s.id, f.kind, f.n, f.failing FROM src s JOIN f ON position('/'||f.n in s.t) > 0 AND s.t ~ ('alkem\.io/([^ "<>)]*/)?' || f.n || '([/?#"<>) ]|$)'))
SELECT p.place, (SELECT count(*) FROM src s WHERE s.place=p.place) AS texts_with_a_platform_address,
       (SELECT count(DISTINCT h.id) FROM hit h WHERE h.place=p.place AND h.failing) AS texts_naming_a_failing_handle,
       (SELECT count(DISTINCT h.kind||' '||h.n) FROM hit h WHERE h.place=p.place AND h.failing) AS failing_handles_named,
       (SELECT count(DISTINCT h.id) FROM hit h WHERE h.place=p.place AND h.kind='space-l0' AND NOT h.failing) AS control_texts_naming_another_top_level_space
  FROM (VALUES ('reference.uri'),('link.uri'),('profile.description'),('in_app_notification payload')) p(place) ORDER BY 1;

\echo --- C8 G1 role definitions scoped to another space: who holds the credential, and can the two groups be told apart
WITH bad AS (
  SELECT s.id AS space_id, s.level, r.name AS role_name, r.credential->>'type' AS cred_type, r.credential->>'resourceID' AS wrong_id
    FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
   WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text)
SELECT b.level AS space_level, b.role_name, count(*) AS definitions,
       sum((SELECT count(*) FROM credential c WHERE c.type=b.cred_type AND c."resourceID"=b.wrong_id)) AS holders_on_the_wrong_id,
       sum((SELECT count(*) FROM credential c WHERE c.type=b.cred_type AND c."resourceID"=b.space_id::text)) AS holders_on_the_right_id,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space t JOIN community tc ON tc.id=t."communityId" JOIN role tr ON tr."roleSetId"=tc."roleSetId"
                                       WHERE t.id::text=b.wrong_id AND tr.credential->>'type'=b.cred_type AND tr.credential->>'resourceID'=b.wrong_id)) AS definitions_sharing_the_credential_with_the_other_space
  FROM bad b GROUP BY 1,2 ORDER BY 1,2;
\echo --- C8 G2 soundness: role definitions with an empty scope (the server then matches any target; expect 0)
SELECT count(*) AS role_definitions_with_empty_scope FROM role r JOIN role_set rs ON rs.id=r."roleSetId"
 WHERE rs.type::text <> 'platform' AND coalesce(r.credential->>'resourceID','')='';

\echo --- C8 G3 (added in the C8 review, 2026-11-13) role definitions of a space that name another id: by level of the space, by what the named id is, and by role.
\echo ---     Acceptance: 162 definitions in 54 spaces. The second result expects 0: a space whose three roles do not all name the same id
DROP TABLE IF EXISTS c8_def; DROP TABLE IF EXISTS c8_sp; DROP TABLE IF EXISTS c8_eff; DROP TABLE IF EXISTS c8_adm;
CREATE TEMP TABLE c8_def AS
SELECT s.id AS space_id, s.level, s."parentSpaceId" AS parent_id, s."levelZeroSpaceID" AS l0, c.id AS community_id, c."roleSetId" AS role_set_id, a."createdDate" AS space_created,
       r.id AS role_id, r.name::text AS role_name, r.credential->>'type' AS cred_type, r.credential->>'resourceID' AS named_id
  FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
 WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text;
CREATE TEMP TABLE c8_sp AS
SELECT x.*, CASE WHEN t.id IS NULL THEN '6 no space has this id' WHEN t."parentSpaceId"=x.space_id THEN '1 a child of the space' WHEN t.id=x.parent_id THEN '2 the parent of the space'
                 WHEN t."parentSpaceId"=x.parent_id THEN '3 a sibling of the space' WHEN t."levelZeroSpaceID"=x.l0 THEN '4 another space of the same tree' ELSE '5 a space of another tree' END AS named_is,
       t.id AS named_space
  FROM (SELECT space_id, level, parent_id, l0, community_id, role_set_id, space_created, min(named_id) AS named_id, count(DISTINCT named_id) AS ids_named, count(*) AS definitions
          FROM c8_def GROUP BY 1,2,3,4,5,6,7) x LEFT JOIN space t ON t.id::text=x.named_id;
-- who holds a role in an affected space as the server reads it today: the credential sits on the named id
CREATE TEMP TABLE c8_eff AS
SELECT d.space_id, d.community_id, d.role_set_id, d.role_name, d.cred_type, d.named_id, c.id AS cred_id, c."actorId" AS actor, c."createdDate" AS granted
  FROM c8_def d JOIN credential c ON c.type::text=d.cred_type AND c."resourceID"=d.named_id;
-- admins of every space as the server reads them today (through the stored definition), with the parent of the space
CREATE TEMP TABLE c8_adm AS
SELECT DISTINCT s.id AS space_id, s."parentSpaceId" AS parent_id, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
  JOIN credential c ON c.type::text=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID';
SELECT s.level AS space_level, s.named_is, d.role_name, count(*) AS definitions, count(DISTINCT s.space_id) AS spaces
  FROM c8_sp s JOIN c8_def d USING (space_id) GROUP BY ROLLUP ((1,2), 3) ORDER BY 1,2,3;
SELECT count(*) FILTER (WHERE ids_named<>1) AS spaces_naming_more_than_one_id, count(*) FILTER (WHERE definitions<>3) AS spaces_without_exactly_three_wrong_definitions,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM community c WHERE c.id=s.community_id AND c."parentID" IS DISTINCT FROM s.space_id::text)) AS spaces_whose_community_names_another_space
  FROM c8_sp s;

\echo --- C8 G4 the wrong-scope spaces against the reject set (expect 0 on the first three columns: the classifier keeps them all), and what excluding them would take along.
\echo ---     Acceptance: 54 spaces, 192 spaces with their subspaces (the architect says 189)
WITH RECURSIVE tree AS (SELECT space_id AS id FROM c8_sp UNION SELECT s.id FROM space s JOIN tree t ON s."parentSpaceId"=t.id)
SELECT (SELECT count(*) FROM c8_sp s JOIN orphan o ON o.tbl='space' AND o.id=s.space_id::text) AS spaces_in_reject_set,
       (SELECT count(*) FROM c8_sp s JOIN orphan o ON o.tbl='role_set' AND o.id=s.role_set_id::text) AS role_sets_in_reject_set,
       (SELECT count(*) FROM c8_def d JOIN orphan o ON o.tbl='role' AND o.id=d.role_id::text) AS definitions_in_reject_set,
       (SELECT count(*) FROM c8_sp) AS wrong_scope_spaces, (SELECT count(*) FROM tree) AS spaces_with_their_subspaces,
       (SELECT count(*) FROM tree t JOIN orphan o ON o.tbl='space' AND o.id=t.id::text) AS of_those_in_reject_set;

\echo --- C8 G5 origin: wrong-scope spaces by month of creation, then spaces created after the server fix (merged 2026-09-11, server PR 6467, release 0.167) and how many of them are wrong-scope (expect 0 once the fix runs on the environment),
\echo ---     then how many of the spaces that name a child name the newest child created together with them (within 2 minutes of the space; the server creates the subspaces of a template right after the space). Acceptance: 51 of 51
SELECT to_char(space_created, 'YYYY-MM') AS created_month, count(*) AS wrong_scope_spaces, count(*) FILTER (WHERE level=0) AS l0, count(*) FILTER (WHERE level=1) AS l1, count(*) FILTER (WHERE level=2) AS l2
  FROM c8_sp GROUP BY 1 ORDER BY 1;
SELECT count(*) AS spaces_created_from_2026_09_11, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c8_sp b WHERE b.space_id=s.id)) AS wrong_scope_among_them,
       (SELECT max(space_created)::date FROM c8_sp) AS newest_wrong_scope_space_created
  FROM space s JOIN actor a ON a.id=s.id WHERE a."createdDate" >= DATE '2026-09-11';
SELECT count(*) AS spaces_naming_a_child,
       count(*) FILTER (WHERE s.named_id = (SELECT ch.id::text FROM space ch JOIN actor ca ON ca.id=ch.id WHERE ch."parentSpaceId"=s.space_id AND ca."createdDate" <= s.space_created + interval '2 minutes'
                                              ORDER BY ca."createdDate" DESC LIMIT 1)) AS named_child_is_the_newest_created_with_the_space,
       count(*) FILTER (WHERE (SELECT count(*) FROM space ch JOIN actor ca ON ca.id=ch.id WHERE ch."parentSpaceId"=s.space_id AND ca."createdDate" <= s.space_created + interval '2 minutes') > 1) AS created_with_more_than_one_child
  FROM c8_sp s WHERE s.named_is LIKE '1 %';

\echo --- C8 G6 credentials that sit on a named id, by type: these are the people the server treats as holding the role in the wrong-scope space (and in the named space at the same time).
\echo ---     Then the same types on the own ids of the wrong-scope spaces (acceptance: only one creation session, where the own id of one wrong-scope space is the named id of two others).
\echo ---     Acceptance on named ids: admin 52, lead 52, member 63, subspace admin 19, invitee 5; 18 users hold member, lead or admin
SELECT c.type, count(*) AS credentials, count(DISTINCT c."actorId") AS holders, count(DISTINCT c."actorId") FILTER (WHERE a.type::text='user') AS users,
       count(DISTINCT c."actorId") FILTER (WHERE a.type::text<>'user') AS other_actors, count(DISTINCT c."resourceID") AS named_ids
  FROM credential c JOIN actor a ON a.id=c."actorId"
 WHERE c."resourceID" IN (SELECT named_id FROM c8_sp) AND c."actorId"::text IS DISTINCT FROM c."resourceID" GROUP BY 1 ORDER BY 1;
SELECT count(DISTINCT c."actorId") AS holders_of_member_lead_or_admin_on_a_named_id, count(DISTINCT c."actorId") FILTER (WHERE a.type::text='user') AS users
  FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c."resourceID" IN (SELECT named_id FROM c8_sp) AND c.type::text IN ('space-member','space-lead','space-admin');
SELECT c.type, count(*) AS credentials_on_the_own_id_of_a_wrong_scope_space, count(DISTINCT c."resourceID") AS spaces,
       count(*) FILTER (WHERE c."resourceID" IN (SELECT named_id FROM c8_sp)) AS of_which_the_own_id_is_also_a_named_id
  FROM credential c WHERE c."resourceID" IN (SELECT space_id::text FROM c8_sp) AND c."actorId"::text IS DISTINCT FROM c."resourceID" GROUP BY 1 ORDER BY 1;

\echo --- C8 G7 people per wrong-scope space as the server reads it today (through the named id): how many spaces have 0, 1, 2 ... members, and how many have no admin.
\echo ---     Acceptance: 2 spaces with nobody (one names an id that is no space, one is a top-level space), 44 with one member
SELECT m.members, count(*) AS spaces, count(*) FILTER (WHERE m.admins=0) AS of_which_without_admin, count(*) FILTER (WHERE m.leads=0) AS of_which_without_lead
  FROM (SELECT s.space_id, (SELECT count(DISTINCT actor) FROM c8_eff e WHERE e.space_id=s.space_id AND e.role_name='member') AS members,
               (SELECT count(DISTINCT actor) FROM c8_eff e WHERE e.space_id=s.space_id AND e.role_name='admin') AS admins,
               (SELECT count(DISTINCT actor) FROM c8_eff e WHERE e.space_id=s.space_id AND e.role_name='lead') AS leads FROM c8_sp s) m GROUP BY 1 ORDER BY 1;

\echo --- C8 G8 evidence that the people read as role holders of a wrong-scope space were put in that space and not in the named one: per role held today,
\echo ---     is there a member-joined event of that person on the wrong-scope space, an invitation or application of that person on its role set, or none of these.
\echo ---     The second result is the same question asked of the named spaces. Acceptance: the only roles with no record are the two spaces of the one creation session
SELECT e.role_name, count(*) AS roles_held_today, count(DISTINCT e.actor) AS holders,
       count(*) FILTER (WHERE j.yes) AS with_join_event_on_this_space, count(*) FILTER (WHERE NOT j.yes AND i.yes) AS no_join_event_but_invitation_or_application,
       count(*) FILTER (WHERE NOT j.yes AND NOT i.yes) AS no_record_on_this_space, count(DISTINCT e.space_id) FILTER (WHERE NOT j.yes AND NOT i.yes) AS spaces_with_such_a_role
  FROM c8_eff e
  CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM activity a WHERE a.type::text='member-joined' AND a."parentID"=e.community_id AND a."resourceID"=e.actor) AS yes) j
  CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM invitation v WHERE v."roleSetId"=e.role_set_id AND v."invitedActorId"=e.actor)
                          OR EXISTS (SELECT 1 FROM application p WHERE p."roleSetId"=e.role_set_id AND p."userId"=e.actor) AS yes) i
 GROUP BY 1 ORDER BY 1;
SELECT (SELECT count(*) FROM activity a JOIN c8_sp s ON a."parentID"=s.community_id WHERE a.type::text='member-joined') AS join_events_on_wrong_scope_spaces,
       (SELECT count(*) FROM activity a JOIN space t ON t.id::text IN (SELECT named_id FROM c8_sp) JOIN community c ON c.id=t."communityId" AND a."parentID"=c.id WHERE a.type::text='member-joined') AS join_events_on_named_spaces,
       (SELECT count(*) FROM invitation v JOIN c8_sp s ON v."roleSetId"=s.role_set_id) AS invitations_on_wrong_scope_spaces,
       (SELECT count(*) FROM invitation v JOIN space t ON t.id::text IN (SELECT named_id FROM c8_sp) JOIN community c ON c.id=t."communityId" AND v."roleSetId"=c."roleSetId") AS invitations_on_named_spaces,
       (SELECT count(*) FROM application p JOIN c8_sp s ON p."roleSetId"=s.role_set_id) AS applications_on_wrong_scope_spaces,
       (SELECT count(*) FROM application p JOIN space t ON t.id::text IN (SELECT named_id FROM c8_sp) JOIN community c ON c.id=t."communityId" AND p."roleSetId"=c."roleSetId") AS applications_on_named_spaces,
       (SELECT count(*) FROM platform_invitation p JOIN c8_sp s ON p."roleSetId"=s.role_set_id) AS platform_invitations_on_wrong_scope_spaces;

\echo --- C8 G9 the named spaces that are sound themselves: their role credentials by when they were granted. Granted with the creation of the named space = the creator (in most creations the creator also holds the roles in the other nested subspaces, see the last result).
\echo ---     Granted later = a person who joined the wrong-scope space and so also holds the role in the named subspace without having joined it. A repair that follows the definition keeps both; the later ones are tracked.
\echo ---     Then: where the wrong-scope space was created with other subspaces too, does the first admin on the named id also hold admin in those others.
\echo ---     Acceptance: 23 spaces, 17 yes, and in the other 6 the other subspaces have no admin at all. So the creator in the named subspace fits most creations, not all
SELECT e.role_name, count(DISTINCT e.cred_id) AS credentials, count(DISTINCT e.cred_id) FILTER (WHERE e.granted <= na."createdDate" + interval '5 minutes') AS granted_with_the_named_space,
       count(DISTINCT e.cred_id) FILTER (WHERE e.granted > na."createdDate" + interval '5 minutes') AS granted_later,
       count(DISTINCT e.actor) FILTER (WHERE e.granted > na."createdDate" + interval '5 minutes') AS holders_granted_later,
       count(DISTINCT e.named_id) FILTER (WHERE e.granted > na."createdDate" + interval '5 minutes') AS named_spaces_with_a_later_grant
  FROM c8_eff e JOIN c8_sp s USING (space_id) JOIN actor na ON na.id=s.named_space
 WHERE NOT EXISTS (SELECT 1 FROM c8_sp x WHERE x.space_id=s.named_space) GROUP BY 1 ORDER BY 1;
SELECT count(*) AS wrong_scope_spaces_created_with_other_subspaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c8_adm a WHERE a.parent_id=s.space_id AND a.space_id IS DISTINCT FROM s.named_space AND a.actor=f.actor)) AS first_admin_on_the_named_id_is_admin_of_another_subspace,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM c8_adm a WHERE a.parent_id=s.space_id AND a.space_id IS DISTINCT FROM s.named_space)) AS the_other_subspaces_have_no_admin_at_all
  FROM c8_sp s CROSS JOIN LATERAL (SELECT e.actor FROM c8_eff e WHERE e.space_id=s.space_id AND e.role_name='admin' ORDER BY e.granted, e.actor LIMIT 1) f
 WHERE s.named_is LIKE '1 %' AND EXISTS (SELECT 1 FROM space ch JOIN actor ca ON ca.id=ch.id WHERE ch."parentSpaceId"=s.space_id AND ch.id IS DISTINCT FROM s.named_space AND ca."createdDate" <= s.space_created + interval '2 minutes');

\echo --- C8 G10 the cases a repair cannot treat like the rest: a named id that is itself a wrong-scope space, a named id shared by more than one space, a named id that is no space,
\echo ---     and stored authorization policies that still carry an id that no space has (acceptance: 2, 1, 1, 189). Each is listed for a one-by-one check
SELECT (SELECT count(*) FROM c8_sp s WHERE EXISTS (SELECT 1 FROM c8_sp x WHERE x.space_id=s.named_space)) AS spaces_whose_named_id_is_itself_wrong_scope,
       (SELECT count(*) FROM (SELECT named_id FROM c8_sp GROUP BY 1 HAVING count(*)>1) q) AS named_ids_shared_by_more_than_one_space,
       (SELECT count(*) FROM c8_sp WHERE named_space IS NULL) AS spaces_naming_an_id_that_is_no_space,
       (SELECT count(*) FROM authorization_policy ap WHERE EXISTS (SELECT 1 FROM c8_sp b WHERE b.named_space IS NULL AND b.named_id<>'' AND ap."credentialRules"::text LIKE '%'||b.named_id||'%')) AS stored_policies_carrying_an_id_no_space_has,
       (SELECT count(*) FROM credential c WHERE c."resourceID" IN (SELECT named_id FROM c8_sp WHERE named_space IS NULL)) AS credentials_on_an_id_no_space_has;
SELECT md5(s.space_id::text) AS space_ref, s.level, s.named_is, md5(s.named_id) AS named_ref, (SELECT count(*) FROM space ch WHERE ch."parentSpaceId"=s.space_id) AS children,
       (SELECT count(DISTINCT actor) FROM c8_eff e WHERE e.space_id=s.space_id AND e.role_name='member') AS members_today, s.space_created::date AS created
  FROM c8_sp s WHERE s.named_is NOT LIKE '1 %' OR s.level=0 OR EXISTS (SELECT 1 FROM c8_sp x WHERE x.named_id=s.space_id::text)
     OR NOT EXISTS (SELECT 1 FROM c8_eff e WHERE e.space_id=s.space_id) ORDER BY s.space_created, 1;

\echo --- C8 G11 the two credentials the server derives from the admin definition and so also puts on the named id. Subspace admin: given on the parent to whoever becomes admin of a subspace.
\echo ---     Invitee: given on the space to whoever is invited, removed when the invitation is answered. Per credential on a named id: does the holder fit the wrong-scope space, the named space, or both.
\echo ---     Acceptance: subspace admin 19 (18 fit only the wrong-scope space, 1 fits both), invitee 5 (all fit only the wrong-scope space)
SELECT c.type, count(DISTINCT c.id) AS credentials_on_a_named_id,
       count(DISTINCT c.id) FILTER (WHERE fits_namer AND NOT fits_named) AS fits_only_the_wrong_scope_space,
       count(DISTINCT c.id) FILTER (WHERE fits_namer AND fits_named) AS fits_both, count(DISTINCT c.id) FILTER (WHERE NOT fits_namer AND fits_named) AS fits_only_the_named_space,
       count(DISTINCT c.id) FILTER (WHERE NOT fits_namer AND NOT fits_named) AS fits_neither
  FROM credential c
  CROSS JOIN LATERAL (SELECT
     CASE WHEN c.type::text='space-subspace-admin' THEN EXISTS (SELECT 1 FROM c8_sp s JOIN c8_adm a ON a.parent_id=s.space_id WHERE s.named_id=c."resourceID" AND a.actor=c."actorId")
          ELSE EXISTS (SELECT 1 FROM c8_sp s JOIN invitation v ON v."roleSetId"=s.role_set_id WHERE s.named_id=c."resourceID" AND v."invitedActorId"=c."actorId") END AS fits_namer,
     CASE WHEN c.type::text='space-subspace-admin' THEN EXISTS (SELECT 1 FROM c8_adm a WHERE a.parent_id::text=c."resourceID" AND a.actor=c."actorId")
          ELSE EXISTS (SELECT 1 FROM space t JOIN community cm ON cm.id=t."communityId" JOIN invitation v ON v."roleSetId"=cm."roleSetId" WHERE t.id::text=c."resourceID" AND v."invitedActorId"=c."actorId") END AS fits_named) f
 WHERE c.type::text IN ('space-subspace-admin','space-invitee') AND c."resourceID" IN (SELECT named_id FROM c8_sp) GROUP BY 1 ORDER BY 1;
SELECT coalesce((l."machineState"::jsonb)->>'value', 'no state value') AS invitation_state, count(*) AS invitations_behind_an_invitee_credential_on_a_named_id
  FROM credential c JOIN c8_sp s ON s.named_id=c."resourceID" JOIN invitation v ON v."roleSetId"=s.role_set_id AND v."invitedActorId"=c."actorId" LEFT JOIN lifecycle l ON l.id=v."lifecycleId"
 WHERE c.type::text='space-invitee' GROUP BY 1 ORDER BY 1;
\echo ---     for comparison, the same rule on spaces this finding does not touch: it does not hold everywhere, so the repair moves what is there and adds nothing by rule
SELECT (SELECT count(*) FROM (SELECT DISTINCT parent_id, actor FROM c8_adm WHERE parent_id IS NOT NULL) a
         WHERE NOT EXISTS (SELECT 1 FROM c8_sp s WHERE s.space_id=a.parent_id OR s.named_id=a.parent_id::text)) AS admin_of_a_subspace_pairs_on_sound_parents,
       (SELECT count(*) FROM (SELECT DISTINCT parent_id, actor FROM c8_adm WHERE parent_id IS NOT NULL) a
         WHERE NOT EXISTS (SELECT 1 FROM c8_sp s WHERE s.space_id=a.parent_id OR s.named_id=a.parent_id::text)
           AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type::text='space-subspace-admin' AND c."resourceID"=a.parent_id::text AND c."actorId"=a.actor)) AS of_which_without_the_subspace_admin_credential,
       (SELECT count(*) FROM (SELECT DISTINCT a.parent_id, a.actor FROM c8_adm a JOIN c8_sp s ON s.space_id=a.parent_id) q) AS admin_of_a_subspace_pairs_on_wrong_scope_parents,
       (SELECT count(*) FROM (SELECT DISTINCT a.parent_id, a.actor FROM c8_adm a JOIN c8_sp s ON s.space_id=a.parent_id
                               WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type::text='space-subspace-admin' AND c."actorId"=a.actor AND c."resourceID" IN (s.named_id, s.space_id::text))) q) AS of_which_with_no_subspace_admin_credential_anywhere;

\echo --- C8 G12 parent credentials: every space role lists the credentials of the same role in the spaces above it. Entries that name an id which is not a space above (expect 0 on sound data),
\echo ---     and how many of them name the id of a wrong-scope definition (acceptance: 42 entries in 13 spaces, of which 21 entries in 7 spaces belong to this finding: written when a subspace was added later under a wrong-scope space.
\echo ---     The other 21 entries in 6 spaces name a space that exists and is not above: a neighbour, not examined here)
SELECT count(*) AS entries_naming_an_id_that_is_not_above, count(DISTINCT r.id) AS definitions, count(DISTINCT s.id) AS spaces,
       count(*) FILTER (WHERE e->>'resourceID' IN (SELECT named_id FROM c8_sp)) AS of_which_name_a_wrong_scope_id,
       count(DISTINCT s.id) FILTER (WHERE e->>'resourceID' IN (SELECT named_id FROM c8_sp)) AS spaces_with_such_an_entry,
       count(*) FILTER (WHERE e->>'resourceID' IN (SELECT x.named_id FROM c8_sp x WHERE x.space_id=s."parentSpaceId")) AS of_which_the_parent_is_the_wrong_scope_space
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e
  -- 2026-11-19: "above" is the whole chain of parents, not only parent and grandparent (2 subspaces sit 3 deep and rightly name their top-level space)
 WHERE NOT EXISTS (WITH RECURSIVE up AS (SELECT s."parentSpaceId" AS above UNION ALL SELECT p."parentSpaceId" FROM up u JOIN space p ON p.id=u.above WHERE p."parentSpaceId" IS NOT NULL)
                   SELECT 1 FROM up WHERE up.above::text = e->>'resourceID');

\echo --- for context, a second neighbour in the same lists: space role definitions whose list of parent credentials holds the same entry twice (acceptance: 56, all of them lead definitions, none in a wrong-scope space)
SELECT count(*) AS definitions_with_the_same_parent_entry_twice, count(*) FILTER (WHERE q.name='lead') AS of_which_lead_definitions,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c8_sp w WHERE w.role_set_id=q."roleSetId")) AS of_which_in_a_wrong_scope_space
  FROM (SELECT r.id, r.name::text AS name, r."roleSetId" FROM role r JOIN community cm ON cm."roleSetId"=r."roleSetId" JOIN space s ON s."communityId"=cm.id
         WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") x(e) GROUP BY x.e HAVING count(*)>1)) q;
\echo --- C8 G13 a neighbour of this finding, counted here and not repaired by it: second-level subspaces whose roles list only one space above them (the top-level space is missing).
\echo ---     Written by the same nested creation; still written after the fix of 2026-09-11 (acceptance: 3 spaces created after it)
SELECT CASE WHEN EXISTS (SELECT 1 FROM c8_sp x WHERE x.space_id=s."parentSpaceId") THEN 'parent is a wrong-scope space' ELSE 'parent is sound' END AS parent,
       CASE WHEN a."createdDate" >= DATE '2026-09-11' THEN 'created from 2026-09-11' ELSE 'created before' END AS created,
       count(DISTINCT s.id) AS l2_spaces_with_a_one_entry_list,
       count(DISTINCT s.id) FILTER (WHERE (r."parentCredentials"->0->>'resourceID') = s."parentSpaceId"::text) AS the_entry_is_the_parent
  FROM space s JOIN actor a ON a.id=s.id JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
 WHERE s.level=2 AND jsonb_array_length(r."parentCredentials")=1 GROUP BY 1,2 ORDER BY 1,2;

\echo --- C8 G14 another neighbour, QA register A1, separate from this finding: admin definitions of subspaces that list a member credential of a space above where the admin credential belongs.
\echo ---     Every member of that space above then passes as admin of the subspace. Acceptance: 147 definitions (88 first-level, 59 second-level), none in a wrong-scope space
SELECT s.level, count(DISTINCT r.id) AS admin_definitions_listing_a_member_credential, count(DISTINCT r.id) FILTER (WHERE EXISTS (SELECT 1 FROM c8_sp x WHERE x.space_id=s.id)) AS of_which_in_a_wrong_scope_space,
       count(*) AS entries, count(DISTINCT s."levelZeroSpaceID") AS top_level_spaces
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-member' GROUP BY ROLLUP (1) ORDER BY 1;
SELECT count(DISTINCT c."actorId") AS holders_of_a_member_credential_listed_in_an_admin_definition,
       count(DISTINCT c."actorId") FILTER (WHERE a.type::text='user') AS users,
       count(DISTINCT c."actorId") FILTER (WHERE a.type::text='user' AND NOT EXISTS (SELECT 1 FROM credential c2 WHERE c2."actorId"=c."actorId" AND c2.type::text='space-admin' AND c2."resourceID"=c."resourceID")) AS users_who_are_not_admin_of_that_space_above
  FROM (SELECT DISTINCT e->>'resourceID' AS rid FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin'
        CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-member') m
  JOIN credential c ON c.type::text='space-member' AND c."resourceID"=m.rid JOIN actor a ON a.id=c."actorId";

\echo --- C8 G15 soundness of space roles, to run on any data set and again after a repair. Expect 0 on the first three columns after a repair (acceptance before: 162, 0, 0).
\echo ---     Then subspace admin credentials on a space without subspaces (acceptance: 21 before the repair, 3 after).
\echo ---     The last three columns are neighbours counted for context and not part of this finding: role credentials on an id no space has (acceptance 125),
\echo ---     the same role credential held twice by one actor (acceptance 75, the repair must not add one), spaces with no member at all (acceptance 328, 2 of them wrong-scope)
SELECT (SELECT count(*) FROM c8_def) AS definitions_naming_another_id,
       (SELECT count(*) FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
         WHERE r.credential->>'type' IS DISTINCT FROM 'space-'||r.name::text) AS definitions_with_another_credential_type,
       (SELECT count(*) FROM (SELECT s.id FROM space s JOIN community c ON c.id=s."communityId" LEFT JOIN role r ON r."roleSetId"=c."roleSetId" GROUP BY s.id
                               HAVING count(*) FILTER (WHERE r.name::text IN ('member','lead','admin')) <> 3 OR count(DISTINCT r.name::text) FILTER (WHERE r.name::text IN ('member','lead','admin')) <> 3) q) AS spaces_without_exactly_one_member_lead_and_admin_definition,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" WHERE c.type::text='space-subspace-admin'
           AND NOT EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"=s.id)) AS subspace_admin_credentials_on_a_space_without_subspaces,
       (SELECT count(*) FROM credential c WHERE c.type::text IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')
           AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID")) AS space_role_credentials_on_an_id_no_space_has,
       (SELECT count(*) FROM (SELECT 1 FROM credential c WHERE c.type::text IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')
                               GROUP BY c.type, c."resourceID", c."actorId" HAVING count(*)>1) q) AS same_credential_held_twice,
       (SELECT count(*) FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='member'
         WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type::text=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID')) AS spaces_with_no_member_at_all;
\echo --- for context, one more neighbour: credentials that no actor holds. A role credential among them is read as a role holding with nobody behind it (acceptance: 54 credentials, none on a named id)
SELECT count(*) AS credentials_with_no_actor,
       count(*) FILTER (WHERE c.type IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')) AS of_which_space_role_credentials,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c8_def d WHERE d.named_id = c."resourceID")) AS of_which_on_a_named_id
FROM credential c WHERE c."actorId" IS NULL;

\echo --- C9 G1 empty display names by profile type (decides whether a user ever sees them)
SELECT type, count(*) FROM profile WHERE "displayName" IS NULL OR trim("displayName")='' GROUP BY 1 ORDER BY 2 DESC;
\echo --- C9 G2 organizations matching a test-data pattern: what a delete would take with it
SELECT count(*) AS organizations_matching,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s."accountId"=o."accountID")) AS hosting_spaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM virtual_contributor v WHERE v."accountId"=o."accountID")) AS hosting_vcs,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c WHERE c."resourceID"=o.id::text AND c.type LIKE 'organization-%')) AS with_people_attached,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=o.id AND c.type LIKE 'space-%')) AS member_or_lead_of_a_space
  FROM organization o
 WHERE o."legalEntityName" ~* '^(test|dummy|n/?a|none|-|\.|x+)$' OR o.website ~* '(example\.com|test\.com|localhost|^https?://(www\.)?(test|dummy))' OR o.domain ~* '(example|test|dummy|localhost)';
\echo --- C9 G3 link responses with an empty URL: do they carry a title or description (then they are not empty for the reader)
SELECT count(*) AS links_with_empty_url, count(*) FILTER (WHERE coalesce(p."displayName",'')<>'') AS with_title, count(*) FILTER (WHERE coalesce(p.description,'')<>'') AS with_description,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."linkId"=l.id)) AS are_responses, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM callout_framing f WHERE f."linkId"=l.id)) AS are_framings
  FROM link l LEFT JOIN profile p ON p.id=l."profileId" WHERE l.uri IS NULL OR trim(l.uri)='';

\echo --- C9 G4 the two profiles of a space (the actor profile made at creation and the About profile a rename changes): how many spaces show a different name on the two, by level. Ruling: kept, the server never copies a rename to the actor profile. about_changed_later expects to equal names_differ, in_reject_set expects 0
SELECT s.level, count(*) AS spaces, count(*) FILTER (WHERE p1.id <> p2.id) AS with_two_profile_rows,
       count(*) FILTER (WHERE p1."displayName" <> p2."displayName") AS names_differ,
       count(*) FILTER (WHERE p1."displayName" <> p2."displayName" AND lower(trim(p1."displayName")) = lower(trim(p2."displayName"))) AS differ_only_by_case_or_outer_spaces,
       count(*) FILTER (WHERE p1."displayName" <> p2."displayName" AND p2."updatedDate" > p1."updatedDate") AS about_changed_later,
       count(*) FILTER (WHERE p1."displayName" <> p2."displayName" AND EXISTS (SELECT 1 FROM orphan x WHERE x.id=s.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM space s JOIN actor a ON a.id=s.id JOIN profile p1 ON p1.id=a."profileId" JOIN space_about sa ON sa.id=s."aboutId" JOIN profile p2 ON p2.id=sa."profileId"
 GROUP BY s.level ORDER BY s.level;
\echo --- C9 G5 profiles holding two tag sets with the same name when case is ignored, by profile type and by the pair of names: are both sets empty (then no reader sees a difference). Ruling: kept. with_tags_in_either expects 0
WITH g AS (SELECT t."profileId", lower(t.name) AS n, count(*) AS sets, count(DISTINCT t.name) AS spellings, count(*) FILTER (WHERE coalesce(t.tags,'')<>'') AS sets_with_tags,
                  min(t."createdDate") AS first_made, max(t."createdDate") AS last_made
             FROM tagset t WHERE t."profileId" IS NOT NULL GROUP BY 1,2 HAVING count(*)>1)
SELECT p.type::text AS profile_type, CASE WHEN g.spellings>1 THEN 'names differ only by case' ELSE 'the same name twice' END AS pair, count(*) AS profiles, sum(g.sets) AS tag_sets,
       count(*) FILTER (WHERE g.sets_with_tags>0) AS with_tags_in_either,
       count(*) FILTER (WHERE g.last_made - g.first_made < interval '1 minute') AS pair_made_within_a_minute,
       min(g.first_made)::date AS first_made, max(g.last_made)::date AS last_made,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=p.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM g JOIN profile p ON p.id=g."profileId" GROUP BY 1,2 ORDER BY 3 DESC;
\echo --- C9 G6 phases with a blank name, by where the flow sits: is the name one space character, do posts sit on it, is the flow also over its maximum. Ruling: kept, the space admin is informed, no rename by QA. The posts on a blank phase are matched posts, they are not part of B1
SELECT CASE WHEN co.id IS NULL THEN '3 flow with no collaboration' WHEN co."isTemplate" THEN '2 template' ELSE '1 space level ' || coalesce(sp.level::text,'none') END AS flow_sits_in,
       count(*) AS blank_phases, count(DISTINCT s."innovationFlowId") AS flows, count(*) FILTER (WHERE s."displayName" = ' ') AS name_is_one_space_character,
       sum((SELECT count(*) FROM callout c JOIN tagset t ON t."classificationId"=c."classificationId" AND t.name='flow-state'
             WHERE c."calloutsSetId"=co."calloutsSetId" AND t.tags = s."displayName")) AS posts_on_the_blank_phase,
       count(*) FILTER (WHERE (SELECT count(*) FROM innovation_flow_state s2 WHERE s2."innovationFlowId"=s."innovationFlowId") > coalesce((f.settings->>'maximumNumberOfStates')::int, 8)) AS in_a_flow_over_its_maximum,
       min(s."createdDate")::date AS first_made, max(s."createdDate")::date AS last_made,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=s.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM innovation_flow_state s LEFT JOIN innovation_flow f ON f.id=s."innovationFlowId" LEFT JOIN collaboration co ON co."innovationFlowId"=f.id LEFT JOIN space sp ON sp."collaborationId"=co.id
 WHERE s."displayName" IS NULL OR trim(s."displayName")='' GROUP BY 1 ORDER BY 1;
\echo --- C9 G7 flows that hold the same phase name twice (phases with no flow are left out, they are not one flow): exact repeat or repeat only when case and outer spaces are ignored, and the posts that sit on the name. Ruling: kept, the space admin is informed
WITH g AS (SELECT s."innovationFlowId" AS f, lower(trim(s."displayName")) AS n, count(*) AS c, count(DISTINCT s."displayName") AS spellings, min(s."createdDate") AS made
             FROM innovation_flow_state s WHERE s."innovationFlowId" IS NOT NULL AND trim(s."displayName")<>'' GROUP BY 1,2 HAVING count(*)>1)
SELECT CASE WHEN co.id IS NULL THEN '3 flow with no collaboration' WHEN co."isTemplate" THEN '2 template' ELSE '1 space level ' || coalesce(sp.level::text,'none') END AS flow_sits_in,
       CASE WHEN g.spellings=1 THEN 'exact repeat' ELSE 'repeat only when case or outer spaces are ignored' END AS kind,
       count(DISTINCT g.f) AS flows, sum(g.c) AS phases,
       sum((SELECT count(*) FROM callout c JOIN tagset t ON t."classificationId"=c."classificationId" AND t.name='flow-state'
             WHERE c."calloutsSetId"=co."calloutsSetId" AND lower(trim(t.tags)) = g.n)) AS posts_on_the_name,
       min(g.made)::date AS first_made,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=g.f::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM g LEFT JOIN collaboration co ON co."innovationFlowId"=g.f LEFT JOIN space sp ON sp."collaborationId"=co.id GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) AS phases_with_no_flow FROM innovation_flow_state WHERE "innovationFlowId" IS NULL;
\echo --- C9 G8 flows holding more phases than their stored maximum, by where the flow sits. Ruling: kept. The server refuses a new phase on them and refuses a new flow built from such a definition, so a template over the maximum is the part to watch
WITH f AS (SELECT f.id, count(*) AS n, coalesce((f.settings->>'maximumNumberOfStates')::int, 8) AS mx,
                  bool_or(trim(coalesce(s."displayName",''))='') AS has_blank, min(s."createdDate") AS d1, max(s."createdDate") AS d2
             FROM innovation_flow f JOIN innovation_flow_state s ON s."innovationFlowId"=f.id GROUP BY f.id)
SELECT CASE WHEN co.id IS NULL THEN '3 flow with no collaboration' WHEN co."isTemplate" THEN '2 template' ELSE '1 space level ' || coalesce(sp.level::text,'none') END AS flow_sits_in,
       count(*) AS flows_over_maximum, min(f.mx) AS smallest_maximum, max(f.mx) AS largest_maximum, min(f.n) AS fewest_phases, max(f.n) AS most_phases,
       count(*) FILTER (WHERE f.has_blank) AS holding_a_blank_phase,
       sum((SELECT count(*) FROM callout c WHERE c."calloutsSetId"=co."calloutsSetId")) AS posts_in_them,
       min(f.d1)::date AS first_phase_made, max(f.d2)::date AS last_phase_made,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=f.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM f LEFT JOIN collaboration co ON co."innovationFlowId"=f.id LEFT JOIN space sp ON sp."collaborationId"=co.id WHERE f.n > f.mx GROUP BY 1 ORDER BY 1;
SELECT count(*) AS phases, min("createdDate")::date AS earliest_phase_made,
       count(*) FILTER (WHERE "createdDate"::date = (SELECT min("createdDate")::date FROM innovation_flow_state)) AS phases_made_on_that_day,
       count(DISTINCT "innovationFlowId") FILTER (WHERE "createdDate"::date = (SELECT min("createdDate")::date FROM innovation_flow_state)) AS flows_on_that_day
  FROM innovation_flow_state;
SELECT coalesce(f.settings->>'maximumNumberOfStates','not set') AS stored_maximum, count(*) AS flows FROM innovation_flow f GROUP BY 1 ORDER BY 2 DESC;
\echo --- C9 G9 titles outside the limits the server applies to typed input today (3 to 128 characters), by profile type. Ruling: kept unchanged. A distiller or a new server that applies the limits on import would lose these rows
SELECT p.type::text AS profile_type,
       count(*) FILTER (WHERE length(p."displayName")>128) AS over_128, max(length(p."displayName")) FILTER (WHERE length(p."displayName")>128) AS longest,
       count(*) FILTER (WHERE length(trim(p."displayName")) BETWEEN 1 AND 2) AS one_or_two_characters,
       min(p."createdDate")::date AS first_made, max(p."createdDate")::date AS last_made,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=p.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM profile p WHERE length(p."displayName")>128 OR length(trim(p."displayName")) BETWEEN 1 AND 2 GROUP BY 1 ORDER BY 2 DESC, 4 DESC;
SELECT count(*) AS link_titles_over_128, count(DISTINCT cc."createdBy") AS authors, count(DISTINCT cc."calloutId") AS posts, count(DISTINCT l."createdDate"::date) AS days_made,
       min(length(l.uri)) AS shortest_address, max(length(l.uri)) AS longest_address
  FROM link l JOIN profile p ON p.id=l."profileId" LEFT JOIN callout_contribution cc ON cc."linkId"=l.id WHERE length(p."displayName")>128;
\echo --- C9 G10 empty display names against all profiles of the type (G1 gives the plain count): what share is empty, and for the About type whether the row belongs to a space or to a template. Ruling: kept. nameless_space_abouts expects 0
SELECT p.type::text AS profile_type, count(*) AS profiles_of_type, count(*) FILTER (WHERE trim(coalesce(p."displayName",''))='') AS empty_name,
       count(*) FILTER (WHERE trim(coalesce(p."displayName",''))='' AND EXISTS (SELECT 1 FROM orphan x WHERE x.id=p.id::text AND x.tbl NOT LIKE '\_%')) AS empty_in_reject_set
  FROM profile p WHERE p.type IN (SELECT DISTINCT type FROM profile WHERE trim(coalesce("displayName",''))='') GROUP BY 1 ORDER BY 3 DESC;
SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM space s WHERE s."aboutId"=sa.id)) AS nameless_space_abouts,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM template_content_space t WHERE t."aboutId"=sa.id)) AS nameless_template_abouts,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s."aboutId"=sa.id) AND NOT EXISTS (SELECT 1 FROM template_content_space t WHERE t."aboutId"=sa.id)) AS nameless_abouts_on_nothing
  FROM space_about sa JOIN profile p ON p.id=sa."profileId" WHERE trim(coalesce(p."displayName",''))='';
SELECT count(*) AS nameless_user_groups, count(*) FILTER (WHERE g."organizationId" IS NOT NULL) AS of_an_organization, count(*) FILTER (WHERE g."communityId" IS NOT NULL) AS of_a_community,
       sum((SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c."resourceID"=g.id::text)) AS members_held
  FROM user_group g JOIN profile p ON p.id=g."profileId" WHERE trim(coalesce(p."displayName",''))='';
\echo --- C9 G11 link responses with an empty address (G3 shows all carry a title), by year made: is the shape still made, by a person or by a data change. Ruling: kept. in_reject_set expects 0
SELECT extract(year FROM l."createdDate")::int AS year_made, count(*) AS links_with_empty_address,
       count(*) FILTER (WHERE cc."createdBy" IS NULL) AS no_author_recorded, count(DISTINCT cc."createdBy") AS authors,
       count(DISTINCT cc."calloutId") AS posts, count(DISTINCT sp.id) AS spaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan x WHERE x.id=l.id::text AND x.tbl NOT LIKE '\_%')) AS in_reject_set
  FROM link l LEFT JOIN callout_contribution cc ON cc."linkId"=l.id LEFT JOIN callout c ON c.id=cc."calloutId"
  LEFT JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" LEFT JOIN space sp ON sp."collaborationId"=co.id
 WHERE trim(coalesce(l.uri,''))='' GROUP BY 1 ORDER BY 1;
SELECT count(*) AS links, count(*) FILTER (WHERE trim(coalesce(l.uri,''))='') AS empty_address,
       count(*) FILTER (WHERE trim(coalesce(l.uri,''))='' AND cc.id IS NULL) AS empty_and_not_a_response,
       count(*) FILTER (WHERE trim(coalesce(l.uri,''))='' AND trim(coalesce(p.description,''))<>'') AS empty_with_a_description,
       count(DISTINCT cc."calloutId") FILTER (WHERE trim(coalesce(l.uri,''))='') AS posts_holding_one,
       count(DISTINCT sp.id) FILTER (WHERE trim(coalesce(l.uri,''))='') AS spaces_holding_one,
       count(DISTINCT cc."createdBy") FILTER (WHERE trim(coalesce(l.uri,''))='') AS authors_of_one,
       count(*) FILTER (WHERE trim(coalesce(l.uri,''))<>'' AND l.uri !~* '^https?://') AS address_not_starting_with_http
  FROM link l LEFT JOIN profile p ON p.id=l."profileId" LEFT JOIN callout_contribution cc ON cc."linkId"=l.id LEFT JOIN callout c ON c.id=cc."calloutId"
  LEFT JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" LEFT JOIN space sp ON sp."collaborationId"=co.id;
\echo --- C9 G12 virtual contributor display names carried by more than one contributor (the short name in the address stays unique): exact and when case is ignored. Ruling: not a finding, kept. short_names expects to equal contributors
WITH v AS (SELECT v.id, v."accountId", p."displayName" AS dn, lower(trim(p."displayName")) AS n,
                  EXISTS (SELECT 1 FROM orphan x WHERE x.id=v.id::text AND x.tbl NOT LIKE '\_%') AS rej
             FROM virtual_contributor v JOIN actor a ON a.id=v.id JOIN profile p ON p.id=a."profileId"),
     ex AS (SELECT dn, count(*) AS c FROM v GROUP BY 1 HAVING count(*)>1),
     ci AS (SELECT n, count(*) AS c, count(DISTINCT "accountId") AS accounts, count(*) FILTER (WHERE rej) AS rej FROM v GROUP BY 1 HAVING count(*)>1)
SELECT (SELECT count(*) FROM v) AS contributors, (SELECT count(DISTINCT a."nameID") FROM virtual_contributor x JOIN actor a ON a.id=x.id) AS short_names,
       (SELECT count(*) FROM ex) AS names_shared_exact, (SELECT coalesce(sum(c),0) FROM ex) AS contributors_sharing_exact,
       (SELECT count(*) FROM ci) AS names_shared_case_ignored, (SELECT coalesce(sum(c),0) FROM ci) AS contributors_sharing_case_ignored,
       (SELECT count(*) FROM ci WHERE accounts>1) AS names_across_accounts, (SELECT coalesce(max(c),0) FROM ci) AS largest_group,
       (SELECT coalesce(sum(rej),0) FROM ci) AS sharing_and_in_reject_set;
\echo --- C9 G13 organizations sharing a value: the domain field and the domain of the contact address, groups of two or more. Ruling: not a finding, kept
SELECT 'domain field' AS field, count(*) AS groups, coalesce(sum(c),0) AS organizations, coalesce(max(c),0) AS largest_group
  FROM (SELECT lower(domain), count(*) AS c FROM organization WHERE coalesce(domain,'')<>'' GROUP BY 1 HAVING count(*)>1) q
UNION ALL
SELECT 'contact address domain', count(*), coalesce(sum(c),0), coalesce(max(c),0)
  FROM (SELECT lower(split_part("contactEmail",'@',2)), count(*) AS c FROM organization WHERE "contactEmail" LIKE '%@%' GROUP BY 1 HAVING count(*)>1) q;
\echo --- C9 G14 placeholder organization data, found from the data itself: a legal name, website or domain value that 10 or more organizations share (no name pattern is written here). Ruling: kept, no deletion by a pattern
CREATE TEMP TABLE c9_ph AS
WITH rep AS (SELECT 'legal' AS k, lower("legalEntityName") AS v FROM organization WHERE coalesce("legalEntityName",'')<>'' GROUP BY 2 HAVING count(*)>=10
   UNION ALL SELECT 'site', lower(website) FROM organization WHERE coalesce(website,'')<>'' GROUP BY 2 HAVING count(*)>=10
   UNION ALL SELECT 'domain', lower(domain) FROM organization WHERE coalesce(domain,'')<>'' GROUP BY 2 HAVING count(*)>=10)
SELECT o.id, o."accountID", a."createdDate" AS made,
       EXISTS (SELECT 1 FROM rep WHERE k='legal' AND v=lower(o."legalEntityName")) AS legal_hit,
       EXISTS (SELECT 1 FROM rep WHERE k='site' AND v=lower(o.website)) AS site_hit,
       EXISTS (SELECT 1 FROM rep WHERE k='domain' AND v=lower(o.domain)) AS domain_hit,
       EXISTS (SELECT 1 FROM orphan x WHERE x.id=o.id::text AND x.tbl NOT LIKE '\_%') AS rejected
  FROM organization o LEFT JOIN actor a ON a.id=o.id;
ANALYZE c9_ph;
SELECT count(*) AS organizations, count(*) FILTER (WHERE legal_hit) AS shared_legal_name, count(*) FILTER (WHERE site_hit) AS shared_website, count(*) FILTER (WHERE domain_hit) AS shared_domain,
       count(*) FILTER (WHERE legal_hit OR site_hit OR domain_hit) AS any_of_the_three, count(*) FILTER (WHERE legal_hit AND site_hit AND domain_hit) AS all_three,
       count(*) FILTER (WHERE (legal_hit OR site_hit OR domain_hit) AND rejected) AS in_reject_set,
       min(made) FILTER (WHERE legal_hit OR site_hit OR domain_hit)::date AS first_made, max(made) FILTER (WHERE legal_hit OR site_hit OR domain_hit)::date AS last_made
  FROM c9_ph;
\echo --- C9 G15 what a delete by that pattern would take: people, spaces and other content of the matched organizations, and whether anything was made on them in the last 12 months of the data (role, space or post; change dates are not used). holding_nothing is the only part a delete would not hurt
WITH ref AS (SELECT max("createdDate") AS t FROM actor),
m AS (SELECT ph.*,
  (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-owner' AND c."resourceID"=ph.id::text) AS owners,
  (SELECT count(*) FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type='organization-admin' AND c."resourceID"=ph.id::text) AS admins,
  (SELECT count(DISTINCT c."actorId") FROM credential c JOIN actor h ON h.id=c."actorId" WHERE c.type IN ('organization-owner','organization-admin','organization-associate') AND c."resourceID"=ph.id::text) AS people,
  (SELECT count(*) FROM space s WHERE s."accountId"=ph."accountID" AND s.level=0) AS l0,
  (SELECT count(*) FROM space s JOIN space z ON z.id=s."levelZeroSpaceID" WHERE z."accountId"=ph."accountID") AS spaces,
  (SELECT count(*) FROM virtual_contributor v WHERE v."accountId"=ph."accountID") AS vcs,
  (SELECT count(*) FROM innovation_pack v WHERE v."accountId"=ph."accountID") AS packs,
  (SELECT count(*) FROM credential c WHERE c."actorId"=ph.id AND c.type::text LIKE 'space-%') AS space_roles,
  (SELECT ov.status::text FROM organization o JOIN organization_verification ov ON ov.id=o."verificationId" WHERE o.id=ph.id) AS verification,
  GREATEST((SELECT max(c."createdDate") FROM credential c WHERE c."resourceID"=ph.id::text OR c."actorId"=ph.id),
           (SELECT max(a2."createdDate") FROM space s JOIN space z ON z.id=s."levelZeroSpaceID" JOIN actor a2 ON a2.id=s.id WHERE z."accountId"=ph."accountID"),
           (SELECT max(c."createdDate") FROM space s JOIN space z ON z.id=s."levelZeroSpaceID" JOIN collaboration co ON co.id=s."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId" WHERE z."accountId"=ph."accountID")) AS last_made
  FROM c9_ph ph WHERE legal_hit OR site_hit OR domain_hit)
SELECT count(*) AS organizations_matching, count(*) FILTER (WHERE owners>0) AS with_an_owner, count(*) FILTER (WHERE admins>0) AS with_an_admin,
       count(*) FILTER (WHERE people>0) AS with_people, (SELECT count(DISTINCT c."actorId") FROM credential c JOIN actor h ON h.id=c."actorId" JOIN m ON m.id::text=c."resourceID" WHERE c.type IN ('organization-owner','organization-admin','organization-associate')) AS distinct_people,
       count(*) FILTER (WHERE l0>0) AS hosting_top_level_spaces, coalesce(sum(l0),0) AS top_level_spaces, coalesce(sum(spaces),0) AS spaces_all_levels,
       count(*) FILTER (WHERE vcs>0) AS hosting_vcs, coalesce(sum(vcs),0) AS vcs, count(*) FILTER (WHERE packs>0) AS hosting_packs,
       count(*) FILTER (WHERE space_roles>0) AS holding_a_role_in_a_space, count(*) FILTER (WHERE verification IS DISTINCT FROM 'not-verified') AS verified,
       count(*) FILTER (WHERE last_made > (SELECT t FROM ref) - interval '12 months') AS something_made_in_last_12_months,
       count(*) FILTER (WHERE last_made > (SELECT t FROM ref) - interval '3 months') AS something_made_in_last_3_months,
       count(*) FILTER (WHERE people=0 AND l0=0 AND vcs=0 AND packs=0 AND space_roles=0) AS holding_nothing
  FROM m;

\echo === done
