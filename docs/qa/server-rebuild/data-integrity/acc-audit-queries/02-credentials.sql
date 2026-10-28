\pset footer off
\echo ===B credential types
SELECT type, count(*) FROM credential GROUP BY 1 ORDER BY 2 DESC;
\echo ===B credential integrity
SELECT 'credential.actorId null' AS chk, count(*) FROM credential WHERE "actorId" IS NULL
UNION ALL SELECT 'duplicate (actor,type,resourceID)', count(*) FROM (SELECT 1 FROM credential GROUP BY "actorId",type,"resourceID" HAVING count(*)>1) d
UNION ALL SELECT 'space-* -> missing space', count(*) FROM credential c WHERE c.type LIKE 'space-%' AND NOT EXISTS (SELECT 1 FROM space s WHERE s.id::text=c."resourceID")
UNION ALL SELECT 'organization-* -> missing org', count(*) FROM credential c WHERE c.type LIKE 'organization-%' AND NOT EXISTS (SELECT 1 FROM organization o WHERE o.id::text=c."resourceID")
UNION ALL SELECT 'account-* -> missing account', count(*) FROM credential c WHERE c.type LIKE 'account-%' AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id::text=c."resourceID")
UNION ALL SELECT 'user-self -> resourceID != actor', count(*) FROM credential c WHERE c.type='user-self' AND c."resourceID"<>c."actorId"::text
UNION ALL SELECT 'user-self missing for a user', count(*) FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type='user-self')
UNION ALL SELECT 'global-registered missing for a user', count(*) FROM "user" u WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=u.id AND c.type='global-registered')
UNION ALL SELECT 'space-admin without space-member (same space)', count(*) FROM credential c WHERE c.type='space-admin' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID")
UNION ALL SELECT 'space-lead without space-member (same space)', count(*) FROM credential c WHERE c.type='space-lead' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID")
UNION ALL SELECT 'subspace member without parent member', count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" AND s.level>0 WHERE c.type='space-member' AND NOT EXISTS (SELECT 1 FROM credential p WHERE p."actorId"=c."actorId" AND p.type='space-member' AND p."resourceID"=s."parentSpaceId"::text)
UNION ALL SELECT 'subspace member without L0 member', count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" AND s.level>0 WHERE c.type='space-member' AND NOT EXISTS (SELECT 1 FROM credential p WHERE p."actorId"=c."actorId" AND p.type='space-member' AND p."resourceID"=s."levelZeroSpaceID"::text)
UNION ALL SELECT 'organization-owner/admin without associate', count(*) FROM credential c WHERE c.type IN ('organization-owner','organization-admin') AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='organization-associate' AND m."resourceID"=c."resourceID")
UNION ALL SELECT 'account-host held by >1 actor', count(*) FROM (SELECT "resourceID" FROM credential WHERE type='account-host' GROUP BY 1 HAVING count(*)>1) x
UNION ALL SELECT 'account without account-host credential', count(*) FROM account a WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c.type='account-host' AND c."resourceID"=a.id::text)
UNION ALL SELECT 'expired credentials still present', count(*) FROM credential WHERE expires IS NOT NULL AND expires < now()
UNION ALL SELECT 'space-member held by a space/account actor (wrong actor type)', count(*) FROM credential c JOIN actor a ON a.id=c."actorId" WHERE c.type LIKE 'space-%' AND a.type NOT IN ('user','organization','virtual-contributor');
\echo ===B actor types holding credentials
SELECT a.type AS actor_type, c.type AS cred_type, count(*) FROM credential c JOIN actor a ON a.id=c."actorId" GROUP BY 1,2 ORDER BY 1,3 DESC;
\echo ===B subspace member without parent member: by actor type and level
SELECT a.type, s.level, count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" AND s.level>0 JOIN actor a ON a.id=c."actorId" WHERE c.type='space-member' AND NOT EXISTS (SELECT 1 FROM credential p WHERE p."actorId"=c."actorId" AND p.type='space-member' AND p."resourceID"=s."parentSpaceId"::text) GROUP BY 1,2 ORDER BY 1,2;
