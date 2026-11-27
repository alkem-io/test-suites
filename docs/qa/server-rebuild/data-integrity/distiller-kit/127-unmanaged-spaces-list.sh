#!/usr/bin/env bash
# 127-unmanaged-spaces-list.sh: the list behind 127-unmanaged-spaces-guard.sql, for product (2026-11-20).
# Writes runs/<label>/127-unmanaged-spaces.csv, mode 600: names of spaces and of the organization or user the account
# belongs to. LOCAL ONLY: never commit it, never put it in an artifact or an issue. Prints the row count only.
# usage: 127-unmanaged-spaces-list.sh <alkemio_db> <label>      env: PSQL (default: docker exec -i alkemio_dev_postgres psql -U synapse)
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); db=${1:?alkemio database}; label=${2:?label}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
out="$here/runs/$label"; mkdir -p "$out"; f="$out/127-unmanaged-spaces.csv"; ( umask 077; : > "$f" )
$PSQL -d "$db" -X -q -A -F ',' --csv > "$f" <<'SQL'
SELECT a."nameID" AS space, s.visibility, s.settings->'privacy'->>'mode' AS privacy, to_char(a."createdDate",'YYYY-MM-DD') AS made,
       (SELECT count(*) FROM space x WHERE x."levelZeroSpaceID"=s.id AND x.level>0) AS subspaces,
       (SELECT count(*) FROM credential c WHERE c.type='space-member' AND c."resourceID"=s.id::text) AS members,
       CASE WHEN EXISTS (SELECT 1 FROM "user" u WHERE u."accountID"=s."accountId") THEN 'user' WHEN EXISTS (SELECT 1 FROM organization o WHERE o."accountID"=s."accountId") THEN 'organization' ELSE 'none' END AS account_of,
       coalesce((SELECT oa."nameID" FROM organization o JOIN actor oa ON oa.id=o.id WHERE o."accountID"=s."accountId" LIMIT 1), (SELECT ua."nameID" FROM "user" u JOIN actor ua ON ua.id=u.id WHERE u."accountID"=s."accountId" LIMIT 1)) AS account_owner,
       EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text) AS has_user_admin_or_lead,
       EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text) AS has_admin_or_lead_with_login
  FROM space s JOIN actor a ON a.id=s.id
 WHERE s.level=0
   AND NOT EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type IN ('space-admin','space-lead') AND c."resourceID"=s.id::text)
   AND NOT EXISTS (SELECT 1 FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type='account-admin' AND c."resourceID"=s."accountId"::text)
 ORDER BY s.visibility, 1;
SQL
chmod 600 "$f"; echo "127 list: $(( $(wc -l < "$f") - 1 )) spaces written to runs/$label/127-unmanaged-spaces.csv (local only)"
