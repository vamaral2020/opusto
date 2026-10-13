#!/usr/bin/env sh
set -eu

DEPLOY_DIR=${DEPLOY_DIR:-/opt/opusto}
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/.env}
COMPOSE_FILE=${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}
STATE_FILE="$DEPLOY_DIR/.deploy-state/previous-image"

test -s "$STATE_FILE"
previous_image=$(cat "$STATE_FILE")

set -a
. "$ENV_FILE"
set +a

export IMAGE_REF="$previous_image"
export BUILD_SHA=${BUILD_SHA:-rollback}
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps app

printf 'Application image restored to %s. Database migrations were not reversed.\n' "$previous_image"
