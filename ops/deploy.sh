#!/usr/bin/env sh
set -eu

TARGET_IMAGE=${1:?usage: deploy.sh IMAGE_REF BUILD_SHA}
TARGET_SHA=${2:?usage: deploy.sh IMAGE_REF BUILD_SHA}
DEPLOY_DIR=${DEPLOY_DIR:-/opt/opusto}
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/.env}
COMPOSE_FILE=${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}
HEALTH_RETRIES=${HEALTH_RETRIES:-24}

cd "$DEPLOY_DIR"
test -r "$ENV_FILE"

set -a
# The deployment environment is root-owned and contains shell-compatible KEY=value entries.
. "$ENV_FILE"
set +a

current_image=$(docker inspect --format '{{.Config.Image}}' opusto-app-1 2>/dev/null || true)
mkdir -p "$DEPLOY_DIR/.deploy-state"
printf '%s\n' "$current_image" > "$DEPLOY_DIR/.deploy-state/previous-image"

export IMAGE_REF="$TARGET_IMAGE"
export BUILD_SHA="$TARGET_SHA"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

if [ "${BACKUP_REQUIRED:-false}" = "true" ]; then
  "$DEPLOY_DIR/ops/backup.sh" predeploy
fi

compose pull app migrate
compose up -d postgres
compose --profile operations run --rm migrate
compose up -d --no-deps app

attempt=1
while [ "$attempt" -le "$HEALTH_RETRIES" ]; do
  if curl --fail --silent --show-error "http://127.0.0.1:${APP_PORT:-3000}/api/health/ready" >/dev/null; then
    printf 'Deployment healthy: %s\n' "$TARGET_IMAGE"
    printf '%s\n' "$TARGET_IMAGE" > "$DEPLOY_DIR/.deploy-state/current-image"
    exit 0
  fi
  sleep 5
  attempt=$((attempt + 1))
done

printf 'Health check failed for %s. Restoring the prior application image.\n' "$TARGET_IMAGE" >&2
printf 'Database migrations are not reversed by this rollback.\n' >&2

if [ -n "$current_image" ]; then
  export IMAGE_REF="$current_image"
  compose up -d --no-deps app
  exit 1
fi

printf 'No prior image was available for rollback.\n' >&2
exit 1
