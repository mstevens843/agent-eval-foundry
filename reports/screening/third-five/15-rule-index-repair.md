# 15 — Rule index repair

One Claude attempt, requested Opus 5 / max. Authoring **15m 12s**. Recorded reward **1**: service **25/25 scenarios**, checker **12/12 candidates**. Both correct implementations were accepted; all ten negative controls were rejected with the required obligation named. No execution error or retry was recorded.

## What the task was, in plain English

Repair Juniper, a compiler for ordered wildcard-routing rules. The first matching rule must win. Stars capture text, including empty strings, and when several captures are possible the earlier stars must take the shortest possible lengths. Escapes, full-document matching and case-insensitive literals must retain their stated meaning.

The compiler emits a bounded instruction program for an external interpreter. It cannot solve performance by quietly changing matches or captures: the interpreter counts executed instructions and enforces a public work formula. This is a deterministic algorithmic bound, not a timeout used as model-failure evidence.

## What was in the frozen package

Four small compiler modules, a public instruction-set and checker-input contract, one visible test, and 25 protected service scenarios. The checker independently judges completion, semantics, bounded work, positive work and program legality from original rules/documents, published programs and actual interpreter results. Its bank contained a reference, an alternative and ten negative controls, each run over four selected scenarios.

The agent could not modify the external interpreter or its work counter. Before dispatch, the checker trace was corrected to include the document strings corresponding to recorded outputs, allowing independent semantic recomputation.

## What Claude actually changed

The service repair was compact despite the depth of testing. compiler.mjs had sorted rules by descending pattern length; Claude removed that sort so the split chain retained input order. pattern.mjs preferred consuming another byte at a star; it reversed that preference so the first successful path used the required shortest-first captures.

For performance, it added a distinct memo instruction at each star loop head. Repeated visits to the same instruction/input-offset pair are pruned. The implementation gives each rule its own memo locations, preserving rule precedence and preventing one rule's failed search from suppressing another. Token parsing and the builder were left unchanged. The entry point was adjusted, and two test-support files plus a 471-line checker were added.

## How it checked its own work

The capture contains 28 Bash calls and substantial self-authored verification. Claude built a local interpreter, a dynamic-programming matcher and a deliberately simple brute-force enumerator of star-length vectors. A recorded comparison reports **20,000 cases with zero divergences**. It also added eight regression tests to the existing one; the final recorded test run is **9/9**.

It constructed its own bank of correct variations and mutations, including rule ordering, greediness, missing/shared memoization, escapes, capture slots and publication failures. Its initial tests exposed a gap in its own scenarios: an always-case-insensitive mutation was not activated. It added a distinguishing example, after which the recorded bank runs were clean.

One randomized test initially reported 23 false accepts. Inspection of the recorded edit shows that some mutations had not actually changed the expected value—for example, swapping identical empty captures. It corrected that test's bookkeeping to skip unchanged outputs. The next recorded result was **3,550 genuine trials, zero false accepts and zero false rejections**. That is a correction to the agent's test methodology, not 23 benchmark failures that disappeared.

The protected grader subsequently accepted the repair and the checker in full. Its explanatory reason strings were accepted by the corrected reason-name matching logic; the earlier campaign's exact-string formatting defect did not recur.

## Why this did not produce the failure we wanted

Claude did not merely transcribe a larger checklist. It supplied the missing algorithmic mechanism and used different formulations of matching to test its interpretation. The core patch nevertheless remains confined to two small compiler functions. Once it recognized ordered backtracking with memoization, the public interpreter contract gave it a precise local testing target.

The practical finding is that a small documented language plus a measurable work limit can still be highly tractable when the agent can cheaply construct an independent executable model. Code volume in the checker should not be mistaken for difficulty in the underlying repair.

## Remaining package weaknesses and useful follow-up

The registered checker-control bank has no dedicated bounded-work-only negative: its designated failures concern semantics or missing publication. Service grading does enforce the work formula, but checker grading should also include an activated near-correct compiler that returns correct values while doing excessive work. Claude's own local bank included such a no-memo mutation; ours should not have weaker coverage of an expressly required obligation.

The submitted checker also has permissive input-discovery and tag-handling fallbacks that the documented fixed schema does not require. It conditions strict tag checking on whether tags appear elsewhere in the input. That suggests a future test of candidate-set independence and missing-tag handling, not a demonstrated error in this frozen run. No new diagnostic execution was performed to turn that suspicion into a claimed failure.

Keep the accepted implementation and its alternative-correct controls. For a successor, any richer grammar or optimization objective must have legitimate product semantics and a bounded expert solution. Do not ban dynamic programming, memoization or standard libraries merely because they worked.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-third-five.json) records the frozen identities, original results, file deltas and manifest verification. [Current task source](../../../tasks/rule-index-repair/) is separate from the immutable historical submission. Self-test counts above come from recorded tool output, not independent benchmark scenarios or new model trials.

This is observable-artifact analysis, not private internal reasoning or independent blind adjudication. One pass is evidence against this package's present difficulty hypothesis, not proof that the entire domain is easy.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 3/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

Completed both private compiler implementations, then removed the supplied lexer, builder, pattern and compiler modules from the public workspace. Retained the instruction-set contract, ordered matching semantics, capture preference and deterministic work formula. Removed repeated implementation advice and reason-label examples; explicitly documented the exact instruction object fields already enforced by the interpreter.

Integrated the local no-memo negative control and its distinguishing case-025 scenario, bringing the suite to 26 scenarios and 11 negative controls. In that witness, the observed match outputs are correct while executed work exceeds the public formula. A regression verifies that bounded_work alone fails and that the independent checker rejects it. No memo instruction is required as an implementation strategy; any valid program meeting the behavior and work contract is accepted.

Checker-visible interpreter data now contains actual values, step counts and instruction counts, without computed budget/withinBudget verdict fields. Original rules and documents remain supplied. The private checker uses bottom-up suffix reachability and a separate shortest-capture reconstruction, independently of the grader's recursive matcher.

Validation passed 16 Foundry assurance checks across 26 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 13/13 candidates: two correct implementations and 11 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/rule-index-repair/export`
- Foundry digest: `6d649cfd3fee1d3c95aecf3f97a06eccb5b83796201c2ef801b817f5ef7749af`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/rule-index-repair`
- Native digest: `e711789617b90b7eca98932460f2459376c649dd73699dcab13df55b3bbf0a98`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `rule-index-repair-attempt-1`, package digest
`6d649cfd3fee1d3c95aecf3f97a06eccb5b83796201c2ef801b817f5ef7749af`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) —
a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Controller `campaign.mjs` in `.local/round-two-third-ranked-five-2026-09-09/` is a
small, independently-verified adaptation of the completed top-five campaign's
controller, importing the same frozen, previously-verified runtime
(`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`; its SHA-256 was
re-verified unchanged immediately before this dispatch). Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`. Evidence
retained at
`.local/round-two-third-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/rule-index-repair-attempt-1/`.

Target: **codex** (Trial 1 used Claude — this is an explicit model-family switch,
not a same-model repeat; see Comparison below). Requested `openai/gpt-5.6-sol`,
effort `xhigh`, CLI `scaffoldVersion 0.153.2` (verified baked into the pinned author
image). Observed from runtime events: model, effort and scaffold version are all
unobservable — the Codex CLI's event stream does not expose them, a known
instrumentation limit, not a data quality problem.

Dispatched 2026-09-09T15:08:41.899Z as one of five reservations installed within a
231ms window (15:08:41.798Z–15:08:42.029Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely concurrent
five-way campaign. Completed 2026-09-09T15:28:31.797Z. Total elapsed ≈1,189,898ms
(~19m50s) — solver authoring time (capture wall clock) ≈1,183,634ms (~19m44s),
grading ≈6.3s. Token usage: 1,001,128 input tokens (945,152 cached), 35,421 output
tokens; the Codex CLI reports no price estimate. Execution reached a clean
`completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Trial 1's starter already supplied most compiler machinery; this successor's public
starter is reduced to the empty entry point, with lexer/builder/pattern/compiler
modules removed from the public workspace (per the engineering successor note
above). The checker is a required, separately-graded deliverable in both trials, but
the protected bank grew from 25 scenarios/12 candidates (Trial 1) to 26
scenarios/13 candidates here, adding the no-memo bounded-work negative control and
its `case-025` distinguishing scenario. Most consequentially for this comparison:
**the requested model switched from Claude (Trial 1) to Codex this round.**

### C. Results

Reward **1** — a clean pass on both required deliverables. Service: all 26 expected
scenarios observed, zero failures, zero missing/unexpected IDs. Checker: present,
deterministic, `checkerRequired: true`, `checkerPassed: true`, **13/13 candidates
correctly classified** (0 missed, 0 false positives) — including the newer
bounded-work negative control absent from Trial 1's smaller bank. `reasonPolicy` is
not relevant to this package's grading outcome either way; the boolean verdict
alone was graded.

### D. Observable solving behavior

Codex read the full contract in its first two commands (`SEMANTICS.md`, `api.d.ts`,
`CHECKER-INPUT.md`, `entry.mjs`, `instruction.md`, `package.json`, plus a file
listing), then worked from a series of ad-hoc inline `node --input-type=module`
probe scripts against its own draft `entry.mjs`/`checker.mjs` before ever running
`node --check` as a final gate. Concretely, across the 50 captured events it: (1)
tested case-insensitive fold equality logic directly against `subject.run`; (2)
built a small standalone program interpreter inline to cross-check its own
compiler's emitted instructions against expected step/backtracking behavior; (3)
stress-tested the bounded-work formula with a synthetic 32-rule, 64-character-pattern
workload run 1,000 times, matching the newly-added no-memo negative control's exact
concern; (4) fed its `checker.mjs`'s `run()` function malformed/empty-cell input
directly to check its verdict shape and prototype safety; (5) checked for trailing
whitespace and searched for any `AGENTS.md` files in the workspace; and (6) probed
specific greedy/lazy-star and fallback-rule interactions (`A*?\*` with `fold:true`
against a bare `*` fallback) before finalizing. Every commit gate was
`node --check entry.mjs && node --check checker.mjs` plus, in one pass, `git diff
--check`. No failed self-test or reverted approach is visible in the captured
commands — each probe script ran once and the agent moved on, consistent with a
solver that had already converged on its approach before writing the inline checks.

### E. Comparison and next step

Trial 1 (Claude) and Trial 2 (Codex) are both clean passes, but on different
models against different-sized checker banks — this is not a controlled same-model
comparison, and the fact that both models solved a materially similar task cleanly
is itself informative: nothing about the harder empty-starter successor or the
added bounded-work control proved model-specific here. Codex's inline-interpreter
verification approach (building a second independent executable model of the
instruction set to cross-check its own compiler) mirrors the same general strategy
Trial 1's write-up already identified as the transferable lesson for this package.
Recommend treating this package as calibration-stable across at least two model
families under the current successor contract, and prioritizing it lower for
further difficulty-search trials than packages with an open service or checker
defect.

### F. Verified publication record — September 9, 2026

Reward **1**; service **26/26**; checker **13/13**. All **718** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-third-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-third-ranked-five.json). Trial 1 is preserved.
