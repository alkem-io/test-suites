#!/usr/bin/env bash
# 53-vc-binding-threads-xcheck.sh  (2026-11-13, written in the C3 review)
# Guard, not a repair. Reads only, prints counts and dates only, never an id.
# A binding says: in this thread of this comment room, this virtual contributor (VC) answers.
# It is stored on the platform side (room."vcData" -> interactionsByThread) and its key is the
# id of the chat message that started the thread. The thread itself lives on the chat server.
# Question it serves: does the thread a binding names still exist on the chat server, and what
# happened in it? The server finds a binding by the thread id of an incoming message
# (message.inbox.service.ts processVcInvocation, origin/develop of 2026-11-10). A binding
# whose thread id is on no chat message can never be found, whatever VC id it holds.
# Why this matters on acceptance: the chat server migration of January 2026 (synapse-migrator)
# gave every chat message a new id and did not rewrite the thread ids kept on the platform side.
# The two databases cannot be joined, so the platform side is exported as hashes to a temp file
# and loaded into temp tables on the chat side. The temp file is removed at the end.
# Both databases must be backups of the same moment, or new threads show up as not found.
#
# usage: 53-vc-binding-threads-xcheck.sh <alkemio_db> <synapse_db>
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./53-vc-binding-threads-xcheck.sh alkemio acc_synapse > runs/acc-2026-11-11/53-alkemio.out
set -uo pipefail
adb=${1:?usage: 53-vc-binding-threads-xcheck.sh <alkemio_db> <synapse_db>}
sdb=${2:?usage: 53-vc-binding-threads-xcheck.sh <alkemio_db> <synapse_db>}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
tmpb=$(mktemp); tmpa=$(mktemp); trap 'rm -f "$tmpb" "$tmpa"' EXIT
# md5 of thread id | md5 of room id | room kind | messages counted by the platform | situation | key state | md5 of the VC id the binding stands for (the current id, through the map for an old id)
$PSQL -d "$adb" -X -q -At -F '|' -c "
WITH b AS (
  SELECT r.id AS room, r.type, r.\"messagesCount\" AS n, e.k AS thread, e.v AS v, e.v->>'virtualContributorActorID' AS vc
    FROM room r, jsonb_each(CASE WHEN jsonb_typeof(r.\"vcData\"->'interactionsByThread')='object' THEN r.\"vcData\"->'interactionsByThread' ELSE '{}'::jsonb END) AS e(k, v))
SELECT md5(b.thread), md5(b.room::text), b.type, b.n,
       CASE WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=b.vc) THEN '1 current id of a VC that exists'
            WHEN m.id IS NULL THEN '5 names nothing'
            WHEN EXISTS (SELECT 1 FROM virtual_contributor v WHERE v.id::text=m.id::text) THEN '2 old agent id of a VC that exists'
            ELSE '3 old agent id of a VC that is gone' END,
       CASE WHEN NOT (b.v ? 'externalThreadId') THEN 'no key' WHEN jsonb_typeof(b.v->'externalThreadId')='null' THEN 'JSON null' ELSE 'has a value' END,
       md5(COALESCE(m.id::text, b.vc))
  FROM b LEFT JOIN _agent_backup_virtual_contributor m ON m.\"agentId\"::text = b.vc ORDER BY 1" > "$tmpb" || exit 1
# md5 of actor id | kind
$PSQL -d "$adb" -X -q -At -F '|' -c "SELECT md5(id::text), 'user' FROM \"user\" UNION ALL SELECT md5(id::text), 'vc' FROM virtual_contributor ORDER BY 1" > "$tmpa" || exit 1
{
cat <<'SQL'
\pset footer off
\echo === 53 VC thread bindings against the chat server
CREATE TEMP TABLE b(thread_h text, room_h text, room_kind text, platform_count int, situation text, key_state text, vc_h text);
COPY b FROM STDIN WITH (FORMAT csv, DELIMITER '|');
SQL
cat "$tmpb"
cat <<'SQL'
\.
CREATE TEMP TABLE a(actor_h text, kind text);
COPY a FROM STDIN WITH (FORMAT csv, DELIMITER '|');
SQL
cat "$tmpa"
cat <<'SQL'
\.
ANALYZE b; ANALYZE a;
CREATE TEMP TABLE ev AS
SELECT e.event_id, md5(e.event_id) AS h, e.room_id, e.type, to_timestamp(e.origin_server_ts/1000.0) AS at,
       md5(substring(e.sender from '^@([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):')) AS sender_h
  FROM events e;
CREATE INDEX ON ev (h); CREATE INDEX ON ev (event_id); ANALYZE ev;
CREATE TEMP TABLE chat_room AS
SELECT md5(substring(ra.room_alias from '^#([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):')) AS room_h, ra.room_id,
       (SELECT count(*) FROM events e WHERE e.room_id=ra.room_id AND e.type='m.room.message') AS messages
  FROM room_aliases ra;
ANALYZE chat_room;
CREATE TEMP TABLE reply AS
SELECT md5(er.relates_to_id) AS thread_h, ev.at, ev.sender_h FROM event_relations er JOIN ev ON ev.event_id=er.event_id WHERE er.relation_type='m.thread';
ANALYZE reply;

\echo --- X1 every binding: does the chat message that started its thread exist. A binding on the line thread_gone can never be found by the server
\echo ---    Acceptance 2026-11-11: 153 found, 362 gone. Every binding with an externalThreadId key is gone, every binding without the key is found
SELECT b.situation, b.key_state, count(*) AS bindings,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ev WHERE ev.h=b.thread_h)) AS thread_found,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM ev WHERE ev.h=b.thread_h)) AS thread_gone
  FROM b GROUP BY 1,2 ORDER BY 1,2;

\echo --- X2 the bindings whose thread is gone: is the id known anywhere else on the chat server (expect 0 on the three columns), and does the room still have a chat room with messages
SELECT count(*) AS bindings_thread_gone,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM event_json j WHERE md5(j.event_id)=b.thread_h)) AS id_in_stored_message_bodies,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM event_relations r WHERE md5(r.relates_to_id)=b.thread_h)) AS id_is_a_reply_target,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM redactions r WHERE md5(r.redacts)=b.thread_h)) AS id_was_a_removed_message,
       count(DISTINCT b.room_h) AS platform_rooms,
       count(DISTINCT b.room_h) FILTER (WHERE EXISTS (SELECT 1 FROM chat_room c WHERE c.room_h=b.room_h)) AS rooms_with_a_chat_room,
       count(DISTINCT b.room_h) FILTER (WHERE EXISTS (SELECT 1 FROM chat_room c WHERE c.room_h=b.room_h AND c.messages>0)) AS rooms_with_chat_messages
  FROM b WHERE NOT EXISTS (SELECT 1 FROM ev WHERE ev.h=b.thread_h);

\echo --- X3 the bindings whose thread exists: when the thread was started. The dates show which server code wrote each kind of id
SELECT b.situation, count(*) AS threads, min(ev.at)::date AS first_started, max(ev.at)::date AS last_started,
       count(*) FILTER (WHERE ev.type<>'m.room.message') AS thread_start_is_not_a_message
  FROM b JOIN ev ON ev.h=b.thread_h GROUP BY 1 ORDER BY 1;

\echo --- X4 what happened in the threads that exist: replies by the VC the binding stands for, by platform users and by anybody else.
\echo ---    user_replies_after_the_last_vc_reply on a line other than situation 1 are replies the VC did not answer because the binding names no VC: each is one silent failure a user met
WITH t AS (SELECT b.thread_h, b.situation, b.vc_h FROM b WHERE EXISTS (SELECT 1 FROM ev WHERE ev.h=b.thread_h)),
r AS (SELECT t.thread_h, t.situation, reply.at,
             CASE WHEN reply.sender_h=t.vc_h THEN 'vc' WHEN EXISTS (SELECT 1 FROM a WHERE a.actor_h=reply.sender_h AND a.kind='user') THEN 'user' ELSE 'other' END AS who
        FROM t JOIN reply ON reply.thread_h=t.thread_h)
SELECT t.situation, count(DISTINCT t.thread_h) AS threads,
       count(DISTINCT r.thread_h) AS threads_with_a_reply,
       count(*) FILTER (WHERE r.who='vc') AS replies_by_the_vc, max(r.at) FILTER (WHERE r.who='vc')::date AS last_vc_reply,
       count(*) FILTER (WHERE r.who='user') AS replies_by_users, max(r.at) FILTER (WHERE r.who='user')::date AS last_user_reply,
       count(*) FILTER (WHERE r.who='other') AS replies_by_others,
       count(*) FILTER (WHERE r.who='user' AND NOT EXISTS (SELECT 1 FROM r r2 WHERE r2.thread_h=r.thread_h AND r2.who='vc' AND r2.at>r.at)) AS user_replies_after_the_last_vc_reply
  FROM t LEFT JOIN r ON r.thread_h=t.thread_h GROUP BY 1 ORDER BY 1;

\echo === 53 done
SQL
} | $PSQL -d "$sdb" -X -q 2>&1
