\echo === S-schema version
SELECT version, upgraded FROM schema_version; SELECT max(version) FROM applied_schema_deltas;
\echo === S-appservice
SELECT * FROM application_services_state; SELECT * FROM appservice_stream_position;
\echo === S-users by type
SELECT appservice_id, user_type, deactivated, is_guest, admin, approved, locked, suspended, count(*) FROM users GROUP BY 1,2,3,4,5,6,7,8 ORDER BY 9 DESC;
\echo === S-user name shapes
SELECT substring(name from '^@([a-z]+)') prefix, count(*) FROM users GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
SELECT name FROM users ORDER BY creation_ts DESC LIMIT 5;
\echo === S-users per year
SELECT to_timestamp(creation_ts)::date d FROM users WHERE creation_ts IS NOT NULL ORDER BY 1 LIMIT 1;
SELECT date_trunc('year', to_timestamp(creation_ts))::date yr, count(*) FROM users GROUP BY 1 ORDER BY 1;
\echo === S1 users without profile / profiles without user
SELECT count(*) FROM users u WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.full_user_id=u.name OR '@'||p.user_id||':'||split_part(u.name,':',2)=u.name);
SELECT count(*) FROM profiles p WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name=p.full_user_id);
\echo === S2 users with password hash (should be appservice-only?)
SELECT (password_hash IS NOT NULL) has_pw, (appservice_id IS NOT NULL) via_as, count(*) FROM users GROUP BY 1,2;
\echo === S-rooms count/version/public
SELECT room_version, is_public, count(*) FROM rooms GROUP BY 1,2 ORDER BY 3 DESC;
\echo === S3 rooms without creator / creator not a local user
SELECT count(*) FILTER (WHERE creator IS NULL) no_creator, count(*) FILTER (WHERE creator IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.name=r.creator)) creator_not_user FROM rooms r;
\echo === S-rooms creators
SELECT creator, count(*) FROM rooms GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
\echo === S4 aliases: dangling, rooms without alias, multiple aliases
SELECT count(*) FROM room_aliases a WHERE NOT EXISTS (SELECT 1 FROM rooms r WHERE r.room_id=a.room_id);
SELECT count(*) FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM room_aliases a WHERE a.room_id=r.room_id);
SELECT n, count(*) FROM (SELECT room_id, count(*) n FROM room_aliases GROUP BY 1) x GROUP BY 1 ORDER BY 1;
SELECT room_alias FROM room_aliases ORDER BY room_id DESC LIMIT 3;
\echo === S5 current joined members per room distribution
SELECT joined, count(*) FROM (SELECT r.room_id, count(m.user_id) FILTER (WHERE m.membership='join') joined FROM rooms r LEFT JOIN local_current_membership m ON m.room_id=r.room_id GROUP BY 1) x GROUP BY 1 ORDER BY 1 LIMIT 15;
\echo === S6 rooms with zero joined members (abandoned)
SELECT count(*) FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM local_current_membership m WHERE m.room_id=r.room_id AND m.membership='join');
\echo === S7 room_stats_current vs actual joined count mismatch
SELECT count(*) FROM room_stats_current s JOIN (SELECT room_id, count(*) FILTER (WHERE membership='join') j FROM local_current_membership GROUP BY 1) a ON a.room_id=s.room_id WHERE s.joined_members<>a.j;
SELECT count(*) FROM rooms r WHERE NOT EXISTS (SELECT 1 FROM room_stats_current s WHERE s.room_id=r.room_id);
\echo === S8 membership for deactivated users still joined
SELECT count(*) FROM local_current_membership m JOIN users u ON u.name=m.user_id WHERE m.membership='join' AND u.deactivated=1;
\echo === S9 current membership rows pointing to missing room / user
SELECT count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM rooms r WHERE r.room_id=m.room_id)) no_room, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name=m.user_id)) no_user FROM local_current_membership m;
\echo === S10 events in rooms that do not exist
SELECT count(*) FROM events e WHERE NOT EXISTS (SELECT 1 FROM rooms r WHERE r.room_id=e.room_id);
\echo === S-event types
SELECT type, count(*) FROM events GROUP BY 1 ORDER BY 2 DESC LIMIT 15;
\echo === S11 message events by sender class (appservice vs user) / rejected / outlier
SELECT count(*) FILTER (WHERE rejection_reason IS NOT NULL) rejected, count(*) FILTER (WHERE outlier) outliers, count(*) FILTER (WHERE NOT processed) unprocessed FROM events;
\echo === S-messages per year
SELECT date_trunc('year', to_timestamp(origin_server_ts/1000))::date yr, count(*) FROM events WHERE type='m.room.message' GROUP BY 1 ORDER BY 1;
\echo === S12 events without event_json
SELECT count(*) FROM events e WHERE NOT EXISTS (SELECT 1 FROM event_json j WHERE j.event_id=e.event_id);
SELECT count(*) FROM event_json j WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=j.event_id);
\echo === S13 redactions: target missing / not censored
SELECT count(*) total, count(*) FILTER (WHERE NOT have_censored) not_censored, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=r.redacts)) target_missing FROM redactions r;
\echo === S14 access tokens: per user, no device, expired, for deactivated users
SELECT count(*) total, count(*) FILTER (WHERE device_id IS NULL) no_device, count(*) FILTER (WHERE valid_until_ms IS NOT NULL AND valid_until_ms < extract(epoch from now())*1000) expired, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM users u WHERE u.name=t.user_id AND u.deactivated=1)) deactivated_user, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name=t.user_id)) no_user FROM access_tokens t;
SELECT user_id, count(*) FROM access_tokens GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
\echo === S15 access tokens whose device row is missing
SELECT count(*) FROM access_tokens t WHERE t.device_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM devices d WHERE d.user_id=t.user_id AND d.device_id=t.device_id);
\echo === S16 devices per user distribution / devices without tokens
SELECT n, count(*) FROM (SELECT user_id, count(*) n FROM devices GROUP BY 1) x GROUP BY 1 ORDER BY 1 LIMIT 12;
SELECT count(*) FROM devices d WHERE NOT EXISTS (SELECT 1 FROM access_tokens t WHERE t.user_id=d.user_id AND t.device_id=d.device_id);
\echo === S17 media: count, quarantined, by user, without sha
SELECT count(*) total, count(*) FILTER (WHERE quarantined_by IS NOT NULL) quarantined, count(*) FILTER (WHERE sha256 IS NULL) no_sha, sum(media_length) bytes FROM local_media_repository;
SELECT count(*) FROM local_media_repository_thumbnails t WHERE NOT EXISTS (SELECT 1 FROM local_media_repository m WHERE m.media_id=t.media_id);
\echo === S18 user_directory vs users
SELECT count(*) FROM user_directory d WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.name=d.user_id);
SELECT count(*) FROM users u WHERE u.deactivated=0 AND u.appservice_id IS NULL AND NOT EXISTS (SELECT 1 FROM user_directory d WHERE d.user_id=u.name);
\echo === S19 forward extremities >1 per room (state resolution churn)
SELECT n, count(*) FROM (SELECT room_id, count(*) n FROM event_forward_extremities GROUP BY 1) x GROUP BY 1 ORDER BY 1;
\echo === S20 device_lists_changes_in_room size vs rooms (largest table) / converted
SELECT count(*) total, count(*) FILTER (WHERE converted_to_destinations) converted FROM device_lists_changes_in_room;
\echo === S21 state_groups referenced by no event (unreferenced state groups)
SELECT count(*) FROM state_groups g WHERE NOT EXISTS (SELECT 1 FROM event_to_state_groups e WHERE e.state_group=g.id) AND NOT EXISTS (SELECT 1 FROM state_group_edges x WHERE x.prev_state_group=g.id);
\echo === S22 e2e keys and cross-signing on an appservice-driven deployment
SELECT count(*) FROM e2e_one_time_keys_json; SELECT count(DISTINCT user_id) FROM e2e_cross_signing_keys; SELECT count(*) FROM e2e_room_keys;
\echo === S23 threads pointing to missing root events
SELECT count(*) FROM threads t WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=t.thread_id);
\echo === S24 event_relations to missing parents (reactions/edits on deleted)
SELECT relation_type, count(*) FROM event_relations r WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_id=r.relates_to_id) GROUP BY 1;
\echo === S25 room_account_data / receipts for rooms user is not in
SELECT count(*) FROM receipts_linearized r WHERE NOT EXISTS (SELECT 1 FROM rooms x WHERE x.room_id=r.room_id);
\echo === S26 scheduled tasks
SELECT action, status, count(*) FROM scheduled_tasks GROUP BY 1,2;
\echo === S27 user_ips / daily visits last date
SELECT to_timestamp(max(last_seen)/1000)::date FROM user_ips; SELECT max(timestamp) FROM user_daily_visits;
\echo === S28 background updates pending
SELECT update_name, ordering FROM background_updates;
\echo === S29 rooms with pending invites older than 90 days
SELECT count(*) FROM local_current_membership m JOIN events e ON e.event_id=m.event_id WHERE m.membership='invite' AND to_timestamp(e.origin_server_ts/1000) < now()-interval '90 days';
\echo === S-membership state distribution
SELECT membership, count(*) FROM local_current_membership GROUP BY 1;
