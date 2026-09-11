# Round 4 pass audit: Browser coverage gap, Route pass retained

**Subsequent counting decision, September 11:** [Browser coverage-v3 and Round 5 preparation](browser-coverage-v3-2026-09-11.md) records the user-authorized exclusion of Browser’s historical Trial 6 from counting. Original reward 1 and diagnostic regrade 0 remain preserved; counted reward is null. Route’s reward 1 remains counted. The original results below remain historical evidence.

The two recorded Codex passes from the fourth 3.0.0 round (historical Trial 6) received an independent audit against their issued contracts and frozen execution packages. **Browser's required checker has a reproduced false positive that the original bank missed. No defect was found in Route's bounded additional audit, so its pass is retained.**

| Task | Recorded result | Audit result |
| --- | --- | --- |
| [03 — Browser replay](original-five/03-browser-replay-repair.md) | Service 19/19; checker 14/14; reward 1 | Required checker rejects a valid existing-dialog completion. Original bank plus three additional positive cases: submitted checker **16/17**, reference checker **17/17**. Diagnostic reward with that supplement is **0**. |
| [14 — Route policy](third-five/14-route-policy-repair.md) | Service 33/33; checker 13/13; reward 1 | Saved service passed 299 additional valid configurations. Its checker correctly classified 299 reference deployments and 299 changed deployments. **No confirmed additional defect; retain reward 1.** |

No model calls were made. Original trial records, rewards and task/grader exports were not modified. This report records a coverage finding separately; it does not silently void a trial, insert a replacement, change qualification counts or restart a six-run set. [Sanitized evidence](evidence/2026-09-11-hardened-round-four-pass-audit.json).

## Browser: valid confirmation without an extra form submission

The [issued semantics](../../tasks/browser-replay-repair/public/SEMANTICS.md) permit **unique integer** step IDs; they do not restrict them to nonnegative values or reserve `-1`. Operations use `JSON.stringify([traceId, step])`. The public confirmation interface checks dialog ID, operation ID and session. It requires the correct operation binding, and does not require a new form submission when an appropriate dialog already exists. The [checker contract](../../tasks/browser-replay-repair/public/CHECKER-INPUT.md) requires accepting every candidate whose executions satisfy those semantics.

The existing public application seeds a competing dialog whose operation ID uses step `-1`. The audit uses an otherwise ordinary four-event scenario with first step `-1`, then steps `1`, `2`, `3`. Its existing dialog therefore has the **exact intended operation ID, entity, field and value**. The frozen reference implementation finds it, renews the session, and confirms it through the real Chromium bridge. It completes all four effects in recorded order and returns the exact required report on both deliveries. There is no direct HTTP bypass, fabricated observation or edited final-state fixture.

The dialog is named `stale` and carries `stale:true`; that detail is preserved in the evidence. Its operation ID is nevertheless the intended ID in this valid signed-step scenario. The supplied public bridge's conditional confirmation succeeds on the matching identity/session. The issued contract does not make the diagnostic stale flag an additional rejection condition or reserve this step ID. Reserving `-1` or requiring a fresh submission would introduce a new task rule and cannot be applied retroactively.

All six service obligations pass: completion, exact effects, current preconditions, confirmation binding, reports and preservation. The first operation's accepted action is its confirmation; it has no form submission. The saved checker rejects it with:

```text
cell 0: operation ["signed-step",-1] has no accepted UI submission
```

The failure comes from `validateActions()` in the submitted `checker.mjs`: it collects operations appearing in `kind: "submit"` actions, then requires every intended operation to appear in that set. That extra condition rejects this permitted execution.

This was reproduced through the **unchanged frozen authority**, including its real browser, UID-separated submitted process and API protocol. The unchanged reference checker accepts the trace. Two neighboring positive controls using first steps `-2` and `0` are accepted by the submitted checker as well. The submitted Browser **service** passes all three scenarios, including `-1`; the discovered defect is confined to its required checker.

Finally, the complete original 14-candidate bank was combined with all three new positive cases. Checkers received verdict-free, frozen inputs and were invoked twice under the published checking envelope. The submitted checker made exactly one additional classification error, rejected the same valid trace both times and did not mutate input. The reference checker classified all 17 correctly. This independently reproduces the missing positive coverage while retaining the original negative controls.

## Route: additional checks found no violation

A deterministic differential audit generated 300 bounded route-policy configurations. One was excluded because the reference deployment exceeded a published capacity; it was not counted as a solver failure. The remaining **299** had validated, equivalent reference deployments within the published limits. The largest reference used 84 flat rules.

The cases vary nested acyclic calls, return/continue/fallback behavior, preference changes, community additions/removals, prefix and prefix-length predicates, original-input request scope, a shared nonrequested egress, unregistered route communities and an egress named `__proto__`. Three registered community identifiers and up to four policies/four terms per policy keep this generated audit bounded. The existing full trial also includes its larger capacity scenarios.

For each valid configuration:

1. The saved service's deployment was checked against the frozen authority's interpreter and universal-equivalence checks, including behavior outside sampled routes.
2. The saved checker was tested on the independently generated correct reference deployment.
3. A changed deployment was classified against the authority's actual findings rather than assuming every mutation was invalid.

No service failure or checker classification error was found. The saved checker uses explicit property definitions for opaque token keys and independently enumerates prefix truth regions and community memberships. Its checks also cover deployment capacity, exactly one successful publication, calls after publication, and recorded route outputs. Reading the submitted implementation found no attempt to access private grading data or manipulate reward output.

This is substantial additional evidence for retaining the pass, not a proof covering every possible implementation and input. No missing Route obligation was established by this audit.

## Verifier and evidence checks

Both original completion manifests were verified before and after replay: **2,299 retained files**. Public contracts were compared with the frozen package bytes. The audit loads the previously frozen runtime by its recorded bundle hash and rechecks each package digest. Original submissions are mounted read-only; local replay has no external network or credentials.

The unchanged exports already have nine passing integrity controls per task, covering missing verdicts, always-accept/reject checkers, input mutation including repair-before-return, JSON-hook concealment, private reads/reward writes, descendant cleanup and forged output/symlink attacks. Their existing evidence is linked in the audit JSON. Those results were reviewed and their export-manifest hashes verified; they are **not** claimed as new cheat trials. No new isolation or reward-manipulation bypass was demonstrated here.

## Reproduction and next action

Run from the repository with Docker available and the frozen local trial artifacts retained:

```sh
node scripts/audit-hardened-round-four-passes.mjs .local/round-four-pass-audit-new-run
```

Use a fresh output directory. The script reproduces the Browser reference/service traces, augmented checker classifications, Route differential checks and original-manifest verification, with zero provider calls. The completed reproduction is retained at `.local/hardened-round-four-pass-audit-confirmed-2026-09-11/`.

Browser needs this valid signed-step/existing-dialog scenario added to its checker grading coverage before its recorded pass is called clean. Validate both permitted recovery and wrong-operation rejection when integrating it. No task-contract change or model-solution patch is needed. Route has no evidence-backed change to make from this audit and can continue with its retained pass.
