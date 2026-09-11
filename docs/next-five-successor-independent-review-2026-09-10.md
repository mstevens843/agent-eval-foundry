# Independent review of the five 3.0.0 successors

Follow-up: the [September 10 hardening phase](../reports/screening/next-five-hardening-2026-09-10.md)
completed the corrections and coverage work identified here. The original review
below remains a record of the findings before those changes.

September 10, 2026. **Proceed to comprehensive evaluation hardening, with a small Route disclosure cleanup. Another broad task redesign is not justified by this review.** The five successors implement the intended changes. Their actual model difficulty remains unmeasured; neither optimality nor future reward-zero rates follow from oracle passes.

Two targeted probes establish concrete work for that phase: Calendar incorrectly rejects a legal recovery strategy, and Workflow's current checker bank accepts a validator that misses an existing temporal requirement. These are local diagnostic findings, not model trial results or changes to historical finalist accounting.

## What was independently checked

- Read all five revised public contracts and checker interfaces, private service authorities, reference services/checkers, generators, and relevant application and export code.
- Ran `node scripts/verify-next-five-evidence.mjs`: **307 hashes and 63 local links verified**, all five task records consistent. The source/evidence identities match the [implementation manifest](../reports/screening/evidence/2026-09-10-next-five-successors.json).
- Inspected the retained native grading implementation and Workflow's actual native checker input bank. Existing recorded oracle/nop, static, integrity and regression results remain valid evidence for the checks that ran; this review did not repeat the full Docker suite.
- Ran targeted local authority/checker probes in a separate directory, preserving package sources and exports. These execute trusted authored code through the package adapter. They are not protected Docker executions or fresh-process isolation tests; protected reproduction belongs in the next phase.
- No provider trials, paid calls, historical regrades, package changes, commits or pushes.

The applicable [TB implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml) supports concise requirements without solution hints and outcome-based verification. The recommendations below preserve custom semantics, legitimate alternatives and the existing rules. They add no requirement that both the service and submitted checker must fail.

## Task-design decisions

| Task | Verified improvement | Decision and audit priority |
| --- | --- | --- |
| Route policy | A real source-to-flat-policy translation is required; source graph copying alone is no longer a valid deployment. The verifier performs finite equivalence-region checks in addition to sampled routes. | Keep this design. Remove the worked translation-hazard tutorial. Audit equivalence completeness, representation limits, unknown-community preservation, legal failed-publication recovery and adversarial checker workloads. |
| Browser replay | The public application and bridge expose actual DOM/session/operation behavior. Identity, navigation, remounts and delayed receipts are implemented. The old mandatory observe-after-fill sequence is gone. | Keep this design. Audit HTTP/DOM boundaries, accepted versus rejected actions, operation/dialog identity, report timing and legal idempotent recovery. The accessible application is legitimate task context. |
| Recurring calendar | Versioned source merging, tombstones, publication windows, persistent events/bookings and atomic generations are implemented. | Keep the design, but fix the reproduced acknowledgement-history defect before trials. Audit each published generation and recovery strategy, not merely final rows. |
| Workflow authority | Admission, fenced external dispatch and delivery completion are separate. Superseded admissions remain in the evidence, and policy facts are available at both boundaries. | Keep the design. Add checker cases that distinguish invalid superseded admissions from valid replacement/recovery. Also cover alternative authority paths and terminal history. |
| Delegated budget | Reservations and settlement now use raw ledgers, wallet-scoped identities, lifetime allowance, historical settlement rights and revision fences. | Keep the design. Audit independent accounting reconstructions, ordered decisions, cross-wallet identity, historical grants, uncertain captures and delayed releases. No new defect was established here by this limited review. |

Short reference implementations are still possible, particularly for Workflow and Budget. This does not make their required-checker challenge invalid or prove that models will solve it. It does mean service difficulty should not be inferred from additional API names or scenario counts. The next useful evidence is rigorous coverage followed by actual trials.

## Finding 1: Calendar rejects legal republishing after a lost acknowledgement

The [public contract](../tasks/recurring-calendar-repair/public/SEMANTICS.md) permits correct repeated publications, acknowledgement-response loss, redelivery with persistent state, and any recovery strategy. A service can therefore recompute and publish the same correct materialization on redelivery.

The probe starts with the existing first scenario's initial delivery. It changes the interruption boundary to the first completed `ack`, which is a documented boundary. A copy of the private reference removes only its optimization that skips publication when source revisions are unchanged.

Execution:

1. Publish correct generation 1 and acknowledge it; the response is lost.
2. On redelivery, read the retained source, recompute and publish correct generation 2.
3. Acknowledge generation 2. The API returns `{stored:true}`.

The [authority](../tasks/recurring-calendar-repair/private/domain.mjs) stores an acknowledgement only if that delivery ID has never been acknowledged. Its final completion check nevertheless requires an acknowledgement for the latest generation. The second successful acknowledgement is absent from its summary, so completion fails. The [reference checker](../tasks/recurring-calendar-repair/private/reference/checker.mjs) also rejects the resulting trace.

| Probe | Content/source checks | Completion | Reference checker |
| --- | --- | --- | --- |
| Unmodified reference with lost acknowledgement | All pass | Pass | Accept |
| Always republish, without interruption | All pass | Pass | Accept |
| Always republish, with lost acknowledgement | All pass | **Fail** | **Reject** |

The final row has successful publications `[1,2]` and two successful acknowledgement responses, but the stored acknowledgement list contains only generation 1.

**Required repair:** reconcile the authority's acknowledgement representation with its accepted operations and completion semantics. Update the checker consistently. Preserve correct repeated publication and recovery rather than adding a restriction to prohibit this strategy. Add this positive recovery case alongside controls for missing/wrong acknowledgements and inconsistent publications. The existing generator exercises lost publication responses but does not schedule lost acknowledgements.

## Finding 2: Workflow's checker bank misses invalid superseded admissions

The [public rule](../tasks/workflow-authority-repair/public/SEMANTICS.md) requires authority at every accepted authorized admission. A later replacement cannot make an earlier invalid admission valid. The current authority and reference checker correctly enforce this.

The probe makes a copy of the reference checker and changes one loop: it validates admissions only when their authorization ID appears in a terminal decision. It retains the other checks, including final denials, executed effects, payloads and delivery completion.

**That defective checker correctly classifies all 10 cases in the retained native checker bank.** It therefore passes that checker classification bank despite omitting the superseded-admission requirement.

A second probe wraps the reference service to submit one shape-valid authorized admission with an invalid empty path, then runs the normal service. The invalid admission is subsequently replaced. The final decisions, effects, payloads and delivery associations are correct.

| Probe | Authority | Reference checker | Terminal-admissions-only checker |
| --- | --- | --- | --- |
| Normal reference | Pass | Accept | Accept |
| Invalid admission followed by correct reconciliation | Reject: `policy_at_effect` | Reject | **Accept** |

This demonstrates a missing checker classification case, not a private service-grader false pass. The normal service grader already detects the invalid admission. Add the produced execution as a negative checker candidate and retain a corresponding valid superseded-admission/recovery positive candidate. No public rule change is needed.

An initial broader probe removed all admission-loop checks and scored 9/10 because it also lost other validation. That diagnostic was retained separately. The final probe isolates the superseded-admission omission and scores 10/10; neither probe is a model attempt.

## Finding 3: Route's public tutorial reveals the intended mistakes

The [public specification](../tasks/route-policy-repair/public/SEMANTICS.md) contains an `Examples of translation hazards` section. It explains mutation-dependent matches, nested-return mutation preservation, and original-input scope after mutation. These are the mechanisms several private negative controls exercise.

Remove that worked section from the agent-visible contract, or move it into private author documentation. Retain the earlier formal source and target semantics: they already specify current versus original input, call/return behavior, mutation order and scope. Keep the public target evaluator and schemas; they define the custom deployment format rather than implementing the migration.

This is a disclosure edit, not a reason to redesign Route again. Rebuild affected exports and record new digests afterward.

## Recommended next phase

1. Make the Route disclosure cleanup and repair Calendar's acknowledgement semantics/representation.
2. Map existing public obligations to service-grader checks and submitted-checker candidate coverage for every task. Distinguish host-enforced invariants from decisions the submitted program can get wrong.
3. Expand meaningful executable candidates: single-rule violations, violations repaired before the end, valid intermediate states, alternative orderings and correct recovery. A negative candidate that violates several rules can conceal missing coverage of any one of them.
4. Mutate the private reference checkers as an audit technique. Confirm that omitting each important obligation causes a checker-bank failure. Likewise test over-strict validators that reject legal alternatives. Mutation results are diagnostic evidence, not additional benchmark qualification rules.
5. Audit the private execution boundary and cheat paths: input/output trust, actual-effect provenance, reward writes, private-file access, subprocess survival, shared files and browser connectivity. Use local deterministic probes first; paid `/cheat` or standard model runs require their own trial authorization.
6. Reproduce changed behaviors under protected execution, rerun affected oracle/nop and integrity checks, verify export identities, then freeze the audited versions for model trials.

Stop task-feature expansion during this phase unless a reproduced problem reveals a missing/contradictory public contract or an actual solvability issue. Additional coverage of an existing rule should remain coverage work.

## Diagnostic artifacts

Local artifact root: `.local/next-five-independent-review-2026-09-10/`.

- `calendar-ack-probe.mjs`, `calendar-ack-results.json`, and the three complete Calendar cell JSON files.
- `workflow-admission-probe.mjs`, `workflow-admission-results.json`, `workflow-admission-initial-probe.json`, and valid/invalid Workflow cell JSON files.
- Separate copied reference/authority directories used by the probes; maintained package files were not changed.

Reproduction commands from the repository root:

```sh
node scripts/verify-next-five-evidence.mjs
node .local/next-five-independent-review-2026-09-10/calendar-ack-probe.mjs
node .local/next-five-independent-review-2026-09-10/workflow-admission-probe.mjs
```

The diagnostic directory is local evidence, not part of a cloneable public release. The concrete mutations, request sequence, expected behavior, actual behavior and affected maintained files are described above for review without those artifacts.
