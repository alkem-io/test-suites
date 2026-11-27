-- 110-invitee-right-repair.sql: invitee rights left behind (open row 2, register A9), 2026-11-19. Accepted by the QA lead
-- 2026-11-19 after walks 112 to 115: in the default REPAIRS of 87-distill-flow.sh. Guard: 111-invitee-right-guard.sql.
-- What is wrong: an invited actor gets the credential "space-invitee" on the space. The server adds that credential to
-- the group that may read the ABOUT part of the space (space.service.authorization.ts getCredentialsWithVisibilityOfSpace:
-- "An invitee also can always have visibility"), also when the space is private. Only ACCEPTING an invitation takes the
-- credential away; withdrawing, declining or deleting the invitation leaves it (server#6731, open). So the holder keeps
-- reading the About part of a private space after the invitation is gone.
-- R0 stops when a case needs a person: an invitee credential that names no space.
-- R1 deletes every "space-invitee" credential whose actor has NO invitation on that space that is still open.
--    Open = pending (no lifecycle state yet), "invited", or "accepting" (an acceptance that did not finish: kept, a
--    person looks at those; 5 on acceptance, made in 2025).
-- Effect (walks 112 and 113): on a PUBLIC SUBSPACE of a PRIVATE top-level space the invitee right gives a user who is not
--    in the top-level space the full read of the subspace: space, community, collaboration, posts. A sibling subspace
--    where the user holds nothing is refused completely. That read goes away for the holders left behind (1 user on
--    acceptance, since 2025-02). On a private top-level space the right gives nothing extra. For a member, an
--    organization or a virtual contributor nothing changes.
-- Not touched: invitations, memberships, every other credential, every other table.
-- No authorization reset is needed: the stored rule names the credential, and the credential is what goes away.
-- touches: credential
\set ON_ERROR_STOP on
\pset footer off
\echo === invitee right repair: image before
CREATE TEMP TABLE ir_cred AS SELECT * FROM credential;
CREATE TEMP TABLE ir_inv AS
SELECT i."invitedActorId" AS actor, i."roleSetId", CASE WHEN l."machineState" IS NULL THEN 'pending' ELSE coalesce(l."machineState"::jsonb->>'value','other') END AS st
  FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId";
CREATE TEMP TABLE ir_fix AS
SELECT c.id, c."actorId" AS actor, c."resourceID" AS space_id, a.type::text AS atype, s.level, s.settings->'privacy'->>'mode' AS privacy, cm."roleSetId",
       (SELECT z.settings->'privacy'->>'mode' FROM space z WHERE z.id=s."levelZeroSpaceID") AS top_privacy,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=s."levelZeroSpaceID"::text) AS member_of_top,
       EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID") AS member,
       EXISTS (SELECT 1 FROM ir_inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId" AND v.st IN ('pending','invited','accepting')) AS open_invitation,
       coalesce((SELECT string_agg(DISTINCT v.st, ',' ORDER BY v.st) FROM ir_inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId"), 'no invitation row') AS invitations
  FROM credential c JOIN actor a ON a.id=c."actorId" LEFT JOIN space s ON s.id::text=c."resourceID" LEFT JOIN community cm ON cm.id=s."communityId"
 WHERE c.type='space-invitee';
\echo === before: invitee rights, with and without an open invitation
SELECT count(*) AS invitee_rights, count(*) FILTER (WHERE open_invitation) AS with_an_open_invitation, count(*) FILTER (WHERE NOT open_invitation) AS left_behind FROM ir_fix;
\echo === before: the ones left behind, by holder, privacy of the space, member, and what invitations the pair has
SELECT atype, privacy, member, invitations, count(*) FROM ir_fix WHERE NOT open_invitation GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;
\echo === R0: stop when a case needs a person (expected: no error)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ir_fix WHERE "roleSetId" IS NULL) THEN RAISE EXCEPTION 'an invitee credential names no space with a community'; END IF;
END $$;
\echo === R1: delete the invitee rights with no open invitation (acceptance of 11-11 after the repairs: DELETE 54)
DELETE FROM credential c USING ir_fix f WHERE f.id=c.id AND NOT f.open_invitation;
\echo === check 1: the rule on the repaired state. Expected: 0 left behind; every open invitation of a user still has its right as before
SELECT (SELECT count(*) FROM credential c JOIN ir_fix f ON f.id=c.id WHERE NOT f.open_invitation) AS left_behind,
       (SELECT count(*) FROM ir_fix WHERE open_invitation) AS with_open_invitation_before,
       (SELECT count(*) FROM credential c JOIN ir_fix f ON f.id=c.id WHERE f.open_invitation) AS with_open_invitation_after;
\echo === check 2: only what was meant to change changed. Expected: rows gone = left behind, all of type space-invitee, 0 rows changed, 0 rows added
SELECT (SELECT count(*) FROM ir_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id)) AS rows_gone,
       (SELECT count(*) FROM ir_cred o WHERE NOT EXISTS (SELECT 1 FROM credential n WHERE n.id=o.id) AND o.type<>'space-invitee') AS gone_of_another_type,
       (SELECT count(*) FROM credential n JOIN ir_cred o ON o.id=n.id WHERE to_jsonb(n) IS DISTINCT FROM to_jsonb(o)) AS rows_changed,
       (SELECT count(*) FROM credential n WHERE NOT EXISTS (SELECT 1 FROM ir_cred o WHERE o.id=n.id)) AS rows_added;
\echo === check 3: who loses something (walks 112 and 113, 2026-11-19). On a PUBLIC SUBSPACE of a PRIVATE top-level space the right gives the full read of the subspace (content, community) to a user who is not in the top-level space: that goes away. On a private top-level space it gives nothing extra (About is open to every signed-in user). On a private subspace it gives the About part
SELECT f.atype, 'L' || f.level AS level, f.privacy, f.top_privacy, f.member, f.member_of_top, (u."authenticationID" IS NOT NULL) AS has_login, count(*) AS rights_removed, count(DISTINCT f.actor) AS holders,
       CASE WHEN f.atype<>'user' OR f.member THEN 'nothing'
            WHEN f.level>0 AND f.privacy='public' AND f.top_privacy='private' AND NOT f.member_of_top THEN 'LOSES THE FULL READ of the subspace'
            WHEN f.level>0 AND f.privacy='private' AND NOT f.member_of_top THEN 'loses the read of the About part'
            ELSE 'nothing' END AS effect
  FROM ir_fix f LEFT JOIN "user" u ON u.id=f.actor WHERE NOT f.open_invitation GROUP BY 1,2,3,4,5,6,7,10 ORDER BY 10,1,2,3;
\echo === check 4: does any removed right belong to a holder who has another way in (a member role, admin, lead on that space)? context
SELECT count(*) FILTER (WHERE EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=f.actor AND x."resourceID"=f.space_id AND x.type<>'space-invitee')) AS holders_with_another_right_on_the_space, count(*) AS removed FROM ir_fix f WHERE NOT f.open_invitation;
\echo === invitee right repair done. No authorization reset needed.
