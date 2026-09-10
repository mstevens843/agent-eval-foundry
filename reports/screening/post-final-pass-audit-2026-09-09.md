# Pass audit: six additional false passes, four finalists reopened

September 9, 2026, after the final-six campaign. **Six more recorded passes are
confirmed required-checker failures under the unchanged public task contracts.**
The same cumulative controls were applied to all 19 retained attempts of the four
affected packages. Original rewards, submissions and campaign evidence remain intact.
This audit made **zero model calls**; regrading does not create or discard trials.

Incremental build remains the completed **6/6 reward-zero** result, balanced across
three Codex and three Claude attempts. Issued report and temporal capacity now each
have **five failures from five trials** and need their final Codex attempt to complete
the balanced six-run set. Cache and snapshot are also back in contention.

## Current standings

Here, `0` means the solver failed, which is the task-authoring success criterion.
Trial 1 used an older package and is outside each successor's six-run set.

| Package | Effective rewards, starting at Trial 2 | Failures/scored | Provider counts so far | Remaining slots and requirement |
| --- | --- | --- | --- | --- |
| **21 Incremental build** | **0 → 0 → 0 → 0 → 0 → 0** | **6/6** | **3 Codex + 3 Claude** | **Complete; meets the reported ≥5/6 target** |
| 25 Issued report | 0 → 0 → 0 → 0 → 0 | **5/5** | 3 Claude + 2 Codex | Trial 7, Codex; either result gives at least 5/6 |
| 10 Temporal capacity | 0 → 0 → 0 → 0 → 0 | **5/5** | 3 Claude + 2 Codex | Trial 7, Codex; either result gives at least 5/6 |
| 19 Variant cache | 0 → 0 → 0 → 0 → 1 | **4/5** | 3 Claude + 2 Codex | Trial 7, Codex; must fail |
| 11 Snapshot recovery | 0 → 0 → 1 → 0 | **3/4** | 3 Codex + 1 Claude | Trials 6 and 7, Claude; both must fail |

There is **one completed qualifying set, two additional packages already at five
failures awaiting their sixth trial, and two further contenders**. Five solver slots
remain unrun. The earlier stopping decisions were based on the grader coverage then
available; these reproduced counterexamples change those decisions.

## What our grading missed

The service verifier executes a candidate and judges its effects. The submitted
checker is a separate required deliverable: it must correctly classify other
candidates' recorded executions. Our checker grader had too few valid alternatives
and one missing invalid-data case. The frozen service verifier and private reference
checker already classify all four new controls correctly. The repair therefore adds
private coverage; it does not alter the service contract or make the task harder by
adding requirements.

| Package | Missing case | Frozen service verdict / private reference checker | Submitted checker defect | Newly corrected passes |
| --- | --- | --- | --- | --- |
| 19 Cache | Legitimately copy an origin-derived asset into the second edge cache during the first get; preserve metadata and unrelated content | Valid / accepts | Trial 5 imposes an unrequested restriction to the active edge and shield | T5 Codex: 1 → 0 |
| 25 Report | An optimistic delivery gets `{error:"version"}` without a receipt; then publish and complete the required deliveries | Valid / accepts | Both checkers reject an unsuccessful delivery call even when every required effect is correct | T5 and T6 Codex: 1 → 0 |
| 10 Capacity | Fetch the first page, restart from `null`, and exhaust the restarted traversal | Valid / accepts | Both checkers follow only the first issued cursor and miss a complete second traversal | T5 and T6 Codex: 1 → 0 |
| 11 Snapshot | Change account name `"001"` to `"1"` in both the restored database and portable backup | Invalid / rejects | Trial 5 coerces names to numbers when comparing state, accepting the corruption | T5 Claude: 1 → 0 |

Each control is a real execution through the retained frozen authority and transport,
with an independently executed reference baseline. No observation was invented,
reordered or edited to cause a verdict. Correctness flags and oracle answers were
removed before the checker received the cells. Opaque tokens carry no answer labels.

### 19 — Variant cache: an unnecessary tier restriction

The frozen contract permits a stored representation to come from an origin response
or a legitimate tier copy. Copies preserve `age` and `storedAt`; unrelated entries
must survive. It restricts a purge to its named tiers, but imposes no equivalent
active-edge-only restriction on a get's legitimate cache copies.

The control has two gets for `/asset`, first through `edge-a`, then `edge-b`.
During the first get it copies the origin-derived entry into the initially empty
second edge. Both requests receive the correct response with **one origin call**,
within the declared limit. The frozen service verifier and private reference checker
accept it. Trial 5's `allowedGetWrite()` rejects it as
`get changed unrelated tier edge-b`; Trial 6 correctly accepts it.

This does not reverse the previous wildcard-control results. Trial 5 fixed that
negative case but still rejects a valid alternative. Trial 6 survives both the old
bank and this new control. Updated history: **four failures, one pass, one slot left**.

### 25 — Issued report: a failed call is not an extra delivery

The frozen contract explicitly says that `deliver` returns `{error:"version"}`
without a receipt if the named version does not exist. There is no requirement for
an error-free call history. The semantic obligations concern issued versions,
actual deliveries, their scope, and completion within the source step.

The control attempts delivery before each new version is published, receives the
documented error, then performs normal publication and delivery. Every failed call
is checked to have returned the no-receipt error. Final publications, delivery
receipts, historical answers and dependency ordering are identical to the reference
baseline. No successful duplicate delivery occurs.

Trial 5 reports `malformed or unsuccessful deliver call`. Trial 6 reports
`an invalid delivery call was attempted`. Both reject the valid execution despite
the frozen service verifier and private reference checker accepting it. The added
positive control tests recovery from the API's stated error behavior; it does not
weaken the prohibition on duplicate successful deliveries or premature publication.
Updated history: **five failures from five trials**, with one Codex slot unrun.

### 10 — Temporal capacity: a complete restarted traversal

The frozen contract requires exhaustion of all pages and uses opaque cursors. It
does not require each page to be fetched once or require continuing the first
traversal started. The control performs these real host calls:

1. Fetch `null`: first page, with `cursor-1` returned.
2. Restart by fetching `null`: first page again, with `cursor-2` returned.
3. Fetch `cursor-2`: second page, with `next:null`.
4. Persist the correct exact integral, `"48"`, once for the requested query.

The service verifier recognizes the completed traversal. Both Codex checkers lock
onto `cursor-1`, ignore the restart, and report that pages were not exhausted. The
reference checker accepts the trace. This is distinct from the earlier zero-query
control; the cumulative bank retains that control as well.

Updated history: **five failures from five trials**. Trial 3 was corrected by the
previous audit; Trials 5 and 6 are corrected by this audit. None is removed from
the denominator. The final Codex slot remains unrun.

### 11 — Snapshot recovery: numeric-looking names are still exact strings

The snapshot contract requires the database and portable backup to represent
exactly the requested recovery point. It defines IDs and amounts as integers;
account names are string data. The new checkpoint contains account name `"001"`.
The deliberately incorrect control restores `"1"` instead, in both artifacts.

The frozen verifier fails `restored_rows`, `portable_backup`, and `publication`.
The private reference checker and Trial 4 Codex checker reject it. Trial 5 Claude's
`recovery.mjs` calls `sameScalar()` for every row field, including `name`. That helper
converts both strings to the number 1, so its checker accepts the corrupted result.

The actual Trial 5 service preserves the name when replayed on the same scenario.
The demonstrated failure is in its required checker. The earlier valid temporary
write control is retained; requiring every intermediate write to equal the final
row would reintroduce the old grading mistake. Updated history: **three failures
and one pass from four trials**, with two Claude slots remaining.

## Coverage repair and verification

Revision [`post-final-coverage-v2`](../../data/post-final-grading-controls/policy.json)
extends the previous immutable `final-six-coverage-v1` controls. The effective reward
is the minimum of the original reward and the cumulative supplemental result.
The same controls apply to every retained and future attempt of the affected
immutable package. Reasons remain diagnostic only. Verdicts must have the required
tokens and booleans, be deterministic, and leave input untouched.

- **19 retained submissions regraded**, including all existing failures; six additional
  recorded passes become effective failures. The two earlier corrections remain.
- **Four private reference checkers passed** all cumulative controls, 12/12 classifications.
- **Eight passing services replayed** on the new scenario for their task; all eight
  passed. This audit establishes checker defects, not new bugs in those services.
- **16,573 manifest-listed files, 397,545,099 bytes**, verified before and after the
  audit with zero drift across all 19 original records.
- Portable publication checks passed for **53 documents**; **11 focused regression
  tests** and `git diff --check` passed. The four original trial-analysis histories
  were also checked byte-for-byte against their committed prefixes.
- Checker execution uses network-disabled, read-only Docker with no host repository,
  provider credentials or private expected labels mounted. Both calls share the
  documented 60-second checker budget. Service controls use the frozen authority's
  existing process isolation. No privilege boundary or cheat-control bypass was
  needed to demonstrate these semantic errors.

The repaired coverage consists of the
[source controls and scenarios](../../data/post-final-grading-controls/sources/),
[pinned input fixtures and policy](../../data/post-final-grading-controls/policy.json),
[cumulative grader](../../scripts/grade-post-final-supplement.mjs), and
[reproduction script](../../scripts/reproduce-post-final-pass-audit.mjs).
The frozen package exports, public instructions, service verifier and original
checker banks remain byte-identical. Future trials must apply the cumulative grader
in addition to the original package grade; the old controller alone does not know
about this new revision.

To reproduce locally, with the retained exports/records and Docker available:

```sh
node scripts/reproduce-post-final-pass-audit.mjs
```

This creates a new local audit directory, verifies the pinned fixtures, recreates
genuine traces, regrades all retained submissions, checks the four oracles, replays
the eight services, and verifies original manifests again. It has no model-provider
execution path. Raw audit output is under `.local/post-final-pass-audit-2026-09-09/`.

## Evidence and accounting

[Sanitized audit evidence](evidence/2026-09-09-post-final-pass-audit.json) records
per-trial original, previous effective and current effective rewards, provider,
package/public-contract/source hashes, control classifications and manifest checks.
The [final-six campaign evidence](evidence/2026-09-09-final-six.json) and
[first pass-audit evidence](evidence/2026-09-09-final-six-pass-audit.json) remain
unchanged historical records.

Across all 25 successors there are still **46 attempts, 45 scored, and one historical
infrastructure interruption**. Original grades remain **15 zero rewards and 30 passes**.
The two earlier corrections plus these six give **23 effective failures and 22 passes**.
Local replays and regrades add no model attempts. The eight grade corrections fix
measurement coverage under existing contracts; they are not eight newly observed
reward-zero model runs.

Updated original analysis files:
[19 — Cache](fourth-five/19-variant-cache-repair.md),
[25 — Report](fifth-five/25-issued-report-repair.md),
[10 — Capacity](next-five/10-temporal-capacity-repair.md), and
[11 — Snapshot](third-five/11-snapshot-recovery-repair.md).
These findings reopen the four packages. The two remaining passes survived the new
controls; that bounded audit does not prove their checkers correct on every possible
input. No new trials, commits or pushes were made.
