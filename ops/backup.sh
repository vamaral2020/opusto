#!/usr/bin/env sh
set -eu

LABEL=${1:-scheduled}
DEPLOY_DIR=${DEPLOY_DIR:-/opt/opusto}
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/.env}
COMPOSE_FILE=${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}
STAGING_DIR=${BACKUP_STAGING_DIR:-/var/backups/opusto}
RESTIC_IMAGE=${RESTIC_IMAGE:-restic/restic:0.18.1}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
dump_file="$STAGING_DIR/postgres-$timestamp.dump"

cd "$DEPLOY_DIR"
test -r "$ENV_FILE"
mkdir -p "$STAGING_DIR"

set -a
. "$ENV_FILE"
set +a

cleanup() {
  rm -f "$dump_file"
}
trap cleanup EXIT INT TERM

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom > "$dump_file"

docker run --rm \
  --env-file "$ENV_FILE" \
  --volume "$STAGING_DIR:/backup:ro" \
  --volume opusto_media:/media:ro \
  "$RESTIC_IMAGE" backup \
  --host opusto-production \
  --tag "$LABEL" \
  "/backup/$(basename "$dump_file")" /media

docker run --rm --env-file "$ENV_FILE" "$RESTIC_IMAGE" forget \
  --host opusto-production \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 3 \
  --prune

printf 'Encrypted off-site backup completed at %s.\n' "$timestamp"
