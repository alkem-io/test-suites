# lib-who.sh: source it. Resolves people for the walk scripts WITHOUT printing them.
#   who_email <alkemio_db> <user id>      e-mail of a user (stdout: use only inside $( ))
PSQL_Q() { docker exec -i alkemio_dev_postgres psql -U synapse -d "$1" -X -q -At; }
who_email() { echo "select email from \"user\" where id='$2'" | PSQL_Q "$1"; }
#   who_admin_email <alkemio_db> <kratos_db>   e-mail of a platform operations admin who has a login identity
#                                              (the one with the most platform roles first)
who_admin_email() { for e in $(echo "select u.email from \"user\" u join credential c on c.\"actorId\"=u.id and c.type like 'platform-%' where u.\"authenticationID\" is not null and exists (select 1 from credential o where o.\"actorId\"=u.id and o.type='platform-operations-admin') group by u.id, u.email order by count(*) desc, u.id" | PSQL_Q "$1"); do
  [ "$(echo "select count(*) from identities where traits->>'email'='$e'" | PSQL_Q "$2")" = 1 ] && { echo "$e"; return 0; }; done; return 1; }
