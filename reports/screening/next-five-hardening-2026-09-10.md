# Five successors hardened for exploratory trials

Route policy, Browser replay, Recurring calendar, Workflow authority and Delegated
budget now have expanded service and checker coverage, tested legal alternatives,
and frozen Foundry and native Harbor exports. This is engineering validation of
the five 3.0.0 successors. No model trials or historical regrades were performed.
The existing five successful finalists and their standings are unchanged.

| Package | Reference service | Correct checker classifications | Native integrity controls |
|---|---:|---:|---:|
| 14 — Route policy | 33/33 | 13/13 | 9/9 |
| 03 — Browser replay | 19/19 | 12/12 | 9/9 |
| 18 — Recurring calendar | 37/37 | 16/16 | 9/9 |
| 20 — Workflow authority | 36/36 | 15/15 | 9/9 |
| 04 — Delegated budget | 21/21 | 17/17 | 9/9 |

All independent alternatives and five additional complete positive variants pass.
Validation comprises **88 assurance checks, 73 checker classifications, 23 detected
checker mutations, 45 native integrity controls, 110 static checks, five native
oracle passes, five clean nop zeroes, and 36 focused regression tests**. Lint and
typecheck pass. Foundry recipient validation and native export reproduction pass.

The [obligation map](next-five-hardening-coverage-2026-09-10.md) connects public
requirements to executable service checks, checker candidates and legal recovery
cases. The [evidence manifest](evidence/2026-09-10-next-five-hardening.json) records
exact digests, source hashes, validation artifacts and results.

## What changed

**Route:** removed the worked translation-hazard tutorial while retaining the
formal source/target language and all required interfaces. New candidates break
equivalence outside sampled inputs, alter unrelated egresses or rejected-route
attributes, and publish again after success. A correct alternative deliberately
uses redundant flat rules and failed-then-corrected publication.

**Browser:** added wrong reports, reordered effects and a wrong accepted action
after otherwise correct effects. A valid candidate repeats an already committed
operation. A new scenario combines exact operation identity, noncontiguous steps
and empty values. The private evaluator now authenticates HTTP requests from its
trusted browser context, preventing direct Node HTTP calls from bypassing DOM
preconditions. Public and private application files remain byte-identical; the
public demo does not require a secret.

**Calendar:** fixed the acknowledgement bookkeeping defect identified in the
[independent review](../../docs/next-five-successor-independent-review-2026-09-10.md).
A legal republish followed by re-acknowledgement now records the latest successful
generation. The checker-input document describes that existing summary field
precisely. Added lost-ack-response and tombstone-resurrection scenarios, plus
temporary source/event/booking corruption later repaired and missing ack controls.
The complete positive variant republishes, re-acknowledges, changes attendee order
and recovers from a malformed publication. Shape guards prevent bounded malformed
requests from crashing the authority. A final probe also reproduced an unknown
record kind being stored instead of rejected. Structural validation now follows
the documented field types; the correct recovery variant requires a shape error
for that request. Calendar was re-exported and revalidated after the correction.

**Workflow:** added superseded admissions with invalid paths, origins or payloads,
and completion associated with the wrong decision. A checker that looks only at
terminal admissions now demonstrably fails the bank. Correct repeated admissions,
dispatch retries, alternate path traversal and error recovery remain accepted.

**Budget:** added reservation reuse, excess settlement, wrong owner/delegate,
incorrect rejection of valid work and wrong returned receipts. New source cases
exercise closed reservations, independently invalid ownership, historical
settlement and exact string identities. A complete alternative changes snapshot
ordering, repeats idempotent decisions and recovers from malformed requests.

In total this adds **21 negative candidates, five complete positive variants and
five scenarios**. All five checker banks now use the complete scenario population.
Native Harbor now includes the same positive variants as Foundry, closing a
previous discrepancy between the two evaluation paths.

## Finding omissions before spending on trials

The mutation audit removes or weakens real checks, then runs each resulting
checker against captured candidate executions. It also makes correct checkers
too strict by forbidding legal retries, republication or recoverable errors.

The first audit left two mutations undetected: Budget could ignore ownership
because another invalid field masked it, and Calendar had no positive trace that
actually recovered from a malformed publication. The added isolated owner case
and corrected-call variant detect both. All **23 mutations** are now detected;
all five unmodified reference checkers classify correctly. This was reproduced
using traces independently captured by the protected native Docker verifier.
The mutation replay itself is local and makes no provider calls.

The native integrity audit verifies missing/constant verdicts, input mutation,
mutation later restored, a JSON serialization hook, private-source/journal reads,
reward writes, detached checker descendants and forged output/symlink attacks.
Candidate journals become root-only after their scenario completes. Checker
inputs are frozen before submitted code is imported, and serialization helpers
are captured before that import. Remaining submitted processes are reaped before
private results are published by atomic replacement.

An initial detached-process probe was incorrectly timed: it spawned during the
first of two checker calls, so its marker could appear during the still-running
second call. The corrected probe confirms the child starts after the second
call, then tests cleanup after checker exit. The failed development record is
retained and explained in the manifest; it is not counted as a solver outcome.

Eight direct unauthenticated Browser HTTP probes receive 401, make no effects and
leave application work unadvanced. Authenticated application access succeeds.
Ordinary authoring internet access remains available.

## Frozen exports

Root: `.local/next-five-hardening-2026-09-10/`.
Use the exact exports below for subsequent exploratory trials. Prior successor
exports remain historical; do not substitute their older checker banks.

| Package | Foundry directory beneath root | Foundry package digest |
|---|---|---|
| Route | `release-four/route-policy-repair/export` | `c3ff40c39c331627595b3a5aa0a74f03d6777a26e9c34b5b27c042474fe0fd63` |
| Browser | `release-browser/browser-replay-repair/export` | `7511a91b15231268c3fe86e12e67b644805efc35e546edd83a5629eba2508ace` |
| Calendar | `release-calendar-shapes/recurring-calendar-repair/export` | `8f438cc74fc23c4357caa4c2a6ce64edd068eb899b5c335bdecd81884444fde3` |
| Workflow | `release-four/workflow-authority-repair/export` | `f7e8ebedfb12bad0fa67e7841e213d78991620e5266cc115a01f98b79bf8cdd0` |
| Budget | `release-four/delegated-budget-repair/export` | `db688724f5b932b9e0ee619e1202da3de81a636a37ef90976490702fb24c5f66` |

Native exports are `harbor-frozen-v2/<task-id>/`, with digests:

| Package | Native export digest |
|---|---|
| Route | `eabcb2c0316df591f89077e6051866ee006300dbc1e9c860fdc64975c0ea3366` |
| Browser | `1e04c8674236b4d7395cefb37e12a34c80ec228d2fe84ccebceb86b058eddfa0` |
| Calendar | `409ca52a6f5086d4e31e604d7cf5466cfe8d00641830c9c6174b40eb9fb99dc2` |
| Workflow | `09350245104dbac12c6675b328cd38a8c063854daffa720ae89c15ea7450d19b` |
| Budget | `ef15605caab0378c5f113bf6ea8fb393c88ffc892f5389050ac7b30e4e0eb772` |

The Foundry and native digests cover different packaging formats and therefore
differ. Their maintained task files and complete candidate populations match.
Native reproduction is under `harbor-reproduction-v2/`. Oracle/nop results are in
`jobs/hardened-five-final-{oracle,nop}/`, with the final Calendar reruns in
`jobs/hardened-calendar-shapes-{oracle,nop}/`; integrity records are in
`native-integrity-final/` and `native-integrity-calendar-shapes/`; checker mutation results are in `mutations-frozen/`.

Recheck the frozen records before launch:

```sh
node scripts/verify-next-five-hardening.mjs
node scripts/verify-publication.mjs
```

Use isolated campaign runtimes and fresh attempt directories when trials are
authorized. Keep the source and export identities attached to each attempt.
No new model trial was launched as part of this phase.

## Scope and remaining qualification

This phase enforces existing public obligations and tests permitted alternatives.
It does not add preferred implementation steps, graded reason labels or a
requirement to use a particular journal. Static and semantic local results do
not predict how often a frontier solver will fail.

No unresolved failure remains in the checks listed above. Finite controls cannot
prove that every possible implementation or attack is covered. Model trials can
now measure the hardened packages. Paid cheat trials, benchmark qualification
and human-authored submission material remain separate work for final submission.
The native exports still identify their human README sections as pending.

Preservation checks verified **14,002 existing files** unchanged, including earlier
exports, campaign evidence and the five successful finalists. The five original
analysis documents retain their prior contents and receive an appended engineering
section. No historical reward or finalist count changed.
