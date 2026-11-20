-- 60-b1-repair.sql: the phase tag part of the B1 repair as QA proposes it (2026-11-16). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- What a phase tag is: every callout in a space or in a space template carries one tag set named
-- flow-state with one value, the name of a phase (tab) of the flow of that space. The pages show a
-- callout on the tab whose name equals that value. A value that is no phase name puts the callout
-- on no tab.
-- What this file repairs: the phase tags that are no phase of their flow at all (truly_unmatched of
-- guard B1 G13; 10 on the acceptance copy of 2026-11-11, in 5 flows).
-- What this file never touches:
--   * a tag that equals a phase name when it is read whole. Those sit on a phase with a comma in its
--     name (finding B4). QA lead, 2026-11-13: the space admins rename those phases and are informed
--     (tracked case T8). 2 on acceptance. Check 1 proves they are byte for byte as they were.
--   * the list of allowed values and the default value of a flow, the phases, the current phase.
--   * the callout with no handle (57-c7-repair.sql) and every other part of B1.
-- Target state, read from the server (develop 39d7aff38, 2026-11-10):
--   callouts.set.service.ts:738-768   a tab shows the callouts whose flow-state value equals the phase
--                                     name, compared without regard to case
--   innovation.flow.service.ts:514-569 and 571-612 (updateInnovationFlowStates, updateFlowStatesTagsetTemplate)
--   innovation.flow.service.ts:303-336 (rename of one phase)
--   tagset.service.ts:205-235 (updateTagsetsSelectedValue)
--                                     when the phases of a flow change, every phase tag that is no
--                                     phase any more is set to the name of the CURRENT phase of the
--                                     flow, and to the first phase only when there is no current one
--   tagset.template.utils.ts:88-99 (matchAllowedValue) and migration 1742475072830-dataCoherency
--   (2025-03-21, server PR 5041)      a value that differs from a phase name only in case is set to
--                                     the spelling of that phase; the 2025 clean-up set every other
--                                     wrong value to the current phase
-- So the new value is: the phase that matches when case is ignored, when there is exactly one;
-- otherwise the name of the current phase of the flow; the first phase when the flow has no valid
-- current phase. Only tagset.tags is written. The version counter and the update date are left as
-- they are (the server would raise both), so a repaired row can still be told from a row a user moved.
-- The other possible repairs and why this one: see the B1 section of the kit README.
-- Stops (R0): the file raises an error and changes nothing when a target needs a human:
--   a target tag with a comma in it, a target flow with no phase, a new value with a comma in it,
--   a callout with more than one phase tag set, a target that is not of the type select-one.
-- Counts are acceptance counts on the copy of 2026-11-11. Phase names are never printed.
-- touches: tagset
\set ON_ERROR_STOP on
\pset footer off
\echo === B1 phase tag repair: image of tagset before the repair
CREATE TEMP TABLE rp_b1_tagset AS SELECT * FROM tagset;
CREATE INDEX ON rp_b1_tagset (id); ANALYZE rp_b1_tagset;
-- every phase tag of a callout in a flow, with its flow
CREATE TEMP TABLE rp_b1_fs AS
  SELECT t.id AS tid, c.id AS cid, co.id AS coid, co."isTemplate" AS in_template, f.id AS fid, f."currentStateID" AS cur,
         f."flowStatesTagsetTemplateId" AS ttid, t.tags AS old_tag, t.type AS ttype
    FROM tagset t JOIN classification cl ON cl.id=t."classificationId" JOIN callout c ON c."classificationId"=cl.id
    JOIN collaboration co ON co."calloutsSetId"=c."calloutsSetId" JOIN innovation_flow f ON f.id=co."innovationFlowId"
   WHERE t.name='flow-state';
CREATE INDEX ON rp_b1_fs (tid); ANALYZE rp_b1_fs;
-- the targets: no phase when the tag is split at commas (the rule) and no phase when it is read whole (not T8)
CREATE TEMP TABLE rp_b1_target AS
  SELECT x.*,
         (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid) AS phases,
         (SELECT s."displayName" FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s.id=x.cur) AS current_name,
         (SELECT s."displayName" FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid ORDER BY s."sortOrder", s.id LIMIT 1) AS first_name,
         (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND lower(s."displayName")=lower(x.old_tag)) AS case_matches,
         (SELECT min(s."displayName") FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND lower(s."displayName")=lower(x.old_tag)) AS case_name,
         NULL::text AS new_tag, NULL::text AS chosen_by
    FROM rp_b1_fs x
   WHERE x.old_tag IS NOT NULL AND x.old_tag<>''
     AND EXISTS (SELECT 1 FROM unnest(string_to_array(x.old_tag, ',')) tg WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=tg))
     AND NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=x.old_tag);
UPDATE rp_b1_target SET new_tag = CASE WHEN case_matches=1 THEN case_name ELSE coalesce(current_name, first_name) END,
                        chosen_by = CASE WHEN case_matches=1 THEN 'same name, other case' WHEN current_name IS NOT NULL THEN 'current phase' ELSE 'first phase, no current phase' END;
-- the tags on a comma named phase (T8), kept to prove they do not move
CREATE TEMP TABLE rp_b1_t8 AS
  SELECT x.tid FROM rp_b1_fs x
   WHERE x.old_tag LIKE '%,%' AND EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=x.old_tag);

\echo === R0: stops. Each line must read 0, or the file raises an error and changes nothing
SELECT (SELECT count(*) FROM rp_b1_target WHERE old_tag LIKE '%,%') AS target_tag_with_a_comma,
       (SELECT count(*) FROM rp_b1_target WHERE phases=0 OR new_tag IS NULL) AS target_flow_with_no_phase,
       (SELECT count(*) FROM rp_b1_target WHERE new_tag LIKE '%,%') AS new_value_with_a_comma,
       (SELECT count(*) FROM rp_b1_target WHERE ttype<>'select-one') AS target_not_select_one,
       (SELECT count(*) FROM (SELECT cid FROM rp_b1_fs GROUP BY cid HAVING count(*)>1) z) AS callouts_with_more_than_one_phase_tag_set,
       (SELECT count(*) FROM rp_b1_target g JOIN rp_b1_t8 k ON k.tid=g.tid) AS targets_that_are_also_T8;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM rp_b1_target WHERE old_tag LIKE '%,%') THEN RAISE EXCEPTION 'B1 repair stop: a target tag holds a comma. Read it by hand, it may belong to a comma named phase (T8)'; END IF;
  IF EXISTS (SELECT 1 FROM rp_b1_target WHERE phases=0 OR new_tag IS NULL) THEN RAISE EXCEPTION 'B1 repair stop: a target flow has no phase to move the callout to'; END IF;
  IF EXISTS (SELECT 1 FROM rp_b1_target WHERE new_tag LIKE '%,%') THEN RAISE EXCEPTION 'B1 repair stop: the new value would hold a comma (the current phase has a comma in its name). The phase must be renamed first (T8)'; END IF;
  IF EXISTS (SELECT 1 FROM rp_b1_target WHERE ttype<>'select-one') THEN RAISE EXCEPTION 'B1 repair stop: a target phase tag set is not of the type select-one'; END IF;
  IF EXISTS (SELECT 1 FROM rp_b1_fs GROUP BY cid HAVING count(*)>1) THEN RAISE EXCEPTION 'B1 repair stop: a callout has more than one phase tag set. That is the duplicate tag set part of B1 and must be repaired first'; END IF;
  IF EXISTS (SELECT 1 FROM rp_b1_target g JOIN rp_b1_t8 k ON k.tid=g.tid) THEN RAISE EXCEPTION 'B1 repair stop: a target is also a T8 row'; END IF;
END $$;

\echo === R1: every phase tag that is no phase of its flow is set to the current phase of the flow (expected on acceptance: 10 tags in 5 flows)
UPDATE tagset t SET tags = g.new_tag FROM rp_b1_target g WHERE t.id = g.tid;

\echo === check 1: the rule on the repaired state. Expected: truly_unmatched 0, and on_a_comma_named_phase_T8 the same before and after with 0 of them changed (2, 2, 0 on acceptance)
SELECT (SELECT count(*) FROM rp_b1_target) AS repaired,
       (SELECT count(*) FROM rp_b1_fs x JOIN tagset t ON t.id=x.tid
         WHERE EXISTS (SELECT 1 FROM unnest(string_to_array(t.tags, ',')) tg WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=tg))
           AND NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=t.tags)) AS truly_unmatched,
       (SELECT count(*) FROM rp_b1_t8) AS on_a_comma_named_phase_t8_before,
       (SELECT count(*) FROM rp_b1_fs x JOIN tagset t ON t.id=x.tid
         WHERE t.tags LIKE '%,%' AND EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=t.tags)) AS on_a_comma_named_phase_t8_after,
       (SELECT count(*) FROM rp_b1_t8 k JOIN rp_b1_tagset a ON a.id=k.tid JOIN tagset b ON b.id=k.tid WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS t8_rows_changed;

\echo === check 2: which columns of tagset changed (expected: one line, tags, 10 rows on acceptance. Any other line is a fault)
SELECT k.key AS col, count(*) AS changed_rows FROM rp_b1_tagset a JOIN tagset b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1 ORDER BY 1;

\echo === check 3: tag sets gone, tag sets new, and tag sets that changed without being a target (expected: 0, 0, 0)
SELECT (SELECT count(*) FROM rp_b1_tagset a WHERE NOT EXISTS (SELECT 1 FROM tagset b WHERE b.id=a.id)) AS gone,
       (SELECT count(*) FROM tagset b WHERE NOT EXISTS (SELECT 1 FROM rp_b1_tagset a WHERE a.id=b.id)) AS new_tag_sets,
       (SELECT count(*) FROM rp_b1_tagset a JOIN tagset b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND NOT EXISTS (SELECT 1 FROM rp_b1_target g WHERE g.tid=a.id)) AS changed_without_being_a_target;

\echo === check 4: every new value against the target state. Expected: repaired = is_one_phase_of_its_flow = one_value_no_comma. The next three columns say how the value was chosen and add up to repaired (10, 0, 0 on acceptance). current_is_also_the_first_phase says for how many the choice between current and first makes no difference (4 on acceptance)
SELECT count(*) AS repaired,
       count(*) FILTER (WHERE (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=g.fid AND s."displayName"=t.tags)=1) AS is_one_phase_of_its_flow,
       count(*) FILTER (WHERE t.tags NOT LIKE '%,%' AND t.tags<>'') AS one_value_no_comma,
       count(*) FILTER (WHERE g.chosen_by='current phase') AS set_to_the_current_phase,
       count(*) FILTER (WHERE g.chosen_by='same name, other case') AS set_to_the_same_name_in_other_case,
       count(*) FILTER (WHERE g.chosen_by='first phase, no current phase') AS set_to_the_first_phase_no_current,
       count(*) FILTER (WHERE g.current_name IS NOT DISTINCT FROM g.first_name) AS current_is_also_the_first_phase
  FROM rp_b1_target g JOIN tagset t ON t.id=g.tid;

\echo === check 5: shape. The repaired phase tags against the phase tags the repair did not touch (expected: on the repaired line every count equals n except on_the_list_of_its_flow, and every column that is full on the untouched line is full on the repaired line. A phase tag on a real phase that is missing from the list of its flow is a known state the server leaves behind, guard file 50)
SELECT CASE WHEN g.tid IS NULL THEN 'untouched' ELSE 'repaired' END AS phase_tags, count(*) AS n,
       count(*) FILTER (WHERE t.type='select-one') AS select_one,
       count(*) FILTER (WHERE t."tagsetTemplateId" IS NOT DISTINCT FROM x.ttid) AS bound_to_the_list_of_its_flow,
       count(*) FILTER (WHERE t."profileId" IS NULL) AS on_no_profile,
       count(*) FILTER (WHERE t.tags NOT LIKE '%,%') AS one_value_no_comma,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=t.tags)) AS on_a_phase_of_its_flow,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=x.fid AND s."displayName"=t.tags AND s.id=x.cur)) AS on_the_current_phase,
       count(*) FILTER (WHERE t.tags = ANY (string_to_array((SELECT tt."allowedValues" FROM tagset_template tt WHERE tt.id=x.ttid), ','))) AS on_the_list_of_its_flow
  FROM rp_b1_fs x JOIN tagset t ON t.id=x.tid LEFT JOIN rp_b1_target g ON g.tid=x.tid GROUP BY 1 ORDER BY 1;

\echo === check 6: one line per repaired phase tag, no names (read every line on other data). siblings_on_the_new_phase is the number of other callouts already on the phase the callout moves to
SELECT md5(g.tid::text) AS tag_ref, md5(g.fid::text) AS flow_ref,
       CASE WHEN g.in_template THEN 'space template' ELSE 'space level '||coalesce((SELECT s.level::text FROM space s WHERE s."collaborationId"=g.coid), '?') END AS sits_in,
       c.settings->>'visibility' AS visibility,
       coalesce((SELECT r."messagesCount" FROM room r WHERE r.id=c."commentsId"),0) AS comments,
       (SELECT count(*) FROM callout_contribution cc WHERE cc."calloutId"=c.id) AS responses,
       g.phases AS phases_in_flow, g.chosen_by,
       (g.current_name IS NOT DISTINCT FROM g.first_name) AS current_is_first,
       (g.old_tag = ANY (string_to_array((SELECT tt."allowedValues" FROM tagset_template tt WHERE tt.id=g.ttid), ','))) AS old_value_was_on_the_list,
       (g.new_tag = ANY (string_to_array((SELECT tt."allowedValues" FROM tagset_template tt WHERE tt.id=g.ttid), ','))) AS new_value_is_on_the_list,
       (SELECT count(*) FROM rp_b1_fs y JOIN rp_b1_tagset a ON a.id=y.tid WHERE y.fid=g.fid AND a.tags=g.new_tag) AS siblings_on_the_new_phase
  FROM rp_b1_target g JOIN callout c ON c.id=g.cid ORDER BY 3, 2, 1;

\echo === check 7: nothing else was written for the moved callouts (expected: 0 callouts changed, 0 phases changed, 0 lists changed, 0 flows changed; the rehearsal lists the tables written, which must be tagset alone)
SELECT (SELECT count(*) FROM callout c JOIN rp_b1_target g ON g.cid=c.id WHERE c.xmin::text::bigint = txid_current() % 4294967296) AS callouts_written,
       (SELECT count(*) FROM innovation_flow_state s WHERE s.xmin::text::bigint = txid_current() % 4294967296) AS phases_written,
       (SELECT count(*) FROM tagset_template tt WHERE tt.xmin::text::bigint = txid_current() % 4294967296) AS lists_written,
       (SELECT count(*) FROM innovation_flow f WHERE f.xmin::text::bigint = txid_current() % 4294967296) AS flows_written;
\echo === B1 phase tag repair done
