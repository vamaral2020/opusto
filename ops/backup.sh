#!/usr/bin/env bash
# Never trace credentials, including when invoked with bash -x.
set +x
set -euo pipefail
umask 077

DEPLOY_DIR=${DEPLOY_DIR:-/opt/opusto}
ENV_FILE=${ENV_FILE:-$DEPLOY_DIR/.env}
BACKUP_ENV_FILE=${BACKUP_ENV_FILE:-$DEPLOY_DIR/.env.backup}
COMPOSE_FILE=${COMPOSE_FILE:-$DEPLOY_DIR/compose.prod.yaml}
MODE=${1:-scheduled}
phase=configuration
run_dir=
healthchecks_active=false
backup_complete=false

log() {
  printf '%s [opusto-backup] %s\n' "$(date -u +%FT%TZ)" "$1"
}

fail() {
  log "$1" >&2
  exit 1
}

healthchecks_ping() {
  local event=$1 suffix='' url http_code
  [[ -n "${HEALTHCHECKS_PING_URL:-}" ]] || return 0
  case "$event" in
    start) suffix=/start ;;
    fail) suffix=/fail ;;
  esac
  if [[ "$HEALTHCHECKS_PING_URL" != https://* || "$HEALTHCHECKS_PING_URL" =~ [[:space:][:cntrl:]] ]]; then
    log 'WARNING: Invalid Healthchecks configuration; notification skipped.' >&2 || true
    return 0
  fi
  url="${HEALTHCHECKS_PING_URL%/}$suffix"
  # Keep the confidential URL off argv and ignore user curlrc files. Escape the
  # curl config value; control characters above are rejected to prevent injection.
  url=${url//\\/\\\\}
  url=${url//\"/\\\"}
  if ! http_code=$(printf 'url = "%s"\n' "$url" |
    curl --disable --config - --request GET --silent --show-error --fail \
      --connect-timeout 2 --max-time 5 --retry 0 --proto '=https' \
      --output /dev/null --write-out '%{http_code}' 2>/dev/null) || [[ "$http_code" != 2?? ]]; then
    log "WARNING: Healthchecks communication failed ($event); backup result unchanged." >&2 || true
  fi
  return 0
}

cleanup() {
  local status=$?
  trap - EXIT
  if [[ -n "$run_dir" ]]; then
    if ! rm -rf -- "$run_dir" >/dev/null 2>&1; then
      # A cleanup failure must not replace the original backup error code.
      [[ $status -ne 0 ]] || status=1
    fi
  fi
  if [[ "$healthchecks_active" == true ]]; then
    if [[ $status -eq 0 && "$backup_complete" == true ]]; then
      healthchecks_ping success
    else
      healthchecks_ping fail
    fi
  fi
  if [[ $status -ne 0 ]]; then
    log "FAILED: $phase (exit $status)." >&2
  fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

[[ $# -le 1 ]] || fail 'Usage: backup.sh [scheduled|predeploy|LABEL|--verify]'
if [[ "$MODE" != --verify && ! "$MODE" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; then
  fail 'Invalid backup label.'
fi
for command in docker flock jq; do
  command -v "$command" >/dev/null 2>&1 || fail "Required command unavailable: $command."
done
[[ -r "$ENV_FILE" && -f "$ENV_FILE" ]] || fail 'Application configuration unavailable.'
[[ -r "$BACKUP_ENV_FILE" && -f "$BACKUP_ENV_FILE" ]] || fail 'Backup credentials file unavailable.'
cd "$DEPLOY_DIR" 2>/dev/null

# Application .env follows the existing deploy script's trusted shell KEY=value format.
set -a
# shellcheck source=/dev/null
if ! . "$ENV_FILE" >/dev/null 2>&1; then
  fail 'Could not load application configuration.'
fi
set +a
set +x

# Backup credentials use Docker env-file syntax, NOT shell evaluation/interpolation.
# Clear inherited/application credentials so missing entries cannot silently fall back.
unset RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_DEFAULT_REGION HEALTHCHECKS_PING_URL
while IFS= read -r line || [[ -n "$line" ]]; do
  line=${line%$'\r'}
  [[ "$line" =~ ^[[:space:]]*$ || "$line" =~ ^[[:space:]]*# ]] && continue
  [[ "$line" == *=* ]] || fail 'Invalid entry in backup credentials file.'
  key=${line%%=*}
  value=${line#*=}
  case "$key" in
    RESTIC_REPOSITORY|RESTIC_PASSWORD|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_DEFAULT_REGION)
      export "$key=$value"
      ;;
    HEALTHCHECKS_PING_URL)
      # Do not export this secret or forward it to Docker containers.
      HEALTHCHECKS_PING_URL=$value
      ;;
    *) fail 'Unsupported entry in backup credentials file.' ;;
  esac
done < "$BACKUP_ENV_FILE"

STAGING_DIR=${BACKUP_STAGING_DIR:-/var/backups/opusto}
LOCK_FILE=${BACKUP_LOCK_FILE:-/var/lib/opusto/backup.lock}
RESTIC_IMAGE=${RESTIC_IMAGE:-restic/restic:0.18.1}
RESTIC_HOST=${BACKUP_HOST:-opusto-production}
MEDIA_VOLUME=${BACKUP_MEDIA_VOLUME:-opusto_media}
RETENTION_ENABLED=${BACKUP_RETENTION_ENABLED:-false}
[[ "$RETENTION_ENABLED" == true || "$RETENTION_ENABLED" == false ]] || fail 'Invalid retention setting.'
[[ "$STAGING_DIR" == /* && "$STAGING_DIR" != / ]] || fail 'Staging directory must be an absolute dedicated path.'

phase=lock
mkdir -p -- "$(dirname "$LOCK_FILE")" 2>/dev/null
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log 'Another backup or verification is running.' >&2
  exit 75
fi
# Do not unlink the lock file: all invocations must lock the same inode.

# A rejected concurrent invocation must not disturb the active job's status.
if [[ "$MODE" != --verify ]]; then
  healthchecks_active=true
  healthchecks_ping start
fi

for key in RESTIC_REPOSITORY RESTIC_PASSWORD AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  [[ -n "${!key:-}" ]] || fail "Required backup setting missing: $key."
done
[[ "$RESTIC_REPOSITORY" == s3:https://* ]] || fail 'Expected an HTTPS S3-compatible repository.'
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-auto}

restic() {
  docker run --rm \
    --env RESTIC_REPOSITORY --env RESTIC_PASSWORD \
    --env AWS_ACCESS_KEY_ID --env AWS_SECRET_ACCESS_KEY --env AWS_DEFAULT_REGION \
    "$RESTIC_IMAGE" "$@"
}

if [[ "$MODE" == --verify ]]; then
  phase=verification
  log 'Checking repository and sampling 5% of stored data.'
  restic check --read-data-subset=5% >/dev/null 2>&1
  restic snapshots --json --host "$RESTIC_HOST" --tag opusto --latest 1 2>/dev/null |
    jq -e 'length > 0' >/dev/null 2>&1
  log 'Repository verification completed; a full restore rehearsal is still required.'
  exit 0
fi

[[ -n "${POSTGRES_USER:-}" && -n "${POSTGRES_DB:-}" ]] || fail 'PostgreSQL configuration missing.'
[[ -r "$COMPOSE_FILE" ]] || fail 'Compose configuration unavailable.'
phase=staging
mkdir -p -- "$STAGING_DIR" 2>/dev/null
run_dir=$(mktemp -d "$STAGING_DIR/run.XXXXXXXX")
dump_file="$run_dir/postgres.dump"

phase=dump
log 'Creating PostgreSQL custom-format dump.'
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom \
  > "$dump_file" 2>/dev/null
[[ -s "$dump_file" ]] || fail 'PostgreSQL dump is empty.'
[[ "$(head -c 5 "$dump_file")" == PGDMP ]] || fail 'PostgreSQL dump is not a custom archive.'

phase=dump-validation
# Decode the entire archive to /dev/null, without connecting to or modifying any database.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_restore --file=/dev/null < "$dump_file" >/dev/null 2>&1

phase=media-validation
# A missing named volume must fail, rather than silently creating an empty volume.
docker volume inspect "$MEDIA_VOLUME" >/dev/null 2>&1

phase=upload
log 'Uploading database and read-only media in one encrypted snapshot.'
docker run --rm \
  --env RESTIC_REPOSITORY --env RESTIC_PASSWORD \
  --env AWS_ACCESS_KEY_ID --env AWS_SECRET_ACCESS_KEY --env AWS_DEFAULT_REGION \
  --mount "type=bind,source=$run_dir,target=/backup,readonly" \
  --mount "type=volume,source=$MEDIA_VOLUME,target=/media,readonly" \
  "$RESTIC_IMAGE" backup --json --host "$RESTIC_HOST" --tag opusto --tag "$MODE" \
  --group-by host /backup/postgres.dump /media > "$run_dir/result.json" 2>/dev/null
snapshot_id=$(jq -er 'select(.message_type == "summary") | .snapshot_id | select(test("^[0-9a-f]{64}$"))' "$run_dir/result.json" 2>/dev/null)

phase=snapshot-validation
restic cat snapshot "$snapshot_id" > "$run_dir/snapshot.json" 2>/dev/null
jq -e --arg host "$RESTIC_HOST" '
  .hostname == $host and
  (.paths | sort) == (["/backup/postgres.dump", "/media"] | sort) and
  (.tags | index("opusto")) != null
' "$run_dir/snapshot.json" >/dev/null 2>&1
restic check >/dev/null 2>&1
log "Snapshot validated: $snapshot_id."

phase=retention
retention() {
  restic forget --host "$RESTIC_HOST" --tag opusto --group-by host \
    --keep-last 1 --keep-daily 7 --keep-weekly 4 --keep-monthly 3 \
    --keep-tag recovery-verified "$@"
}
if [[ "$RETENTION_ENABLED" == true ]]; then
  # Require at least one explicitly restore-tested baseline, and keep it indefinitely.
  restic snapshots --json --host "$RESTIC_HOST" --tag opusto,recovery-verified \
    > "$run_dir/verified.json" 2>/dev/null
  jq -e --arg host "$RESTIC_HOST" 'any(.[];
    .hostname == $host and
    (.paths | sort) == (["/backup/postgres.dump", "/media"] | sort) and
    (.tags | index("opusto")) != null and (.tags | index("recovery-verified")) != null
  )' "$run_dir/verified.json" >/dev/null 2>&1 || fail 'Retention blocked: no restore-verified baseline. Follow the recovery runbook.'
  log 'Applying retention: 7 daily, 4 weekly, 3 monthly; verified baselines retained.'
  retention --prune >/dev/null 2>&1
  restic check >/dev/null 2>&1
else
  log 'Retention dry-run only; no snapshot or pack will be removed.'
  retention --dry-run >/dev/null 2>&1
fi
log 'Encrypted backup completed.'
backup_complete=true
