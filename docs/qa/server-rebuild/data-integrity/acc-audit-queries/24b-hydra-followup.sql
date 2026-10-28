CREATE TEMP TABLE kr(id uuid, email text, state text, created_at timestamptz, verified text, creds text);
\copy kr FROM 'kratos-identities.csv' CSV HEADER
SELECT count(*) FROM kr;
\echo === H6b subjects not matching a Kratos identity
SELECT 'auth_sessions' t, count(DISTINCT subject) subjects, count(DISTINCT subject) FILTER (WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=s.subject)) unmatched FROM hydra_oauth2_authentication_session s
UNION ALL SELECT 'access', count(DISTINCT subject), count(DISTINCT subject) FILTER (WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=a.subject)) FROM hydra_oauth2_access a
UNION ALL SELECT 'flows', count(DISTINCT subject), count(DISTINCT subject) FILTER (WHERE subject IS NOT NULL AND subject<>'' AND NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=f.subject)) FROM hydra_oauth2_flow f;
SELECT a.subject, count(*) tokens, min(a.requested_at)::date, max(a.requested_at)::date FROM hydra_oauth2_access a WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=a.subject) GROUP BY 1 ORDER BY 2 DESC;
\echo === H7b active access tokens for inactive Kratos identities
SELECT count(*) FROM hydra_oauth2_access a JOIN kr ON kr.id::text=a.subject WHERE a.active AND a.expires_at>now() AND kr.state<>'active';
\echo === H5b the subject with 441 auth sessions
SELECT kr.email, count(*) FROM hydra_oauth2_authentication_session s LEFT JOIN kr ON kr.id::text=s.subject GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
\echo === H-auth sessions with NULL expires_at
SELECT count(*), min(authenticated_at), max(authenticated_at) FROM hydra_oauth2_authentication_session WHERE expires_at IS NULL;
\echo === H-refresh tokens: active & unexpired per client (live sessions)
SELECT client_id, count(*) FROM hydra_oauth2_refresh WHERE active AND expires_at>now() GROUP BY 1;
