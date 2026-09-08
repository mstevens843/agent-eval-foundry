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
