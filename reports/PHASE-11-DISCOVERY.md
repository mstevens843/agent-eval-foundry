# Phase 11 - discovery verdict

**The registered search produced no independently surviving candidate. The foundry is a screening instrument today; it has not demonstrated discovery.**

The preregistration predicted 1 survivor from 3 systems. The result was **0**. 1 candidate was drafted, all 2 independent readers killed it at the first screen, and the other 2 systems died before a candidate was warranted. The prediction was **falsified**.

**Recommendation:** This is a screening instrument today; spend the $100k on screening and selective builds, not bulk production. Repair deterministic descendant packaging and durable trial capture before buying another matrix.

## Audit before action

Phase 10's two rows are summaries without the durable trial directories this repository requires.
Phase 10 originally marked them `counts: true`. That flag is now withdrawn: a trial that cannot
be re-graded does not become countable because its summary describes a clean run.

| reported run | directory | countability artifacts | root-cause artifact | missing / invalid |
|---|---:|---:|---:|---|
| `p10-outbox-codex-1` | no | no | no | `metadata.json`, `challenge`, `submission`, `transcript.txt`, `verifier-output.json`, `result.json`, `countability.json` |
| `p10-outbox-claude-1` | no | no | no | `metadata.json`, `challenge`, `submission`, `transcript.txt`, `verifier-output.json`, `result.json`, `countability.json` |

The repository therefore supports **6 clean zero-solve parent trials**, not 8. The current one-sided 95% upper bound is **p <= 0.393**. The reported 8-trial bound, 0.312, is arithmetically correct but not repo-countable. The reported $24.14 remains a spend claim, not re-gradeable trial evidence.

The 6 preserved failures contain **0 capability-labelled failures**. Phase 10's Codex label and split Claude label also lack the evidence packets they describe. Difficulty evidence remains zero.

Current repository state: the descendant is registered as a built family: **yes**. An executable in-repo package exists: **yes**. At the Phase 11 decision point neither existed; the Phase 9 scenario-selection and screen JSON alone were evidence about a proposed package, not a challenge package an agent could run.

The brief's dead `reports/PHASE-10-MEASURED.md` reference was repaired to point at the Phase 10 data files. Creating another hand-authored measurement report would have enlarged the prose-drift problem it was meant to document.

## IN_DOUBT -> LEASED

**Verdict: A1. The package does not determine that IN_DOUBT -> LEASED is illegal. This is a second specification defect in the parent, not a demonstrated capability axis.**

The derivation test uses only text visible to the agent:

| source | location | finding |
|---|---|---|
| `tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md` | section 4, lines 48-58 | The state diagram omits IN_DOUBT, then the next paragraph says IN_DOUBT exists and the audit must account for whichever states an action actually passes through. The diagram is not an exhaustive transition table. |
| `tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md` | section 4, lines 60-67 | An expired lease may be taken by any worker and increments epoch. The sentence does not restrict this permission to a listed action state. |
| `tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md` | section 5, lines 71-76 | A worker may lease one READY action, or one whose lease has expired. This is positive text permitting the expired-lease branch without saying IN_DOUBT is excluded. |
| `tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md` | section 7, lines 113-130 | Repeating an UNKNOWN call during its window returns UNKNOWN again; later authoritative receipts settle it. This constrains tool outcomes, not the action-state transition used before a retry. |
| `tasks/durable-approval-outbox/environment/app/engine/types.py` | lines 15-23 | IN_DOUBT means a call went out and nothing local can settle it. The type definition states no outgoing-transition restriction. |

Profile: 5 citations across 4 sections, inference depth 2, load-bearing negative inference **yes**, chain writable **no**. Under the taxonomy, an unwritable chain is A1; the numerical profile would already be fragile A2/A4 if a chain existed.

The only route to the verifier's rule treats a diagram that immediately declares an omitted state as exhaustive and turns text about repeated tool outcomes into an unstated action-state prohibition.

The hidden verifier's `LEGAL` table does reject this edge (LEGAL table, lines 155-163). That proves it is graded; it does not make the hidden restriction derivable. This derivation does not relabel the disputed Phase 10 Claude trial. Its two blind labels disagreed, so it remains unlabelled and contributes no difficulty evidence.

## Registered search

Procedure: `data/phase-10-lane-c.json`. Preregistration: `data/phase-11-preregistration.json`. The targets and one-survivor prediction were written before the target specifications were opened.

| order | real system | author reached | final death step | candidate drafted | result |
|---:|---|---:|---:|---:|---|
| 1 | Git object database and ref transactions | 5 | **3** | yes | Recomputing a commit is not the natural recovery move when the exact intended object ID was durably committed. Both independent readers also showed that comparing the readable remote tip with that intended ID exposes the divergence locally. |
| 2 | npm package lock versus registry resolution | 3 | **3** | no | Registry re-resolution from a semver range is not the natural lock-aware recovery path. npm install uses a compatible lock and npm ci refuses to rewrite it; exact identity and integrity are already local and testable. |
| 3 | SQLite WAL and checkpoint recovery | 1 | **1** | no | No genuine inaccessible observer boundary was found. The WAL is subject-readable local state, and snapshot/checkpoint APIs expose success or invalidation. Moving the witness to a verifier-only copy would invent the boundary rather than discover one in SQLite. |

The Git entry is the important correction. The author advanced it through step 5. Independent
reading moved the failure back to step 3: exact old/new OIDs were already durable, so reconstructing
the intended update is more natural than creating a new commit. It also fails screen 1 because the
current remote tip is readable and can be compared directly with the durable intended OID.

| reader | provider family | verdict | earliest screen | classification | confidence |
|---|---|---|---|---|---:|
| reader-a | OpenAI | **kill** | screen 1: vise/local observability | locally-observable | 0.99 |
| reader-b | OpenAI | **kill** | screen 1: vise/local observability | signalled and locally-observable | 0.97 |

Both readers were independent OpenAI subagents and were withheld the preregistration and author
verdict. This satisfies independent reading, not the cross-provider blind-labelling rule used for
difficulty evidence. No root-cause claim is unlocked by these reads.

| system | authoritative documents | cited sections | sources |
|---|---:|---:|---|
| Git object database and ref transactions | 2 | 6 | [source](https://git-scm.com/docs/gitdatamodel.html) [source](https://git-scm.com/docs/git-update-ref.html) |
| npm package lock versus registry resolution | 3 | 4 | [source](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/) [source](https://docs.npmjs.com/cli/v11/commands/npm-install/) [source](https://docs.npmjs.com/cli/v11/commands/npm-ci/) |
| SQLite WAL and checkpoint recovery | 3 | 8 | [source](https://www.sqlite.org/wal.html) [source](https://www.sqlite.org/fileformat.html) [source](https://www.sqlite.org/c3ref/snapshot.html) |

Observed discovery cost: **3 systems, 8 authoritative documents, 18 cited sections, and 2 reader passes for zero survivors**. Cost per survivor is therefore **not finite / not estimable**, not zero.

## Measurement decision

Decision: **do-not-run**. Descendant and additional parent trials were not run.

The blockers below are the historical Phase 11 blockers. Phase 12 has since resolved the package and durable-capture blocker; it has not created agent-trial evidence.

- Neither Phase 10 run ID has a trial directory, challenge copy, submission, transcript, metadata, verifier output, normalized result, countability judgement, or root-cause sidecar in the repository.
- The claimed dao-descendant package is not a built family or task package in either checked repository. Only scenario-selection and local screen data exist, so there is no challenge hash to preregister or artifact to send to agents.
- The registered descendant matrix requires two provider families and blind cross-provider labels; the second provider was unavailable during this phase.
- Buying more runs before repairing package materialization and durable capture would produce more summaries that the repository cannot re-grade.

B6 remains present at `src/screens/rig-integrity.ts` with passed in the Phase 11 baseline suite. This phase introduced no new pass/fail rig, so it created no invocation that could legitimately claim matrix evidence without controls.

| evidence row | trials | solves | p-hat | one-sided 95% upper bound | status |
|---|---:|---:|---:|---:|---|
| parent, repo-countable | 6 | 0 | 0.000 | 0.393 | measured and re-gradeable |
| parent, Phase 10 summary claim | 8 | 0 | 0.000 | 0.312 | **not countable; artifacts absent** |
| parent target | 12 | 0 | 0.000 | 0.221 | not reached |
| descendant | 0 | - | - | - | package absent at the Phase 11 decision; packaged in Phase 12, still no trials |

At the benchmark bar of solve rate <= 0.30, zero solves need at least 9 clean trials (n=9 gives 0.283); the repo-countable parent evidence does not clear it. At the take-home bar, the parent has an observed 6/6 failure artifact but zero capability-attributed failures, while the descendant has no trial evidence. Self-check coverage and failure concentration are **not measured**; kill signals 2-4 are not evaluable.

## Economics

| input | value | status |
|---|---:|---|
| descendant build time | 0.18 h | measured descendant-only marginal work recorded in data/phase-9-descendant.json; The spec, harness, verifier, reference engine, and cheat oracles already existed; the deliverable package is absent. Never substitute this for hoursPerFamily. |
| from-scratch `hoursPerFamily` | 45 h | **estimated**; declared shapes span 18-120 h, mean 62.4, median 57.5 |
| Phase 10 Codex trial | $3.33 | reported, not repo-reproducible because the run artifacts are absent |
| Phase 10 Opus trial | $20.82 (6.3x Codex) | reported, not repo-reproducible because the run artifacts are absent |
| A2 differential | $120.20 counted / $152.81 with losses | measured in Phase 4 |
| forward kill | 3 model reads, measured in Phase 8 | measured |
| full spec probe | about 8 model reads, measured in Phase 5 | measured |
| mechanical screens | seconds to minutes | observed order of magnitude |
| this discovery search | 3 systems, 8 authoritative documents, 18 cited sections, 2 independent reader passes, 0 survivors | measured this phase |

Expected builds per shipped task are not one number:

| acceptance bar | expected builds / ship | provenance |
|---|---:|---|
| benchmark solve rate <= 30% | 2.00 | 1 of 2 locally built families died after trials; measured but too small a sample for a stable rate |
| take-home 6/6 failures | 13.26-120.43 | modelled over p=0.35-0.55 |
| take-home at least 5/6 failures | 3.13-14.45 | modelled over p=0.35-0.55 |

The take-home rows are modelled, not measured production yield. At p=0.35, six failures cost about one success per 13.26 builds; at p=0.55, about one per 120.43. The registered screens are cheap relative to the estimated build range, but this search establishes no finite search-to-survivor rate.

The existing $100000.00 model yields 7 families at its optimistic 45-hour input, not 1,000 deliverables.
With discovery unproved, the defensible allocation is boundary-first search, cheap independent
screening, and selective descendant builds only after a candidate survives. Bulk production would
multiply an unmeasured discovery yield by an estimated build cost.

## Corrections and limits

1. Phase 10 reported an eight-trial parent tally, but its two new run artifacts are absent. Phase 11 withdrew both counts; under the repository's own countability rule the supported tally remains six.
2. Before correction, data/phase-10-trials.json contradicted itself by describing both an eight-trial tally and a seven-trial tally. The corrected ledger preserves the original eight-trial claim separately and derives neither as evidence.
3. data/phase-10-status.json is stale: it says one parent trial is in flight and eleven remain.
4. PHASE-11-BRIEF.md referenced a PHASE-10-MEASURED.md file that does not exist.
5. Phase 9 says dao-descendant was built and packaged, but no executable package or built-family registration exists in either repository.
6. The Phase 9 rig first fabricated an all-failing reference result because it attached result.tool while checks read result._tool; B6 now protects future pass/fail rigs.
7. Five of five generated row-five candidates died on first independent reading; this phase's search draft also died under independent reading.
8. Ten hand-authored reports are allowlisted against a stated ceiling of two, so prose remains a drift surface. This Phase 11 report is generated instead.
9. The deterministic all-report command embedded live Docker daemon readiness. Phase 11 changed generated output to say not probed while preserving live readiness in the explicit container report command.
10. PHASE-11-BRIEF.md describes hoursPerFamily as 55-120 hours, while the executable budget uses an estimated 45 hours and the 18 declared shapes span 18-120. The generated economics retain the executable 45-hour input and expose the full range rather than selecting a new estimate.

The common failure is trusting a confident summary without checking the artifact it names. Phase 11
does not repair that with another claim: this report is generated from the structured ledger, the
checked-in trial directories, and formulas exercised by tests.

## Answer

Three real systems were searched in registered order. **1 candidate was drafted; 0 survived independent reading.** Discovery cost is 8 authoritative documents, 18 cited sections, and 2 reader passes with no finite per-survivor estimate. `IN_DOUBT -> LEASED` is A1, not a second capability axis. The repo-supported parent bound remains p <= 0.393; descendant agent evidence remains unmeasured.

**On this evidence, the foundry screens reliably but has not demonstrated discovery. Search, screen,
and build only what survives; do not price bulk production as though discovery yield were known.**

---

Generated by `agent-eval-foundry`. Deterministic - no timestamp, diffable.
