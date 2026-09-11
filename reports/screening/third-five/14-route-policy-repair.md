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

## Trial 2 (retry) — implementation successor — September 9, 2026

### A. Identity and execution

A genuinely new, freshly-authorized campaign slot — `route-policy-repair-attempt-1` in
its own store at `.local/round-two-route-policy-retry-2026-09-09/real-campaign-frozen/`,
distinct from the interrupted attempt's slot above (`.local/round-two-next-five-2026-09-09/`,
left untouched). Package digest
`b6490e6b9cd68f23bba0d63ce101b6c7b49f48113f2a90e320a7fc015c32ab01`, route
`professional-multifile/authority-process@1`. Signed JobStore reservation (Ed25519,
self-minted for this slot), realm `real-provider`, `billingMode: subscription-only`,
`maxMicroUsd: 0`, `maxAttempts: 1` — `attempt-1` in this store, not a resume-in-place of
the earlier interruption.

Target: **claude**. Requested `anthropic/claude-opus-5`, effort `max`, CLI
`scaffoldVersion 2.1.263` (verified baked into the pinned author image). Observed:
`model="claude-opus-5"` (matches requested); effort/scaffold version unobservable from
the CLI's event stream.

Dispatched 2026-09-09T17:33:05.336Z, roughly 102 seconds after a separate,
separately-authorized five-job campaign (round-two-final-five: staged-allocation-repair,
persistent-knowledge-repair, temporal-capacity-repair, caa-revalidation-repair,
event-window-repair) had its five containers confirmed running — this job was launched
deliberately alongside that batch, specifically to reach a 3-Claude/3-Codex total for
this round (final-five alone was 2 Claude/3 Codex). `docker ps` confirmed all six
containers running concurrently after dispatch. The overlap covered the initial
part of this retry: the first final-five job completed at 17:40:19.543Z, while this
retry continued until 18:15:31.372Z. This job
is tracked and evidenced entirely separately from final-five's own frozen `READY.json`
and evidence file. Completed 2026-09-09T18:15:31.372Z. Total elapsed ≈2,546,036ms
(~42m26s) — the longest and most token-heavy run of this session's campaigns. Solver
authoring time (capture wall clock) ≈2,539,156ms (~42m19s); grading ≈6.9s. Token usage:
12,735,955 input tokens (12,518,623 cached), 168,825 output tokens; the CLI's own
metered-price estimate is $12.65 — a reporting figure only, no actual charge occurred
(subscription-only, `maxMicroUsd: 0`). Well inside the 10,800,000ms (3h) budget. Execution
reached a clean `completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Same successor version as the earlier interrupted attempt today: starter reduced to an
empty `subject.run` entry point (Trial 1's starter changed every accept action to the
requested preference — see "What Claude changed" above); checker required as a
separately-graded deliverable; reasons diagnostic-only. The earlier attempt today on
this exact package was interrupted by host memory pressure before producing any
capture, submission, or grade (Section B–F above) — this retry is a separate, complete
attempt, not a continuation of it.

### C. Results

**Reward 1 — a clean pass on both required deliverables.** Service: all 27 expected
scenarios pass, zero failures, zero missing/unexpected IDs. Checker: `checkerRequired:
true`, `checkerPassed: true`, 12/12 candidates correctly classified (0 missed, 0 false
positives). This is a genuine, freshly-authorized, complete result — not a retroactive
score applied to the earlier interrupted transcript.

### D. Observable solving behavior

The submission includes `entry.mjs`, `checker.mjs`, and a `dev/` self-test harness
(`test.mjs`, `gen.mjs`, `stress.mjs`, `perf.mjs`, `load.mjs`, `edge.mjs`, `host.mjs` — a
reference host, generators, brute-force oracle, and stress/load/perf scripts, each
guarded not to execute on import). The capture records 44 `Bash` calls, 25 `Edit` calls
(concentrated on the checker) and 9 `Write` calls across 1,310 events.

Per its own final report (verbatim from `capture/stdout.log`), the checker's approach
differs structurally from Trial 1's explicit-stack interpreter: it partitions prefixes
into finitely many equivalence classes (each witnessed by a concrete probe), explores
communities symbolically as `(added, removed)` deltas over the unknown input set, and
keeps preference symbolic so "keeps the route's own preference" and "sets a constant"
stay distinguished exactly. It validated this design against an **independent
brute-force enumeration** (not against its own validator), replayed every reported
counterexample as a concrete route to confirm it was real, and confirmed all seven
of its own deliberately-injected breakages (does-nothing, boosts-up-front,
ignores-the-match, loses-return-means-reject, mutates-shared-policies,
matches-on-current-communities, drops-a-community) were caught on 100% of the
scenarios where they actually violate the contract. It load-tested at the published
bounds (128 policies / 1,024 terms) in ~137ms.

It also explicitly disclosed a known limitation rather than hiding it: for configurations
whose control flow branches on roughly 16+ independent communities, the exhaustive
sweep is exponential and truncates. It reports ordering the search by how many
communities a witnessing route must carry and draining match-derived seeds first, so
that truncation still proves the property for all low-cardinality routes; in its own
stress tests, broken configurations on exactly those high-cardinality inputs were still
caught in 17–2,209 probes, well before truncation — its stated reasoning being that
truncation only costs proof depth on configurations that are already correct. This is a
self-reported design limitation with a stated (not independently re-verified here)
mitigation, not a claim of exhaustive proof.

The final captured result matches the actual grade (reward 1, checker 12/12) — no
overclaiming found in the final report relative to the recorded outcome.

### E. Comparison and next step

Trial 1 (substantially pre-implemented starter, 45m15s authoring) reached the same
reward-1 / checker-12/12 outcome via a graph-cloning transformation with an
original-input scope dispatcher and an explicit-stack policy interpreter for the
checker. This retry, working from an empty starter with 42m19s of authoring
(42m26s total, shorter than Trial 1's 45m15s authoring, with over 12.7M input tokens), reached the same clean outcome via a structurally
different checker design (symbolic community deltas plus brute-force cross-validation,
versus Trial 1's explicit-stack interpreter). The earlier interrupted attempt today on
this same package (Section C above) had independently converged on yet another
structure (`lib/aster.mjs`, `lib/verify.mjs`) with a similar iterative
checker-hardening pattern, before being cut off mid-flight — consistent context, not
treated as a result.

Given two independent complete clean passes now on record for this package (Trial 1 and
this retry), it looks like a stable, low-difficulty result for this
package/model pairing rather than one that depended on the removed starter scaffolding.
Retain this successful submission as a correct control and prioritize the observed
reward-zero candidates for further failure-finding trials. The long runtime and heavy token usage here reflect thorough, largely genuine
self-verification (per Section D), not evidence of difficulty on their own.

### F. Verified publication record — September 9, 2026

Reward **1**; service **27/27**; checker **12/12**. All **745** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-final-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-route-policy-repair-retry.json). Earlier trial records are preserved.


## September 10, 2026 — successor 3.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the successful Trial 2 package. The
original trial evidence and interpretation above are retained verbatim. At the
start of this work all 171 maintained files matched the frozen Trial 2 exports.

### New business requirements and prior simplifying strategy

The new destination is flat-v1: first-match rules over original-input predicates plus one accumulated terminal attribute transform. It has no calls, returns or intermediate mutations. Scope remains the original input and only originally accepted routes receive the requested preference. Deployment limits are 512 total rules, 4,096 predicate atoms, six egresses and 48 KiB per compact publication.

The saved successful submissions cloned shared source graphs and changed terminal accepts. Cloning remains permitted internally, but output must now translate nested return flow and mutation-dependent tests into a different deployment language.

### Additional coverage and implementation evidence

Shared nested subgraphs, overlapping prefixes, multi-community conjunctions, mutation-dependent branches, six egresses and a twelve-community case. These extend existing preservation/scope coverage as well as introducing the new format.

Reversed disjoint terminal rules and a failed-publication recovery both pass. Negative controls lose returns, forget mutations, apply scope to mutated communities or retain the old preference. All 33 generated instances compile within capacity (maximum 108 rules, 744 atoms and 36,296 payload bytes).

Complete private service and checker references, authority/schema updates, legal
alternatives, controls and reproducible Foundry/native Harbor exports are included.
Public core entry points remain empty. The new service reference and alternative
pass 33/33 scenarios; the reference checker passes 8/8 candidate traces.
Untouched starters fail semantically and lack the required checker. These are local
engineering validations, **not provider/model trial results or hardness evidence**.

No new defect in the earlier successful submitted code is asserted: its former
contract differs. Historical defect claims, where present above, retain their
original evidence and scope. The five separate successful finalists and their
standings remain unchanged; this successor adds zero to that count.

See the [consolidated implementation report](../next-five-successor-implementation-2026-09-10.md)
and [machine-readable evidence](../evidence/2026-09-10-next-five-successors.json)
for exact commands, native oracle/nop and integrity outcomes, full export digests,
resolved development failures and the subsequent grading-review handoff.


## Pretrial hardening of successor 3.0.0 — September 10, 2026

Removed the worked translation tutorial. Added unsampled-route, unrelated-egress, rejected-attribute and post-success-publication controls, plus a correct redundant-rule/recovery variant.

Reference service: **33/33**. Both complete correct alternatives pass. Required checker: **13/13** classifications over the full scenario population, with diagnostic-only reasons. Native oracle returns 1; untouched nop returns 0 without an infrastructure error. All nine native integrity controls pass.

Foundry export: `.local/next-five-hardening-2026-09-10/release-four/route-policy-repair/export`. Digest: `c3ff40c39c331627595b3a5aa0a74f03d6777a26e9c34b5b27c042474fe0fd63`. Native export: `.local/next-five-hardening-2026-09-10/harbor-frozen-v2/route-policy-repair`. Digest: `eabcb2c0316df591f89077e6051866ee006300dbc1e9c860fdc64975c0ea3366`.

The [hardening report](../next-five-hardening-2026-09-10.md), [obligation map](../next-five-hardening-coverage-2026-09-10.md) and [evidence](../evidence/2026-09-10-next-five-hardening.json) record the added cases, mutation audit, protections and frozen artifacts. These are engineering checks before model trials, not another scored trial or a historical regrade. Prior trial results above are unchanged.

## Trial 3 — hardened successor 3.0.0, attempt 1 — September 10–11, 2026

First model trial on the hardened 3.0.0 package, dispatched concurrently with the
other four hardened-next-five-trial-one packages at 2026-09-11T01:13:36.917Z
against the frozen `hardened-next-five-trial-one-2026-09-10` runtime (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`). Requested
profile: `anthropic/claude-opus-5`, effort `max`, via Claude Code (`profileDigest`
`d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794`). Package
digest `c3ff40c39c331627595b3a5aa0a74f03d6777a26e9c34b5b27c042474fe0fd63`, matching
the hardened export above.

Reward **1**. Service **33/33** (`semantic-pass`). Checker **13/13**, no false
positives, no missed classifications, deterministic. 52m53s of authoring
(job completed 2026-09-11T02:06:52.584Z), 17,424,540 input tokens (17,135,272
cached) and 228,042 output tokens, $17.161566 (subscription billing). No infrastructure
interruption on this attempt. Job id `route-policy-repair-attempt-1`, published
to `real-campaign-frozen/jobs/real-provider/records/route-policy-repair-attempt-1`
with a verified 889-file completion manifest.

This is the first scored trial on the hardened 3.0.0 revision. It stands
independently of the completed Trial 2 (retry) pass recorded above and the
earlier, inconclusive Trial 2 infrastructure interruption; the earlier
package's contract, checker and scenario population all differ. See
[the campaign summary](../hardened-next-five-trial-one-2026-09-10.md) and
[sanitized evidence](../evidence/2026-09-10-hardened-next-five-trial-one.json)
for the other four packages' results and the publication-recovery incident
affecting two of them (not this one).


## Independent post-trial audit — September 11, 2026

The recorded reward remains **1**, but the passing bank omitted an existing output obligation. Replaying a real correct reference cell with ordinary tokens and the permitted opaque token `__proto__` makes the saved checker omit that token's verdict on both invocations. Its plain-object assignment changes the prototype instead of creating an own property; the frozen reference checker correctly returns all verdicts. This is an interface-coverage gap, not a demonstrated defect in the service's route compiler. Add the opaque-token control before further trials; do not introduce a new public restriction or silently overwrite the original result.

See the [full independent audit](../../hardened-next-five-pass-audit-2026-09-11.md) and [hashed evidence](../../evidence/2026-09-11-hardened-next-five-pass-audit.json). This audit made zero provider calls and preserved the original trial records.


## Coverage-v2 integrated and next trial prepared — September 11, 2026

The private opaque-token bank now reproduces the missing `__proto__` verdict. The saved service passes 33/33. Its checker handles all 13 candidates with ordinary tokens, but omits the required own key under opaque-token coverage.

Public 3.0.0 instructions, interfaces and starters are byte-identical to Trial 3. The corrected private Foundry package is `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc`. Reference validation passes **33/33 service scenarios and 13/13 checker candidates**. Native oracle/nop and integrity checks pass. These are replays and engineering checks, not new model attempts; the historical reward remains recorded.

The next authorized run is **Trial 4**, one fresh **Claude** attempt alongside the other four packages. It has been prepared but not dispatched. See the [integrated coverage report](../next-five-coverage-v2-2026-09-11.md), [exact evidence](../evidence/2026-09-11-next-five-coverage-v2.json) and [operator handoff](../../../docs/hardened-next-five-trial-two-handoff.md).

## Trial 4 — 3.0.0 / coverage-v2 — September 11, 2026

Second model attempt on the unchanged public 3.0.0 contract, first on the corrected private grading revision coverage-v2. Campaign `.local/hardened-next-five-trial-two-2026-09-11/`, frozen runtime source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`. Job id `route-policy-repair-attempt-1`, package digest `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc`, profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code). Dispatched 2026-09-11T03:55:41.162Z, completed 2026-09-11T04:43:18.594Z (47m37s wall; 2,832,035ms / 47m12s authoring per `capture.json`). Usage: 9,179,420 input tokens (8,951,490 cached), 198,648 output tokens, $11.721785 (subscription billing). Published to `real-campaign-frozen/jobs/real-provider/records/route-policy-repair-attempt-1/`, independently re-verified this session: 984 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 33/33** scenarios (`grade.json`'s `evaluation`: expected/observed IDs match exactly, no missing, unexpected or problem entries) — the submitted repair itself is correct, the same clean service result as Trial 3.

Checker: the coverage-v2 opaque-token bank (`grading/checker-grade/cases/cases.json`) replaced descriptive candidate names with 13 opaque per-run tokens for every candidate, one of which is literally the string `"__proto__"` — this generalizes the exact gap the September 11 independent audit found in this package's Trial 3 checker (see above) into a live grading control. The submitted checker (`grading/submission/checker.mjs:178,209`) builds `const verdicts = {}` and assigns each result with `verdicts[token] = verdict` inside its candidate loop. Because `Object.prototype.__proto__` is an inherited accessor, assigning to a plain object's `"__proto__"` key this way never creates an enumerable own property — it either reassigns the object's prototype or is a no-op — so the emitted JSON has no `"__proto__"` entry. Independently confirmed against the raw `checker-process.log`: 12 of the 13 expected token keys are present, missing only `__proto__`.

The frozen harness's `completeVerdicts()` shape check (`src/packages/checker-contract.ts`) requires an exact key-count match against every expected token; the one missing key makes `gradeChecker()` fall through to its synthetic all-failed fallback (`deterministic:false, correct:0, missed:total, pass:false` — the `catch` branch in `src/packages/portfolio.ts`) instead of a real per-candidate score, which is why no `grading/checker-grade/grade-summary.json` was written for this attempt. The checker's actual judgment on the other 12 opaque tokens was never scored — the harness's binary shape gate discarded the whole output — so `grade.json`'s implied "0 correct" reflects a harness-level shape-validation short-circuit caused by one specific object-literal-as-dictionary bug, not a demonstrated finding that the checker misjudged 12 legitimate candidates. It is nonetheless a real, reproducible interface-coverage defect (a plain object literal is unsafe as a dictionary keyed by untrusted opaque tokens for exactly this key) and a legitimate reward-zero outcome under the task contract: a submitted checker that cannot structurally represent a verdict for a valid opaque token fails the required checker deliverable.

No infrastructure interruption; no additional model calls. This trial's evidence and interpretation are independent of the Trial 1/2/3/audit sections above, which used a different task version or grading revision.


## Third 3.0.0 attempt prepared — historical Trial 5

September 11, 2026 UTC: one fresh **Claude** attempt is prepared, concurrently with the other four tasks, using the exact package, profile and frozen runtime from Trial 4. This is attempt **3** on the public 3.0.0 task and is labeled **Trial 5** in this document's full history. No new model call has been launched by preparation. The provider remains the same for this round; any opposite-provider block comes later under a separate handoff. Previous results and replay accounting are unchanged.

See the [prepared execution handoff](../../../docs/hardened-next-five-trial-three-handoff.md) and [verification manifest](../evidence/2026-09-11-hardened-next-five-trial-three-preparation.json).

## Trial 5 — 3.0.0 / coverage-v2, attempt 3 — September 11, 2026

Third model attempt on the unchanged public 3.0.0 contract, byte-identical packages/grading/runtime to Trial 4 (source digest `b9c99108fbd1d23f1b8c8c92ff059b1f6d9dcdfe5fe245f9565d5923f90bbfe8`). The solver is blind to all previous submissions, grades, reference solutions and analysis docs — this is an independent fresh attempt, not a continuation of Trial 4's. Campaign `.local/hardened-next-five-trial-three-2026-09-11/`. Job id `route-policy-repair-attempt-1`, package digest `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc`, profile digest `d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794` (requested `anthropic/claude-opus-5`, effort `max`, via Claude Code, same profile as Trial 4). Dispatched 2026-09-11T05:07:22.328Z, completed 2026-09-11T06:03:29.611Z (56m07s wall; 3,342,295ms / 55m42s authoring per `capture.json`). Usage: 19,810,010 input tokens (19,538,758 cached), 229,254 output tokens, $18.213399 (subscription billing). Published to `real-campaign-frozen/jobs/real-provider/records/route-policy-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 960 files, all hashes match, no infrastructure error.

Reward **0**. Service **semantic-pass, 33/33** scenarios (`grade.json`'s `evaluation`: expected/observed IDs match exactly, no missing, unexpected or problem entries) — the submitted repair itself is correct.

Checker: this fresh submission independently reproduces the same defect class this package's own Trial 4 attempt exhibited. Confirmed directly against the actual source this session: `grading/submission/checker.mjs:150` builds `const verdicts = {}`, and line 170 assigns `verdicts[String(cs?.token)] = reasons.length ? { ok: false, reasons } : { ok: true }` inside its candidate loop. `grading/checker-grade/cases/cases.json` lists 13 opaque tokens for this package, one of which is the literal string `"__proto__"`. Because `Object.prototype.__proto__` is an inherited accessor, this bracket assignment never creates an enumerable own property for that key — the emitted JSON has no `"__proto__"` entry. Confirmed against the raw `checker-process.log`: exactly 12 of the 13 expected keys are present, missing only `__proto__`. As in Trial 4, the frozen harness's `completeVerdicts()` shape check then fails on the key-count mismatch, and `gradeChecker()` falls through to its synthetic all-failed fallback rather than computing a real per-candidate score — no `grading/checker-grade/grade-summary.json` was written. The checker's actual judgment on the other 12 tokens was never scored; the reported "0 correct" is a harness-level shape-gate artifact, not evidence the checker misjudged every other candidate. It remains a real, reproducible interface-coverage defect and a legitimate reward-zero outcome: a checker that cannot structurally represent a verdict for a valid opaque token fails the required checker deliverable.

This is a genuine recurrence of the defect class — not the same code, since each attempt authors its own checker independently, but the identical plain-object/bracket-assignment `__proto__` collision. Notably, this recurrence is not universal across this campaign: in this same Trial 5 run, recurring calendar and delegated budget both moved away from Trial 4's shape-gate failure to genuine content-level false-positive defects instead, and workflow authority moved to a completely different wrong-output-shape defect (see those documents). The `__proto__`-into-plain-object pitfall appears to be a common but non-deterministic risk in how models typically construct opaque-token-keyed dictionaries, not a guaranteed outcome for any specific package.

No infrastructure interruption; no additional model calls. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/audit sections above, which used earlier task versions or grading revisions.


## Trial 6 preparation — fourth 3.0.0 attempt, provider switch

Prepared September 11, 2026 UTC. The next attempt uses **Codex**, switching from the previous provider, with 2 GiB of authoring memory. It is one of five concurrent attempts in the [new handoff](../../../docs/hardened-next-five-trial-four-handoff.md). Public version 3.0.0, the coverage-v2 grader, package digest and solver instruction remain unchanged. No model call occurred during preparation and this section records no new trial result.

The [infrastructure report](../browser-runtime-reliability-2026-09-11.md) documents the independent runtime build, bounded resource diagnostics, core-dump prevention, local regression checks and recovered disk headroom. The [preparation manifest](../evidence/2026-09-11-hardened-next-five-trial-four-preparation.json) binds the exact next profile and all unchanged package bytes. All Trial 5 completion manifests were reverified. Prior trial outcomes remain intact.

## Trial 6 — fourth 3.0.0 attempt / coverage-v2 / provider switch — September 11, 2026

This is the fourth model attempt on the unchanged public 3.0.0 contract, with all five providers switched from Trial 5 (this package moves from Claude to Codex). Task and coverage-v2 grader packages are byte-identical to Trials 4/5; the frozen runtime was rebuilt only to add browser-authoring memory mitigation and resource diagnostics (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), which does not affect grading. The solver is blind to all previous submissions, grades, reference solutions and analysis docs. Campaign: `.local/hardened-next-five-trial-four-2026-09-11/`. Job id `route-policy-repair-attempt-1`, package digest `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc` (unchanged from Trials 4/5), profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (requested `openai/gpt-5.6-sol`, effort `xhigh`, via Codex — switched from Claude). Dispatched 2026-09-11T06:41:21.692Z, completed 2026-09-11T07:02:13.078Z (20m51s wall; 1,229,290ms / 20m29s authoring per `capture.json`). Usage: 1,816,366 input tokens (1,745,408 cached), 46,793 output tokens (Codex CLI usage; no price reported). Published to `.local/hardened-next-five-trial-four-2026-09-11/real-campaign-frozen/jobs/real-provider/records/route-policy-repair-attempt-1/`, independently re-verified via `verifyEvidence` this session: 910 files, all hashes match, no infrastructure error.

Result: reward **1**. Service **semantic-pass, 33/33** scenarios. Checker **passed**: `grading/checker-grade/grade-summary.json` reports `total:13, correct:13, falsePositives:0, missed:0, deterministic:true`. The submitted `grading/submission/checker.mjs` builds its verdicts safely — `const verdicts = {}` (line 248) followed by `Object.defineProperty(verdicts, String(candidate?.token), {...})` (line 257), not plain bracket assignment — so it correctly represents a verdict for every opaque token, including the literal `"__proto__"` that has tripped up several other submissions across Trials 4/5/6 by colliding with `Object.prototype`'s inherited accessor when assigned via `verdicts[token] = ...` on a plain object.

This is a clean pass — this package's first clean checker result since Trial 4 introduced the opaque-token/coverage-v2 grading revision (it independently hit the `"__proto__"` shape-gate bug, via ordinary bracket assignment, in both its own Trial 4 and Trial 5 attempts). The checker defect is clearly not deterministic per package: the same package produced three different outcomes (shape-gate failure, shape-gate failure again, now a clean pass with a safe `Object.defineProperty` construction) across three independent fresh attempts, the last under a different provider.

No infrastructure interruption. No additional model calls were made. This trial's evidence and interpretation are independent of the Trial 1/2/3/4/5/audit sections above, which used earlier task versions, grading revisions, or providers; do not alter or reinterpret those earlier sections.


## Independent pass audit — Round 4 / historical Trial 6

September 11, 2026. No additional defect was found. The saved service passed **299** further valid generated configurations, and its checker correctly classified 299 reference deployments and 299 changed deployments against the frozen authority. One reference-capacity violation was excluded rather than attributed to the solver. Retain the recorded reward 1. This bounded audit does not claim exhaustive proof over every valid configuration.

[Full audit and rule analysis](../hardened-round-four-pass-audit-2026-09-11.md) · [Evidence and reproduction](../evidence/2026-09-11-hardened-round-four-pass-audit.json). No model calls were made; frozen task/grader exports, saved submissions and original trial records were preserved.


## Round 5 preparation — historical Trial 7 (September 11, 2026)

The preceding Round 4 / historical Trial 6 reward 1 remains counted. Its independent pass audit found no defect within the tested scope. This package’s export is byte-identical to the last trial.

The next attempt is prepared on **Codex**, the same provider as Round 4, using **coverage-v2**. All five tasks launch concurrently into fresh blind workspaces. Round 5 is the fifth campaign on public 3.0.0 and historical Trial 7 in this document. Preparation itself makes no model call and contributes no outcome.

[Coverage and counting report](../browser-coverage-v3-2026-09-11.md) · [Counting disposition](../evidence/2026-09-11-browser-round-four-disposition.json) · [Round 5 handoff](../../../docs/hardened-next-five-trial-five-handoff.md).


## Conditional continuation after Round 5 — prepared September 11, 2026

The user authorized continuing after new reward-zero results, stopping this task on its next pass or at six counted trials with three Codex and three Claude. The already-running Round 5 is unchanged and must finish before the continuation starts. The [explicit counting ledger](../evidence/2026-09-11-hardened-six-counting-ledger.json) records the previously documented first-round regrades and retains excluded attempts separately; preparation adds no trial result. See the [remaining-slot plan](../hardened-six-continuation-preparation-2026-09-11.md) and [operator handoff](../../../docs/hardened-six-continuation-handoff.md).

## Trial 7 independent pass audit — fifth 3.0.0 round — September 11, 2026

**Retain the Codex reward 1: service 33/33, checker 13/13.** The independent audit read both submitted implementations, verified the frozen package and issued contracts, and reverified all 906 retained evidence files before and after testing. It found no additional service or checker defect across **320 additional service configurations and 682 checker classifications**. The targeted portion also passed isolated execution: service 21/21, checker 84/84 with 43 valid and 41 invalid cases, deterministic complete verdicts and unchanged inputs.

Coverage includes nested calls/returns and mutations, original-input preference scope, shared unrequested egresses, prefix and preference boundaries, unusual identifiers, 12 registered communities, legal alternate flat layouts, exactly 512 rules and 4096 predicate atoms, corrected failed publications, forbidden calls after success and changes outside sampled routes. Results were classified against the frozen authority and unchanged reference checker. No new public rule was added. This is bounded additional testing, not a proof covering every valid configuration.

**Current disposition: 3 reward-zero outcomes / 5 scored trials, with 2 retained reward-one outcomes.** Provider counts are three Claude and two Codex. Both Codex T6 and T7 passes remain counted. Even a failure in the remaining Codex slot would yield only 4/6 failures, so this package version has stopped below the 5/6 target. No null, replacement or grader change is justified by the audit. Further optimization would start a separately versioned trial set.

[Full audit, rule mapping and reproduction](../route-trial-seven-pass-audit-2026-09-11.md) · [Sanitized evidence](../evidence/2026-09-11-route-trial-seven-pass-audit.json). No model calls, commits or pushes were made by this audit. Original records and active controllers were preserved.

## Round 5 / historical Trial 7 — execution record and continuation disposition — September 11, 2026

The result itself (reward 1, service 33/33, checker 13/13) and its independent audit are covered above; this records the raw execution identity and the conditional-continuation outcome, which are not yet written elsewhere.

Job id `route-policy-repair-attempt-1` (campaign `.local/hardened-next-five-trial-five-2026-09-11/`), package digest `2145b82b5c06cafcdc3447510d1d5a02ba799d6cbea77e472eb9ae05be921acc` (unchanged since Round 4), profile digest `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641` (`openai/gpt-5.6-sol`, effort `xhigh`, via Codex — same provider as Round 4). Runtime: a verified byte-identical copy of the completed Round 4 frozen runtime (source digest `597df061330dad6fc300dc1bf12fdbc12d29817b1e6d58c80732fc4dea71accc`), not rebuilt. Dispatched 2026-09-11T08:20:44.884Z, completed 2026-09-11T08:50:00.892Z (29m16s wall; 1,732,599ms / 28m53s authoring). Usage: 2,220,267 input tokens (2,103,040 cached), 49,356 output tokens (Codex CLI usage; no price reported). Independently re-verified via `verifyEvidence` this session: 906 files, all hashes match, no infrastructure error. The submitted checker builds its verdicts with `Object.create(null)` (`checker.mjs:524`) rather than a plain `{}`, so the opaque token `"__proto__"` becomes an ordinary own property with no prototype-accessor collision — a third distinct safe construction seen in this campaign, alongside `Object.defineProperty` and explicit key checks.

**User-authorized conditional continuation.** This task was authorized to continue with one further Codex attempt (historical T8) only if this Round 5 attempt failed. Because it passed, the continuation runner stopped the task immediately (`stopReason: "solver-pass"`) and never launched T8 — that slot is unused by design, not an infrastructure gap. Per the user's own framing, this reflects a deliberate stop on a pass, not a claim that the task is mathematically unable to reach 5/6 or 6/6. Final counted tally for this task across Round 5 and the continuation: 5 scored, 3 failures, 2 Codex + 3 Claude, 1 authorized Codex slot left unused.
