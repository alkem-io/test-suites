CREATE TEMP TABLE alkr(id uuid, type text, msgs int, created timestamptz);
\copy alkr FROM 'alk-rooms.csv' CSV
CREATE TEMP TABLE alka(id uuid, nameid text);
\copy alka FROM 'alk-actors.csv' CSV
CREATE TEMP TABLE sr AS SELECT r.room_id, substring(a.room_alias from '^#([0-9a-f-]{36}):') alias_uuid, a.room_alias, (SELECT to_timestamp(min(e.origin_server_ts)/1000) FROM events e WHERE e.room_id=r.room_id) created FROM rooms r LEFT JOIN room_aliases a ON a.room_id=r.room_id;
\echo === D1 rooms aliased by an alkemio actor id: are they Matrix spaces (m.room.create type)?
SELECT (ej.json::jsonb->'content'->>'type') room_type, count(*) FROM sr JOIN alka a ON a.id::text=sr.alias_uuid JOIN current_state_events c ON c.room_id=sr.room_id AND c.type='m.room.create' JOIN event_json ej ON ej.event_id=c.event_id GROUP BY 1;
\echo === D2 dangling-alias rooms (alias uuid matches nothing): year, members, msgs
SELECT date_trunc('year', sr.created)::date yr, count(*), count(*) FILTER (WHERE EXISTS (SELECT 1 FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join' AND m.user_id NOT LIKE '@00000000-%')) with_real_members, sum((SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message')) msgs FROM sr WHERE sr.alias_uuid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM alkr k WHERE k.id::text=sr.alias_uuid) AND NOT EXISTS (SELECT 1 FROM alka a WHERE a.id::text=sr.alias_uuid) GROUP BY 1 ORDER BY 1;
\echo === D3 no-alias rooms: m.room.create type and whether a room name exists
SELECT (ej.json::jsonb->'content'->>'type') room_type, count(*) FROM sr JOIN current_state_events c ON c.room_id=sr.room_id AND c.type='m.room.create' JOIN event_json ej ON ej.event_id=c.event_id WHERE sr.room_alias IS NULL GROUP BY 1;
SELECT left(ej.json::jsonb->'content'->>'name',60) name, count(*) FROM sr JOIN current_state_events c ON c.room_id=sr.room_id AND c.type='m.room.name' JOIN event_json ej ON ej.event_id=c.event_id WHERE sr.room_alias IS NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
\echo === D4 no-alias rooms by month 2026 (ongoing?)
SELECT date_trunc('month', sr.created)::date m, count(*) FROM sr WHERE sr.room_alias IS NULL AND sr.created >= '2026-01-01' GROUP BY 1 ORDER BY 1;
\echo === D5 threads with missing root: rooms exist?
SELECT count(*) total, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM rooms r WHERE r.room_id=t.room_id)) room_exists, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM redactions rd WHERE rd.redacts=t.thread_id)) root_redacted FROM threads t WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=t.thread_id);
SELECT count(*) FROM threads;
\echo === D6 pending invites: distinct rooms / users; inviter; same user joined elsewhere in same period
SELECT count(*) invites, count(DISTINCT room_id) rooms, count(DISTINCT user_id) users FROM local_current_membership WHERE membership='invite';
SELECT e.sender, count(*) FROM local_current_membership m JOIN events e ON e.event_id=m.event_id WHERE m.membership='invite' GROUP BY 1 ORDER BY 2 DESC LIMIT 3;
SELECT (k.type) alk_room_type, count(*) FROM local_current_membership m JOIN sr ON sr.room_id=m.room_id LEFT JOIN alkr k ON k.id::text=sr.alias_uuid WHERE m.membership='invite' GROUP BY 1 ORDER BY 2 DESC;
\echo === D7 pending invites in rooms whose alias is an alkemio actor (space rooms) vs content rooms, by invitee actor type
CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
SELECT (a.id IS NOT NULL) room_is_actor_room, (u.id IS NOT NULL) invitee_is_user, (ac.id IS NOT NULL) invitee_is_actor, count(*) FROM local_current_membership m JOIN sr ON sr.room_id=m.room_id LEFT JOIN alka a ON a.id::text=sr.alias_uuid LEFT JOIN alku u ON u.id::text=substring(m.user_id from '^@([0-9a-f-]{36}):') LEFT JOIN alka ac ON ac.id::text=substring(m.user_id from '^@([0-9a-f-]{36}):') WHERE m.membership='invite' GROUP BY 1,2,3 ORDER BY 4 DESC;
\echo === D8 messagesCount mismatches by room type and direction
SELECT k.type, sign(k.msgs - s.n) dir, count(*), sum(abs(k.msgs-s.n)) delta FROM alkr k JOIN sr ON sr.alias_uuid=k.id::text JOIN LATERAL (SELECT count(*) n FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message' AND NOT EXISTS (SELECT 1 FROM redactions rd WHERE rd.redacts=x.event_id)) s ON true WHERE k.msgs<>s.n GROUP BY 1,2 ORDER BY 3 DESC;
\echo === D9 orphan matrix users (deleted in alkemio): sample names + displaynames count only
SELECT date_trunc('month', to_timestamp(u.creation_ts))::date m, count(*) FROM users u LEFT JOIN alku k ON k.id::text=substring(u.name from '^@([0-9a-f-]{36}):') LEFT JOIN alka a ON a.id::text=substring(u.name from '^@([0-9a-f-]{36}):') WHERE k.id IS NULL AND a.id IS NULL AND u.name LIKE '@%-%' AND to_timestamp(u.creation_ts) >= '2026-01-01' GROUP BY 1 ORDER BY 1;
