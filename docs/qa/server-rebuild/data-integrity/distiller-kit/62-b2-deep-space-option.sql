-- 62-b2-deep-space-option.sql: an OPTION for the sub-subspaces that sit under a sub-subspace (finding B2).
-- QA, 2026-11-16. This is not the proposed ruling. The proposed ruling is keep and track (tracked case T32),
-- because where such a space belongs is a product decision that the server code does not answer.
-- The file exists so that the option "attach it to the subspace above" is written down, checked and
-- rehearsed before anybody chooses it. Run it only through rehearse-repair.sh.
-- Words: a top-level space has level 0, a subspace level 1, a sub-subspace level 2. The platform has
-- three levels. A deep space is a sub-subspace whose parent is also a sub-subspace: a fourth level.
-- How a deep space is made (conversion.service.ts:385-478, develop 39d7aff38): turning a subspace into a
-- sub-subspace does not check that it has no sub-subspaces of its own. They stay below it.
-- What the server would do today with the same request in its newer moves: refuse it
-- (conversion.service.ts:794 and :957, "source has children which exceeds max nesting depth").
-- So the server gives no target for the children. Three targets are possible:
--   a. attach the deep space to the subspace above its parent (this file). It becomes a sister of its parent.
--   b. undo the conversion of the parent: the parent becomes a subspace again and the deep space stays below it.
--   c. leave it and track it.
-- What this file writes for option a is what the server writes when it moves a sub-subspace under another
-- subspace (moveSpaceL2ToSpaceL1OrFail, conversion.service.ts:988-1023), less the steps that exist only
-- because that move crosses to another top-level space:
--   S1 space."parentSpaceId"            the subspace above                         (:990)
--   S2 storage parent                   the storage of the subspace above          (:994-995)
--   S3 role set parent and the parent lists of the three roles: the credential of the same role of the
--      subspace above, followed by its own parent list                             (:998-1002, role.set.service.ts:2063-2088)
--   S4 sort position: the moved space becomes the first among its new sisters. The server does this by
--      moving every sister down by one and giving the moved space position 0 (:1015-1021). Here the
--      sisters are not written: the moved space takes a position below the lowest sister (or 0). The
--      order on screen is the same, fewer rows change, and a sister that already sits below 0 cannot
--      end up on the same position as the moved space (positions below 0 exist on acceptance)
--   S5 the stored parent of its access policy: the policy of the subspace above. An authorization reset
--      stores exactly this (space.service.authorization.ts:125-128). The rules inside the policy are NOT
--      rebuilt here: that needs an authorization reset on a running server.
-- Left out on purpose, with the reason:
--   the top-level space of the row       unchanged, the move stays inside one top-level space
--   removal of every role holder         the server does it when the top-level space changes. R0 stops when anybody holds a credential on the space
--   removal of pending invitations       R0 stops when one exists
--   platform access value                the server recomputes it from the new parent. R0 stops unless the old and the new parent hold the same value, so the result is the same
--   the "subspace created" entry in the activity log of the old parent: the server deletes it (:1052). Kept here: it is history and nothing reads it for access
--   the chat server                      it holds its own copy of the tree. Needs its own step (63-b2-chat-tree-xcheck.sh shows the state)
--   the address cache, the search index  running systems
-- R0 stops the file when a case needs a person: the space above the parent is not a subspace of the same
-- top-level space, the deep space has subspaces, anybody holds a credential on it, an invitation or
-- application is pending, the two parents give different platform access, a role of the subspace above is missing.
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: space,role_set,role,storage_aggregator,authorization_policy
\set ON_ERROR_STOP on
\pset footer off
\echo === B2 option: image of the written tables before the change
CREATE TEMP TABLE ro_space AS SELECT * FROM space;
CREATE TEMP TABLE ro_role AS SELECT * FROM role;
CREATE TEMP TABLE ro_rs AS SELECT * FROM role_set;
CREATE TEMP TABLE ro_sa AS SELECT * FROM storage_aggregator;
CREATE TEMP TABLE ro_pol AS SELECT ap.id, ap."parentAuthorizationPolicyId" AS par, md5(ap."credentialRules"::text||ap."privilegeRules"::text) AS rules FROM authorization_policy ap JOIN actor a ON a."authorizationId"=ap.id WHERE a.type='space';
CREATE INDEX ON ro_space (id); CREATE INDEX ON ro_role (id); CREATE INDEX ON ro_rs (id); CREATE INDEX ON ro_sa (id); CREATE INDEX ON ro_pol (id);
ANALYZE ro_space; ANALYZE ro_role; ANALYZE ro_rs; ANALYZE ro_sa; ANALYZE ro_pol;
CREATE TEMP TABLE ro_deep AS
SELECT s.id, s."parentSpaceId" AS old_parent, p."parentSpaceId" AS new_parent, c."roleSetId" AS role_set_id, s."storageAggregatorId" AS storage_id, a."authorizationId" AS policy_id,
       gc."roleSetId" AS new_role_set_id, g."storageAggregatorId" AS new_storage_id, ga."authorizationId" AS new_policy_id
  FROM space s JOIN space p ON p.id=s."parentSpaceId" JOIN actor a ON a.id=s.id LEFT JOIN community c ON c.id=s."communityId"
  LEFT JOIN space g ON g.id=p."parentSpaceId" LEFT JOIN community gc ON gc.id=g."communityId" LEFT JOIN actor ga ON ga.id=g.id
 WHERE s.level=2 AND p.level=2;

\echo === R0: stop when a case needs a person (expected: no error)
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM ro_deep d JOIN space s ON s.id=d.id LEFT JOIN space g ON g.id=d.new_parent
   WHERE g.id IS NULL OR g.level<>1 OR g."levelZeroSpaceID" IS DISTINCT FROM s."levelZeroSpaceID" OR d.role_set_id IS NULL OR d.new_role_set_id IS NULL OR d.storage_id IS NULL OR d.new_storage_id IS NULL OR d.policy_id IS NULL OR d.new_policy_id IS NULL;
  IF n>0 THEN RAISE EXCEPTION 'R0: % deep spaces have no subspace of the same top-level space two steps above, or a part is missing.', n; END IF;
  SELECT count(*) INTO n FROM ro_deep d WHERE EXISTS (SELECT 1 FROM space k WHERE k."parentSpaceId"=d.id);
  IF n>0 THEN RAISE EXCEPTION 'R0: % deep spaces have subspaces of their own.', n; END IF;
  SELECT count(*) INTO n FROM ro_deep d WHERE EXISTS (SELECT 1 FROM credential c WHERE c."resourceID"=d.id::text);
  IF n>0 THEN RAISE EXCEPTION 'R0: somebody holds a credential on % deep spaces. Their roles lean on the old parent. Decide space by space.', n; END IF;
  SELECT count(*) INTO n FROM ro_deep d WHERE EXISTS (SELECT 1 FROM invitation i WHERE i."roleSetId"=d.role_set_id) OR EXISTS (SELECT 1 FROM application i WHERE i."roleSetId"=d.role_set_id) OR EXISTS (SELECT 1 FROM platform_invitation i WHERE i."roleSetId"=d.role_set_id);
  IF n>0 THEN RAISE EXCEPTION 'R0: % deep spaces have an invitation or an application.', n; END IF;
  SELECT count(*) INTO n FROM ro_deep d JOIN space p ON p.id=d.old_parent JOIN space g ON g.id=d.new_parent WHERE p."platformRolesAccess" IS DISTINCT FROM g."platformRolesAccess";
  IF n>0 THEN RAISE EXCEPTION 'R0: for % deep spaces the old and the new parent give different platform access. The server must recompute the value.', n; END IF;
  SELECT count(*) INTO n FROM ro_deep d JOIN role r ON r."roleSetId"=d.role_set_id WHERE NOT EXISTS (SELECT 1 FROM role pr WHERE pr."roleSetId"=d.new_role_set_id AND pr.name=r.name);
  IF n>0 THEN RAISE EXCEPTION 'R0: % roles have no role of the same name in the subspace above.', n; END IF;
END $$;

\echo === S1 and S4: the deep space takes the subspace above as parent and the first position among its new sisters (expected on acceptance: UPDATE 2)
UPDATE space s SET "parentSpaceId"=d.new_parent,
       "sortOrder"=least(0, coalesce((SELECT min(k."sortOrder")-1 FROM ro_space k WHERE k."parentSpaceId"=d.new_parent), 0))
  FROM ro_deep d WHERE s.id=d.id;
\echo === S2: its storage hangs under the storage of the subspace above (expected on acceptance: UPDATE 2)
UPDATE storage_aggregator sa SET "parentStorageAggregatorId"=d.new_storage_id FROM ro_deep d WHERE sa.id=d.storage_id;
\echo === S3: its role set takes the role set of the subspace above as parent (UPDATE 2) and each role takes the parent list the server builds (UPDATE 6)
UPDATE role_set rs SET "parentRoleSetId"=d.new_role_set_id FROM ro_deep d WHERE rs.id=d.role_set_id;
UPDATE role r SET "parentCredentials"=jsonb_build_array(pr.credential) || pr."parentCredentials" FROM ro_deep d, role pr WHERE r."roleSetId"=d.role_set_id AND pr."roleSetId"=d.new_role_set_id AND pr.name=r.name;
\echo === S5: the stored parent of its access policy becomes the policy of the subspace above (expected on acceptance: UPDATE 2)
UPDATE authorization_policy ap SET "parentAuthorizationPolicyId"=d.new_policy_id FROM ro_deep d WHERE ap.id=d.policy_id;

\echo === check 1: the rule on the changed state. Expected: 0 sub-subspaces under a sub-subspace, no chain deeper than 2
WITH RECURSIVE ch AS (SELECT id, "parentSpaceId" AS par, 0 AS d FROM space UNION ALL SELECT ch.id, p."parentSpaceId", ch.d+1 FROM ch JOIN space p ON p.id=ch.par WHERE ch.d<10)
SELECT (SELECT count(*) FROM space s JOIN space p ON p.id=s."parentSpaceId" WHERE s.level>0 AND s.level<>p.level+1) AS sub_subspace_under_sub_subspace,
       (SELECT count(DISTINCT c.id) FROM ch c JOIN space s ON s.id=c.id WHERE c.d>2 AND s.id NOT IN (SELECT k.id FROM space k WHERE k.level=0) AND NOT EXISTS (SELECT 1 FROM space l WHERE l.level=0 AND l."parentSpaceId" IS NOT NULL)) AS chains_deeper_than_two_when_no_top_level_pointer_is_left;

\echo === check 2: which columns changed (expected on acceptance: space parentSpaceId 2 and sortOrder 2, role parentCredentials 6,
\echo ===     role_set parentRoleSetId 2, storage_aggregator parentStorageAggregatorId 2, policy parent 2, policy rules 0. Any other line is a fault)
SELECT 'space' AS tbl, k.key AS col, count(*) AS changed_rows FROM ro_space a JOIN space b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'role', k.key, count(*) FROM ro_role a JOIN role b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'role_set', k.key, count(*) FROM ro_rs a JOIN role_set b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'storage_aggregator', k.key, count(*) FROM ro_sa a JOIN storage_aggregator b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1,2
UNION ALL SELECT 'authorization_policy of a space', 'parentAuthorizationPolicyId', count(*) FROM ro_pol a JOIN authorization_policy b USING (id) WHERE a.par IS DISTINCT FROM b."parentAuthorizationPolicyId"
UNION ALL SELECT 'authorization_policy of a space', 'rules', count(*) FROM ro_pol a JOIN authorization_policy b USING (id) WHERE a.rules IS DISTINCT FROM md5(b."credentialRules"::text||b."privilegeRules"::text)
ORDER BY 1,2;

\echo === check 3: rows changed without cause (expected: 0 on every column)
SELECT (SELECT count(*) FROM ro_space a JOIN space b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT id FROM ro_deep)) AS spaces,
       (SELECT count(*) FROM ro_role a JOIN role b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a."roleSetId" NOT IN (SELECT role_set_id FROM ro_deep)) AS roles,
       (SELECT count(*) FROM ro_rs a JOIN role_set b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT role_set_id FROM ro_deep)) AS role_sets,
       (SELECT count(*) FROM ro_sa a JOIN storage_aggregator b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b) AND a.id NOT IN (SELECT storage_id FROM ro_deep)) AS storage,
       (SELECT count(*) FROM ro_pol a JOIN authorization_policy b USING (id) WHERE a.par IS DISTINCT FROM b."parentAuthorizationPolicyId" AND a.id NOT IN (SELECT policy_id FROM ro_deep)) AS policies;

\echo === check 4: shape. Every sub-subspace against what the server writes for one (the columns of guard B2 G18), changed spaces against never-broken ones.
\echo ===     Expected: the changed spaces sit on a line where every flag is t, and that line also shows never-broken spaces (acceptance: 2 changed)
SELECT (s.level=p.level+1) AS level_is_parent_plus_one, (rs."parentRoleSetId" IS NOT DISTINCT FROM pc."roleSetId") AS role_set_parent_is_parent, (sa."parentStorageAggregatorId" IS NOT DISTINCT FROM p."storageAggregatorId") AS storage_parent_is_parent,
       (ap."parentAuthorizationPolicyId" IS NOT DISTINCT FROM pa."authorizationId") AS policy_parent_is_parent,
       NOT EXISTS (SELECT 1 FROM role r LEFT JOIN role pr ON pr."roleSetId"=pc."roleSetId" AND pr.name=r.name WHERE r."roleSetId"=rs.id AND r."parentCredentials" IS DISTINCT FROM (jsonb_build_array(pr.credential) || pr."parentCredentials")) AS parent_lists_equal_server_formula,
       (SELECT min(jsonb_array_length(r."parentCredentials"))::text||' to '||max(jsonb_array_length(r."parentCredentials"))::text FROM role r WHERE r."roleSetId"=rs.id) AS entries_in_parent_lists,
       count(*) FILTER (WHERE s.id IN (SELECT id FROM ro_deep)) AS changed, count(*) FILTER (WHERE s.id NOT IN (SELECT id FROM ro_deep)) AS never_broken
  FROM space s JOIN space p ON p.id=s."parentSpaceId" JOIN actor a ON a.id=s.id JOIN actor pa ON pa.id=p.id LEFT JOIN authorization_policy ap ON ap.id=a."authorizationId"
  LEFT JOIN community c ON c.id=s."communityId" LEFT JOIN role_set rs ON rs.id=c."roleSetId" LEFT JOIN community pc ON pc.id=p."communityId" LEFT JOIN storage_aggregator sa ON sa.id=s."storageAggregatorId"
 WHERE s.level=2 GROUP BY 1,2,3,4,5,6 ORDER BY 7 DESC, 8 DESC;

\echo === check 5: who holds which role in which space as the server reads it (through the stored definitions), before against after, every space (expected: lost 0, gained 0)
WITH b AS (SELECT DISTINCT s.id AS space_id, r.name::text AS role_name, c."actorId" AS actor FROM ro_space s JOIN community cm ON cm.id=s."communityId" JOIN ro_role r ON r."roleSetId"=cm."roleSetId" JOIN credential c ON c.type=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID'),
     a AS (SELECT DISTINCT s.id AS space_id, r.name::text AS role_name, c."actorId" AS actor FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" JOIN credential c ON c.type=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID')
SELECT (SELECT count(*) FROM b) AS roles_held_before, (SELECT count(*) FROM a) AS roles_held_after,
       (SELECT count(*) FROM (SELECT * FROM b EXCEPT SELECT * FROM a) x) AS lost, (SELECT count(*) FROM (SELECT * FROM a EXCEPT SELECT * FROM b) x) AS gained;

\echo === check 6: the parent lists of the changed roles, before and after, by where each entry points (expected on acceptance: before 6 lists of 2 entries "old parent, top-level space"; after 6 lists of 2 entries "new parent, top-level space")
SELECT 'before' AS state, jsonb_array_length(o."parentCredentials") AS entries,
       (SELECT string_agg(CASE WHEN e->>'resourceID'=d.old_parent::text THEN 'old parent' WHEN e->>'resourceID'=d.new_parent::text THEN 'new parent' WHEN e->>'resourceID'=s."levelZeroSpaceID"::text THEN 'top-level space' ELSE 'other' END, ', ' ORDER BY ord) FROM jsonb_array_elements(o."parentCredentials") WITH ORDINALITY q(e,ord)) AS points_at, count(*) AS lists
  FROM ro_deep d JOIN space s ON s.id=d.id JOIN ro_role o ON o."roleSetId"=d.role_set_id GROUP BY 1,2,3
UNION ALL
SELECT 'after', jsonb_array_length(r."parentCredentials"),
       (SELECT string_agg(CASE WHEN e->>'resourceID'=d.old_parent::text THEN 'old parent' WHEN e->>'resourceID'=d.new_parent::text THEN 'new parent' WHEN e->>'resourceID'=s."levelZeroSpaceID"::text THEN 'top-level space' ELSE 'other' END, ', ' ORDER BY ord) FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY q(e,ord)), count(*)
  FROM ro_deep d JOIN space s ON s.id=d.id JOIN role r ON r."roleSetId"=d.role_set_id GROUP BY 1,2,3 ORDER BY 1 DESC, 2;

\echo === check 7: sort positions under the subspaces above. Expected: the moved space is alone on its position and is the first; positions held twice under these parents: the same number before and after
SELECT (SELECT count(*) FROM ro_deep d JOIN space s ON s.id=d.id WHERE EXISTS (SELECT 1 FROM space k WHERE k."parentSpaceId"=d.new_parent AND k.id<>d.id AND k."sortOrder"<=s."sortOrder")) AS moved_spaces_not_first_or_not_alone,
       (SELECT count(*) FROM (SELECT k."parentSpaceId", k."sortOrder" FROM ro_space k WHERE k."parentSpaceId" IN (SELECT new_parent FROM ro_deep) GROUP BY 1,2 HAVING count(*)>1) x) AS positions_held_twice_before,
       (SELECT count(*) FROM (SELECT k."parentSpaceId", k."sortOrder" FROM space k WHERE k."parentSpaceId" IN (SELECT new_parent FROM ro_deep) GROUP BY 1,2 HAVING count(*)>1) x) AS positions_held_twice_after;

\echo === check 8: what this file leaves for a running server and for other systems, per changed space (expected on acceptance: 2 spaces; policy rules not rebuilt 2; subspace-created entries left in the old parent log 2)
SELECT count(*) AS changed_spaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ro_pol o JOIN authorization_policy b ON b.id=o.id WHERE o.id=d.policy_id AND o.rules=md5(b."credentialRules"::text||b."privilegeRules"::text))) AS policy_rules_not_rebuilt,
       (SELECT count(*) FROM activity ac JOIN ro_deep x ON ac."resourceID"::text=x.id::text WHERE ac.type='subspace-created') AS subspace_created_entries_left
  FROM ro_deep d;
\echo === B2 option done
