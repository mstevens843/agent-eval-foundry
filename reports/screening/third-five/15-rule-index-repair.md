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
