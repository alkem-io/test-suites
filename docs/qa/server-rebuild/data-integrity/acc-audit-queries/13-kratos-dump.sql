\pset footer off
\copy (SELECT i.id, lower(coalesce(i.traits->>'email','')) AS email, i.state, i.created_at, (SELECT bool_or(v.verified) FROM identity_verifiable_addresses v WHERE v.identity_id=i.id) AS verified, (SELECT string_agg(ct.name, ',') FROM identity_credentials c JOIN identity_credential_types ct ON ct.id=c.identity_credential_type_id WHERE c.identity_id=i.id) AS cred_types FROM identities i) TO 'kratos-identities.csv' WITH CSV HEADER
SELECT count(*) AS identities, count(*) FILTER (WHERE state<>'active') AS inactive FROM identities;
SELECT lower(traits->>'email') e, count(*) FROM identities GROUP BY 1 HAVING count(*)>1 ORDER BY 2 DESC LIMIT 10;
