-- 50-flow-allowed-values.sql: guard, reads only, prints counts only. Run by hand:
--   docker exec -i alkemio_dev_postgres psql -U synapse -d <alkemio db> -X < 50-flow-allowed-values.sql
-- Written 2026-11-13 to explain the line "seen in passing" of finding B4 (guard B4 G16).
-- A flow keeps its phase names in two places: the phase rows (innovation_flow_state)
-- and the list of allowed values on the tagset template of the flow. A callout holds
-- the name of its phase as the value of its flow-state tag. The server writes the list
-- from the phase names (innovation.flow.service.ts, collaboration.service.ts), so the
-- two should always be equal. This file shows where they are not, and what hangs on it.
-- Not part of any finding of the architect. Nothing here is a reject or a repair.
\pset footer off
\echo === 50 the phase list of a flow against its phases
CREATE TEMP TABLE fl50 AS
SELECT f.id, f."createdDate" AS created, tt."allowedValues" AS av, cardinality(string_to_array(tt."allowedValues", ',')) AS n_allowed,
       (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id) AS n_phases,
       (SELECT string_agg(s."displayName", ',' ORDER BY s."sortOrder") FROM innovation_flow_state s WHERE s."innovationFlowId"=f.id) AS names,
       co.id AS collab_id, co."calloutsSetId" AS cs_id,
       CASE WHEN EXISTS (SELECT 1 FROM space sp WHERE sp."collaborationId"=co.id) THEN 'space'
            WHEN EXISTS (SELECT 1 FROM template_content_space x WHERE x."collaborationId"=co.id) THEN 'template content space'
            WHEN co.id IS NULL THEN '(no collaboration)' ELSE '(collaboration with no owner)' END AS owner_kind
  FROM innovation_flow f JOIN tagset_template tt ON tt.id=f."flowStatesTagsetTemplateId" LEFT JOIN collaboration co ON co."innovationFlowId"=f.id;
ANALYZE fl50;
\echo --- F1: every flow, by owner and by how the list compares with the phases
SELECT owner_kind, CASE WHEN n_allowed<n_phases THEN 'list is shorter' WHEN n_allowed>n_phases THEN 'list is longer' ELSE 'same number' END AS list_against_phases,
       count(*) AS flows, count(*) FILTER (WHERE av IS DISTINCT FROM names) AS list_is_not_the_phase_names_in_order
  FROM fl50 GROUP BY 1,2 ORDER BY 1,2;
\echo --- F2: the flows whose list has another length, by shape. list_is_the_first_phases means the list stopped growing when phases were added
SELECT owner_kind, n_allowed, n_phases, count(*) AS flows,
       count(*) FILTER (WHERE names LIKE av || ',%') AS list_is_the_first_phases,
       min(created)::date AS first_made, max(created)::date AS last_made
  FROM fl50 WHERE n_allowed<>n_phases GROUP BY 1,2,3 ORDER BY 4 DESC, 1,2,3;
\echo --- F3: flows with two phases and one value on the list, by space level and month made. One month with most of them points at one bulk action
SELECT sp.level, to_char(fl50.created, 'YYYY-MM') AS made, count(*) AS flows
  FROM fl50 JOIN space sp ON sp."collaborationId"=fl50.collab_id WHERE n_allowed=1 AND n_phases=2 GROUP BY 1,2 ORDER BY 2,1;
\echo --- F4: callouts on a real phase that is missing from the list. The server reads the list when a callout is moved or transferred into the flow
\echo ---     (classification.service.ts updateTagsetTemplateOnSelectTagset): a phase that is not on the list falls back to the default phase
SELECT count(*) AS callouts, count(DISTINCT fl50.id) AS flows
  FROM fl50 JOIN callout c ON c."calloutsSetId"=fl50.cs_id JOIN tagset t ON t."classificationId"=c."classificationId" AND t.name='flow-state'
 WHERE EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=fl50.id AND s."displayName"=t.tags) AND NOT (t.tags = ANY (string_to_array(fl50.av, ',')));
\echo --- F5: callouts whose value is no phase of their flow, by owner. These are the same callouts as the truly_unmatched of guard B1 G13:
\echo ---     the sum over the owners must equal that number. value_is_on_the_list: the value is an old phase name that the list still holds
SELECT fl50.owner_kind, count(*) AS callouts, count(*) FILTER (WHERE t.tags = ANY (string_to_array(fl50.av, ','))) AS value_is_on_the_list
  FROM fl50 JOIN callout c ON c."calloutsSetId"=fl50.cs_id JOIN tagset t ON t."classificationId"=c."classificationId" AND t.name='flow-state'
 WHERE NOT EXISTS (SELECT 1 FROM innovation_flow_state s WHERE s."innovationFlowId"=fl50.id AND s."displayName"=t.tags) GROUP BY 1 ORDER BY 1;
\echo === 50 done
