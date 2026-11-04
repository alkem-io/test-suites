\echo === K-oidc config shape
SELECT jsonb_typeof(c.config), jsonb_typeof(c.config->'providers'), count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE t.name='oidc' GROUP BY 1,2;
SELECT left(c.config::text, 200) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE t.name='oidc' LIMIT 2;
\echo === K-oidc providers (object form)
SELECT p->>'provider' provider, count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id, jsonb_array_elements(CASE WHEN jsonb_typeof(c.config->'providers')='array' THEN c.config->'providers' ELSE '[]'::jsonb END) p WHERE t.name='oidc' GROUP BY 1;
\echo === K4b empty password creds: by combo and year
CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
SELECT combo, date_trunc('year', i.created_at)::date yr, count(*) FROM identities i JOIN identity_credentials pc ON pc.identity_id=i.id JOIN identity_credential_types pt ON pt.id=pc.identity_credential_type_id AND pt.name='password'
JOIN LATERAL (SELECT string_agg(t.name,'+' ORDER BY t.name) combo FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE c.identity_id=i.id) x ON true
WHERE coalesce(pc.config->>'hashed_password','')='' GROUP BY 1,2 ORDER BY 1,2;
\echo === K4c empty-password identities that are password-only (cannot log in at all) and their alkemio link
SELECT i.traits->>'email', i.created_at::date, (u.id IS NOT NULL) alk_user, u.service FROM identities i JOIN identity_credentials pc ON pc.identity_id=i.id JOIN identity_credential_types pt ON pt.id=pc.identity_credential_type_id AND pt.name='password' LEFT JOIN alku u ON u.auth_id=i.id
WHERE coalesce(pc.config->>'hashed_password','')='' AND NOT EXISTS (SELECT 1 FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE c.identity_id=i.id AND t.name<>'password') ORDER BY 2;
\echo === K5b oidc creds without identifier row
SELECT i.traits->>'email', i.created_at::date, left(c.config::text,120) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id JOIN identities i ON i.id=c.identity_id WHERE t.name='oidc' AND NOT EXISTS (SELECT 1 FROM identity_credential_identifiers ii WHERE ii.identity_credential_id=c.id);
\echo === K11b verified=true but status=sent
SELECT i.traits->>'email', v.created_at::date, v.updated_at::date, v.via FROM identity_verifiable_addresses v JOIN identities i ON i.id=v.identity_id WHERE v.verified AND v.status='sent' ORDER BY 2;
\echo === K21b identities with no metadata at all vs alkemio
SELECT i.traits->>'email', i.created_at::date, (u.id IS NOT NULL) alk_user FROM identities i LEFT JOIN alku u ON u.auth_id=i.id WHERE i.metadata_admin IS NULL AND i.metadata_public IS NULL ORDER BY 2;
\echo === K21c metadata samples
SELECT left(metadata_public::text,200), left(metadata_admin::text,200) FROM identities WHERE metadata_admin IS NOT NULL LIMIT 2;
SELECT left(metadata_public::text,200) FROM identities WHERE metadata_admin IS NULL AND metadata_public IS NOT NULL LIMIT 2;
\echo === K22b identities with missing name parts
SELECT i.traits->>'email', i.traits->'name', i.created_at::date FROM identities i WHERE coalesce(traits->'name'->>'first','')='' OR coalesce(traits->'name'->>'last','')='';
\echo === K13b sessions without devices by year
SELECT date_trunc('year', issued_at)::date yr, count(*) FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM session_devices d WHERE d.session_id=s.id) GROUP BY 1 ORDER BY 1;
\echo === K-login flows columns
SELECT column_name FROM information_schema.columns WHERE table_name='selfservice_login_flows' ORDER BY ordinal_position;
SELECT type, requested_aal, count(*) FROM selfservice_login_flows GROUP BY 1,2 ORDER BY 3 DESC;
\echo === K18b courier recipients not an identity: are they (ex-)alkemio users?
SELECT (EXISTS (SELECT 1 FROM alku u WHERE lower(u.email)=lower(m.recipient))) alk_user, m.template_type, count(*), min(m.created_at)::date, max(m.created_at)::date FROM courier_messages m WHERE NOT EXISTS (SELECT 1 FROM identities i WHERE lower(i.traits->>'email')=lower(m.recipient)) GROUP BY 1,2 ORDER BY 1,2;
\echo === K17b failed dispatches: error + month
SELECT date_trunc('month', d.created_at)::date m, left(d.error::text,120), count(*) FROM courier_message_dispatches d WHERE d.status='failed' GROUP BY 1,2 ORDER BY 1;
\echo === K20b selfservice errors by month for the oidc-service / provider-403 classes
SELECT date_trunc('month', created_at)::date m,
 count(*) FILTER (WHERE errors::text LIKE '%oidc-service:8080%') oidc_webhook,
 count(*) FILTER (WHERE errors::text LIKE '%Unable to initialize OpenID Connect Provider%') provider_403,
 count(*) FILTER (WHERE errors::text LIKE '%security_csrf_violation%') csrf,
 count(*) total FROM selfservice_errors GROUP BY 1 ORDER BY 1;
\echo === K-identities vs alkemio: identity email differs from alkemio email for the same auth id
SELECT count(*) FROM identities i JOIN alku u ON u.auth_id=i.id WHERE lower(i.traits->>'email')<>lower(u.email);
\echo === K-picture trait vs alkemio
SELECT i.traits->>'email', left(i.traits->>'picture',60) FROM identities i WHERE i.traits ? 'picture';
