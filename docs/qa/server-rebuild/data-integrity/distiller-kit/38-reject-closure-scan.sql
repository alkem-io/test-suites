-- 38-reject-closure-scan.sql
--
-- ID CLOSURE SCAN over the reject set. Runs in the same psql session as
-- 30-architect-classifier-reconstruction.sql (it needs the temp table
-- "orphan"), so append it to that stream:
--   cat 30-architect-classifier-reconstruction.sql 38-reject-closure-scan.sql | psql -X -d alkemio [-v scope=profile,tagset]
--
-- Question it answers: does any row that is KEPT still name a row that is
-- REJECTED, by stored value? A foreign key answers that for declared
-- references only. This scan reads every uuid, character, text, json,
-- jsonb and array column and matches every dashed uuid it finds against
-- the ids of the rejected rows.
--
-- scope   optional, comma-separated orphan table names. Default: all.
-- Leaves  /tmp/closure-ids.txt (id|kinds) on the machine psql runs on, for
--         39-reject-closure-scan-side.sql (the other databases).
--
-- Not covered: bytea columns, ids written without dashes, Redis, the
-- search index, and whiteboard / memo bodies that live in file storage.
-- Tables named _% are migration backups rejected as a whole (A1); their
-- row ids are the ids of live entities, so they are not put in the id
-- list, and what they hold is reported apart.
\if :{?scope}
\else
\set scope all
\endif
\echo === closure scan (scope :scope)
DROP TABLE IF EXISTS scan_scope; DROP TABLE IF EXISTS ids; DROP TABLE IF EXISTS scan_hit;
CREATE TEMP TABLE scan_scope AS SELECT trim(x) AS tbl FROM unnest(string_to_array(:'scope', ',')) x;
CREATE TEMP TABLE ids (id text PRIMARY KEY, kinds text);
INSERT INTO ids SELECT lower(o.id), string_agg(DISTINCT o.tbl, ',' ORDER BY o.tbl) FROM orphan o
 WHERE o.tbl NOT LIKE '\_%' AND (EXISTS (SELECT 1 FROM scan_scope WHERE tbl='all') OR o.tbl IN (SELECT tbl FROM scan_scope))
 GROUP BY 1;
\echo --- closure scan: ids in the reject set, by table
SELECT kinds, count(*) FROM ids GROUP BY 1 ORDER BY 2 DESC;
SELECT count(*) AS total_ids FROM ids;
\copy ids to '/tmp/closure-ids.txt' with (format csv, delimiter '|')
CREATE TEMP TABLE scan_hit (holder_tbl text, col text, dt text, refs bigint, from_kept_rows bigint, rejected_kinds text);
DO $$ DECLARE r record; n bigint; nl bigint; k text; cols int := 0; has_id boolean; src text; t0 timestamptz := clock_timestamp(); BEGIN
 FOR r IN SELECT c.table_name t, c.column_name col, c.data_type dt FROM information_schema.columns c
            JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
           WHERE c.table_schema='public' AND c.data_type IN ('uuid','character','character varying','text','json','jsonb','ARRAY') ORDER BY 1,2 LOOP
  cols := cols + 1;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.t AND column_name='id') INTO has_id;
  IF r.dt='uuid' THEN
   src := format('select %s rid, lower(x.%I::text) u from public.%I x where x.%I is not null', CASE WHEN has_id THEN 'x.id::text' ELSE 'null::text' END, r.col, r.t, r.col);
  ELSE
   src := format('select %s rid, lower(m[1]) u from public.%I x, regexp_matches(x.%I::text, ''[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'',''g'') m where x.%I is not null', CASE WHEN has_id THEN 'x.id::text' ELSE 'null::text' END, r.t, r.col, r.col);
  END IF;
  -- a reference is "from a kept row" when the row holding it is not itself rejected
  EXECUTE format('select count(*), count(*) filter (where s.rid is null or not exists (select 1 from orphan q where q.tbl=%L and q.id=s.rid)), string_agg(distinct ids.kinds, '','' order by ids.kinds) from (%s) s join ids on ids.id=s.u where not (%L=''id'' and s.rid=s.u and exists (select 1 from orphan q where q.tbl=%L and q.id=s.rid))', r.t, src, r.col, r.t) INTO n, nl, k;
  IF n > 0 THEN INSERT INTO scan_hit VALUES (r.t, r.col, r.dt, n, nl, k); END IF;
 END LOOP;
 RAISE NOTICE 'closure scan: columns scanned %, seconds %', cols, round(extract(epoch FROM clock_timestamp()-t0));
END $$;
\echo --- closure scan VERDICT: references to rejected rows held by kept rows (expect 0; migration backup tables listed apart)
SELECT count(*) FILTER (WHERE from_kept_rows > 0 AND holder_tbl NOT LIKE '\_%') AS kept_columns_with_refs,
       coalesce(sum(from_kept_rows) FILTER (WHERE holder_tbl NOT LIKE '\_%'), 0) AS refs_from_kept_rows,
       count(*) FILTER (WHERE from_kept_rows > 0 AND holder_tbl LIKE '\_%') AS backup_table_columns_with_refs,
       coalesce(sum(from_kept_rows) FILTER (WHERE holder_tbl LIKE '\_%'), 0) AS refs_from_backup_tables,
       count(*) AS columns_with_any_ref FROM scan_hit;
\echo --- closure scan: kept rows that name a rejected row (each line needs a ruling)
SELECT holder_tbl, col, dt, refs, from_kept_rows, rejected_kinds FROM scan_hit WHERE from_kept_rows > 0 ORDER BY (holder_tbl LIKE '\_%'), from_kept_rows DESC, holder_tbl, col;
\echo --- closure scan: references held only by rejected rows (they leave together; deletion record)
SELECT holder_tbl, col, dt, refs, rejected_kinds FROM scan_hit WHERE from_kept_rows = 0 ORDER BY holder_tbl, col;
\echo === closure scan done
