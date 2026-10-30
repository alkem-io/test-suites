\pset footer off
\echo ===I leftover / housekeeping tables
SELECT 'backup table: '||relname AS chk, n_live_tup::text AS rows FROM pg_stat_user_tables WHERE relname LIKE '\_%' ORDER BY 1;
\echo ===I migrations head
SELECT id, timestamp, name FROM migrations_typeorm ORDER BY id DESC LIMIT 8;
\echo ===I query-result-cache
SELECT count(*) AS cache_rows, pg_size_pretty(pg_total_relation_size('"query-result-cache"')) AS size FROM "query-result-cache";
\echo ===I db size + biggest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size, n_live_tup, n_dead_tup FROM pg_stat_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 12;
\echo ===I activity whose resource is gone (sample of types)
SELECT type, count(*) AS total, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM space s WHERE s.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM callout c WHERE c.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM post p WHERE p.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM calendar_event e WHERE e.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM actor x WHERE x.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM link l WHERE l.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM memo m WHERE m.id=a."resourceID"::uuid) AND NOT EXISTS (SELECT 1 FROM room r WHERE r.id=a."resourceID"::uuid)) AS resource_missing
FROM activity a GROUP BY 1 ORDER BY 3 DESC;
