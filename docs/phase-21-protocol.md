# Phase 21 protocol: matched variants, evidence levels, outcome metrics, stopping rules

This document covers Lanes 2-4 of Phase 21 together, since they are one connected protocol rather than
three separate ones. The operator taxonomy itself is `docs/phase-21-operator-schema.md`.

## Matched-variant construction (Lane 2)

A matched pair is a `(baseline, treated)` construction that shares scenario generation, the mutant
bank, and grading logic, differing ONLY in the fields the operator's own `shapeFieldsEdited` declares.
This is checked mechanically, not asserted, by `src/phase-21/matched-pair.ts`'s
`assertMatchedPairDiffable`/`requireMatchedPair`: every field that differs between the two arms must
be in the operator's declared edit list, or the pair is refused as confounded
(`PHASE21_MATCHED_PAIR_NOT_DIFFABLE`).

**One operator at a time, by default.** A fractional factorial design (crossing two or more operators)
is used only when the causal question IS the interaction between them — e.g. Phase 13's existing
U×C interaction-contrast estimand (`Y11-Y10-Y01+Y00`) crosses "uncertain effect completion" with
"changed recovery authority" specifically because neither alone breaks the substrate, and the
interaction is the entire point. Absent an explicit interaction hypothesis, cross multiple operators
only after each has its own single-operator matched-pair result — crossing untested operators produces
exactly the CAA-V2-bundle confound Phase 21 exists to stop repeating.

**Constructing a variant without touching the original.** When a family is grandfathered
(Phase 20) or otherwise has preserved historical evidence pinned to its current hash, the treated arm
is built as a NEW, separately-hashed sibling — never by editing the original files. This is how
`defect-non-legibility-at-edit-site` uses the three Phase 20 grandfathered families as substrates
without touching the trial evidence pinned to them.

## Evidence levels (Lane 2)

Four levels, kept structurally distinct. Nothing may be reported at a stronger level than it was
measured at — this rule is carried forward unmodified from Phase 13's transfer-probe layer, which
already enforces exactly this discipline (its `localTransferEstablished` / `agentDifficultyEstablished`
/ `prospectiveRealSystemTransferEstablished` fields are never conflated).

1. **Within-package** — one matched pair, one family, one measurement. The unit this document's own
   pilot (Lane 5) reports at.
2. **Within-family replication** — the SAME operator, the SAME family, measured more than once
   (different scenario subsets, different provider, different attempt). This level did not exist
   anywhere in this repository before Phase 21 (Lane 0 confirmed it); it is the natural next step for
   any operator whose within-package result looks interesting.
3. **Cross-family transfer** — the SAME operator applied to two or more MECHANICALLY DIFFERENT
   families. Reuses Phase 13's interaction-contrast/held-out-subject/hash-stability machinery, extended
   so a new family/operator pair is declared against this schema instead of hand-written as a new
   `Adapter` object.
4. **Production-level evidence** — a real, counted, cell-container-isolated agent trial. As of this
   phase's Lane 0 audit, ZERO families have any current, non-stale, counted trial run under
   cell-container isolation (Phase 20 migrated the ROUTE, not any PAST trial) — this level requires a
   brand-new trial and is gated behind Lane 6's explicit spend authorization.

## Outcome metrics (Lane 3)

- **Solve rate** — fraction of matched units where the "good" outcome (solved / mutant caught /
  reference clean) holds, per arm.
- **Diagnosis time** — real elapsed time or a step-count proxy, when instrumented; not computed for the
  local/mutant-only pilot in this phase, since mutants have no "diagnosis," only pass/fail.
- **Self-check quality** — reuses `src/screens/self-check-coverage.ts`'s existing coverage screen where
  a family's contract calls for one (e.g. `checker-required-memory-poisoning`); not invented anew.
- **Failure cause** — reuses `src/trials/root-cause.ts` verbatim: `ROOT_CAUSES`'s closed enum,
  `isDifficultyEvidence()`, `tallyRootCauses()`. No second taxonomy.

## Stopping rules (Lane 4)

`src/phase-21/stopping-rule.ts` implements a generic two-arm sequential design over matched binary
observations:

1. **Validity regression, checked first, every time.** If the reference/known-good arm fails at all,
   stop immediately (`stop-validity-regression`) — the construction is broken, not evidence about the
   operator.
2. **Minimum matched pairs.** Below `minimumMatchedPairs`, always `continue` regardless of how the data
   looks — this is what stops a lucky early result from being reported as a finding.
3. **McNemar's exact test** (`mcNemarExact`) over the discordant pairs, two-sided, at a preregistered
   `alpha`. Chosen because a matched pair is not two independent samples — the correct test for paired
   binary outcomes is the sign test over discordant pairs (McNemar), not a two-sample proportion test.
   This is the concrete gap Phase 14's own E2 estimand (starter-profile-seeding) left open: it computed
   a bare mean of paired differences with an explicit "limits causal precision" disclaimer, with no
   exact test at all.
4. **Maximum matched pairs.** A hard ceiling; reaching it with zero discordant pairs is reported as
   `stop-null` (a real, honest null), reaching it otherwise as `stop-max-pairs-exhausted` (inconclusive,
   not null and not significant — say so, do not round to either).

Reused from Phase 14 with no changes needed: Clopper-Pearson exact single-arm intervals (for any single-
arm rate reported alongside a matched-pair result), the blind cross-provider failure-cause adjudication
pattern, and `observedRow`'s trial-integrity verification (a preserved trial's model/effort/scenario-
set/isolation/challenge-hash/preregistration-hash must all match before it is trusted) — the last of
these should be called, unmodified, before any preserved matched-pair trial is fed into this engine.
