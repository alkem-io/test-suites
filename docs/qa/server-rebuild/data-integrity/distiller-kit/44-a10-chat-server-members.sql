-- 44-a10-chat-server-members.sql
--
-- Who is still joined, on the chat server, to the Matrix room of a rejected
-- Alkemio room. Run on the Alkemio database AFTER script 39 ran on the Synapse
-- database of the same dataset: it reads /tmp/a10-members.txt (room id, rule,
-- room type, actor id) on the machine psql runs on. Counts only in the output.
\pset footer off
CREATE TEMP TABLE a10mm (room text, rule text, rtype text, actor text);
\copy a10mm from '/tmp/a10-members.txt' with (format csv, delimiter '|')
\echo --- A10 S2: Matrix members of rejected rooms by kind of Alkemio actor (a live user or virtual contributor here still holds a Matrix room the platform no longer knows)
SELECT rule, rtype AS room_type, coalesce(a.type::text,'no actor row (deleted or a service account)') AS actor_kind,
       count(*) AS memberships, count(DISTINCT m.actor) AS actors, count(DISTINCT m.room) AS rooms
  FROM a10mm m LEFT JOIN actor a ON a.id::text=m.actor GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo --- A10 S3: conversations with no messaging parent, the pair joined on the chat server and whether that pair has a live conversation (a live user here has lost this chat)
WITH pr AS (SELECT room, min(actor) a1, max(actor) a2, count(*) n FROM a10mm WHERE rule='dependant-of-conversation' GROUP BY room)
SELECT dense_rank() OVER (ORDER BY pr.room) AS chat, n AS matrix_members,
       (SELECT count(*) FROM actor a JOIN "user" u ON u.id=a.id WHERE a.id::text IN (pr.a1, pr.a2)) AS live_users,
       (SELECT count(*) FROM virtual_contributor v WHERE v.id::text IN (pr.a1, pr.a2)) AS virtual_contributors,
       (SELECT count(*) FROM conversation c WHERE c."messagingId" IS NOT NULL
           AND EXISTS (SELECT 1 FROM conversation_membership m WHERE m."conversationId"=c.id AND m."actorId"::text=pr.a1)
           AND EXISTS (SELECT 1 FROM conversation_membership m WHERE m."conversationId"=c.id AND m."actorId"::text=pr.a2)) AS live_conversations_of_same_pair,
       (SELECT r."messagesCount" FROM room r WHERE r.id::text=pr.room) AS messages
  FROM pr ORDER BY 1;
