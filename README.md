# agent-eval-foundry

**A thousand benchmark tasks are only useful if they measure more than one thing.**

This repository builds, packages, trials, kills and evolves agent benchmark families. It reports the
unit that matters: independent failure axes. A scenario count says how much was generated; an axis
count says how many distinct ways the suite can tell implementations apart.

For the conceptual model behind task families, task shapes, scenarios, knobs, axes and the
1000-task methodology, read [`docs/TASK-FAMILY-MODEL.md`](docs/TASK-FAMILY-MODEL.md).

For the rough paper on the most efficient way to run a $100K task-production program, read
[`docs/100K-TASK-PRODUCTION-STRATEGY.md`](docs/100K-TASK-PRODUCTION-STRATEGY.md).

The foundry keeps evidence streams separate:

- **mutant-detection evidence**: a reference and known-bad implementations prove the verifier
  distinguishes specific defects.
- **real-agent difficulty evidence**: counted model trials prove capable agents actually miss the
  family.
- **human-solvability evidence**: clean-room human records prove the public package is understandable
  and solvable without hidden context.
- **adversarial verifier-integrity evidence**: attempted bypass audits test whether the grader can
  be fooled without solving the task.
- **cross-family evidence**: shared subjects prove whether different families measure different
  things.

Every counted trial preserves the transcript, submission, verifier output, scenario-set id and
challenge hash. Refusals, entitlement failures, infra failures, stale hashes and contaminated manual
runs never count.

The foundry now separates three claims: a reference can solve it, a clean public package can be
handed to a human, and an independent human has actually solved it. Those are different evidence
levels and the reports do not merge them.

Cheat resistance is not the same claim as no bypass found. Cheat resistance is the design
requirement; adversarial audit is the attempted exploit record.

## Evidence Snapshot

| family | scenarios | counted trials | failed >=1 | mutant axes | agent axes | human claim | verifier integrity | verdict |
|---|---:|---:|---:|---:|---|---|---|---|
| `prompt-injection-containment` | 128 | 6 | 0 | 4 | 0 | human-ready | adversarial-ready | **NOT-READY**: already-solved |
| `prompt-injection-memory-poisoning` | 288 | 8 | 5 | 3 | >=2 | human-ready | adversarial-ready | **SHIP**: cross-lab failure generalises |
| `ui-action-record-replay` | 324 | 5 | 5 | 6 | 1 | human-ready | adversarial-ready | **SHIP**: useful but chain-limited |
| `ui-replay-live-dom` | 864 | 1 | 1 | 19 | not claimed yet | human-ready | adversarial-audited; OpenAI-only | **SHIP**: descendant, packaged and difficulty-evidenced |
| `checker-required-memory-poisoning` | 792 | 1 | 1 | 12 | not claimed yet | human-ready | adversarial-audited; OpenAI-only | **SHIP**: required-checker gap, OpenAI-only |
| `durable-approval-outbox` | 24 | 20 imported | 20 | 3 | 1 | reference-solvable | audit-pending; imported historical no-count | **SHIP**: imported historical bank |

Current live-DOM package hash: `18c3f5afc5973604205cd7df23ce4cad`.
Current checker-required package hash: `448f2f816c51030cc97a374816226168`.

## What Changed In This Phase

Adversarial Audit v2 upgrades verifier-integrity from preserved attack records to mechanical triage.
Attack packets now carry an execution profile, an isolation profile, an exploit-artifact schema, an
exploit replay path, deterministic hardening probes and hash/current-verifier countability rules.
Five current package-backed families are `adversarial-ready`.

Two real Codex/OpenAI adversarial audits counted as no-bypass evidence: one against
`ui-replay-live-dom` under challenge hash `18c3f5afc5973604205cd7df23ce4cad`, and one against
`checker-required-memory-poisoning` under hash `448f2f816c51030cc97a374816226168`. Both used the
implemented `fs-sandbox` profile, preserved transcript/verifier/replay output, and found no
replayable contract-violating artifact. This is OpenAI-only verifier-integrity evidence, not
cross-lab evidence. One older Live-DOM attack is preserved as a no-count provider refusal, and one
v2 Live-DOM run is preserved as a no-count local infrastructure error. Durable Outbox has a
historical `/cheat` no-bypass summary imported with caveats, but this repo lacks the native packet,
transcript and current package hash needed to count it.

The human-solvability layer audits challenge packages for clean-room human review and validates
future human solve records against stable rule codes. Package-backed built families remain
`human-ready`; none are `human-evidenced` yet because no independent clean human solve is on record.
A contaminated author walkthrough is preserved only as a format example.

`ui-action-record-replay` shipped, but its five counted agent failure sets form a chain: 33, 46, 62,
62 and 90 failed scenarios, all nested. That means one difficulty axis at several sensitivities, not
breadth.

`ui-replay-live-dom` is the descendant fix. It adds a mutable DOM-like tree, finite settling,
hidden confirmations, stale handles, duplicate-effect prevention and categorical address conflict.
The categorical axis is measured: `testid-loyalist`, `semantic-loyalist` and `path-loyalist` are
pairwise incomparable over the 864-scenario measured set.

The live-DOM challenge package is now real and leak-checked: 9 visible files, a precise `SPEC.md`,
types/API, starter implementation, visible examples and manifest. The verifier, reference, mutants,
hidden scenarios, answer matrix and policy implementation are excluded by path and content checks.

One real Codex/OpenAI trial ran against that exact package hash. The first local slot failed before
artifact creation and is preserved as uncounted infrastructure evidence. The escalated retry counted:
`live-dom-2026-08-o2`, `openai/gpt-5.6-sol`, 864 graded scenarios, 219 failed. Failures were on
`replay_completes` and `precondition_observed`.

This is real-agent difficulty evidence, not a cross-lab claim. With one counted live-DOM subject,
agent-axis breadth is intentionally unclaimed.

## Core Commands

```bash
pnpm build
node dist/cli.js check
node dist/cli.js all

node dist/cli.js family sweep --family ui-replay-live-dom
node dist/cli.js family sweep --family checker-required-memory-poisoning
node dist/cli.js challenge build --family ui-replay-live-dom
node dist/cli.js challenge build --family checker-required-memory-poisoning
node dist/cli.js trials campaign providers
node dist/cli.js trials campaign prepare --family ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-external
node dist/cli.js trials campaign prepare --family checker-required-memory-poisoning --provider external --out bundles/checker-required-memory-poisoning-external
node dist/cli.js trials campaign run --family ui-replay-live-dom --only O2
node dist/cli.js trials campaign run --family checker-required-memory-poisoning --only O1
node dist/cli.js trials campaign reconcile --family ui-replay-live-dom
node dist/cli.js trials verify --family ui-replay-live-dom live-dom-2026-08-o2
node dist/cli.js trials verify --family checker-required-memory-poisoning checker-required-2026-08-o1
node dist/cli.js human readiness
node dist/cli.js human solvability
node dist/cli.js adversarial readiness
node dist/cli.js adversarial campaign ui-replay-live-dom
node dist/cli.js adversarial prepare ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-adversarial
node dist/cli.js adversarial run ui-replay-live-dom --provider codex --run-id live-dom-adversarial-v2-codex-next --timeout 900000
node dist/cli.js adversarial verify live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial replay live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial triage live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial isolate verify bundles/ui-replay-live-dom-adversarial
node dist/cli.js adversarial probe ui-replay-live-dom
node dist/cli.js adversarial v2 report
node dist/cli.js adversarial report
pnpm bundles
```

Provider reality is explicit. Codex/OpenAI is configured locally. Anthropic/Claude is import-only in
this phase because the account is out of tokens and should not be executed. Gemini is
entitlement-blocked unless a future authenticated run changes that. External runs use prepared
bundles and strict import checks.

## Live-DOM SPEC Contract

The agent-visible live-DOM spec defines:

- UI state model and DOM-like realism level.
- action trace format, selector types, semantic anchors, structural paths and test ids.
- anchor conflict resolution: no address type has global priority; choose the live node whose visible
  entity, effect and precondition facts still match the recorded target.
- finite settle budget and the exact meaning of observation.
- what `aria-busy` means and does not mean.
- hidden confirmation state, disabled/enabled transitions and duplicate side-effect prevention.
- replay without a model in the loop.
- audit trail requirements, legal/illegal outcomes and the expected submission interface.

The family is **dom-like**, not browser-backed. There is no renderer, layout, CSS matching or browser
event loop. A browser-backed descendant would be a new family with new evidence.

The browser-backed foundation now exists inside this repo as `ui-replay-browser-backed`: typed page
fixtures, harness contract, effect-ledger boundary, trace format, selector-conflict scenarios,
readiness gates, reports and a small preserved Playwright sweep. The measured browser-backed slice
has 3 scenarios, 4 subjects, 12 cells and 3 mutant-detection axes. It is **not** real-agent
difficulty evidence and it does not relabel Live-DOM; Live-DOM remains dom-like.

## Checker-Required Variant

The self-check reports found a separate gap: models often describe checkers but do not ship them.
The first checker-required descendant is now built, packaged and trialed as
`checker-required-memory-poisoning`.

The visible package requires:

- `subject.mjs`
- `checker.mjs`

The hidden verifier grades both the implementation and the submitted checker. It tests reference
behavior, held-out bad traces, bad transitions, false success, missing audit evidence, liveness
stalls, duplicated effects, late cancellation, provenance loss, status-only checking, receipt
trusting, no-checker/stub-checker cases and nondeterminism.

The measured set is 792 scenarios from a 2,376-point declared space. The reference is clean, 20/20
known-bad checker/subject submissions fail by intended named checks, and the mutant bank yields 12
independent mutant-detection axes. One counted Codex/OpenAI trial ran under hash
`448f2f816c51030cc97a374816226168` and failed 614/792 scenarios.

Status: **SHIP** under the current gate table. This is real-agent difficulty evidence for one
OpenAI subject only. It is not cross-lab breadth, and repeated OpenAI runs stay repeated trials
unless a genuinely different model subject is available.

## Reports

Key generated reports:

- `reports/ui-replay-live-dom-spec-report.md`
- `reports/ui-replay-live-dom-challenge-package-report.md`
- `reports/ui-replay-live-dom-categorical-anchor-report.md`
- `reports/ui-replay-live-dom-trial-campaign.md`
- `reports/ui-replay-live-dom-agent-results.md`
- `reports/ui-replay-live-dom-codex-diagnosis.md`
- `reports/ui-replay-live-dom-axis-report.md`
- `reports/checker-required-family-report.md`
- `reports/checker-required-memory-poisoning-agent-results.md`
- `reports/checker-required-memory-poisoning-axis-report.md`
- `reports/ui-replay-browser-backed-scaffold.md`
- `reports/ui-replay-browser-backed-readiness.md`
- `reports/human-readiness-report.md`
- `reports/human-solvability-report.md`
- `reports/adversarial-readiness-report.md`
- `reports/adversarial-audit-report.md`
- `reports/adversarial-campaign-report.md`
- `reports/adversarial-v2-report.md`
- `reports/adversarial-isolation-report.md`
- `reports/adversarial-exploit-replay-report.md`
- `reports/adversarial-hardening-probes-report.md`
- `reports/adversarial-container-isolation-report.md`
- `reports/adversarial-import-report.md`
- `reports/ui-replay-browser-backed-report.md`
- `reports/ui-replay-browser-backed-axis-report.md`
- `reports/shared-difficulty-bank-report.md`
- `reports/cross-family-axis-report.md`
- `reports/ship-gate-report.md`
- `reports/foundry-evolution-report.md`
- `reports/budget-plan.md`

Reports label measured, estimated, mutant-detection, real-agent difficulty, not-run, refused,
infrastructure_error, stale, superseded, simulated-tree, dom-like and browser-backed only when those
labels are actually supported.

## Shared-Bank Status

The shared bank is now **PARTIAL** across all difficulty families. `gpt-5.6-sol` has attempted
live-DOM and the earlier built families; the Anthropic subjects have not attempted live-DOM in this
phase. A full cross-family axis count over every current difficulty family needs at least three
subjects sharing the same families and package hashes.

The older three-family comparison remains useful historical context, but the live-DOM descendant is
not merged into its parent. Parent UI replay remains SHIP with a one-axis chain limitation; live-DOM
is a separate descendant with its own package hash, scenario set and trial evidence.

## Verification

```bash
pnpm exec tsc --noEmit --pretty false
pnpm lint
pnpm test
pnpm build
node dist/cli.js check
node dist/cli.js all
node dist/cli.js adversarial isolate container verify bundles/ui-replay-live-dom-adversarial-container
node dist/cli.js browser-backed verify
```

The tests include known-bad cases for missing SPEC sections, challenge leaks, nested anchor
strategies, stale hashes, verifier-only SHIP claims, missing `checker.mjs`, vacuous checkers,
invalid counted human reviews, adversarial audit countability, stale attack hashes, hidden verifier
leaks, provider refusal paths, v2 isolation/replay/triage failures, deterministic hardening probes,
browser-backed measurement gates, candidate ledger drift and deterministic reports.

## Current Claim

`agent-eval-foundry` can take a mutant-measured descendant family, write the fairness spec,
package the agent-facing challenge without leaks, add categorical anti-nesting structure, run or
prepare real provider campaigns, pre-register verifier-bypass audits, replay claimed exploits, run
deterministic verifier-integrity hardening probes, and preserve the distinction between
mutant-detection axes, real-agent difficulty evidence, human solvability and adversarial
verifier-integrity evidence.

The strongest current result is still memory-poisoning generalisation across labs. The newest result
is that verifier-integrity now has explicit container/no-network bundle and countability rules,
while the local Docker daemon is unavailable and therefore no container/no-network audit counts.
There are still two counted Codex/OpenAI no-bypass audits under `fs-sandbox`; there is zero counted
non-OpenAI adversarial evidence in this repo. The next highest-leverage work is to run the same
container/no-network audit once Docker is available, import preserved non-OpenAI audits under the
current hashes, and expand `ui-replay-browser-backed` from measured mutant slice to package-backed
agent-trial family.
