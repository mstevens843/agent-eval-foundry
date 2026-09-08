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
