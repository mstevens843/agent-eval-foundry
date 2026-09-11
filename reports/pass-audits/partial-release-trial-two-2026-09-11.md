# Partial Release trial 2 pass audit — 2026-09-11

Disposition: **retain the recorded pass**. No reproduced false acceptance in the submitted service, submitted checker, or task grader was found. The submission survived fresh executions beyond the original bank. This is bounded audit evidence, not proof that every possible implementation is classified correctly.

There is a separate API-contract inconsistency involving caller-supplied `generation`, described below. It does not explain or invalidate this submission's pass.

Only `partial-release-repair` v2.0.1, adaptive campaign trial 2 (Claude), was audited. Other packages, campaign state, frozen artifacts, original evidence, and trial counts were not modified. No model calls, commits, or pushes were made by this audit.

## Evidence identity

- Frozen package digest: `9bd1c3ae996492793bc3f01264c28a3ed327836f2ae16b7353f8f1571cc0a612`.
- Record: `.local/successor-adaptive-trials-2026-09-11/slots/partial-release-repair/trial-2/real-campaign-frozen/jobs/real-provider/records/partial-release-repair-attempt-1`.
- All 897 retained evidence files verified before and after the audit. Issued instructions, semantics, API types, and checker interface matched their frozen snapshot hashes.
- Recorded reward remains 1: service 65/65, checker 17/17 candidates. The original aggregate grade alone was not used as the audit verdict.
- Rerunnable entry point: `node scripts/audit-partial-release-trial-two.mjs .local/partial-release-t2-audit-FRESH-NAME`. Requires the retained campaign and its pinned Docker runtime; the output directory must not exist.
- Final detailed execution evidence: `.local/partial-release-trial-two-pass-audit-2026-09-11-final/`.
- Portable summary with source, submission, and result hashes: `reports/pass-audits/partial-release-trial-two-2026-09-11.json`.

## Tests and results

| Check | Result |
| --- | --- |
| Submitted service on fresh task-authority scenarios | 2,028/2,028 passed |
| New valid strategies: precomputed receipt-driven plan, broad legal rebuild, extra idempotent operations | 678/678 accepted |
| Independent API simulator: submitted solver and two valid alternatives, mixed per-call/per-incarnation uncertainty and 0–2 pending receipts | 360/360 passed |
| Independent per-cell classifications, including all 1,105 cells from the original checker bank | 4,284/4,284 matched |
| Positive/negative cells in that comparison | 3,475 accepted; 809 rejected |
| Repeated and reordered checker judgments, including mixed-cell groups | 12,856 matched |
| Protected RPC replay of the exact submitted service | 114/114 passed: 65 original + 49 fresh scenarios |
| Additional protected strategy executions | 60 executions; all matched their intended outcomes, including the separate generation inconsistency probes |
| Checker-only isolated replay on selected cells and fresh protected traces | 249/249 correct, deterministic, input unchanged |

The 4,284 comparisons contain 1,170 retained execution cells and 3,114 newly executed cells. Repeated checker invocations are reported separately, not as additional independent trials. The three generation-inconsistency executions are excluded from the zero-mismatch counts above and reported explicitly below.

Fresh scenarios include every combination of the eight three-node DAGs in one topological order, eight payload-change masks, and all three task uncertainty modes. Additional generated cases vary topology/order, current/target membership, shared dependencies, multi-parent resources, unchanged out-of-scope children of scoped ancestors, empty payloads, empty scope, duplicate/reordered parent sets, and opaque IDs including empty strings and `__proto__`. Explicit boundary graphs contain 40 resources and depth 8, with reversed dependency direction between current and target. Maximum observed submitted API usage was 321 calls, below the public 4,000-call limit.

The independent simulator exercises both landed and non-landed UNKNOWN responses across successive incarnations, beyond the frozen domain's first-attempt-per-method/ID uncertainty injection. All simulated input graphs are validated for acyclicity, complete parent references, and public size/depth bounds. The fresh valid planning strategies also establish feasibility.

Fresh executed faults cover incorrect payload and parents; missing restoration; unwanted scoped resources; no work with a forged success report; illegal parent removal followed by complete repair; illegal child creation followed by repair; editing an immutable resource; out-of-scope idempotent/new/absent writes; invalid payload/parent types; a self-cycle request; and abandonment of an ABSENT restoration. The last strategy is correctly accepted when its write actually lands, and rejected when it does not. Each execution is judged separately, so rejection on one scenario cannot hide a false acceptance on another.

The standalone audit oracle derives its answers from the published scope, target, final graph, and operation pre-state rules. It does not import the reference checker or read host `checks`, candidate reports, or scenario IDs as truth. The large sweep uses an in-process value-copy adapter inside a network-disabled, non-root Docker container; it is not an isolation test. Selected scenarios and all fresh strategy families are additionally executed through the unchanged protected RPC host, and the checker is separately run without authority access. These cases were authored during this review; they are not an independently held-out author/model bank.

## Why the submitted implementation passes

The solver closes the set of wrong resources over their current descendants, removes scoped leaves first, then recreates missing targets once parents exist. It reads the authoritative graph after every write. Consequently a stale receipt cannot settle a later incarnation: this implementation does not use receipts as evidence. Fresh inspection is explicitly permitted by the public contract.

The checker compares every scoped ID against target, including absence; compares both initial and final out-of-scope membership/content; and checks operation legality against host-recorded pre-operation graphs. It also rejects recorded REJECTED writes, including schema violations followed by repair. It handles parent lists as sets and treats reports/opaque identifiers as diagnostics. Extra legal operations and alternate architectures passed.

Missing-field fallbacks and duplicate-resource normalization in the submitted checker look permissive in isolation. However, missing authoritative final/scope fields and duplicate final IDs are not produced by this task's successful host executions: final resources come from a Map, and required fields are supplied by the domain. Runtime-invalid executions are stopped by `candidateTrace` before entering the checker corpus. Fabricating an impossible cell would not demonstrate a reachable false pass. No such fabricated cell is counted as a finding here.

## Separate finding: generation round-trip contract inconsistency

The frozen `api.d.ts` says generation is server bookkeeping and is **ignored if present** in `create`. `SEMANTICS.md` also excludes generation from content equality, but says the caller never supplies it. These descriptions conflict about whether including the field is permitted.

Reproducer: complete a valid release, take an in-scope resource directly from `api.inspect({}).resources`, then issue an otherwise identical `api.create({resource})` including its observed generation. The frozen domain compares a normalized object that retains every property, so the additional generation field causes REJECTED. The task reports `dependency_order` failure; the submitted checker also rejects because it sees that rejection. This reproduced in all three uncertainty modes and through the protected host.

Under the API type declaration's explicit ignored-field promise, this rejects a valid idempotent operation. Under a strict interpretation of the prose forbidding caller-supplied generation, the request is outside the promised input contract. It is therefore an API/implementation inconsistency requiring clarification and a future regression fixture, not evidence that this trial accepted an invalid solution. The passing solver explicitly constructs `{id, parents, payload}` for creates, so it never triggers this problem.

Suggested future package fix: make the generation policy consistent across the public documents, create validation, and stored resource normalization. If the existing ignored-field API promise is retained, strip generation before comparing or storing resource content and add round-trip idempotence/recreation positive controls. Do not patch the live/frozen campaign after results have been observed. No package bytes were changed during this audit.

## Recommendation

Keep Partial Release stopped at its first pass: trial 1 failed, trial 2 passed. There is no reproduced false-positive witness supporting a null/retrial decision. Preserve the separate generation inconsistency for a future version review; do not present this finite audit as universal checker correctness.
