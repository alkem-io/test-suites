\pset footer off
CREATE TEMP TABLE k (id uuid, email text, state text, created_at timestamptz, verified boolean, cred_types text);
\copy k FROM 'kratos-identities.csv' WITH CSV HEADER
\echo ===L kratos <-> alkemio users
SELECT 'kratos identities' AS chk, count(*) FROM k
UNION ALL SELECT 'alkemio users', count(*) FROM "user"
UNION ALL SELECT 'users whose authenticationID is not a kratos identity', count(*) FROM "user" u WHERE u."authenticationID" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM k WHERE k.id=u."authenticationID")
UNION ALL SELECT 'users with NULL authenticationID but a kratos identity with same email', count(*) FROM "user" u WHERE u."authenticationID" IS NULL AND EXISTS (SELECT 1 FROM k WHERE k.email=lower(u.email))
UNION ALL SELECT 'users with NULL authenticationID and no kratos identity at all', count(*) FROM "user" u WHERE u."authenticationID" IS NULL AND NOT EXISTS (SELECT 1 FROM k WHERE k.email=lower(u.email))
UNION ALL SELECT 'users whose kratos identity email differs from user.email', count(*) FROM "user" u JOIN k ON k.id=u."authenticationID" WHERE k.email<>lower(u.email)
UNION ALL SELECT 'kratos identities with no alkemio user (by id or email)', count(*) FROM k WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."authenticationID"=k.id OR lower(u.email)=k.email)
UNION ALL SELECT '  of which created before 2026', count(*) FROM k WHERE created_at<'2026-01-01' AND NOT EXISTS (SELECT 1 FROM "user" u WHERE u."authenticationID"=k.id OR lower(u.email)=k.email)
UNION ALL SELECT '  of which verified', count(*) FILTER (WHERE verified) FROM k WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."authenticationID"=k.id OR lower(u.email)=k.email)
UNION ALL SELECT '  of which inactive state', count(*) FILTER (WHERE state<>'active') FROM k WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."authenticationID"=k.id OR lower(u.email)=k.email)
UNION ALL SELECT 'kratos identities with empty email trait', count(*) FROM k WHERE email=''
UNION ALL SELECT 'kratos identities without password/oidc credential', count(*) FROM k WHERE cred_types IS NULL OR cred_types=''
UNION ALL SELECT 'alkemio users whose identity is inactive', count(*) FROM "user" u JOIN k ON k.id=u."authenticationID" WHERE k.state<>'active'
UNION ALL SELECT 'alkemio users whose identity email is unverified', count(*) FROM "user" u JOIN k ON k.id=u."authenticationID" WHERE verified IS NOT TRUE
UNION ALL SELECT 'two alkemio users sharing one kratos identity', count(*) FROM (SELECT "authenticationID" FROM "user" WHERE "authenticationID" IS NOT NULL GROUP BY 1 HAVING count(*)>1) d
UNION ALL SELECT 'platform_invitation email matching a kratos identity but no user', count(*) FROM platform_invitation p WHERE EXISTS (SELECT 1 FROM k WHERE k.email=lower(p.email)) AND NOT EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email)=lower(p.email));
\echo ===L kratos identities without user, by creation year
SELECT extract(year FROM created_at) yr, count(*), count(*) FILTER (WHERE verified) AS verified FROM k WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."authenticationID"=k.id OR lower(u.email)=k.email) GROUP BY 1 ORDER BY 1;
\echo ===L users with null authenticationID: kratos match by email
SELECT a."nameID", (k.id IS NOT NULL) AS kratos_by_email, k.state, k.verified FROM "user" u JOIN actor a ON a.id=u.id LEFT JOIN k ON k.email=lower(u.email) WHERE u."authenticationID" IS NULL ORDER BY 1;
