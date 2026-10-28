\pset footer off
\echo ===D space hierarchy
SELECT 'spaces by level '||level AS chk, count(*) FROM space GROUP BY level
UNION ALL SELECT 'L0 with parentSpaceId', count(*) FROM space WHERE level=0 AND "parentSpaceId" IS NOT NULL
UNION ALL SELECT 'L>0 without parentSpaceId', count(*) FROM space WHERE level>0 AND "parentSpaceId" IS NULL
UNION ALL SELECT 'level != parent.level+1', count(*) FROM space s JOIN space p ON p.id=s."parentSpaceId" WHERE s.level<>p.level+1
UNION ALL SELECT 'level > 2', count(*) FROM space WHERE level>2
UNION ALL SELECT 'levelZeroSpaceID != computed root', count(*) FROM (WITH RECURSIVE ch AS (SELECT id, id AS cur, "parentSpaceId" AS par FROM space UNION ALL SELECT ch.id, p.id, p."parentSpaceId" FROM ch JOIN space p ON p.id=ch.par) SELECT ch.id FROM ch JOIN space s ON s.id=ch.id WHERE ch.par IS NULL AND s."levelZeroSpaceID"<>ch.cur) x
UNION ALL SELECT 'L0 without accountId', count(*) FROM space WHERE level=0 AND "accountId" IS NULL
UNION ALL SELECT 'subspace with accountId set', count(*) FROM space WHERE level>0 AND "accountId" IS NOT NULL
UNION ALL SELECT 'space without community', count(*) FROM space WHERE "communityId" IS NULL
UNION ALL SELECT 'space without collaboration', count(*) FROM space WHERE "collaborationId" IS NULL
UNION ALL SELECT 'space without about', count(*) FROM space WHERE "aboutId" IS NULL
UNION ALL SELECT 'space_about without profile', count(*) FROM space_about WHERE "profileId" IS NULL
UNION ALL SELECT 'space without storageAggregator', count(*) FROM space WHERE "storageAggregatorId" IS NULL
UNION ALL SELECT 'L0 without templatesManager', count(*) FROM space WHERE level=0 AND "templatesManagerId" IS NULL
UNION ALL SELECT 'subspace with templatesManager', count(*) FROM space WHERE level>0 AND "templatesManagerId" IS NOT NULL
UNION ALL SELECT 'space without license', count(*) FROM space WHERE "licenseId" IS NULL
UNION ALL SELECT 'space without actor row', count(*) FROM space s WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=s.id)
UNION ALL SELECT 'space actor.type != space', count(*) FROM space s JOIN actor a ON a.id=s.id WHERE a.type<>'space'
UNION ALL SELECT 'space actor without authorization', count(*) FROM space s JOIN actor a ON a.id=s.id WHERE a."authorizationId" IS NULL
UNION ALL SELECT 'space actor profileId != about profile', count(*) FROM space s JOIN actor a ON a.id=s.id JOIN space_about sa ON sa.id=s."aboutId" WHERE a."profileId" IS DISTINCT FROM sa."profileId"
UNION ALL SELECT 'duplicate nameID among siblings', count(*) FROM (SELECT s."parentSpaceId", a."nameID" FROM space s JOIN actor a ON a.id=s.id GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'duplicate L0 nameID', count(*) FROM (SELECT a."nameID" FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0 GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'settings missing privacy.mode', count(*) FROM space WHERE settings->'privacy'->>'mode' IS NULL
UNION ALL SELECT 'settings missing membership.policy', count(*) FROM space WHERE settings->'membership'->>'policy' IS NULL
UNION ALL SELECT 'settings missing collaboration', count(*) FROM space WHERE settings->'collaboration' IS NULL
UNION ALL SELECT 'platformRolesAccess empty', count(*) FROM space WHERE "platformRolesAccess"='{}'::jsonb OR "platformRolesAccess"='[]'::jsonb OR jsonb_typeof("platformRolesAccess")='null'
UNION ALL SELECT 'public subspace under private parent', count(*) FROM space s JOIN space p ON p.id=s."parentSpaceId" WHERE s.settings->'privacy'->>'mode'='public' AND p.settings->'privacy'->>'mode'='private'
UNION ALL SELECT 'visibility values: '||visibility, count(*) FROM space GROUP BY visibility
UNION ALL SELECT 'subspace visibility != L0 visibility', count(*) FROM space s JOIN space z ON z.id=s."levelZeroSpaceID" WHERE s.level>0 AND s.visibility<>z.visibility
UNION ALL SELECT 'space account -> missing account', count(*) FROM space s WHERE s."accountId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id=s."accountId")
UNION ALL SELECT 'collaboration shared by >1 space', count(*) FROM (SELECT "collaborationId" FROM space GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'community shared by >1 space', count(*) FROM (SELECT "communityId" FROM space GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'storage_aggregator parent != parent space aggregator', count(*) FROM space s JOIN space p ON p.id=s."parentSpaceId" JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId" WHERE sa."parentStorageAggregatorId" IS DISTINCT FROM p."storageAggregatorId"
UNION ALL SELECT 'L0 storage_aggregator parent != account aggregator', count(*) FROM space s JOIN account ac ON ac.id=s."accountId" JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId" WHERE s.level=0 AND sa."parentStorageAggregatorId" IS DISTINCT FROM ac."storageAggregatorId";
\echo ===D settings keys seen
SELECT k, count(*) FROM space, jsonb_object_keys(settings) k GROUP BY 1 ORDER BY 1;
