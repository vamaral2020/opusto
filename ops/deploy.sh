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
# shellcheck source=/dev/null
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
  "${BACKUP_SCRIPT:-$DEPLOY_DIR/ops/backup.sh}" predeploy
fi

# Failures before the swap leave the running application untouched.
compose pull app migrate
actual_revision=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$TARGET_IMAGE")
actual_source=$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.source"}}' "$TARGET_IMAGE")
[ "$actual_revision" = "$TARGET_SHA" ] && [ "$actual_source" = https://github.com/vamaral2020/opusto ] || {
  printf 'Image metadata does not match the requested release.\n' >&2
  exit 1
}
compose up -d postgres
compose --profile operations run --rm migrate

# Invoked through the EXIT trap below.
# shellcheck disable=SC2329
restore_on_error() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ] && [ -n "$current_image" ]; then
    printf 'Deployment failed; restoring prior application image. Migrations are not reversed.\n' >&2
    export IMAGE_REF="$current_image"
    compose up -d --no-deps app || printf 'Rollback failed; administrator intervention required.\n' >&2
  fi
  exit "$result"
}
trap restore_on_error EXIT
compose up -d --no-deps app

attempt=1
while [ "$attempt" -le "$HEALTH_RETRIES" ]; do
  if curl --connect-timeout 2 --max-time 5 --fail --silent --show-error "http://127.0.0.1:${APP_PORT:-3000}/api/health/ready" >/dev/null; then
    printf 'Deployment healthy: %s\n' "$TARGET_IMAGE"
    printf '%s\n' "$TARGET_IMAGE" > "$DEPLOY_DIR/.deploy-state/current-image"
    exit 0
  fi
  sleep 5
  attempt=$((attempt + 1))
done

printf 'Readiness failed; deployment rejected.\n' >&2
exit 1
