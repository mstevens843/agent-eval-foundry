# Shared difficulty bank

Which real subjects have attempted which families, and what a cross-family number would mean.

Only **difficulty** banks appear here — banks whose subjects are real models. Mutant banks measure
what a verifier detects and are a different question; they are in
`shared-subject-bank-report.md` and they are never pooled with these.

## The difficulty banks

| family | subjects | counted trials | instances | measured cells | axes | realism |
|---|---|---:|---:|---:|---:|---|
| `prompt-injection-containment` | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` | 6 | 128 | 512 | 0 | simulated-tree |
| `prompt-injection-memory-poisoning` | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` | 8 | 288 | 1152 | 2 | simulated-tree |
| `ui-action-record-replay` | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5`, `gpt-5.6-sol` | 5 | 324 | 1296 | 1 | simulated-tree |
| `ui-replay-live-dom` | `gpt-5.6-sol` | 1 | 864 | 864 | — | dom-like |
| `checker-required-memory-poisoning` | `gpt-5.6-sol` | 1 | 792 | 792 | — | simulated-tree |
| `access-token-scope-expansion` | `gpt-5.6-sol` | 1 | 384 | 384 | — | simulated-tree |
| `durable-approval-outbox` | `claude-opus-5`, `gpt-5.6-sol` | 20 | 24 | 48 | 1 | imported from another harness |

An axis count over a bank of one subject is not meaningful — a single subject cannot separate
anything from anything — so a family with one model's trials shows its instances and leaves the
axis column empty rather than reporting a degenerate 1.

## Subjects that attempted more than one family

| subject | families |
|---|---|
| `claude-haiku-4-5` | `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay` |
| `claude-opus-5` | `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `durable-approval-outbox` |
| `claude-sonnet-5` | `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay` |
| `gpt-5.6-sol` | `prompt-injection-containment`, `prompt-injection-memory-poisoning`, `ui-action-record-replay`, `ui-replay-live-dom`, `checker-required-memory-poisoning`, `access-token-scope-expansion`, `durable-approval-outbox` |

## The verdict

**PARTIAL.** Only 1 subject(s) attempted every family, below the threshold of 3. The combined width is bounded above by the shared bank size, so it cannot distinguish complete overlap from independence. Overlap is reported; no combined axis count is quoted as a headline.

| | |
|---|---:|
| difficulty banks | 7 |
| subjects attempting every family | 1 |
| threshold for a quoted combined count | 3 |
| combined axes over the shared bank | 1 — **a bound, not a measurement** |

With 1 shared subject(s) the combined antichain width is bounded above by 1.
A bound that small cannot distinguish 'these families measure the same thing' from 'they
measure different things', so the number above is reported and not quoted.

## Are these families independent?

`claude-haiku-4-5` has attempted 3 families, which makes a qualitative
comparison possible: how the same model fares on each. That is a real observation and it is
not an axis count — for that, 3 shared subjects are needed.

## The exact trial that unlocks the next claim

2 more subject(s) must attempt every difficulty family. The cheapest
path is running or importing the models that already have trials on one family against the others.
Each line below is a trial that does not exist yet:

```bash
foundry trials campaign prepare --family ui-replay-live-dom --provider claude-haiku --out bundles/ui-replay-live-dom-claude-haiku
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude-haiku

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude-haiku --out bundles/checker-required-memory-poisoning-claude-haiku
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude-haiku

foundry trials campaign prepare --family access-token-scope-expansion --provider claude-haiku --out bundles/access-token-scope-expansion-claude-haiku
foundry trials campaign import --family access-token-scope-expansion bundles/access-token-scope-expansion-claude-haiku

# claude-haiku-4-5 on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.

foundry trials campaign prepare --family ui-replay-live-dom --provider claude --out bundles/ui-replay-live-dom-claude
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude --out bundles/checker-required-memory-poisoning-claude
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude

foundry trials campaign prepare --family access-token-scope-expansion --provider claude --out bundles/access-token-scope-expansion-claude
foundry trials campaign import --family access-token-scope-expansion bundles/access-token-scope-expansion-claude

foundry trials campaign prepare --family ui-replay-live-dom --provider claude-sonnet --out bundles/ui-replay-live-dom-claude-sonnet
foundry trials campaign import --family ui-replay-live-dom bundles/ui-replay-live-dom-claude-sonnet

foundry trials campaign prepare --family checker-required-memory-poisoning --provider claude-sonnet --out bundles/checker-required-memory-poisoning-claude-sonnet
foundry trials campaign import --family checker-required-memory-poisoning bundles/checker-required-memory-poisoning-claude-sonnet

foundry trials campaign prepare --family access-token-scope-expansion --provider claude-sonnet --out bundles/access-token-scope-expansion-claude-sonnet
foundry trials campaign import --family access-token-scope-expansion bundles/access-token-scope-expansion-claude-sonnet

# claude-sonnet-5 on durable-approval-outbox: imported/non-routable bank; run in its source harness and import the result.
```

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
