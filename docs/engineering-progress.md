# Progress through evidence and engineering decisions

The goal is a portfolio of fair, useful tasks that agents genuinely fail—not a large pile of generated exercises or zero rewards caused by bad measurement. Progress includes discovering that a candidate is easy, identifying our own mistakes, and making the next decision better informed.

## September 9: six additional false passes confirmed

The post-final audit reopened all four eliminated finalists through **six reproduced
checker-coverage corrections**. Issued report and temporal capacity now each have
5 failures from 5 trials; variant cache has 4/5 and snapshot recovery 3/4. Build remains
the complete 6/6 result. All original rewards and prior reports remain preserved.

Three submitted checkers rejected valid alternate executions; another accepted account
name corruption. The frozen service verifier and private reference checker already
judge the new cases correctly. We added cumulative private checker controls and applied
them consistently across all 19 retained submissions. We changed neither the public
contract nor the service requirements and made no model calls.

[Audit, contract basis and remaining slots](../reports/screening/post-final-pass-audit-2026-09-09.md) ·
[Verified evidence](../reports/screening/evidence/2026-09-09-post-final-pass-audit.json).
The chronological milestones below describe what was known at each earlier point.

## September 9: first complete 6/6 successor result

**1 task meets the target of at least 5/6 failures: incremental-build-repair (21)
achieved 6/6 failures, with three Codex and three Claude attempts on the same package.**
All six services passed 27/27 scenarios. Each required checker missed the same
defect allowing publication before compiler issuance. All six recorded rewards are zero;
this result uses the original grader and requires no retroactive correction.

The measured progression is now visible: twenty-five optimized successors completed
Trial 2; five zero-reward candidates were repeated; one finished a balanced six-run set
with six failures. The final six attempts added two build failures and four passes.
The historical coverage audit reopened two candidates before their new passes settled
those outcomes. No result was discarded to improve the rate.

[Final results](../reports/screening/final-six-2026-09-09.md) ·
[Build analysis](../reports/screening/fifth-five/21-incremental-build-repair.md).

## Earlier September 9 milestone: three Trial 2 zero rewards

Five optimized packages have now been retrialled. **Three recorded reward 0, with
two supported substantive required-checker failures: incremental build and issued
report.** The agents completed service implementations that passed their frozen
suites, but their required validators remained wrong. Cache also failed its service
suite; its wildcard matching/replacement interpretation remains under review.

The loop is visible end to end: analyze earlier submissions, integrate contract-valid
controls, remove mostly solved starter code, validate correct alternatives, run fresh
attempts and preserve the observed failures. Changes were bundled, so the trials do
not isolate the causal effect of starter removal alone.

Issued report's documented API observations provided sufficient input facts. A
diagnostic exercised the submitted checker's own fallback and demonstrated that path.
Its choice to prefer misparsed aggregate arrays caused the original false rejections.
Build's issuance-order omission and report's input-processing error both left required
checker deliverables incorrect despite passing service suites.

The remaining cache concern is an actual difference between the published matching
predicate and the private replacement predicate, not a demand to explain every expert
inference. Its zero stays recorded while that interpretation is resolved.

The [campaign report](../reports/screening/round-two-top-five-2026-09-09.md) links all
five appended Trial 2 analyses and [audit evidence](../reports/screening/evidence/2026-09-09-round-two-top-five-audit.json).
All 4,644 manifest-listed files verified. Original grades, submissions and formal
qualification fields remain unchanged; diagnostics do not add model attempts.

## How the work has progressed

| Observation | Decision and implementation | What that earns—and does not earn |
| --- | --- | --- |
| Earlier grading could trust submitted claims or count invalid execution as failure | Independent authority collection, protected execution, positive-work controls, typed invalid outcomes and regression tests | More credible measurements; no automatic difficulty gain |
| Draft generators did not produce complete professional deliverables | Reproducible native/Node package assembly, public/private roles, references, alternatives, controls and retained recipient exports | Executable package construction, not merely a proposed family |
| Initial portfolio services were solved in roughly 6–26 minutes | Preserve submissions and inspect their actual repairs and self-checks; reconsider small separable defects | Evidence against the initial hardness hypothesis, not a reason to hide the solves |
| An author README exposed CAA's solution in a dispatch | Exclude that attempt, preserve the error, use the explicit solver instruction in a fresh retry | A clean-instruction solve, not retroactive validation of the contaminated attempt |
| Legitimate large streamed events were rejected by capture | Raise the event-line bound to 4 MiB while retaining a total byte cap; test acceptance and oversized rejection | Removes a concrete infrastructure failure from future measurements |
| Distinct historical domains had been rejected for incomplete construction or speculative ratings | Reassess source evidence, select twenty additional professional descendants, build complete contracts and local controls | A larger, more diverse construction portfolio; the fifteen unscreened candidates are still hypotheses |
| Next-five agents solved every service, often building substantial local checking | Analyze service repair and checker quality separately; retain exact package and profile identities | The required checking work is observable, but adding a checker did not make most attempts fail |
| Causal replica's checker rejected an already-correct implementation that skipped unnecessary writes | Record the exact legitimate alternative and the checker overconstraint | One concrete self-check omission, not a universal Codex weakness or replicated failure rate |
| Partial release classified every candidate correctly but used explanatory reason strings | Treat the zero as a contract/grader alignment concern; require a versioned format repair before claiming hardness | A correction to our evaluation, not a successful difficult task |
| Useful work remained in ignored snapshots | Integrate maintained source/tests, publish vetted analyses and preserve raw evidence privately | Reviewable engineering and an honest history, without exposing credentials or filling Git with archives |
| Mostly solved starters and exact reason labels weakened the experiment | Prepare twenty-five ranked successors with empty entry points, complete private oracles, diagnostic-only reasons and native exports | More work is required from the solver; local validation still does not prove hardness, and all five groups subsequently completed native checks |
| A fresh incremental-build checker accepts publication before compiler issuance | Preserve the submission and exact ordering witness; prioritize an unchanged-version repeat | One substantive new required-checker failure, not a replicated failure rate |
| Issued report's required checker rejects valid candidates despite sufficient documented observations | Replay the unchanged submission and exercise its existing observation fallback in a separate diagnostic | A supported required-checker failure; a separate latent ordering miss remains diagnostic evidence |
| Cache's first scored service failure depends on wildcard replacement | Compare the explicit public matching rule with the private predicate | One concrete unresolved contract interpretation; original zero preserved |

## What the agents' work taught us

The analyses show agents reading contracts, comparing several modules, building their own simulated authorities, planting failures and fuzzing their repairs. A large repository, long instructions, multiple obvious defects or encouragement to test is not a convincing difficulty argument by itself.

The more promising hypothesis remains an incomplete interpretation of interacting **stated** requirements: the primary work can be correct while ownership, history, scope or an independent checker remains wrong. Causal replica illustrates that possibility. But partial release shows why a plausible story is insufficient: the service and binary judgments were right, and our exact-string gate produced the zero.

The historical outbox case must be read with its [qualified evidence and corrections](../findings/README.md). Do not reuse an unqualified six-failure narrative, personality labels such as “cautious model versus reckless model,” or a predicted percentage as if they were established facts.

## Next steps after the completed screening campaign

1. Carry incremental build's unchanged 6/6 package and complete evidence into the final
   submission review and required cheat checks.
2. Keep the four stopped finalists' passing submissions and per-trial analyses available
   for future engineering decisions. No further screening slot is needed for their settled
   current sets.
3. Preserve raw grades separately from the temporal/snapshot coverage regrades. Any later
   task revision needs its own version and clearly identified evidence.

No new model attempts, package edits, commits or pushes are authorized by this document.
The [trial index](../reports/screening/README.md), [portfolio](project-status.md) and
[publication report](../reports/PORTFOLIO-PUBLICATION.md) link the detailed evidence.
