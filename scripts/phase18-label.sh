#!/usr/bin/env bash
# One blind root-cause label for one reward-zero attempt.
#
#   phase18-label.sh <openai|anthropic> <evidence-dir> <out-dir>
#
# The labeller receives the public challenge, the submission, the transcript and
# the verifier evidence, and nothing else. It is not told the expected mechanism,
# the reference solution, the mutant bank, the prediction, the campaign decision,
# or the other labeller's answer. It runs in the pinned provider image with no
# repository mount.
set -euo pipefail

PROVIDER="${1:?usage: phase18-label.sh <provider> <evidence-dir> <out-dir>}"
EVIDENCE="${2:?}"
OUTDIR="${3:?}"
IMAGE="agent-eval-foundry/provider-agent:claude-2.1.260-codex-0.152.1"

mkdir -p "$OUTDIR"
STAGE="$(mktemp -d)"
CRED="$(mktemp -d)"
trap 'rm -rf "$STAGE" "$CRED"' EXIT
cp -R "$EVIDENCE/." "$STAGE/"

cat > "$STAGE/instructions.md" <<'EOF'
You are assigning a root cause to one failed attempt at a software repair task.

/work holds everything you get:
  challenge/    the public task exactly as the agent received it
  submission/   what the agent left behind
  transcript    what the agent did
  verifier/     the grader's output, including which checks failed

Read all of it. Then decide WHY this attempt scored zero, choosing exactly one:

  capability            the agent could have satisfied the published requirements
                        from what it was given, and did not
  spec-underspecified   the published text does not determine the graded behaviour
  verifier defect       the grader is wrong, or grades something unpublished
  infrastructure        the environment or provider failed the attempt
  contamination         the attempt was decided by prior knowledge of this exact
                        task rather than by reasoning from the package
  indeterminate         the evidence does not support any of the above

If and only if you choose "capability", also classify WHICH failure it was:
  identity-binding      an authority answer was applied to the wrong identifier
  freshness-boundary    an authorization was treated as current or stale wrongly
  unsafe-issuance       an order was issued that should not have been
  no-work               the required external work was not performed
  liveness              the run abandoned an order instead of deciding it
  broad-implementation  a general failure unrelated to any of the above

Write /work/label.json and nothing else:

{
  "label": "<one of the six causes>",
  "failureClass": null | "<one of the six classes>",
  "confidence": "high" | "medium" | "low",
  "rationale": "<what in the evidence decided it>",
  "falsifier": "<what would have to be true for this label to be wrong>"
}

Judge only this attempt. Do not speculate about how hard the task is in general.
EOF

case "$PROVIDER" in
  anthropic)
    [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] || { echo "CLAUDE_CODE_OAUTH_TOKEN is absent"; exit 2; }
    docker run --rm --network=bridge --read-only --cap-drop=ALL \
      --security-opt=no-new-privileges --user=1000:1000 --env-file=/dev/null \
      --env=CLAUDE_CODE_OAUTH_TOKEN --memory=2g --cpus=2 --pids-limit=256 \
      --mount="type=bind,source=$STAGE,target=/work" \
      --tmpfs /tmp:rw,size=256m --tmpfs /tmp/provider-home:rw,size=512m \
      -w /work "$IMAGE" \
      claude --model opus --effort max --output-format stream-json --verbose \
        --permission-mode bypassPermissions \
        -p "Read /work/instructions.md and follow it exactly." \
      > "$OUTDIR/transcript.jsonl" 2>"$OUTDIR/stderr.log" || true
    ;;
  openai)
    cp "${CODEX_HOME:-$HOME/.codex}/auth.json" "$CRED/auth.json"
    printf 'model = "gpt-5.6-sol"\nmodel_reasoning_effort = "xhigh"\n' > "$CRED/config.toml"
    chmod 700 "$CRED"; chmod 600 "$CRED"/*
    docker run --rm --network=bridge --read-only --cap-drop=ALL \
      --security-opt=no-new-privileges --user=1000:1000 --env-file=/dev/null \
      --memory=2g --cpus=2 --pids-limit=256 \
      --mount="type=bind,source=$STAGE,target=/work" \
      --mount="type=bind,source=$CRED,target=/run/foundry-credential,readonly" \
      --tmpfs /tmp:rw,size=256m --tmpfs /tmp/provider-home:rw,size=512m \
      -w /work "$IMAGE" \
      codex-with-credential exec --json --dangerously-bypass-approvals-and-sandbox \
        --skip-git-repo-check "Read /work/instructions.md and follow it exactly." \
      > "$OUTDIR/transcript.jsonl" 2>"$OUTDIR/stderr.log" || true
    ;;
  *) echo "unknown provider $PROVIDER"; exit 2 ;;
esac

if [ -f "$STAGE/label.json" ]; then
  cp "$STAGE/label.json" "$OUTDIR/label.json"
  echo "label written to $OUTDIR/label.json"
else
  echo "NO LABEL PRODUCED by $PROVIDER"
  exit 1
fi
