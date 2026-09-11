# Hardened 3.0.0 successors: first trial, Trial 3

September 10–11, 2026. **Five recorded attempts, two reward-one outcomes, three
reward-zero outcomes.** The original numeric results are retained below. The
[September 11 independent audit](../hardened-next-five-pass-audit-2026-09-11.md)
found checker gaps in both passes, verified Calendar and Budget's recovered zeroes,
and separated a host-response defect in Workflow's original grading from a newly
reproduced, genuine checker defect. Its probes are separate audit evidence and
have not silently overwritten these original rewards. All
five attempts launched together. Two Codex attempts hit a publication
infrastructure incident after grading had already completed; both were
recovered and published without any additional model call.

## Results

| Package | Target | Reward | Service | Checker | Authoring | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Claude | 1 | 33/33 | 13/13 | 52m 53s | Subsequent audit: missing opaque-token verdict |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Claude | 1 | 19/19 | 12/12 | 41m 58s | Subsequent audit: accepts invalid completion reports |
| [18 — Recurring calendar](fourth-five/18-recurring-calendar-repair.md) | Codex | 0 | 37/37 | 14/16 | 10m 19s | Publication incident, recovered |
| [20 — Workflow authority](fourth-five/20-workflow-authority-repair.md) | Codex | 0 | 36/36 | 13/15 | 14m 07s | Host-response artifact; independent checker defect also reproduced |
| [04 — Delegated budget](original-five/04-delegated-budget-repair.md) | Codex | 0 | 21/21 | 14/17 | 10m 50s | Publication incident, recovered |

All three recorded reward-zero packages passed their service deliverable
(`semantic-pass`) and failed only the required checker in the original bank.
Calendar rejected `reference` and `alternative`; Budget additionally rejected
`variant-idempotent-settlement`. Workflow accepted `reference` but rejected
`alternative` and `variant-replacement-and-retry`; their host traces contained the
contract-inconsistent response documented in the subsequent audit. Both service
and independent checker were required; reasons were
diagnostic-only. No score depends on a rejection label.

## Execution

The frozen controller (source digest
`153bdf9d0675e7d4ca59a7fe9b21430e887d24e889db7bbfb134e5dc4d7fa41d`, its own
`frozen-source/`, not reused from any earlier campaign) recorded five dispatches
between **2026-09-11T01:13:36.917Z and 01:13:37.181Z**, a **264ms** spread — all
five solver containers ran concurrently, as requested. The campaign used three
Codex Sol/xhigh and two Claude Opus 5/max profiles, subscription-only, with no
paid API fallback or automatic retry. The per-attempt maximum was 10,800
seconds; the longest attempt (route policy) finished in 53m16s wall time, well
under it. No model substitutions, extra model calls, or additional attempts
were made beyond the five authorized.

## Publication incident and recovery

At **01:25:13.634Z** and **01:25:19.226Z** the controller logged
`dispatch-error: Error: EVIDENCE_BYTE_LIMIT` for delegated budget and recurring
calendar respectively. Both attempts had already finished capture, grading and
checker evaluation by that point (service `semantic-pass`, `checkerPassed:
false`, `reward: 0` for both, independently confirmed below) and had reached
the "publishing" stage; the failure was in durably committing already-complete
evidence, not in solving or grading.

**Root cause.** `publishEvidence`/`verifyEvidence` walked their staged evidence
tree with `regularTree()`'s generic 128 MiB default, which had never been given
an explicit publication-specific budget. The hardened 3.0.0 packages' larger
checker-grade banks (17 candidates over 21 scenarios for delegated budget and
16 candidates over 37 scenarios for recurring calendar) pushed each attempt's
pre-manifest staged evidence to 274.26 MiB and 168.81 MiB respectively, both over that
default — because each candidate's `runPortfolioSubmission` call writes a
near-duplicate `process.log`/`result.json` pair several megabytes each (the raw
captured stdout *is* the JSON payload re-serialized, with minor metadata added,
into `result.json`).

**Fix, applied to the live repository (not the frozen campaign runtime).** An
explicit `EVIDENCE_PUBLICATION_BUDGET_BYTES` constant (512 MiB,
`src/execution/artifacts.ts`) is now threaded as an optional parameter into
`publishEvidence`/`verifyEvidence` only. `regularTree`'s own default and every
unrelated solver-submission size limit (`copyArtifactTree`, `package-route.ts`,
`real-provider.ts`) are unchanged — this is a scoped, named budget for
aggregate grading-evidence publication, not a global `regularTree` limit
increase. For future runs, the per-candidate `process.log` is now
gzip-compressed at write time (`src/packages/local-process.ts`, opt-in
`logCompression: "gzip"`), losslessly preserving both stdout and stderr —
including any diagnostic content not captured in `result.json` — while
removing the near-total duplication that drove the growth. Both changes are
covered by new local tests, no provider calls: budget enforcement, tampering
detection and independence from `regularTree`'s default in
`test/execution-lifecycle.test.ts`; lossless gzip capture of interleaved
stdout/stderr in `test/package-production.test.ts`.

**Recovery.** The frozen executor predates this fix, and its own
executor-version guard (`EXECUTION_EXECUTOR_VERSION_DRIFT`) correctly refuses
to resume a job under a different source identity — so recovery did not, and
could not, resume the frozen campaign in place, and this publication does not
pretend otherwise. A separate, explicitly non-executor recovery tool
(`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/recover.mjs`,
sha256 `ff5d5b53cc812d6a0a68a0508021cf5a7d18560393a80b02ea572ce89f06c4a1`)
independently re-verified each attempt's already-complete evidence before
publishing it unchanged, with the corrected budget:

- Re-walked and re-hashed the full staged evidence tree, confirming it fit the
  new 512 MiB budget.
- Confirmed `capture.status === "completed"`, `checkerRequired === true`,
  service `semantic-pass`, and cross-checked `result.json` against the
  original identity.
- Read each attempt's checker-grade summary directly and confirmed the
  specific false-positive candidates (listed above per package) — inspecting
  the actual failure, not just trusting the `checkerPassed` flag.
- Read the original identity verbatim from each stage's own `prepared.json`
  (never reconstructed) and passed it unchanged to `publishEvidence`, so the
  published record's identity — package digest, profile digest, executor
  digest `153bdf9d...` — is exactly what the frozen executor recorded before
  it crashed.

Both attempts are now published to
`real-campaign-frozen/jobs/real-provider/publication-recovery/<id>-attempt-1/`
(1,399 and 982 files respectively, verified), separate from the three clean
in-band completions under `.../records/`. A full incident/fix/recovery
manifest, hash-linking the recovery tool separately from the original
executor and never claiming the two are the same, is at
`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/manifest.json`.
The original `dispatch-errors/*.json` records and a full pre-recovery backup of
both stuck stage directories are preserved unchanged.

## What the trial taught us

- **Route policy and browser replay (Claude):** the original banks passed, but
  the independent audit reproduced missing required checker coverage in both.
- **Delegated budget and recurring calendar (Codex):** the original checker
  rejections of correct candidates were independently reproduced. Publication
  recovery preserved those existing results byte for byte.
- **Workflow authority (Codex):** the original rejected positive traces contained
  an invalid host response. Correcting it produces 15/15 on the original bank.
  A separate permitted post-receipt retry is nevertheless rejected by the saved
  checker on both original and corrected hosts. Integrate that control and the
  host fix before further trials; preserve the distinction between these causes.

## Evidence and publication

[Sanitized evidence](evidence/2026-09-10-hardened-next-five-trial-one.json)
records all five attempts, including exact package/profile/executor
identities, checker false-positive detail, durations, usage, and — for the two
recovered attempts — the publication incident and recovery detail with hashes
linking to the recovery manifest. All five original analysis documents linked
above contain dated Trial 3 sections; their Trial 1/Trial 2/hardening history
remains intact.

Raw records remain under
`.local/hardened-next-five-trial-one-2026-09-10/real-campaign-frozen/`, with the
two recovered attempts additionally documented under
`.local/hardened-next-five-trial-one-2026-09-10/publication-recovery-2026-09-11/`.
Runtime records, submissions and package exports were not changed; the
publication-recovery tool touched only the two stuck stage directories'
publication step, after the controller had fully exited.

This documentation work made zero model calls beyond the five authorized
attempts. Requested settings are separate from observable CLI metadata; CLI
price estimates are not subscription charges. The five existing finalists
(incremental-build-repair, issued-report-repair, variant-cache-repair,
snapshot-recovery-repair, temporal-capacity-repair) and their standings are
unaffected by this trial.
