# agent-eval-foundry

**A thousand benchmark tasks are only useful if they measure more than one thing.**

This repository builds, packages, trials, kills and evolves agent benchmark families. It reports the
unit that matters: independent failure axes. A scenario count says how much was generated; an axis
count says how many distinct ways the suite can tell implementations apart.

The foundry keeps three evidence streams separate:

- **mutant-detection evidence**: a reference and known-bad implementations prove the verifier
  distinguishes specific defects.
- **real-agent difficulty evidence**: counted model trials prove capable agents actually miss the
  family.
- **cross-family evidence**: shared subjects prove whether different families measure different
  things.

Every counted trial preserves the transcript, submission, verifier output, scenario-set id and
challenge hash. Refusals, entitlement failures, infra failures, stale hashes and contaminated manual
runs never count.

## Evidence Snapshot

| family | scenarios | counted trials | failed >=1 | mutant axes | agent axes | verdict |
|---|---:|---:|---:|---:|---|---|
| `prompt-injection-containment` | 128 | 6 | 0 | 4 | 0 | **NOT-READY**: already-solved |
| `prompt-injection-memory-poisoning` | 288 | 8 | 5 | 3 | >=2 | **SHIP**: cross-lab failure generalises |
| `ui-action-record-replay` | 324 | 5 | 5 | 6 | 1 | **SHIP**: useful but chain-limited |
| `ui-replay-live-dom` | 864 | 1 | 1 | 19 | not claimed yet | **SHIP**: descendant, packaged and difficulty-evidenced |
| `checker-required-memory-poisoning` | 792 | 1 | 1 | 12 | not claimed yet | **SHIP**: required-checker gap, OpenAI-only |
| `durable-approval-outbox` | 24 | 20 imported | 20 | 3 | 1 | **SHIP**: imported historical bank |

Current live-DOM package hash: `18c3f5afc5973604205cd7df23ce4cad`.
Current checker-required package hash: `448f2f816c51030cc97a374816226168`.

## What Changed In This Phase

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
```

The tests include known-bad cases for missing SPEC sections, challenge leaks, nested anchor
strategies, stale hashes, verifier-only SHIP claims, missing `checker.mjs`, vacuous checkers, provider
unavailability, candidate ledger drift and deterministic reports.

## Current Claim

`agent-eval-foundry` can take a mutant-measured descendant family, write the fairness spec,
package the agent-facing challenge without leaks, add categorical anti-nesting structure, run or
prepare real provider campaigns, and preserve the distinction between mutant-detection axes and
real-agent difficulty evidence.

The strongest current result is still memory-poisoning generalisation across labs. The newest result
is that checker-required is now package-backed, mutant-measured and difficulty-evidenced by one
counted Codex/OpenAI failure. The next highest-leverage work is to import or run non-OpenAI
live-DOM and checker-required trials under the same hashes, then implement the browser-backed UI
descendant scaffold.
