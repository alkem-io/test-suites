\pset footer off
-- tables with row counts (estimate), columns, fk constraints
SELECT c.relname AS table, c.reltuples::bigint AS est_rows FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1;
\echo ===COLUMNS
SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY 1,2;
\echo ===FKS
SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name
JOIN information_schema.referential_constraints rc ON rc.constraint_name=tc.constraint_name
WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' ORDER BY 1,2;
