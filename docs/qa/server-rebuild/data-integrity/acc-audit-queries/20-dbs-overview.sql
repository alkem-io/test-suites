\echo === databases
SELECT datname, pg_size_pretty(pg_database_size(datname)) size FROM pg_database WHERE NOT datistemplate ORDER BY pg_database_size(datname) DESC;
\echo === roles
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY 1;
\echo === replication
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn, sync_state FROM pg_stat_replication;
SELECT slot_name, slot_type, active, restart_lsn FROM pg_replication_slots;
\echo === settings of interest
SELECT name, setting FROM pg_settings WHERE name IN ('server_version','max_connections','wal_level','archive_mode','shared_buffers','work_mem','autovacuum','log_min_duration_statement','password_encryption');
\echo === hba (if readable)
SELECT type, database, user_name, address, auth_method FROM pg_hba_file_rules ORDER BY line_number;
\echo === connections per db
SELECT datname, usename, state, count(*) FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 1,2,3;
