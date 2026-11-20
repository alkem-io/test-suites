-- 123-subspace-visibility-guard.sql: subspace whose visibility differs from its top-level space (open row 6, 2026-11-20).
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 123-subspace-visibility-guard.sql
-- Repair: 122-subspace-visibility-repair.sql. Live cause in the server (#6788): a new subspace always starts active, a moved
-- one keeps its old value. Until that is fixed G1 can read above 0 again on new data: G3 shows whether they are new.
\pset footer off
CREATE TEMP TABLE g123 AS
SELECT s.level, s.visibility::text AS sub, t.visibility::text AS top, a."createdDate" AS made FROM space s JOIN space t ON t.id=s."levelZeroSpaceID" JOIN actor a ON a.id=s.id WHERE s.level>0;
\echo --- L123 G1 subspaces whose visibility differs from their top-level space (expect 0 after repair 122)
SELECT count(*) AS subspaces_that_differ FROM g123 WHERE sub<>top;
\echo --- L123 G2 the same, by what the subspace and the top-level space are (reads nothing after repair 122; a line with archived is for a person)
SELECT sub AS subspace_is, top AS top_level_is, 'L' || level AS level, count(*) AS subspaces FROM g123 WHERE sub<>top GROUP BY 1,2,3 ORDER BY 2,1,3;
\echo --- L123 G3 is it still being made: the same, by the month the subspace was made (reads nothing after repair 122)
SELECT to_char(made,'YYYY-MM') AS made_in, count(*) AS subspaces FROM g123 WHERE sub<>top GROUP BY 1 ORDER BY 1;
\echo --- L123 G4 subspaces per visibility of the top-level space (context)
SELECT top AS top_level_is, count(*) AS subspaces FROM g123 GROUP BY 1 ORDER BY 1;
