#!/usr/bin/env bash
# 51-login-binding-xcheck.sh  (2026-11-13, written in the C2 review)
# Guard, not a repair. Reads only, prints counts and hashed refs only, never an id or an e-mail.
# Question it serves: for every platform user, is there a login identity (Kratos), is it the one
# the user is bound to, and does its e-mail equal the e-mail stored on the user, letter for letter?
# Why letter for letter: at login the server finds a user without a binding by e-mail with an
# exact compare (identity-resolve.service.ts resolveUser, user.lookup.service.ts getUserByEmail,
# origin/develop of 2026-11-10). A difference in letter case means the person does not get the
# user back. When it then makes a new user, it lower-cases the e-mail first (user.service.ts
# validateUserProfileCreationRequest), and the unique index on "user".email is case-sensitive.
# The two databases cannot be joined, so the users are exported as hashes to a temp file and
# loaded into a temp table on the identity side. The temp file is removed at the end.
#
# usage: 51-login-binding-xcheck.sh <alkemio_db> <kratos_db>
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./51-login-binding-xcheck.sh alkemio acc_kratos > runs/acc-2026-11-11/51-alkemio.out
set -uo pipefail
adb=${1:?usage: 51-login-binding-xcheck.sh <alkemio_db> <kratos_db>}
kdb=${2:?usage: 51-login-binding-xcheck.sh <alkemio_db> <kratos_db>}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
# user_ref | binding or empty | md5 of the e-mail lower-cased | md5 of the e-mail as stored | service profile | day made
$PSQL -d "$adb" -X -q -At -F '|' -c "SELECT md5(u.id::text), COALESCE(u.\"authenticationID\"::text,''), md5(lower(trim(u.email))), md5(u.email), u.\"serviceProfile\", a.\"createdDate\"::date FROM \"user\" u JOIN actor a ON a.id=u.id ORDER BY 1" > "$tmp" || exit 1
{
cat <<'SQL'
\pset footer off
\echo === 51 login binding: platform users against login identities
CREATE TEMP TABLE u(user_ref text, auth_id text, email_lc text, email_raw text, service boolean, created date);
COPY u FROM STDIN WITH (FORMAT csv, DELIMITER '|');
SQL
cat "$tmp"
cat <<'SQL'
\.
ANALYZE u;
CREATE TEMP TABLE i AS
SELECT id.id::text AS id, id.state::text AS state, id.created_at::date AS made,
       md5(lower(trim(id.traits->>'email'))) AS email_lc, md5(id.traits->>'email') AS email_raw,
       ((id.traits->>'email') <> lower(id.traits->>'email')) AS upper_case,
       (SELECT count(*) FROM sessions s WHERE s.identity_id=id.id) AS sessions,
       (SELECT max(s.authenticated_at)::date FROM sessions s WHERE s.identity_id=id.id) AS last_login,
       (SELECT string_agg(DISTINCT t.name, '+' ORDER BY t.name) FROM identity_credentials c JOIN identity_credential_types t ON t.id=c.identity_credential_type_id WHERE c.identity_id=id.id) AS sign_in,
       EXISTS (SELECT 1 FROM identity_verifiable_addresses v WHERE v.identity_id=id.id AND v.verified) AS verified
  FROM identities id;
ANALYZE i;
\echo --- K1 totals. identities_without_email and emails_shared_by_identities: expect 0 and 0
SELECT (SELECT count(*) FROM u) AS users, (SELECT count(*) FROM u WHERE auth_id IS NULL) AS users_without_binding,
       (SELECT count(*) FROM i) AS identities, (SELECT count(*) FROM i WHERE email_lc IS NULL) AS identities_without_email,
       (SELECT count(*) FROM (SELECT email_lc FROM i GROUP BY 1 HAVING count(*)>1) x) AS emails_shared_by_identities;
\echo --- K2 users with a binding: the identity they point at. Expect 0 on identity_missing, email_differs and identity_not_active.
\echo ---    email_differs_by_letter_case_only is harmless for these: a bound user is found by the binding, not by e-mail
SELECT count(*) AS bound_users, count(*) FILTER (WHERE i.id IS NULL) AS identity_missing,
       count(*) FILTER (WHERE i.id IS NOT NULL AND i.email_lc<>u.email_lc) AS email_differs,
       count(*) FILTER (WHERE i.email_lc=u.email_lc AND i.email_raw<>u.email_raw) AS email_differs_by_letter_case_only,
       count(*) FILTER (WHERE i.id IS NOT NULL AND i.state<>'active') AS identity_not_active,
       count(*) FILTER (WHERE i.id IS NOT NULL AND i.sessions=0) AS no_session_kept
  FROM u LEFT JOIN i ON i.id=u.auth_id WHERE u.auth_id IS NOT NULL;
\echo --- K3 users without a binding, by what the code read predicts for the next login of that person (read from the code, not run on a server)
\echo ---    A  identity with the same e-mail, same letters: the server links the user at the next login
\echo ---    B  identity with the same e-mail, other letter case: no user found, new user refused by the unique e-mail, the login ends in an error
\echo ---    C  no identity, stored e-mail lower case: linked if the person registers and the e-mail reaches the server in lower case
\echo ---    D  no identity, stored e-mail has upper case: linked only if the e-mail reaches the server with the same letters, else a second empty user is made
SELECT CASE WHEN i.id IS NOT NULL AND i.email_raw=u.email_raw THEN 'A identity, same letters'
            WHEN i.id IS NOT NULL THEN 'B identity, other letter case'
            WHEN u.email_raw=u.email_lc THEN 'C no identity, lower case' ELSE 'D no identity, upper case' END AS situation,
       count(*) AS users, count(*) FILTER (WHERE u.service) AS service_profiles,
       count(*) FILTER (WHERE i.id IS NOT NULL AND EXISTS (SELECT 1 FROM u b WHERE b.auth_id=i.id)) AS identity_bound_to_another_user
  FROM u LEFT JOIN i ON i.email_lc=u.email_lc WHERE u.auth_id IS NULL GROUP BY 1 ORDER BY 1;
\echo --- K4 users without a binding that have an identity: one line each
SELECT u.user_ref, u.created AS user_made, i.made AS identity_made, i.state, i.sessions, i.last_login, i.sign_in, i.verified, i.upper_case AS identity_email_upper_case
  FROM u JOIN i ON i.email_lc=u.email_lc WHERE u.auth_id IS NULL ORDER BY 2, 1;
\echo --- K5 identities that no user is bound to, by whether a user has the same e-mail
SELECT CASE WHEN EXISTS (SELECT 1 FROM u WHERE u.email_lc=i.email_lc AND u.auth_id IS NULL) THEN 'a user without a binding has this e-mail'
            WHEN EXISTS (SELECT 1 FROM u WHERE u.email_lc=i.email_lc) THEN 'a user bound to another identity has this e-mail (expect 0)'
            ELSE 'no user has this e-mail: registered, never became a platform user' END AS situation,
       count(*) AS identities, count(*) FILTER (WHERE verified) AS verified, count(*) FILTER (WHERE sessions>0) AS with_a_session,
       min(made) AS first_made, max(made) AS last_made, string_agg(DISTINCT sign_in, ', ') AS sign_in
  FROM i WHERE NOT EXISTS (SELECT 1 FROM u WHERE u.auth_id=i.id) GROUP BY 1 ORDER BY 1;
\echo --- K6 identities whose e-mail has upper-case letters, by whether a user is bound to them. Only the unbound ones can meet situation B
SELECT EXISTS (SELECT 1 FROM u WHERE u.auth_id=i.id) AS a_user_is_bound, count(*) AS identities FROM i WHERE upper_case GROUP BY 1 ORDER BY 1;
\echo --- K7 day the identity was made against the day the user was made, bound users. An identity made long after the user means the person registered again later
SELECT CASE WHEN i.made <= u.created + 1 THEN 'identity made by the day after the user' WHEN i.made <= u.created + 30 THEN 'within 30 days after' ELSE 'more than 30 days after' END AS timing, count(*) AS users
  FROM u JOIN i ON i.id=u.auth_id GROUP BY 1 ORDER BY 1;
\echo === 51 done
SQL
} | $PSQL -d "$kdb" -X -q 2>&1
