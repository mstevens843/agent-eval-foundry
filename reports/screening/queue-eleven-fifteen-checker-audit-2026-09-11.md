# Independent audit of the five successor graders — September 11, 2026

The audit reproduced **nine false-accept witnesses and three false-reject witnesses** in the supplied package sources. Eight false accepts affected both the service grader and the reference checker; the null-rollout-report case affected the reference checker alone. All reproduced issues have been corrected. It also corrected a create-receipt generation bug, a private verdict leak, and a shared flaw in both rollout solutions' crash recovery.

This work audits the September 11 successor handoff, not the earlier model submissions. It makes no claim about model difficulty, does not reclassify any historical trial, and made **zero provider calls or model trials**. No commits, pushes, or merges were made. The business tasks remain the five supplied successors; new cases and controls exercise their existing obligations.

The maintained changes are in `agent-eval-foundry-next-five-successors-2026-09-11`. The main checkout's task packages and concurrent work were left alone. Scratch execution and immutable baseline copies are under the main checkout's `.local/queue-eleven-fifteen-checker-audit-2026-09-11/`. The three new audit scripts are also available in the main checkout.

## Confirmed grading defects

| Package | Executed witness | Before the audit | Corrected behavior |
| --- | --- | --- | --- |
| Verified installation | Return without completing an earlier available release, then install a later release | Both graders accept | Every invocation needs its own completion or an actual host-recorded interruption |
| Verified installation | Wrong digest list on the earlier finish; later finish correct | Both accept | Check each finish's ordered digests, including a lost pre-commit attempt |
| Verified installation | Report an earlier available release unavailable, then correctly install a later release | Both accept | Check availability chronologically for every invocation; later source availability cannot excuse an earlier result |
| Verified installation | Initial bytes equal the requested tree, but the requested release was never activated; return without finish | Both accept | Release identity from durable status determines completed redelivery; equal bytes alone do not activate anything |
| Compatible rollout | Return null without doing any work | Service rejects; checker accepts | Only an actual interrupted fragment may omit its report, and that same job must subsequently complete |
| Compatible rollout | Stage a release, warm the stale alias, then finish the rollout correctly | Both accept | Warm requires the current healthy binding at the time of the call; later repair does not erase the bad call |
| Ticket consolidation | Finish all writes, then throw an execution error | Both accept | A host-recorded unhandled execution failure invalidates the run even when its final rows happen to be correct |
| Ticket consolidation | Finish all writes, then exceed the cumulative operation cap | Both accept | Enforce the cap independently of final row correctness |
| Partial release | Create an integer-valued payload in an absent scoped resource, then remove it | Both accept | Enforce the published string payload schema on each attempted create |
| Ticket consolidation | A selected row starts fully migrated and needs no write | Both reject | Selected rows already correct may be skipped; frozen selection is still enforced in final outcomes |
| Ticket consolidation | That already-correct row experiences a live status flip and needs no write | Both reject | Replay the external status edit even when no batch call follows it |
| Compatible rollout | Clean up a live own record without an additional stages read | Service accepts; checker rejects | Derive live records and ownership from authoritative creation events, without imposing an extra read |

The first baseline is preserved in `baseline-results-v2/`. The additional schema and cleanup witnesses are in `partial-baseline-addendum/` and `rollout-baseline-addendum/`. Each result is backed by an executed cell, not a manually fabricated final state. The rollout addendum also contains three tests exposing the supplied reference solution's recovery bug; those are implementation failures, not additional false-reject claims.

## Additional corrections

**Partial release:** a landed create updated the generation counter and then added one again when constructing its receipt. The first create could therefore yield inspect generation 1 and receipt generation 2. The receipt now reports the generation actually created. Inspect-based and receipt-based solutions remain permitted; the checker does not impose a receipt-processing procedure.

**Verified installation:** `attempts[].legal` leaked a computed private legality judgment in supposedly raw checker input. It is removed. Inputs instead expose durable entry status, staged bytes at invocation end, and actual before/after commit interruption records. Both crash boundaries now withhold the response after recording the call; the previous before-commit path incorrectly acknowledged success normally. A pre-commit unavailable result does not mark unverified staging as an installable release. The checker evaluates all attempts in chronological order, including commitments that do not land, and preserves the distinction between ordinary recoverable API errors and writes after completion.

**Compatible rollout:** both supplied solutions treated any generation more than one above job entry as another job's work. Their own rollback creates a second generation. A crash after rollback bind, warm, or cleanup caused them to report superseded incorrectly. Both implementations now record their own stage intentions before each RPC. New boundary scenarios pass for the single-pass and two-pass implementations. The checker retains each job's original entry and health history across fragments, and the authority retains that origin for resumed rollback decisions. Staging IDs cannot collide with pre-existing IDs; cleanup checks the creating job's ownership.

**Ticket consolidation:** the smaller cumulative cap is now disclosed as `view.operationBudget`; the published bound is enforced at 4000 when no smaller cap is configured. The checker sees a host process outcome and actual operation totals, not an error-message verdict. Diagnostic wording is ignored. The frozen-membership clause permits already-correct rows without requiring a write. It remains intentionally redundant with completion for a selected row silently abandoned after a status flip.

## Coverage strengthened beyond the reproduced defects

All five packages now request **all scenarios** and **opaque token coverage** in `checker-required.json`. This prevents the Foundry checker bank from silently selecting a smaller scenario window and exercises identifiers such as `__proto__`, `constructor`, empty strings and Unicode. Correctness remains independent of token meaning, case order, object property order, and diagnostic reports.

| Package | Added or isolated protections | Positive evidence |
| --- | --- | --- |
| Capacity maintenance | Readiness with availability slack; transient ineligible placement; transient active-count ceiling; ignored maintenance dependencies | Both different planners pass, including the new restricted-eligibility scenario. A readiness-only witness fails no other service check |
| Partial release | Malformed transient payload; illegal parent removal followed by full repair; missing-parent create followed by full repair; an extra scoped resource after otherwise correct reconciliation | An additional implementation repeats idempotent creates/removes and reverses parent-set order |
| Verified installation | Earlier completion, availability and commitment; release activation despite equal bytes; writes after finish | Additional implementation recovers from a rejected write; source-loss redelivery and durable staging still work |
| Compatible rollout | Null reports, transient stale warming, binding before observed health, all rollback crash boundaries, record ownership | Both supplied strategies pass; extra telemetry and cleanup without redundant discovery remain valid |
| Ticket consolidation | Completed-then-thrown execution, cumulative cap, already-correct selection, status drift without writes, transient label loss | Additional implementation repeats equivalent writes where the disclosed cap allows it; no-op completion and conflict recovery pass |

A control must expose its intended defect in the **whole graded bank**, not merely differ from the reference somewhere. The initial mutation audit found two dependency checks whose existing controls also failed unrelated final-state checks. Those controls were supplemented with repair-after-illegal-call witnesses. Further whole-bank testing exposed four masked mutation results; controls were adjusted to keep unrelated later work correct, including retaining verified content across source-loss redelivery and avoiding unrelated budget exhaustion in the transient-label-loss control.

This is why the report does not equate "the control was rejected somewhere" with "every important checker clause was tested."

## Validation

| Package | Version | Scenarios | Checker candidates | Native oracle / nop | Foundry operations |
| --- | --- | ---: | ---: | --- | ---: |
| capacity-maintenance-repair | 2.0.1 | 30 | 19/19 | 1 / 0 | 22/22 |
| partial-release-repair | 2.0.1 | 65 | 17/17 | 1 / 0 | 20/20 |
| verified-installation-repair | 2.0.1 | 55 | 20/20 | 1 / 0 | 23/23 |
| compatible-rollout-repair | 3.0.1 | 25 | 17/17 | 1 / 0 | 20/20 |
| ticket-consolidation-repair | 2.0.1 | 69 | 17/17 | 1 / 0 | 20/20 |

- **4,146 individual executed-cell comparisons:** service grader and reference checker agree, with separate explicit expected outcomes for the reproduced defects and legal variants. Each checker is run twice, checked for input mutation, and tested with reordered objects, opaque identifiers and companion cases.
- **28 checker mutations caught:** 23 missing-obligation changes and 5 overly strict changes. All are caught both by the individual-cell corpus and by the exact full candidate banks captured from Docker. This is direct evidence against recurrence of those omissions and unfair restrictions, not a proof against every possible defect.
- **40/40 native integrity checks:** missing verdicts, always accept, always reject, input mutation, mutation restored before return, mutation hidden by a replaced JSON hook, denied private reads/reward writes, and reaping detached descendants. All five package-specific isolation controls also passed.
- **105/105 Foundry assurance operations:** final reference, alternative, positive variants, negative controls, visible-workspace checks and deterministic replay pass. Every package is local-valid and trial-eligible. No trial authorization or model qualification is inferred.
- **185 JavaScript modules pass syntax checks.** The protected installation captures contain no nested computed legality flags; top-level private answers and grading verdicts remain stripped.

The in-process test harness only executes trusted author fixtures. Docker evidence establishes the process and filesystem boundaries. A finite audit cannot guarantee that no future invalid solution will ever pass, or that every possible valid solution will be accepted. No confirmed grading defect or surviving tested mutation remains in the final sources.

The updated worktree also passes `pnpm exec tsc --noEmit`, `pnpm build`, all 12
focused checker-contract tests, and `git diff --check`. Its maintained task files and
shared hardening files were hash-compared with the validated copies after application.

## Reproduction and exact artifacts

The scripts operate on the selected source root without changing the source or running a model:

```sh
node scripts/audit-queue-eleven-fifteen.mjs /absolute/path/to/source /tmp/fresh-cell-audit
node scripts/validate-queue-eleven-fifteen.mjs /absolute/path/to/source /tmp/fresh-native-audit
node scripts/mutate-queue-eleven-fifteen-checkers.mjs /absolute/path/to/source /tmp/fresh-mutation-audit /tmp/fresh-cell-audit/executed-cells.json
```

The mutation script also accepts the five native `results-oracle/checker-cases.json` files instead of `executed-cells.json`, preserving each complete candidate bank and the protected harness's labels. Docker validation requires access to the local Docker daemon and the pinned Node base image. Raw commands, outputs, source file hashes, package/export digests and evidence hashes are recorded in [the audit evidence](evidence/2026-09-11-queue-eleven-fifteen-checker-audit.json).

Artifact paths below are relative to the main checkout's `.local/queue-eleven-fifteen-checker-audit-2026-09-11/`:

| Package | Native export path | Native digest | Foundry digest |
| --- | --- | --- | --- |
| capacity-maintenance-repair | `native-final/capacity-maintenance-repair/export` | `d23541c2b3a8e5b06b5df0e3213dff25f9856517f6ec762da52ebc3e60ac95a0` | `bd118ca146e9f69ffedd2ac2f5afd6cd165b0febb015e9435239e84ac7e71c28` |
| partial-release-repair | `native-ready/partial-release-repair/export` | `cf07378feffcc0ebf9b25c35be80ab908c40dae7e1d8c820602f862911f7fe1a` | `b8de647c7b5c9c74c41a6beb2f5d15acf3fbbba9da3024facb04a3115fe4b1a8` |
| verified-installation-repair | `native-ready/verified-installation-repair/export` | `00228d3e4427f6084d5684dd2e5e14708316e9d10086a2fc9889f80132a33aa9` | `9b3afcf9d9fbee42fa4640bc7cd2495a46ab35b4d77b8998e181ee0071e4752d` |
| compatible-rollout-repair | `native-final/compatible-rollout-repair/export` | `3a5cbcb2fb4b640e88894617cf03eda05c9c465259ebc58790b53f3d3c1ff158` | `18cc80ee9e7236b4a70366e8203eb7b70fecd180d995a98447c6e9330fc76ef3` |
| ticket-consolidation-repair | `native-ready/ticket-consolidation-repair/export` | `238a8d3fee68f3fc481e18b8bb7ab4a804e0c8add2dfb1c84e31770a0a57d800` | `3814242f1c7205d1e167330edd93382b9753b4c3a6845110cd55ceb949a1815c` |

The Foundry builds used a frozen copy of the current hardened producer, with the same targeted backport applied to the successor worktree. Only the existing hardening changes were ported: checker input freezing with captured JSON built-ins, full scenario coverage, arbitrary tokens, positive native variants, and detached-descendant cleanup. No concurrent app-authoring changes from main were imported. The existing log-compression change was excluded because it is unrelated to checker integrity.

The earlier handoff exports do **not** include these fixes and should not be used as evidence for the audited versions. Historical trials and their counts remain unchanged. Human-authored review material and any future trial qualification are still separate from this completed provider-free grader audit.
