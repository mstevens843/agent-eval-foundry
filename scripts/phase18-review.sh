#!/usr/bin/env bash
# One blinded validity review of the frozen Phase 18 package.
#
#   phase18-review.sh <openai|anthropic> <out-dir>
#
# The reviewer runs in the pinned provider image with the packet mounted read-only
# and no repository mount. It sees the packet and nothing else: not this
# repository, not the verifier source, not the other reviewer's answer.
set -euo pipefail

PROVIDER="${1:?usage: phase18-review.sh <openai|anthropic> <out-dir>}"
OUTDIR="${2:?usage: phase18-review.sh <openai|anthropic> <out-dir>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="agent-eval-foundry/provider-agent:claude-2.1.260-codex-0.152.1"
PACKET="$ROOT/data/phase-18-reader-packet.json"

mkdir -p "$OUTDIR"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$PACKET" "$STAGE/packet.json"

cat > "$STAGE/instructions.md" <<'EOF'
You are reviewing a candidate benchmark task for VALIDITY. You are not estimating
how hard it is, and you are not being asked whether you like it.

/work/packet.json holds the complete public package an agent would receive, the
review question, the six required dimensions, and the verifier's map from each
graded check to the section of the specification it enforces.

Read it in full. Then judge each of the six required dimensions as "pass" or
"fail". Kill the candidate on the EARLIEST dimension that fails.

Write your answer to /work/review.json and nothing else, in exactly this shape:

{
  "dimensions": {
    "requirement traceability": "pass" | "fail",
    "outcome specification": "pass" | "fail",
    "fairness": "pass" | "fail",
    "anti-cheat": "pass" | "fail",
    "terminal-bench compliance": "pass" | "fail",
    "hidden-scenario legitimacy": "pass" | "fail"
  },
  "verdict": "promote" | "kill",
  "earliestFailedDimension": null | "<dimension name>",
  "rationale": "<your reasoning, including the strongest argument AGAINST your own verdict and why you rejected it>"
}

"promote" means the candidate is valid and may be measured against real agents.
It does NOT mean the candidate is difficult; difficulty is measured later and is
none of your business here. Be specific and quote the package where it matters.
EOF

case "$PROVIDER" in
  anthropic)
    [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] || { echo "CLAUDE_CODE_OAUTH_TOKEN is absent"; exit 2; }
    docker run --rm --network=bridge --read-only --cap-drop=ALL \
      --security-opt=no-new-privileges --user=1000:1000 --env-file=/dev/null \
      --env=CLAUDE_CODE_OAUTH_TOKEN \
      --memory=2g --cpus=2 --pids-limit=256 \
      --mount="type=bind,source=$STAGE,target=/work" \
      --tmpfs /tmp:rw,size=256m --tmpfs /tmp/provider-home:rw,size=256m \
      -w /work "$IMAGE" \
      claude --model opus --effort max --output-format stream-json --verbose \
        --permission-mode bypassPermissions \
        -p "Read /work/instructions.md and follow it exactly." \
      > "$OUTDIR/transcript.jsonl" 2>"$OUTDIR/stderr.log" || true
    ;;
  openai)
    CRED="$(mktemp -d)"
    trap 'rm -rf "$STAGE" "$CRED"' EXIT
    cp "${CODEX_HOME:-$HOME/.codex}/auth.json" "$CRED/auth.json"
    printf 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "xhigh"\n' > "$CRED/config.toml"
    chmod 700 "$CRED"; chmod 600 "$CRED"/*
    docker run --rm --network=bridge --read-only --cap-drop=ALL \
      --security-opt=no-new-privileges --user=1000:1000 --env-file=/dev/null \
      --memory=2g --cpus=2 --pids-limit=256 \
      --mount="type=bind,source=$STAGE,target=/work" \
      --mount="type=bind,source=$CRED,target=/run/foundry-credential,readonly" \
      --tmpfs /tmp:rw,size=256m --tmpfs /tmp/provider-home:rw,size=256m \
      -w /work "$IMAGE" \
      codex-with-credential exec --json --dangerously-bypass-approvals-and-sandbox \
        --skip-git-repo-check "Read /work/instructions.md and follow it exactly." \
      > "$OUTDIR/transcript.jsonl" 2>"$OUTDIR/stderr.log" || true
    ;;
  *) echo "unknown provider $PROVIDER"; exit 2 ;;
esac

if [ -f "$STAGE/review.json" ]; then
  cp "$STAGE/review.json" "$OUTDIR/review.json"
  echo "review written to $OUTDIR/review.json"
else
  echo "NO REVIEW PRODUCED by $PROVIDER"
  exit 1
fi
