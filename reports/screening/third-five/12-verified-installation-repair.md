# 12 — Verified installation repair

One Codex attempt, requested Sol / xhigh. Authoring **16m 27s**. Recorded reward **1**: service **44/44 scenarios**, checker **13/13 candidates**, comprising two correct implementations and eleven negative controls. No execution error or retry was recorded.

## What the task was, in plain English

Repair Meridian, an offline release installer. A release is an ordered set of compressed filesystem layers. Each layer is pinned by compressed size, compressed digest and uncompressed digest. Cached bytes may be stale, and the origin may be unavailable; either source is sufficient if its bytes satisfy the commitment.

The installer must apply the layers to an empty logical tree, then publish the correct actual files and permissions. Deletion markers affect lower layers, not new files from their own layer. An opaque directory clears inherited descendants while preserving the current layer's additions. If any layer has no verified copy, the active release must remain untouched.

These are bounded, explicit changeset semantics, not full OCI compatibility. The important interaction is between content identity, layer ordering and actual installed filesystem state.

## What was in the frozen package

Five service modules, one visible test, public semantics/API/checker contracts, and 44 protected service scenarios. The six graded obligations are completion, availability, contents, commitment, atomicity and legal operations. A separate authority writes and reads actual filesystem nodes and their modes. Checker grading used thirteen candidate implementations over a selected scenario subset, including a correct alternative and controls for URL-only caching, wrong deletion order, wrong permissions, missing work and origin-only availability.

The preflight supplied the checker with original descriptors, raw cache/origin bytes and the initial tree—not an expected installed tree. That matters for deciding whether a refusal was justified independently of which calls the candidate chose to make. The updated package passed fresh local assurance and protected checker-route checks before dispatch.

## What Codex actually changed

The primary defect was small and concrete: layers.mjs processed entries in array order. A later deletion marker could erase a file just added by the same layer. Codex split layer application into two passes: inherited deletions first, regular entries second.

It tightened staging by deriving every top-level namespace from listed paths, clearing those namespaces, writing parents before children, and checking acknowledged remove/write results. In tree.mjs it used own-property checks and explicit property definitions so legal names such as __proto__ and constructor remain ordinary paths rather than interacting with JavaScript's object prototype.

It did **not** rewrite content verification or installation orchestration. Those modules were already present and remained unchanged. The fact that the completed service handles corrupt caches, origin failure and digest commitments should not be reported as Codex discovering separate starter defects in all those areas.

## What its tests and checker did

There were nine completed shell-command events. The agent added three test files/updates, ending with **eight passing tests**. The recorded tests cover same-layer deletion ordering, file/directory replacement, implicit parent modes, unusual legal path names, a corrupt-cache recovery path, and preserving the active tree when neither source supplies a committed layer. One exploratory git-diff command failed in the solver workspace; it did not prevent the repair or cause a trial execution error.

The standalone checker recomputes layer availability by decompressing raw copies and verifying both digests and size, then independently assembles a logical tree using a Map. It compares actual files, modes and ordered commitment digests, checks a justified unavailable outcome, and looks for writes after completion. Decoded artifacts are memoized within the checker's work rather than repeatedly decompressed for every comparison.

Its own checker tests accepted a correct installation and a legitimate unavailable result, and rejected wrong contents, missing completion and a late write. The protected grader then accepted both positive candidates and rejected every negative candidate with the designated obligation named. Explanatory reasons worked under the repaired reason-format contract.

## Why the package was solved

This is a real artifact task, but most of the infrastructure and verification primitives already worked. The central semantic repair was a two-pass layer merge, with additional boundary handling and defensive checks. A full installer-shaped repository therefore did not imply a full installer-sized reasoning problem.

There is no observed failure to reconcile unknown outcomes: the contract deliberately has no ambiguous side effects. Nor did the agent overlook the required checker. It built one that independently reconstructed the committed result and accepted a different correct implementation.

## What to carry forward

Keep verification of actual filesystem contents and metadata, both-source availability, ordered commitments, and alternative-correct controls. Those are strong validity mechanisms even though this attempt solved the task.

Useful contract-preserving follow-ups include repeated URLs with different commitments, cache-only availability combined with layer deletions, and file-to-directory transitions across several layers. The agent already tested basic examples of these mechanisms; larger counts alone are not a persuasive new hardness argument.

Its explicit handling of JavaScript-special path names is also a useful verifier audit lead: any future scenario using those legal names must establish that the independent filesystem-to-object collector preserves them correctly too. A disagreement caused by the collector would be a package defect, not a model failure.

If a successor adds partial release updates, shared-file ownership or recovery during publication, those require genuine product obligations and a new public contract. Do not retroactively add them to this successful frozen trial.

## Evidence boundary

[Sanitized batch record](../evidence/2026-09-08-third-five.json) contains frozen identities, original service/checker results, source deltas and verified completion/result/grade hashes. [Current task source](../../../tasks/verified-installation-repair/) is not a replacement for the immutable trial package.

This report describes recorded commands, submitted artifacts and original grading. It is not private internal reasoning, an independent blind assessment, a full correct-program proof or a new diagnostic regrade. One pass provides no replicated estimate of model-family difficulty.

## 2026-09-09 — Third ranked group: engineering successor for Trial 2

**Ready for a second exploratory trial. No new model attempt was launched for this version.** Priority within the third ranked group: 4/5. Earlier sections describe historical source and results. See the [implementation report](../third-ranked-five-implementation-plan-2026-09-09.md) and [hashed validation evidence](../evidence/2026-09-09-third-ranked-five-implementation.json).

Removed the five public solution modules and completed private reference/alternative service closures. The new independent checker verifies compressed and plain commitments, availability from either raw source, layered contents, metadata, finish history and atomicity. Reason text is diagnostic only.

Integrated the local legal-filename scenario and fixes for ordinary names such as constructor and __proto__. The filesystem collector and reference tree construction now preserve these as data rather than inherited or special object properties. Kept the maintained raw initial tree, blobs and cache maps; the local successor would have removed facts needed to judge availability when a candidate never requests an available copy. The suite now has 45 scenarios.

Replaced the imprecise path-character prose with the actual segment expression and path-length bound enforced by the API, and removed repeated source-fallback instructions. The underlying both-source availability and layer ordering requirements remain. This is a collector/contract correction, not evidence that the earlier successful agent mishandled these names.

Validation passed 16 Foundry assurance checks across 45 scenarios, including the complete reference and alternative services, semantic failure of the untouched service starter, repeatability and control activation. The private checker correctly classified 13/13 candidates: two correct implementations and 11 negative controls, with zero false accepts or misses. Rebuild and fresh recipient reproduction passed.

Native validation passed all 22 static checks and six verifier integrity controls. Harbor's complete oracle returned reward 1; nop returned reward 0, with no Harbor exceptions or verifier infrastructure errors. Nop is rejected for its missing checker deliverable; the separate Foundry starter execution establishes the service's semantic failure. These are provider-free local validation jobs, not new standard/cheat model trials.

Use these exact exports:

- Foundry: `.local/third-ranked-five-implementation-2026-09-09/release-ready/verified-installation-repair/export`
- Foundry digest: `4c4610d6242251cb95f3acbe167940ce0d62fbba67d81cb97df195a3db211cfc`
- Native Harbor: `.local/third-ranked-five-implementation-2026-09-09/harbor-ready/verified-installation-repair`
- Native digest: `a94f03dc5e19463997c9052d68b0ac261989b3970e1654b3ac2edf510254b3e3`

Both deliverables are required. The checker returns complete deterministic Boolean verdicts; optional reason text does not affect grading, and submitted helper modules are available. Public requirements and custom schemas remain supplied without a worked implementation.

When Trial 2 completes, append the actual model/profile, frozen digest, service/checker outcomes, elapsed time, exclusions and final submission defect here. Keep original Trial 1 rewards intact. Local controls, old grading disputes and infrastructure errors are not additional model failures. The final hiring submission still requires its human-authored material and rubric, standard and cheat qualification on the final selected version.

## Trial 2 — implementation successor — September 9, 2026

### A. Identity and execution

Run `verified-installation-repair-attempt-1`, package digest
`4c4610d6242251cb95f3acbe167940ce0d62fbba67d81cb97df195a3db211cfc`, route
`professional-multifile/authority-process@1`. Dispatched through this session's
`real-provider` execution route (signed JobStore reservation, Ed25519, realm
`real-provider`, `billingMode: subscription-only`, `maxMicroUsd: 0`, `maxAttempts: 1`) —
a fresh campaign slot (`attempt-1`), not an infrastructure retry. Author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`. Evidence
retained at
`.local/round-two-third-ranked-five-2026-09-09/real-campaign-frozen/jobs/real-provider/records/verified-installation-repair-attempt-1/`.

Target: **codex**. Requested `openai/gpt-5.6-sol`, effort `xhigh`, CLI
`scaffoldVersion 0.153.2` (verified baked into the pinned author image). Observed
from runtime events: model, effort and scaffold version are all unobservable from
the Codex CLI's event stream — a known instrumentation limit for this CLI, not a
data quality problem.

Dispatched 2026-09-09T15:08:41.967Z as one of five reservations installed within a
231ms window (15:08:41.798Z–15:08:42.029Z); `docker ps` confirmed all five
`foundry-real-*` containers running concurrently, so this was a genuinely
concurrent five-way campaign. Completed 2026-09-09T15:26:45.713Z. Total elapsed
≈1,083,746ms (~18m4s) — solver authoring time (capture wall clock) ≈1,071,307ms
(~17m51s), grading ≈12.4s. Token usage: 528,593 input tokens (477,312 cached),
31,739 output; the Codex CLI reports no price estimate. Execution reached a clean
`completed` state with no invalid-execution or infrastructure error.

### B. What changed since Trial 1

Per the September 9 successor section above, the starter is now empty (Trial 1's
starter already supplied all five service modules and the agent only needed to
find and fix the layer-ordering bug); the scenario count grew from 44 to 45 with
an added legal-filename control; the filesystem collector and reference tree now
explicitly preserve `constructor`/`__proto__` as ordinary path segments. The
checker remains a required, independently-graded deliverable, as it was in Trial 1.

### C. Results

Reward 1 — a clean pass on both dimensions, consistent with Trial 1. Service:
all 45 expected scenarios observed with zero failures, zero missing/unexpected
IDs. Checker: `checkerRequired: true`, `checkerPassed: true`, 13/13 candidates
correctly classified (0 missed, 0 false positives). `reasonPolicy` is
diagnostic-only for this package; only the boolean verdict was graded.

### D. Observable solving behavior

Codex read the full contract in two `bash` calls (`SEMANTICS.md`, `api.d.ts`,
`CHECKER-INPUT.md`, `entry.mjs`, `package.json`, then `instruction.md` and a file
listing) before writing anything. It then wrote `checker.mjs` (new) and updated
`entry.mjs` in the same turn — from the submission, `entry.mjs` uses the same
two-pass `applyLayers()` structure as Trial 1's fix (all `remove`/`opaque`
markers across every layer's entries first, then regular file/dir writes),
confirming this specific bug class stayed fixed rather than being independently
rediscovered from scratch. It revised `checker.mjs` three more times, each
followed by `node --check` and, once, a `git diff --check`/`git diff --stat`
sanity pass on both files.

It validated with inline Node scripts rather than a test framework: one heredoc
script builds a synthetic release (via `gzipSync`/`createHash`) and exercises
`entry.mjs`/`checker.mjs` directly against it; another passes the checker two
empty-`cells` cases to confirm it returns a complete verdict shape without
crashing on trivial input; a final `assert`-based scenario runner
(`structuredClone`d initial/staged/cache/blob state, with call-tracking) drives
multiple constructed scenarios through `subject.run` directly. It also ran a
whitespace-in-string-literal lint check (`rg` for a literal blank inside quotes)
before finishing. No failed self-test or reverted change appears in the capture;
the agent's own tool calls show incremental hardening of `checker.mjs`, not
correction of a wrong `entry.mjs`.

### E. Comparison and next step

Trial 1 (16m27s) and Trial 2 (17m51s authoring) are both clean passes with the
same fundamental repair (two-pass layer merge) and the same checker design
(independent tree reconstruction from raw cache/origin bytes, not trusting the
submitted service's own reports). The consistency across a materially changed
package (empty starter instead of a mostly-complete one, one more scenario, a
new legal-filename control) suggests this is a stable, low-difficulty result for
this package under Codex/xhigh, not a fragile pass. Recommend deprioritizing
further exploratory trials on this package in favor of packages that have shown
checker-authoring or service gaps, and retaining its correct submissions as controls. The similar two-pass structure
shows convergence on an approach; it does not establish reuse of the earlier
submission or qualify this version as a task that reliably defeats the model.

### F. Verified publication record — September 9, 2026

Reward **1**; service **45/45**; checker **13/13**. All **851** completion-manifest files matched their recorded sizes and hashes.

[Campaign results](../round-two-third-ranked-five-2026-09-09.md) · [Sanitized evidence](../evidence/2026-09-09-round-two-third-ranked-five.json). Trial 1 is preserved.

## September 11, 2026 — successor 2.0.0 engineering (no new model trial)

This is a new task version, not a regrade of the Trial 2 submission above, which
remains a correct clean pass against the earlier contract. Full rationale, the
obligation-to-coverage matrix, and cross-package validation results are recorded in
the [queue 11–15 successor report](../queue-eleven-fifteen-successors-2026-09-11.md);
this section summarizes only what is specific to this package.

**New business requirement.** The prior contract was exactly one `execute()` call per
scenario with no crash/resume concept anywhere, and `view.storage` was declared in
the type but read by nothing — "durable staging distinct from active" was
structurally impossible to test. Version 2.0.0 makes `view.storage` a real durable
installation-line identifier persisted across multiple invocations sharing it, adds a
new interruption boundary after `finish`'s server-side effect lands but before its
response arrives (the identical attempt is redelivered against the mutated durable
state), and adds scenarios chaining a genuinely different, later release onto the
same storage line while an earlier interrupted attempt's staged content is still
outstanding. A new obligation, `supersession`, requires no release ever lands
installed twice, and that a redelivered or newly-arrived attempt never activates
stale/superseded staged content.

**Why the previous strategy fails.** The old reference and alternative both did one
clean forward pass (verify → assemble → stage → finish) with no notion of a second,
later attempt needing to recognize prior leftover state. A solver ported unchanged
either blindly redelivers/re-activates its own already-completed work, or lets a
genuinely newer release's install be clobbered by a stale earlier attempt's staged
bytes finally landing — both are now checkable outcomes via the raw, per-attempt
`actions`/`finishes` log the checker receives, independent of anything domain.mjs
concluded privately.

**Validation.** 45 scenarios grew to 53 (new multi-attempt successive/interrupted
cases); 11 controls grew to 13 (new: `stale-staged-reuse`, `ignore-durability`). Local
dry-run: reference and alternative both 0 failures; all 13 controls trip their
declared check with their `clean` witness respected; checker 15/15 correct,
deterministic, non-mutating. Adversarial probe: removing the entire `supersession`
validation block did not cause either new control to be wrongly accepted — both
remain independently caught by the existing per-attempt `completion`/`contents`
equality checks (defense-in-depth; `supersession` is still independently derived from
raw actions/finishes and required at the service-grading level). Native Harbor (real
Docker, `--validate`): oracle reward 1 (service 53/53, checker 15/15, all 5 integrity
checks pass), nop reward 0 (missing required deliverable, not an infrastructure
error). Local Foundry: 18/18 operations pass, `local-valid`/`trial-eligible` both
allowed. Native export digest
`bb8910b7c5372253a416b5b75e28a1f3edbeb44fc4329cee0446f7385ff16aac`. The real dual-source
digest/size/gunzip/plainDigest verification chain, the precise two-pass layer merge,
and the reserved-filename prototype-pollution safety net are all unchanged and
re-confirmed still enforced.

No model trial has been run against this version; per the implementation standards,
the Trial 1/Trial 2 reward counts above do not carry forward to it. This work was
done in an isolated worktree/branch (`next-five-successors-2026-09-11`) and has not
been merged, committed to `main`, or pushed.


## September 11 independent grader audit

The [independent audit](../queue-eleven-fifteen-checker-audit-2026-09-11.md) reproduced and fixed false accepts, false rejects,
API inconsistencies and checker-coverage gaps in the five-package successor handoff.
Its exact audited versions and export digests supersede this document's earlier readiness
claims for those bytes. The final audit passed 4,146 individual-cell comparisons,
28 checker mutations against both local and protected candidate banks, all 40 native
integrity checks and 105 Foundry assurance operations. No model trials were run, and
historical trial counts were not changed.
