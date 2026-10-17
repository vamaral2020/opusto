#!/usr/bin/env bash
set +x
set -euo pipefail

# Reuse the same separate credentials, redacted logs and exclusive host lock.
exec bash "$(dirname "$0")/backup.sh" --verify
