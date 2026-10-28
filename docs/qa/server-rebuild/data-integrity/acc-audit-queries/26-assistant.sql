\echo === A-alembic / checkpoint migrations
SELECT * FROM alembic_version; SELECT max(v) FROM checkpoint_migrations;
\echo === A-enums
SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid GROUP BY 1;
\echo === A-conversations
SELECT state, count(*), min("createdAt")::date, max("lastActiveAt")::date FROM conversation GROUP BY 1;
SELECT id, "userId", left(title,40) title, state, "threadId", ("mcpSessionId" IS NOT NULL) has_mcp, "createdAt"::date, "lastActiveAt"::date FROM conversation ORDER BY "createdAt";
\echo === A1 conversations without messages / messages per conversation
SELECT c.id, count(m.id) msgs FROM conversation c LEFT JOIN message m ON m."conversationId"=c.id GROUP BY 1 ORDER BY 2;
\echo === A-messages
SELECT role, status, count(*) FROM message GROUP BY 1,2;
\echo === A2 threadId uniqueness / checkpoints without conversation / conversations without checkpoints
SELECT count(*), count(DISTINCT "threadId") FROM conversation;
SELECT count(DISTINCT thread_id) threads, count(DISTINCT thread_id) FILTER (WHERE NOT EXISTS (SELECT 1 FROM conversation c WHERE c."threadId"=k.thread_id) AND NOT EXISTS (SELECT 1 FROM system_invocation s WHERE s."threadId"=k.thread_id)) orphan_threads FROM checkpoints k;
SELECT count(*) FROM conversation c WHERE NOT EXISTS (SELECT 1 FROM checkpoints k WHERE k.thread_id=c."threadId");
\echo === A3 checkpoint blobs/writes without checkpoint thread
SELECT count(*) FROM checkpoint_blobs b WHERE NOT EXISTS (SELECT 1 FROM checkpoints k WHERE k.thread_id=b.thread_id);
SELECT count(*) FROM checkpoint_writes w WHERE NOT EXISTS (SELECT 1 FROM checkpoints k WHERE k.thread_id=w.thread_id AND k.checkpoint_id=w.checkpoint_id);
\echo === A4 checkpoints parent chain broken
SELECT count(*) FROM checkpoints k WHERE parent_checkpoint_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM checkpoints p WHERE p.thread_id=k.thread_id AND p.checkpoint_id=k.parent_checkpoint_id);
\echo === A-checkpoints per thread
SELECT thread_id, count(*), pg_size_pretty(sum(length(checkpoint::text))::bigint) FROM checkpoints GROUP BY 1 ORDER BY 2 DESC;
\echo === A-tool actions
SELECT "invocationMode", kind, "toolName", "isError", "errorClass", count(*) FROM tool_action GROUP BY 1,2,3,4,5 ORDER BY 6 DESC;
\echo === A5 tool actions with neither conversation nor system invocation / message null
SELECT count(*) FILTER (WHERE "conversationId" IS NULL AND "systemInvocationId" IS NULL) unanchored, count(*) FILTER (WHERE "messageId" IS NULL) no_message, count(*) FILTER (WHERE "executedAt" IS NULL) not_executed, count(*) FILTER (WHERE kind::text<>'read' AND "confirmedAt" IS NULL) write_unconfirmed FROM tool_action;
SELECT id, "conversationId", "systemInvocationId", "toolName", kind, "isError", "confirmedAt", "executedAt", "createdAt" FROM tool_action ORDER BY "createdAt";
\echo === A6 proposed write sets
SELECT status, count(*), count(*) FILTER (WHERE "decidedAt" IS NULL) undecided FROM proposed_write_set GROUP BY 1;
SELECT id, "conversationId", "turnId", status, jsonb_array_length(items) n_items, "createdAt", "decidedAt" FROM proposed_write_set ORDER BY "createdAt";
\echo === A7 system invocations
SELECT "taskType", status, count(*) FROM system_invocation GROUP BY 1,2;
\echo === A8 userIds / actor ids not alkemio users (CSV join)
CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
SELECT 'conversation.userId' k, count(DISTINCT "userId") n, count(DISTINCT "userId") FILTER (WHERE NOT EXISTS (SELECT 1 FROM alku WHERE alku.id::text=c."userId")) unmatched FROM conversation c
UNION ALL SELECT 'tool_action.assistantActorId', count(DISTINCT "assistantActorId"), count(DISTINCT "assistantActorId") FILTER (WHERE NOT EXISTS (SELECT 1 FROM alku WHERE alku.id::text=t."assistantActorId")) FROM tool_action t
UNION ALL SELECT 'tool_action.onBehalfOfUserId', count(DISTINCT "onBehalfOfUserId"), count(DISTINCT "onBehalfOfUserId") FILTER (WHERE "onBehalfOfUserId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM alku WHERE alku.id::text=t."onBehalfOfUserId")) FROM tool_action t;
SELECT DISTINCT "assistantActorId" FROM tool_action;
\echo === A9 message parts / tokenUsage shape
SELECT jsonb_typeof(parts), count(*) FROM message GROUP BY 1;
