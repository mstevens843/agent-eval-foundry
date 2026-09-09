# Fourth ranked group: selection, implementation and Trial 2 readiness

Reviewed and implemented September 9, 2026. **09 → 06 → 05 → 16 → 17** are ready
for second exploratory trials through Foundry or native Harbor. This completes
twenty prepared successors. No model attempts were launched by this implementation.

## Selection from the ten remaining packages

The first fifteen were already implemented. This review reread the remaining ten
trial analyses and inspected the selected maintained packages against their local
successor sources. It retains the ordering in the
[all-package priority review](second-trial-priority-2026-09-09.md).

| Remaining rank | Package | Evidence and decision |
|---|---|---|
| 1 | [09 — Ticket consolidation](next-five/09-ticket-consolidation-repair.md) | Tenant-qualified identity, partial batch results and concurrent edits interact. The prior agent solved them, but preservation across individual writes offers a concrete control beyond final-state comparison. Selected. |
| 2 | [06 — Partition index](next-five/06-partition-index-repair.md) | Ownership, business versions and contiguous completion are distinct state dimensions. Its 18m 48s solve is supporting effort evidence. Retain the current scenario version and correct alternatives rather than count an old checker's version-drift rejection as a new failure. Selected. |
| 3 | [05 — Compatible rollout](original-five/05-compatible-rollout-repair.md) | The original 7m 21s solve was compact, but an existing stage-interruption successor gives a concrete recovery extension. Combine it with rollback and cleanup ownership, with complete private implementations. Selected. |
| 4 | [16 — Document export](fourth-five/16-document-export-repair.md) | Nested encoded content combines privacy with exact structural preservation. The old service needed only two repairs because codecs and traversal were supplied. Removing that implementation while retaining its custom format creates substantially more work. Selected. |
| 5 | [17 — Analytical reconciliation](fourth-five/17-analytical-reconciliation-repair.md) | Cross-source identity, effective revisions, population and exact arithmetic interact. Its original zero was a label disagreement; the successor grades behavior and source traversal. Selected. |
| 6 | [23 — Staged allocation](fifth-five/23-staged-allocation-repair.md) | The original recursive policy repair was small. The leaf-completion discrepancy between versions needs a separate reconciliation; it is not evidence of a new model miss. First reserve. |
| 7 | [02 — Persistent knowledge](original-five/02-persistent-knowledge-repair.md) | A crash successor exists, but the preserved winner reportedly survives it; the original solve took 6m 10s. Retain for the final group. |
| 8 | [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md) | Exact historical integration was solved cleanly. Reconciliation has richer cross-source interactions and higher priority. |
| 9 | [01 — CAA](original-five/01-caa-revalidation-repair.md) | The clean retry solved the concentrated response-association defect. A substantially different challenge needs separate domain work. |
| 10 | [22 — Event window](fifth-five/22-event-window-repair.md) | Its 7m 41s solve changed two small modules; the subsequent input-exposure fix did not establish a new behavior miss. |

This is a spending priority, not a measured failure probability. Required-checker
errors count as task errors; service-only failure is not an extra eligibility rule.
Elapsed time is supporting evidence rather than the selection criterion.

## Implemented plan

1. Preserved each selected source baseline and recorded 1,222 protected source and
   prepared-controller files before editing.
2. Completed private reference and alternative service closures. Removed public
   implementation modules and tests that depended on those modules; each public
   starter now has an empty `subject.run` entry, API and domain contracts.
3. Replaced worked checker-diagnosis instructions with concise deliverable and
   interface requirements. Reasons are optional diagnostics; submitted helper
   modules are supported. Custom output schemas and required input facts remain.
4. Integrated the substantive successor behavior and corrected observed verifier
   gaps. Built independent checker oracles from raw inputs and execution history.
5. Exported Foundry and native Harbor packages, validated both deliverables and
   negative controls, tested isolation, and reproduced exports.
6. Appended engineering records to the original five analysis documents. Trial 1
   history and original recorded rewards remain intact.

No new authoring gates were added. The existing policy changes already permit
exploratory trials without a separate timed human solve, a green starter suite,
or rejection merely because a solver can test its own work. Expert inference and
consequences of stated requirements remain valid sources of difficulty.

## Package changes

| Package | Change and resulting behavior |
|---|---|
| Ticket consolidation | Every applied patch must preserve existing labels. A new control removes labels temporarily, then restores the correct final set; both grader and independent checker reject that history. Removed computed `selected` and `validPatch` annotations from checker inputs, retaining raw rows, requests, pre-write state, statuses and external edit facts. |
| Partition index | Retained the maintained out-of-order/reassignment scenario version and raw input events. Completed the private consumer/ownership/index/progress closure. The new checker independently reconstructs ownership, delivered events, durable versions, completion and checkpoints. Both incremental and end-of-stream commit strategies pass. |
| Compatible rollout | Integrated four stage-response-loss cases and added two interrupted unhealthy-stage cases. Actual process termination preserves external state and storage. Both correct implementations retain original job-entry rollback/cleanup information. Added resume-without-health and forgotten-origin controls. Added a required checker, typed API, and raw per-job input/state/history records; private legality verdicts are no longer exposed. |
| Document export | Completed the private service, codec, publisher and transformation closure. The independent checker decodes actual successful publication bytes and validates them against original documents and policy, accepting alternative JSON/gzip serialization. It does not import the grader or trust the grader's normalized document representation. |
| Analytical reconciliation | Completed the private pagination, revision, arithmetic and reporting closure. Enforced the already-public requirement to traverse each table through `next:null`; an empty-source control isolates premature termination without changing report totals. The checker independently derives exact amounts and provenance and checks actual successful record calls. Simplified repeated arithmetic/selection advice while retaining the mathematical definition. |

The rollout integration does **not** adopt the local prototype's implicit automatic
staging-record retirement on bind. Its public API still requires cleanup, including
records from interrupted deliveries. Durable job-entry information makes recovery
attainable without that additional backend assistance. The public contract defines
the interruption boundary and retained state without prescribing a journal format.

Rollout now has 18 scenarios: the original twelve and six interruption cases.
Other generators retain their current bytes. A
[generator version record](evidence/2026-09-09-fourth-ranked-five-generators.json)
preserves the original rollout generator identity. The existing generator regression
now recognizes versioned successors, including the earlier browser/budget changes,
without rewriting historical selection records.

## Validation

[Exact evidence and digests](evidence/2026-09-09-fourth-ranked-five-implementation.json)
bind the results below to retained files.

| Check | Result |
|---|---|
| Foundry assurance | 78 checks passed; five complete service references and alternatives pass; all five untouched service starters fail semantically. |
| Independent checker oracles | 63/63 classifications correct: ten correct implementations and 53 negative controls. No false accepts or misses. |
| Native static checks | 110/110 passed, 22 per package. |
| Native integrity | 30/30 controls passed, including private-read protection and rejection of forged reward/output writes. |
| Harbor oracle | Five reward-one results; both service and required checker pass, without infrastructure errors. |
| Harbor nop | Five expected zeroes for missing required checker deliverables; zero infrastructure exceptions. Foundry assurance separately checks semantic failure of the empty services. |
| Regression suite | 45 tests passed, including temporary label loss, empty-source exhaustion, binding-time health, export closures and existing portfolio properties. |
| TypeScript and changed-test lint | Passed. |
| Export reproduction | Five Foundry rebuilds/recipient validations passed. Final exports were reverified. All twenty native exports reproduce, covering the previous fifteen plus this group. |
| Preservation | All 1,222 protected files unchanged. The main `dist/` was not rebuilt. The prepared trial controllers and readiness records were unchanged. |

Build and export work used
`.local/fourth-ranked-five-implementation-2026-09-09/source/`.
The first Foundry validation/reproduction evidence remains under `release-v1/`;
the final re-exported delivery packages are under `release-ready/`. Native checks
used freed trial-container capacity, with at most two local native jobs active.
No solver runtime, existing package export or active model submission was edited.

## Trial 2 handoff

Use the following exact Foundry exports under
`.local/fourth-ranked-five-implementation-2026-09-09/`:

| Priority | Package | Target | Export |
|---|---|---|---|
| 1 | ticket-consolidation-repair | Claude | `release-ready/ticket-consolidation-repair/export` |
| 2 | partition-index-repair | Codex | `release-ready/partition-index-repair/export` |
| 3 | compatible-rollout-repair | Claude | `release-ready/compatible-rollout-repair/export` |
| 4 | document-export-repair | Codex | `release-ready/document-export-repair/export` |
| 5 | analytical-reconciliation-repair | Codex | `release-ready/analytical-reconciliation-repair/export` |

This gives three Codex and two Claude assignments while retaining all five original
model families. Native counterparts are under `harbor-ready/<id>`.
[The implementation guide](../../docs/fourth-ranked-five-implementation.md) gives
the per-task document paths and retained native configurations.

A future controller must bind these exports and profiles and use fresh campaign
records. Append Trial 2 to the original analyses, separating service and checker
results and recording the version change. Rollout's added checker changes its
deliverable count. Do not reclassify the historical partition diagnostic as a new
attempt, or the historical analytics label disagreement as a new capability miss.

Only **23, 02, 10, 01 and 22** remain outside the twenty implemented successors.
Final submission still requires its human-authored material and required rubric,
standard and cheat qualification on the chosen final version.
