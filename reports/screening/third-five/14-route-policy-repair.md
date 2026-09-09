# 14 — Route policy repair

One Claude attempt, requested Opus 5 / max. Authoring **45m 15s**. Recorded reward **1**: service **25/25 scenarios**, checker **12/12 candidates**, with both correct alternatives accepted and all ten negative controls rejected with the required obligation named. No execution error or retry was recorded.

## What the task was, in plain English

Repair Aster, a configuration-change service for a small routing-policy language. A requested preference change must affect precisely the accepted routes in the requested input scope and egresses. Every other route must retain its original decision, preference and community attributes.

This is not just changing a number in a rule. Several egresses can share the same policy. Policies call other policies; a call can return and continue its caller, or terminate the entire evaluation. Actions can change the communities that subsequent rules match. The requested scope, however, is defined against the route's original input, before those changes. A local-looking rewrite can therefore alter unrelated traffic or accidentally accept something that was originally rejected.

## What was in the frozen package

Four starter modules, the public language and execution contract, one existing visible test, and a separate checker deliverable. The original configuration is bounded at eight policies, eight terms per policy, depth five and six egresses; a published rewrite has room for 128 policies, 1,024 terms and depth sixteen. The contract permits cloning, inlining and reorganization. It does not demand one patch strategy.

The protected service suite independently evaluates the published configuration over 25 scenarios. Its obligations include a legal configuration, actual publication, the requested positive change, scoped behavior and preservation. The checker bank contains a reference, a different correct implementation and ten negative controls. For this frozen selection each candidate was exercised on two selected scenarios. Preflight added the actual evaluated route inputs to checker traces, alongside original configuration/request and observed outputs; these are stimuli, not supplied answers.

## What Claude changed

The starter changed every accept action in every policy to the requested preference. Claude replaced that blanket change with a graph-cloning transformation and an original-input scope dispatcher.

The key simplification is real and specific to the published language: matching depends on prefix and communities, **not preference**. Clone a policy graph, retain all control flow and community modifications, and change only terminal accept preferences. It then behaves like the original except for the requested preference on accepted routes. Original policies remain available to nonrequested egresses and out-of-scope routes.

There is an important extra wrapper. Calling the cloned root directly from a scoped branch would let a returning evaluation continue into the following out-of-scope branch, running the original graph again on already modified state. Claude inserted a scoped entry policy with a rejecting fallback, preserving the language's rule that a top-level return rejects. It retained a planner entry point delegating to the new implementation. The old helper and its narrow test remain in the submitted tree but are no longer used by the service.

This is a structural argument about behavior preservation, not a collection of patches for the hidden examples.

## What its self-verification actually showed

The capture records **63 Bash requests**, retained test interpreters, candidate generators and mutation helpers. The final tool output reports **17 passing tests**. A recorded eight-seed sweep reports **4,968 candidate-scenario cells with zero false positives and zero false negatives** against the agent's own oracle. These are self-generated tests, separate from the protected grading counts above.

The most useful observation is that Claude found a weakness in its own first checking approach. When restricted to the sampled observed routes, its checker missed 60 violations in one self-test run, including scope-boundary and other-egress defects. It added a bounded analytic pass over the published configuration, generating additional prefix-boundary and community combinations rather than assuming the collector's observed routes exhaust the universal contract.

It also checked its interpreter against the real observed decisions before using that analytic pass. This is a sensible consistency check, but agreement on a finite sample is not a proof that its interpreter or generated route set covers all possible behavior.

Later it compared complete reason sets, not just pass/fail classifications. One run had 71 partial reason-set matches despite zero classification errors; after a further change, the recorded output had 1,044 exact matches on violating cells, zero partial matches and zero false classifications. The task required the relevant obligation to be named, not an exact complete-set comparison, so this was additional self-verification rather than an extra hidden requirement.

Finally, it measured repeated checker execution and protected itself against expensive or invalid policy graphs. The last recorded synthetic stress run processed 1,200 cells twice in **11.4 seconds**, within the public sixty-second checker envelope. That is an agent-authored workload and self-measurement, not an independently reproduced performance benchmark. The 45-minute authoring duration includes substantial checker testing; it should not be described as 45 minutes spent failing to find the service repair.

## Why this package did not defeat the agent

The package successfully created interacting obligations, but the language admits a compact, legitimate abstraction: separate original-input scope from policy execution, then specialize only terminal accepts. Claude found that abstraction and explicitly handled call-return semantics.

More importantly, it did not stop when its initial checker appeared plausible. It built tests that revealed its sampled-route checking gap and strengthened the checker before submission. This is evidence against assuming that a secondary verification deliverable will routinely remain incomplete for this configuration.

## What to carry forward

Retain original-input scope, shared policy graphs, mutable community state and return semantics: these are genuine constraints that interacted during the repair. Keep alternative-correct controls so a grader does not insist on cloning or one particular configuration shape.

The strongest follow-up is to test whether our own checker-candidate selection exercises the additional defects the agent discovered in its simulator. This frozen bank used just two selected scenarios per candidate. Its clean score establishes that it distinguished those candidates, not that either checker now proves universal equivalence. New distinguishing scenarios and independent correct rewrites should be evaluated against the saved submission without relabeling such diagnostic executions as new model trials.

An expanded successor could support professionally justified additional language behavior, but only with a complete public contract and bounded solution. Arbitrarily adding preference-dependent matches merely to invalidate this repair would change the task; it is not evidence the original solution was wrong. No confirmed grading bypass or in-contract submission defect was found in this review.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-third-five.json) records frozen package/profile/source identities, original results, source deltas and manifest hashes. [Current task source](../../../tasks/route-policy-repair/) is separately maintained.

This report analyzes observable commands, tool results and submitted artifacts, not private internal reasoning. The agent's oracle and fuzz counts are explicitly self-verification evidence. No additional provider calls, diagnostic regrades or independent blind adjudications were performed for this report.

## 2026-09-09 — Engineering successor prepared for Trial 2

**Ready for a second exploratory Foundry trial; no second model trial has run for this version.** This section is an engineering record, not a new reward result. Priority in the next group: 1/5. See the [selection and implementation report](../next-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-next-five-implementation.json). Earlier trial results and package descriptions above remain historical.

Integrated the two successor community-combination scenarios into the maintained generator (27 scenarios total). Retained raw routes in checker inputs and acceptance of alternative-correct policy layouts. Removed the public cloning/inlining repair recipe and completed both private service implementations before removing public implementation modules. Corrected an internal term-count boundary that counted policies as terms; the documented 1,024-term limit now means terms. Public bounds for community matches and mutations match the authority. The independent private checker uses an explicit-stack policy interpreter and judges behavior against raw inputs rather than comparing a preferred output layout.

Local validation passed 15 service-assurance checks, including correct reference and alternative services, semantic failure of the untouched starter, repeatability and negative-control activation. The independent checker correctly classified 12/12 candidates: two correct implementations and 10 negative controls, with zero false accepts or misses. The Foundry export rebuilt identically and passed fresh recipient validation. All 22 native static checks passed. These controls are author-side evidence, not model attempts or proof that an unseen solver will fail.

Six native verifier integrity controls passed. The final native wording differs from the tested export; verifier and oracle file bytes were independently compared and are identical. September 9 native preflight: this exact final export passed its Harbor oracle with reward 1 and nop with reward 0, with no infrastructure error. Nop rejects the missing required checker; Foundry assurance separately verifies the empty service starter fails semantically. All five packages in this group passed both native jobs. These are local checks, not Trial 2 model attempts.

Use this exact Foundry export:

- Directory: `.local/next-five-implementation-2026-09-09/release-ready/route-policy-repair/export`
- Package digest: `b6490e6b9cd68f23bba0d63ce101b6c7b49f48113f2a90e320a7fc015c32ab01`
- Native build, with the validation boundary above: `.local/next-five-implementation-2026-09-09/harbor-final/route-policy-repair`
- Native digest: `2bb38e0fef0b2cedb9681ec70adb4efd56e1954dd6a7d8ee321349e2cd627dad`

Both deliverables are required. The checker must return complete deterministic Boolean verdicts; reasons are optional diagnostics and submitted helpers are available. Public API, output schemas and observable requirements remain provided, without a worked implementation.

When Trial 2 finishes, append its actual model/profile, frozen package digest, service and checker outcomes, elapsed time, infrastructure exclusions and observed submission defects here. Do not overwrite Trial 1 or count an infrastructure error, an author control or an old label dispute as a new standard model failure.

## Trial 2 — implementation successor — September 9, 2026 — INCONCLUSIVE (infrastructure interruption)

### A. Identity and execution

Run `route-policy-repair-attempt-1`, package digest
`b6490e6b9cd68f23bba0d63ce101b6c7b49f48113f2a90e320a7fc015c32ab01`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) —
a fresh campaign slot (`attempt-1`), not an infrastructure retry of any prior run.
Evidence retained at
`.local/round-two-next-five-2026-09-09/real-campaign-frozen/jobs/real-provider/.incomplete/route-policy-repair-attempt-1/`
(this job never reached the normal `records/` publication step).

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`
(`profile.json`: `{effort:"max", model:"anthropic/claude-opus-5", provider:"anthropic",
scaffold:"claude-code"}`), limits `{cpus:2, memoryMiB:2048, wallMs:10800000}`.

Dispatched 2026-09-09T13:43:45.249Z as one of five reservations installed within a
230ms window (13:43:45.249Z–13:43:45.479Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently at launch, so this was a genuinely
concurrent five-way campaign — the concurrency requirement was met even though this
one job did not finish. Interrupted approximately 39+ minutes in; the last captured
event is timestamped 2026-09-09T14:22:56.805Z.

### B. What happened

The host system entered severe memory pressure during this campaign: five concurrent
2 GiB-limited Docker containers plus several other already-running Codex/Claude
sessions and Docker Desktop itself, all on the same machine. Claude Code's own
background-task memory-pressure protection killed the controller's background shell
process. The Docker container itself
(`foundry-real-route-policy-repair-attempt-1-8d8b87ae`) shows status `Exited (143)`
(SIGTERM) in `docker ps -a` — it was terminated, not crashed on its own. No
`capture.json` was ever written (the process-resolution step that writes it never
ran), so there is no final exit code, no submission copy, and no grade. **This is an
infrastructure-interrupted invalid execution, not a solver outcome.** It must not be
scored, guessed at, or silently retried in this same slot. No other job in this
five-job campaign was affected; the other four completed cleanly with valid graded
results — this was the only casualty, plausibly because it was still mid-flight when
memory pressure peaked.

### C. What the partial transcript shows (context only, not a result)

The 1,136 captured events show the agent had already written a full implementation
attempt before the interruption: `entry.mjs`, `lib/aster.mjs` (described in its own
comment as "Aster routing language v1 — core semantics"), `lib/verify.mjs`, and
`checker.mjs`, plus a self-built test harness (`test/harness.mjs`,
`test/candidates.mjs`, `test/diag.mjs`, and several `test/run-*.mjs` scale/stress
scripts). Of 34 captured `Bash` calls, the later ones are repeated, increasing-scale
invocations of `test/run-checker.mjs`, `test/run-service.mjs`, `test/run-stress.mjs`
and `test/run-shapes.mjs` (arguments scaling from single digits up to `20000`
generated cases), interleaved with `Edit`s to `checker.mjs` (13 edits, the
most-touched file) and `lib/verify.mjs` (4 edits) — a pattern consistent with
iterative checker self-hardening, similar in shape to this package's own Trial 1
addendum above. The very last captured event is an assistant message still mid
extended-thinking (500 estimated thinking tokens accumulated), with no subsequent
tool call recorded. **This shows the agent was actively engaged in iterative
self-testing at the moment of interruption — it does not show whether the
implementation or checker it had built at that point was correct.** No conclusion
about correctness should be drawn from this partial transcript.

### D. Disposition

This attempt does not count as a solver success or failure. Real solver authoring
time was genuinely spent (39+ minutes, real subscription usage) but produced no
gradeable artifact — no `capture.json`, no `submission/`, no `grade.json`. It should
not be silently retried in this same slot; a later retry must have its own preserved attempt record and final grade to actually measure this package's Trial 2 performance. The raw
partial evidence (events, logs, staged workspace, and the package-store snapshot) is
preserved unmodified at the `.incomplete/` path above.

### E. Recommendation

Retry this package alone (not bundled with four others) once host memory headroom is
confirmed, or defer until other concurrently running agent sessions on this machine
are reduced — five concurrent 2 GiB containers plus several already-active CLI agent
sessions exceeded the host's available memory once. The infrastructure interruption is recorded, but there is no scored Trial 2
outcome. The user has deferred its retry; no retry was launched by this publication.

### F. Verified publication record — September 9, 2026

Reward **unscored (`null`)**. The preserved partial capture has 1,136 events and no completed capture, finalized submission or grade. It is excluded from both reward-zero successes and solver passes.

[Campaign results](../round-two-next-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-next-five.json). Trial 1 is preserved.
