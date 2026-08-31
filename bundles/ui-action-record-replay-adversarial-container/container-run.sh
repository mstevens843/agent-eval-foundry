#!/usr/bin/env bash
set -euo pipefail
BUNDLE_DIR="$(cd "$(dirname "$0")" && pwd)"
docker run --rm \
  --network none \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --user 1000:1000 \
  --workdir /workspace \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --mount "type=bind,source=${BUNDLE_DIR},target=/workspace,readonly" \
  --mount "type=bind,source=${BUNDLE_DIR}/exploit,target=/workspace/exploit" \
  --mount "type=bind,source=${BUNDLE_DIR}/submitted-bypass,target=/workspace/submitted-bypass" \
  node:22-alpine \
  sh -lc "test -r challenge/README.md && test ! -e src && test ! -e reports && test -w exploit && test -w submitted-bypass && printf 'container isolation smoke passed\\n'"
