#!/usr/bin/env sh
set -eu

APP_PORT=${APP_PORT:-3000}
DISK_THRESHOLD=${DISK_THRESHOLD:-85}

curl --fail --silent --show-error "http://127.0.0.1:$APP_PORT/api/health/ready" >/dev/null

used_percent=$(df -P / | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')
if [ "$used_percent" -ge "$DISK_THRESHOLD" ]; then
  printf 'Root filesystem usage is %s%% (threshold %s%%).\n' "$used_percent" "$DISK_THRESHOLD" >&2
  exit 1
fi

docker inspect --format '{{.State.Health.Status}}' opusto-app-1 | grep -qx healthy
docker inspect --format '{{.State.Health.Status}}' opusto-postgres-1 | grep -qx healthy
