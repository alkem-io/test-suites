-- 40-owner-split.sql
--
-- DIRECT / DEPENDANT SPLIT of the reject set, by owner. Runs in the same
-- psql session as 30-architect-classifier-reconstruction.sql (it needs the
-- temp tables "orphan" and "edge"), so append it to that stream:
--   cat 30-architect-classifier-reconstruction.sql 40-owner-split.sql | psql -X -d alkemio
--
-- The architect writes the orphans of a table as "n + n". The first number
-- is the DIRECT orphans: the row has no owner at all. The second is the
-- DEPENDANTS: the owner exists but is itself rejected, so the row follows
-- it. This file answers two questions for every table:
--   1. which rule put each row in the reject set (one rule per row: the
--      first owner link that fired);
--   2. per owner link, how many rejected rows have a rejected owner on that
--      link, and how many have a row on that link that is KEPT. Every
--      link with a kept row needs a stated reason: a rejected row that a
--      kept owner still names is a wrong reject or a repair, never a
--      "follow the owner", unless the link is not an ownership link.
--      Reasons on the acceptance backup of 2026-11-11 (3 links, 1,158 rows):
--        credential -> actor (111): rule credential-scope-gone. The holder
--          stays, the thing the credential gave access to is gone.
--        storage_bucket -> storage_aggregator.storageAggregatorId (1,044):
--          the roll-up parent of the bucket, not its owner.
--        file -> storage_bucket (3): body files of 3 ownerless office
--          documents, each in the direct bucket of a live space. The
--          architect's classifier keeps these 3; this reconstruction lets
--          them follow the document. Open for a ruling at A6.
\echo === owner split
\pset pager off
\echo --- owner split 1: rejected rows per table, direct or dependant, by the rule that fired
SELECT tbl, CASE WHEN round=0 THEN 'direct' ELSE 'dependant' END AS kind, rule, count(*) AS n
  FROM orphan WHERE tbl NOT LIKE '\_%' GROUP BY 1,2,3 ORDER BY 1, 2 DESC, 4 DESC;

DROP TABLE IF EXISTS owner_split;
CREATE TEMP TABLE owner_split (child text, owner text, col text, kind text, with_rejected_owner bigint, with_kept_owner bigint);
DO $$
DECLARE e record; a bigint; b bigint;
BEGIN
  FOR e IN SELECT DISTINCT kind, child, col, owner FROM edge
            WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=edge.child) LOOP
    IF e.kind = 'fk' THEN
      EXECUTE format($q$SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=%L AND o.id=c.%I::text)),
                               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM %I p WHERE p.id=c.%I)
                                                  AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=%L AND o.id=c.%I::text))
                          FROM %I c JOIN orphan oc ON oc.tbl=%L AND oc.id=c.id::text WHERE c.%I IS NOT NULL$q$,
                     e.owner, e.col, e.owner, e.col, e.owner, e.col, e.child, e.child, e.col) INTO a, b;
    ELSE
      EXECUTE format($q$SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM %I p JOIN orphan o ON o.tbl=%L AND o.id=p.id::text WHERE p.%I=c.id)),
                               count(*) FILTER (WHERE EXISTS (SELECT 1 FROM %I p WHERE p.%I=c.id
                                                  AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl=%L AND o.id=p.id::text)))
                          FROM %I c JOIN orphan oc ON oc.tbl=%L AND oc.id=c.id::text$q$,
                     e.owner, e.owner, e.col, e.owner, e.col, e.owner, e.child, e.child) INTO a, b;
    END IF;
    IF a > 0 OR b > 0 THEN INSERT INTO owner_split VALUES (e.child, e.owner, e.col, e.kind, a, b); END IF;
  END LOOP;
END $$;
\echo --- owner split 2: rejected rows per owner link (a row with two owners is counted on both links)
SELECT child AS rejected_table, owner, col AS link_column, with_rejected_owner, with_kept_owner
  FROM owner_split ORDER BY 1, 4 DESC;
\echo --- owner split VERDICT: links on which a rejected row has a kept row at the other end (each needs a stated reason)
SELECT count(*) FILTER (WHERE with_kept_owner > 0) AS links_with_a_kept_owner, coalesce(sum(with_kept_owner),0) AS rows FROM owner_split;
\echo === owner split done
