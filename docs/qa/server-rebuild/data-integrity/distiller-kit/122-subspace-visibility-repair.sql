-- 122-subspace-visibility-repair.sql: subspace whose visibility differs from its top-level space (open row 6), 2026-11-20.
-- Ruling of the QA lead 2026-11-20: repair and a guard. Guard: 123-subspace-visibility-guard.sql.
-- What is wrong: visibility (active, demo, inactive, archived) is set on the top-level space only; the server copies it
-- to every subspace at that moment (space.service.ts updateSpaceVisibilityAllSubspaces). A NEW space always starts
-- active (space.service.ts createSpace), also a subspace made under a demo or inactive top-level space, and a moved
-- subspace keeps the value of the place it came from. Effect: search indexing takes subspaces and their content by the
-- subspace's own visibility, so an active subspace of a demo or inactive space is in search while its space is not.
-- R0 stops when a case needs a person: the subspace or its top-level space is archived. The rules of an archived space
--    differ (space.service.authorization.ts), so that case needs an authorization reset and a look.
-- R1 gives every subspace the visibility of its top-level space: what the server's own copy writes.
-- Not touched: top-level spaces, every other column, every other table.
-- No authorization reset is needed: the rules treat active, demo and inactive alike.
-- After a run on an environment the search index is rebuilt by the usual ingest; this repair does not touch it.
-- touches: space
\set ON_ERROR_STOP on
\pset footer off
\echo === subspace visibility repair: image before
CREATE TEMP TABLE sv_space AS SELECT * FROM space;
CREATE TEMP TABLE sv_fix AS
SELECT s.id, s.level, s.visibility::text AS was, t.visibility::text AS top FROM space s JOIN space t ON t.id=s."levelZeroSpaceID" WHERE s.level>0 AND s.visibility<>t.visibility;
\echo === before: subspaces whose visibility differs from their top-level space
SELECT was AS subspace_is, top AS top_level_is, 'L' || level AS level, count(*) AS subspaces FROM sv_fix GROUP BY 1,2,3 ORDER BY 2,1,3;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM sv_fix WHERE was='archived' OR top='archived') THEN RAISE EXCEPTION 'a subspace or its top-level space is archived: needs a person and an authorization reset'; END IF;
  IF EXISTS (SELECT 1 FROM space s WHERE s.level>0 AND NOT EXISTS (SELECT 1 FROM space t WHERE t.id=s."levelZeroSpaceID" AND t.level=0)) THEN RAISE EXCEPTION 'a subspace names no top-level space'; END IF;
END $$;
\echo === R1: every subspace gets the visibility of its top-level space (acceptance of 11-11 after the repairs: UPDATE 11)
UPDATE space s SET visibility=t.visibility FROM space t, sv_fix f WHERE f.id=s.id AND t.id=s."levelZeroSpaceID";
\echo === check 1: the rule on the repaired state. Expected: 0
SELECT count(*) AS subspaces_that_differ FROM space s JOIN space t ON t.id=s."levelZeroSpaceID" WHERE s.level>0 AND s.visibility<>t.visibility;
\echo === check 2: only what was meant to change changed. Expected: rows changed = meant, only the visibility column, 0 top-level spaces changed, 0 gone, 0 added
SELECT (SELECT count(*) FROM sv_fix) AS meant,
       (SELECT count(*) FROM space n JOIN sv_space o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS rows_changed,
       (SELECT count(*) FROM space n JOIN sv_space o ON o.id=n.id WHERE to_jsonb(n)-'visibility' IS DISTINCT FROM to_jsonb(o)-'visibility') AS changed_in_another_column,
       (SELECT count(*) FROM space n JOIN sv_space o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o) AND n.level=0) AS top_level_changed,
       (SELECT count(*) FROM sv_space o WHERE NOT EXISTS (SELECT 1 FROM space n WHERE n.id=o.id)) AS rows_gone,
       (SELECT count(*) FROM space n WHERE NOT EXISTS (SELECT 1 FROM sv_space o WHERE o.id=n.id)) AS rows_added;
\echo === check 3: what changes for search (context): subspaces that leave the index (were active, now not) and that enter it (now active)
SELECT count(*) FILTER (WHERE was='active') AS leave_search, count(*) FILTER (WHERE top='active') AS enter_search FROM sv_fix;
\echo === subspace visibility repair done. No authorization reset needed.
