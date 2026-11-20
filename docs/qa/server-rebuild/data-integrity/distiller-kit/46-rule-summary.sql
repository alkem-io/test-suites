-- 46-rule-summary.sql: one line per classifier rule, for a before/after comparison.
-- Needs the temp tables orphan and heritage of script 30 in the same session.
\pset format unaligned
\pset footer off
\echo === rule summary (class|table|rule|rows)
SELECT 'heritage' cls, tbl, rule, count(*) n FROM heritage GROUP BY 2,3
UNION ALL SELECT 'orphan', tbl, rule, count(*) FROM orphan GROUP BY 2,3
ORDER BY 1,2,3;
\echo === rule summary done
\pset format aligned
