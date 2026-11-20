#!/usr/bin/env bash
# 67-phase-admin-list.sh  (2026-11-16, written for tracked cases T8 and T27)
# Listing, not a repair. Reads only (temp tables aside). Prints counts only to stdout.
# The names and e-mail addresses go to one local CSV file and nowhere else. That file holds
# personal data: keep it on this machine, never publish it, never paste it into a note.
#
# Question it serves: which spaces and templates hold an innovation flow with a phase problem,
# and who can change the phases there, so that these people can be informed. The ruling for
# T8 and T27 is that the phases are not changed in the database: the admins rename.
#
# Phase problems (the space set must equal what the guards of file 30 list):
#   comma    a phase name that holds a comma              B4 G6 / B4 G15   (T8)
#   blank    a phase name that is empty or only spaces    C9 G6            (T27)
#   repeat   one name twice in a flow, case ignored       C9 G7            (T27)
#   overmax  more phases than the stored maximum          C9 G8            (T27)
#
# Who is listed, read from the server code (origin/develop of 2026-11-10, not run):
#   1. admin of the space      holders of the credential stored on the admin role of the role set
#                              of the space (role.credential). space.service.authorization.ts builds
#                              the admin rule of a space from roleSetService.getCredentialsForRoleWithParents
#                              (roleSet, ADMIN): this credential plus the parent credentials of the role.
#   2. admin of a space above  holders of a parent credential of that admin role, only when its type is
#                              space-admin. A parent credential of type space-member (finding A1) gives
#                              the same rights to plain members of the space above; those people are
#                              counted in X3 and are NOT put on the list.
#   3. account admin           holders of account-admin on the account of the top level space. The account
#                              rule is handed down to the top level space (account.service.authorization.ts).
#                              On acceptance only users hold this credential; for an account hosted by an
#                              organization these are the people the server gave it to for that organization.
#   For a template: the admins of the space whose library holds it, or the account admins of the account
#   of its innovation pack. A template of the platform library has no row here: it is for the platform team.
#   Platform staff (global roles) can change every flow and are not listed.
# The admin role credential is read as stored. Where it names another space (finding C8) the row is
# flagged in the column role_names_another_space and the people listed are the ones the server treats as
# admins today. After the C8 repair the list must be made again.
#
# usage: 67-phase-admin-list.sh <alkemio_db> <label>
#        writes runs/<label>/67-phase-admin-list.csv  (mode 600)
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./67-phase-admin-list.sh alkemio acc-2026-11-11 > runs/acc-2026-11-11/67-alkemio.out
set -uo pipefail
adb=${1:?usage: 67-phase-admin-list.sh <alkemio_db> <label>}
label=${2:?usage: 67-phase-admin-list.sh <alkemio_db> <label>}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
here=$(cd "$(dirname "$0")" && pwd)
out="$here/runs/$label"; mkdir -p "$out"
csv="$out/67-phase-admin-list.csv"

read -r -d '' setup <<'SQL'
SET client_min_messages = warning;
-- one row per flow and problem
CREATE TEMP TABLE pa_prob AS
  SELECT DISTINCT s."innovationFlowId" AS flow_id, 'comma' AS problem FROM innovation_flow_state s WHERE s."displayName" LIKE '%,%'
  UNION
  SELECT DISTINCT s."innovationFlowId", 'blank' FROM innovation_flow_state s WHERE s."displayName" IS NULL OR trim(s."displayName")=''
  UNION
  SELECT DISTINCT s."innovationFlowId", 'repeat' FROM innovation_flow_state s
   WHERE s."innovationFlowId" IS NOT NULL AND trim(s."displayName")<>'' GROUP BY s."innovationFlowId", lower(trim(s."displayName")) HAVING count(*)>1
  UNION
  SELECT f.id, 'overmax' FROM innovation_flow f JOIN innovation_flow_state s ON s."innovationFlowId"=f.id
   GROUP BY f.id HAVING count(*) > coalesce((f.settings->>'maximumNumberOfStates')::int, 8);
-- one row per flow: where it sits and who owns that place
CREATE TEMP TABLE pa_flow AS
WITH RECURSIVE p AS (SELECT flow_id, string_agg(problem, '+' ORDER BY problem) AS problems FROM pa_prob GROUP BY 1),
up AS (SELECT x.id AS start_id, x.id, x."parentSpaceId" FROM template_content_space x
       UNION ALL SELECT up.start_id, x.id, x."parentSpaceId" FROM up JOIN template_content_space x ON x.id=up."parentSpaceId"),
root AS (SELECT start_id, id AS root_id FROM up WHERE "parentSpaceId" IS NULL)
SELECT p.flow_id, p.problems,
       (SELECT count(*) FROM innovation_flow_state s WHERE s."innovationFlowId"=p.flow_id) AS phases,
       (SELECT count(*) FROM callout c WHERE c."calloutsSetId"=co."calloutsSetId") AS posts_in_the_flow,
       CASE WHEN p.flow_id IS NULL OR co.id IS NULL THEN '5 flow that belongs to nothing'
            WHEN sp.id IS NOT NULL THEN '1 space'
            WHEN t.id IS NULL THEN '4 template with no owner found'
            WHEN lib.id IS NOT NULL THEN '2 template in a space library'
            WHEN ip.id IS NOT NULL THEN '3 template in an innovation pack'
            WHEN pl.id IS NOT NULL THEN '3 template in the platform library'
            ELSE '4 template with no owner found' END AS sits_in,
       coalesce(sp.id, lib.id) AS space_id,          -- the space whose admins are asked
       t.id AS template_id, tcs.level AS level_inside_template, ip.id AS pack_id, ip."accountId" AS pack_account_id
  FROM p LEFT JOIN collaboration co ON co."innovationFlowId"=p.flow_id
  LEFT JOIN space sp ON sp."collaborationId"=co.id
  LEFT JOIN template_content_space tcs ON tcs."collaborationId"=co.id
  LEFT JOIN root ON root.start_id=tcs.id
  LEFT JOIN template t ON t."contentSpaceId"=root.root_id
  LEFT JOIN templates_manager tm ON tm."templatesSetId"=t."templatesSetId"
  LEFT JOIN space lib ON lib."templatesManagerId"=tm.id
  LEFT JOIN platform pl ON pl."templatesManagerId"=tm.id
  LEFT JOIN innovation_pack ip ON ip."templatesSetId"=t."templatesSetId";
-- the admin role of each space that is asked
CREATE TEMP TABLE pa_role AS
SELECT s.id AS space_id, s.level, s."levelZeroSpaceID" AS l0_id, (SELECT z."accountId" FROM space z WHERE z.id=s."levelZeroSpaceID") AS account_id,
       r.id AS role_id, r.credential->>'type' AS cred_type, r.credential->>'resourceID' AS cred_res,
       (r.credential->>'resourceID' IS DISTINCT FROM s.id::text) AS names_another_space, r."parentCredentials" AS parents
  FROM (SELECT DISTINCT space_id FROM pa_flow WHERE space_id IS NOT NULL) x JOIN space s ON s.id=x.space_id
  LEFT JOIN community cm ON cm.id=s."communityId" LEFT JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name='admin';
-- the people, per space
CREATE TEMP TABLE pa_people AS
SELECT ro.space_id, '1 admin of the space' AS reached_as, c."actorId" AS actor_id
  FROM pa_role ro JOIN credential c ON c.type::text=ro.cred_type AND c."resourceID"=ro.cred_res AND c."actorId" IS NOT NULL
UNION
SELECT ro.space_id, '2 admin of a space above', c."actorId"
  FROM pa_role ro CROSS JOIN LATERAL jsonb_array_elements(ro.parents) pc
  JOIN credential c ON c.type::text=pc->>'type' AND c."resourceID"=pc->>'resourceID' AND c."actorId" IS NOT NULL
 WHERE pc->>'type'='space-admin'
UNION
SELECT ro.space_id, '3 account admin', c."actorId"
  FROM pa_role ro JOIN credential c ON c.type::text='account-admin' AND c."resourceID"=ro.account_id::text AND c."actorId" IS NOT NULL;
-- one row per person and space: the closest way the person is reached
CREATE TEMP TABLE pa_best AS SELECT space_id, actor_id, min(reached_as) AS reached_as FROM pa_people GROUP BY 1,2;
-- people asked for a template of an innovation pack
CREATE TEMP TABLE pa_pack AS
SELECT DISTINCT f.pack_id, c."actorId" AS actor_id FROM pa_flow f JOIN credential c ON c.type::text='account-admin' AND c."resourceID"=f.pack_account_id::text AND c."actorId" IS NOT NULL
 WHERE f.sits_in='3 template in an innovation pack';
-- the listing: one row per flow and person; a flow with nobody keeps one row with an empty person
CREATE TEMP TABLE pa_list AS
SELECT f.flow_id, f.sits_in, f.problems, f.phases, f.posts_in_the_flow, f.space_id, f.template_id, f.pack_id,
       coalesce(b.reached_as, CASE WHEN k.actor_id IS NOT NULL THEN '3 account admin' END) AS reached_as,
       coalesce(b.actor_id, k.actor_id) AS actor_id
  FROM pa_flow f LEFT JOIN pa_best b ON b.space_id=f.space_id LEFT JOIN pa_pack k ON k.pack_id=f.pack_id AND f.space_id IS NULL
 WHERE f.sits_in NOT LIKE '5%';
SQL

# ---- the CSV (names and e-mail addresses; local only)
umask 077
$PSQL -d "$adb" -X -q -v ON_ERROR_STOP=1 > "$csv" <<SQL || { echo "listing failed" >&2; exit 1; }
$setup
COPY (
SELECT substr(l.sits_in, 3) AS sits_in, l.problems, l.phases, l.posts_in_the_flow,
       s.level AS space_level, sa."nameID" AS space_short_name, spf."displayName" AS space_name,
       zpf."displayName" AS top_level_space_name, tpf."displayName" AS template_name, ppf."displayName" AS innovation_pack_name,
       ro.names_another_space AS role_names_another_space,
       substr(l.reached_as, 3) AS reached_as, a.type AS holder_kind, apf."displayName" AS person_name, u."firstName" AS first_name, u.email AS email,
       l.flow_id, l.space_id
  FROM pa_list l
  LEFT JOIN space s ON s.id=l.space_id LEFT JOIN actor sa ON sa.id=s.id
  LEFT JOIN space_about ab ON ab.id=s."aboutId" LEFT JOIN profile spf ON spf.id=ab."profileId"
  LEFT JOIN space z ON z.id=s."levelZeroSpaceID" LEFT JOIN space_about zab ON zab.id=z."aboutId" LEFT JOIN profile zpf ON zpf.id=zab."profileId"
  LEFT JOIN template t ON t.id=l.template_id LEFT JOIN profile tpf ON tpf.id=t."profileId"
  LEFT JOIN innovation_pack ip ON ip.id=l.pack_id LEFT JOIN profile ppf ON ppf.id=ip."profileId"
  LEFT JOIN pa_role ro ON ro.space_id=l.space_id
  LEFT JOIN actor a ON a.id=l.actor_id LEFT JOIN profile apf ON apf.id=a."profileId" LEFT JOIN "user" u ON u.id=l.actor_id
 ORDER BY 1, zpf."displayName", s.level, spf."displayName", l.flow_id, 12, apf."displayName"
) TO STDOUT WITH (FORMAT csv, HEADER true);
SQL
chmod 600 "$csv"

# ---- the counts (stdout; no name, no address, no id)
echo "67-phase-admin-list  database=$adb  label=$label  $(date -u +%Y-%m-%dT%H:%MZ)"
echo "listing written to runs/$label/67-phase-admin-list.csv: $(($(wc -l < "$csv") - 1)) rows (line breaks inside a name would add lines). Personal data, local only."
$PSQL -d "$adb" -X -q -v ON_ERROR_STOP=1 <<SQL
$setup
\pset footer off
\echo --- X1 flows per problem and where the flow sits (compare: comma with B4 G15, blank with C9 G6, repeat with C9 G7, overmax with C9 G8)
SELECT substr(f.sits_in,3) AS sits_in, coalesce(s.level::text, CASE WHEN f.template_id IS NOT NULL THEN 'template' ELSE '-' END) AS level,
       count(*) FILTER (WHERE p.problem='comma') AS comma, count(*) FILTER (WHERE p.problem='blank') AS blank,
       count(*) FILTER (WHERE p.problem='repeat') AS repeat, count(*) FILTER (WHERE p.problem='overmax') AS overmax, count(DISTINCT f.flow_id) AS flows
  FROM pa_flow f JOIN pa_prob p ON p.flow_id IS NOT DISTINCT FROM f.flow_id LEFT JOIN space s ON s.id=f.space_id AND f.sits_in LIKE '1%' GROUP BY 1,2 ORDER BY 1,2;
\echo --- X2 flows by the mix of problems they hold, and the posts in them
SELECT problems, count(*) AS flows, count(*) FILTER (WHERE sits_in LIKE '1%') AS in_spaces, count(*) FILTER (WHERE template_id IS NOT NULL) AS in_templates, sum(posts_in_the_flow) AS posts FROM pa_flow GROUP BY 1 ORDER BY 1;
\echo --- X3 the admin role of the spaces that are asked: spaces with no admin role row (expect 0), a role that names another space (finding C8),
\echo ---    parent credentials of type space-admin (people listed) and of type space-member (finding A1: members above have the rights, they are not listed)
SELECT count(*) AS spaces_asked, count(*) FILTER (WHERE level=0) AS level_0, count(*) FILTER (WHERE level=1) AS level_1, count(*) FILTER (WHERE level=2) AS level_2,
       count(*) FILTER (WHERE role_id IS NULL) AS no_admin_role_row, count(*) FILTER (WHERE names_another_space) AS role_names_another_space,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(parents) pc WHERE pc->>'type'='space-admin')) AS with_an_admin_credential_above,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(parents) pc WHERE pc->>'type'='space-member')) AS with_a_member_credential_above_a1,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(parents) pc WHERE pc->>'type' NOT IN ('space-admin','space-member'))) AS with_another_type_above
  FROM pa_role;
\echo --- X4 spaces asked, by how their people are reached. no_own_admin: nobody holds the admin credential of the space itself.
\echo ---    nobody_at_all: no own admin, no admin above, no account admin. Those spaces need the platform team
SELECT ro.level, count(*) AS spaces,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id AND p.reached_as LIKE '1%')) AS with_own_admin,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id AND p.reached_as LIKE '1%')) AS no_own_admin,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id AND p.reached_as LIKE '1%')
                          AND EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id)) AS no_own_admin_but_reached_from_above,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id)) AS nobody_at_all,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pa_people p WHERE p.space_id=ro.space_id AND p.reached_as LIKE '3%')) AS no_account_admin
  FROM pa_role ro GROUP BY 1 ORDER BY 1;
\echo --- X5 flows by where they sit: flows with at least one person on the list and flows with nobody
SELECT substr(sits_in,3) AS sits_in, count(DISTINCT flow_id) AS flows, count(DISTINCT flow_id) FILTER (WHERE actor_id IS NOT NULL) AS with_somebody,
       count(DISTINCT flow_id) FILTER (WHERE actor_id IS NULL) AS with_nobody FROM pa_list GROUP BY 1 ORDER BY 1;
SELECT count(*) AS flows_left_out_because_they_belong_to_nothing FROM pa_flow WHERE sits_in LIKE '5%';
\echo --- X6 rows of the listing by the closest way a person is reached and by the kind of holder
SELECT coalesce(substr(l.reached_as,3),'nobody') AS reached_as, coalesce(a.type::text,'-') AS holder_kind, count(*) AS rows, count(DISTINCT l.actor_id) AS people, count(DISTINCT l.flow_id) AS flows
  FROM pa_list l LEFT JOIN actor a ON a.id=l.actor_id GROUP BY 1,2 ORDER BY 1,2;
\echo --- X7 the people: how many in all, how many are asked for more than one flow, how many are users with no e-mail address,
\echo ---    how many are not users (no address to write to), how many are reached only as account admin or only from above
WITH per AS (SELECT l.actor_id, count(DISTINCT l.flow_id) AS flows, min(l.reached_as) AS closest FROM pa_list l WHERE l.actor_id IS NOT NULL GROUP BY 1)
SELECT count(*) AS people, count(*) FILTER (WHERE per.flows>1) AS asked_for_more_than_one_flow, max(per.flows) AS most_flows_for_one_person,
       count(*) FILTER (WHERE a.type::text<>'user') AS not_users, count(*) FILTER (WHERE a.type::text='user' AND coalesce(trim(u.email),'')='') AS users_with_no_address,
       count(*) FILTER (WHERE u."serviceProfile") AS service_profiles,
       count(*) FILTER (WHERE per.closest LIKE '1%') AS admin_of_a_space_on_the_list, count(*) FILTER (WHERE per.closest LIKE '2%') AS only_from_above, count(*) FILTER (WHERE per.closest LIKE '3%') AS only_as_account_admin
  FROM per JOIN actor a ON a.id=per.actor_id LEFT JOIN "user" u ON u.id=per.actor_id;
\echo --- X8 people on the list whose user row is in a state worth a look before a message goes out: no login identity bound (finding C2)
SELECT count(DISTINCT l.actor_id) AS users_on_the_list, count(DISTINCT l.actor_id) FILTER (WHERE u."authenticationID" IS NULL) AS with_no_login_identity
  FROM pa_list l JOIN "user" u ON u.id=l.actor_id;
SQL
