# Final-six preparation: two grader coverage gaps reopen two candidates

**Five packages remain in contention under the corrected grading coverage.** Incremental
build has four failures in four attempts. Variant cache, issued report and temporal
capacity have three in four; snapshot recovery has two in three. No new model calls
were made. Eleven remaining slots are prepared, with early stopping when 5/6 becomes
impossible. This is the user-reported acceptance target, with three attempts per provider.

## What the audit established

Temporal capacity's Trial 3 recorded pass was incomplete coverage: its checker accepts
a real no-work execution with zero queries and zero source records. The unchanged public
contract requires exhausting all pages and gives upper bounds without a minimum query
count. The frozen harness rejects that execution for missing completion; the real
reference service fetches the empty page and passes. The old candidate bank exercised an
empty source with a query, but never the zero-query case. Trial 5's Codex checker correctly
rejects the new negative and accepts its valid counterpart.

Snapshot recovery's Trial 3 recorded pass also missed a checker defect. A valid service
writes a temporary name to a requested account inside its transaction, replaces that name
with the correct value, then commits and publishes the exact requested restore and backup.
It writes no unrelated account and never exposes the temporary value. The unchanged
contract permits row replacement and atomic transactions; correctness is required at
publication. The frozen service grader and the private reference checker accept this
alternative. Trial 3's checker falsely rejects it as an out-of-scope write because it
requires every intermediate write to equal the final row. Trial 4's checker accepts it.

These are errors in the submitted checkers that our private candidate bank failed to
detect. Neither is evidence of intentional cheating. No new requirement, reason label,
solution approach or public hint was added. The benchmark rubric permits implicit expert
knowledge and requires reliable outcome verification; it does not require enumerating
every test or forcing a particular valid implementation approach.
[TB3 implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml).

## Regrade and provenance

The added coverage is pinned as `final-six-coverage-v1`. It supplements the existing
checker grade with one negative and one positive temporal case, and two positive snapshot
cases. The fixtures are collected from actual executions of the unchanged harness, not
invented observation streams. Candidate tokens are opaque; reason text stays diagnostic.
Both private reference checkers pass. All seven retained submissions for these two tasks
were evaluated against the same added controls, including the previously failing attempts.
The checker runs are deterministic and leave their input unchanged.

| Package | Trial | Provider | Original recorded reward | Reward after coverage repair |
| --- | --- | --- | --- | --- |
| Temporal capacity | 2 | Claude | 0 | 0 |
| Temporal capacity | 3 | Claude | 1 | **0** |
| Temporal capacity | 4 | Claude | 0 | 0 |
| Temporal capacity | 5 | Codex | 1 | 1 |
| Snapshot recovery | 2 | Codex | 0 | 0 |
| Snapshot recovery | 3 | Codex | 1 | **0** |
| Snapshot recovery | 4 | Codex | 1 | 1 |

Original completion manifests, grades, capture records and published trial evidence are
preserved. The separate regrade evidence identifies the original checker, package and
completion hashes. The effective reward is zero if the original grade is zero or the
supplemental checker evaluation fails. An infrastructure error is unscored, never zero.
This same grading revision applies to future attempts for these two packages. Comparing
all retained submissions under one revision avoids mixing old and new coverage silently.
The task export and solver-visible bytes stay unchanged; the grading identity explicitly
includes the additional policy and fixture hashes. These are corrected exploratory
results, not newly launched trials or a claim of completed benchmark qualification.

The other passes were checked against retained service/checker results and submitted code:
variant cache's Trial 5 checker rejects wildcard removal through its per-write preservation
predicate; issued report's Trial 5 checker reconstructs and checks dependency publication
order and accepts both existing positive candidates. No defect was established in those
passes. Temporal Trial 5 and snapshot Trial 4 additionally pass the new controls. This is
a targeted audit, not a proof that every possible valid case has been exhausted.

All 5,811 manifest files from the seven regraded records were verified (27,544,710 bytes),
as were all 3,631 Trial 5 manifest files (111,137,143 bytes), with zero errors. Temporal
Trial 5 occurs in both audits; these counts are not additive distinct trial counts.
[Sanitized audit and regrade evidence](evidence/2026-09-09-final-six-pass-audit.json).
Local reproduction scripts, generated traces and isolated checker outputs are retained
under `.local/final-six-pass-audit-2026-09-09/`. The reusable
[supplemental grader](../../scripts/grade-final-six-supplement.mjs) and
[pinned policy](../../data/final-six-grading-controls/policy.json) are versioned inputs.
The [reproduction script](../../scripts/reproduce-final-six-controls.mjs) regenerated
both fixtures from the unchanged harness and matched their full contents exactly.

## Remaining schedule

| Package | Effective history from Trial 2 | Current failures/scored | Provider for every remaining slot | Slots | Requirement |
| --- | --- | --- | --- | --- | --- |
| 21 Incremental build | 0 → 0 → 0 → 0 | 4/4 | Claude | 2 | Run both; at least one must fail |
| 19 Variant cache | 0 → 0 → 0 → 1 | 3/4 | Codex | 2 | Both must fail; stop after a pass |
| 25 Issued report | 0 → 0 → 0 → 1 | 3/4 | Codex | 2 | Both must fail; stop after a pass |
| 10 Temporal capacity | 0 → 0 → 0 → 1 | 3/4 | Codex | 2 | Both must fail; stop after a pass |
| 11 Snapshot recovery | 0 → 0 → 1 | 2/3 | Claude | 3 | All three must fail; stop after a pass |

Snapshot has three remaining slots because it was excluded before its first Claude run.
For the other four, the provider remains the one used in Trial 5. Every completed six-run
set ends with three Claude and three Codex attempts. Different legitimate failure
mechanisms count; identical bugs or six consecutive failures are not extra requirements.

The prepared controller uses at most three simultaneous solver attempts to avoid repeating
the observed five-container memory interruption. It completes one attempt at a time for
each package, grades it, and makes the continuation decision before launching that
package's next slot. Maximum additional calls: eleven; no retries or paid API fallback.
If all initially required calls complete, at least six calls occur (including both build
slots). A package reaching five failures at its fifth scored attempt still runs its sixth
slot to complete the provider balance. Any infrastructure interruption leaves that package
unresolved and its evidence intact. A newly demonstrated grader defect requires an explicit
regrade record before declaring a package eliminated; an unsupported suspicion does not
change a pass.

[Preparation identities](evidence/2026-09-09-final-six-preparation.json) ·
[Operator handoff](../../docs/final-six-handoff.md).

Preparation verification passed for all five exports and all eleven frozen one-slot
controllers, with no dispatch claim and zero provider calls. Publication validation
passed for 51 documents; six publication tests and four continuation/regrade tests passed.
All five original analysis histories remain exact byte prefixes of the updated files.
`git diff --check` passed. No model trials, commits or pushes were made by this work.
