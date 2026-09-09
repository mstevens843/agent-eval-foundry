# Second-trial priorities across all 25 packages

Reviewed September 9, 2026. Recommendation: prepare **19, 21, 25, 24, 07**, in that order. **14 is the first reserve.** The first three are the strongest bets; the remaining two are exploratory. This is an evidence-based spending priority, not an estimated failure probability.

All 25 individual trial analyses were reviewed, including their post-trial addenda. The review also compared maintained task files with local successor sources, inspected selected contracts, controls and grading code, and consulted the Klavis assignment preserved in the outbox repository and the current TB3 rubrics. No model trials, diagnostic regrades, package edits, or historical outcome changes were performed.

The [source audit](evidence/2026-09-09-second-trial-source-audit.json) records all 25 report hashes, original result summaries, local source locations, control counts and individual changed-file hashes. It is a source comparison, not fresh execution assurance.

**What counts as promising**

The user's target is a completed attempt that produces an incorrect required deliverable and receives reward zero under the applicable benchmark rules. This ranking includes errors in a required standalone checker, but identifies those explicitly. All five shortlisted packages currently have their strongest observed signal in that checker. The outbox's failed checks instead concerned the repaired service; its agents' self-tests were evidence about their development process, not a separately graded second deliverable.

A service-only ranking would therefore need different evidence. None of these 25 original service submissions failed its frozen service suite. There were 19 overall reward-one results and six reward-zero results. Of the zeroes, causal replica misclassified a correct alternative; partial release, analytics, calendar, workflow and incremental build had reason-only disagreements. The latter cases differ: workflow directly contradicted a public label instruction, whereas calendar/build involved debatable label scopes. They should not be collapsed into one automatic rejection category or counted as equivalent to missed behavior.

The ranking gives greatest weight to:

1. An error surviving in the saved final submission, with a concrete witness grounded in the available contract.
2. A new control that isolates that error while correct alternatives still pass.
3. Evidence the agent's own checking missed the interaction, rather than merely encountering and fixing it during development.
4. A meaningful product obligation and a practical path to testing the current version.
5. Authoring effort as supporting evidence, with elapsed time used only as a weak tie-breaker.

There is one original screening attempt per package and no second-trial evidence. A diagnostic replay of old code does not show how a fresh agent will respond to revised instructions. New examples selected using that code are development evidence, not untouched holdout results.

**The benchmark boundary we are using**

The [current TB3 implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml) permits expert prerequisite knowledge and concise instructions without solution steps; individual checks need not be enumerated. It also requires test assertions to follow the stated requirements and structured output schemas to be documented. The [proposal rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-proposal.md) explicitly allows discovering the environment and architecture, while requiring a well-specified objective. These sources were checked September 9, 2026; the saved [Klavis assignment](https://docs.google.com/document/d/1DAAGNM4BZnSLX-FuGmsB4qarO__nm1i4FcKwu9dsKrM/edit) directs the author to follow TB3 documentation.

Our interpretation: deriving consequences and resolving discoverable uncertainty can be legitimate difficulty. A failure is not invalid merely because the relevant consequence was not repeated verbatim in the prompt. Conversely, an exact private reason-code preference is not justified merely because the grader enforces it. The outbox's six recorded zeroes remain real observations with a disputed interpretation of five audit failures; neither the original author review nor the later automated Foundry review is itself a Klavis acceptance decision.

**Top five and readiness**

| Priority | Package | First-trial time | Strongest evidence after the sweep | Decision before second trial |
| --- | --- | --- | --- | --- |
| 1 | [19 — Variant cache](fourth-five/19-variant-cache-repair.md) | 29m 06s | Nine misses remained in the agent's final self-fuzz output. Follow-up reports two isolated false negatives: wildcard eviction and intermediate storage damage later repaired. | Prepare first. Integrate the two controls and the documented label mapping, then validate the exact dispatch package. No broad redesign recommended. |
| 2 | [21 — Incremental build](fifth-five/21-incremental-build-repair.md) | 15m 31s | The saved checker reportedly accepts publication using a compiler handle that is only issued later. This is distinct from its original label-only zero. | Prepare second. Integrate the scope correction, preserved raw inputs/dependency closure and premature-publication control; validate the actual dispatch artifact. |
| 3 | [25 — Issued report](fifth-five/25-issued-report-repair.md) | 25m 57s | The saved checker reportedly accepts correct final report sets published in reverse dependency order; diagnostic result is 13/14 correct. | Prepare third after a concrete interface repair: expose the newly graded `dependency_order` reason code. Validate order-sensitive rejection and alternative legal ordering. |
| 4 | [24 — Diagnostic transport](fifth-five/24-diagnostic-transport-repair.md) | 12m 43s | Follow-up reports exactly four new controls missed, with no positive-candidate rejection: three missing-field normalization errors and an empty-request input-drain error. | Exploratory rerun after source integration and exact-artifact assurance. Keep its lower priority: much of the new signal concerns output schema, which is a weaker difficulty story than temporal validity. |
| 5 | [07 — Causal replica](next-five/07-causal-replica-repair.md) | 11m 21s | Original checker rejects a valid alternative that skips redundant writes and leaves missing-empty documents absent. Diagnostic replay remains 10/11. | Repair the successor's contradictory deletion-clock wording and stale checker-input description first. Preserve alternative-correct controls; do not add another large hardening sweep. |

These are **candidates to prepare for trial**, not five currently certified dispatch artifacts. Local build/validation successes reported by earlier sessions are useful evidence, but do not validate a newly assembled root build.

**Why 19 leads**

This has the clearest combination of an unresolved self-check discrepancy, a substantive external-storage obligation and narrow follow-up controls. The agent's extensive checking did not eliminate all its own reported misses. A transient deletion of unrelated stored entries remains a real storage mutation even when the final contents are restored. Checking that history does not prescribe which local algorithm the solver must use.

The wildcard interpretation deserves its own explanation: the public contract requires preserving entries unrelated to the current request, and a wildcard entry never matches for reuse. The follow-up connects those statements to the retention obligation. This is a derivation from the contract, not a reason to automatically reject the candidate as ambiguous. The intermediate-wipe witness supplies a separate, more direct preservation example.

The two controls exist in the local fourth-batch tree; neither exists in the maintained root task. The follow-up report documents their reproduction against the saved checker. This review inspected their code and contract, but did not rerun them.

**Why 21 and 25 follow**

Both expose a useful distinction: correct final data does not establish that the data was valid when published.

For 21, the new control predicts a future compiler handle, publishes it, and then performs the compile. Final ledger inspection can make the output appear valid even though the attestation did not exist at publication time. The visible contract permits only compiler-issued handles. The recorded follow-up says the old checker misses this control while accepting both correct implementations. That is the reason to rerun it, rather than its original target-membership label disagreement.

For 25, the new control calculates correct payloads but publishes a dependent version before publishing its source version. The contract requires reconciliation in dependency order and defines report inputs through their current publication versions. The new verifier observes history incrementally. The old checker reportedly accepts the final correct sets without detecting the invalid publication sequence.

However, the current local `issued-report-repair/public/instruction.md` lists five exact rejection codes and says to use those strings; `dependency_order` is absent, while the private scenario and control definitions now require it. Correct that mismatch before another trial. Adding the code to the interface vocabulary does not require supplying an algorithm or naming the planted control.

For both packages, vary legitimate caching or independent report ordering among positive candidates. A correct alternative must not be rejected merely for using a different execution strategy. The reported old-checker misses are encouraging but do not establish a fresh-agent failure rate.

**Why 24 and 07 are weaker bets**

Transport's four controls are not four independent failure mechanisms. Three exploit the checker's normalization of an omitted property into an explicit empty/null value; the fourth skips draining input when the requested population is empty. The declared result shape and exhaustion obligation support testing these behaviors. But a task whose difficulty mainly becomes missing-key detection is less compelling professionally than the top three. Reproducing the failure would still need an honest explanation of that scope, rather than claiming the agent could not reassemble fragmented transport.

Causal replica supplies the only original good/bad misclassification among the 20 checker-required packages. Its implementation strategy became an overstrict requirement for other implementations. That is substantively different from a label spelling disagreement. However, the subsequent instruction now directly warns against requiring redundant writes, which may substantially reduce the chance of repetition.

There is also a new, concrete problem in the local clarification: it describes an all-deleted document as having empty context/values and says it is not an unwritten document. An all-deleted document can retain a nonzero observation clock. The earlier paragraph and `domain.mjs` both require the componentwise maximum clock, including sites with no surviving values; truly missing documents mean an empty clock and empty values. Remove this contradictory gloss while retaining the outcome requirement. The local checker instructions also still claim the converged expected result is supplied, whereas grading strips the answer key. Carry forward an accurate input contract from the maintained interface documentation.

**The full priority order**

Positions below the shortlist are less certain and primarily guide where to investigate next. They do not imply measurable differences in solve probability. Times are from the individual reports; first-batch times cover dispatch through grading, while later batches report authoring duration.

| Rank | Candidate | First-trial time | Why it sits here |
| --- | --- | --- | --- |
| 1 | [19 — Variant cache](fourth-five/19-variant-cache-repair.md) | 29m 06s | Persistent self-check misses and two documented isolated follow-up witnesses. |
| 2 | [21 — Incremental build](fifth-five/21-incremental-build-repair.md) | 15m 31s | New temporal-attestation checker miss; currentness plus legitimate reuse is a meaningful interaction. |
| 3 | [25 — Issued report](fifth-five/25-issued-report-repair.md) | 25m 57s | New temporal-publication checker miss; repair the missing public code before trial. |
| 4 | [24 — Diagnostic transport](fifth-five/24-diagnostic-transport-repair.md) | 12m 43s | Four documented new checker misses, but mostly schema normalization rather than transport reasoning. |
| 5 | [07 — Causal replica](next-five/07-causal-replica-repair.md) | 11m 21s | Original valid-alternative rejection; clarification may directly remove the cause. |
| 6 | [14 — Route policy](third-five/14-route-policy-repair.md) | 45m 15s | Strongest observed effort. Its sampled-route checker initially missed 60 violations, but the agent strengthened it before submission. First reserve; test for a surviving witness locally before spending. |
| 7 | [03 — Browser replay](original-five/03-browser-replay-repair.md) | 25m 35s | Real browser interactions and self-discovered bugs. Crash successor exists, but its saved winner reportedly still passes. |
| 8 | [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | 27m 16s | Considerable timezone/identity testing; all classifications correct. Label dispute remains distinct from a missed behavior; subsequent clarification supplies no demonstrated new miss. |
| 9 | [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | 18m 13s | Strong authority/history interaction, but the agent handled it. Recorded zero directly conflicted with a public reason instruction; diagnostic correction passes. |
| 10 | [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | 11m 59s | Real crash successor and a narrow ablation witness; the actual saved winner retains the necessary reconciliation and reportedly passes. |
| 11 | [13 — Capacity maintenance](third-five/13-capacity-maintenance-repair.md) | 24m 26s | Intermediate safety plus restoration is substantive. Agent solved the small finite search and checked it through a second representation; 138 service scenarios passed. |
| 12 | [08 — Partial release](next-five/08-partial-release-repair.md) | 20m 25s | Graph repair under uncertainty elicited substantial testing. Its recorded zero was explanatory-prefix formatting; unchanged checker passes the corrected diagnostic. |
| 13 | [15 — Rule index](third-five/15-rule-index-repair.md) | 15m 12s | A dedicated no-memo control now exists locally. No documented surviving miss in the saved checker; the agent itself tested excessive-work mutations. |
| 14 | [12 — Verified installation](third-five/12-verified-installation-repair.md) | 16m 27s | Real artifact verification is useful, but the original central repair was a two-pass layer merge. Local contract/reference changes need independent alignment review. |
| 15 | [11 — Snapshot recovery](third-five/11-snapshot-recovery-repair.md) | 14m 27s | Multiple real artifacts, but complete authoritative logs and concentrated folding defects enabled a clean solve and checker. |
| 16 | [09 — Ticket consolidation](next-five/09-ticket-consolidation-repair.md) | 14m 07s | Identity, partial results and concurrent edits were handled. Crash extension was investigated but not implemented in the documented sweep. |
| 17 | [06 — Partition index](next-five/06-partition-index-repair.md) | 18m 48s | Original clean solve concentrated in two modules. Later diagnostic drift rejects both correct candidates; that needs diagnosis, not a difficulty claim. |
| 18 | [05 — Compatible rollout](original-five/05-compatible-rollout-repair.md) | 7m 21s | Local crash/cleanup changes and ablation controls exist; the first-batch follow-up reports no winning submission defeated by the crash additions. |
| 19 | [16 — Document export](fourth-five/16-document-export-repair.md) | 15m 30s | Two compact semantic fixes, good alternative serialization handling, and no demonstrated residual error. |
| 20 | [17 — Analytical reconciliation](fourth-five/17-analytical-reconciliation-repair.md) | 18m 28s | Latest-revision selection and round-once arithmetic solved. All original diagnoses named actual violations; corrected grading passes. |
| 21 | [23 — Staged allocation](fifth-five/23-staged-allocation-repair.md) | 18m 11s | Fifteen-line recursive policy reused a correct local-option generator. Agent explicitly tested an unrealized broken future promise. No demonstrated surviving miss. |
| 22 | [02 — Persistent knowledge](original-five/02-persistent-knowledge-repair.md) | 6m 10s | Straightforward contract-to-code repair; saved solution reportedly already survives the added crash scenarios. |
| 23 | [10 — Temporal capacity](next-five/10-temporal-capacity-repair.md) | 11m 27s | Clean exact-arithmetic/revision solve and unchanged passing diagnostic; little new difficulty evidence. |
| 24 | [01 — CAA](original-five/01-caa-revalidation-repair.md) | 13m 04s | Clean retry solved the concentrated identifier/response association defect. Proposed crash mechanism was investigated and not applied. |
| 25 | [22 — Event window](fifth-five/22-event-window-repair.md) | 7m 41s | Minimum frontier, idle/end distinction and compound identity were compact fixes. Later repair restored missing input exposure; no new behavioral miss. |

**Elapsed time and other useful signals**

Route policy's 45 minutes included extensive checker construction and self-testing; it was not 45 minutes of unsuccessfully repairing the service. Its agent found a legitimate structural simplification and repaired its sampled-route blind spot. That makes it a stronger exploration candidate than a seven-minute local repair, but weaker direct failure evidence than cache's unresolved misses.

For second trials, retain authoring time separately from setup, grading and retries. More informative measurements are: the exact final defect; whether it was present after the last self-test; whether the agent tested that obligation; whether its tests accepted a known-wrong near-correct implementation; what failed before being repaired; and the size of the actual semantic repair relative to the already-correct starter. Self-generated fuzz counts and hidden scenario counts are different denominators. Tool count, tokens and wall time are effort proxies, not failure probabilities.

**Which component matters most**

| Component | Role in these packages | What improving it buys |
| --- | --- | --- |
| Public prompt and contract | Define the objective, available authority, deliverables and product guarantees. | Leave reasoning and implementation to the agent while making success defensible. Avoid giving a bug list or solution recipe. |
| Task implementation and scenarios | Create the actual work and exercise interactions. | This is where a substantive difficulty hypothesis is built and tested. More seeds alone do not make the repair harder. |
| Independent verifier | Evaluates the submitted program's actual behavior and artifacts against obligations. | Finds real errors and accepts legitimate alternatives. History can be part of the external behavior being checked. |
| Grader | Orchestrates checks and converts their results into reward. | Correct scoring, including the service/checker conjunction and reason-code handling. In casual usage, verifier and grader sometimes name the same overall system; here the distinction is useful. |
| Agent-authored checker | A separate required deliverable in packages 06–25; independently classifies candidate traces. | Exposes incomplete or overstrict verification logic, but a checker-only failure must be described as such. |
| Cheat testing | Attempts to earn reward through bypasses rather than successful work. | Tests evaluator integrity. Zero reward on a cheat attempt is different evidence from zero on a standard repair attempt. |

The decisive combination is a meaningful interacting obligation, a near-correct error that actually survives, and an independent verifier that observes it. Strengthening the grader alone cannot make an otherwise correct repair become a substantive service failure.

**Source integration is the immediate practical issue**

The root commit at review was `4ad3f04`. Its latest change published analysis addenda and ledger updates, but the compared root task files do not include several corresponding local controls. This is an implementation-location issue, not evidence that the documented local work never happened.

| Package | Root negative controls | Local negative controls | Concrete missing/current difference |
| --- | ---: | ---: | --- |
| 19 | 11 | 13 | Root lacks `wildcard-eviction` and `intermediate-wipe`. |
| 21 | 12 | 13 | Root lacks `premature-publication` and the local target-scope check split. |
| 25 | 11 | 12 | Root lacks `reverse-dependency-order` and the new verifier obligation; local public vocabulary remains incomplete. |
| 24 | 11 | 15 | Root lacks the four new controls and local publish-after-exhaustion enforcement. |
| 07 | 9 | 9 | Local public wording differs and needs the correction described above. |

Counts exclude reference and alternative candidates. The maintained root also contains useful `CHECKER-INPUT.md` interface documentation absent from several local development trees. Do not replace an entire task tree blindly with a local copy: reconcile intended semantic/control changes while retaining accurate interfaces and protected collection. Shared runtime and grader changes also need to belong to the frozen assembly; the per-task file audit is not a full runtime equivalence audit.

One additional reason to avoid blanket copying: staged allocation's original report explicitly accepts stopping at a fully disclosed leaf, while its later local addendum tightens completion to require another `next()` returning null. That change needs reconciliation with the public contract and valid alternatives before use. It is not evidence of a new failure in the original submitted solution.

**Recommended next actions**

1. Prepare 19 and 21 first by reconciling their documented changes into a reviewable source version. Preserve all original trial artifacts.
2. Correct 25's checker vocabulary and 07's contradictory gloss; carry forward accurate raw-input documentation. Keep 24's candidate bank, with its narrower difficulty claim explicit.
3. Build and validate each exact intended dispatch artifact: working reference, different correct alternative, activated narrow controls, and the protected service/checker route. Replaying the saved submission is a useful diagnostic at this step; record it separately from model trials.
4. Freeze package, solver instruction, grader/runtime and requested profile identities. A result from an older export must not stand in for this version.
5. Run one fresh second trial for 19, then 21, then 25, with the original requested model/profile where feasible for comparability. Use their results before committing to further construction. Slots 24 and 07 are lower-confidence follow-ups; 14 replaces one if its focused local audit finds a surviving substantive defect.

The user has requested analysis and prioritization, not dispatched new paid trials in this review. The eventual six-run Klavis qualification matrix is a later decision; this shortlist is exploratory screening.

**Keep the analysis documents usable across iterations**

Each package should carry a compact current-status block above its append-only trial history: exact candidate version; next-trial readiness; observed service and checker results separately; unresolved interpretation questions; and the concrete next hypothesis. Under each trial, retain original reward, failure witness, self-check observations, changes made afterward and any diagnostic replay on preserved bytes. State which changed files entered which source tree and export. This avoids a historical “not implemented” paragraph and a later “fixed locally” paragraph being mistaken for one current readiness claim.

First-batch reports are in [original-five](original-five/); second-batch reports are in [next-five](next-five/). The [screening index](README.md) links all original evidence manifests. This review supplements those records without changing their outcomes or adjudications.
