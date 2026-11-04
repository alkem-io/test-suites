\echo === W-migrations
SELECT * FROM schema_migrations;
\echo === W-access tokens
SELECT count(*) total, count(*) FILTER (WHERE expires_at<now()) expired, min(created_at), max(created_at) FROM access_tokens;
SELECT permissions, count(*) FROM access_tokens GROUP BY 1;
SELECT id, left(token,8)||'…' tok, file_id, actor_id, actor_name, permissions, expires_at, created_at FROM access_tokens ORDER BY created_at DESC LIMIT 10;
\echo === W-locks
SELECT count(*) total, count(*) FILTER (WHERE expires_at<now()) expired FROM locks;
SELECT * FROM locks ORDER BY created_at DESC LIMIT 10;
\echo === W-preview cache
SELECT count(*) FROM document_preview_cache;
SELECT * FROM document_preview_cache LIMIT 20;
\echo === W1 cross-check with alkemio files (CSV join)
CREATE TEMP TABLE alkf(id uuid, external_id text, size bigint, mime text, created timestamptz, created_by uuid, temp_loc bool, bucket uuid);
\copy alkf FROM 'alk-documents.csv' CSV
SELECT count(*) FROM alkf;
SELECT 'access_tokens.file_id' k, count(*) total, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM alkf WHERE alkf.id::text=t.file_id)) missing FROM access_tokens t
UNION ALL SELECT 'locks.file_id', count(*), count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM alkf WHERE alkf.id::text=l.file_id)) FROM locks l
UNION ALL SELECT 'preview.source', count(*), count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM alkf WHERE alkf.id::text=p.source_file_id)) FROM document_preview_cache p
UNION ALL SELECT 'preview.preview', count(*), count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM alkf WHERE alkf.id::text=p.preview_file_id)) FROM document_preview_cache p;
\echo === W2 preview cache stale (source updated after cache)
SELECT count(*) FROM document_preview_cache p JOIN alkf f ON f.id::text=p.source_file_id WHERE f.created > p.source_updated_date;
\echo === W3 actor ids in tokens that are not alkemio users
CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
SELECT count(*) FROM access_tokens t WHERE NOT EXISTS (SELECT 1 FROM alku WHERE alku.id::text=t.actor_id);
