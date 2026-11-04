\echo === H-migration / networks
SELECT max(version) FROM schema_migration; SELECT count(*) FROM networks;
\echo === H-clients
SELECT id, client_name, owner, scope, grant_types, response_types, redirect_uris, post_logout_redirect_uris, allowed_cors_origins, token_endpoint_auth_method, access_token_strategy, skip_consent, skip_logout_consent, (client_secret<>'') has_secret, client_secret_expires_at, created_at, updated_at FROM hydra_client ORDER BY created_at;
\echo === H1 token tables: total / active / expired-but-present (janitor)
SELECT 'access' t, count(*) total, count(*) FILTER (WHERE active) active, count(*) FILTER (WHERE expires_at<now()) expired, count(*) FILTER (WHERE active AND expires_at<now()) active_expired, min(requested_at)::date oldest FROM hydra_oauth2_access
UNION ALL SELECT 'refresh', count(*), count(*) FILTER (WHERE active), count(*) FILTER (WHERE expires_at<now()), count(*) FILTER (WHERE active AND expires_at<now()), min(requested_at)::date FROM hydra_oauth2_refresh
UNION ALL SELECT 'code', count(*), count(*) FILTER (WHERE active), count(*) FILTER (WHERE expires_at<now()), count(*) FILTER (WHERE active AND expires_at<now()), min(requested_at)::date FROM hydra_oauth2_code
UNION ALL SELECT 'oidc', count(*), count(*) FILTER (WHERE active), count(*) FILTER (WHERE expires_at<now()), count(*) FILTER (WHERE active AND expires_at<now()), min(requested_at)::date FROM hydra_oauth2_oidc
UNION ALL SELECT 'pkce', count(*), count(*) FILTER (WHERE active), count(*) FILTER (WHERE expires_at<now()), count(*) FILTER (WHERE active AND expires_at<now()), min(requested_at)::date FROM hydra_oauth2_pkce;
\echo === H-tokens per client
SELECT client_id, count(*) FROM hydra_oauth2_access GROUP BY 1; SELECT client_id, count(*) FROM hydra_oauth2_refresh GROUP BY 1;
\echo === H-access tokens per month
SELECT date_trunc('month', requested_at)::date m, count(*) FROM hydra_oauth2_access GROUP BY 1 ORDER BY 1;
\echo === H2 refresh tokens used more than once / rotation
SELECT used_times, count(*) FROM hydra_oauth2_refresh GROUP BY 1 ORDER BY 1;
\echo === H3 flows: state distribution, errors, expired, no consent
SELECT state, (consent_challenge_id IS NOT NULL) has_consent, consent_was_used, login_was_used, count(*) FROM hydra_oauth2_flow GROUP BY 1,2,3,4 ORDER BY 5 DESC;
SELECT count(*) FILTER (WHERE login_error IS NOT NULL AND login_error<>'{}') login_err, count(*) FILTER (WHERE consent_error IS NOT NULL AND consent_error<>'{}') consent_err, count(*) FILTER (WHERE expires_at<now()) expired, min(requested_at)::date oldest FROM hydra_oauth2_flow;
SELECT left(login_error,160), count(*) FROM hydra_oauth2_flow WHERE login_error IS NOT NULL AND login_error<>'{}' GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
SELECT left(consent_error,160), count(*) FROM hydra_oauth2_flow WHERE consent_error IS NOT NULL AND consent_error<>'{}' GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
\echo === H-flows per client / requested scope
SELECT client_id, requested_scope, count(*) FROM hydra_oauth2_flow GROUP BY 1,2 ORDER BY 3 DESC;
\echo === H4 flows whose login_session_id points to a missing session
SELECT count(*) FROM hydra_oauth2_flow f WHERE f.login_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hydra_oauth2_authentication_session s WHERE s.id=f.login_session_id);
\echo === H5 authentication sessions: expired, remember, per subject
SELECT remember, (expires_at<now()) expired, count(*) FROM hydra_oauth2_authentication_session GROUP BY 1,2;
SELECT n, count(*) FROM (SELECT subject, count(*) n FROM hydra_oauth2_authentication_session GROUP BY 1) x GROUP BY 1 ORDER BY 1;
\echo === H6 subjects not matching a Kratos identity (CSV join)
CREATE TEMP TABLE kr(id uuid, email text, state text, created_at timestamptz, verified text, creds text);
\copy kr FROM 'kratos-identities.csv' CSV
SELECT count(*) FROM kr;
SELECT 'auth_sessions' t, count(DISTINCT subject) subjects, count(DISTINCT subject) FILTER (WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=s.subject)) unmatched FROM hydra_oauth2_authentication_session s
UNION ALL SELECT 'access', count(DISTINCT subject), count(DISTINCT subject) FILTER (WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=a.subject)) FROM hydra_oauth2_access a
UNION ALL SELECT 'flows', count(DISTINCT subject), count(DISTINCT subject) FILTER (WHERE subject IS NOT NULL AND subject<>'' AND NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=f.subject)) FROM hydra_oauth2_flow f;
SELECT DISTINCT subject FROM hydra_oauth2_access a WHERE NOT EXISTS (SELECT 1 FROM kr WHERE kr.id::text=a.subject) LIMIT 10;
\echo === H7 active access tokens for inactive Kratos identities
SELECT count(*) FROM hydra_oauth2_access a JOIN kr ON kr.id::text=a.subject WHERE a.active AND a.expires_at>now() AND kr.state<>'active';
\echo === H8 logout requests
SELECT was_used, accepted, rejected, rp_initiated, count(*) FROM hydra_oauth2_logout_request GROUP BY 1,2,3,4;
\echo === H9 obfuscated sessions / jti blacklist / device codes / trusted issuers
SELECT (SELECT count(*) FROM hydra_oauth2_obfuscated_authentication_session) obf, (SELECT count(*) FROM hydra_oauth2_jti_blacklist) jti, (SELECT count(*) FROM hydra_oauth2_device_auth_codes) device, (SELECT count(*) FROM hydra_oauth2_trusted_jwt_bearer_issuer) trusted;
\echo === H10 JWKs
SELECT sid, kid, version, created_at, length(keydata) FROM hydra_jwk ORDER BY created_at;
\echo === H11 access tokens whose challenge flow is missing
SELECT count(*) FROM hydra_oauth2_access a WHERE a.challenge_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM hydra_oauth2_flow f WHERE f.consent_challenge_id=a.challenge_id);
\echo === H12 token audience / scope granted vs requested mismatch
SELECT count(*) FROM hydra_oauth2_access WHERE granted_scope<>scope;
SELECT granted_scope, count(*) FROM hydra_oauth2_access GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
