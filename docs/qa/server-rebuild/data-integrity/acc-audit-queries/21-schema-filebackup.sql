\echo === tables with row estimates and sizes
SELECT n.nspname||'.'||c.relname AS tbl, c.reltuples::bigint est_rows, pg_size_pretty(pg_total_relation_size(c.oid)) size
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY pg_total_relation_size(c.oid) DESC;
\echo === columns
SELECT table_schema||'.'||table_name tbl, column_name, data_type, is_nullable FROM information_schema.columns
WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1, ordinal_position;
\echo === foreign keys
SELECT conrelid::regclass child, a.attname col, confrelid::regclass parent, confdeltype ON_DELETE
FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
WHERE contype='f' ORDER BY 1,2;
\echo === extensions
SELECT extname, extversion FROM pg_extension;
