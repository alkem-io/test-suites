-- 95-a1-policy-guard.sql: QA register A1, read from both places it lives in (2026-11-19). Reads only, counts only.
--   psql -d <alkemio_db> -X -f 95-a1-policy-guard.sql      (through 93-psql-live-acc.sh for live acceptance)
-- Line 1: the cause. Admin definitions of spaces that list a member credential (repair: 94-a1-repair.sql).
-- Line 2: the effect. Stored authorization policies in which a space-member credential grants "grant" or "delete".
--         The server writes such a rule only from a wrong admin definition, and children of the space inherit it.
-- Expected after the repair AND an authorization reset: every number 0. After the repair alone line 1 is 0 and
-- line 2 is unchanged: the fix is not in effect until the reset ran.
\pset footer off
\echo --- A1 P1 admin definitions of spaces listing a member credential (expect 0 after the repair; acceptance before: 147, 198)
SELECT count(DISTINCT r.id) AS admin_definitions_with_a_member_entry, count(*) AS member_entries
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" AND r.name::text='admin'
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-member';
\echo --- A1 P2 stored policies where a member credential grants grant or delete (expect 0 after the repair and the reset)
SELECT count(DISTINCT p.id) AS policies_where_a_member_credential_grants_grant_or_delete,
       count(DISTINCT p.id) FILTER (WHERE p.type='space') AS of_which_space_policies,
       count(DISTINCT (r->>'name')) AS rule_names
  FROM authorization_policy p CROSS JOIN LATERAL jsonb_array_elements(p."credentialRules"::jsonb) r
  CROSS JOIN LATERAL jsonb_array_elements(r->'criterias') c
 WHERE c->>'type'='space-member' AND (r->'grantedPrivileges' ? 'grant' OR r->'grantedPrivileges' ? 'delete');
