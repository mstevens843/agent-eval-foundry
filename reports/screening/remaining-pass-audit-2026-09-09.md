# Remaining-pass audit: three false passes found; three replacements prepared

September 9, 2026. **Three additional recorded passes are confirmed checker failures:
variant cache Trials 6 and 7, and snapshot recovery Trial 4.** Snapshot Trial 7 and
temporal capacity Trial 7 survived the expanded checks. This audit made no model
calls and did not replace or discard any attempt.

**User-selected disposition:** the three newly identified false passes are unscored
and will receive fresh same-provider replacements. Earlier documented regrades remain
counted. This choice supersedes counting these three new audit failures in the target.

| Package | Current counted failures / trials | Status | Remaining |
| --- | --- | --- | --- |
| 21 Incremental build | **6/6** | Complete; meets ≥5/6 | None |
| 25 Issued report | **6/6** | Complete; meets ≥5/6 | None |
| 10 Temporal capacity | **5/6** | Complete; meets ≥5/6 | None |
| 19 Variant cache | **4/4** | Pending; T6 and T7 are grading voids | Codex T8 and T9 |
| 11 Snapshot recovery | **4/5** | Pending; T4 is a grading void | Codex T8 |

Each completed set has three counted Codex and three counted Claude attempts. The
three replacement attempts are prepared to start together, cap six, but were not
launched by this audit. See the [replacement handoff](../../docs/three-replacements-handoff.md)
and [counting disposition](evidence/2026-09-09-three-replacement-disposition.json).

The diagnostic regrade matrix below shows what the unchanged saved submissions
actually do. It is retained for transparency, **not** used to count the three voids
as failures in the user's selected six-run sets.

| Package | Original reward-zero trials | Failures established by all regrades | Diagnostic failures / six original attempts |
| --- | --- | --- | --- |
| 21 Incremental build | 6 | 0 | 6/6 |
| 19 Variant cache | 3 | 3 | 6/6 |
| 25 Issued report | 3 | 3 | 6/6 |
| 10 Temporal capacity | 2 | 3 | 5/6 |
| 11 Snapshot recovery | 1 | 4 | 5/6 |

The original campaign results remain in the
[post-final-five report](post-final-five-2026-09-09.md). The new
[audit evidence](evidence/2026-09-09-remaining-pass-audit.json) records every regrade,
source identity, original reward and corrected reward. These are corrected scores
of completed attempts, not thirteen additional reward-zero model executions.

## Three passes that our grading had missed

### Cache Trials 6 and 7 — rejecting a legitimate tier copy

The frozen contract permits storing representations obtained from an origin response
or a legitimate tier copy. It requires unrelated entries to be preserved. It does
not restrict every cache copy during a get to that get's path.

The new positive control first obtains `/asset` through an ordinary get. During the
next get, for `/revalidate`, it copies that existing `/asset` entry from `edge-a` into
the empty `edge-b`, preserving every field, including age and storedAt. It then
completes the requested `/revalidate` response normally. It removes no unrelated
content, adds no origin request for the copied asset, and stays within the product
limits. These are sequential calls during an active event, not background requests.

The frozen service verifier and original private reference checker both accept the
genuine execution. Trial 6 rejects it with `get b stored an unrelated path`:
`legalGetWrite()` imposes `entry.path === event.path` on every added entry, even a
proven tier copy. Trial 7's write authorization also requires the copied entry to
match the current event, and rejects it as fabricated or evicted content.

**Both Codex attempts change from original/effective 1 to effective 0.** Their
services remain passes on the new scenarios; the defects are in the required
release validators. Under the user-selected disposition, T6/T7 are unscored; the four retained attempts are failures. Fresh Codex T8/T9 will replace them.

### Snapshot Trial 4 — requiring a database commit for an empty recovery

The recovery contract requires one successful publication whose database and backup
exactly represent the requested point. It describes the database operations without
requiring a write transaction when no database changes are needed. The database
starts empty with nextId 1.

The positive control fetches and decodes an authoritative empty checkpoint with
`accounts:[]`, `entries:[]`, and `nextId:1`. It stages the correct portable archive
and publishes the already-correct database. It does not open a transaction. The
frozen service verifier and original private reference checker both accept it.

Trial 4 Codex's `validateObservations()` nevertheless requires
`successfulCommits > 0` before publication. It rejects this valid recovery as a
publication-contract violation. **Trial 4 changes from original/effective 1 to
effective 0.** The saved submission and original grade remain unchanged.

This is the earlier passing snapshot trial the user specifically requested us to
inspect. Trial 7 Claude accepts the empty recovery and survives the other new
controls. Under the user-selected disposition, T4 is unscored and the remaining five attempts contain four failures. Fresh Codex T8 replaces T4.

## A separate defect in our own cache verifier and reference checker

The contract explicitly requires updated metadata after a `304`: preserve the body,
replace response metadata, and set storedAt to the current event time. Our frozen
service verifier and private reference checker failed to enforce that obligation.

The negative control first caches `/revalidate`, then validates it again at time 2.
The origin returns `304`. The candidate delivers the correct body but skips the
metadata writes, leaving storedAt 0 in both the edge and shield. The frozen verifier
and old reference checker incorrectly accept it. Trial 7's submitted checker also
accepts it; Trial 6 correctly rejects it.

The new private [metadata validator](../../data/remaining-pass-grading-controls/cache-metadata.mjs)
detects retained pre-validation entries from actual API observations. It is applied
as an additional service verdict during reproduction and also repairs the private
reference checker used for validating this revision's controls. Removing an old entry
is permitted; retaining it with stale validation metadata is not. Original verifier
bytes and raw traces are preserved, and the evidence explicitly records their false
pass alongside the corrected verdict.

This negative case independently establishes a Trial 7 checker defect. It is **not**
needed to count the two tier-copy false rejections above. No synthetic observation
was inserted, and no new public requirement was added.

Cache Trial 7 also rejects a valid fresh-cache response merely because an additional
origin request occurred during that get. The contract permits fresh reuse and extra
origin calls within limits; the frozen verifier and reference accept this control.
Its checker restricts delivery sources to origin-derived entries whenever any origin
call occurred. That is another false rejection, not another trial or extra failure
in the denominator.

## Passes that survived the audit

**Snapshot Trial 7 Claude remains reward 1.** It correctly classifies all **18/18**
cumulative controls, including exact numeric-looking names, empty recovery without
a commit, recovery after a rolled-back foreign-key failure, replacement of a staged
archive, immaterial archive row ordering, incorrect allocation, missing publication
and missing backup data. Its service passes all seven additional scenario replays.

**Temporal capacity Trial 7 Codex remains reward 1.** It correctly classifies all
**22/22** cumulative controls, including restarted/repeated pagination, zero-query
exhaustion, large exact integers, whole-record replacement, retractions, overlapping
keys, canonical totals, duplicate/missing reports and prototype-like query IDs. Its
service passes all nine additional scenario replays.

We found no further defect in those two passes. This is a bounded audit supported by
code inspection and concrete executions, not a proof of correctness for every
possible input. Earlier wording that a base suite pass proved a service/checker
"fully correct" was too broad. The earlier snapshot Trial 4 already rejected the
numeric-name corruption control; Trial 7 was not the first checker ever to do so.

## Consistent coverage and reproduction

Revision **remaining-pass-coverage-v3** extends the unchanged v2 and v1 policies.
Every retained Trial 2–7 submission for all four audited packages receives the same
cumulative bank for its package, including existing failures. Incremental build's
six original zero rewards are unaffected.

- **24 submissions regraded**, with exactly three additional pass-to-failure corrections.
- **19 new controls with 19 reference baselines**, all executed through the frozen
  Docker authority and real transport. Correctness fields are removed before the
  submitted checker sees a trace; verdict reasons remain diagnostic only.
- **Four private reference checkers passed 50/50 cumulative classifications** after
  the explicitly recorded cache-reference repair.
- **29 service replays** across the five previously effective passing submissions;
  all pass the original and additional applicable service checks.
- **20,836 manifest-listed files, 479,087,992 bytes**, verified before and after the
  audit with zero drift. Each original per-task analysis is extended with an audit
  section; its earlier content is preserved.
- Replacement readiness verified for all three unclaimed slots; publication checks
  passed for 57 documents, alongside 20 focused tests and one Docker integration test.

Run the complete local reproduction, with retained records and Docker available:

```sh
node scripts/reproduce-remaining-pass-audit.mjs
```

The [reproduction script](../../scripts/reproduce-remaining-pass-audit.mjs),
[cumulative checker grader](../../scripts/grade-remaining-pass-supplement.mjs), and
[pinned policy and fixtures](../../data/remaining-pass-grading-controls/policy.json)
are versioned. Old campaign runners and frozen exports still contain their historical
coverage; use this cumulative grader when reproducing the current scores.

Across all 25 successors there remain **51 attempts, 50 scored, and one historical
infrastructure interruption**. Raw grades remain **15 zero rewards and 35 passes**.
The diagnostic regrade matrix contains **28 failures and 22 passes**. After the user-selected three grading voids, the current counted record is **25 failures and 22 passes across 47 trials**; the three replacements are pending.
No new trials, commits or pushes were made by this audit.

The numerical result uses the user's reported ≥5/6 target. The Klavis assignment
does not explicitly define regrade acceptance or mandate a six-run restart after a
grading correction. We present the original and corrected evidence transparently;
these counts do not assert an official Klavis acceptance decision or completion of
the separate rubric and adversarial qualification requirements.
