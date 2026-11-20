-- 58-c8-repair.sql: the C8 repair as QA proposes it (2026-11-13). Accepted by the QA lead on 2026-11-16.
-- Run it only through rehearse-repair.sh, which wraps it in BEGIN ... ROLLBACK and
-- then runs the whole classifier on the repaired state.
-- What a role definition is: every space has a role set with three roles (member, lead,
-- admin). Each role row stores the credential a holder of that role carries: a type
-- (space-member, space-lead, space-admin) and the id of the space. The server never reads
-- "who is a member of space S" from the space id: it reads the stored definition and
-- looks for actors holding that credential. In a wrong-scope space the three definitions
-- store the id of ANOTHER space (the named id). Everybody the server treats as member,
-- lead or admin of that space today holds the credential on the named id.
-- Target of every statement is what the server writes today (server develop 39d7aff38,
-- 2026-11-10):
--   space.service.ts:349-355          on creation: community.parentID = space.id and
--                                     updateRoleResourceID(roleSet, space.id): the three definitions take the id of their own space
--   role.set.service.ts:375           updateRoleResourceID writes credential.resourceID of every role of the role set
--   role.set.service.ts:776           assignActorToRole grants the credential read from the stored definition, and for a
--                                     space admin also space-subspace-admin on the id of the PARENT role set admin definition
--   role.set.service.ts:1000-1045     space-invitee is granted and removed on the id of the admin definition of the role set
--   role.set.service.ts:2063          a subspace copies the definitions of its parent into its parent credentials
--   role.service.ts createRole        since 2026-09-11 (commit efb6d8ea82, server PR 6467) each role gets its own copy of the
--                                     definition. Before, all creations shared one object, so creating the next space
--                                     rewrote the id inside the previous one before it was saved for the last time
-- The rule is "follow the definition": after the repair every space gives each role to exactly
-- the actors the server gives it to today. Nothing is granted on a guess, nobody loses a role.
-- R1 the three definitions of a wrong-scope space take the id of their own space.
-- R2 every actor who holds member, lead or admin on the named id gets the same credential on the
--    id of the wrong-scope space (same type, same grant date). The credential on the named id
--    stays: the named space reads it too, today and after the repair.
-- R3 space-subspace-admin on a named id: the holder gets it on the wrong-scope space when the
--    holder is admin of a subspace of it. It is moved (not copied) when the holder is admin of
--    no subspace of the named space, so the credential there never had a cause.
-- R4 space-invitee on a named id moves to the wrong-scope space when the actor has an invitation
--    on its role set and none on the role set of the named space.
-- R5 parent credentials of spaces below a wrong-scope space: an entry that names the named id,
--    where the named id is not a space above, takes the id of the wrong-scope space.
-- R0 stops the repair when a case needs a person: three definitions naming different ids, a role
--    credential on the own id of a wrong-scope space held by somebody the server does not read as
--    holder today, an implied credential that fits two spaces.
-- Not touched: credentials on the named ids (other than the moves of R3 and R4), every other
-- column of role and credential, every other table.
-- Not repaired here: stored authorization policies (they are rebuilt by an authorization reset on
-- a running server, see the README), parent lists that miss the top-level space (guard C8 G13),
-- admin definitions that list a member credential (guard C8 G14, QA register A1).
-- Counts are acceptance counts on the copy of 2026-11-11.
-- touches: role,credential
\set ON_ERROR_STOP on
\pset footer off
\echo === C8 repair: image of role and credential before the repair
CREATE TEMP TABLE rp_role AS SELECT * FROM role;
CREATE TEMP TABLE rp_cred AS SELECT * FROM credential;
CREATE INDEX ON rp_role (id); CREATE INDEX ON rp_cred (id); CREATE INDEX ON rp_cred ("resourceID"); ANALYZE rp_role; ANALYZE rp_cred;
-- the wrong definitions and their spaces
CREATE TEMP TABLE rp_def AS
SELECT s.id AS space_id, s.level, s."parentSpaceId" AS parent_id, c."roleSetId" AS role_set_id, r.id AS role_id, r.name::text AS role_name,
       r.credential->>'type' AS cred_type, r.credential->>'resourceID' AS named_id
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId"
 WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text;
CREATE TEMP TABLE rp_sp AS
SELECT space_id, level, parent_id, role_set_id, min(named_id) AS named_id, count(DISTINCT named_id) AS ids_named, count(*) AS definitions FROM rp_def GROUP BY 1,2,3,4;
-- who holds which role in which space as the server reads it before the repair (through the stored definition), for EVERY space
CREATE TEMP TABLE rp_eff AS
SELECT DISTINCT s.id AS space_id, r.name::text AS role_name, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId"
  JOIN credential c ON c.type=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID';
-- admins of every space before the repair, with the parent of the space
CREATE TEMP TABLE rp_adm AS
SELECT e.space_id, s."parentSpaceId" AS parent_id, e.actor FROM rp_eff e JOIN space s ON s.id=e.space_id WHERE e.role_name='admin';
-- the two implied credentials on a named id, per wrong-scope space that names it
CREATE TEMP TABLE rp_sub AS
SELECT c.id AS cred_id, c."actorId" AS actor, s.space_id, s.named_id,
       EXISTS (SELECT 1 FROM rp_adm a WHERE a.parent_id=s.space_id AND a.actor=c."actorId") AS fits_namer,
       EXISTS (SELECT 1 FROM rp_adm a WHERE a.parent_id::text=s.named_id AND a.actor=c."actorId") AS fits_named
  FROM rp_sp s JOIN rp_cred c ON c.type='space-subspace-admin' AND c."resourceID"=s.named_id;
CREATE TEMP TABLE rp_inv AS
SELECT c.id AS cred_id, c."actorId" AS actor, s.space_id, s.named_id,
       EXISTS (SELECT 1 FROM invitation v WHERE v."roleSetId"=s.role_set_id AND v."invitedActorId"=c."actorId") AS fits_namer,
       EXISTS (SELECT 1 FROM space t JOIN community cm ON cm.id=t."communityId" JOIN invitation v ON v."roleSetId"=cm."roleSetId"
                WHERE t.id::text=s.named_id AND v."invitedActorId"=c."actorId") AS fits_named
  FROM rp_sp s JOIN rp_cred c ON c.type='space-invitee' AND c."resourceID"=s.named_id;
-- parent credential entries that name a named id which is not a space above
CREATE TEMP TABLE rp_pc AS
SELECT r.id AS role_id, ch.id AS space_id, x.ord, x.e->>'resourceID' AS old_id, w.space_id::text AS new_id
  FROM space ch JOIN community cm ON cm.id=ch."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId"
  LEFT JOIN space p ON p.id=ch."parentSpaceId"
  CROSS JOIN LATERAL jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS x(e, ord)
  JOIN rp_sp w ON w.named_id=x.e->>'resourceID' AND w.space_id IN (ch."parentSpaceId", p."parentSpaceId")
 WHERE x.e->>'resourceID' IS DISTINCT FROM ch."parentSpaceId"::text AND x.e->>'resourceID' IS DISTINCT FROM p."parentSpaceId"::text;

\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM rp_sp WHERE ids_named<>1 OR definitions<>3 OR named_id IS NULL OR named_id='') THEN
    RAISE EXCEPTION 'a wrong-scope space whose three definitions do not name one and the same id'; END IF;
  IF EXISTS (SELECT 1 FROM rp_def WHERE cred_type IS DISTINCT FROM 'space-'||role_name) THEN
    RAISE EXCEPTION 'a wrong-scope definition whose credential type does not fit its role'; END IF;
  IF EXISTS (SELECT 1 FROM rp_def d JOIN rp_cred c ON c.type=d.cred_type AND c."resourceID"=d.space_id::text
              WHERE NOT EXISTS (SELECT 1 FROM rp_eff e WHERE e.space_id=d.space_id AND e.role_name=d.role_name AND e.actor=c."actorId")) THEN
    RAISE EXCEPTION 'a role credential on the own id of a wrong-scope space held by an actor the server does not read as holder of that role there'; END IF;
  IF EXISTS (SELECT 1 FROM rp_sp s JOIN rp_cred c ON c."resourceID"=s.named_id WHERE c."actorId" IS NULL AND c.type IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')) THEN
    RAISE EXCEPTION 'a role credential on a named id that belongs to no actor'; END IF;
  IF EXISTS (SELECT 1 FROM rp_sub WHERE fits_namer GROUP BY cred_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'a subspace admin credential that fits two wrong-scope spaces'; END IF;
  IF EXISTS (SELECT 1 FROM rp_inv WHERE fits_namer GROUP BY cred_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'an invitee credential that fits two wrong-scope spaces'; END IF;
  IF EXISTS (SELECT 1 FROM rp_pc GROUP BY role_id, ord HAVING count(*)>1) THEN
    RAISE EXCEPTION 'a parent credential entry with two possible corrections'; END IF;
END $$;

\echo === R1: the three definitions of a wrong-scope space take the id of their own space (expected on acceptance: UPDATE 162, that is 54 spaces)
UPDATE role r SET credential = jsonb_set(r.credential, '{resourceID}', to_jsonb(d.space_id::text)) FROM rp_def d WHERE d.role_id=r.id;

\echo === R2: every holder of member, lead or admin on the named id gets the same credential on the id of the wrong-scope space
\echo ===     (expected on acceptance: INSERT 0 167, that is 170 roles held today less 3 that the holder already has on the own id)
INSERT INTO credential ("createdDate", "updatedDate", version, "resourceID", type, issuer, expires, "actorId")
SELECT DISTINCT ON (d.space_id, c.type, c."actorId") c."createdDate", c."updatedDate", c.version, d.space_id::text, c.type, c.issuer, c.expires, c."actorId"
  FROM rp_def d JOIN rp_cred c ON c.type=d.cred_type AND c."resourceID"=d.named_id
 WHERE NOT EXISTS (SELECT 1 FROM credential x WHERE x.type=c.type AND x."resourceID"=d.space_id::text AND x."actorId"=c."actorId")
 ORDER BY d.space_id, c.type, c."actorId", c."createdDate";

\echo === R3a: subspace admin on a named id, holder is admin of a subspace of BOTH spaces: the wrong-scope space gets a copy (expected on acceptance: INSERT 0 1)
INSERT INTO credential ("createdDate", "updatedDate", version, "resourceID", type, issuer, expires, "actorId")
SELECT c."createdDate", c."updatedDate", c.version, u.space_id::text, c.type, c.issuer, c.expires, c."actorId"
  FROM rp_sub u JOIN rp_cred c ON c.id=u.cred_id
 WHERE u.fits_namer AND u.fits_named
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x.type=c.type AND x."resourceID"=u.space_id::text AND x."actorId"=c."actorId");

\echo === R3b: subspace admin on a named id, holder is admin of a subspace of the wrong-scope space only: the credential moves there (expected on acceptance: UPDATE 18)
UPDATE credential c SET "resourceID" = u.space_id::text FROM rp_sub u
 WHERE u.cred_id=c.id AND u.fits_namer AND NOT u.fits_named
   AND NOT EXISTS (SELECT 1 FROM rp_cred x WHERE x.type='space-subspace-admin' AND x."resourceID"=u.space_id::text AND x."actorId"=u.actor);

\echo === R4: invitee on a named id, the invitation is on the wrong-scope space only: the credential moves there (expected on acceptance: UPDATE 5)
UPDATE credential c SET "resourceID" = u.space_id::text FROM rp_inv u
 WHERE u.cred_id=c.id AND u.fits_namer AND NOT u.fits_named
   AND NOT EXISTS (SELECT 1 FROM rp_cred x WHERE x.type='space-invitee' AND x."resourceID"=u.space_id::text AND x."actorId"=u.actor);

\echo === R5: parent credential entries that name a named id which is not a space above take the id of the wrong-scope space (expected on acceptance: UPDATE 21, one entry in each of 21 definitions of 7 spaces)
UPDATE role r SET "parentCredentials" =
       (SELECT jsonb_agg(CASE WHEN f.new_id IS NOT NULL THEN jsonb_set(x.e, '{resourceID}', to_jsonb(f.new_id)) ELSE x.e END ORDER BY x.ord)
          FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS x(e, ord) LEFT JOIN rp_pc f ON f.role_id=r.id AND f.ord=x.ord)
 WHERE r.id IN (SELECT role_id FROM rp_pc);

CREATE TEMP TABLE rp_eff_after AS
SELECT DISTINCT s.id AS space_id, r.name::text AS role_name, c."actorId" AS actor
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId"
  JOIN credential c ON c.type=r.credential->>'type' AND c."resourceID"=r.credential->>'resourceID';

\echo === check 1: the rule on the repaired state. Expected: 0 definitions name another id, all 5844 space role definitions name their own space, 0 with another credential type
SELECT count(*) FILTER (WHERE r.credential->>'resourceID' IS DISTINCT FROM s.id::text) AS definitions_naming_another_id,
       count(*) FILTER (WHERE r.credential->>'resourceID' = s.id::text) AS definitions_naming_their_own_space,
       count(*) FILTER (WHERE r.credential->>'type' IS DISTINCT FROM 'space-'||r.name::text) AS with_another_credential_type
  FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId";

\echo === check 2: which columns of role changed (expected on acceptance: credential 162, parentCredentials 21. Any other line is a fault)
SELECT k.key AS col, count(*) AS changed_rows FROM rp_role a JOIN role b USING (id), jsonb_each(to_jsonb(a)) k WHERE k.value IS DISTINCT FROM to_jsonb(b)->k.key GROUP BY 1 ORDER BY 1;

\echo === check 3: role rows gone, new, changed without cause, and definition by definition (expected: 0, 0, 0, then 162 with only the id changed and 0 on the rest)
SELECT (SELECT count(*) FROM rp_role a WHERE NOT EXISTS (SELECT 1 FROM role b WHERE b.id=a.id)) AS gone,
       (SELECT count(*) FROM role b WHERE NOT EXISTS (SELECT 1 FROM rp_role a WHERE a.id=b.id)) AS new_rows,
       (SELECT count(*) FROM rp_role a JOIN role b USING (id) WHERE to_jsonb(a) IS DISTINCT FROM to_jsonb(b)
           AND NOT EXISTS (SELECT 1 FROM rp_def d WHERE d.role_id=a.id) AND NOT EXISTS (SELECT 1 FROM rp_pc f WHERE f.role_id=a.id)) AS changed_without_cause,
       (SELECT count(*) FROM rp_def d JOIN rp_role a ON a.id=d.role_id JOIN role b ON b.id=d.role_id
         WHERE b.credential->>'resourceID'=d.space_id::text AND (b.credential - 'resourceID') IS NOT DISTINCT FROM (a.credential - 'resourceID')) AS definitions_with_only_the_id_changed,
       (SELECT count(*) FROM rp_def d JOIN rp_role a ON a.id=d.role_id JOIN role b ON b.id=d.role_id
         WHERE b.credential->>'resourceID' IS DISTINCT FROM d.space_id::text OR (b.credential - 'resourceID') IS DISTINCT FROM (a.credential - 'resourceID')) AS definitions_changed_otherwise,
       (SELECT count(*) FROM rp_def d JOIN rp_role a ON a.id=d.role_id JOIN role b ON b.id=d.role_id
         WHERE (to_jsonb(a) - 'credential') IS DISTINCT FROM (to_jsonb(b) - 'credential')) AS wrong_scope_definitions_with_another_column_changed;

\echo === check 4: the heart of the repair. Who holds which role in which space, as the server reads it, before against after, for every space of the database.
\echo ===     Expected: lost 0 and gained 0 on both lines (acceptance: 170 roles in wrong-scope spaces, 6882 in all other spaces)
SELECT CASE WHEN EXISTS (SELECT 1 FROM rp_sp w WHERE w.space_id=q.space_id) THEN '1 wrong-scope spaces' ELSE '2 all other spaces' END AS spaces,
       count(*) FILTER (WHERE q.b) AS roles_held_before, count(*) FILTER (WHERE q.a) AS roles_held_after,
       count(*) FILTER (WHERE q.b AND NOT q.a) AS lost, count(*) FILTER (WHERE q.a AND NOT q.b) AS gained
  FROM (SELECT coalesce(b.space_id, a.space_id) AS space_id, b.space_id IS NOT NULL AS b, a.space_id IS NOT NULL AS a
          FROM rp_eff b FULL JOIN rp_eff_after a ON a.space_id=b.space_id AND a.role_name=b.role_name AND a.actor IS NOT DISTINCT FROM b.actor) q GROUP BY 1 ORDER BY 1;

\echo === check 5: credential rows, before against after, by type. Expected on acceptance: gone 0 everywhere; new: admin 52, lead 52, member 63, subspace admin 1;
\echo ===     moved: subspace admin 18, invitee 5; every other type untouched (one line, all zero)
SELECT CASE WHEN coalesce(a.type, b.type) IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee') THEN coalesce(a.type, b.type) ELSE 'every other type' END AS type,
       count(*) FILTER (WHERE a.id IS NOT NULL) AS before, count(*) FILTER (WHERE b.id IS NOT NULL) AS after,
       count(*) FILTER (WHERE b.id IS NULL) AS gone, count(*) FILTER (WHERE a.id IS NULL) AS new_rows,
       count(*) FILTER (WHERE a."resourceID" IS DISTINCT FROM b."resourceID" AND a.id IS NOT NULL AND b.id IS NOT NULL) AS moved,
       count(*) FILTER (WHERE a.id IS NOT NULL AND b.id IS NOT NULL AND (to_jsonb(a) - 'resourceID') IS DISTINCT FROM (to_jsonb(b) - 'resourceID')) AS changed_otherwise
  FROM rp_cred a FULL JOIN credential b USING (id) GROUP BY 1 ORDER BY 1;

\echo === check 6: every new or moved credential has a cause (expected: 0 on every column).
\echo ===     new role credential not on a wrong-scope space or not held on the named id before; new credential that differs from its source in more than id and space;
\echo ===     moved credential whose holder does not fit the new space; the same role credential held twice on a touched space, new with the repair; role credentials of sound spaces that changed
SELECT (SELECT count(*) FROM credential b WHERE NOT EXISTS (SELECT 1 FROM rp_cred a WHERE a.id=b.id) AND b.type IN ('space-member','space-lead','space-admin')
           AND NOT EXISTS (SELECT 1 FROM rp_def d JOIN rp_cred c ON c.type=d.cred_type AND c."resourceID"=d.named_id
                            WHERE d.space_id::text=b."resourceID" AND c.type=b.type AND c."actorId"=b."actorId")) AS new_role_credential_without_a_source,
       (SELECT count(*) FROM credential b WHERE NOT EXISTS (SELECT 1 FROM rp_cred a WHERE a.id=b.id)
           AND NOT EXISTS (SELECT 1 FROM rp_cred c JOIN rp_sp w ON w.named_id=c."resourceID"
                            WHERE w.space_id::text=b."resourceID" AND (to_jsonb(c) - 'id' - 'resourceID') = (to_jsonb(b) - 'id' - 'resourceID'))) AS new_credential_not_equal_to_its_source,
       (SELECT count(*) FROM rp_cred a JOIN credential b USING (id) WHERE a."resourceID" IS DISTINCT FROM b."resourceID" AND b.type='space-subspace-admin'
           AND NOT EXISTS (SELECT 1 FROM rp_adm x WHERE x.parent_id::text=b."resourceID" AND x.actor=b."actorId")) AS moved_subspace_admin_not_admin_of_a_subspace_there,
       (SELECT count(*) FROM rp_cred a JOIN credential b USING (id) WHERE a."resourceID" IS DISTINCT FROM b."resourceID" AND b.type='space-invitee'
           AND NOT EXISTS (SELECT 1 FROM space t JOIN community cm ON cm.id=t."communityId" JOIN invitation v ON v."roleSetId"=cm."roleSetId"
                            WHERE t.id::text=b."resourceID" AND v."invitedActorId"=b."actorId")) AS moved_invitee_without_an_invitation_there,
       (SELECT count(*) FROM (SELECT 1 FROM credential c WHERE c."resourceID" IN (SELECT space_id::text FROM rp_sp UNION SELECT named_id FROM rp_sp)
                                AND c.type IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')
                               GROUP BY c.type, c."resourceID", c."actorId" HAVING count(*)>1) q)
     - (SELECT count(*) FROM (SELECT 1 FROM rp_cred c WHERE c."resourceID" IN (SELECT space_id::text FROM rp_sp UNION SELECT named_id FROM rp_sp)
                                AND c.type IN ('space-member','space-lead','space-admin','space-subspace-admin','space-invitee')
                               GROUP BY c.type, c."resourceID", c."actorId" HAVING count(*)>1) q) AS role_credential_held_twice_on_a_touched_space_new,
       (SELECT count(*) FROM rp_cred a FULL JOIN credential b USING (id)
         WHERE coalesce(a.type, b.type) IN ('space-member','space-lead','space-admin')
           AND coalesce(a."resourceID", b."resourceID") NOT IN (SELECT space_id::text FROM rp_sp)
           AND to_jsonb(a) IS DISTINCT FROM to_jsonb(b)) AS role_credentials_outside_wrong_scope_spaces_that_changed;

\echo === check 7: the two implied credentials. Expected on acceptance: subspace admin on a space without subspaces 21 before, 3 after;
\echo ===     left on a named id and fitting neither space 0; invitee left on a named id 0
SELECT (SELECT count(*) FROM rp_cred c JOIN space s ON s.id::text=c."resourceID" WHERE c.type='space-subspace-admin' AND NOT EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"=s.id)) AS subspace_admin_on_a_space_without_subspaces_before,
       (SELECT count(*) FROM credential c JOIN space s ON s.id::text=c."resourceID" WHERE c.type='space-subspace-admin' AND NOT EXISTS (SELECT 1 FROM space ch WHERE ch."parentSpaceId"=s.id)) AS after,
       (SELECT count(*) FROM (SELECT cred_id FROM rp_sub GROUP BY 1 HAVING NOT bool_or(fits_namer) AND NOT bool_or(fits_named)) q) AS subspace_admin_fitting_neither_space_left_as_is,
       (SELECT count(*) FROM (SELECT cred_id FROM rp_inv GROUP BY 1 HAVING NOT bool_or(fits_namer)) q) AS invitee_not_fitting_the_wrong_scope_space_left_as_is,
       (SELECT count(*) FROM credential c WHERE c.type='space-invitee' AND c."resourceID" IN (SELECT named_id FROM rp_sp)) AS invitee_credentials_still_on_a_named_id;

\echo === check 8: parent credentials. Expected on acceptance: entries naming an id that is not above 42 before, 21 after (the 21 left are the neighbour of guard C8 G12);
\echo ===     entries changed 21, all 21 from the named id to the wrong-scope space above; lists with the same entry twice 56 before and 56 after (lead definitions, a neighbour,
\echo ===     none of them touched); 0 touched lists with the same entry twice; 0 lists whose length changed
WITH bef AS (SELECT a.id, x.ord, x.e FROM rp_role a, jsonb_array_elements(a."parentCredentials") WITH ORDINALITY AS x(e, ord)),
     aft AS (SELECT b.id, x.ord, x.e FROM role b, jsonb_array_elements(b."parentCredentials") WITH ORDINALITY AS x(e, ord)),
     up AS (SELECT r.id, ch."parentSpaceId" AS p, p."parentSpaceId" AS g FROM space ch JOIN community cm ON cm.id=ch."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" LEFT JOIN space p ON p.id=ch."parentSpaceId")
SELECT (SELECT count(*) FROM bef JOIN up USING (id) WHERE bef.e->>'resourceID' IS DISTINCT FROM up.p::text AND bef.e->>'resourceID' IS DISTINCT FROM up.g::text) AS entries_not_above_before,
       (SELECT count(*) FROM aft JOIN up USING (id) WHERE aft.e->>'resourceID' IS DISTINCT FROM up.p::text AND aft.e->>'resourceID' IS DISTINCT FROM up.g::text) AS entries_not_above_after,
       (SELECT count(*) FROM bef JOIN aft USING (id, ord) WHERE bef.e IS DISTINCT FROM aft.e) AS entries_changed,
       (SELECT count(*) FROM bef JOIN aft USING (id, ord) JOIN up USING (id) WHERE bef.e IS DISTINCT FROM aft.e
           AND (bef.e - 'resourceID') = (aft.e - 'resourceID') AND aft.e->>'resourceID' IN (up.p::text, up.g::text)
           AND EXISTS (SELECT 1 FROM rp_sp w WHERE w.named_id=bef.e->>'resourceID' AND w.space_id::text=aft.e->>'resourceID')) AS changed_from_named_id_to_the_space_above,
       (SELECT count(*) FROM (SELECT id FROM bef GROUP BY id, e HAVING count(*)>1) q) AS lists_with_the_same_entry_twice_before,
       (SELECT count(*) FROM (SELECT id FROM aft GROUP BY id, e HAVING count(*)>1) q) AS after,
       (SELECT count(*) FROM (SELECT id FROM aft WHERE id IN (SELECT role_id FROM rp_pc) GROUP BY id, e HAVING count(*)>1) q) AS touched_lists_with_the_same_entry_twice,
       (SELECT count(*) FROM rp_role a JOIN role b USING (id) WHERE jsonb_array_length(a."parentCredentials") <> jsonb_array_length(b."parentCredentials")) AS lists_whose_length_changed;

\echo === check 9: shape. A repaired space against the spaces that were never broken, by level and by what its role rows look like.
\echo ===     Every line with repaired spaces must also show never-broken spaces. Parent list is that of the admin role: p = the parent, g = the space above the parent, other = neither
SELECT s.level, (SELECT string_agg(k, ' + ' ORDER BY k) FROM jsonb_object_keys(r.credential) k) AS definition_keys,
       r.credential->>'resourceID' = s.id::text AS names_own_space,
       coalesce((SELECT string_agg(CASE WHEN x.e->>'resourceID'=s."parentSpaceId"::text THEN 'p' WHEN x.e->>'resourceID'=p."parentSpaceId"::text THEN 'g' ELSE 'other' END
                                   ||':'||replace(x.e->>'type','space-',''), ', ' ORDER BY x.ord)
                   FROM jsonb_array_elements(r."parentCredentials") WITH ORDINALITY AS x(e, ord)), 'empty') AS parent_list,
       EXISTS (SELECT 1 FROM credential c WHERE c.type='space-admin' AND c."resourceID"=s.id::text) AS has_admin_on_own_id,
       count(*) FILTER (WHERE w.space_id IS NOT NULL) AS repaired_spaces, count(*) FILTER (WHERE w.space_id IS NULL) AS never_broken_spaces
  FROM space s JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name='admin'
  LEFT JOIN space p ON p.id=s."parentSpaceId" LEFT JOIN rp_sp w ON w.space_id=s.id
 GROUP BY 1,2,3,4,5 HAVING count(*) FILTER (WHERE w.space_id IS NOT NULL) > 0 ORDER BY 1,2,3,4,5;

\echo === check 10: what the repair leaves for a person (acceptance: 2 repaired spaces with nobody in any role, the same 2 as before; 1 named an id no space has;
\echo ===     3 spaces of one creation session that name each other in a chain or share a named id)
SELECT (SELECT count(*) FROM rp_sp w WHERE NOT EXISTS (SELECT 1 FROM rp_eff_after e WHERE e.space_id=w.space_id)) AS repaired_spaces_with_nobody_in_any_role,
       (SELECT count(*) FROM rp_sp w WHERE NOT EXISTS (SELECT 1 FROM rp_eff e WHERE e.space_id=w.space_id)) AS the_same_before,
       (SELECT count(*) FROM rp_sp w WHERE NOT EXISTS (SELECT 1 FROM space t WHERE t.id::text=w.named_id)) AS named_id_was_no_space,
       (SELECT count(*) FROM rp_sp w WHERE EXISTS (SELECT 1 FROM rp_sp x WHERE x.space_id::text=w.named_id) OR EXISTS (SELECT 1 FROM rp_sp x WHERE x.named_id=w.space_id::text)
                                        OR (SELECT count(*) FROM rp_sp x WHERE x.named_id=w.named_id) > 1) AS spaces_in_a_chain_or_sharing_a_named_id;
\echo === C8 repair done
