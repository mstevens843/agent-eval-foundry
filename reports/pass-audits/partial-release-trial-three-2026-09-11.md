# Partial Release trial 3 pass audit — 2026-09-11

**Retain the pass. No false acceptance or false rejection was reproduced.** The exact saved Claude trial-3 service and checker passed fresh tests beyond the corrected 22-candidate bank. The generation correction remains effective. No additional grader/checker change or null disposition is justified by this audit.

This is a finite audit against the published rules, not proof of correctness over every possible implementation. The additional trial requested by the user is a fresh confirmation attempt; it does not invalidate or replace either historical pass.

## Identity and preservation

- Task: `partial-release-repair`, v2.0.2.
- Package digest: `1422a83d7860f81e2bf9bdb52ce634887f2e8da4edcccbe8870cdcfebaadf897`.
- Record: `.local/partial-release-generation-continuation-2026-09-11/slots/trial-3/real-campaign-frozen/jobs/real-provider/records/partial-release-repair-attempt-1`.
- Recorded result: service 65/65, required checker 22/22, reward 1.
- Submitted service hash: `9afb4077224d6858e6fcaf4b4a687ae315880dad6c4babe73bcd6d8be5601dc7`.
- Submitted checker hash: `e22711d92549156e97bbcd41ab6d704f5ea3419fa6a6de647a05de676aff7293`.
- All 1,241 original evidence files verify before and after. Issued public contracts match the frozen package; original completion, grade, and submission hashes are unchanged.
- Detailed audit output: `.local/partial-release-trial-three-pass-audit-2026-09-11/summary.json`.
- [Portable audit record](partial-release-trial-three-2026-09-11.json).

No task/package bytes, frozen runtime, historical outcomes, or old controller/ledger files were edited. No model calls, commits, or pushes were made.

## Tests

| Check | Result |
| --- | --- |
| Exact submitted service on generated scenarios | 2,028/2,028 pass |
| Three alternate valid strategies | 678/678 accepted |
| Independent mixed-uncertainty API executions, solver plus two alternatives | 360/360 pass |
| Independently judged cells, including all 1,430 retained checker-bank cells | 4,609/4,609 agree |
| Positive / negative cells in that comparison | 3,608 accepted / 1,001 rejected |
| Repeated, reordered, and mixed-cell judgments | 13,831 agree |
| Unchanged protected RPC replay of submitted service | 114/114 pass: 65 original + 49 selected fresh scenarios |
| Additional protected strategy executions | 60; all match intended outcomes |
| Separate isolated checker replay | 252/252 correct; deterministic; input unchanged |
| Inspected-resource generation round trip | Valid in all three uncertainty modes, including protected replay |

The 4,609 comparisons contain 1,495 retained cells and 3,114 newly executed cells. Repeated invocations and protected replays are reported separately rather than added as independent trials. The broad sweep uses seed `0x20260913`, distinct from the earlier trial-2 audit's random seed.

Generated cases cover all pairs of three-node DAGs in a fixed topological order, all eight payload-change masks, and all three uncertainty modes. Additional scenarios cover mixed scope, creation/deletion, shared dependencies, unchanged outside children of scoped ancestors, duplicate/reordered parents, empty strings, Unicode, case-sensitive and whitespace-bearing IDs, numeric-looking IDs, structured-looking IDs, and empty scopes. Boundary cases use 40 resources and depth 8. Both initial and desired graphs are validated for acyclicity, complete parent references, and public bounds. Maximum observed submitted API use in the sweep was 248 calls, below the 4,000-call limit.

The independently implemented API mixes landed and non-landed UNKNOWN responses across calls and resource incarnations, with zero to two PENDING responses. This goes beyond the frozen domain's first-attempt uncertainty pattern. All 360 executions finish correctly; 120 exercise the saved solver itself.

Fault strategies exercise wrong payload/parents, missing restoration, extra scoped resources, no work with a success claim, illegal dependency operations followed by repair, immutable edits, out-of-scope writes including idempotent/absent requests, invalid resource types, self-cycle creation, and abandonment of an unlanded restore. The last strategy is accepted when the write actually lands and rejected when it does not. Every execution is checked separately, preventing an aggregate rejection from hiding a bad per-cell acceptance.

The corrected bank's generation-bearing illegal writes are all present in the independently evaluated retained corpus. Valid generation round trips/recreation are accepted, while generation-bearing wrong-payload, missing-parent, and out-of-scope requests are rejected. The extra round-trip strategy also succeeds in fresh protected executions for uncertainty modes 0, 1, and 2.

## Why this implementation meets the rules

The service computes the closure of resources that must be removed, removes children before parents, and creates parents before dependents. It uses Maps keyed by exact IDs, compares parent lists as sets, and excludes generation from content. It uses a receipt only for the call that produced it, and falls back to a fresh inspect on unresolved or absent outcomes. It does not substitute a previous incarnation's receipt for a later restore.

The checker tests every scoped ID against the requested target, including absence; preserves the complete out-of-scope population/content; and judges each write against its host-recorded pre-state. It also checks actual REJECTED responses, catching illegal requests even after final-state repair. It ignores generation for content equality and safely defines verdict properties for opaque tokens including `__proto__`.

Permissive handling of missing authoritative fields or duplicate resource IDs is not a reproduced exploit: those shapes are not produced by successful executions of this host, whose resource state is a Map. Runtime-invalid executions are rejected by the protected runner and `candidateTrace` before inclusion in a measured checker corpus. No fabricated impossible trace is counted as a finding.

The saved submission contains no private-file reads, network access, dynamic evaluation, or scenario-specific branches. The test results support ordinary rule-based solving rather than an evidence or grading bypass.

## Audit method and limits

The independent oracle derives expected judgments from public scope, target, operation pre-state, and final state. It does not import the reference checker or treat host check names, diagnostic reports, or opaque scenario IDs as answers.

The large sweep runs inside Docker with a copied synchronous facade, matching the public API. The generic adapter's asynchronous wrapper was adapted only in the sweep copy because this submission consumes synchronous results directly. All selected protected replays retain the exact frozen authority/adapter bytes and execute the submitted program across the normal RPC boundary. The isolated checker replay has no authority or service API access. Thus the broad sweep is not presented as an isolation test.

The valid alternatives and fault strategies were audit-authored; this is not an independently held-out author/model bank. No new model attempt was used as an audit probe.

## Accounting and requested next trial

Historical outcomes remain: trial 1 Claude failure, trial 2 Claude valid pass on the old digest, trial 3 Claude valid pass on corrected v2.0.2. There are three real provider calls, all Claude, and no null outcomes for this package.

The user explicitly requested another trial even if this audit retained the pass. The prepared next slot is **trial 4, Codex**, on the same corrected digest, in a new exclusively owned namespace. This is one additional confirmation attempt. Preserve the existing passes, use the standard public workspace without audit details, and stop after that attempt to report its outcome. Do not restart the old stopped controller or reuse its slots.

See the [next-trial prompt](partial-release-trial-four-prompt-2026-09-11.md) for exact commands. No dispatch was made by this audit.

## Reproduce

Use the retained campaign/package/runtime and a fresh output directory. Docker access is required; no provider credentials are used.

```sh
node scripts/audit-partial-release-trial-three.mjs .local/partial-release-trial-three-audit-FRESH
```

Sources: `scripts/audit-partial-release-trial-three.mjs` and `data/partial-release-trial-three-pass-audit/{probes,strategies}.mjs`. Exact source and evidence hashes are in the audit summary.
