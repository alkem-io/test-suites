#!/usr/bin/env bash
# Switch the local stack to the copy experiment. Recreates only the eight services of the overlay.
# The server itself runs on the host and reads DATABASE_NAME from server/.env.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd); server=${SERVER_DIR:-$HOME/repos/server}
cd "$server"
docker compose -f quickstart-services.yml -f "$here/distill-overlay.yml" -f "$here/acc-versions-overlay.yml" --env-file .env.docker \
  up -d --no-deps kratos-migrate kratos oidc-service file-service file-backup-service authorization-evaluation wopi-service
# chat: the local chat server on the working copy of the acceptance chat database (distill_synapse)
docker compose -f quickstart-services.yml -f "$here/distill-overlay.yml" -f "$here/distill-chat-overlay.yml" -f "$here/acc-versions-overlay.yml" --env-file .env.docker \
  up -d --no-deps synapse matrix-adapter
# The scaler would start a reset worker on the alkemio database (the acceptance copy). Stop it for the experiment.
docker compose -f quickstart-services.yml --env-file .env.docker stop auth-reset-scaler
echo "stack is on the copy experiment. An authorization reset needs a worker built from the current server code:"
echo "  docker compose -f quickstart-services.yml -f $here/distill-overlay.yml --env-file .env.docker --profile auth-reset up -d --build --no-deps auth-reset-worker"
