-- A3 Matrix check on the acceptance Synapse backup of 2026-11-11 (side database acc_synapse).
-- Input: room id lists from 34-a3-callouts-and-rooms.out and room/actor/user exports of the acceptance alkemio copy.
\set ON_ERROR_STOP on
CREATE TEMP TABLE a3(owner text, rid text, created date);
\copy a3 FROM '/tmp/acc-x/a3rooms.csv' CSV
CREATE TEMP TABLE orp(rtype text, rid text, created date);
\copy orp FROM '/tmp/acc-x/orphanrooms.csv' CSV
CREATE TEMP TABLE alkr(id text, rtype text, msgs int, created timestamptz);
\copy alkr FROM '/tmp/acc-x/alk-rooms.csv' CSV
CREATE TEMP TABLE alka(id text);
\copy alka FROM '/tmp/acc-x/alk-actors.csv' CSV
CREATE TEMP TABLE alku(id text);
\copy alku FROM '/tmp/acc-x/alk-users.csv' CSV
CREATE TEMP TABLE sr AS SELECT r.room_id, r.creator, substring(a.room_alias from '^#([0-9a-f-]{36}):') alias_uuid FROM rooms r LEFT JOIN room_aliases a ON a.room_id=r.room_id;
CREATE INDEX ON sr(alias_uuid); CREATE INDEX ON sr(room_id);
CREATE TEMP TABLE rs AS
 SELECT sr.room_id, sr.alias_uuid,
  (SELECT count(*) FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join') joined,
  (SELECT count(*) FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join' AND EXISTS (SELECT 1 FROM alku u WHERE u.id=substring(m.user_id from '^@([0-9a-f-]{36}):'))) joined_users,
  (SELECT count(*) FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='join' AND NOT EXISTS (SELECT 1 FROM alka u WHERE u.id=substring(m.user_id from '^@([0-9a-f-]{36}):'))) joined_unknown,
  (SELECT count(*) FROM local_current_membership m WHERE m.room_id=sr.room_id AND m.membership='invite') invites,
  (SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message') msg_events,
  (SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.room.message' AND NOT EXISTS (SELECT 1 FROM redactions rd WHERE rd.redacts=x.event_id)) msgs_live,
  (SELECT count(*) FROM events x WHERE x.room_id=sr.room_id AND x.type='m.reaction') reactions,
  (SELECT max(to_timestamp(x.origin_server_ts/1000))::date FROM events x WHERE x.room_id=sr.room_id) last_event,
  (SELECT count(*) FROM current_state_events c WHERE c.room_id=sr.room_id AND c.type='m.space.parent') parents
 FROM sr;
\echo ===== M0 scale
SELECT (SELECT count(*) FROM rooms) syn_rooms, (SELECT count(*) FROM sr WHERE alias_uuid IS NOT NULL) with_uuid_alias, (SELECT count(*) FROM alkr) alk_rooms, (SELECT max(to_timestamp(received_ts/1000)) FROM events) newest_event;
\echo ===== M1 the 21 A3 rooms: Matrix room present, members, invites, messages
SELECT a.owner, count(*) rooms, count(rs.room_id) in_matrix, sum(rs.joined) joined, sum(rs.joined_users) joined_users, sum(rs.joined_unknown) joined_not_actor, sum(rs.invites) invites, sum(rs.msg_events) msg_events, sum(rs.msgs_live) msgs_live, sum(rs.reactions) reactions, max(rs.last_event) last_event, sum(rs.parents) space_parents FROM a3 a LEFT JOIN rs ON rs.alias_uuid=a.rid GROUP BY ROLLUP(1) ORDER BY 1;
\echo ===== M1b the 21: distribution of joined member count and who the members are
SELECT rs.joined, rs.joined_users, count(*) rooms FROM a3 a JOIN rs ON rs.alias_uuid=a.rid GROUP BY 1,2 ORDER BY 1,2;
SELECT CASE WHEN m.user_id LIKE '@00000000-%' THEN 'adapter-like id' WHEN u.id IS NOT NULL THEN 'alkemio user' WHEN ac.id IS NOT NULL THEN 'other alkemio actor' WHEN substring(m.user_id from '^@([0-9a-f-]{36}):') IS NULL THEN 'non-uuid name' ELSE 'uuid not in alkemio' END who, m.membership, count(*) memberships, count(DISTINCT m.user_id) distinct_members FROM a3 a JOIN rs ON rs.alias_uuid=a.rid JOIN local_current_membership m ON m.room_id=rs.room_id LEFT JOIN alku u ON u.id=substring(m.user_id from '^@([0-9a-f-]{36}):') LEFT JOIN alka ac ON ac.id=substring(m.user_id from '^@([0-9a-f-]{36}):') GROUP BY 1,2 ORDER BY 3 DESC;
\echo ===== M1c the 21: creator of the Matrix room, and events by type
SELECT CASE WHEN sr.creator LIKE '@00000000-%' THEN 'adapter-like id' WHEN substring(sr.creator from '^@([0-9a-f-]{36}):') IS NULL THEN 'non-uuid name' ELSE 'uuid user' END creator, count(*) FROM a3 a JOIN sr ON sr.alias_uuid=a.rid GROUP BY 1;
SELECT e.type, count(*) FROM a3 a JOIN sr ON sr.alias_uuid=a.rid JOIN events e ON e.room_id=sr.room_id GROUP BY 1 ORDER BY 2 DESC;
\echo ===== M1d the 21: Matrix space parent, does the parent space map to a live alkemio actor
SELECT (p.alias_uuid IS NOT NULL) parent_has_alias, (ac.id IS NOT NULL) parent_is_live_actor, count(*) FROM a3 a JOIN sr ON sr.alias_uuid=a.rid JOIN current_state_events c ON c.room_id=sr.room_id AND c.type='m.space.parent' LEFT JOIN sr p ON p.room_id=c.state_key LEFT JOIN alka ac ON ac.id=p.alias_uuid GROUP BY 1,2;
\echo ===== M2 all 47 orphaned rooms by type
SELECT o.rtype, count(*) rooms, count(rs.room_id) in_matrix, sum(k.msgs) alk_msgs, sum(rs.msg_events) msg_events, sum(rs.msgs_live) msgs_live, sum(rs.joined) joined, sum(rs.joined_users) joined_users, sum(rs.joined_unknown) joined_not_actor, sum(rs.invites) invites, max(rs.last_event) last_event FROM orp o LEFT JOIN rs ON rs.alias_uuid=o.rid LEFT JOIN alkr k ON k.id=o.rid GROUP BY ROLLUP(1) ORDER BY 1;
\echo ===== M2b the 47: who the members are
SELECT o.rtype, CASE WHEN m.user_id LIKE '@00000000-%' THEN 'adapter-like id' WHEN u.id IS NOT NULL THEN 'alkemio user' WHEN ac.id IS NOT NULL THEN 'other alkemio actor' ELSE 'not in alkemio' END who, m.membership, count(*) memberships, count(DISTINCT m.user_id) distinct_members FROM orp o JOIN rs ON rs.alias_uuid=o.rid JOIN local_current_membership m ON m.room_id=rs.room_id LEFT JOIN alku u ON u.id=substring(m.user_id from '^@([0-9a-f-]{36}):') LEFT JOIN alka ac ON ac.id=substring(m.user_id from '^@([0-9a-f-]{36}):') GROUP BY 1,2,3 ORDER BY 1,4 DESC;
\echo ===== M3 whole set, alkemio rooms with no Matrix room, by type and has messages
SELECT k.rtype, (k.msgs>0) has_msgs, count(*), min(k.created)::date, max(k.created)::date FROM alkr k WHERE NOT EXISTS (SELECT 1 FROM sr WHERE sr.alias_uuid=k.id) GROUP BY 1,2 ORDER BY 3 DESC;
\echo ===== M4 whole set, Matrix rooms whose alias is neither a room nor an actor in alkemio
SELECT (rs.alias_uuid IS NULL) no_uuid_alias, count(*) rooms, count(*) FILTER (WHERE rs.joined_users>0) with_live_users, sum(rs.msgs_live) msgs_live, sum(rs.invites) invites FROM rs WHERE NOT EXISTS (SELECT 1 FROM alkr k WHERE k.id=rs.alias_uuid) AND NOT EXISTS (SELECT 1 FROM alka a WHERE a.id=rs.alias_uuid) GROUP BY 1;
\echo ===== M5 whole set, alkemio messagesCount against live Matrix messages
SELECT sign(k.msgs - rs.msgs_live) alk_minus_matrix, count(*) rooms, sum(abs(k.msgs - rs.msgs_live)) total_diff FROM alkr k JOIN rs ON rs.alias_uuid=k.id GROUP BY 1 ORDER BY 1;
SELECT k.rtype, count(*) rooms, sum(k.msgs) alk, sum(rs.msgs_live) matrix FROM alkr k JOIN rs ON rs.alias_uuid=k.id WHERE k.msgs<>rs.msgs_live GROUP BY 1 ORDER BY 2 DESC;
