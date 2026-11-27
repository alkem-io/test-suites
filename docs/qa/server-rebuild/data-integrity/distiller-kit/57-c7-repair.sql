-- 57-c7-repair.sql: the C7 repair as QA proposes it (2026-11-13). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- What a handle is: the short name of a row that the platform puts into its web address
-- (column "nameID"). A callout opens at <address of its space>/collaboration/<handle>.
-- What this file repairs: a callout that has no handle at all (empty or missing). No address
-- can be formed for it, so no working address can break. Guard C7 G12 lists the population.
-- The row is also part of finding B1 (rule callout-empty-nameid, guard B1 G2), where the ruling
-- is "repair". This file is the repair step for it, written to the repair check standard.
-- What this file does not touch: every other handle. Handles with a hyphen at an edge or
-- two hyphens in a row, handles on restricted words and handles that two rows share all
-- work today and are kept as they are (findings C7, B1, B2).
-- How the new handle is built: the way the server builds one when a callout is made
-- (server develop 39d7aff38, 2026-11-10):
--   callouts.set.service.ts:334-351  no handle given: the handle comes from the title of the callout
--   generate.name.id.ts:4-17         keep letters, digits and hyphens, lower case, at least 5
--                                    and at most 25 characters
--   naming.service.ts:225-239        when the handle is taken in the same callout set, add -1, -2, ...
-- Two differences, both on purpose:
--   1. a title that leaves fewer than 5 characters is filled up from the id of the row, not
--      with random characters, so that the repair gives the same result on every run;
--   2. a hyphen at an edge and a run of hyphens are removed, so that the new handle also
--      passes the stricter rule the new server is said to apply (lowercase letters, digits,
--      single hyphens). Letters with accents are dropped, the server would map them to plain letters.
-- The new handle is never printed: it comes from a title. The checks print counts only.
-- On the acceptance copy of 2026-11-11 the one callout has a title of 4 characters, none of
-- them a letter of any script or a digit, so its handle is 5 characters of its own id
-- (check 4, built_from_the_id_alone). The server would have filled in 5 random characters.
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: callout
\set ON_ERROR_STOP on
\pset footer off
\echo === C7 repair: image of callout before the repair
CREATE TEMP TABLE rp_callout AS SELECT * FROM callout;
CREATE INDEX ON rp_callout (id); ANALYZE rp_callout;
CREATE TEMP TABLE rp_target AS SELECT c.id, c."calloutsSetId" AS set_id FROM callout c WHERE c."nameID" IS NULL OR c."nameID"='';

\echo === R1: every callout with no handle gets one, built from its title the way the server builds it, unique in its callout set (expected on acceptance: 1 callout)
DO $$
DECLARE t record; base text; cand text; i int;
BEGIN
  FOR t IN SELECT g.id, g.set_id, pr."displayName" AS title FROM rp_target g JOIN callout c ON c.id=g.id
             LEFT JOIN callout_framing f ON f.id=c."framingId" LEFT JOIN profile pr ON pr.id=f."profileId" ORDER BY g.id LOOP
    base := lower(regexp_replace(coalesce(t.title, ''), '[^a-zA-Z0-9-]', '', 'g'));
    base := btrim(regexp_replace(base, '-{2,}', '-', 'g'), '-');
    IF length(base) < 5 THEN base := base || left(replace(t.id::text, '-', ''), 5 - length(base)); END IF;
    base := rtrim(left(base, 25), '-');
    cand := base; i := 1;
    WHILE EXISTS (SELECT 1 FROM callout x WHERE x."calloutsSetId" IS NOT DISTINCT FROM t.set_id AND lower(x."nameID") = cand AND x.id <> t.id) LOOP
      cand := base || '-' || i::text; i := i + 1;
    END LOOP;
    UPDATE callout SET "nameID" = cand WHERE id = t.id;
  END LOOP;
END $$;

\echo === check 1: the rule on the repaired state. Expected: callouts_with_no_handle 0
SELECT count(*) FILTER (WHERE c."nameID" IS NULL OR c."nameID"='') AS callouts_with_no_handle, (SELECT count(*) FROM rp_target) AS callouts_repaired FROM callout c;

\echo === check 2: which columns of callout changed (expected: one line, nameID, 1 row on acceptance. Any other line is a fault)
SELECT k.key AS col, count(*) AS changed_rows FROM rp_callout a JOIN callout b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1 ORDER BY 1;

\echo === check 3: callouts gone, callouts new, and callouts that changed without being a target (expected: 0, 0, 0)
SELECT (SELECT count(*) FROM rp_callout a WHERE NOT EXISTS (SELECT 1 FROM callout b WHERE b.id=a.id)) AS gone,
       (SELECT count(*) FROM callout b WHERE NOT EXISTS (SELECT 1 FROM rp_callout a WHERE a.id=b.id)) AS new_callouts,
       (SELECT count(*) FROM rp_callout a JOIN callout b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND NOT EXISTS (SELECT 1 FROM rp_target g WHERE g.id=a.id)) AS changed_without_being_a_target;

\echo === check 4: every new handle against the rules. Expected: repaired = passes_new_rule = passes_current_server_rule = length_5_to_25 = alone_in_its_set, and the last two columns 0
SELECT count(*) AS repaired,
       count(*) FILTER (WHERE b."nameID" ~ '^[a-z0-9]+(-[a-z0-9]+)*$') AS passes_new_rule,
       count(*) FILTER (WHERE b."nameID" ~ '^[a-zA-Z0-9-]+$' AND length(b."nameID") BETWEEN 3 AND 28) AS passes_current_server_rule,
       count(*) FILTER (WHERE length(b."nameID") BETWEEN 5 AND 25) AS length_5_to_25,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM callout x WHERE x."calloutsSetId" IS NOT DISTINCT FROM b."calloutsSetId" AND lower(x."nameID")=lower(b."nameID") AND x.id<>b.id)) AS alone_in_its_set,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM collaboration co JOIN space p ON p."collaborationId"=co.id JOIN space s ON s."parentSpaceId"=p.id JOIN actor a ON a.id=s.id
                                       WHERE co."calloutsSetId"=b."calloutsSetId" AND lower(a."nameID")=lower(b."nameID"))) AS same_as_a_subspace_of_its_space,
       count(*) FILTER (WHERE b."nameID" ~ '^[0-9a-f]{5}$') AS built_from_the_id_alone
  FROM rp_target g JOIN callout b ON b.id=g.id;

\echo === check 5: shape. The repaired handles against the handles of the callouts the repair did not touch (expected: the repaired lengths lie inside the untouched range, and both lines show only the same kind of characters)
SELECT CASE WHEN g.id IS NULL THEN 'untouched' ELSE 'repaired' END AS callouts, count(*) AS n, min(length(b."nameID")) AS shortest, max(length(b."nameID")) AS longest,
       count(*) FILTER (WHERE b."nameID" ~ '^[a-z0-9-]+$') AS lowercase_letters_digits_hyphens_only, count(*) FILTER (WHERE b."nameID" ~ '-[0-9]+$') AS ends_in_a_number_suffix
  FROM callout b LEFT JOIN rp_target g ON g.id=b.id GROUP BY 1 ORDER BY 1;

\echo === check 6: the address of each repaired callout now exists once (expected: repaired_in_a_space = address_held_by_one_row; repaired callouts in a template have no address of their own)
WITH sp AS (SELECT s."collaborationId" AS collab, CASE s.level WHEN 0 THEN '/'||lower(a."nameID") ELSE '/'||lower(a0."nameID")||'/sub/'||lower(a."nameID") END AS k
              FROM space s JOIN actor a ON a.id=s.id LEFT JOIN actor a0 ON a0.id=s."levelZeroSpaceID"),
     ad AS (SELECT c.id, sp.k||'/collaboration/'||lower(c."nameID") AS k FROM sp JOIN collaboration co ON co.id=sp.collab JOIN callout c ON c."calloutsSetId"=co."calloutsSetId")
SELECT (SELECT count(*) FROM rp_target) AS repaired, count(*) AS repaired_in_a_space,
       count(*) FILTER (WHERE (SELECT count(*) FROM ad x WHERE x.k=ad.k)=1) AS address_held_by_one_row
  FROM ad JOIN rp_target g ON g.id=ad.id;

\echo === check 7: nothing stored pointed at the address with no handle, so no stored link needs a rewrite (expected: 0 and 0)
SELECT (SELECT count(*) FROM reference WHERE uri ~* 'alkem\.io/.*/collaboration/?$') + (SELECT count(*) FROM link WHERE uri ~* 'alkem\.io/.*/collaboration/?$') AS links_and_references,
       (SELECT count(*) FROM profile WHERE description ~* 'alkem\.io/[^ ")<]*/collaboration/?[ ")<]') AS profile_texts;
\echo === C7 repair done
