\echo === K-migration
SELECT max(version) FROM schema_migration;
\echo === K-networks
SELECT count(*) nets FROM networks; SELECT count(DISTINCT nid) nids_in_identities FROM identities;
\echo === K-identities by state/schema
SELECT state, schema_id, count(*) FROM identities GROUP BY 1,2 ORDER BY 3 DESC;
\echo === K-identities per year
SELECT date_trunc('year', created_at)::date yr, count(*) FROM identities GROUP BY 1 ORDER BY 1;
\echo === K-traits keys
SELECT k, count(*) FROM identities, jsonb_object_keys(traits) k GROUP BY 1 ORDER BY 2 DESC;
\echo === K1 identities with no/blank email trait
SELECT count(*) FROM identities WHERE coalesce(traits->>'email','')='';
\echo === K2 duplicate emails (case-insensitive)
SELECT lower(traits->>'email') e, count(*) FROM identities GROUP BY 1 HAVING count(*)>1;
\echo === K3 identities without any credential
SELECT count(*) FROM identities i WHERE NOT EXISTS (SELECT 1 FROM identity_credentials c WHERE c.identity_id=i.id);
\echo === K-credential type distribution
SELECT t.name, count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id GROUP BY 1 ORDER BY 2 DESC;
\echo === K-identities by credential combination
SELECT combo, count(*) FROM (SELECT i.id, string_agg(t.name, '+' ORDER BY t.name) combo FROM identities i JOIN identity_credentials c ON c.identity_id=i.id JOIN identity_credential_types t ON t.id=c.identity_credential_type_id GROUP BY i.id) x GROUP BY 1 ORDER BY 2 DESC;
\echo === K4 password credentials with empty config (no hash)
SELECT count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE t.name='password' AND coalesce(c.config->>'hashed_password','')='';
\echo === K-password hash algorithms
SELECT substring(c.config->>'hashed_password' from '^\$[a-z0-9-]+') alg, count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE t.name='password' GROUP BY 1;
\echo === K-oidc providers
SELECT p->>'provider' provider, count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id, jsonb_array_elements(c.config->'providers') p WHERE t.name='oidc' GROUP BY 1;
\echo === K5 credentials without identifier row
SELECT t.name, count(*) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE NOT EXISTS (SELECT 1 FROM identity_credential_identifiers ii WHERE ii.identity_credential_id=c.id) GROUP BY 1;
\echo === K6 identifier != email trait (password creds)
SELECT count(*) FROM identity_credential_identifiers ii JOIN identity_credentials c ON c.id=ii.identity_credential_id JOIN identity_credential_types t ON t.id=c.identity_credential_type_id JOIN identities i ON i.id=ii.identity_id WHERE t.name='password' AND lower(ii.identifier)<>lower(i.traits->>'email');
\echo === K7 duplicate identifiers across identities
SELECT lower(identifier), count(DISTINCT identity_id) FROM identity_credential_identifiers GROUP BY 1 HAVING count(DISTINCT identity_id)>1;
\echo === K8 verifiable addresses per identity (0 or >1)
SELECT n, count(*) FROM (SELECT i.id, count(v.id) n FROM identities i LEFT JOIN identity_verifiable_addresses v ON v.identity_id=i.id GROUP BY i.id) x GROUP BY 1 ORDER BY 1;
\echo === K9 verifiable address value != email trait
SELECT count(*) FROM identity_verifiable_addresses v JOIN identities i ON i.id=v.identity_id WHERE lower(v.value)<>lower(i.traits->>'email');
\echo === K10 recovery addresses per identity / mismatch
SELECT n, count(*) FROM (SELECT i.id, count(r.id) n FROM identities i LEFT JOIN identity_recovery_addresses r ON r.identity_id=i.id GROUP BY i.id) x GROUP BY 1 ORDER BY 1;
SELECT count(*) FROM identity_recovery_addresses r JOIN identities i ON i.id=r.identity_id WHERE lower(r.value)<>lower(i.traits->>'email');
\echo === K11 unverified addresses by status / age
SELECT verified, status, date_trunc('year', created_at)::date yr, count(*) FROM identity_verifiable_addresses GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === K12 sessions: active/expired, by identity state
SELECT s.active, (s.expires_at<now()) expired, i.state, count(*) FROM sessions s JOIN identities i ON i.id=s.identity_id GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === K13 sessions without device rows
SELECT count(*) FROM sessions s WHERE NOT EXISTS (SELECT 1 FROM session_devices d WHERE d.session_id=s.id);
\echo === K14 active unexpired sessions per identity (top)
SELECT i.traits->>'email', count(*) FROM sessions s JOIN identities i ON i.id=s.identity_id WHERE s.active AND s.expires_at>now() GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === K-sessions age
SELECT date_trunc('month', issued_at)::date m, count(*) FROM sessions GROUP BY 1 ORDER BY 1;
\echo === K15 self-service flows: expired rows still stored (cleanup job)
SELECT 'login' f, count(*) total, count(*) FILTER (WHERE expires_at<now()) expired, min(created_at)::date oldest FROM selfservice_login_flows
UNION ALL SELECT 'registration', count(*), count(*) FILTER (WHERE expires_at<now()), min(created_at)::date FROM selfservice_registration_flows
UNION ALL SELECT 'verification', count(*), count(*) FILTER (WHERE expires_at<now()), min(created_at)::date FROM selfservice_verification_flows
UNION ALL SELECT 'settings', count(*), count(*) FILTER (WHERE expires_at<now()), min(created_at)::date FROM selfservice_settings_flows
UNION ALL SELECT 'recovery', count(*), count(*) FILTER (WHERE expires_at<now()), min(created_at)::date FROM selfservice_recovery_flows
UNION ALL SELECT 'continuity', count(*), count(*) FILTER (WHERE expires_at<now()), min(created_at)::date FROM continuity_containers
UNION ALL SELECT 'errors', count(*), NULL, min(created_at)::date FROM selfservice_errors;
\echo === K-login flows per month (volume)
SELECT date_trunc('month', created_at)::date m, count(*) FROM selfservice_login_flows GROUP BY 1 ORDER BY 1;
\echo === K-login flows by type / requested_aal / refresh
SELECT type, requested_aal, refresh, count(*) FROM selfservice_login_flows GROUP BY 1,2,3 ORDER BY 4 DESC;
\echo === K16 courier messages by status/type
SELECT status, type, template_type, count(*), max(created_at)::date last FROM courier_messages GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === K17 courier dispatches by status
SELECT status, count(*), max(created_at)::date FROM courier_message_dispatches GROUP BY 1;
\echo === K18 courier messages recipient not an identity email
SELECT count(*) FROM courier_messages m WHERE NOT EXISTS (SELECT 1 FROM identities i WHERE lower(i.traits->>'email')=lower(m.recipient));
\echo === K19 verification/recovery tokens & codes unexpired-unused
SELECT 'verif_tokens' t, count(*) FILTER (WHERE NOT used AND expires_at>now()) live, count(*) total FROM identity_verification_tokens
UNION ALL SELECT 'recov_tokens', count(*) FILTER (WHERE NOT used AND expires_at>now()), count(*) FROM identity_recovery_tokens
UNION ALL SELECT 'verif_codes', count(*) FILTER (WHERE used_at IS NULL AND expires_at>now()), count(*) FROM identity_verification_codes
UNION ALL SELECT 'recov_codes', count(*) FILTER (WHERE used_at IS NULL AND expires_at>now()), count(*) FROM identity_recovery_codes;
\echo === K20 selfservice_errors sample messages
SELECT left(errors::text, 160), count(*) FROM selfservice_errors GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
\echo === K21 metadata_admin / metadata_public usage
SELECT (metadata_admin IS NOT NULL) has_admin, (metadata_public IS NOT NULL) has_public, count(*) FROM identities GROUP BY 1,2;
\echo === K22 traits accepted_terms / name missing
SELECT coalesce(traits->>'accepted_terms','<null>') accepted, count(*) FROM identities GROUP BY 1;
SELECT count(*) FROM identities WHERE coalesce(traits->'name'->>'first','')='' OR coalesce(traits->'name'->>'last','')='';
\echo === K23 inactive identities with active sessions
SELECT count(*) FROM sessions s JOIN identities i ON i.id=s.identity_id WHERE i.state<>'active' AND s.active AND s.expires_at>now();
\echo === K24 identities with available_aal / organization fields
SELECT available_aal, count(*) FROM identities GROUP BY 1;
