# 25 — Issued report repair

> **Final counted result: 6/6 reward=0 — meets the reported ≥5/6 target.** Three Codex and three Claude trials; no slots pending. [Final results and counting method](../final-results-2026-09-09.md). The dated analysis below preserves the complete trial and grading history.

## Outcome

Claude, requested Opus 5 / max, completed in **25 minutes 57 seconds**, with **reward 1**.
The service passed **27/27 protected scenarios** and the checker passed **13/13
candidates**, accepting both correct implementations and rejecting all eleven negative
controls with an actually failed public obligation named. Repeated checker results
were deterministic, with no recorded execution error or retry.

## What the task was, in plain English

A reporting service publishes calculations derived from versioned source readings and
other reports. Published versions are immutable. If a source changes, the service must
issue amendments where needed, propagate those versions through dependent reports,
and send corrections to people who previously received the affected report.

A numerical result staying the same does not mean nothing changed. Re-measuring a
source at a newer version can require a report amendment solely because its provenance
changed. That amendment changes the direct report-version input of downstream reports,
which can then require their own amendments even if their values also remain equal.

Old recipients must receive new versions without being requested again, while recipients
of unrelated reports must not be pulled into the audience. A historical query must
return the payload that was actually issued at that version, not a recomputation using
today's readings. This concerns versioned product reports; no medical judgment or
unspecified remote delivery semantics are involved.

## What was in the package

The starter separated graph ordering, payload computation/change detection, audience
selection and orchestration. Public semantics defined ordered direct source versions,
unavailable values, immutable version chains, recipient scope and exact historical
queries. The standalone checker received original definitions/readings, legitimate
initial history/receipts, complete source-change steps and actual external effects.

The protected bank contained 27 service scenarios and thirteen checker candidates,
including an independently structured correct alternative. Correct independent output
ordering and different snapshot strategies were allowed. Preflight had repaired an
earlier witness that relied on one particular snapshot pattern; the raw original
inputs make a no-read or incomplete candidate independently judgeable.

## What the agent actually did

The capture contains 47 shell calls. The service repair changes only
`src/payload.mjs` and `src/audience.mjs`; the graph and orchestration modules remain
unchanged. It also supplied a standalone checker and a substantial retained test fixture suite.

1. The old `changed()` compared only status and numeric value. It now also compares
   the complete ordered direct-source list: kind, ID and version. This activates
   provenance-only amendments and the cascade through dependent report versions.
2. The old audience was only the current step's explicit requesters. On a new version,
   the repair unions those requesters with every recipient who previously received
   any version of the same report. Existing per-report/version/recipient deduplication
   then prevents repeat delivery.
3. It verified rather than rewrote the surrounding orchestration. Append-only history,
   dependency ordering and answering from archived payloads were already present.
   They are important successful behaviors, but the diff does not support crediting
   them as newly implemented fixes.
4. The checker independently reconstructs expected publications, deliveries and answers
   from raw input, and compares actual recorded effects and their step boundaries.
   It uses host observations to detect work done too late and does not read diagnostic
   reports as correctness evidence.

The checker can use authoritative source-reading snapshots as a supplement to the
original step changes. That is not trusting a candidate's self-report: those values
come from the host's snapshot response. Nevertheless, its reconstruction of history
and timing is its own implementation and needs negative and alternative-positive tests.

## How it tested the result

The final retained suite contains **26 tests**, including seven hand-built scenarios
with expected traces recorded as golden fixtures. They cover source-version-only
amendments, unavailable inputs, repeated ordered inputs, deeper report cascades,
disjoint audiences and quiet steps.

The agent's candidate bank contains two intended-correct implementations and 24 mutants.
The alternative takes an entry snapshot, maintains local state, changes independent
ordering, answers queries earlier and batches deliveries. That matters: a checker
that merely compares the reference's API sequence could reject this valid approach.

The captured final extended run uses **2,000 generated scenarios** and passes all
26 tests. The property test compares the two correct implementations' normalized
traces, accepts them both, rejects mutants whose trace diverges from that reference,
and checks repeated verdicts. Its default test count is 250 seeds; the extended
2,000-seed run took about 22 seconds for that property test, not the roughly three
seconds mentioned for the default suite in the agent's final summary.

These are substantial self-tests, but the mutation oracle is still based on normalized
trace divergence from the author's correct model. They are not independent proof
that every untested implementation or every label interpretation is correct. The
protected service and checker grades remain the separate outcome evidence.

## What it handled well, and what to scrutinize

The agent caught the secondary provenance obligation instead of limiting the fix to
numerical values. It also restored the full historical audience while preserving
scope boundaries and delivery deduplication. These are exactly the sorts of coupled
requirements the portfolio hoped would be missed, and this attempt handled them.

For historical-answer reasons, its checker compares a returned answer with the payload
actually present in that candidate's issued history. A wrong publication is attributed
to amendment content; only a lookup differing from the issued version is attributed
to historical answers. That is a coherent separation, but the public label mapping
should make such distinctions explicit rather than leave them to hidden taxonomy.

The next narrow checker audit should exercise wrong publication content combined with
a faithful historical lookup, and correct publication content with a wrong-version
lookup, as separate controls. Also retain correct alternatives that use fewer snapshots
or different independent output ordering. Any suspected weakness remains a follow-up
until an in-contract counterexample is actually executed.

## Why this was not a hardness success

Despite a substantial versioned workflow, the two real repair points were small and
directly described by the public invariants. The starter already did most ordering,
history and deduplication work correctly. The agent spent its remaining time constructing
and testing the checker, not struggling to make the service function.

This is valuable negative evidence about the current construction, not a reason to
hide provenance requirements or introduce arbitrary delivery uncertainty. A stronger
successor needs a genuinely more substantial implementation obligation, complete
public semantics, an attainable solution and narrow controls. Merely appending more
definitions or recipients to this same repair does not establish difficulty.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) preserves original
reward, timing, exact reason policy, service/checker results, changed files and capture
hashes. The retained fixtures and original tool output support the self-test account;
no model submission was executed unprotected during analysis. This is one exploratory
pass, not official qualification, a replicated solve rate or backend attestation.
The report describes observable work, not private internal reasoning.

## Changes applied since this trial (2026-09-08)

Despite reward 1 on this trial, reviewers identified a genuine "layer 2" gap: the
private check decomposition never named a distinct "dependency order" obligation, even
though SEMANTICS.md separately requires reconciling "ALL definitions in dependency
order" and that a report's named source version already be published at the moment it
is itself published — a real, order-sensitive property no existing check (all of which
compare final publication *sets*, order-blind by construction) could ever catch.

**Fix — new `dependency_order` check**, in `private/domain.mjs`. Tracks, against the
real incremental history this candidate's own `publish()` calls build one call at a
time, whether every `report`-kind source names a version already present in that history
at the moment of publication — not merely present in the final, precomputed
`expected()` set (which only ever emits parents before children by construction and so
can never observe this defect). Added `dependency_order` to `scenarios.mjs`'s
`checkIds`. **New `reverse-dependency-order` control**
(`private/controls/reverse-dependency-order.mjs`): computes every report's payload in
correct dependency order (so all recorded values/sources are fully correct) but issues
the `publish()` calls themselves in the reverse of that order. Verified via real Docker
build+validate (`local-valid: true`) and direct isolation: fails exactly
`["dependency_order"]` on 24/27 scenarios, clean on the remaining 3.

**A pre-existing, unrelated exposure bug was found and fixed while verifying this fix.**
The canonical development tree's `domain.mjs` was missing
`input: { definitions, readings, initial, steps }` — present in the frozen dispatch tree
(`source-fifth-v2`) this trial actually ran against, and read extensively by the real
checker (`checker.mjs` recomputes its own expected state entirely from `cell.input`).
As with #21/#22/#24, this trial was never at risk — only the separate canonical copy was
stale; added there for consistency, confirmed via free regrade that behavior is
unaffected.

**Combined free regrade of the real preserved checker** against the fully fixed
canonical tree: **13/14 correct, 0 false positives, missed exactly
`reverse-dependency-order`** — confirming, with zero new model calls, that the real
checker's private decomposition genuinely never names this obligation, exactly as
reviewers predicted. Both fixes ported to and independently re-verified in
`source-fifth-v2` (identical result). This trial's multi-label harness fix (crediting
any obligation a control's real trace actually failed) was already applied to the
frozen dispatch tree before this trial ran and is unaffected by this change. **When
trials run again:** a future checker will need to name `dependency_order` on
`reverse-dependency-order` specifically to earn full credit; #25's existing 13/13 on the
other controls should be unaffected.

## September 9 implementation successor — ready for exploratory trials

Ordered source-version identity remains part of the contract; the repeated unchanged-value amendment example is removed. The reverse-dependency-order control and its substantive dependency-order check are integrated. Exact reason labels are no longer graded, resolving the missing-label interface problem. Dependency ordering, audience handling and publication sequencing are no longer supplied in the starter.

Both deliverables now have complete private oracle implementations. The public service
starts from an empty entry point. The checker classifies every supplied case with a
Boolean verdict; optional reasons are ungraded diagnostics, and helper modules are
allowed. Original results above remain historical; no second model trial was run.

Executed validation on this successor:

- Service oracle: 27/27 scenarios; checker oracle: 14/14 candidates.
- Protected Foundry assurance: 17 operations passed; deterministic rebuild and
  exported-CLI recipient reproduction passed, including drift and invalid-execution checks.
- Native Harbor oracle reward 1; native nop reward 0; no Harbor exceptions.
- All 22 pinned upstream static checks and all six local checker/integrity controls passed.
  These local controls are not the official model-powered cheat qualification trials.

Canonical source: `tasks/issued-report-repair`. Native export:
`.local/top-five-implementation-2026-09-09/harbor-ready/issued-report-repair`.

Native export digest: `df8d825785f3e7b5d9376b248d73e7353f7b31a7933ee7c4a4ada15de58278cc`.
Foundry package digest: `32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170`.

[Versioned evidence](../evidence/2026-09-09-top-five-implementation.json) records source
hashes, logs, per-check CTRF results and both package identities. The
[shared implementation record](../top-five-implementation-plan-2026-09-09.md) explains
policy and tooling changes. Use these maintained sources or the identified exports
for the next trial, rather than the older local successor copies named above.

Readiness means engineering readiness for exploration. Removing supplied implementation
code changes the difficulty hypothesis and invalidates any attempt to reuse earlier
model results as qualification for this version. Fresh model evidence is still needed.
The eventual chosen submission also needs human-authored reviewer material and the
required rubric, standard and cheat qualification runs; those requirements do not
justify delaying exploration to qualify all five candidates.

## Trial 2 — implementation successor — September 9, 2026

### Identity and execution

Run `issued-report-repair-attempt-1`, package digest
`32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170`. Requested target **claude**,
`anthropic/claude-opus-5`, effort `max`. Frozen execution source:
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`.
The pinned author image was
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.

Started `2026-09-09T11:35:51.120Z`, completed `2026-09-09T11:55:55.282Z`.
One of exactly five fresh campaign attempts, reserved within **232 ms** and reported
running concurrently by the dispatching agent's `docker ps` observation. Budget:
10,800 seconds, 2 CPUs, 2 GiB; signed subscription-only authorization, one attempt,
no automatic retries or recorded paid-API fallback. No timeout is recorded.
Requested settings are not runtime attestations: Claude model strings were observed;
Codex model identity and effort/scaffold versions were unobservable in the captures.
CLI dollar estimates are not subscription charges.

### Changes and recorded results

The public graph, payload, recipient and orchestration modules were removed. Ordered
source-version identity remains normative without repeated examples. The checker was
required in both trials; Trial 2 makes reasons diagnostic-only and adds the
`reverse-dependency-order` control to the frozen checker bank.

**Recorded reward 0. Service 27/27; checker 12/14.** The checker rejects every one of
the fourteen candidates, including the valid reference and alternative. The original
bank records two false rejections and no missed negative controls. The service suite
passes; that does not establish universal correctness of the service or complete task.

### Publication audit: exact failure mechanism

The actual publications array contains `{after, record: Publication}` rows and the
actual deliveries array contains `{after, receipt: Receipt}` rows. The submitted
checker takes these arrays directly and accesses `r.report`, `r.version` and
`r.payload` on the outer wrapper. Those fields are undefined, causing the
`unexpected publication null vnull` messages. These are undefined fields on actual
wrapper objects; the failure occurs when extracting their contents for comparison.

The frozen CHECKER-INPUT.md names the aggregate arrays but omits their nested
wrappers. It also supplies ordered `{seq, method, request, value}` observations,
and the API declares the publication/delivery request and response meanings. Those
observations are another documented route to the required facts.

The task's Boolean verdict output schema is explicit. The documented observation
route supplies the required facts independently of the aggregate arrays, so a correct
checker does not have to guess private correctness rules or depend on their wrappers.

An unchanged replay reproduces both original verdict sets. A separate shape-only
normalization accepts both valid implementations, exposing a missed
`reverse-dependency-order` control (13/14). A further diagnostic omits only the two
aggregate arrays, exercising the **unchanged submitted checker's existing observation
fallback**. It produces the same classifications: both positives accepted, dependency
order missed. The original API observations and source code are unchanged.

This establishes that the checker could obtain the needed facts through the documented
interface. Its decision to prefer misparsed aggregates caused the original false
rejections. **This is a supported substantive required-checker failure.** The original service 27/27, checker 12/14 and reward 0 remain
unchanged; neither diagnostic is a new model trial or a replacement score.

### Observable effort and comparison

The capture analysis reports a shared `core.mjs`, a replay/diff checker and a final
self-report of 300 random scenarios across 23 mutants with no false accepts or rejects.
Those synthetic fixtures did not catch the real wrapper shape. The input/code/replay
comparison identifies the parsing mistake and the sufficient observation route.

Trial 1 recorded reward 1 and accepted both valid implementations. A later diagnostic
regrade exposed missing dependency-order coverage in that older checker. Trial 2's
shape-normalized diagnostic reveals the same kind of ordering omission in a fresh
submission. Neither diagnostic is a scored independent replication, and the new service
and checker construction work cannot by itself establish causal difficulty gains.

### Next step

Prioritize an independent repeat on this frozen package alongside incremental build.
Do not repair the retained submitted checker or add a solution tutorial. Documenting
aggregate wrappers more fully is an optional interface improvement, not a required
benchmark repair established by the output-schema criterion. Keep the dependency-order
control, whose violation follows from the existing public contract.

[Rules and supporting evidence](../round-two-top-five-2026-09-09.md#rules-boundary-used-in-this-review)
explain the assessment. Cache's distinct matching/replacement question is evaluated
separately.

### Evidence and qualification boundary

The publication audit checked **837 manifest-listed files**
for this record with zero mismatches and compared all four supplied contract/interface
files against the frozen export. Raw evidence remains at
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/issued-report-repair-attempt-1/`.
The earlier Trial 1 text and dated engineering additions above are preserved.

[Campaign results and audited decisions](../round-two-top-five-2026-09-09.md) ·
[Sanitized trial evidence](../evidence/2026-09-09-round-two-top-five.json) ·
[Integrity and diagnostic evidence](../evidence/2026-09-09-round-two-top-five-audit.json).

This is an exploratory repository assessment. The immutable result still records
`adjudication: unlabelled`, `modelEvidenceEligible: false` and
`countsAsModelFailure: false`; publication does not change those fields or claim
six standard failures, official cheat qualification or independent blind review.

## Trial 3 — repeat attempt — September 9, 2026

### A. Identity and execution

Run `issued-report-repair-attempt-1` in the fresh round-three campaign (a new
JobStore slot, not a resume of Trial 2), package digest
`32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170` — byte-identical
to Trial 2's package. Route `professional-multifile/authority-process@1`. Evidence:
`.local/round-three-failing-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/issued-report-repair-attempt-1/`.

Requested target **claude**, `anthropic/claude-opus-5`, effort `max` — the same
provider as Trial 2, copied verbatim from the Trial 2 saved profile (the controller
asserted `profileDigest` and instruction hash identical to Trial 2 before dispatch).
Observed: model `claude-opus-5` confirmed; effort/scaffold version unobservable, as
before. This was a genuinely fresh solver session given only the original public
task inputs — no access to Trial 1, Trial 2, this document, or any prior submission.

Dispatched `2026-09-09T19:02:12.743Z`, completed `2026-09-09T19:25:06.747Z`. Total
elapsed ≈1,374,004 ms (~22m 54s); solver authoring time ≈1,366,536 ms (~22m 47s);
grading ≈7.5 s. One of five reservations installed within a 217 ms window
(19:02:12.628Z–19:02:12.845Z); `docker ps` confirmed all five `foundry-real-*`
containers running concurrently at launch. No timeout, no invalid execution.

### B. Results

**Reward 0. Service 27/27 — fully correct, matching Trial 2 exactly.** Checker:
12/14 correct, 0 missed, **2 false positives — the exact same two candidates as
Trial 2**: `reference` and `alternative` (both `expectedFailingCheck: null`,
genuinely correct implementations). The submitted checker's verdict for both was
`ok: false`. As in Trial 2, this checker rejects every known-good candidate it was
graded against.

### C. Comparison with Trial 2 and recurrence assessment

This is a genuine, exact recurrence of the symptom — 100% false-positive rejection
of known-good candidates — in a completely independently-written checker, same
provider, same package. Reading this checker's code directly against the real
grading fixtures shows the **mechanical cause is related but not identical** to
Trial 2's:

- Trial 2's checker never unwrapped either aggregate array, accessing `r.report`/
  `r.version`/`r.payload` directly on the outer `{after, record}` and
  `{after, receipt}` wrappers for *both* publications and deliveries.
- This Trial 3 checker's `unwrap()` (line 168) explicitly checks for and merges
  `entry.record` — so publication rows (`{after, record: {...}}`, confirmed from
  the real `cases.json` fixture) are unwrapped correctly. But `unwrap()` never
  checks `entry.receipt` (confirmed: zero occurrences of `.receipt` anywhere in
  `checker.mjs`), and the real delivery rows are shaped `{after, receipt: {...}}`
  (confirmed from the same fixture: `{"after":0,"receipt":{"report":"sum",...}}`).
  So delivery rows pass through `unwrap()` unchanged, and `deliveryEntryKey()`
  computes its key from the wrapper's (nonexistent) `.report`/`.version`/etc.
  fields — garbage keys that can never match the expected, correctly-derived
  delivery keys. The `reconcileSource()` fallback to the raw observation-call log
  (which *would* read delivery data correctly, since call arguments aren't
  wrapped) does not rescue this: its distinct-key-count guard (`left.size !==
  right.size`) diverges precisely because the garbage keys collapse differently
  than the correct ones, so it keeps the broken data instead of falling back.

So: Trial 2 missed the wrapper shape entirely on both fields; Trial 3 explicitly
defended against it for publications but the identical asymmetry claimed deliveries
instead. Two independent Claude/max attempts on September 9, with no shared context, both tripped on the same underlying interface property —
that `Publication` and `Receipt` are wrapped under *differently-named* keys
(`record` vs `receipt`) in the actual/observed-effects arrays, a detail neither
`CHECKER-INPUT.md` nor `api.d.ts` states explicitly for the aggregate arrays. That
convergence records two required-checker failures involving related input handling.
The different bugs do not reduce either score; two attempts do not establish a
long-run failure probability.

### D. Observable solving behavior

The submission's own final report (captured verbatim in `capture/stdout.log`)
explicitly lists, among its verification steps, "field-spelling variants
(renamed change/request/query keys, id-keyed change maps, unwrapped entry state,
**wrapped publication records**, missing `after`, missing call log) reach identical
verdicts" — i.e., the agent *did* specifically stress-test the publication-wrapper
question and defended against it. It did not describe an equivalent test for
delivery/receipt wrapping, and the code confirms that defense was never generalized
to `.receipt`. The same report claims "3000 generated scenarios: ... the validator
accepts all of them" and "1800 cells validated twice in 139 ms, byte-identical
results" — strong claims of thoroughness and correctness that the actual grading
(rejection of both known-good candidates in the bank) directly contradicts. This is not
evidence of a fabricated claim — the self-tests plausibly did pass on the agent's
own synthetic fixtures — but the self-testing had a real, identifiable blind spot
that the official candidate bank exposed and the agent's own fixtures did not.

### E. Failure-mechanism attribution and next step

Per the benchmark rules, a required-checker failure counts even though the service
passes, and reason text is diagnostic-only — this is a supported, substantive
required-deliverable failure, not a grading-alignment artifact. This is the
**second** consecutive recorded zero for issued-report-repair on Claude
(Trial 2 and Trial 3). Continue on the exact package, using the documented raw observations and existing interfaces. No extra aggregate-array tutorial or worked solution is required for this repeat.

### Acceptance progress and next prepared attempt

This unchanged successor has **2 failures and 0 solver passes in two scored attempts**, both on Claude. The user reports that the CEO accepts at least **five failures out of six**, with three attempts per provider; six consecutive failures is the stricter aspiration, not the acceptance threshold. This package remains within that threshold and needs **3 failures from the remaining four attempts**. Different failure mechanisms can count; no identical-bug requirement is added.

The next attempt is **Trial 4 in this document, the third attempt on this successor**, using the same provider, package and saved profile again. Afterward, this package will have three runs on its original provider and will need three on the other provider. [Prepared Trial 4 handoff](../../../docs/round-four-failing-five-handoff.md). Preparation launches no model calls.

## Trial 4 — third unchanged-successor attempt — September 9, 2026

### A. Identity and execution

Run `issued-report-repair-attempt-1` in a fresh round-four campaign (a new JobStore
slot), package digest `32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170`
— byte-identical to Trial 2 and Trial 3. Route `professional-multifile/authority-process@1`.
Evidence: `.local/round-four-failing-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/issued-report-repair-attempt-1/`.

Requested target **claude**, `anthropic/claude-opus-5`, effort `max`, CLI `2.1.263` —
the same provider as Trials 2 and 3, copied verbatim from the completed Trial 3
record (the controller asserted `profileDigest` and instruction hash identical to
Trial 3 before dispatch). Same frozen runtime and author image as every prior round
(`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`). A
genuinely fresh solver session, given only the original public task inputs — no
access to any prior trial, this document, or any earlier submission.

Dispatched `2026-09-09T19:56:46.969Z`, completed `2026-09-09T20:22:39.675Z` — total
elapsed ≈1,552,706 ms (~25m 53s), well under the 10,800 s (3 h) cap. Tokens:
8,590,726 input (8,424,952 cached), 127,117 output; CLI cost estimate $9.05
(subscription-only billing, `maxMicroUsd: 0` — not a charge). All five round-four
jobs were reserved and began dispatching within a 223 ms window and were confirmed
running concurrently via `docker ps`; no timeout, no invalid execution.
`completionSha256 49d1f80d3c7b3294cd779cbf59f895207852ee35d2ae76851bc73da784374ad6`,
`resultSha256 7c76354dfa1f1d1bd380cc3a1f065c7af3a53292a1dd733cea38fda2c925e498`,
`gradeSha256 ca818a8a6a6c1f8516dfb121a3411cc62f5bf8ba6675b079de0fb6146b430df3` — 837
manifest-listed files (11,365,543 bytes), reverified byte-for-byte with zero errors.

### B. Results

**Reward 0. Service 27/27 — fully correct, matching Trials 2 and 3.** Checker:
13/14 correct, **1 missed, 0 false positives**: the negative
candidate `reverse-dependency-order` (`expectedFailingCheck: dependency_order`)
was wrongly accepted. Both `reference` and `alternative` — the known-good
candidates that Trials 2 and 3 both wrongly rejected — are **correctly accepted**
this time (`correct-accept`).

### C. This is not a recurrence — a different checker, a different defect

Trial 2 and Trial 3 both failed by rejecting 100% of the known-good candidate bank
through a checker-side wrapper-unwrapping gap on aggregate `deliveries`/`publications`
arrays. Trial 4's `checker.mjs` is architecturally unrelated to either: it contains
no `unwrap()` function at all. Instead it (1) rebuilds the one legitimate trajectory
per cell from raw input via `simulate()`/`reconcile()` (shared with `core.mjs`), and
(2) checks the submission's recorded run against **two independent evidence views** —
the submission's self-reported `actual.publications`/`.deliveries`/`.answers`
arrays, and a second view (`fromObservations()`) built directly from the raw
`api.publish`/`api.deliver`/`api.answer` **call arguments** in the observation
stream — accepting the candidate if *either* view matches exactly. Confirmed by
reading `checker.mjs`: `fromObservations()` reads `req.report`/`req.version`/etc.
straight off `o.request`, never touching any wrapped aggregate array, so even if
the `actual.deliveries` items are wrapped the same way that broke Trials 2/3
(confirmed from the real `grading/result.json` fixture: delivery rows are still
shaped `{after, receipt: {...}}`), the call-argument view is immune to that shape
and rescues `reference`/`alternative`. This checker did not "fix" the T2/T3 bug by
patching the same code path — it side-steps the whole wrapper question with an
architecture that never depends on it for correctness.

The actual T4 defect is new and narrowly scoped. `checker.mjs`'s own docstring
states its design assumption directly: "the set of new publications, the set of
deliveries and the set of answers are all determined — so only the ordering among
independent outputs is free, which makes an unordered multiset comparison exactly
the right test." Comparison keys (`pubKey`/`delivKey`) tag each record only with
its **step index** (`after`), never a finer-grained emission order within a step.
The `reverse-dependency-order` candidate (read directly from
`grading/checker-grade/candidate-reverse-dependency-order-2/entry.mjs`) computes
every payload value in fully correct dependency order — its own inline comment
says so explicitly: *"the actual publish({record}) calls for reports computed in
this step are issued in the REVERSE of that order, so a dependent's api.publish()
lands before its own parent's api.publish() ... violating SEMANTICS.md's
'reconcile ALL definitions in dependency order' without touching any computed
value, delivery or answer."* Because content and step attribution are both
correct and only the intra-step call sequence is wrong, and the checker's
multiset comparison structurally cannot see intra-step call sequence, this
candidate matches the expected trajectory under **both** of the checker's
evidence views and is wrongly accepted. The checker's stated assumption
("ordering among independent outputs is free") is false specifically for
outputs the contract declares dependency-ordered — a genuine, narrow gap, not a
coincidental grading artifact.

Net: this Claude/max attempt independently avoided the Trial 2/3 defect entirely
(a different architecture, not a patch) and failed on an unrelated required
control. Two different bugs across three attempts, one fixed, a third failure
via neither prior mechanism — the raw reward stays 0 regardless.

### D. Observable solving behavior

The submission's own final report (`capture/stdout.log`) explicitly states the
comparison design later shown to be the gap: *"Rebuilds the single legitimate
trajectory from the raw input and compares it against the recorded run as
unordered multisets keyed by step, since only ordering among independent outputs
is free."* It claims extensive verification: seven hand-worked scenarios, an
independently-written second reference implementation cross-checked on 1,300+
random scenarios with zero divergences, "26 defect variants" replayed (including
"deferred work," "spurious versions," and other timing-adjacent cases), and a
5,400-verdict layout-robustness sweep across 14 plausible schema variants. None of
the described defect variants specifically targets same-step, correct-value,
wrong-emission-order publish sequencing — a real, narrow gap in an otherwise
substantial self-test suite, not a contradicted claim (unlike Trials 2/3, where
the "accepts all known-good candidates" self-claim was directly contradicted by
100% rejection).

### E. Failure-mechanism attribution and next step

Per the benchmark rules, a required-checker failure counts even though the service
passes, and reason text is diagnostic-only — this is a supported, substantive
required-deliverable failure, not a grading-alignment artifact, and a different
valid failure mechanism counts independently of Trials 2 and 3. This is the
**third** consecutive recorded zero for issued-report-repair on Claude by raw
reward count (Trial 2, Trial 3, Trial 4) — but, per the code-level finding above,
only two of those three zeroes share a mechanism (Trials 2 and 3); Trial 4 is a
distinct, independently-discovered required-checker gap. Do not read "three
zeroes" as "the same bug three times" for this package.

### Acceptance progress and next prepared attempt

This unchanged successor now has **3 failures and 0 solver passes in three scored
attempts**, all on Claude — three consecutive recorded zeroes by raw count. Under
the user-reported CEO threshold (at least five failures out of six, three Claude
and three Codex per package), this package needs **at least 2 more failures from
its remaining 3 (Codex) attempts** to reach 5/6; those opposite-provider runs are
not part of this batch and are not authorized here. Different failure mechanisms
count toward this threshold without requiring an identical bug — but the three
Claude mechanisms observed so far (T2 wrapper gap on both fields, T3 wrapper gap on
one field, T4 intra-step ordering gap) argue for describing this package as
"reliably breaks required-checker authoring in varied ways" rather than "has one
specific recurring bug."

### Next batch prepared — September 9, 2026

This package continues at **3/3 failures**. Its
three Claude attempts are complete. The user authorized the next attempt on
**Codex**, using the exact same package and grading. This is **Trial 5**
in this history, the fourth attempt on the unchanged successor and the first
with the opposite provider. It runs concurrently with the other three continuing
packages. The remaining three provider slots need at least two failures to
reach 5/6; only the first of those slots is prepared for this launch.

[Prepared controller and handoff](../../../docs/round-five-continuing-four-handoff.md).
No new model attempt was launched during preparation. Different valid failure
mechanisms and required-checker-only failures can count; the provider switch
does not reset or discard the existing results.

## Trial 5 — first opposite-provider attempt — September 9, 2026

**Reward 1, overall `semantic-pass` — the first pass for this package after three
consecutive Claude failures.** This is the fourth successor attempt and the first
with the provider switched: Codex (`openai/gpt-5.6-sol`, effort `xhigh`, CLI
`0.153.2`) replaced Claude (`anthropic/claude-opus-5`, effort `max`, CLI `2.1.263`)
for the first time on this package. Same author image
(`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`), same
frozen runtime, unchanged package bytes/contract/controls, verified identical to
Trials 2–4 before dispatch. Ran 14m7s, well under the 10,800s cap. Tokens: 598,393
input (536,576 cached), 25,058 output; Codex's CLI does not report a price
(subscription-only billing regardless). completionSha256
`35a7e0e38653ebbdcee050b53b173b972f401bf6fefe9730e5be2e5a81a12a50`, resultSha256
`5878ce177ac3d641571c0813753025e3ee51144eceeef61d0a62f42065bb4825`, gradeSha256
`baa3de2f18fb7494bd5791ffe0bdfe5029060269131ad9119baa7161e32cda65`. 833 manifest
files (9,012,103 bytes) reverified this session, 0 errors. packageDigest
`32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170`, profileDigest
`d0d1158ec7232862c2797058afbf4012d25357161e274feabff65cb957d34794`.

**Service:** 27/27 scenarios, 0 failures — fully correct, matching every prior trial.

**Checker:** 14/14 correct, 0 missed, 0 false positives, `pass: true`. This Codex
checker caught `reverse-dependency-order` (expected `dependency_order`) — the exact
candidate Trial 4's Claude checker missed — and correctly accepted both `reference`
and `alternative`, avoiding the wrapper-unwrapping bug that broke Trials 2/3. Its
`reconcile()` in `model.mjs` recursively resolves each report's own dependencies
first (with cycle detection via `visiting`/`visited` sets) before computing its
value, then compares that freshly-reconstructed, dependency-order-correct
trajectory against the submission's recorded run — a different design from Trial
4's step-granularity multiset comparison, and one that structurally can't miss an
out-of-order emission the way Trial 4's did.

**Progress toward the 5-of-6 threshold:** this package's six-run record is now
3 Claude failures (T2–T4) + 1 Codex pass (T5) = **3 failures, 1 pass, 4 of 6
scored.** Two Codex attempts remain. Reaching "at least 5 failures out of 6" now
requires **both** remaining Codex attempts to fail (3 + 2 = 5); a single additional
pass among them caps the total at 4, below the reported threshold. This is a real
tightening from before Trial 5, when either one or both remaining opposite-provider
runs failing would have sufficed.


### Final-six audit and preparation — September 9, 2026

No additional grading defect was established for this package in the targeted audit.
Its recorded and effective histories remain **0 → 0 → 0 → 1**:
**3 failures in 4 scored attempts**. Two Codex
slots are prepared on the unchanged package and pinned provider profile. Both must fail to reach 5/6; stop after a pass.

The [audit](../final-six-pass-audit-2026-09-09.md) preserves raw records and documents
the separate `final-six-coverage-v1` regrade. The same revision applies to all retained
and future attempts for affected tasks; this is no new public task requirement. See the
[prepared identities](../evidence/2026-09-09-final-six-preparation.json) and
[operator handoff](../../../docs/final-six-handoff.md). No new model trial has launched.

## Trial 6 — final-six campaign, stopped after a pass — September 9, 2026

**Reward 1, overall `semantic-pass` — the second consecutive Codex pass on this
package.** Run `issued-report-repair-attempt-1` in the `final-six-2026-09-09`
campaign, package digest
`32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170` — unchanged across
successor Trials 2–6. Identity: Codex (`openai/gpt-5.6-sol`, effort `xhigh`, CLI
`0.153.2`), same author image and frozen runtime as every prior trial in this
history. Duration 19m59s. Tokens: 1,134,489 input (1,079,808 cached), 32,864
output; as with Trial 5, the Codex CLI never reports a price, so cost is `null`
rather than a $0 charge. Evidence:
`.local/final-six-2026-09-09/issued-report-repair/trial-6/real-campaign-frozen/jobs/real-provider/records/issued-report-repair-attempt-1/`.
`completionSha256 ce8a7362531966127a16b4d1a89a43b2e567bcb31bc5d02d8056cd025baa5c8f`,
`resultSha256 a07976239e0067c4dc2de94d95926ad2b75d43d2b8fb5810f66bf754246158ae`,
`gradeSha256 baa3de2f18fb7494bd5791ffe0bdfe5029060269131ad9119baa7161e32cda65` — 829
manifest files (9,087,130 bytes), reverified this session with zero errors.
`profileDigest a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`.
No supplemental grading policy applies to this package; raw and effective reward
are identical (both 1).

**Service:** 27/27 scenarios, 0 failures — fully correct, matching every prior trial.

**Checker:** 14/14 correct, 0 missed, 0 false positives, `pass: true`. This
checker again caught `reverse-dependency-order` and again correctly accepted both
`reference` and `alternative` — the same net verdict set as Trial 5, but by a
different route. Trial 5's `checker.mjs` reconstructs one full expected
trajectory via a recursive `reconcile()` (dependencies resolved before their own
value, with cycle detection) and diffs the submission's recorded run against it.
Trial 6's `checker.mjs` instead keeps a dedicated `validateDependencyOrder()`
function that walks the actual publication list directly: for any two
publications issued at the same source step, it looks up whether one depends on
the other via each definition's declared `inputs`, and flags the pair if the
dependent was published before (or same-step out of order relative to) what it
depends on. Same obligation caught, but Trial 6 checks it as an explicit
pairwise ordering rule against the dependency graph rather than as a byproduct of
rebuilding a full reference trajectory.

**Trial 7 was never dispatched — stopped because passing made the threshold
mathematically unreachable, not for any infrastructure or budget reason.** This
package's second authorized final-six slot (Trial 7) was withheld once Trial 6's
result came back. The five scored attempts are: T2=0 (Claude),
T3=0 (Claude), T4=0 (Claude), T5=1 (Codex, pass), Trial6=1 (Codex, pass) — **3
failures out of 5 scored attempts**, using only 3 Claude + 2 Codex, not the full
3-Claude/3-Codex balance a completed six-run set requires. With 3 failures
already recorded and at most 1 attempt remaining, the maximum total failures
this package could still reach is 3 + 1 = 4 — below the reported 5-of-6
threshold regardless of what Trial 7 would have done. Dispatching it could not
change the outcome, so it was not launched. **This package's six-run set is now
incomplete and cannot reach the reported 5-of-6 bar**, stopping one attempt
short of a complete set specifically because the threshold became
mathematically unreachable — not because of any infrastructure failure or
exhausted budget.

Worth recording as an observation, not a provider-capability claim from two data
points: three independent Claude/max attempts (Trials 2–4) failed this package
via three different underlying mechanisms — a two-field wrapper-unwrapping gap,
a one-field wrapper-unwrapping gap, and a step-granularity ordering blind spot —
while both Codex attempts (Trial 5 and this Trial 6) passed cleanly, each with
its own independently-built checker that rejected the dependency-order violation.
Reason text remained diagnostic-only.

**Identity correction for the earlier Trial 5 prose:** the retained Codex profile digest
is `a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`, matching Trial 6.
The earlier section mistakenly printed the Claude digest; its recorded reward and the
raw completion/profile files are unchanged.

[Final campaign and standings](../final-six-2026-09-09.md) ·
[Sanitized evidence](../evidence/2026-09-09-final-six.json).

## Post-final pass audit — September 9, 2026

**Current effective score: 5 failures / 5 scored trials. Reopened for the remaining provider slots.**

The new valid control recovers from a documented delivery version error that creates no receipt, then publishes and completes every required output. Trials 5 and 6 reject the unsuccessful call itself. The contract does not require an error-free call history; the frozen service verifier and private reference checker accept the execution.

| Trial | Provider | Original reward | Previous effective reward | Current effective reward | Cumulative supplemental classifications |
| --- | --- | --- | --- | --- | --- |
| 2 | Claude | 0 | 0 | **0** | 0/2 |
| 3 | Claude | 0 | 0 | **0** | 0/2 |
| 4 | Claude | 0 | 0 | **0** | 2/2 |
| 5 | Codex | 1 | 1 | **0** | 1/2 |
| 6 | Codex | 1 | 1 | **0** | 1/2 |

Trial 7, Codex: the sixth attempt completes the 3+3 provider balance; either result yields at least 5/6. No new model trial was launched by this audit.

All retained attempts received the same cumulative `post-final-coverage-v2` controls. Original rewards, manifests and the preceding trial sections remain unchanged. Local replay of both previously passing services on this task's new scenario passed; the new failure is in the required checker.

[Full audit and contract basis](../post-final-pass-audit-2026-09-09.md) · [Sanitized per-trial evidence](../evidence/2026-09-09-post-final-pass-audit.json).

## Trial 7 — post-final-coverage-v2 campaign, final attempt, meets 5/6 — September 9, 2026

**Recorded reward 1, effective reward 0 — this package's sixth and final authorized
attempt.** Run `issued-report-repair-attempt-1`, package digest
`32287026a0f9909c99b6a0a6c43bdd42f9e1549dfa292d6aeea2423258dfe170` — unchanged
across successor Trials 2–7. Identity: Codex (`openai/gpt-5.6-sol`, effort
`xhigh`, CLI `0.153.2`), same author image and frozen runtime as every prior
trial in this history. Duration 12m47s. Tokens: 402,770 input (353,664 cached),
22,836 output; as with Trials 5 and 6, the Codex CLI never reports a price, so
cost is `null` rather than a $0 charge. Evidence:
`.local/final-six-2026-09-09/issued-report-repair/trial-7/real-campaign-frozen/jobs/real-provider/records/issued-report-repair-attempt-1/`.
`completionSha256 ca4c8bdf4650e2e0cef100863de728ecdbe4a4a28460d9607feb8eee9a208eb1`,
`resultSha256 46084d0d30c594a398c496aaffa743965e60fc05db8021bcae95b93107a7150c`,
`gradeSha256 baa3de2f18fb7494bd5791ffe0bdfe5029060269131ad9119baa7161e32cda65` —
829 manifest files (8,956,510 bytes), reverified this session with zero errors.
`profileDigest a6848fd807cf46e419bc5c01a1d24cf91938075550559775aa8f8f952b901641`.

**Service:** 27/27 scenarios, 0 failures — fully correct, matching every prior trial.

**Base checker (original candidate bank):** 14/14 correct, 0 missed, 0 false
positives, `pass: true`. Confirmed directly from
`grading/checker-grade/grade-summary.json` and `grading/result.json`
(`checkerPassed: true`, `reward: 1`). Against the fourteen original candidates
this checker performs exactly as well as Trials 5 and 6.

**Supplemental grade (`post-final-coverage-v2`):** 1/2 correct, deterministic,
`exactTokens: true`, **pass: false.** The new targeted control specific to this
package attempts a delivery *before* the corresponding new version is
published, correctly receives the documented `error:"version"` no-receipt
response, then proceeds with normal publication and delivery — every failed
call verified to have returned that documented error, with no successful
duplicate delivery anywhere in the trace. This submitted checker rejects that
valid execution, with reasons `cell 0: deliver call was not stored` and
`cell 0: deliver calls do not match required receipts` — a different exact
message from both Trial 5 (`malformed or unsuccessful deliver call`) and
Trial 6 (`an invalid delivery call was attempted`), but the same underlying
category of defect.

### Code-level verification: a third checker, a third instance of the same category

Reading `grading/submission/checker.mjs` directly confirms the structural gap.
Its `inspectObservations()` walks every observed `deliver` call and, per call,
runs one blanket test at line 323:

```js
if (!value || value.stored !== true) reasons.push(`${method} call was not stored`);
```

This fires for *any* `deliver` observation whose response is not a stored
receipt — including the documented, correct `error:"version"` response to a
deliberate premature-delivery attempt — with no check for whether that
response is the specific documented no-op error the contract promises rather
than an actual defect. The same premature call then poisons the aggregate
comparison two steps later: `expectedDeliverCalls` (line 341) is built solely
from `expected.deliveries`, the model's reconstruction of the successful
deliveries that should exist, which has no slot for a call that was supposed
to fail. The premature call shows up in `actualDeliverCalls` with no
counterpart in `expectedDeliverCalls`, so the `sameMultiset` check at line 347
also fails with `deliver calls do not match required receipts`. Both observed
reasons trace to this same design choice: the checker treats "a deliver call
whose response is not a stored receipt" as itself disqualifying, rather than
checking whether that response is the one specific documented error the
contract requires for a premature call.

**Three independently-written Codex checkers — Trials 5, 6 and 7 — have now
all rejected this specific documented-error-recovery pattern**, each via a
different exact error message (`malformed or unsuccessful deliver call`;
`an invalid delivery call was attempted`; `deliver call was not stored` /
`deliver calls do not match required receipts`) but the same underlying
category of over-strict validation: treating any failed or errored `deliver()`
attempt as itself a violation, instead of verifying that the call correctly
returned the documented no-receipt response. This is the third consecutive
Codex failure via a related mechanism on this exact aspect of the contract.

### Final classification — six-run set closed

This was this package's final authorized attempt. Going in, the package
already stood at 5 failures out of 5 scored attempts (T2–T4 on Claude, Trial 5
and Trial 6 on Codex, all reclassified to effective 0 under
`post-final-coverage-v2`) — so **either outcome of this attempt, pass or
fail, would already have met the reported "at least 5 failures out of 6"
threshold.** This attempt's own effective failure makes the final result a
clean **6/6**, a complete sweep rather than a bare threshold pass.

**Final effective history across the complete six-run set:** T2 = 0 (Claude),
T3 = 0 (Claude), T4 = 0 (Claude), T5 = 0 (Codex, reclassified), Trial 6 = 0
(Codex, reclassified), Trial 7 = 0 (Codex) — **6 failures out of 6 scored
attempts**, with a complete, balanced 3 Claude + 3 Codex provider split. This
package's six-run set is now **closed**, decisively meeting the reported
"at least 5 failures out of 6" threshold with a full sweep.


## Remaining-pass audit and replacement disposition — September 9, 2026

All six retained submissions received the same cumulative grading again. V3 adds no
report-specific controls; the documented v2 delivery-error-recovery failures remain.
The completed three-Claude/three-Codex set remains six failures in six counted trials.
No attempt is voided or replaced for this package in the user's latest disposition.

| Trial | Provider | Original reward | Cumulative v3 diagnostic reward | Counted reward |
| --- | --- | --- | --- | --- |
| 2 | claude | 0 | 0 | 0 |
| 3 | claude | 0 | 0 | 0 |
| 4 | claude | 0 | 0 | 0 |
| 5 | codex | 1 | 0 | 0 |
| 6 | codex | 1 | 0 | 0 |
| 7 | codex | 1 | 0 | 0 |

Current counted record: **6/6 failures**; 0 fresh replacement slot(s) pending.

[Full audit](../remaining-pass-audit-2026-09-09.md) · [Verified evidence](../evidence/2026-09-09-remaining-pass-audit.json) · [User-selected counting disposition](../evidence/2026-09-09-three-replacement-disposition.json).

Original submissions and grades were preserved and manifest-verified before and after
the audit. The same cumulative controls covered all 24 retained submissions across
the four audited packages. No new model calls were made during this audit.
