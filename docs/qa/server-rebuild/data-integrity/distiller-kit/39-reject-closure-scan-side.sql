-- 39-reject-closure-scan-side.sql
--
-- The same id closure scan for a database that has no "orphan" table:
-- Synapse, Kratos, Hydra, assistant, file backup, WOPI. Every row in those
-- databases is kept, so every match is a kept row naming a rejected row.
-- Needs /tmp/closure-ids.txt written by 38-reject-closure-scan.sql on the
-- machine psql runs on:
--   psql -X -d acc_synapse -f 39-reject-closure-scan-side.sql
\set ON_ERROR_STOP on
\pset footer off
CREATE TEMP TABLE ids (id text PRIMARY KEY, kinds text);
\copy ids from '/tmp/closure-ids.txt' with (format csv, delimiter '|')
CREATE TEMP TABLE scan_hit (holder_tbl text, col text, dt text, refs bigint, rejected_kinds text);
DO $$ DECLARE r record; n bigint; k text; cols int := 0; t0 timestamptz := clock_timestamp(); BEGIN
 FOR r IN SELECT c.table_schema s, c.table_name t, c.column_name col, c.data_type dt FROM information_schema.columns c
            JOIN information_schema.tables tb ON tb.table_schema=c.table_schema AND tb.table_name=c.table_name AND tb.table_type='BASE TABLE'
           WHERE c.table_schema NOT IN ('pg_catalog','information_schema')
             AND (c.data_type IN ('uuid','character','character varying','text','json','jsonb','ARRAY') OR (c.data_type='USER-DEFINED' AND c.udt_name IN ('citext','hstore'))) ORDER BY 1,2,3 LOOP
  cols := cols + 1;
  IF r.dt='uuid' THEN
   EXECUTE format('select count(*), string_agg(distinct ids.kinds, '','' order by ids.kinds) from %I.%I x join ids on ids.id=lower(x.%I::text)', r.s, r.t, r.col) INTO n, k;
  ELSE
   EXECUTE format('select count(*), string_agg(distinct ids.kinds, '','' order by ids.kinds) from (select lower(m[1]) u from %I.%I x, regexp_matches(x.%I::text, ''[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'',''g'') m where x.%I is not null) s join ids on ids.id=s.u', r.s, r.t, r.col, r.col) INTO n, k;
  END IF;
  IF n > 0 THEN INSERT INTO scan_hit VALUES (r.t, r.col, r.dt, n, k); END IF;
 END LOOP;
 RAISE NOTICE 'closure scan: columns scanned %, seconds %', cols, round(extract(epoch FROM clock_timestamp()-t0));
END $$;
\echo --- closure scan VERDICT for this database: columns that name a rejected row (expect 0)
SELECT current_database() AS db, (SELECT count(*) FROM ids) AS ids_loaded, count(*) AS columns_with_refs, coalesce(sum(refs),0) AS refs FROM scan_hit;
SELECT holder_tbl, col, dt, refs, rejected_kinds FROM scan_hit ORDER BY refs DESC, holder_tbl, col;
-- Synapse only: the Matrix accounts of rejected actors (a virtual
-- contributor, a user, an organization). A rejected actor that still has an
-- active Matrix account, an access token or a room membership is a leftover
-- outside the Alkemio database: deactivate it there or keep the actor.
-- Raised first at finding A7 (the 10 virtual contributors).
SELECT to_regclass('public.local_current_membership') IS NOT NULL AND to_regclass('public.users') IS NOT NULL AS is_synapse \gset
\if :is_synapse
CREATE TEMP TABLE mu AS SELECT u.name, i.kinds, u.deactivated, u.creation_ts FROM users u JOIN ids i ON i.id = substring(u.name from '^@([0-9a-f-]{36}):');
\echo --- Matrix accounts of rejected actors, by kind (expect no rows, or every count 0 after the ruling)
SELECT m.kinds, count(*) AS matrix_users, count(*) FILTER (WHERE m.deactivated=1) AS deactivated,
  to_timestamp(min(m.creation_ts))::date AS first_created, to_timestamp(max(m.creation_ts))::date AS last_created,
  (SELECT count(*) FROM access_tokens t WHERE t.user_id IN (SELECT name FROM mu x WHERE x.kinds=m.kinds)) AS access_tokens,
  (SELECT to_timestamp(max(d.last_seen)/1000)::date FROM devices d WHERE d.user_id IN (SELECT name FROM mu x WHERE x.kinds=m.kinds)) AS device_last_seen,
  (SELECT count(*) FROM events e WHERE e.sender IN (SELECT name FROM mu x WHERE x.kinds=m.kinds) AND e.type='m.room.message') AS messages_sent,
  (SELECT to_timestamp(max(e.origin_server_ts)/1000)::date FROM events e WHERE e.sender IN (SELECT name FROM mu x WHERE x.kinds=m.kinds)) AS last_event
FROM mu m GROUP BY 1 ORDER BY 2 DESC;
\echo --- Matrix accounts of rejected actors: current room memberships
SELECT m.kinds, l.membership, count(*) AS memberships,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM local_current_membership o WHERE o.room_id=l.room_id AND o.membership='join' AND o.user_id NOT IN (SELECT name FROM mu))) AS in_rooms_with_other_joined_members,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM events e WHERE e.room_id=l.room_id AND e.type='m.room.message')) AS in_rooms_with_messages
FROM local_current_membership l JOIN mu m ON m.name=l.user_id GROUP BY 1,2 ORDER BY 1,2;
-- A10: the chat server side of the rejected rooms. Needs /tmp/a10-rooms.txt
-- written by the "A10 G9" guard of script 30. A rejected room whose Matrix
-- room still has joined members is a leftover outside the Alkemio database.
\set has_a10 `test -f /tmp/a10-rooms.txt && echo true || echo false`
\if :has_a10
CREATE TEMP TABLE a10r (id text, rule text, type text, msgs int, created date);
\copy a10r from '/tmp/a10-rooms.txt' with (format csv, delimiter '|')
CREATE TEMP TABLE a10m AS SELECT a.*, ra.room_id FROM a10r a LEFT JOIN room_aliases ra ON ra.room_alias LIKE '%'||a.id||'%';
\echo --- A10 S1: Matrix rooms of rejected rooms (expect with_joined_members 0 before the rows are rejected, or a Matrix clean-up pass in the plan)
SELECT rule, type, count(*) AS rooms, count(room_id) AS with_matrix_room,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM local_current_membership m WHERE m.room_id=a10m.room_id AND m.membership='join')) AS with_joined_members,
       coalesce(sum((SELECT count(*) FROM local_current_membership m WHERE m.room_id=a10m.room_id AND m.membership='join')),0) AS joined_members,
       sum(msgs) AS alkemio_messages, coalesce(sum((SELECT count(*) FROM events e WHERE e.room_id=a10m.room_id AND e.type='m.room.message')),0) AS matrix_messages,
       to_timestamp(max((SELECT max(e.origin_server_ts) FROM events e WHERE e.room_id=a10m.room_id))/1000)::date AS last_event
  FROM a10m GROUP BY 1,2 ORDER BY 1,2;
\copy (SELECT a.id, a.rule, a.type, substring(m.user_id from '^@([0-9a-f-]{36}):') FROM a10m a JOIN local_current_membership m ON m.room_id=a.room_id AND m.membership='join') to '/tmp/a10-members.txt' with (format csv, delimiter '|')
\endif
\endif
