-- 45-b3-repair.sql: the B3 repair as QA ruled it on 2026-11-13.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state. Every statement carries its
-- own precondition, so a row that does not fit is left alone and stays flagged.
-- Changed 2026-11-13 after the QA lead read the first version:
--   * the old R2 is gone. An empty whiteboard is never deleted. The typeless callouts
--     that carry a whiteboard are kept as they are and tracked as case T6.
--   * R1 now repairs only a row of the shape seen on acceptance. Any other row is left
--     alone, stays flagged, and is listed by guard B3 G8c to be read alone.
--   * R3 is the reject of the empty responses, not a repair. It is in this file only so
--     the rehearsal shows what the copied data looks like without them.
-- On production: R1 runs only after the lines of B3 G6b, G7, G8b and G8c were read, and
-- R4 only after every line of B3 G14b was read. Counts in this file are acceptance counts.
-- touches: callout_framing,callout_contribution,invitation,authorization_policy
\set ON_ERROR_STOP on
\pset footer off
\echo === B3 repair: images of the tables before the repair
CREATE TEMP TABLE rp_framing AS SELECT * FROM callout_framing;
CREATE TEMP TABLE rp_contribution AS SELECT * FROM callout_contribution;
CREATE TEMP TABLE rp_invitation AS SELECT * FROM invitation;
CREATE TEMP TABLE rp_callout AS SELECT * FROM callout;
ANALYZE rp_framing; ANALYZE rp_contribution; ANALYZE rp_invitation; ANALYZE rp_callout;

\echo === R1: a whiteboard callout with no whiteboard becomes a plain callout (expected on acceptance: UPDATE 94)
\echo ===     precondition: no response, no comment room, responses off, no allowed response type, and no unreferenced whiteboard made within 2 seconds of the callout.
UPDATE callout_framing f SET type='none'
  FROM callout c
 WHERE c."framingId"=f.id AND f.type='whiteboard' AND f."whiteboardId" IS NULL
   AND f."linkId" IS NULL AND f."memoId" IS NULL AND f."mediaGalleryId" IS NULL AND f."pollId" IS NULL AND f."collaboraDocumentId" IS NULL
   AND c."commentsId" IS NULL
   AND NOT coalesce((c.settings->'contribution'->>'enabled')::boolean,false)
   AND coalesce(jsonb_array_length(c.settings->'contribution'->'allowedTypes'),0)=0
   AND NOT EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."calloutId"=c.id)
   AND NOT EXISTS (SELECT 1 FROM whiteboard w
                    WHERE abs(extract(epoch FROM w."createdDate"-c."createdDate"))<2
                      AND NOT EXISTS (SELECT 1 FROM callout_framing x WHERE x."whiteboardId"=w.id)
                      AND NOT EXISTS (SELECT 1 FROM callout_contribution x WHERE x."whiteboardId"=w.id)
                      AND NOT EXISTS (SELECT 1 FROM template x WHERE x."whiteboardId"=w.id));

\echo === not repaired on purpose: a typeless callout that carries a whiteboard keeps it. An empty whiteboard is never deleted (case T6)

\echo === R3: reject, not repair: a response with no content at all is left out with its policy (expected on acceptance: DELETE 17, DELETE 17)
\echo ===     precondition: every content pointer is empty and it carries no classification. Same test as the server clean-up of 2025-10.
CREATE TEMP TABLE rp_shell AS
SELECT c.id, c."authorizationId" FROM callout_contribution c
 WHERE c."postId" IS NULL AND c."whiteboardId" IS NULL AND c."linkId" IS NULL AND c."memoId" IS NULL AND c."collaboraDocumentId" IS NULL
   AND c."classificationId" IS NULL;
DELETE FROM callout_contribution WHERE id IN (SELECT id FROM rp_shell);
DELETE FROM authorization_policy WHERE id IN (SELECT "authorizationId" FROM rp_shell);

\echo === R4: an invitation that asks for the parent community where there is none loses the option (expected on acceptance: UPDATE 1)
UPDATE invitation i SET "invitedToParent"=false FROM role_set r
 WHERE r.id=i."roleSetId" AND i."invitedToParent" AND r."parentRoleSetId" IS NULL;

\echo === not repaired on purpose: the office document with no file is kept and tracked (case T5)

\echo === check 1: the four B3 rules on the repaired state (expected 2 kept, 0, 1 kept, 0)
SELECT (SELECT count(*) FROM callout_framing f WHERE CASE f.type WHEN 'whiteboard' THEN f."whiteboardId" IS NULL WHEN 'link' THEN f."linkId" IS NULL WHEN 'memo' THEN f."memoId" IS NULL
          WHEN 'media_gallery' THEN f."mediaGalleryId" IS NULL WHEN 'poll' THEN f."pollId" IS NULL WHEN 'collabora_document' THEN f."collaboraDocumentId" IS NULL
          WHEN 'form' THEN NOT EXISTS (SELECT 1 FROM callout_form x WHERE x."framingId"=f.id)
          WHEN 'none' THEN f."whiteboardId" IS NOT NULL OR f."linkId" IS NOT NULL OR f."memoId" IS NOT NULL OR f."mediaGalleryId" IS NOT NULL OR f."pollId" IS NOT NULL OR f."collaboraDocumentId" IS NOT NULL
          ELSE false END) framing_rule,
       (SELECT count(*) FROM callout_contribution c WHERE CASE c.type WHEN 'post' THEN c."postId" IS NULL WHEN 'whiteboard' THEN c."whiteboardId" IS NULL WHEN 'link' THEN c."linkId" IS NULL
          WHEN 'memo' THEN c."memoId" IS NULL WHEN 'collabora_document' THEN c."collaboraDocumentId" IS NULL ELSE true END) response_rule,
       (SELECT count(*) FROM collabora_document WHERE "documentId" IS NULL) office_document_rule,
       (SELECT count(*) FROM invitation i JOIN role_set r ON r.id=i."roleSetId" WHERE i."invitedToParent" AND r."parentRoleSetId" IS NULL) invitation_rule;

\echo === check 2: which columns changed, per table (expected: callout_framing type 94, invitation invitedToParent 1, nothing else)
SELECT 'callout_framing' tbl, k.key col, count(*) changed_rows FROM rp_framing a JOIN callout_framing b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'callout_contribution', k.key, count(*) FROM rp_contribution a JOIN callout_contribution b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'invitation', k.key, count(*) FROM rp_invitation a JOIN invitation b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'callout', k.key, count(*) FROM rp_callout a JOIN callout b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
ORDER BY 1,2;

\echo === check 3: rows gone and rows new, per table (expected: callout_contribution 17 gone, everything else 0)
SELECT 'callout_framing' tbl, (SELECT count(*) FROM rp_framing a WHERE NOT EXISTS (SELECT 1 FROM callout_framing b WHERE b.id=a.id)) gone, (SELECT count(*) FROM callout_framing b WHERE NOT EXISTS (SELECT 1 FROM rp_framing a WHERE a.id=b.id)) new_rows
UNION ALL SELECT 'callout_contribution', (SELECT count(*) FROM rp_contribution a WHERE NOT EXISTS (SELECT 1 FROM callout_contribution b WHERE b.id=a.id)), (SELECT count(*) FROM callout_contribution b WHERE NOT EXISTS (SELECT 1 FROM rp_contribution a WHERE a.id=b.id))
UNION ALL SELECT 'invitation', (SELECT count(*) FROM rp_invitation a WHERE NOT EXISTS (SELECT 1 FROM invitation b WHERE b.id=a.id)), (SELECT count(*) FROM invitation b WHERE NOT EXISTS (SELECT 1 FROM rp_invitation a WHERE a.id=b.id))
UNION ALL SELECT 'callout', (SELECT count(*) FROM rp_callout a WHERE NOT EXISTS (SELECT 1 FROM callout b WHERE b.id=a.id)), (SELECT count(*) FROM callout b WHERE NOT EXISTS (SELECT 1 FROM rp_callout a WHERE a.id=b.id));

\echo === check 4: every repaired callout now has the shape of callouts the repair did not touch
\echo ===     one line per shape of a repaired callout. healthy_rows_same_shape must not be 0.
WITH sig AS (
  SELECT f.id, (f.id IN (SELECT a.id FROM rp_framing a JOIN callout_framing b USING (id) WHERE a.type IS DISTINCT FROM b.type OR a."whiteboardId" IS DISTINCT FROM b."whiteboardId")) repaired,
         f.type, (f."whiteboardId" IS NOT NULL) has_whiteboard, c."isTemplate" is_template, c.settings->>'visibility' visibility, (c."commentsId" IS NOT NULL) has_room,
         (c.settings->'framing'->>'commentsEnabled') framing_comments, (c.settings->'contribution'->>'enabled') responses_on, (c.settings->'contribution'->'allowedTypes')::text allowed
    FROM callout_framing f JOIN callout c ON c."framingId"=f.id)
SELECT r.type, r.has_whiteboard, r.is_template, r.visibility, r.has_room, r.framing_comments, r.responses_on, r.allowed, count(*) repaired_rows,
       (SELECT count(*) FROM sig h WHERE NOT h.repaired AND (h.type, h.has_whiteboard, h.is_template, h.visibility, h.has_room, h.framing_comments, h.responses_on, h.allowed)
                                              IS NOT DISTINCT FROM (r.type, r.has_whiteboard, r.is_template, r.visibility, r.has_room, r.framing_comments, r.responses_on, r.allowed)) healthy_rows_same_shape
  FROM sig r WHERE r.repaired GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 9 DESC;

\echo === check 5: the removed responses had nothing under them, and no other row named them
SELECT (SELECT count(*) FROM rp_shell) removed,
       (SELECT count(*) FROM rp_contribution a JOIN rp_shell s USING (id) WHERE a."postId" IS NOT NULL OR a."whiteboardId" IS NOT NULL OR a."linkId" IS NOT NULL OR a."memoId" IS NOT NULL OR a."collaboraDocumentId" IS NOT NULL OR a."classificationId" IS NOT NULL) had_content,
       (SELECT count(*) FROM activity a JOIN rp_shell s ON s.id=a."resourceID") activity_rows_naming_them,
       (SELECT count(*) FROM authorization_policy p JOIN rp_shell s ON s."authorizationId"=p.id) policies_left;

\echo === check 6: no whiteboard was let go: whiteboards that no callout, response or template points at (expected: the same number as before the repair, 13 on acceptance) and whiteboards in all
SELECT count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM callout_framing f WHERE f."whiteboardId"=w.id) AND NOT EXISTS (SELECT 1 FROM callout_contribution c WHERE c."whiteboardId"=w.id)
                          AND NOT EXISTS (SELECT 1 FROM template t WHERE t."whiteboardId"=w.id)) AS unreferenced_whiteboards,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM rp_framing f WHERE f."whiteboardId"=w.id) AND NOT EXISTS (SELECT 1 FROM rp_contribution c WHERE c."whiteboardId"=w.id)
                          AND NOT EXISTS (SELECT 1 FROM template t WHERE t."whiteboardId"=w.id)) AS unreferenced_before_the_repair,
       count(*) AS whiteboards
  FROM whiteboard w;
\echo === B3 repair done
