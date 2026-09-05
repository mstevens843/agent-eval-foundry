# Phase 21 operator-treatment schema

Machine-enforced by `src/phase-21/operator-schema.ts` (`parseOperatorTreatmentSchema`); data lives in
`data/phase-21-operators.json`. This document explains the fields; the parser is the actual contract.

## Why this schema exists rather than extending `hardness-ledger.ts`

`src/foundry/hardness-ledger.ts`'s `HardnessOperatorEvidence` is a **retrospective** record: free-text
`changed`/`stayedFixed`/`beforeEvidence`/`afterEvidence` describing what was already learned about an
operator, after the fact. It has no preconditions field, no structured/diffable delta, and no
matched-pair (baseline vs treated) identifiers, because it was never meant to drive a new experiment —
only to summarise a finished one.

This schema is **prospective**. It describes an operator precisely enough, before any measurement
runs, that a machine can check (a) whether a candidate substrate satisfies the operator's
preconditions, and (b) whether a constructed "treated" variant actually differs from its "baseline"
ONLY in the declared way. Once an experiment concludes, `src/phase-21/operator-ledger-bridge.ts`
converts the result into a `HardnessOperatorEvidence`-shaped record, so the two systems stay linked
rather than forking into disconnected operator-tracking.

## Fields

| Field | Meaning |
|---|---|
| `id` | Stable kebab-case identifier. |
| `causalClaim` | One sentence: "applying this operator causes X, holding everything else fixed." |
| `targetsMechanisms` | Mechanism registry ids this operator is meant to make harder to shortcut. |
| `preconditions` | What a substrate must satisfy before this operator can be applied to it. See `PreconditionKind` below. |
| `constructionDelta` | The EXACT delta a treated variant makes — precise enough that two independent implementations would agree on what to build. |
| `staysFixed` | What must NOT change between baseline and treated, stated as explicitly as the delta. |
| `shapeFieldsEdited` | The declared fields (TaskShape fields, or a named function like "scenario selection function only") this operator's delta touches. This is what makes "everything else held fixed" mechanically checkable — see `assertMatchedPairDiffable`. |
| `legibilitySensitive` | `true` if the operator's causal claim depends on a defect's location/mechanism being non-obvious. Such an operator may not be piloted on a Phase 20 grandfathered-leak family (`dao-descendant`, `trading-reconciliation-recompute`, `deployment-rollback-recompute`) until re-baselined. |
| `measurable` | `false` for a prerequisite/checklist item that is not itself a treatment (e.g. "migrate this family's isolation" changes the harness, not the family, and produces no shape delta). An operator with `measurable: false` must have `evidenceStatus: "untested"` — the parser enforces this. |
| `evidenceStatus` | `untested` / `piloted` / `measured`. |
| `priorEvidence` | Existing repository evidence this operator's claim can already point to, if any. |
| `candidateSubstrates` / `excludedSubstrates` | Family ids Lane 0's audit confirmed can (or explicitly cannot yet, and why) carry a matched pair for this operator. A schema entry may not claim measurability nobody checked. |

### `PreconditionKind`

- `family-mechanism` — checked against the mechanism registry.
- `family-not-grandfathered` — checked against Phase 20's grandfathered-leak set.
- `family-migrated` — checked against `SECURELY_MIGRATED_FAMILIES`.
- `custom` — checked by hand; `detail` must say exactly what was checked and how.

## The twelve operators, and why two of the roadmap's original candidates needed reframing

All twelve operators from the roadmap discussion are formalized in `data/phase-21-operators.json`.
Two needed an honest correction during formalization, found by auditing `src/foundry/evolve.ts`
(Lane 0):

- **`authoritative-state-inaccessible-to-subject`** is not a task-CONTENT operator at all — it is a
  grading-INFRASTRUCTURE property (exactly what Phase 20's cell-container boundary already delivers).
  Its `shapeFieldsEdited` is empty on purpose; its delta is "which process the ledger is constructed
  in," not a TaskShape field. It is recorded as `measurable: true` (a real, checkable delta exists),
  but flagged as operating at a different layer than the other eleven.
- evolve.ts's own `upgrade_isolation` operator (a DIFFERENT, pre-existing taxonomy used for
  proposing killed-family descendants) is the clearest illustration of the general failure mode this
  schema's `measurable` field exists to prevent: it changes the harness, not the family, has empty
  `knobs`/`addsMechanisms`, and produces no meaningful `variantToShape()` output at all. It is not one
  of Phase 21's twelve operators, but it is exactly the shape of thing `measurable: false` exists to
  name rather than silently reinvent as if it were a real, pilotable treatment.

## Legibility-sensitive operators and the three grandfathered families

`causal-depth` and `outcome-specified-solution-undirected-contracts` are marked
`legibilitySensitive: true` and correctly exclude `dao-descendant`, `trading-reconciliation-recompute`,
and `deployment-rollback-recompute` as candidate substrates — a test
(`test/phase-21-operator-lab.test.ts`) enforces this mechanically for every operator in the checked-in
schema.

`defect-non-legibility-at-edit-site` is the one exception, and it is exactly the operator whose causal
claim IS about that leak: it uses the same three families as candidate substrates, but only via a NEW,
separately-hashed sibling variant that never edits the original, hash-pinned, Phase-14-evidenced files
— resolving the tension Phase 20 recorded without touching preserved historical evidence.
