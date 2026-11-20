-- 49-links-carrying-ids.sql  (2026-11-13, asked by the QA lead in the B4 review)
-- Guard, not a repair. Reads only, prints counts only.
-- Question it serves: if the new server gives rows new ids, which links stop working?
-- Two families of links exist:
--   1. links in e-mails and push messages that were already sent. They are not stored in the
--      database, so they cannot be counted here. What the legacy server puts in them is read
--      from the code (url.generator.service.ts): almost all use the name of the space, user,
--      organization, callout, post. Three use an id: the chat link (?chat=<conversation id>),
--      the calendar file link (/calendar/event/<id>/ics) and the signing snapshot link.
--      L1 and L2 below count the rows such links can point at.
--   2. links stored inside content. L3 counts them per column. File links
--      (/storage/document/<id>) are the large group.
-- Expected: no fixed number. Read the counts as the size of the exposure. If the copy keeps
-- every id, the exposure is zero. Any table whose ids are made new by the copy turns its line
-- into broken links.
\echo === 49 links that carry an id
\echo --- L1: rows an e-mailed link with an id can point at
SELECT 'conversation (chat link in message e-mails and push)' AS target, count(*) FROM conversation
UNION ALL SELECT 'calendar event (calendar file link)', count(*) FROM calendar_event;
\echo --- L2: open invitations whose e-mail was already sent. The link in these e-mails uses names, not ids. The match at registration is by e-mail address
SELECT 'platform invitation, invitee not registered' AS kind, count(*) FROM platform_invitation;
\echo --- L3: stored content that holds a platform link with an id, per column
WITH src(tbl,col,val) AS (
  SELECT 'profile','description',description FROM profile
  UNION ALL SELECT 'profile','tagline',tagline FROM profile
  UNION ALL SELECT 'reference','uri',uri FROM reference
  UNION ALL SELECT 'reference','description',description FROM reference
  UNION ALL SELECT 'visual','uri',uri::text FROM visual
  UNION ALL SELECT 'link','uri',uri FROM link
  UNION ALL SELECT 'innovation_flow_state','description',description FROM innovation_flow_state
  UNION ALL SELECT 'form','description',description FROM form
  UNION ALL SELECT 'invitation','welcomeMessage',"welcomeMessage"::text FROM invitation
  UNION ALL SELECT 'platform_invitation','welcomeMessage',"welcomeMessage"::text FROM platform_invitation
  UNION ALL SELECT 'whiteboard','content',content FROM whiteboard WHERE content LIKE '%/storage/document/%'
)
SELECT tbl, col,
       count(*) FILTER (WHERE val ~ '/storage/document/[0-9a-f]{8}-[0-9a-f]{4}-') AS rows_with_file_link,
       count(*) FILTER (WHERE val ~ '[?&]chat=[0-9a-f]{8}-[0-9a-f]{4}-')          AS rows_with_chat_link,
       count(*) FILTER (WHERE val ~ '/calendar/event/[0-9a-f]{8}-[0-9a-f]{4}-')   AS rows_with_calendar_link,
       count(*) FILTER (WHERE val ~ 'alkem\.io/[^[:space:])"]*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'
                          AND val !~ '/storage/document/[0-9a-f]{8}-' AND val !~ '[?&]chat=[0-9a-f]{8}-' AND val !~ '/calendar/event/[0-9a-f]{8}-') AS rows_with_other_id_link
  FROM src WHERE val IS NOT NULL GROUP BY 1,2 ORDER BY 1,2;
\echo --- L4: in-app notifications. They store ids, not links. The server resolves them when the list is read
SELECT count(*) AS in_app_notifications, count(*) FILTER (WHERE payload::text ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-') AS payload_holds_an_id FROM in_app_notification;
\echo === 49 done
