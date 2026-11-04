\pset footer off
\echo ===F actors / users / orgs / accounts / VCs
SELECT 'actor types: '||type AS chk, count(*) FROM actor GROUP BY type
UNION ALL SELECT 'actor without owning entity', count(*) FROM actor a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id=a.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id=a.id) AND NOT EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id=a.id) AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id=a.id) AND NOT EXISTS (SELECT 1 FROM account c WHERE c.id=a.id)
UNION ALL SELECT 'actor without profile', count(*) FROM actor WHERE "profileId" IS NULL
UNION ALL SELECT 'actor without authorization', count(*) FROM actor WHERE "authorizationId" IS NULL
UNION ALL SELECT 'actor nameID null/empty', count(*) FROM actor WHERE "nameID" IS NULL OR "nameID"=''
UNION ALL SELECT 'duplicate actor nameID within type', count(*) FROM (SELECT type,lower("nameID") FROM actor GROUP BY 1,2 HAVING count(*)>1) d
UNION ALL SELECT 'actor type != owning entity (user)', count(*) FROM "user" u JOIN actor a ON a.id=u.id WHERE a.type<>'user'
UNION ALL SELECT 'actor type != owning entity (org)', count(*) FROM organization o JOIN actor a ON a.id=o.id WHERE a.type<>'organization'
UNION ALL SELECT 'actor type != owning entity (vc)', count(*) FROM virtual_contributor v JOIN actor a ON a.id=v.id WHERE a.type<>'virtual-contributor'
UNION ALL SELECT 'actor type != owning entity (account)', count(*) FROM account c JOIN actor a ON a.id=c.id WHERE a.type<>'account'
UNION ALL SELECT 'user without actor', count(*) FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=u.id)
UNION ALL SELECT 'user without settings', count(*) FROM "user" WHERE "settingsId" IS NULL
UNION ALL SELECT 'user_settings not owned by a user', count(*) FROM user_settings s WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."settingsId"=s.id)
UNION ALL SELECT 'user email duplicate (ci)', count(*) FROM (SELECT lower(email) FROM "user" GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'user email empty', count(*) FROM "user" WHERE email IS NULL OR email=''
UNION ALL SELECT 'user without storageAggregator', count(*) FROM "user" WHERE "storageAggregatorId" IS NULL
UNION ALL SELECT 'user without account', count(*) FROM "user" WHERE "accountID" IS NULL
UNION ALL SELECT 'user with no credentials at all', count(*) FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id)
UNION ALL SELECT 'user account not hosted by user', count(*) FROM "user" u WHERE u."accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='account-host' AND c."actorId"=u.id AND c."resourceID"=u."accountID"::text)
UNION ALL SELECT 'org without account', count(*) FROM organization WHERE "accountID" IS NULL
UNION ALL SELECT 'org account not hosted by org', count(*) FROM organization o WHERE o."accountID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='account-host' AND c."actorId"=o.id AND c."resourceID"=o."accountID"::text)
UNION ALL SELECT 'org without role_set', count(*) FROM organization WHERE "roleSetId" IS NULL
UNION ALL SELECT 'org without verification', count(*) FROM organization WHERE "verificationId" IS NULL
UNION ALL SELECT 'org with zero owners', count(*) FROM organization o WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-owner' AND c."resourceID"=o.id::text)
UNION ALL SELECT 'org with zero owners AND zero admins', count(*) FROM organization o WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type IN ('organization-owner','organization-admin') AND c."resourceID"=o.id::text)
UNION ALL SELECT 'org with zero associates', count(*) FROM organization o WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='organization-associate' AND c."resourceID"=o.id::text)
UNION ALL SELECT 'org role.credential.resourceID != org', count(*) FROM organization o JOIN role r ON r."roleSetId"=o."roleSetId" WHERE r.credential->>'resourceID'<>o.id::text
UNION ALL SELECT 'account without host actor (any)', count(*) FROM account a WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='account-host' AND c."resourceID"=a.id::text)
UNION ALL SELECT 'account not referenced by user/org', count(*) FROM account a WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id) AND NOT EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id)
UNION ALL SELECT 'account referenced by both user and org', count(*) FROM account a WHERE EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=a.id) AND EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=a.id)
UNION ALL SELECT 'account shared by >1 user', count(*) FROM (SELECT "accountID" FROM "user" WHERE "accountID" IS NOT NULL GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'account without license', count(*) FROM account WHERE "licenseId" IS NULL
UNION ALL SELECT 'account without storageAggregator', count(*) FROM account WHERE "storageAggregatorId" IS NULL
UNION ALL SELECT 'account host != owner of its L0 spaces? (space.account actor host missing)', count(*) FROM space s WHERE s.level=0 AND NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='account-host' AND c."resourceID"=s."accountId"::text)
UNION ALL SELECT 'vc without account', count(*) FROM virtual_contributor WHERE "accountId" IS NULL
UNION ALL SELECT 'vc without knowledge base', count(*) FROM virtual_contributor WHERE "knowledgeBaseId" IS NULL
UNION ALL SELECT 'vc bodyOfKnowledgeID -> missing (space/kb)', count(*) FROM virtual_contributor v WHERE v."bodyOfKnowledgeID" IS NOT NULL AND v."bodyOfKnowledgeID"<>'' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=v."bodyOfKnowledgeID") AND NOT EXISTS (SELECT 1 FROM knowledge_base k WHERE k.id::text=v."bodyOfKnowledgeID")
UNION ALL SELECT 'profile without storageBucket', count(*) FROM profile WHERE "storageBucketId" IS NULL
UNION ALL SELECT 'profile displayName empty', count(*) FROM profile WHERE "displayName" IS NULL OR trim("displayName")=''
UNION ALL SELECT 'profile type null', count(*) FROM profile WHERE type IS NULL;
SELECT type, count(*) FROM profile GROUP BY 1 ORDER BY 2 DESC;
\echo ===F account types
SELECT account_type, count(*) FROM account GROUP BY 1;
