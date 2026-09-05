#!/usr/bin/env bash
# Run the vendored upstream Terminal-Bench static checks against a task directory.
# The checks need python3 with tomllib, so they run in a pinned container.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TASK="${1:?usage: run-tb-checks.sh <task-dir-relative-to-repo-root>}"
docker run --rm -v "$ROOT:/repo" -w /repo python:3.12-slim bash -c '
  apt-get update >/dev/null 2>&1 && apt-get install -y --no-install-recommends jq >/dev/null 2>&1
  pass=0; fail=0; failed=()
  for check in scripts/tb-upstream-checks/check-*.sh; do
    name=$(basename "$check" .sh)
    if out=$(bash "$check" "'"$TASK"'" 2>&1); then
      printf "  %-42s ok\n" "$name"; pass=$((pass+1))
    else
      printf "  %-42s FAIL\n" "$name"; fail=$((fail+1)); failed+=("$name")
      echo "$out" | sed "s/^/        /" | tail -6
    fi
  done
  echo
  echo "passed=$pass failed=$fail"
  [ "$fail" -eq 0 ]
'
