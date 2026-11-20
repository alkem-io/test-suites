-- 61-b2-repair.sql: the two B2 repairs that the second pass confirms (QA proposal, 2026-11-16). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- Words: a top-level space is a space of level 0. A subspace has level 1, a sub-subspace level 2.
-- The parent pointer is the column space."parentSpaceId". The handle is the short name of a space
-- in its web address, the column actor."nameID" of the row with the id of the space.
--
-- R1 A top-level space that still points at a parent: the pointer is cleared (R1a) and its storage is hung
--    under the storage of its account (R1b), which is where the same server step puts it. Nothing else.
--    Target, read from the server (develop 39d7aff38, 2026-11-10):
--      conversion.service.ts:175-181   a space that becomes a top-level space gets level 0, itself as
--                                      top-level space, no parent, the account
--      conversion.service.ts:228-232   the server then takes the space out of the subspace list of its
--                                      old TOP-LEVEL space. When the space was a sub-subspace, its parent
--                                      is a subspace, not that top-level space, so the pointer stays.
--                                      This is the gap that made the row.
--    Why it matters (guard B2 G16):
--      role.set.service.ts:1363-1368   removing a member from a space above revokes that person's
--                                      credentials in every space found below through parent pointers
--      space.service.ts:549-554        a space with subspaces cannot be deleted, so the old parent is locked
--    Why R1b: with the pointer cleared only, the space would look like no other top-level space: a stored
--    policy parent (the mark of a promoted space) together with storage that has no parent. The 4 spaces
--    that were promoted without the fault have their storage under the account (check 4). R1b writes
--    only a storage parent that is empty, and only for the spaces of R1a.
--    Not written by R1, on purpose:
--      role definitions that name another space  finding C8, repair 58 (guard B2 G15 shows them)
--      storage of the other 94 top-level spaces that has no parent: an open item of its own, not B2
--      the stored parent of the access policy    4 top-level spaces that were promoted without the fault
--                                                keep such a stored parent too (check 4). The server does
--                                                not read it for a top-level space
--                                                (space.service.authorization.ts:145-151)
-- R2 Two spaces answer to one handle: the twin that is used less gets the handle plus -1 (or the
--    next free number). Only actor."nameID" of that one row changes.
--    Target, read from the server:
--      naming.service.ts:41-51         a top-level handle must differ from every other top-level handle
--                                      (compared in lower case) and from the restricted words
--      naming.service.ts:28-39         a subspace handle must differ from every other subspace handle
--                                      in the same top-level space, whatever the parent
--      space.service.ts:1079-1110      the server rename writes the handle and nothing else
--      naming.service.ts:225-238       for a taken handle the server itself adds -1, -2, ...
--    Which twin: the ordering of guard B2 G6. The twin with the later last activity keeps the handle,
--    then more activity rows, more callouts, more subspaces, and at a full tie the earlier twin.
--    The new handle is never printed: handles are names. The checks print counts only.
-- R0 stops the file when a case needs a person:
--      a parent chain that loops; a top-level space with a pointer that is not otherwise a finished
--      top-level space (no account, another top-level space, a role set with a parent, roles that inherit);
--      a handle held by three or more spaces; a twin for which no free number or no fitting length exists.
-- Not touched: the two sub-subspaces that sit under a sub-subspace (file 62 holds an option for them,
-- the ruling is keep and track), the two top-level spaces on a restricted word (tracked case T4),
-- every other column and table.
-- Not repaired here, needs a running server or another system: the address cache of the server
-- (space.service.ts:1968-1977 sweeps it after a rename), the search index, an authorization reset.
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: space,actor,storage_aggregator
\set ON_ERROR_STOP on
\pset footer off
\echo === B2 repair: image of space and of the handles before the repair
CREATE TEMP TABLE rb_space AS SELECT * FROM space;
CREATE TEMP TABLE rb_actor AS SELECT a.* FROM actor a WHERE a.type='space';
CREATE TEMP TABLE rb_sa AS SELECT * FROM storage_aggregator;
CREATE INDEX ON rb_sa (id); ANALYZE rb_sa;
CREATE INDEX ON rb_space (id); CREATE INDEX ON rb_actor (id); ANALYZE rb_space; ANALYZE rb_actor;
-- the restricted words of the server for top-level handles: src/common/enums/restricted.space.names.ts on develop of 2026-11-10 (136 words). Update when the server list changes.
CREATE TEMP TABLE rb_restricted (w text PRIMARY KEY);
INSERT INTO rb_restricted VALUES ('404'),('500'),('about'),('access-token'),('admin'),('admin-help'),('alchemy'),('alkemio'),('alkemio-bv'),('alkemiobv'),('alkemio-foundation'),('alkemiofoundation'),('announcements'),('api'),('auth'),('authentication'),('authorization'),('bitcoin'),('calendar'),('callback'),('cherrytwist'),('community'),('confirm'),('confirmation'),('contact'),('contact-us'),('contributors'),('cookie'),('cookie-policy'),('create-account'),('create-space'),('create-subspace'),('create-user'),('create-vc'),('crypto'),('dashboard'),('docs'),('documentation'),('error'),('eula'),('event'),('events'),('fake'),('faq'),('features'),('feedback'),('flows'),('forum'),('free'),('gdpr'),('giveaway'),('graphql'),('graphql-api'),('guides'),('hacker'),('help'),('home'),('hub'),('identity'),('identity-verification'),('initiative'),('innovation-hub'),('innovation-hubs'),('innovation-library'),('innovation-pack'),('innovation-packs'),('landing'),('legal'),('legal-notice'),('legal-terms'),('login'),('logout'),('malware'),('moderator'),('money'),('nda'),('news'),('null'),('oauth'),('office'),('official'),('official-features'),('official-support'),('org'),('organization'),('partners'),('phishing'),('privacy'),('privacy-notice'),('privacy-policy'),('profile'),('project'),('register'),('releases'),('report'),('resources'),('rest'),('restricted'),('root'),('root-admin'),('root-user'),('scam'),('security'),('settings'),('socket'),('space'),('spaces'),('start'),('subspace'),('support'),('support-team'),('system'),('team'),('terms'),('terms-and-conditions'),('terms-of-service'),('test'),('timeline'),('token'),('undefined'),('updates'),('user'),('validate'),('validation'),('vc'),('verify'),('verify-account'),('verify-email'),('verify-identity'),('verify-phone'),('virtual-contributor'),('virtualcontributor'),('virtual-contributors'),('websocket'),('workspace'),('ws');
-- R1 targets
CREATE TEMP TABLE rb_ptr AS SELECT s.id, s."parentSpaceId" AS old_parent, s."storageAggregatorId" AS storage_id, ac."storageAggregatorId" AS account_storage_id
  FROM space s LEFT JOIN account ac ON ac.id=s."accountId" WHERE s.level=0 AND s."parentSpaceId" IS NOT NULL;
-- R2: every member of a duplicate group, with its use (the definitions of guard B2 G6)
CREATE TEMP TABLE rb_tw AS
WITH g AS (
 SELECT s.id, 'top-level'::text AS scope, md5(lower(a."nameID")) AS grp FROM space s JOIN actor a ON a.id=s.id
  WHERE s.level=0 AND lower(a."nameID") IN (SELECT lower(a2."nameID") FROM space s2 JOIN actor a2 ON a2.id=s2.id WHERE s2.level=0 GROUP BY 1 HAVING count(*)>1)
 UNION ALL
 SELECT s.id, 'subspace', md5(s."levelZeroSpaceID"::text||lower(a."nameID")) FROM space s JOIN actor a ON a.id=s.id
  WHERE s.level>0 AND (s."levelZeroSpaceID", lower(a."nameID")) IN (SELECT s2."levelZeroSpaceID", lower(a2."nameID") FROM space s2 JOIN actor a2 ON a2.id=s2.id WHERE s2.level>0 GROUP BY 1,2 HAVING count(*)>1)),
 u AS (
 SELECT g.*, s.level, s."levelZeroSpaceID" AS root, a."nameID" AS h, a."createdDate" AS created,
  (SELECT count(*) FROM space k WHERE k."levelZeroSpaceID"=s.id AND k.id<>s.id) AS tree_subs,
  (SELECT count(*) FROM callout c WHERE c."calloutsSetId"=co."calloutsSetId") AS callouts,
  (SELECT count(*) FROM activity ac WHERE ac."collaborationID"=co.id) AS activity_rows,
  (SELECT max(ac."createdDate")::date FROM activity ac WHERE ac."collaborationID"=co.id) AS last_activity
 FROM g JOIN space s ON s.id=g.id JOIN actor a ON a.id=s.id LEFT JOIN collaboration co ON co.id=s."collaborationId")
SELECT u.*, row_number() OVER (PARTITION BY grp ORDER BY last_activity DESC NULLS LAST, activity_rows DESC, callouts DESC, tree_subs DESC, created, id) AS rk,
       row_number() OVER (PARTITION BY grp ORDER BY created, id) AS age_rank, count(*) OVER (PARTITION BY grp) AS in_group FROM u;
CREATE TEMP TABLE rb_ren AS SELECT t.id, t.scope, t.grp, t.level, t.root, t.h AS old_h, NULL::text AS new_h, t.age_rank FROM rb_tw t WHERE t.rk>1;

\echo === R0: stop when a case needs a person (expected: no error)
DO $$
DECLARE n int;
BEGIN
  WITH RECURSIVE ch AS (SELECT id, "parentSpaceId" AS par, 0 AS d FROM space UNION ALL SELECT ch.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10)
  SELECT count(DISTINCT id) INTO n FROM ch WHERE d>=10;
  IF n>0 THEN RAISE EXCEPTION 'R0: % spaces sit in a parent chain that loops or is deeper than 10. Read guard B2 G10 first.', n; END IF;
  SELECT count(*) INTO n FROM rb_ptr t JOIN space s ON s.id=t.id LEFT JOIN community c ON c.id=s."communityId" LEFT JOIN role_set rs ON rs.id=c."roleSetId"
   WHERE s."accountId" IS NULL OR s."levelZeroSpaceID" IS DISTINCT FROM s.id OR rs.id IS NULL OR rs."parentRoleSetId" IS NOT NULL
      OR EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND jsonb_array_length(r."parentCredentials")>0)
      OR EXISTS (SELECT 1 FROM space k WHERE k."parentSpaceId"=s.id AND (k.level<>1 OR k."levelZeroSpaceID" IS DISTINCT FROM s.id));
  IF n>0 THEN RAISE EXCEPTION 'R0: % top-level spaces with a parent pointer are not otherwise finished top-level spaces. Clearing the pointer is not enough for them. Read guard B2 G15.', n; END IF;
  SELECT count(*) INTO n FROM rb_tw WHERE in_group>2;
  IF n>0 THEN RAISE EXCEPTION 'R0: % spaces sit in a handle group of three or more. Decide by hand which one keeps the handle.', n; END IF;
END $$;

\echo === R1a: the parent pointer of a top-level space is cleared (expected on acceptance: UPDATE 1)
UPDATE space s SET "parentSpaceId"=NULL FROM rb_ptr t WHERE s.id=t.id;
\echo === R1b: its storage, when it has no parent, is hung under the storage of its account (expected on acceptance: UPDATE 1)
UPDATE storage_aggregator sa SET "parentStorageAggregatorId"=t.account_storage_id FROM rb_ptr t WHERE sa.id=t.storage_id AND sa."parentStorageAggregatorId" IS NULL AND t.account_storage_id IS NOT NULL;

\echo === R2: the twin that is used less gets the next free handle, built the way the server builds it (expected on acceptance: 6 handles)
DO $$
DECLARE t record; cand text; i int;
BEGIN
  FOR t IN SELECT * FROM rb_ren ORDER BY grp, id LOOP
    i := 1;
    LOOP
      cand := t.old_h || '-' || i::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM space x JOIN actor xa ON xa.id=x.id
                             WHERE x.id<>t.id AND ((t.level=0 AND x.level=0 AND lower(xa."nameID")=lower(cand)) OR (t.level>0 AND x.level>0 AND x."levelZeroSpaceID"=t.root AND lower(xa."nameID")=lower(cand))))
                AND NOT (t.level=0 AND lower(cand) IN (SELECT w FROM rb_restricted));
      i := i + 1;
      IF i > 99 THEN RAISE EXCEPTION 'R0: no free number below 100 for a twin. Decide by hand.'; END IF;
    END LOOP;
    IF length(cand) > 28 THEN RAISE EXCEPTION 'R0: a new handle would be longer than 28 characters, the most the server accepts (scalar.nameid.ts:11). Decide by hand.'; END IF;
    UPDATE actor SET "nameID"=cand WHERE id=t.id;
    UPDATE rb_ren SET new_h=cand WHERE id=t.id;
  END LOOP;
END $$;

\echo === check 1: the rules on the repaired state. Expected: all 0 except sub_subspace_under_sub_subspace (2 on acceptance, kept on purpose) and restricted_word (2, tracked case T4)
WITH RECURSIVE ch AS (SELECT id, id AS cur, "parentSpaceId" AS par, 0 AS d FROM space UNION ALL SELECT ch.id, p.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10)
SELECT (SELECT count(*) FROM space WHERE level=0 AND "parentSpaceId" IS NOT NULL) AS top_level_with_a_parent,
       (SELECT count(*) FROM ch JOIN space s ON s.id=ch.id WHERE ch.par IS NULL AND s."levelZeroSpaceID" IS DISTINCT FROM ch.cur) AS top_level_space_is_not_the_top_of_the_chain,
       (SELECT count(*) FROM space s JOIN space p ON p.id=s."parentSpaceId" WHERE s.level>0 AND s.level<>p.level+1) AS sub_subspace_under_sub_subspace,
       (SELECT count(*) FROM (SELECT 1 FROM space s JOIN actor a ON a.id=s.id WHERE s.level=0 GROUP BY lower(a."nameID") HAVING count(*)>1) x) AS top_level_handles_held_twice,
       (SELECT count(*) FROM (SELECT 1 FROM space s JOIN actor a ON a.id=s.id WHERE s.level>0 GROUP BY s."levelZeroSpaceID", lower(a."nameID") HAVING count(*)>1) x) AS subspace_handles_held_twice;

\echo === check 2: which columns changed (expected on acceptance: space parentSpaceId 1, storage_aggregator parentStorageAggregatorId 1, actor nameID 6. Any other line is a fault)
SELECT 'space' AS tbl, k.key AS col, count(*) AS changed_rows FROM rb_space a JOIN space b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL
SELECT 'storage_aggregator', k.key, count(*) FROM rb_sa a JOIN storage_aggregator b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL
SELECT 'actor', k.key, count(*) FROM rb_actor a JOIN actor b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2 ORDER BY 1,2;

\echo === check 3: rows gone or new, and rows changed without cause (expected: 0 on every column)
SELECT (SELECT count(*) FROM rb_space a WHERE NOT EXISTS (SELECT 1 FROM space b WHERE b.id=a.id)) AS spaces_gone,
       (SELECT count(*) FROM space b WHERE NOT EXISTS (SELECT 1 FROM rb_space a WHERE a.id=b.id)) AS spaces_new,
       (SELECT count(*) FROM rb_space a JOIN space b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT id FROM rb_ptr)) AS spaces_changed_without_cause,
       (SELECT count(*) FROM rb_sa a JOIN storage_aggregator b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT storage_id FROM rb_ptr)) AS storage_changed_without_cause,
       (SELECT count(*) FROM rb_sa a WHERE NOT EXISTS (SELECT 1 FROM storage_aggregator b WHERE b.id=a.id))+(SELECT count(*) FROM storage_aggregator b WHERE NOT EXISTS (SELECT 1 FROM rb_sa a WHERE a.id=b.id)) AS storage_rows_gone_or_new,
       (SELECT count(*) FROM rb_actor a JOIN actor b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT id FROM rb_ren)) AS handles_changed_without_cause,
       (SELECT count(*) FROM rb_actor a JOIN actor b USING (id) JOIN rb_tw t ON t.id=a.id WHERE t.rk=1 AND a."nameID" IS DISTINCT FROM b."nameID") AS kept_twins_that_changed;

\echo === check 4: shape of R1. The repaired top-level space against top-level spaces that never had the fault (expected: every line with repaired spaces also shows never-broken spaces.
\echo ===     On acceptance the repaired space sits with the 4 spaces that were promoted without the fault: a stored policy parent, storage under the account)
SELECT (s."parentSpaceId" IS NULL) AS no_parent, (s."accountId" IS NOT NULL) AS has_account, (s."levelZeroSpaceID"=s.id) AS root_is_itself, (rs."parentRoleSetId" IS NULL) AS role_set_no_parent,
       NOT EXISTS (SELECT 1 FROM role r WHERE r."roleSetId"=rs.id AND jsonb_array_length(r."parentCredentials")>0) AS roles_inherit_from_nobody,
       (ap."parentAuthorizationPolicyId" IS NOT NULL) AS policy_keeps_a_stored_parent,
       CASE WHEN sa."parentStorageAggregatorId" IS NULL THEN 'none' WHEN sa."parentStorageAggregatorId"=acs."storageAggregatorId" THEN 'its account' ELSE 'other' END AS storage_parent,
       count(*) FILTER (WHERE s.id IN (SELECT id FROM rb_ptr)) AS repaired, count(*) FILTER (WHERE s.id NOT IN (SELECT id FROM rb_ptr)) AS never_broken
  FROM space s JOIN actor a ON a.id=s.id LEFT JOIN authorization_policy ap ON ap.id=a."authorizationId" LEFT JOIN community c ON c.id=s."communityId" LEFT JOIN role_set rs ON rs.id=c."roleSetId"
  LEFT JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId" LEFT JOIN account acs ON acs.id=s."accountId" WHERE s.level=0 GROUP BY 1,2,3,4,5,6,7 ORDER BY 8 DESC, 9 DESC;
\echo ===     storage of the repaired space: its place in the storage tree before and after (expected on acceptance: 2 storage rows below it before and after; before no parent, after the account)
SELECT (SELECT count(*) FROM rb_sa k JOIN rb_ptr t ON k."parentStorageAggregatorId"=t.storage_id) AS storage_rows_below_before, (SELECT count(*) FROM storage_aggregator k JOIN rb_ptr t ON k."parentStorageAggregatorId"=t.storage_id) AS storage_rows_below_after,
       (SELECT count(*) FROM rb_sa k JOIN rb_ptr t ON k.id=t.storage_id WHERE k."parentStorageAggregatorId" IS NULL) AS without_parent_before,
       (SELECT count(*) FROM storage_aggregator k JOIN rb_ptr t ON k.id=t.storage_id WHERE k."parentStorageAggregatorId"=t.account_storage_id) AS under_its_account_after,
       (SELECT count(*) FROM storage_aggregator k JOIN rb_ptr t ON k.id=t.account_storage_id WHERE k.type='account') AS new_parent_is_an_account_storage;

\echo === check 5: what R1 changes for the server walk down the tree (role.set.service.ts:1363, space.service.ts:549). Expected on acceptance: before 3 spaces reached from the old parent through the pointer, after 0;
\echo ===     subspaces of the repaired space before 2, after 2; subspaces of the old parent before 3, after 2
WITH RECURSIVE b0 AS (SELECT t.old_parent AS top, t.id FROM rb_ptr t UNION ALL SELECT b0.top, k.id FROM b0 JOIN rb_space k ON k."parentSpaceId"=b0.id),
 a0 AS (SELECT t.old_parent AS top, k.id FROM rb_ptr t JOIN space k ON k."parentSpaceId"=t.old_parent UNION ALL SELECT a0.top, k.id FROM a0 JOIN space k ON k."parentSpaceId"=a0.id)
SELECT (SELECT count(*) FROM b0) AS reached_through_the_pointer_before,
       (SELECT count(*) FROM a0 WHERE id IN (SELECT id FROM b0)) AS reached_through_the_pointer_after,
       (SELECT count(*) FROM rb_space k JOIN rb_ptr t ON k."parentSpaceId"=t.id) AS subspaces_of_repaired_before, (SELECT count(*) FROM space k JOIN rb_ptr t ON k."parentSpaceId"=t.id) AS subspaces_of_repaired_after,
       (SELECT count(*) FROM rb_space k JOIN rb_ptr t ON k."parentSpaceId"=t.old_parent) AS subspaces_of_old_parent_before, (SELECT count(*) FROM space k JOIN rb_ptr t ON k."parentSpaceId"=t.old_parent) AS subspaces_of_old_parent_after;

\echo === check 6: R2, per renamed twin (expected on acceptance: 6 lines; number 1 everywhere; every flag t; the earlier twin is renamed in exactly 1 pair)
SELECT r.scope, left(r.grp,6) AS grp, r.level, r.age_rank=1 AS is_the_earlier_twin, r.new_h = r.old_h || '-1' AS got_number_1, length(r.new_h) AS new_length, length(r.new_h)<=28 AS fits_28,
       r.new_h ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AS passes_strict_rule,
       (SELECT count(*) FROM space x JOIN actor xa ON xa.id=x.id WHERE lower(xa."nameID")=lower(r.new_h) AND ((r.level=0 AND x.level=0) OR (r.level>0 AND x.level>0 AND x."levelZeroSpaceID"=r.root)))=1 AS new_handle_held_once,
       (SELECT count(*) FROM space x JOIN actor xa ON xa.id=x.id WHERE lower(xa."nameID")=lower(r.old_h) AND ((r.level=0 AND x.level=0) OR (r.level>0 AND x.level>0 AND x."levelZeroSpaceID"=r.root)))=1 AS old_handle_held_once_now,
       (SELECT k.rk=1 FROM rb_tw k JOIN actor ka ON ka.id=k.id WHERE k.grp=r.grp AND ka."nameID"=r.old_h) AS old_handle_stays_with_the_used_twin
  FROM rb_ren r ORDER BY r.scope DESC, r.grp;

\echo === check 7: shape of R2. Handles by level and by ending, after the repair: a renamed handle joins the handles that already end in a hyphen and a number, the form the server gives a taken handle (expected on acceptance: renamed 3, 1, 2 in the lines that end in a number)
SELECT s.level, (a."nameID" ~ '-[0-9]+$') AS ends_in_a_number, count(*) FILTER (WHERE s.id IN (SELECT id FROM rb_ren)) AS renamed, count(*) FILTER (WHERE s.id NOT IN (SELECT id FROM rb_ren)) AS never_renamed
  FROM space s JOIN actor a ON a.id=s.id GROUP BY 1,2 ORDER BY 1,2;

\echo === check 8: what changes address with a renamed twin, and stored links to the old address (expected on acceptance: 6 subspaces, 47 callouts in the twins plus those of their subspaces, 0 stored links)
SELECT (SELECT count(*) FROM space k JOIN rb_ren r ON k.id<>r.id AND (k."levelZeroSpaceID"=r.id OR k."parentSpaceId"=r.id)) AS subspaces_changing_address,
       (SELECT count(*) FROM rb_ren r JOIN space s ON s.id=r.id JOIN collaboration co ON co.id=s."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId") AS callouts_in_the_twins,
       (SELECT count(*) FROM rb_ren r JOIN space k ON k.id<>r.id AND (k."levelZeroSpaceID"=r.id OR k."parentSpaceId"=r.id) JOIN collaboration co ON co.id=k."collaborationId" JOIN callout c ON c."calloutsSetId"=co."calloutsSetId") AS callouts_in_their_subspaces,
       (SELECT count(*) FROM rb_ren r JOIN reference f ON f.uri ~* ('alkem\.io/([^?#]*/)?' || r.old_h || '([/?#]|$)') WHERE r.level=0) AS stored_links_naming_an_old_top_level_handle;
\echo === B2 repair done
