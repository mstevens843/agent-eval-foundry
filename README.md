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

Discovery Workbench v1 feeds that funnel. It scores a 50-candidate pool, applies deterministic cheap
screens, builds a promotion queue, separates surface coverage from defect-axis diversity and can
emit a task-shape draft from a promoted candidate. See
[`reports/discovery-workbench-report.md`](reports/discovery-workbench-report.md). Candidate scores
are routing evidence only; they are not difficulty evidence until a built family has counted trials.

Mechanism Probe Runner v1 adds the next bridge: top candidates can now run tiny deterministic
probes before full family build. See
[`reports/mechanism-probe-report.md`](reports/mechanism-probe-report.md) and
[`reports/discovery-calibration-report.md`](reports/discovery-calibration-report.md). Probe evidence
can promote, repair, transfer, evolve, hold or kill a candidate, but it is still not real-agent
difficulty evidence.

Promoted Family Build Pipeline v1 closes the upstream loop for one probe. The first ranked promoted
probe, `access-token-scope-expansion-probe`, now has a promotion record, reusable scaffold bridge and
a full validation-mode family with local reference/mutant/package evidence. See
[`reports/promotion-report.md`](reports/promotion-report.md). This proves candidate -> probe ->
promotion -> family local evidence, not agent difficulty.

Access-Token Smoke + Diagnosis + Transfer v1 adds the next gate. The promoted access-token family
has a hash-pinned one-slot OpenAI/Codex smoke campaign, a family-specific diagnosis report and a
declared wallet-spending-limit transfer test. The counted smoke trial passed cleanly, so the family
routes to already_solved_or_needs_evolution rather than difficulty evidence or full matrix spend.
That evolution path now produced `delegated-wallet-scope-reconciliation`, a full descendant family
with local reference/mutant/package evidence and a one-slot OpenAI/Codex smoke campaign. That smoke
also passed cleanly, so delegated-wallet routes away from difficulty evidence and full matrix
spend.

Lineage Kill + Portfolio Reallocation v1 turns those two clean smoke solves into portfolio learning.
The access-token authority lineage is now paused rather than hardened blindly: both parent and
descendant were solved by the same OpenAI/Codex subject, two full matrices were avoided, similar
local scope-comparison candidates are penalized, and the next recommended branch moves to a
different mechanism cluster. See
[`reports/lineage-learning-report.md`](reports/lineage-learning-report.md).

That reallocation has now been exercised. `deployment-model-alias-rollout-drift` is a full
validation-mode family for model alias drift in deployment rollout decisions: local reference,
mutant, package and smoke-campaign gates pass, and one counted OpenAI/Codex smoke failed 192/339
scenarios on target. A current-hash Claude/Anthropic external smoke then imported cleanly and passed
339/339. That is mixed cross-lab smoke presence, not cross-lab difficulty: OpenAI failed, Claude
solved, and production `/6` remains blocked. Provider-delta diagnosis now reads the preserved
submissions/transcripts, keeps the result as routing evidence rather than new trial evidence, and
selects `provider-failover-router-alias-drift-probe` as the next cheapest evolution route. See
[`reports/deployment-model-alias-rollout-drift-family-report.md`](reports/deployment-model-alias-rollout-drift-family-report.md)
and
[`reports/deployment-model-alias-rollout-drift-production-readiness.md`](reports/deployment-model-alias-rollout-drift-production-readiness.md).
The provider-delta routing reports are
[`reports/deployment-model-alias-rollout-drift-provider-delta.md`](reports/deployment-model-alias-rollout-drift-provider-delta.md),
[`reports/deployment-model-alias-rollout-drift-provider-delta-diagnosis.md`](reports/deployment-model-alias-rollout-drift-provider-delta-diagnosis.md)
and
[`reports/deployment-model-alias-rollout-drift-evolution-options.md`](reports/deployment-model-alias-rollout-drift-evolution-options.md).

Human + External Evidence Intake v1 makes that next evidence step countable. Deployment-alias now
has current-hash Claude, Gemini and generic external packets with run instructions, metadata
templates, hidden-artifact warnings, hash/scenario pins and an import validator. The Claude packet
imported as a counted clean solve; an earlier infrastructure-error packet is preserved as no-count
evidence. Returned packets are preserved even when invalid, but missing transcripts, stale hashes,
modified challenges, provider refusals, infrastructure errors, contamination and hidden leaks never
count. See
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

| family | scenarios | counted trials | failed >=1 | mutant axes | agent axes | human claim | verifier integrity | verdict |
|---|---:|---:|---:|---:|---|---|---|---|
| `prompt-injection-containment` | 128 | 6 | 0 | 4 | 0 | human-ready | adversarial-ready | **NOT-READY**: already-solved |
| `prompt-injection-memory-poisoning` | 288 | 8 | 5 | 3 | >=2 | human-ready | adversarial-ready | **SHIP**: cross-lab failure generalises |
| `ui-action-record-replay` | 324 | 5 | 5 | 6 | 1 | human-ready | adversarial-ready | **SHIP**: useful but chain-limited |
| `ui-replay-live-dom` | 864 | 1 | 1 | 19 | not claimed yet | human-ready | adversarial-audited; OpenAI-only | **SHIP**: descendant, packaged and difficulty-evidenced |
| `checker-required-memory-poisoning` | 792 | 1 | 1 | 12 | not claimed yet | human-ready | adversarial-audited; OpenAI-only | **SHIP**: required-checker gap, OpenAI-only |
| `access-token-scope-expansion` | 384 | 1 | 0 | 3 | already-solved by smoke | pending | audit-pending | **NOT-READY**: clean OpenAI smoke pass; evolve/repair before matrix |
| `delegated-wallet-scope-reconciliation` | 804 | 1 | 0 | 3 | already-solved by smoke | human-ready | adversarial-ready | **NOT-READY**: clean OpenAI smoke pass; evolve/repair before matrix |
| `deployment-model-alias-rollout-drift` | 339 | 2 | 1 | 6 | mixed smoke; no cross-lab difficulty | human-ready | adversarial-audited; OpenAI-only fs-sandbox | **PROVIDER-DELTA**: diagnosis present; `/6` blocked; next route is `provider-failover-router-alias-drift-probe` |
| `durable-approval-outbox` | 24 | 20 imported | 20 | 3 | 1 | reference-solvable | audit-pending; imported historical no-count | **SHIP**: imported historical bank |

Current live-DOM package hash: `18c3f5afc5973604205cd7df23ce4cad`.
Current checker-required package hash: `448f2f816c51030cc97a374816226168`.
Current access-token-scope-expansion package hash: `33cc98364ce2a6b3f9490e54937955d8`.
Current delegated-wallet-scope-reconciliation package hash: `2140032d835a87ff254d01b6b4652f21`.
Current deployment-model-alias-rollout-drift package hash: `0e9b87a5f260544cfbc1cdce8f08938c`.

## What Changed In This Phase

The foundry now has a first-class adaptive funnel layer. `data/mechanism-probes.json` holds nine
validated mechanism probes, `data/transfer-tests.json` holds seven transfer tests, and
`node dist/cli.js funnel report` computes the cheapest next evidence across discovery, validation
and production modes. The planner refuses to treat repeated OpenAI trials as cross-lab breadth,
keeps provider refusals/no-count records from advancing claims, sends stale hashes to repair, and
sends collapsed failure chains to evolve or hold before full matrices.

Discovery Workbench v1 adds the machine that feeds the funnel: `data/candidate-pool.json` contains
51 candidate family ideas, `node dist/cli.js discovery score` ranks them through fairness/verifier
and cost gates, `node dist/cli.js discovery next` prints the stable promotion queue, and
`node dist/cli.js discovery scaffold --candidate <id> --out <dir>` emits a draft task shape.
Surface coverage is reported separately from failure-axis diversity so broad API/product coverage
does not masquerade as independent defect axes.

Mechanism Probe Runner v1 turns selected candidate ideas into cheap executable evidence. Fifteen
probe definitions cover the current top-ranked workbench candidates plus requested equivalents for
payments, trading, browser replay, permissions, audit rewrite, CRM stale action and cross-tool
authority laundering. They now include `delegated-wallet-scope-reconciliation-probe`, the selected
access-token descendant screen after the parent clean smoke pass. The probes run 48 tiny scenarios
against reference-like and known-bad probe subjects, catch 36/36 non-reference probe subjects by intended named checks, and produce a
probe-aware next-action queue. The discovery calibration report backtests the scoring model against
six known family outcomes; it is directional n=6 calibration, not a yield estimate.

Promoted Family Build Pipeline v1 takes the first promoted probe from that queue and builds it
through the validation stack. `access-token-scope-expansion` has 384 measured scenarios from a
1,152-point declared space, 8/8 intended mutants caught, both baselines blocked, a leak-checked
8-file challenge package and trial routing. Access-Token Smoke + Diagnosis + Transfer v1 then ran
one counted OpenAI/Codex smoke trial under challenge hash `33cc98364ce2a6b3f9490e54937955d8`.
It passed 384/384, so the pre-registered kill signal fired: this is an
already_solved_or_needs_evolution result, not difficulty-smoke evidence. Full `/6` matrix spend
remains blocked. Access-Token Evolution v1 records the clean solve as the evolution trigger,
generates access-token-specific descendants, runs the delegated-wallet local probe and promotes
`delegated-wallet-scope-reconciliation` into a full validation-mode family. The descendant has 804
measured scenarios from an 82,944-point declared space, 10/10 known-bad subjects/baselines caught,
3 mutant-detection axes, a leak-checked 9-file package and a hash-pinned one-slot OpenAI/Codex smoke
campaign. The counted smoke trial `delegated-wallet-2026-08-o1` passed 804/804, so the same
pre-registered clean-pass route fired again: no difficulty claim and no full matrix spend.
See [`reports/access-token-evolution-report.md`](reports/access-token-evolution-report.md).

Lineage Kill + Portfolio Reallocation v1 records that result as a solved-twice lineage rather than
an invitation to keep adding local fields. The access-token -> delegated-wallet edge preserved the
authority mechanism and added delegation, durable cache, revocation, downgrade, reconciliation,
truthful audit and liveness pressure; OpenAI still solved both packages cleanly. The report treats
that as budget-preserving evidence: the lineage is killed/paused for now, local scope-authority
variants are downgraded, and the next branch is reallocated to a different mechanism cluster. See
[`reports/lineage-learning-report.md`](reports/lineage-learning-report.md).

Deployment Model-Alias Rollout Drift v1 acts on that reallocation. It builds the top non-scope
branch into a full validation-mode family with 339 measured scenarios from a 663,552-point declared
space, 14 knobs, a clean reference, 13/13 known-bad subjects caught by intended checks, 2/2
baselines blocked, 6 mutant-detection axes, a leak-checked 9-file package and a one-slot
OpenAI/Codex smoke campaign. The counted smoke trial
`deployment-model-alias-rollout-drift-2026-08-o1` failed 192/339 scenarios on target under challenge
hash `0e9b87a5f260544cfbc1cdce8f08938c`, so this branch now has OpenAI-only smoke-difficulty
evidence. A counted Claude/Anthropic import under the same hash passed 339/339, so the cross-lab
smoke result is mixed rather than confirmatory. No full `/6` matrix, transfer proof, human solve or
cross-lab adversarial audit is claimed from those smoke results. Current-hash Claude, Gemini and
generic external import bundles are documented in
[`reports/deployment-model-alias-rollout-drift-cross-lab-readiness.md`](reports/deployment-model-alias-rollout-drift-cross-lab-readiness.md).

Adversarial Audit v2 upgrades verifier-integrity from preserved attack records to mechanical triage.
Attack packets now carry an execution profile, an isolation profile, an exploit-artifact schema, an
exploit replay path, deterministic hardening probes and hash/current-verifier countability rules.
Seven current package-backed families are `adversarial-ready`, including the delegated-wallet and
deployment-alias descendants.

Three real Codex/OpenAI adversarial audits counted as no-bypass evidence: one against
`ui-replay-live-dom` under challenge hash `18c3f5afc5973604205cd7df23ce4cad`, and one against
`checker-required-memory-poisoning` under hash `448f2f816c51030cc97a374816226168`, and one against
`deployment-model-alias-rollout-drift` under hash `0e9b87a5f260544cfbc1cdce8f08938c`. All used the
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
node dist/cli.js discovery calibration
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

For cheaper iteration on one subsystem before the release gate, see
[`docs/TARGETED-DEV-GATES.md`](docs/TARGETED-DEV-GATES.md).

Provider reality is explicit. Codex/OpenAI is configured locally. Anthropic/Claude is import-only by
default unless an explicit token is supplied for a bounded run; the current deployment-alias phase
used exactly one Claude smoke import and no further Claude run is part of the checked gates. Gemini
is entitlement-blocked unless a future authenticated run changes that. External runs use prepared
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
- `reports/discovery-workbench-report.md`
- `reports/mechanism-probe-report.md`
- `reports/discovery-calibration-report.md`
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
verifier-integrity evidence. It can now also decide what to do before a full family exists: paper
screen a mechanism, score a candidate pool, run a tiny executable probe, calibrate discovery scoring
against known outcomes, promote only after cheap evidence, require a smoke trial before `/6`, and
test transfer before production-mode matrix spend. The access-token promotion now shows the
downstream routing behavior as well: a clean smoke pass blocks matrix spend and sends the mechanism
back to evolution/repair instead of being reported as a difficulty win. The delegated-wallet
descendant repeats the lesson: stronger local verifier evidence still did not translate into
OpenAI difficulty evidence. The lineage layer now stops spending on that branch for now and
reallocates to a different mechanism cluster instead of continuing blind hardening.

The strongest current result is still memory-poisoning generalisation across labs. The newest
deployment-alias result is a provider delta: OpenAI failed the smoke on target, while the counted
Claude import solved the same current-hash package. Verifier-integrity now has explicit
container/no-network bundle and countability rules, while the local Docker daemon is unavailable and
therefore no container/no-network audit counts. There are still two counted Codex/OpenAI no-bypass
audits under `fs-sandbox`; there is zero counted non-OpenAI adversarial evidence in this repo. The
next highest-leverage work is to diagnose the deployment-alias provider delta, then either evolve
that branch or collect a current-hash non-OpenAI failure before any `/6` matrix spend.
