# Prompt 5 — Reliable authorized execution

Date: 2026-09-06. Base commit: `fdbb262`. This assignment implements execution infrastructure and tests it with local inert adapters. It authorizes no real standard/adversarial trial, provider call or campaign.

## Outcome

The foundry now has a transactional, version-bound execution lifecycle for complete packages: existing package eligibility → signed reservation → isolated authoring → bounded capture → independent package grading → exclusive atomic publication. Native CAA and browser replay exercise the actual multi-file routes, not a single-file stand-in. The CLI demos cannot qualify as model evidence.

Usage, schemas, states, recovery and limitations are documented in [authorized execution](../docs/authorized-execution.md). Machine-readable verification is in [prompt-05.json](verification/prompt-05.json). These tracked files do not depend on private research notes; reproducing the container proof requires real validated package exports and their cached runtime images.

## Implemented interfaces

| Component | Responsibility |
| --- | --- |
| `src/execution/profiles.ts` | Pinned requested targets, resource/environment/profile identity, explicit observed/unknown values and one retry-aware qualification policy. |
| `src/execution/store.ts` | Signed operator trust, SQLite transactions, reservations, indexed budgets, fenced leases, uncertain dispatch and explicit retry lineage. |
| `src/execution/authoring.ts` | Private per-attempt container, verified public-only mounts, allowed tools, pinned image, resource limits and bounded artifact extraction. |
| `src/execution/capture.ts` | Streaming stdout/stderr/events, backpressure, byte/line/tail bounds, retained usage, cancellation and descendant cleanup. |
| `src/execution/execute.ts` | Durable stage transitions, failure injection, recovery, existing eligibility policy and immutable normalized results. |
| `src/execution/package-route.ts` | Reuse of actual retained native/portfolio assemblies and grading, including complete scenario/check accounting. |
| `src/execution/artifacts.ts` | Exclusive IDs, bounded regular-file handling, flush/atomic publication and content verification. |
| `src/execution/regrade.ts` | New linked evaluator record without mutating or rerunning the original authoring attempt. |
| `src/execution/command.ts` | No-provider demo, resume, read-only inspect/verify, explicit reconciliation and linked regrade. |

Existing package policy consumes the same qualification function. Legacy direct provider dispatch remains denied; an `approved: true` object cannot bypass signed reservation. A real transport can only be enrolled as a reviewed host service using that lifecycle. No live transport, account credentials, real signing authority, provider idempotency guarantee or backend attestation is supplied by the inert demonstration.

## Exact profiles and evidence boundaries

The requested targets match [TB3 CI revision 83c7a6172d629c6575b785ab12c8db787bb2e323](https://github.com/harbor-framework/terminal-bench/blob/83c7a6172d629c6575b785ab12c8db787bb2e323/.github/harbor-run-defaults.yml): Sol/xhigh under Codex and Opus 5/max under Claude Code. The Claude output request is 128,000 tokens. This is pinned configuration provenance, not proof of effective backend identity or equivalence between local Docker and CI Modal.

The OpenAI documentation review informed explicit requested sandbox/JSONL settings and the distinction between launch configuration and observed identity. Missing observations, fallback, incompatible profiles, changed package bytes, simulations and selected semantic retries cannot complete exact-target qualification. Six standard failures and two substantive adversarial zeros are distinct from five promising standard failures. Infrastructure retries preserve rejected attempts and reasons; they cannot erase a valid solve.

## Gaps closed and compatibility

- **G9:** Explicit requested/observed profiles and real isolation for local authoring. Effective real-provider observations remain external requirements, not locally generated claims.
- **G10:** Signed authorization, bounded reservations/capture, durable recovery and atomic publication replace the unsafe execution/storage assumptions.
- **EXECUTION-TESTS-1:** Legacy timeout/artifact/usage tests now use bounded inert subprocess fixtures while unrestricted provider adapters stay disabled.
- The old inert orchestrator previously allowed simulated failures into counted trial evidence. Its results are now explicitly uncounted; the genuine grading result is still retained.
- New legacy-compatible trial directories have completion manifests and exclusive IDs. Historical directories remain readable without rewriting their contents. Later corrections/adjudications must be linked records rather than edits inside sealed directories.
- New external-intake envelopes put returned files under `packet/`, separate from host-owned receipts/manifests, and refuse duplicate IDs. Grading consumes retained bytes, not a still-mutable incoming directory. Historical effective profiles remain unknown.
- Native arbitrary-submission grading requires a fresh destination and copies the exact submitted service tree without merge behavior. The pinned verifier image already has no starter at that path; this makes the interface fail closed if an unexpected tree exists. A missing-file fixture checks exact artifact handling. No historical result is reinterpreted as having used extra starter files.
- Runtime storage uses built-in SQLite on Node 22.13 or newer, tested on Node 22.22.1. Pure/report APIs retain the prior Node range; this feature adds no dependency download.

## Verification

The final container tier passed **10/10** cases, plus linked regrading, repeated completed-job resume, manifest verification and read-only database inspection. No provider was called. The raw proof is `.local/prompt-05/final-route-04/result.json`; byte hashes and reproducible commands belong in the accompanying verification receipt.

| Local fixture | Capture | Independent evaluation |
| --- | --- | --- |
| Native correct service | completed | semantic pass |
| Native missing mutable implementation file | completed | invalid execution |
| Native authorization-combination near-miss | completed | semantic fail |
| Browser correct service | completed | semantic pass |
| Browser unchanged starter, permitted local HTTP tool | completed | semantic fail |
| Timeout | timeout | invalid execution |
| Malformed events | malformed events | invalid execution |
| Excess output | output limit | invalid execution |
| Explicit process interruption | process error | invalid execution |
| Hanging child process | timeout | invalid execution |

The oversized-output run retained exactly 33,554,432 bytes across its bounded capture files. Timeout and child-process captures finished in approximately 4.11 seconds with four-second deadlines, including cleanup. The final local proof directory used about 81.3 MiB including its inert binary, ten records and linked regrade; no runtime archives were duplicated into those records. These are scoped observations, not throughput forecasts or measured peak-RSS claims.

Final scoped regressions: **292 passed, 0 failed, 0 skipped** in 55.88 seconds. Actual protected-route regressions: **15 passed, 0 failed, 0 skipped** in 259.36 seconds, covering all twelve families through the existing protected interfaces. This protected tier uses declared-knob and targeted control coverage, not every Cartesian scenario. Typechecking, lint, the ESM/CJS/declaration build, public export loading, Go/script formatting and `git diff --check` pass.

The separately run legacy compatibility tier remains **50 passed, 6 failed**. One assertion expects `subprocess` rather than the migrated `cell-container` route; five expect old ship-blocker labels rather than the package-stage policy. Their names and raw report are retained in the verification receipt, assigned to Prompt 7. The full repository is not claimed green.

The final before/after source inventory contains 2,074 source/configuration/documentation files and matches digest `8350f71e9f15ccd939a8a69f3284ff34d9d98c2fad626f68a518e8f69a0d6fac`. Its separate 904-file trial/campaign/audit inventory is unchanged; tracked historical evidence and task-source diffs are empty. Generated reports are excluded from the source digest to avoid self-reference. The compiled execution source identity is `5fecfc42da0a7222a13189f876c98d3a8d02b0d36e34eede532778af6fc70b8e`; every final inert record carries it.

Intermediate failures remain preserved. They include the timing-sensitive test lease, missing verification receipt, an early route run invalidated by source/build changes, one concurrent protected-control failure, and native workspace/fixture assumptions. The final source was held unchanged while the accepted container and regression tiers ran; those are the only completion results above.

## Findings retained rather than hidden

1. **Native unchanged starter:** one preliminary run exited during a later scenario, so its reward zero is correctly `invalid-execution`. The completed-but-wrong fixture now uses the already-preserved `any-authorizes` near-miss on a correct planner. This is a fixture selection correction, not a weakened failure classifier or a task change. The original invalid record is retained.
2. **Browser visible mock:** the protected reference passes the hidden browser suite, but one visible test mock omits `api.settle`, which the reference legitimately calls. Its captured self-check therefore fails that mock. This is recorded as **P5-BROWSER-VISIBLE-MOCK**, owned by Prompt 7: correct mock parity and issue a new package version before real qualification. Prompt 5 does not silently modify the frozen Prompt 4 artifact or declare the visible reference check green.
3. **Go self-check scratch:** `/tmp` originally disallowed executable temporary test binaries. The authoring container now permits execution in its bounded private temporary directory. This grants no access to the host filesystem.

## Limits and next owner

Local reservation ceilings prevent overcommitting approvals; they are not provider-enforced billing limits. Unknown usage/cost retains its reserved ceiling rather than becoming zero. An uncertain dispatch needs affirmative reconciliation and task-owned process cleanup before resources are released; it is never automatically resent. Partial preparation stays inspectable and invalid, not a repaired historical success.

Bridge networking demonstrates allowed external tool access, not an egress allowlist. Real provider enrollment must supply reviewed credential mediation, enforceable request/account limits, runtime observations and destination-compatible tooling. No real provider behavior or target-model hardness has been measured in this assignment.

Prompt 6 receives immutable results, captures, self-check source, independent observations/traces, accounting and explicit invalid/semantic statuses. It should build inspection, findings and transfer views over these records. Prompt 7 still owns repository-wide integration and the browser visible-test correction; independent human/time review and real standard/adversarial qualification require separate authority.
