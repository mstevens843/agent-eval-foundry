# Route T7 pass retained: 3 failures / 5 scored trials

**The Codex pass survives independent additional testing. No missing grading coverage that changes this outcome was demonstrated.** Route policy remains at **3 reward-zero outcomes and 2 reward-one outcomes across 5 scored trials**. Its unused sixth slot cannot raise it above 4/6 failures, so this version has stopped below the 5/6 target.

This audit concerns historical **Trial 7**, the fifth round on public **3.0.0**, using the unchanged **coverage-v2** package. It is the second Codex attempt after three Claude attempts. The original result remains **reward 1, service 33/33, checker 13/13**. The earlier Codex T6 pass also remains counted following its [separate audit](hardened-round-four-pass-audit-2026-09-11.md).

[Task history](third-five/14-route-policy-repair.md) · [Audit evidence](evidence/2026-09-11-route-trial-seven-pass-audit.json) · [Counting ledger before this round](evidence/2026-09-11-hardened-six-counting-ledger.json)

## What was checked

The saved `entry.mjs` and `checker.mjs` were read in full. The frozen package digest and runtime bundle hash were verified, along with all **906 files** in the original completion manifest before and after replay. The retained semantics, checker interface, instruction, API declaration and target evaluator match the issued package hashes. No new public requirement was introduced.

The service symbolically translates nested source policies, preserves mutations and return behavior, and scopes preference overrides using original inputs. The checker independently builds its own expected routing behavior and compares complete prefix regions and community memberships. It also checks publication responses, capacity and observed route outputs. Its null-prototype verdict dictionary handles `__proto__` correctly.

| Existing obligation | Additional audit | Result |
| --- | --- | --- |
| Translation and preservation for all routes, including unrequested egresses | 299 generated valid configurations checked using the frozen interpreter and equivalence verifier; 299 correct reference deployments and 299 changed deployments classified | No service defect or checker misclassification |
| Nested control flow, original-input scope and domain boundaries | 21 additional scenarios covering fallback actions, five-deep calls, eight policies/eight calls, prefix endpoints, preferences 0/1000, 12 registered communities and unusual policy/egress identifiers | Service 21/21; corresponding valid traces accepted |
| Accept every permitted deployment representation | Implicit rejection through empty tables, split prefix regions with a parent-prefix fallback, unreachable contradictory rules and a reference layout | All four accepted |
| Combined deployment capacities | A valid 512-rule deployment below the byte limit; an invalid 513-rule deployment; 4096 versus 4097 predicate atoms | Valid boundaries accepted; invalid deployments rejected |
| Failed publications may be corrected; no publication after success | 13 successful recovery traces, 11 unrepaired invalid proposals and two calls after an earlier successful deployment | All correctly classified |
| Equivalence beyond the supplied route samples | 16 deployments changed only on unsampled `/32` routes, including a nonrequested egress | All rejected |
| Complete opaque-token verdicts, determinism and immutable inputs | Original 13 candidates retokened with strings including `__proto__`, `constructor`, an empty string, Unicode and an embedded NUL | Complete, deterministic verdicts; inputs unchanged |

The targeted bank contains **84 cases: 43 valid and 41 invalid**. Correctness labels come from the frozen authority and were cross-checked against the unchanged reference checker. The saved checker classified **84/84** correctly. Its isolated process received only unlabelled cases and its own submission, with no authority modules or reference solution mounted.

The 21 new service scenarios also passed through the actual frozen bootstrap and its separated service process. Offline audit containers used no network or provider credentials. The four other ongoing model trials and their controllers were left untouched.

Across the generated and targeted audits, that is **320 additional service configurations and 682 checker classifications**. The latter includes the 13 retokened original-bank cases. One generated configuration whose reference exceeded capacity was excluded, rather than treated as a solver failure. During audit development, the proposed 512-rule positive control also exceeded the JSON byte limit; the authority correctly rejected it. The final control uses a more compact permitted layout and verifies both capacities before testing. Neither audit-fixture issue changed a trial result.

## Grader, verifier and interpretation

The frozen service grader checks the published deployment beyond visible route examples using its own source interpreter and finite equivalence regions. The submitted checker makes a similarly comprehensive comparison with a separately written symbolic implementation. The targeted tests explicitly exercise both false acceptance and false rejection, including legal corrections after failed publication.

No private-data access, reward manipulation, fabricated grading output or authority tampering was found in the submitted code. Existing package isolation controls were reviewed; they are not reported as newly run adversarial model trials. This is a bounded audit, not a proof that every possible valid source configuration has been tested. It supplies no evidence for changing either retained Codex pass.

**Disposition: retain T7 reward 1 and stop this package version at 3/5 failures.** There is no demonstrated grading omission to fix and no justified null or retry from this audit. Future task optimization would be a new version with its own trial set. Moving to another candidate is also consistent with the current evidence.

## Reproduction

With the frozen local package, runtime and saved submission available, run:

```sh
node scripts/audit-route-trial-seven.mjs .local/route-t7-audit-new-run
```

Use a fresh output directory. The command verifies the retained evidence, reproduces the generated and targeted checks, and replays the targeted service/checker cases in isolation. It makes **zero model calls**. Completed generated results are retained under `.local/route-t7-pass-audit-initial-2026-09-11/`; final targeted and isolated results are under `.local/route-t7-pass-audit-final-2026-09-11/`. Their hashes are recorded in the published evidence JSON. Original trial records, task requirements, grader exports and qualification accounting were preserved.
