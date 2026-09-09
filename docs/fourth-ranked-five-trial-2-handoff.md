# Trial 2 handoff: 09 / 06 / 05 / 16 / 17

Prepared September 9, 2026. **All five packages and the launch controller are ready for exploratory retrials.** Native validation is complete. The engineering agent ran `prepare`, which made zero provider calls and created no dispatch claim, reservations or solver containers.

Repository: `/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry`.

## Assignments and authorization

When the user passes you this handoff, run exactly one fresh standard exploratory attempt per package, **all five concurrently**, three Codex and two Claude:

| Package | Target | Append Trial 2 here |
|---|---|---|
| 09 — ticket-consolidation-repair | Claude | `reports/screening/next-five/09-ticket-consolidation-repair.md` |
| 06 — partition-index-repair | Codex | `reports/screening/next-five/06-partition-index-repair.md` |
| 05 — compatible-rollout-repair | Claude | `reports/screening/original-five/05-compatible-rollout-repair.md` |
| 16 — document-export-repair | Codex | `reports/screening/fourth-five/16-document-export-repair.md` |
| 17 — analytical-reconciliation-repair | Codex | `reports/screening/fourth-five/17-analytical-reconciliation-repair.md` |

The profiles request Codex `openai/gpt-5.6-sol` with effort `xhigh`, or Claude `anthropic/claude-opus-5` with effort `max`. Retain these frozen profiles: subscription-only billing, no paid API fallback, no automatic retries or substitutions. Each attempt has a **10,800-second maximum**, ending normally as soon as the agent finishes. A fresh campaign's internal `attempt-1` is historical **Trial 2** for that package. All five retain their original model family.

Run one five-job campaign at a time on this host. Let the currently active campaign finish and capture/grade its results first. Run the fourth-ranked group before the final group if both handoffs are queued. Do not stop an existing campaign or launch ten more jobs alongside it.

## Prepared artifacts and provenance

- Controller: `.local/round-two-fourth-ranked-five-2026-09-09/campaign.mjs`.
- Frozen readiness: `.local/round-two-fourth-ranked-five-2026-09-09/real-campaign-frozen/READY.json`.
- Reviewable adaptation: `.local/round-two-fourth-ranked-five-2026-09-09/controller.diff` and `.local/round-two-fourth-ranked-five-2026-09-09/adaptation.json`.
- Authoring evidence: `reports/screening/evidence/2026-09-09-fourth-ranked-five-implementation.json` (rows are `results[]`).
- Implementation report: `reports/screening/fourth-ranked-five-implementation-plan-2026-09-09.md`.
- Node Foundry exports: `.local/fourth-ranked-five-implementation-2026-09-09/release-ready/<id>/export`.
- Native Harbor exports: `.local/fourth-ranked-five-implementation-2026-09-09/harbor-ready/<id>`.

`prepare` passed for all five and froze their package/profile/instruction digests. Do not repeat `prepare` or replace `READY.json`. Both evidence layouts map through each row's exact `foundry.export`, `foundry.assurance.path`, `foundry.digest`, `native.digest` and `analysis`; the controller already handles the mapping.

The new controller is a small adaptation of `.local/round-two-third-ranked-five-2026-09-09/campaign.mjs`, preserving its reservation, credential staging, concurrent dispatch, grading and outcome capture. It imports the **same frozen runtime the trial operator built and used for the first completed Trial 2 campaign**:

`.local/round-two-top-five-2026-09-09/frozen-source/dist/index.js`

Its source identity was rederived as `2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`; actual `dist/index.js` bytes rehash to `60695de963e5085dfe8ee4fb09353b1db0169219d9ad9425ac2a997a73b69b26`. Review the small diff against the existing controller as needed. There is no new compiled runtime or mystery executor directory. Source checks bind to the frozen directory, so engineering edits in the live repository cannot change this campaign's runtime identity.

All five packages use the Node portfolio execution route and require both the service and an independent checker. Compatible rollout now includes a required checker and stage lost-response/recovery semantics; record this version change when comparing with its service-only Trial 1.

## Launch once when the host is free

Use the existing configured login-shell environment and normal tool permissions. Claude's token is read from `CLAUDE_CODE_OAUTH_TOKEN`; the existing helper stages Codex's subscription credential. Do not print secrets or request pasted tokens. A tool permission denial is separate from authentication; report the denied action and actual reason and use the normal approval mechanism.

```sh
node "/Users/devlegacy/Desktop/projects/ai-gap-coverage-projects/agent-eval-foundry/.local/round-two-fourth-ranked-five-2026-09-09/campaign.mjs" run --user-authorized-five-concurrent-trial-2
```

Keep the controller alive through completion with your normal background-job mechanism. Before dispatch it checks the package bytes, frozen source/controller/evidence hashes, profile/instruction hashes, credential availability, disk, CPU/memory and active Foundry containers. The exclusive `DISPATCH-CLAIM` prevents repeating this campaign. If a claim or jobs already exist, inspect and monitor them; do not create replacement attempts.

Confirm actual concurrent solver containers and launch times, report launch promptly, then monitor through completion. The three-hour limit is a ceiling, not a required waiting period. Keep this controller, packages, evidence, profiles and frozen runtime unchanged. Native oracle/nop and local controls already passed; repeat only a check tied to concrete drift or a newly found defect, not the whole authoring campaign.

## Analyze and record all five results

Append a dated **Trial 2** section to each original analysis document in the table. Preserve Trial 1 and engineering history. Record:

- Exact package/profile digests and requested versus observed model/effort where available.
- Overall reward, service results, and required-checker classifications separately; checker is N/A for CAA.
- Authoring duration and total elapsed time as separate measures, plus observed concurrency.
- The agent's completion claim and self-testing, failed scenario/control IDs, relevant submitted-code behavior and concrete cause.
- What changed from Trial 1, what the optimization achieved and the next useful action.
- Infrastructure failures or missing evidence separately from semantic task failure.

Report every recorded zero reward clearly. A substantive required-checker error is a legitimate task failure even when the service passes. Reason text is diagnostic-only. Apply the assignment and TB rubric: expert knowledge, implied consequences and hidden tests are allowed; not every test must be enumerated publicly. Any contract/grader defect claim must cite an actual conflicting requirement and evidence. Do not impose additional qualification rules or count infrastructure errors as successful semantic failures.

Write:

- Summary: `reports/screening/round-two-fourth-ranked-five-2026-09-09.md`.
- Sanitized evidence: `reports/screening/evidence/2026-09-09-round-two-fourth-ranked-five.json`.
- Raw evidence: `.local/round-two-fourth-ranked-five-2026-09-09/real-campaign-frozen/`.

Update screening/status links and the explicit publication inventory where required, preserving historical tables. Run the existing publication checks after writing results. Do not change the authoring evidence frozen into `READY.json`. Finish with the five-result table, success count supported by the results, and recommended next steps. No extra model calls, retries, cheat trials, qualification runs, staging or commits are included in this handoff.

## Readiness evidence

Completed validation: 78 assurance checks, 63/63 checker classifications, 110 static checks, 30 integrity controls, five Harbor oracle passes, five expected nop zeroes and 45 regression tests. Export reproduction also passed. During handoff preparation, the frozen runtime loaded and rehashed every Foundry export; assurance files and retained Harbor oracle/nop result hashes matched the recorded evidence. Both new controllers passed preparation with zero eligibility blockers and zero provider calls. Final submission qualification remains separate from exploratory readiness.
