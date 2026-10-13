#!/usr/bin/env sh
set -eu

ENV_FILE=${ENV_FILE:-/opt/opusto/.env}
RESTIC_IMAGE=${RESTIC_IMAGE:-restic/restic:0.18.1}

test -r "$ENV_FILE"
docker run --rm --env-file "$ENV_FILE" "$RESTIC_IMAGE" check --read-data-subset=5%
docker run --rm --env-file "$ENV_FILE" "$RESTIC_IMAGE" snapshots --host opusto-production --latest 1
