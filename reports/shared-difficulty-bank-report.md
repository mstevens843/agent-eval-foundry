# Shared difficulty bank

Which real subjects have attempted which families, and what a cross-family number would mean.

Only **difficulty** banks appear here — banks whose subjects are real models. Mutant banks measure
what a verifier detects and are a different question; they are in
`shared-subject-bank-report.md` and they are never pooled with these.

## The difficulty banks

| family | subjects | counted trials | instances | measured cells | axes | realism |
|---|---|---:|---:|---:|---:|---|
| `prompt-injection-containment` | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` | 6 | 128 | 512 | 0 | simulated-tree |
| `ui-action-record-replay` | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` | 5 | 324 | 1296 | 1 | simulated-tree |
| `ui-replay-live-dom` | `gpt-5.6-sol` | 1 | 864 | 864 | — | dom-like |
| `checker-required-memory-poisoning` | `gpt-5.6-sol` | 1 | 792 | 792 | — | simulated-tree |
| `caa-revalidation` | `anthropic-claude-opus`, `openai-gpt-5.6-sol` | 4 | 24 | 48 | 0 | simulated-tree |
| `dao-descendant` | `claude-claude-opus-5`, `codex-gpt-5.6-sol` | 2 | 24 | 48 | 0 | simulated-tree |
| `trading-reconciliation-recompute` | `claude-claude-opus-5`, `codex-gpt-5.6-sol` | 2 | 24 | 48 | 0 | simulated-tree |
| `deployment-rollback-recompute` | `claude-claude-opus-5`, `codex-gpt-5.6-sol` | 2 | 24 | 48 | 0 | simulated-tree |
| `durable-approval-outbox` | `claude-opus-5`, `gpt-5.6-sol` | 20 | 24 | 48 | 1 | imported from another harness |

An axis count over a bank of one subject is not meaningful — a single subject cannot separate
anything from anything — so a family with one model's trials shows its instances and leaves the
axis column empty rather than reporting a degenerate 1.

## Subjects that attempted more than one family

| subject | families |
|---|---|
| `claude-claude-opus-5` | `dao-descendant`, `trading-reconciliation-recompute`, `deployment-rollback-recompute` |
| `claude-haiku-4-5` | `prompt-injection-containment`, `ui-action-record-replay` |
| `claude-opus-5` | `prompt-injection-containment`, `ui-action-record-replay`, `durable-approval-outbox` |
| `claude-sonnet-5` | `prompt-injection-containment`, `ui-action-record-replay` |
| `codex-gpt-5.6-sol` | `dao-descendant`, `trading-reconciliation-recompute`, `deployment-rollback-recompute` |
| `gpt-5.6-sol` | `prompt-injection-containment`, `ui-action-record-replay`, `ui-replay-live-dom`, `checker-required-memory-poisoning`, `durable-approval-outbox` |

## The verdict

**REFUSED.** No subject attempted more than one family, so co-failure across families is unobservable. The union matrix is null in every cross cell and its antichain width is the sum of the parts by construction — two families testing the identical mechanism would also 'add'. No combined count is available.

| | |
|---|---:|
| difficulty banks | 9 |
| subjects attempting every family | 0 |
| threshold for a quoted combined count | 3 |
| combined axes | not computable |



## Are these families independent?

`claude-claude-opus-5` has attempted 3 families, which makes a qualitative
comparison possible: how the same model fares on each. That is a real observation and it is
not an axis count — for that, 3 shared subjects are needed.

## The exact trial that unlocks the next claim

3 more subject(s) must attempt every difficulty family. The cheapest
path is running or importing the models that already have trials on one family against the others.
Each line below is a trial that does not exist yet:

```bash
foundry trials campaign prepare --family prompt-injection-containment --provider external --out bundles/prompt-injection-containment-external
foundry trials campaign import --family prompt-injection-containment bundles/prompt-injection-containment-external

foundry trials campaign prepare --family ui-action-record-replay --provider external --out bundles/ui-action-record-replay-external
foundry trials campaign import --family ui-action-record-replay bundles/ui-action-record-replay-external

foundry trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-external

foundry trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-external

foundry trials campaign prepare --family dao-descendant --provider external --out bundles/dao-descendant-external
foundry trials campaign import --family dao-descendant bundles/dao-descendant-external

foundry trials campaign prepare --family trading-reconciliation-recompute --provider external --out bundles/trading-reconciliation-recompute-external
foundry trials campaign import --family trading-reconciliation-recompute bundles/trading-reconciliation-recompute-external

foundry trials campaign prepare --family deployment-rollback-recompute --provider external --out bundles/deployment-rollback-recompute-external
foundry trials campaign import --family deployment-rollback-recompute bundles/deployment-rollback-recompute-external

# anthropic-claude-opus on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials campaign prepare --family prompt-injection-containment --provider external --out bundles/prompt-injection-containment-external
foundry trials campaign import --family prompt-injection-containment bundles/prompt-injection-containment-external

foundry trials campaign prepare --family ui-action-record-replay --provider external --out bundles/ui-action-record-replay-external
foundry trials campaign import --family ui-action-record-replay bundles/ui-action-record-replay-external

foundry trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-external

foundry trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-external

foundry trials campaign prepare --family caa-revalidation --provider external --out bundles/caa-revalidation-external
foundry trials campaign import --family caa-revalidation bundles/caa-revalidation-external

# claude-claude-opus-5 on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials campaign prepare --family ui-replay-live-dom --provider claude-haiku --out bundles/ui-replay-live-dom-claude-haiku
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude-haiku

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude-haiku --out bundles/checker-required-memory-poisoning-claude-haiku
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude-haiku

foundry trials campaign prepare --family caa-revalidation --provider claude-haiku --out bundles/caa-revalidation-claude-haiku
foundry trials campaign import --family caa-revalidation bundles/caa-revalidation-claude-haiku

foundry trials campaign prepare --family dao-descendant --provider claude-haiku --out bundles/dao-descendant-claude-haiku
foundry trials campaign import --family dao-descendant bundles/dao-descendant-claude-haiku

foundry trials campaign prepare --family trading-reconciliation-recompute --provider claude-haiku --out bundles/trading-reconciliation-recompute-claude-haiku
foundry trials campaign import --family trading-reconciliation-recompute bundles/trading-reconciliation-recompute-claude-haiku

foundry trials campaign prepare --family deployment-rollback-recompute --provider claude-haiku --out bundles/deployment-rollback-recompute-claude-haiku
foundry trials campaign import --family deployment-rollback-recompute bundles/deployment-rollback-recompute-claude-haiku

# claude-haiku-4-5 on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials campaign prepare --family ui-replay-live-dom --provider claude --out bundles/ui-replay-live-dom-claude
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude --out bundles/checker-required-memory-poisoning-claude
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude

foundry trials campaign prepare --family caa-revalidation --provider claude --out bundles/caa-revalidation-claude
foundry trials campaign import --family caa-revalidation bundles/caa-revalidation-claude

foundry trials campaign prepare --family dao-descendant --provider claude --out bundles/dao-descendant-claude
foundry trials campaign import --family dao-descendant bundles/dao-descendant-claude

foundry trials campaign prepare --family trading-reconciliation-recompute --provider claude --out bundles/trading-reconciliation-recompute-claude
foundry trials campaign import --family trading-reconciliation-recompute bundles/trading-reconciliation-recompute-claude

foundry trials campaign prepare --family deployment-rollback-recompute --provider claude --out bundles/deployment-rollback-recompute-claude
foundry trials campaign import --family deployment-rollback-recompute bundles/deployment-rollback-recompute-claude

foundry trials campaign prepare --family ui-replay-live-dom --provider claude-sonnet --out bundles/ui-replay-live-dom-claude-sonnet
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude-sonnet

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude-sonnet --out bundles/checker-required-memory-poisoning-claude-sonnet
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude-sonnet

foundry trials campaign prepare --family caa-revalidation --provider claude-sonnet --out bundles/caa-revalidation-claude-sonnet
foundry trials campaign import --family caa-revalidation bundles/caa-revalidation-claude-sonnet

foundry trials campaign prepare --family dao-descendant --provider claude-sonnet --out bundles/dao-descendant-claude-sonnet
foundry trials campaign import --family dao-descendant bundles/dao-descendant-claude-sonnet

foundry trials campaign prepare --family trading-reconciliation-recompute --provider claude-sonnet --out bundles/trading-reconciliation-recompute-claude-sonnet
foundry trials campaign import --family trading-reconciliation-recompute bundles/trading-reconciliation-recompute-claude-sonnet

foundry trials campaign prepare --family deployment-rollback-recompute --provider claude-sonnet --out bundles/deployment-rollback-recompute-claude-sonnet
foundry trials campaign import --family deployment-rollback-recompute bundles/deployment-rollback-recompute-claude-sonnet

# claude-sonnet-5 on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials campaign prepare --family prompt-injection-containment --provider external --out bundles/prompt-injection-containment-external
foundry trials campaign import --family prompt-injection-containment bundles/prompt-injection-containment-external

foundry trials campaign prepare --family ui-action-record-replay --provider external --out bundles/ui-action-record-replay-external
foundry trials campaign import --family ui-action-record-replay bundles/ui-action-record-replay-external

foundry trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-external

foundry trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-external

foundry trials campaign prepare --family caa-revalidation --provider external --out bundles/caa-revalidation-external
foundry trials campaign import --family caa-revalidation bundles/caa-revalidation-external

# codex-gpt-5.6-sol on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials run --family caa-revalidation --run-id revalidation-codex-1 \
  --model openai/gpt-5.6-sol --provider shell --inherit-env \
  --command codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check '{instruction}'

foundry trials run --family dao-descendant --run-id descendant-codex-1 \
  --model openai/gpt-5.6-sol --provider shell --inherit-env \
  --command codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check '{instruction}'

foundry trials run --family trading-reconciliation-recompute --run-id recompute-codex-1 \
  --model openai/gpt-5.6-sol --provider shell --inherit-env \
  --command codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check '{instruction}'

foundry trials run --family deployment-rollback-recompute --run-id recompute-codex-1 \
  --model openai/gpt-5.6-sol --provider shell --inherit-env \
  --command codex exec --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check '{instruction}'

foundry trials campaign prepare --family prompt-injection-containment --provider external --out bundles/prompt-injection-containment-external
foundry trials campaign import --family prompt-injection-containment bundles/prompt-injection-containment-external

foundry trials campaign prepare --family ui-action-record-replay --provider external --out bundles/ui-action-record-replay-external
foundry trials campaign import --family ui-action-record-replay bundles/ui-action-record-replay-external

foundry trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-external

foundry trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-external

foundry trials campaign prepare --family dao-descendant --provider external --out bundles/dao-descendant-external
foundry trials campaign import --family dao-descendant bundles/dao-descendant-external

foundry trials campaign prepare --family trading-reconciliation-recompute --provider external --out bundles/trading-reconciliation-recompute-external
foundry trials campaign import --family trading-reconciliation-recompute bundles/trading-reconciliation-recompute-external

foundry trials campaign prepare --family deployment-rollback-recompute --provider external --out bundles/deployment-rollback-recompute-external
foundry trials campaign import --family deployment-rollback-recompute bundles/deployment-rollback-recompute-external

# openai-gpt-5.6-sol on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.
```

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
