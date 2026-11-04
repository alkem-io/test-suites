CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
CREATE TEMP TABLE alkr(id uuid, type text, msgs int, created timestamptz);
\copy alkr FROM 'alk-rooms.csv' CSV
CREATE TEMP TABLE alka(id uuid, nameid text);
\copy alka FROM 'alk-actors.csv' CSV
SELECT (SELECT count(*) FROM alku) users, (SELECT count(*) FROM alkr) rooms, (SELECT count(*) FROM alka) actors;
\echo === X1 synapse users ↔ alkemio: user id / actor id / neither
CREATE TEMP TABLE su AS SELECT name, substring(name from '^@([0-9a-f-]{36}):') uid, deactivated, creation_ts, appservice_id, password_hash IS NOT NULL has_pw FROM users;
SELECT (uid IS NULL) non_uuid, (u.id IS NOT NULL) is_alk_user, (a.id IS NOT NULL) is_alk_actor, s.deactivated, count(*) FROM su s LEFT JOIN alku u ON u.id::text=s.uid LEFT JOIN alka a ON a.id::text=s.uid GROUP BY 1,2,3,4 ORDER BY 5 DESC;
\echo === X1b synapse users with non-uuid names
SELECT name, deactivated, has_pw, to_timestamp(creation_ts)::date FROM su WHERE uid IS NULL;
\echo === X1c synapse users that are neither alkemio user nor actor (deleted in alkemio) by creation year, with profile data left
SELECT date_trunc('year', to_timestamp(s.creation_ts))::date yr, count(*), count(*) FILTER (WHERE p.displayname IS NOT NULL AND p.displayname<>'') with_displayname, count(*) FILTER (WHERE p.avatar_url IS NOT NULL) with_avatar, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM local_current_membership m WHERE m.user_id=s.name AND m.membership='join')) still_joined_somewhere
FROM su s LEFT JOIN alku u ON u.id::text=s.uid LEFT JOIN alka a ON a.id::text=s.uid LEFT JOIN profiles p ON p.full_user_id=s.name WHERE s.uid IS NOT NULL AND u.id IS NULL AND a.id IS NULL GROUP BY 1 ORDER BY 1;
\echo === X1d alkemio users without a synapse user
SELECT count(*), count(*) FILTER (WHERE u.service) service_profiles FROM alku u WHERE NOT EXISTS (SELECT 1 FROM su s WHERE s.uid=u.id::text);
SELECT u.email, u.created::date, u.service FROM alku u WHERE NOT EXISTS (SELECT 1 FROM su s WHERE s.uid=u.id::text) ORDER BY 2;
\echo === X2 synapse rooms ↔ alkemio rooms via alias uuid
CREATE TEMP TABLE sr AS SELECT r.room_id, r.is_public, r.room_version, substring(a.room_alias from '^#([0-9a-f-]{36}):') alias_uuid, a.room_alias FROM rooms r LEFT JOIN room_aliases a ON a.room_id=r.room_id;
SELECT (alias_uuid IS NULL) no_alias, (k.id IS NOT NULL) alias_is_alk_room, (ac.id IS NOT NULL) alias_is_alk_actor, count(*) FROM sr LEFT JOIN alkr k ON k.id::text=sr.alias_uuid LEFT JOIN alka ac ON ac.id::text=sr.alias_uuid GROUP BY 1,2,3 ORDER BY 4 DESC;
\echo === X2b non-uuid aliases sample
SELECT room_alias FROM sr WHERE alias_uuid IS NULL AND room_alias IS NOT NULL LIMIT 10;
\echo === X2c room names: what does m.room.name hold? sample + is it an alkemio room id?
SELECT left(e.content,120) FROM current_state_events c JOIN events e ON e.event_id=c.event_id WHERE c.type='m.room.name' LIMIT 3;
\echo === X2d synapse rooms with no alkemio room (deleted in alkemio): count, members still joined, messages inside, by creation year
SELECT date_trunc('year', to_timestamp(e.origin_server_ts/1000))::date yr, count(*) rooms,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join' AND m.user_id NOT LIKE '@00000000-%')) with_real_members,
  sum((SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message')) messages
FROM sr JOIN events e ON e.room_id=sr.room_id AND e.type='m.room.create' LEFT JOIN alkr k ON k.id::text=sr.alias_uuid LEFT JOIN alka ac ON ac.id::text=sr.alias_uuid WHERE k.id IS NULL AND ac.id IS NULL GROUP BY 1 ORDER BY 1;
\echo === X2e alkemio rooms with no synapse room (reverse) by type / messagesCount>0
SELECT k.type, (k.msgs>0) has_msgs, count(*), min(k.created)::date, max(k.created)::date FROM alkr k WHERE NOT EXISTS (SELECT 1 FROM sr WHERE sr.alias_uuid=k.id::text) GROUP BY 1,2 ORDER BY 3 DESC;
\echo === X2f alkemio messagesCount vs synapse message events (mismatch count)
SELECT sign(k.msgs - s.n) AS alk_minus_syn_sign, count(*) FROM alkr k JOIN sr ON sr.alias_uuid=k.id::text JOIN LATERAL (SELECT count(*) n FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message' AND NOT EXISTS (SELECT 1 FROM redactions rd WHERE rd.redacts=x.event_id)) s ON true GROUP BY 1;
SELECT k.id, k.type, k.msgs alk, s.n syn FROM alkr k JOIN sr ON sr.alias_uuid=k.id::text JOIN LATERAL (SELECT count(*) n FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message' AND NOT EXISTS (SELECT 1 FROM redactions rd WHERE rd.redacts=x.event_id)) s ON true WHERE k.msgs<>s.n ORDER BY abs(k.msgs-s.n) DESC LIMIT 10;
\echo === X3 rooms without alias: age, members, messages
SELECT date_trunc('year', to_timestamp(e.origin_server_ts/1000))::date yr, count(*), sum((SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message')) msgs FROM sr JOIN events e ON e.room_id=sr.room_id AND e.type='m.room.create' WHERE sr.room_alias IS NULL GROUP BY 1 ORDER BY 1;
\echo === X4 zero-joined rooms: alkemio counterpart exists?
SELECT (k.id IS NOT NULL) alk_room_exists, count(*) FROM sr LEFT JOIN alkr k ON k.id::text=sr.alias_uuid WHERE NOT EXISTS (SELECT 1 FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join') GROUP BY 1;
\echo === X5 pending invites >90d: by invitee class (alkemio user still exists?) and year
SELECT date_trunc('year', to_timestamp(e.origin_server_ts/1000))::date yr, (u.id IS NOT NULL) invitee_is_alk_user, count(*) FROM local_current_membership m JOIN events e ON e.event_id=m.event_id LEFT JOIN alku u ON u.id::text=substring(m.user_id from '^@([0-9a-f-]{36}):') WHERE m.membership='invite' GROUP BY 1,2 ORDER BY 1,2;
\echo === X6 deactivated user + its joined rooms; admin users
SELECT name, deactivated, admin, to_timestamp(creation_ts)::date FROM users WHERE deactivated=1 OR admin=1;
\echo === X7 the 142 threads with missing roots: in which rooms (alkemio exists?)
SELECT (k.id IS NOT NULL) alk_room_exists, count(*) FROM threads t JOIN sr ON sr.room_id=t.room_id LEFT JOIN alkr k ON k.id::text=sr.alias_uuid WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=t.thread_id) GROUP BY 1;
\echo === X8 rooms created by non-adapter users
SELECT r.creator, (u.id IS NOT NULL) creator_is_alk_user, r.room_id, sr.room_alias FROM rooms r JOIN sr ON sr.room_id=r.room_id LEFT JOIN alku u ON u.id::text=substring(r.creator from '^@([0-9a-f-]{36}):') WHERE r.creator NOT LIKE '@00000000-%';
\echo === X9 room_stats mismatch sample
SELECT s.room_id, s.joined_members stat, a.j actual FROM room_stats_current s JOIN (SELECT room_id, count(*) FILTER (WHERE membership='join') j FROM local_current_membership GROUP BY 1) a ON a.room_id=s.room_id WHERE s.joined_members<>a.j ORDER BY abs(s.joined_members-a.j) DESC LIMIT 5;
SELECT sign(s.joined_members - a.j), count(*) FROM room_stats_current s JOIN (SELECT room_id, count(*) FILTER (WHERE membership='join') j FROM local_current_membership GROUP BY 1) a ON a.room_id=s.room_id WHERE s.joined_members<>a.j GROUP BY 1;
\echo === X10 messages sent by users that no longer exist in alkemio (PII residue)
SELECT count(*) FROM events e WHERE e.type='m.room.message' AND NOT EXISTS (SELECT 1 FROM alku u WHERE u.id::text=substring(e.sender from '^@([0-9a-f-]{36}):')) AND NOT EXISTS (SELECT 1 FROM alka a WHERE a.id::text=substring(e.sender from '^@([0-9a-f-]{36}):'));
\echo === X11 dump for alkemio-side reverse check
\copy (SELECT alias_uuid FROM sr WHERE alias_uuid IS NOT NULL) TO 'syn-room-alias-uuids.csv' CSV
\copy (SELECT uid FROM su WHERE uid IS NOT NULL) TO 'syn-user-uuids.csv' CSV
