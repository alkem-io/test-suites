\pset footer off
\echo ===M whiteboards & memos
SELECT 'whiteboard content empty' AS chk, count(*) FROM whiteboard WHERE content IS NULL OR content='' OR content='{}'
UNION ALL SELECT 'whiteboard content not JSON', count(*) FROM whiteboard WHERE content<>'' AND content NOT LIKE '{%'
UNION ALL SELECT 'whiteboard content > 1 MB', count(*) FROM whiteboard WHERE length(content)>1048576
UNION ALL SELECT 'whiteboard createdBy deleted', count(*) FROM whiteboard w WHERE w."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=w."createdBy"::text)
UNION ALL SELECT 'whiteboard content references storage document missing', count(*) FROM (SELECT DISTINCT w.id, m[1] AS fid FROM whiteboard w, regexp_matches(w.content, '/storage/document/([0-9a-f-]{36})', 'g') m) x WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id::text=x.fid)
UNION ALL SELECT 'memo content empty', count(*) FROM memo WHERE content IS NULL OR content=''
UNION ALL SELECT 'memo createdBy deleted', count(*) FROM memo m WHERE m."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=m."createdBy"::text)
UNION ALL SELECT 'post createdBy deleted', count(*) FROM post p WHERE p."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=p."createdBy"::text)
UNION ALL SELECT 'discussion createdBy deleted', count(*) FROM discussion d WHERE d."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM actor a WHERE a.id::text=d."createdBy"::text);
