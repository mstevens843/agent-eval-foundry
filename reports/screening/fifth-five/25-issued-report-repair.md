# 25 — Issued report repair

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
