# agent-eval-foundry

**A thousand benchmark tasks are only useful if they measure more than one thing.**

This repository builds, packages, trials, kills and evolves agent benchmark families. It reports the
unit that matters: independent failure axes. A scenario count says how much was generated; an axis
count says how many distinct ways the suite can tell implementations apart.

For the conceptual model behind task families, task shapes, scenarios, knobs, axes and the
1000-task methodology, read [`docs/TASK-FAMILY-MODEL.md`](docs/TASK-FAMILY-MODEL.md).

For the rough paper on the most efficient way to run a $100K task-production program, read
[`docs/100K-TASK-PRODUCTION-STRATEGY.md`](docs/100K-TASK-PRODUCTION-STRATEGY.md).

The production funnel is now adaptive. Candidate mechanisms enter **Discovery Mode** as tiny
mechanism probes, survivors enter **Validation Mode** as full families with references/verifiers and
one-agent smoke trials, and only evidence-backed families enter **Production Mode** for transfer
tests, cross-provider matrices, human review and adversarial audit. The next action is computed from
evidence, not a fixed checklist.

Discovery Workbench v1 feeds that funnel. It scores the candidate pool in
`data/candidate-pool.json`, applies deterministic cheap screens, builds a promotion queue,
separates surface coverage from defect-axis diversity and can emit a task-shape draft from a
promoted candidate. The pool size and every score are in the generated report; this page does not
restate them. See
[`reports/discovery-workbench-report.md`](reports/discovery-workbench-report.md). Candidate scores
are routing evidence only; they are not difficulty evidence until a built family has counted trials.

Mechanism Probe Runner v1 adds the next bridge: top candidates can now run tiny deterministic
probes before full family build. See
[`reports/mechanism-probe-report.md`](reports/mechanism-probe-report.md). Probe evidence
can promote, repair, transfer, evolve, hold or kill a candidate, but it is still not real-agent
difficulty evidence.

Promoted Family Build Pipeline v1 closes the upstream loop for one probe. The first ranked promoted
probe, `access-token-scope-expansion-probe`, has a promotion record, a reusable scaffold bridge and
a full validation-mode family with local reference/mutant/package evidence. See
[`reports/promotion-report.md`](reports/promotion-report.md). This proves candidate -> probe ->
promotion -> family local evidence, not agent difficulty.

> ### Withdrawn 2026-09-01 — the access-token lineage never had a counted trial
>
> `access-token-scope-expansion`, `delegated-wallet-scope-reconciliation` and
> `deployment-model-alias-rollout-drift` each shipped a starter implementation that was a complete
> passing solution of its own suite. Every trial graded against those packages was grading the
> answer key. The starters are stripped, the packages re-hashed, and all four trials
> (`access-token-2026-08-o1`, `delegated-wallet-2026-08-o1`,
> `deployment-model-alias-rollout-drift-2026-08-o1`, `deployment-alias-2026-09-claude-1`) are
> **superseded and do not count**.
>
> Withdrawn with them, and not restated with corrected numbers: *the access-token family is already
> solved*; *the delegated-wallet descendant is already solved*; *the lineage was solved twice by the
> same OpenAI/Codex subject*; *two full matrices were avoided*, and the `$97.32` matrix-spend-avoided
> figure attached to that; *OpenAI failed the deployment-alias smoke on target*; *a Claude import
> solved the same package cleanly*; and the **provider delta** built from that pair.
>
> **What is now known about all three families is their local reference/mutant/package evidence and
> nothing else. Whether any real agent can solve any of them has not been measured.**
> `node dist/cli.js provider-delta report` currently reports `non_openai_missing` — there is no
> delta, because there are no counted runs on either side of it.

Lineage Kill + Portfolio Reallocation v1 is still the machinery that turns smoke outcomes into
portfolio decisions, and it is still what selected the next build slot. What it can no longer claim
is the evidence that fired it. Both promotions are recorded as `PREMISE WITHDRAWN` in
[`reports/discovery-workbench-report.md`](reports/discovery-workbench-report.md); the lineage record
is [`reports/lineage-learning-report.md`](reports/lineage-learning-report.md).

`deployment-model-alias-rollout-drift` remains a full validation-mode family for model-alias drift in
deployment rollout decisions. Its local reference, mutant and package gates pass; its scenario count,
knob table, mutant-axis count and current package hash are in
[`reports/deployment-model-alias-rollout-drift-family-report.md`](reports/deployment-model-alias-rollout-drift-family-report.md),
and this page does not copy them. Its next evidence step is the one it has never had: one counted
trial under the current hash. Its selected evolution route,
`provider-failover-router-alias-drift-probe`, is executable local probe evidence and task-shape-ready
if promoted; it is not a built descendant, package, model trial or `/6` matrix gate. The readiness
and routing reports are
[`reports/deployment-model-alias-rollout-drift-production-readiness.md`](reports/deployment-model-alias-rollout-drift-production-readiness.md),
[`reports/deployment-model-alias-rollout-drift-provider-delta.md`](reports/deployment-model-alias-rollout-drift-provider-delta.md),
[`reports/deployment-model-alias-rollout-drift-provider-delta-diagnosis.md`](reports/deployment-model-alias-rollout-drift-provider-delta-diagnosis.md)
and
[`reports/deployment-model-alias-rollout-drift-evolution-options.md`](reports/deployment-model-alias-rollout-drift-evolution-options.md).

Human + External Evidence Intake v1 makes that next evidence step countable, and it is the layer
that caught the repair above. Deployment-alias emits current-hash Claude, Gemini and generic
external packets with run instructions, metadata templates, hidden-artifact warnings, hash/scenario
pins and an import validator. The Claude packet that had imported as a counted clean solve is now
preserved as no-count superseded evidence, because the hash it pinned is not the hash this family
produces now — which is exactly what the pin is for. Returned packets are preserved even when
invalid, but missing transcripts, stale hashes, modified challenges, provider refusals,
infrastructure errors, contamination and hidden leaks never count. See
[`reports/deployment-model-alias-rollout-drift-external-intake.md`](reports/deployment-model-alias-rollout-drift-external-intake.md),
[`reports/deployment-model-alias-rollout-drift-human-intake.md`](reports/deployment-model-alias-rollout-drift-human-intake.md)
and
[`reports/deployment-model-alias-rollout-drift-matrix-readiness-gap.md`](reports/deployment-model-alias-rollout-drift-matrix-readiness-gap.md).

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

The per-family snapshot — scenarios, counted trials, failures, capability-attributed trials, mutant
axes, agent axes, human claim level, verifier-integrity claim level and ship verdict, plus every
family's current challenge-package hash — is generated, not written here. Read
[`reports/evidence-snapshot.md`](reports/evidence-snapshot.md), or run `node dist/cli.js snapshot`.

It is rendered from the same evidence maps and the same `assessFamily` as
[`reports/ship-recommendation.md`](reports/ship-recommendation.md), so the two cannot disagree.
Every verdict in it is a real `ShipVerdict` — `SHIP`, `HOLD` or `NOT-READY` — and nothing else.

This section used to hold that table by hand. It drifted: it claimed counted trials for families
that have none, mutant-axis counts no sweep produces, five package hashes no package hashes to any
more, and a `PROVIDER-DELTA` verdict that no code in this repository emits. Numbers that have to be
retyped to stay true are the ones that stop being true, so they now live in one generated place.

## What Changed In This Phase

*Counts in this section describe the state of the repository as of **2026-09-01**, after the
starter-leak repair and trial decount. Anything that can be read off a generated report is linked
rather than copied; where a figure is quoted here, the report beside it is the authority.*

The foundry has a first-class adaptive funnel layer. `data/mechanism-probes.json` holds the
validated mechanism probes, `data/transfer-tests.json` holds the declared transfer tests, and
`node dist/cli.js funnel report` computes the cheapest next evidence across discovery, validation
and production modes. The live counts of probes, transfer tests and queued actions are the summary
table of [`reports/adaptive-funnel-report.md`](reports/adaptive-funnel-report.md). The planner
refuses to treat repeated OpenAI trials as cross-lab breadth, keeps provider refusals/no-count
records from advancing claims, sends stale hashes to repair, and sends collapsed failure chains to
evolve or hold before full matrices.

Discovery Workbench v1 adds the machine that feeds the funnel: `data/candidate-pool.json` holds the
candidate family ideas, `node dist/cli.js discovery score` ranks them through fairness/verifier
and cost gates, `node dist/cli.js discovery next` prints the stable promotion queue, and
`node dist/cli.js discovery scaffold --candidate <id> --out <dir>` emits a draft task shape.
Surface coverage is reported separately from failure-axis diversity so broad API/product coverage
does not masquerade as independent defect axes.

Mechanism Probe Runner v1 turns selected candidate ideas into cheap executable evidence. The probe
definitions are the ones a checked-in artifact depends on: the three that carry a promotion or a
lineage, `payment-unknown-capture-receipt-probe`, and
`provider-failover-router-alias-drift-probe`, the selected deployment-alias evolution screen. Probes
run tiny scenarios against reference-like and known-bad probe subjects, must catch every non-reference
probe subject by an intended named check, and produce a probe-aware next-action queue; the counts
are the summary table of
[`reports/mechanism-probe-report.md`](reports/mechanism-probe-report.md).

Promoted Family Build Pipeline v1 takes the first promoted probe from that queue and builds it
through the validation stack. `access-token-scope-expansion` has a measured scenario set drawn from
a declared space, every intended mutant caught by its intended check, both baselines blocked, a
leak-checked challenge package and trial routing — the figures are in
[`reports/promotion-report.md`](reports/promotion-report.md) and
[`reports/access-token-scope-expansion-axis-report.md`](reports/access-token-scope-expansion-axis-report.md).
Access-Token Evolution v1 generated access-token-specific descendants, ran the delegated-wallet local
probe and promoted `delegated-wallet-scope-reconciliation` into a full validation-mode family with
its own reference, mutant, axis and package evidence; see
[`reports/delegated-wallet-scope-reconciliation-family-report.md`](reports/delegated-wallet-scope-reconciliation-family-report.md).

**The trials that once sat at the end of that pipeline are withdrawn.** Both families shipped a
starter that passed their own suites, so the smoke results measured the answer key, not the model.
Both packages are re-hashed and both trials are superseded; neither family has a counted trial, and
the evolution decisions taken because of them are recorded as `PREMISE WITHDRAWN`. See
[`reports/access-token-evolution-report.md`](reports/access-token-evolution-report.md) and
[`reports/lineage-learning-report.md`](reports/lineage-learning-report.md).

Deployment Model-Alias Rollout Drift v1 acts on that reallocation. It builds the top non-scope
branch into a full validation-mode family: a measured scenario set from a large declared space, a
clean reference, every known-bad subject caught by an intended check, both baselines blocked,
mutant-detection axes and a leak-checked package. Those figures are the summary table of
[`reports/deployment-model-alias-rollout-drift-family-report.md`](reports/deployment-model-alias-rollout-drift-family-report.md);
they are not restated here because they move whenever the family is repaired. **It has no counted
trial.** The two runs it once had — an OpenAI on-target failure and a Claude clean solve — are both
superseded by the starter-leak repair, so there is no smoke-difficulty evidence, no cross-lab smoke
presence and no provider delta for this family. Current-hash Claude, Gemini and generic external
import bundles are documented in
[`reports/deployment-model-alias-rollout-drift-cross-lab-readiness.md`](reports/deployment-model-alias-rollout-drift-cross-lab-readiness.md).

Adversarial Audit v2 upgrades verifier-integrity from preserved attack records to mechanical triage.
Attack packets now carry an execution profile, an isolation profile, an exploit-artifact schema, an
exploit replay path, deterministic hardening probes and hash/current-verifier countability rules.
Every package-backed family is `adversarial-ready`, including the delegated-wallet and
deployment-alias descendants. The per-family claim level, current package hash and counted-audit
count are in [`reports/adversarial-audit-report.md`](reports/adversarial-audit-report.md).

**Two** real Codex/OpenAI adversarial audits currently count as no-bypass evidence: one against
`ui-replay-live-dom` and one against `checker-required-memory-poisoning`. Both used the implemented
`fs-sandbox` profile, preserved transcript/verifier/replay output, and found no replayable
contract-violating artifact. This is OpenAI-only verifier-integrity evidence, not cross-lab evidence.

A third audit, against `deployment-model-alias-rollout-drift`, **no longer counts**: it was run
against a package hash the starter-leak repair replaced, so it audited a challenge that no longer
exists. The record is preserved, the family is back to `adversarial-ready`, and the claim that
deployment-alias has been adversarially audited is withdrawn rather than re-stated against the new
hash — nobody has attacked the current package. One older Live-DOM attack is preserved as a no-count
provider refusal, and one v2 Live-DOM run is preserved as a no-count local infrastructure error.
Durable Outbox has a historical `/cheat` no-bypass summary imported with caveats, but this repo lacks
the native packet, transcript and current package hash needed to count it.

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
node dist/cli.js family sweep --family deployment-model-alias-rollout-drift
node dist/cli.js challenge build --family deployment-model-alias-rollout-drift
node dist/cli.js trials campaign run --family deployment-model-alias-rollout-drift --only O1
node dist/cli.js trials campaign reconcile --family ui-replay-live-dom
node dist/cli.js trials verify --family ui-replay-live-dom live-dom-2026-08-o2
node dist/cli.js trials verify --family checker-required-memory-poisoning checker-required-2026-08-o1
node dist/cli.js human readiness
node dist/cli.js human solvability
node dist/cli.js external packet --family deployment-model-alias-rollout-drift --provider external --out bundles/deployment-model-alias-rollout-drift-external
node dist/cli.js external validate <returned-packet>
node dist/cli.js external import <returned-packet>
node dist/cli.js external report
node dist/cli.js provider-delta report
node dist/cli.js provider-delta diagnosis
node dist/cli.js provider-delta evolution
node dist/cli.js deployment-alias readiness --out reports
node dist/cli.js discovery report
node dist/cli.js discovery candidates
node dist/cli.js discovery score
node dist/cli.js discovery next
node dist/cli.js discovery scaffold --candidate payment-unknown-capture-receipt --out /tmp/payment-task-shape
node dist/cli.js probes run
node dist/cli.js probes report
node dist/cli.js probes next
node dist/cli.js probes scaffold --probe payment-unknown-capture-receipt-probe --out /tmp/payment-probe-task-shape
node dist/cli.js funnel report
node dist/cli.js funnel probes
node dist/cli.js funnel next
node dist/cli.js funnel transfer
node dist/cli.js adversarial readiness
node dist/cli.js adversarial campaign ui-replay-live-dom
node dist/cli.js adversarial prepare ui-replay-live-dom --provider external --out bundles/ui-replay-live-dom-adversarial
node dist/cli.js adversarial import bundles/ui-replay-live-dom-adversarial
node dist/cli.js adversarial verify live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial replay live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial triage live-dom-adversarial-v2-codex-2026-08-escalated
node dist/cli.js adversarial isolate verify bundles/ui-replay-live-dom-adversarial
node dist/cli.js adversarial probe ui-replay-live-dom
node dist/cli.js adversarial v2 report
node dist/cli.js adversarial report
pnpm bundles
```

For cheaper iteration on one subsystem before the release gate, see
[`docs/TARGETED-DEV-GATES.md`](docs/TARGETED-DEV-GATES.md).

Provider reality is explicit, and it is a statement about *execution*, not about the record.
Codex/OpenAI is configured locally and runnable now. Anthropic/Claude is **import-only by default**:
the runner refuses to spend Anthropic tokens unless `CLAUDE_CODE_OAUTH_TOKEN` is explicitly supplied
for a bounded run. That default is recent, and it does not mean no Claude has ever run here —
counted Anthropic trials from an earlier phase are the majority of the record on
`prompt-injection-containment` and `ui-action-record-replay`, and they still count. What is gated is
starting a *new* Anthropic run, not preserving an old one. The deployment-alias Claude import is a
separate case: it ran, and it is now superseded by a package repair, so it counts for nothing.
Gemini is entitlement-blocked unless a future authenticated run changes that. External runs use
prepared bundles and strict import checks. Per-provider counts are in
[`reports/provider-variance-report.md`](reports/provider-variance-report.md).

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

The reference is clean, every known-bad checker/subject submission fails by an intended named check,
and the mutant bank yields independent mutant-detection axes; the measured scenario count, declared
space and axis count are the summary table of
[`reports/checker-required-family-report.md`](reports/checker-required-family-report.md). One
counted Codex/OpenAI trial failed most of the graded set, on the submitted checker as much as on the
subject.

Status: **NOT-READY** under the current gate table. This family was described as SHIP here for
several phases and that is withdrawn. The blocking gate it fails is `difficulty-evidenced`, which
now requires a counted failure to carry a `root-cause.json` saying `capability`. This trial has no
root-cause record, so what is preserved is a counted failure whose cause nobody has adjudicated —
which is not evidence of difficulty and not evidence of its absence. Reading that transcript and
recording its root cause is the route back; running more OpenAI trials is not.

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
- `reports/discovery-workbench-report.md`
- `reports/mechanism-probe-report.md`
- `reports/access-token-evolution-report.md`
- `reports/lineage-learning-report.md`
- `reports/deployment-model-alias-rollout-drift-provider-delta.md`
- `reports/delegated-wallet-scope-reconciliation-family-report.md`
- `reports/delegated-wallet-scope-reconciliation-trial-readiness.md`
- `reports/delegated-wallet-scope-reconciliation-axis-report.md`
- `reports/delegated-wallet-scope-reconciliation-agent-diagnosis.md`
- `reports/delegated-wallet-scope-reconciliation-kill-analysis.md`
- `reports/adaptive-funnel-report.md`
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

The three-family comparison that used to be quoted here — containment, memory-poisoning and parent
UI replay over four shared subjects — **no longer exists**. Every memory-poisoning trial is
superseded, so that family contributes no subjects to a difficulty bank at all. What survives is one
measurable pair, `prompt-injection-containment` + `ui-action-record-replay`; its shared-subject
count, combined width, sum-of-parts and null model are in
[`reports/shared-bank-completion-report.md`](reports/shared-bank-completion-report.md), and the
combined width is smaller than the number this section used to quote.

The live-DOM descendant is not merged into its parent. Parent UI replay remains SHIP with a one-axis
chain limitation; live-DOM is a separate descendant with its own package hash, scenario set and
trial evidence.

## Verification

```bash
pnpm exec tsc --noEmit --pretty false
pnpm lint
pnpm test
pnpm freshness   # just the prose check; sub-second
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

**This document is machine-checked too, and was not always.** `reports/` is regenerated and diffed
by `pnpm verify`, so a generated number cannot drift quietly. This file, `MEMO.md` and `docs/*.md`
are the only places a human types a number, and for a long time nothing checked them: an audit found
two dozen figures here that no longer matched the reports they came from, including a package hash
no package produced any more and counted-trial counts for families with zero counted trials.
`test/prose-freshness.test.ts` now runs inside `pnpm test` — it reads only files, so it costs
milliseconds — and it rejects a prose hash that is not a current package hash, a difficulty claim
about a family whose report says nothing has attempted it, and a quoted figure that no longer
matches its generator.

`pnpm verify` regenerates the whole repository and takes over ten minutes, so it is deliberately not
in `pnpm test`; it runs on every push and pull request in `.github/workflows/verify.yml` instead. A
ten-minute local gate is one developers learn to skip, and a skipped gate is worse than none because
the repository still claims to have it.

## Current Claim

`agent-eval-foundry` can take a mutant-measured descendant family, write the fairness spec,
package the agent-facing challenge without leaks, add categorical anti-nesting structure, run or
prepare real provider campaigns, pre-register verifier-bypass audits, replay claimed exploits, run
deterministic verifier-integrity hardening probes, and preserve the distinction between
mutant-detection axes, real-agent difficulty evidence, human solvability and adversarial
verifier-integrity evidence. It can now also decide what to do before a full family exists: paper
screen a mechanism, score a candidate pool, run a tiny executable probe, calibrate discovery scoring
against known outcomes, promote only after cheap evidence, require a smoke trial before `/6`, and
test transfer before production-mode matrix spend.

**And it can withdraw its own results, which is the claim this phase actually earned.** Three
families shipped starters that solved their own suites; a fourth family's entire trial record was
invalidated by a package repair. The apparatus caught all of it, decounted the affected trials, and
re-derived every verdict from what was left. That is what the challenge hash, the countability rules
and the generated reports are for.

**What is no longer known** — stated plainly, because a corrected number attached to a withdrawn
claim is still a false claim:

- **Memory-poisoning cross-lab generalisation is withdrawn.** It was this repository's strongest
  result. Every `prompt-injection-memory-poisoning` trial is superseded, so the family has zero
  counted trials. Whether two labs fail the same scenarios on it is now unmeasured, not confirmed
  and not refuted.
- **The access-token / delegated-wallet "already solved" finding is withdrawn.** Both packages
  shipped their own solution. Neither family has ever been shown to be easy, or hard.
- **The deployment-alias provider delta is withdrawn.** With both of its runs superseded there is no
  OpenAI failure and no Claude solve to compare; `provider-delta report` returns
  `non_openai_missing`.
- **The deployment-alias adversarial audit is withdrawn**, having been run against a replaced hash.

What survives, and is still the strongest thing here: `ui-action-record-replay` and
`ui-replay-live-dom` are the only families passing every blocking gate, and the UI family's counted
runs form a chain — four cross-lab pairs, every one identical or nested. That is a real cross-lab
transfer result and simultaneously a one-axis result, which is the distinction the whole tool exists
to keep. Verifier-integrity has explicit container/no-network bundle and countability rules, while
the local Docker daemon is unavailable and therefore no container/no-network audit counts. There are
two counted Codex/OpenAI no-bypass audits under `fs-sandbox`, and zero counted non-OpenAI
adversarial evidence anywhere in this repo.

The next highest-leverage work is not a new family. It is one counted trial under a current hash on
any of the four families that now have none, and a root-cause adjudication on the counted failures
that already exist.
