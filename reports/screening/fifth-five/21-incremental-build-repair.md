# 21 — Incremental build repair

## Outcome

Codex, requested Sol / xhigh, completed in **15 minutes 31 seconds**. Its service
passed **27/27 protected scenarios** and its checker correctly classified **14/14
candidates**. The original record gives **reward 0** because two of twelve negative
candidates were rejected as `publication_scope`, while the grader requires
`current_artifacts` for those behaviors.

This is a **public reason-taxonomy alignment concern**, not a demonstrated missed
implementation defect. The rejected candidates publish missing or foreign targets.
The public prompt names publication scope but does not define it narrowly enough to
exclude target membership. Original reward zero is retained; it is not counted as a
clean capability failure or silently converted into a passing trial.

## What the task was, in plain English

An incremental build service must publish current compiler-attested artifacts across
successive requests. The entry file alone does not determine freshness: included
files, compiler identity, flags and ordered dependency aliases can all change the
required artifact. A correct-looking local byte string is insufficient—the result
must come with a genuine compiler-issued handle and current recursive provenance.

At the same time, compiling everything again can exceed the visible per-round budget.
The service must reuse legitimate existing attestations, including semantically
equivalent artifacts with different handles or harmless unused source rows. Every
round needs exactly its requested targets, including an empty publication for an
empty target set. Existing attestations are immutable.

This creates a real tension between cache reuse and complete identity/provenance.
The API is deliberately bounded: at most six actions, ten files and five rounds,
with complete public inputs and a guaranteed within-budget solution.

## What was in the package

The supplied service had include collection, cache keys, recursive building and round
orchestration. Public semantics described compiler serialization, dependency ordering,
valid cache equivalence, publication rules and compile-call accounting. A standalone
checker was a second required deliverable.

The checker received original rounds, actual publications and compile counts, and
raw compiler records including the transitive dependency attestations referenced by
the candidate. Preflight added that closure so a valid cache reuse strategy did not
need redundant inspect calls merely to make its evidence visible.

Protected grading used 27 service scenarios, two correct checker candidates and twelve
negative controls. This run used the new reason rule allowing any actually failed
public obligation, not one private control's primary label. That correction does not
solve undefined meanings of the public obligation names themselves.

## What the agent actually did

There are twelve captured shell commands. It changed `src/builder.mjs`,
`src/includes.mjs` and `src/key.mjs`, and added a standalone checker. The existing
round loop/publication code stayed unchanged.

1. It replaced lossy-key reuse with semantic validation of each cached artifact.
   A memoized recursive check compares action identity, entry, tool, flags, required
   current files and ordered dependency aliases, and verifies each referenced
   dependency is itself current for the required action.
2. It searches for a reusable target before recursively compiling dependencies.
   Different current dependency handles are allowed: a cached parent need not reference
   whichever equivalent child handle another target happened to choose.
3. It makes include collection follow the actual transitive include graph and checks
   missing sources/cycles defensively. Only required source rows go into newly built
   recipes; unrelated changes do not have to invalidate them.
4. It also repairs the old canonical recipe-key helper, but the new builder no longer
   uses that helper for its main semantic reuse decision. These are distinct changes,
   not two independent solutions to the same requirement.
5. Its checker reconstructs recursive currentness from raw attestations and current
   round inputs, verifies output membership, counts publications and checks compile
   budgets. It does not trust a supplied success flag or require newly minted handles.

The visible test and syntax checks passed. Inline simulation commands exercised five
rounds with compile counts **[2, 0, 2, 1, 1]**, varying sources, aliases, tools and
flags. Other traces tested stale artifacts, scope mistakes, budget excess and incomplete
publication. A separate retained-identity exercise reported reuse with counts [2, 0].
These are targeted self-tests, not a large randomized campaign. No new test file was
submitted. A Git-diff command failed in the non-Git workspace, then separate verification
commands succeeded; this recovered shell error is not an invalid trial execution.

## The two reason disagreements

Both `foreign-publication` and `partial-publication` were correctly rejected. The
checker classified extra/missing target membership as `publication_scope`, reserving
`current_artifacts` for a requested target whose handle was not semantically current.

The private domain implementation instead folds target-set equality into its
`current_artifacts` boolean. Its `publication_scope` boolean only checks the number,
round association and timing of publications. Therefore the original authority's
failure sets contain only `current_artifacts`, and the new any-observed-failure rule
still cannot accept the checker's alternate public interpretation.

The shared correction did make one concrete difference within this run: the duplicate-
publication control fails both completion and publication scope, and the checker names
only completion. That rejection is now correctly accepted. The two remaining failures
are a different issue—the undefined scope of the public labels—not evidence that the
private-primary-label fix was absent from execution.

The public contract defines the correct output unambiguously; the label taxonomy is
the problem. It never explains that “publication scope” excludes foreign/missing
targets. The agent detected the exact bad behavior, and every good/bad classification
was right. A future version needs explicit obligation-to-behavior mapping, or a
reason-grading design that does not depend on this undocumented partition. The
current run cannot fairly establish a target-model failure from those two labels.

## What the result teaches us

The agent went beyond replacing one cache-key expression: it implemented recursive
semantic equivalence and legitimate retained-handle reuse. That was the substantive
reasoning challenge, and the independent service bank confirmed it on this attempt.
The original implementation was nevertheless small enough for a direct contract-to-code
review, and the repair took about a quarter hour.

Keep the submitted solution as an alternative-positive regression. Future narrow
controls should distinguish identical bytes with wrong attestation provenance, harmless
unused files, ordered dependency aliases and transitive changes, without insisting on
one cache key or traversal. Increasing action count alone is not a supported hardness
mechanism. New requirements require new visible semantics and fresh bounded-solvability
validation, not retroactive reinterpretation of this submission.

The immediate lesson is also systemic: accepting multiple actual failed labels fixes
one evaluator defect, but does not prove the labels faithfully encode the public
contract. That mapping must itself be reviewed before treating reason-only zeroes as
model weaknesses.

## Evidence and limits

[Sanitized batch evidence](../evidence/2026-09-08-fifth-five.json) preserves the original
zero, service/checker counts, original observed failure sets, exact reason policy,
timing and capture hashes. Analysis reads retained submissions and original grader
outputs without rerunning the model. This is one exploratory attempt and a documented
alignment concern, not independent blind adjudication, official qualification or a
backend attestation. No private internal reasoning is analyzed.
