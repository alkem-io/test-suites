-- Release 75 — migration verification (P11). Run against the app DB (`alkemio`) after `migration:run`.
-- Verified on the local release/75 stack 10.09; expected values in the trailing comments.
-- psql: docker exec -it <postgres-pod-or-container> psql -U <user> -d alkemio

-- 0. BEFORE migrate: long-running transactions that would block the FK DDL on memo/file
SELECT pid, now() - xact_start AS age, state, left(query, 80) AS query
FROM pg_stat_activity
WHERE state <> 'idle' AND xact_start < now() - interval '30s';
-- expect: 0 rows (or none touching memo/file)

-- 1. Exactly the three new migrations, most recent first
SELECT name FROM migrations_typeorm ORDER BY timestamp DESC LIMIT 3;
-- expect: BackfillMemoSigningEntitlement1788947200100
--         AddMemoSigningEntitlement1788947200000
--         CreateSigningAttempt1788609600000

-- 2. Total applied = 117 (release/74) + 3
SELECT count(*) FROM migrations_typeorm;
-- expect: 120  (more = drift, fewer = a migration did not run)

-- 3. signing_attempt table, enum with 5 values
SELECT to_regclass('public.signing_attempt') IS NOT NULL AS table_exists,
       (SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
         WHERE t.typname = 'signing_attempt_status_enum') AS enum_values;
-- expect: t | 5

-- 4. Its constraints: PK + 3 FKs (memo, file x2)
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'public.signing_attempt'::regclass ORDER BY conname;
-- expect: FK_signing_attempt_memoId | f
--         FK_signing_attempt_signedDocumentId | f
--         FK_signing_attempt_snapshotDocumentId | f
--         PK_signing_attempt | p

-- 5. Its indexes: 8 rows (PK, 5 IDX, 2 UQ)
SELECT indexname FROM pg_indexes WHERE tablename = 'signing_attempt' ORDER BY 1;
-- expect: IDX_signing_attempt_memo_status, IDX_signing_attempt_signedDocumentId,
--         IDX_signing_attempt_snapshotDocumentId, IDX_signing_attempt_status_createdDate,
--         IDX_signing_attempt_status_expiresAt, PK_signing_attempt,
--         UQ_signing_attempt_clientStateHash, UQ_signing_attempt_correlationId

-- 6. No attempts yet
SELECT count(*) FROM signing_attempt;
-- expect: 0

-- 7. License plan inserted once
SELECT name, enabled, "sortOrder", "licenseCredential", type, "requiresContactSupport", "isFree"
FROM license_plan WHERE name = 'SPACE_FEATURE_MEMO_SIGNING';
-- expect: 1 row: SPACE_FEATURE_MEMO_SIGNING | t | 110 | space-feature-memo-signing | space-feature-flag | t | t

-- 8. Credential rule appended to every license_policy, exactly once
SELECT lp.id, r->>'name' AS rule, r->'grantedEntitlements' AS granted
FROM license_policy lp, jsonb_array_elements(lp."credentialRules") r
WHERE r->>'credentialType' = 'space-feature-memo-signing';
-- expect: one row per license_policy: Space Memo Signing | [{"type": "space-flag-memo-signing", "limit": 1}]
SELECT count(*) AS policies_without_rule FROM license_policy lp
WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(lp."credentialRules") r
                  WHERE r->>'credentialType' = 'space-feature-memo-signing');
-- expect: 0

-- 9. Backfill: one disabled flag row per space and collaboration license
SELECT l.type AS license_type, le.enabled, le."limit", le."dataType", count(*)
FROM license_entitlement le JOIN license l ON l.id = le."licenseId"
WHERE le.type = 'space-flag-memo-signing'
GROUP BY 1, 2, 3, 4 ORDER BY 1;
-- expect: collaboration | f | 0 | flag | N   and   space | f | 0 | flag | M
-- where N and M equal:
SELECT type, count(*) FROM license WHERE type IN ('space', 'collaboration') GROUP BY 1;

-- 10. Nothing missed, nothing duplicated
SELECT l.type, count(*) AS licenses_missing_entitlement FROM license l
WHERE l.type IN ('space', 'collaboration')
  AND NOT EXISTS (SELECT 1 FROM license_entitlement le
                  WHERE le."licenseId" = l.id AND le.type = 'space-flag-memo-signing')
GROUP BY 1;
-- expect: 0 rows
SELECT "licenseId", count(*) FROM license_entitlement
WHERE type = 'space-flag-memo-signing' GROUP BY 1 HAVING count(*) > 1;
-- expect: 0 rows
