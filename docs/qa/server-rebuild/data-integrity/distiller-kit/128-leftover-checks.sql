-- 128-leftover-checks.sql: three readings that were "not checked" in the open rows pass, explained 2026-11-20.
-- Reads only, counts only.   psql -d <alkemio_db> -X -f 128-leftover-checks.sql
-- T: template content rows. A space template names ONE content row; the subspaces saved with it hang below that row.
--    So "rows no template names" counts the children too (acceptance: 294) and is not a finding. The finding is a row
--    that no template REACHES (acceptance source: 16, rejected by the distiller; 0 after).
-- C: chats with fewer than 2 members. The other side was deleted or left; the chat stays for the one who is left.
-- P: platform invitations (to an e-mail). When the person registers the row is used and kept as history
--    ("profileCreated"); the server never lists those as pending. Kept by design.
\pset footer off
\echo --- L128 T1 template content rows that no template reaches, and child rows with no parent that no template names (expect 0 and 0)
WITH RECURSIVE own AS (
  SELECT t.id, 0 AS depth FROM template_content_space t WHERE EXISTS (SELECT 1 FROM template x WHERE x."contentSpaceId"=t.id)
  UNION ALL SELECT c.id, o.depth+1 FROM template_content_space c JOIN own o ON c."parentSpaceId"=o.id WHERE o.depth<10)
SELECT count(*) FILTER (WHERE t.id NOT IN (SELECT id FROM own)) AS rows_no_template_reaches,
       count(*) FILTER (WHERE t.level>0 AND t."parentSpaceId" IS NULL AND NOT EXISTS (SELECT 1 FROM template x WHERE x."contentSpaceId"=t.id)) AS child_rows_with_no_parent_and_no_template
  FROM template_content_space t;
\echo --- L128 T2 template content rows in all, named by a template, children below one, and saved from a subspace (context: acceptance 449, 155, 294, 128)
SELECT count(*) AS all_rows, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM template x WHERE x."contentSpaceId"=t.id)) AS named_by_a_template,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM template x WHERE x."contentSpaceId"=t.id)) AS children_below_one,
       count(*) FILTER (WHERE t.level>0 AND t."parentSpaceId" IS NULL) AS named_and_saved_from_a_subspace FROM template_content_space t;
\echo --- L128 C1 chats with fewer than 2 members, by who is left and the kind of chat (context: acceptance 94 = nobody 4, one user 36, one virtual contributor 54)
SELECT coalesce(q.kinds,'nobody') AS who_is_left, q.rtype AS kind, count(*) AS chats, count(*) FILTER (WHERE q.msgs=0) AS with_no_message, sum(q.msgs) AS messages
  FROM (SELECT r.type AS rtype, r."messagesCount" AS msgs,
               (SELECT count(*) FROM conversation_membership m WHERE m."conversationId"=cv.id) AS n,
               (SELECT string_agg(a.type::text, '+' ORDER BY a.type::text) FROM conversation_membership m JOIN actor a ON a.id=m."actorId" WHERE m."conversationId"=cv.id) AS kinds
          FROM conversation cv JOIN room r ON r.id=cv."roomId") q WHERE q.n<2 GROUP BY 1,2 ORDER BY 1,2;
\echo --- L128 P1 platform invitations of a registered person that were NOT marked as used (expect 0: such a row would still show as pending)
SELECT count(*) AS registered_and_not_marked_used FROM platform_invitation pi WHERE NOT pi."profileCreated" AND EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email)=lower(pi.email));
\echo --- L128 P2 platform invitations in all, used, still pending, and used ones whose e-mail matches no user any more (context; the last number is for a person: the server removes the invitations of a deleted account)
SELECT count(*) AS all_rows, count(*) FILTER (WHERE pi."profileCreated") AS used, count(*) FILTER (WHERE NOT pi."profileCreated") AS pending,
       count(*) FILTER (WHERE pi."profileCreated" AND NOT EXISTS (SELECT 1 FROM "user" u WHERE lower(u.email)=lower(pi.email))) AS used_and_no_user_with_that_email FROM platform_invitation pi;
