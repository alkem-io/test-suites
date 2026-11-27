#!/usr/bin/env bash
# Switch the same eight services back to the normal local databases.
# Also remove the line DATABASE_NAME=distill_acc_20261111 from server/.env and restart the server.
set -euo pipefail
server=${SERVER_DIR:-$HOME/repos/server}
cd "$server"
docker compose -f quickstart-services.yml --env-file .env.docker \
  up -d --no-deps kratos-migrate kratos oidc-service matrix-adapter synapse file-service file-backup-service authorization-evaluation wopi-service
docker compose -f quickstart-services.yml --env-file .env.docker --profile auth-reset rm -sf auth-reset-worker || true
docker compose -f quickstart-services.yml --env-file .env.docker up -d --no-deps auth-reset-scaler
