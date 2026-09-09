#!/usr/bin/env bash
# Run pinned upstream checks using installed Python 3.11+, bash, and jq.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASK="${1:?usage: run-tb-checks.sh TASK [FRESH_OUTPUT]}"
OUTPUT="${2:-$ROOT/.local/tb-static-$(date +%s)-$$}"
exec node "$ROOT/scripts/check-harbor-tasks.mjs" "$OUTPUT" "$ROOT/scripts/tb-upstream-checks" "$TASK"
