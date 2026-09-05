# Phase 17 - Validating The CAA Discovery Survivor Before Transfer

## Verdict

**VALID-BUT-EASY.** The first prospective discovery survivor converts into a fully valid runnable
benchmark package and does not carry a capability-hard signal. Its exact Probe V2 passed every one of
the 72 registered cells, all 12 package controls held, and the registered first-stage
campaign returned 4 clean solves out of 4 countable trials with zero reward-zero attempts in
either provider family. There is no agreed capability failure to attribute, so nothing here is
transferable as a hardness recipe.

Success for this phase was answering the question, not producing reward zero. The question is answered:
**valid, and easy.** The candidate stays a candidate package. It does not become a task family, and
Phase 18 must not spend a controlled transfer on it.

Priced campaign spend was **$0.8460** across 4 attempts, with 2 unpriced OpenAI attempts.
Registered caps were $60 subject, $40 labelling and $100 total.
No blind label was run because no attempt was reward zero; 0 were owed. That is protocol compliance, not missing adjudication.

## 1. Phase 16 Probe-Contract Audit And Correction

Every frozen Phase 16 input is intact: **yes**.

| frozen input | registered SHA-256 | observed | intact |
|---|---|---|---|
| `src/phase-16/probes.ts` | `bf98d8164c5fa2bd` | `bf98d8164c5fa2bd` | yes |
| `data/phase-16-reader-output.schema.json` | `e6f076483364ecb5` | `e6f076483364ecb5` | yes |
| `data/phase-16-reader-instructions.txt` | `1b7759b910d7f19d` | `1b7759b910d7f19d` | yes |
| `data/phase-16-preregistration.json` | `189018ba2072c6de` | `189018ba2072c6de` | yes |

Recomputed from the structured evidence rather than from the prior report:

| quantity | value |
|---|---:|
| packetsRegistered | 4 |
| reviewsRegistered | 8 |
| reviewsCompleted | 8 |
| promoteVerdicts | 3 |
| candidatesWithTwoOfTwoPromote | 1 |
| probesRun | 1 |
| probeSurvivors | 1 |
| caaProbeFixtures | 1 |
| caaProbeDeclaredFixtureClasses | 2 |
| enforcementStrategiesRun | 8 |
| publicRuleViolationsCaughtNowhere | 5 |

CAA received two independent `promote` verdicts from different provider families, both bound to the
registered packet hash: **yes**.

| reader | model | verdict | all six dimensions pass | independently produced |
|---|---|---|---|---|
| openai | `openai/gpt-5.6-sol` | promote | yes | yes |
| anthropic | `anthropic/claude-opus` | promote | yes | yes |

### The declared probe against the implementation

Declared: *In one invocation, run reference, first-name-reuse mutant, and malformed output twice over one-name controls and multi-name denied-tail cases.*

The suspected mismatch is **confirmed, and it is structural rather than incidental.** The frozen runner
is `(subject) => ProbeSubjectRun`; it takes no fixture parameter, so no amount of repetition could have
reached a second case. It visited 1 fixture with 2 names, 2 of them stale and 0 fresh, at ages
[10,11] - values that are not in the candidate's own declared age envelope [0,8,9,24,719], and that never
touch the eight- or nine-hour boundary. Reference ran 2 times, the mutant 1, malformed output 1.
One-name controls executed: **0**.

The audit also found two defects the prompt did not suspect, and they matter more than the fixture gap:

- **`witnessIsolated` carries no evidence for this candidate.** The private sentinel is bound to a
  standalone `marker` constant; it is absent from the CAA authority map (`sentinelInCaaAuthorityMap: no`)
  and from the query ledger, so the check has no reachable failing branch.
- **`challengeNonleakage` cannot fail either.** The sentinel occurs 0 times in the contract artifact and
  0 times in the packet artifact, so the assertion is unfalsifiable as constructed.

That is `DEFECT-TAXONOMY.md` B5, a check that never fires, living inside a B6 rig - the one place this
repository has already been burned once.

### What is retained as real

- The declared first-name-reuse mutant activated on the multi-name denied-tail fixture and failed exactly check-caa-per-name-binding and check-caa-safe-issuance.
- The reference passed that fixture with zero failures, in the same invocation as the mutant, so the B6 known-good/known-bad control is genuine and nondegenerate.
- Malformed output was refused rather than graded, once.
- Reference replay reproduced byte-identically.
- Both reader promotions are real, cross-family, independently produced, and bound to the registered packet hash.

### What is marked incomplete

- The declared one-name control class was never executed, so `the mutant passes where it is behaviorally equivalent to the reference` is untested.
- The declared malformed repetition (twice) ran once.
- The probe fixture's ages sit outside the declared validation-age-hours envelope and never touch the eight- or nine-hour boundary.
- witnessIsolated and challengeNonleakage carry no evidence: neither has a reachable failing branch in the frozen probe.

### Supersession

These claims are superseded, not rewritten. The Phase 16 artifacts keep their original bytes:

- reports/PHASE-16-DISCOVERY-V3.md, Probe Gate: the clauses `the authority witness remained inaccessible, and the challenge did not leak it`
- data/phase-16-probe-results-final.json: the fields `witnessIsolated: true` and `challengeNonleakage: true` for the CAA candidate
- The description of the CAA candidate as an exact full-procedure probe survivor

**Correction.** Phase 16's CAA probe is a real, nondegenerate, single-fixture B6 mutant discrimination. It is not the declared full-procedure probe, and two of its seven reported controls are unfalsifiable as constructed. The REPEAT-DISCOVERY decision does not change - it rests on the count of reader-and-probe survivors, and the survivor's mutant discrimination is retained - but the candidate must be described as a partial-procedure probe survivor until Phase 17's exact Probe V2 runs.

### The reader-raised risks, classified

Screen 6 of `DEFECT-TAXONOMY.md` says: for every stated rule, write a subject that violates it and
confirm some check fails. Eight strategies were run against the Phase 16 CAA metric set implemented
exactly as its own `deterministicProcedure` text describes, under the strictest reading that text
supports. **5 of 7 rule-violating strategies were caught by nothing at all.**

| id | issue | class |
|---|---|---|
| `P1-one-name-controls-never-run` | The runner signature is (subject) => ProbeSubjectRun and carries no fixture parameter, so exactly 1 fixture can be visited. That fixture has 2 names, 2 of them stale. One-name controls run:  | **verifier-completion** |
| `P2-malformed-repetition-shortfall` | malformedRefused(...) is invoked 1 time(s) in runPhase16Probe. | **verifier-completion** |
| `P3-fixture-outside-declared-envelope` | The probe fixture uses nowHour 20 and validatedAtHour [10,9], giving ages [10,11]. Inside the declared envelope: false. The eight- and nine-hour boundary values are never exercised. | **verifier-completion** |
| `P4-witness-isolation-control-vacuous-for-caa` | runCaa binds the private sentinel to a standalone `marker` constant. Sentinel present in the CAA hidden authority map: false. The map holds only ALLOW/DENY, and neither it nor the query ledg | **verifier-completion** |
| `P5-challenge-nonleakage-control-vacuous` | challengeNonleakage asserts the sentinel is absent from the contract's public sections. The sentinel occurs 0 time(s) in the contract artifact and 0 time(s) in the packet artifact, so the as | **verifier-completion** |
| `R1-facade-callable-and-return-contract` | The name, arity and return domain are stated. Synchrony, totality over unknown names, error behavior and whether `run` may return a promise are not stated anywhere in the contract. | **prose-only-clarification** |
| `R2-exactly-once-stated-but-not-graded` | The declared metric is caa-stale-name-query-count >= 1 over the whole fixture. strategy `duplicate-same-name-queries` escaped every declared metric on ["multi-name-denied-tail","age-boundary | **prose-only-clarification** |
| `R3-duplicate-same-name-queries-pass` | Repeating a query for a name already correctly queried passes every metric (strategy `duplicate-same-name-queries` escaped every declared metric on ["multi-name-denied-tail","age-boundary-ei | **no-defect** |
| `R4-age-eight-versus-nine-not-discriminated` | No declared metric grades the reported answer for a FRESH name, so an off-by-one that treats age eight as stale is invisible even when cached and current disagree: strategy `boundary-inclusi | **verifier-completion** |
| `R5-one-name-deny-position-degenerate` | The sampling procedure defines no collapse rule, so `domain-count: 1` crossed with `middle` or `last`, and `domain-count: 2` crossed with `middle`, name no instance. | **prose-only-clarification** |
| `R6-output-source-semantics-ungraded` | `source` is syntactically required and semantically ungraded: strategy `wrong-source-labels` escaped every declared metric on ["multi-name-denied-tail","age-boundary-eight-disagreeing","all- | **prose-only-clarification** |
| `R7-always-refuse-and-fabrication` | Only the unsafe-ISSUE half is metered. strategy `always-refuse` escaped every declared metric on ["multi-name-denied-tail","age-boundary-eight-disagreeing","all-allow-multi-name"] and was ca | **verifier-completion** |
| `R8-public-rules-enforced-semantically` | The wiring is complete by identifier, and incomplete semantically. The result-order clause of reconcile-each-domain-name has no metric at all: strategy `reversed-result-order` escaped every  | **verifier-completion** |

The headline result of this classification is that **nothing is fatal and nothing is a material contract
change.** Every substantive finding is a verifier completion that enforces a clause already public in the
packet both readers reviewed, and the four prose items resolve omissions without narrowing any
obligation.

## 2. Contract Changes And Whether Fresh Reader Review Was Required

**Fresh 2-of-2 blind review required: no.**

A metric that enforces an already-public clause cannot exclude a subject that satisfies the published specification, so the valid-solution set is unchanged and the blind reviews remain bound to the semantics they reviewed. The four prose items resolve omissions without narrowing obligations. If any item had narrowed the valid-solution set, a new packet and fresh 2-of-2 blind review would be required before trials.

Verifier completions, each enforcing text already public:

- check-caa-applicable-answer enforces reconcile-each-domain-name for EVERY name, including the `otherwise use its own cachedCaa` clause that no Phase 16 metric covered.
- check-caa-decision-faithful enforces the ISSUE half of caa-all-names-must-authorize, which is published as an if-and-only-if and metered only on the unsafe-ISSUE side.
- check-caa-result-shape enforces `one result bound to each input name in the original order`, which had no metric at all.

Prose-only clarifications, each leaving the valid-solution set unchanged:

- caa.current is synchronous, total over any string, and returns ALLOW or DENY; run may return an OrderReport or a promise of one.
- Extra or duplicate queries are permitted; each stale name requires at least one same-name query. This states the graded semantics that both readers reviewed.
- The result `source` field is syntactically required and semantically ungraded.
- deny-position `middle` requires domain-count >= 3 and `last` requires domain-count >= 2; a one-name order admits only `none` and `first`.

## 3. Exact Probe V2 Registration And Outcome

Registration `phase17-caa-exact-probe-v2` at SHA-256 `3293dad7230c255f14d54a33440652eae5befb4c1ee6c6c791e858dbefcfdf6c`,
implementation `src/phase-17/probe-v2.ts` at `4aa18095e7a8596cf5e2b750f13a887f2a06b6919f6ef018612a916f7b2a4228`.
The implementation lives outside frozen Phase 16 code and `src/phase-16/probes.ts` was not edited.

**Outcome: `PROBE-V2-PASSED`.** Registered cells: 72. Mismatches against the frozen
expected matrix: **0**. Kill reasons: none.
Implementation hash matches the registration: yes.

| fixture | names | stale | fresh | ages | deny position | all applicable allow |
|---|---:|---:|---:|---|---|---|
| `one-name-stale-allow` | 1 | 1 | 0 | [9] | none | yes |
| `one-name-stale-deny` | 1 | 1 | 0 | [9] | first | no |
| `multi-name-denied-tail` | 3 | 3 | 0 | [24,24,24] | last | no |
| `mixed-fresh-stale-identity` | 3 | 2 | 1 | [0,24,9] | none | yes |
| `age-boundary-eight` | 2 | 1 | 1 | [8,9] | none | yes |
| `age-boundary-nine` | 2 | 1 | 1 | [9,0] | first | no |
| `all-fresh-no-query-required` | 2 | 0 | 2 | [0,8] | none | yes |
| `five-name-denied-middle` | 5 | 3 | 2 | [719,0,9,8,24] | middle | no |

Required outcomes, each observed:

- Reference passes every fixture: yes (8/8 clean).
- The first-name-reuse mutant passes both one-name controls: yes.
- It activates on multi-name cases: yes.
- Off-by-one, duplicate-query, no-work, fabricated-result and always-refuse each fail their intended check: yes.
- Malformed reports refused twice with an identical message, 10 cases: yes.
- Replay deterministic over 2 repetitions: yes.
- Private CAA state and the host query ledger remain inaccessible: yes.

**Every isolation control now carries a negative control**, which is the specific repair for the two
vacuous Phase 16 checks:

- The witness is absent from every subject-visible surface: yes.
- A deliberately leaky facade **does** trip the same detector: yes.
- The challenge carries no witness: yes; a witness-carrying view **does** trip it: yes.
- The facade's own property names are exactly ["current"], and the ledger is unreachable: yes.
- 4 stale names have a recorded answer that disagrees with the current one, so the challenge does not determine the answer without a query.

| check | activations across the 72 cells |
|---|---:|
| `check-caa-result-shape` | 6 |
| `check-caa-per-name-binding` | 26 |
| `check-caa-applicable-answer` | 20 |
| `check-caa-safe-issuance` | 17 |
| `check-caa-decision-faithful` | 6 |
| `check-caa-positive-query-work` | 18 |

Checks that never fired: **none**.

### The superseded mutant profile

Phase 16 registered the narrow mutant as failing exactly `check-caa-per-name-binding` and
`check-caa-safe-issuance`. Under the completed verifier it fails a third check on a denied tail,
because it reports ALLOW for a name whose applicable answer is DENY - a violation of a clause that was
public in Phase 16 and metered by nothing. The Phase 17 registration recorded that corrected profile
before the probe ran.

### Registration corrections

- The implementation was reformatted to satisfy the repository lint gate after its first execution, moving implementationSha256 from 9f8c238c1ec602b510bb7d40a01d8d02061421a6f8dadc6d85d147324bf23e2a to 4aa18095e7a8596cf5e2b750f13a887f2a06b6919f6ef018612a916f7b2a4228. The change is whitespace, trailing commas and bracket-to-dot property access only: the two files are identical once whitespace is stripped apart from two trailing commas, and re-running under the new hash reproduced all 72 registered cells unchanged. NOT ONE CELL OF expectedMatrix WAS EDITED - it was written before any execution and is byte-identical across this correction. The pre-format hash is recorded here so the earlier run remains checkable.
- The first draft of this registration stated expectedFailingCells 39 while its own expectedMatrix contained 41 failing cells. The matrix is the authoritative registration; the summary was an arithmetic slip in a derived field. It was corrected to 41 before the probe was executed, and no cell expectation changed.
- The first draft of this registration carried challengeSha256 c32b73e8d6f8b06e98a02ca48525514bbcebaea6a8496a063c51477635c5b21d, computed by a hashing scheme local to Phase 17. The repository already has one canonical definition in hashChallengeDir, which is what a trial recomputes from the preserved challenge directory, and two definitions of the challenge hash is how a package correction silently stops invalidating the trials it should. Phase 17 now uses the canonical scheme and the registered value is c2948f2c26f2231ceaa47d0ec2d3f04a. The package bytes did not change; only the function that names them did, and this correction was made before any paid attempt.

## 4. Runnable Package Architecture And Challenge Hash

Family `caa-revalidation`, challenge hash `c2948f2c26f2231ceaa47d0ec2d3f04a`, scenario set
`revalidation-24-bd3bcd60`: 24 graded scenarios drawn from a 192-point declared space.

Visible surface: `MANIFEST.json`, `README.md`, `SPEC.md`, `examples/example-1-boundary-ages.json`, `examples/example-2-single-name.json`, `examples/example-3-five-names-mixed.json`, `starter/subject.mjs`, `types.ts`.

Hidden: `verify.ts`, `reference.ts`, `mutants.ts`, `runner.ts`, `truth.ts`, `scenarios.ts`, `matrix.json`, `answer-matrix.json`, `current-authority.json`, `query-ledger.json`, `reports/`.

| public rule | checks that enforce it |
|---|---|
| `CAA1_RECHECK_EACH_STALE_NAME` | `caa_per_name_binding` |
| `CAA2_FRESH_NAMES_USE_THEIR_OWN_CACHE` | `caa_applicable_answer` |
| `CAA3_CONJUNCTIVE_ISSUANCE` | `caa_safe_issuance`, `caa_decision_faithful` |
| `CAA4_ONE_RESULT_PER_NAME_IN_ORDER` | `caa_result_shape` |
| `CAA5_POSITIVE_QUERY_WORK` | `caa_positive_query_work` |

The shipped starter fails 23/24 scenarios (95.8%) through the family's own verifier.
It is a neutral skeleton that never contacts the authority: it establishes the module shape and names
no part of the mechanism.

### Package controls

All controls held: **yes**.

| control | screen | held | detail |
|---|---|---|---|
| `C1-reference-passes` | rig integrity, known-good | yes | the reference failed 0 of 24 graded scenarios |
| `C2-every-mutant-independently-fatal` | screen 8, independent fatality | yes | first-name-reuse:caa_per_name_binding=18 boundary-inclusive:caa_applicable_answer=13 boundary-lenient:caa_per_name_binding=20 cardinality-only-queries:caa_per_name_binding=18 reversed-order:caa_result_shape=22 no-query:caa_positive_query_work=23 always-refuse:caa_decision_faithful=11 always-issue:caa_safe_issuance=13 fabricated-result:caa_per_name_binding=23 |
| `C3-no-unrelated-mutant-failure` | screen 8, narrowness | yes | every graded subject other than the reference fails somewhere in the measured set |
| `C4-starter-fails-widely-without-leaking` | screen 7, starter | yes | starter fails 23/24; package leak check: no leak or missing-surface finding |
| `C5-no-op-and-always-refuse-fail` | screen 6, enforcement of the liveness and approval halves | yes | no-query=23 always-refuse=11 always-issue=13 |
| `C6-malformed-refused` | B6, an empty input is not a failing input | yes | a wrong-shaped verification input raises rather than returning a verdict |
| `C7-mechanism-activation` | screen 2, activation audit | yes | first-name-reuse fails 18/18 activated and 0/6 control scenarios |
| `C8-witness-isolation-with-canary` | B5 applied to the isolation control itself | yes | isolated=true; the deliberately leaky facade tripped the detector=true |
| `C9-deterministic-replay` | reproducibility | yes | two independent sweeps produced byte-identical cells |
| `C10-challenge-nonleakage` | screen 3, content-based leak audit | yes | no visible file carries the authority witness, the denied-position resolver, or a mutant identifier |
| `C11-registry-and-router-consistent` | family-list drift | yes | route, 6 checks and 5 rule codes agree with the family modules |
| `C12-every-public-rule-enforced-and-every-check-fires` | screen 6 and screen 5, in both directions | yes | never-firing checks: none; public rules with no check: none |

## 5. Scenario Activation Map

Fatality is reported over the named activated stratum, never over the whole matrix.

| subject | intended check | activated failing | control failing | intended check fatal in |
|---|---|---|---|---:|
| `reference` | - | 0/18 | 0/6 | 0 |
| `first-name-reuse` | `caa_per_name_binding` | 18/18 | 0/6 | 18 |
| `boundary-inclusive` | `caa_applicable_answer` | 11/18 | 2/6 | 13 |
| `boundary-lenient` | `caa_per_name_binding` | 17/18 | 3/6 | 20 |
| `cardinality-only-queries` | `caa_per_name_binding` | 18/18 | 2/6 | 18 |
| `reversed-order` | `caa_result_shape` | 18/18 | 4/6 | 22 |
| `no-query` | `caa_positive_query_work` | 18/18 | 5/6 | 23 |
| `always-refuse` | `caa_decision_faithful` | 7/18 | 4/6 | 11 |
| `always-issue` | `caa_safe_issuance` | 11/18 | 2/6 | 13 |
| `fabricated-result` | `caa_per_name_binding` | 18/18 | 5/6 | 23 |

The incident's own mechanism separates cleanly: `first-name-reuse` fails every activated scenario and no
control scenario. The controlling parameter is the number of names that are actually rechecked, and two
is the threshold.

**A mutant written to embody the error is not evidence that an agent will make it.** Section 7 records
what the agents actually did.

## 6. Trial Preflight And Spending Authorization

| item | status |
|---|---|
| Docker daemon | yes, server 29.3.1 |
| provider image | `agent-eval-foundry/provider-agent:claude-2.1.260-codex-0.152.1` |
| image digest | `sha256:1dfbe421ae3c90efd543c8e2403bf7fc2f3cbe081fff217076eb650cae161cc4` |
| container plan B6 | yes |
| openai subject / labelling | yes / yes - a Codex credential file exists at ~/.codex/auth.json; its contents were not read |
| anthropic subject / labelling | no / no - CLAUDE_CODE_OAUTH_TOKEN is absent from this process environment |
| package controls | yes |
| Probe V2 | PROBE-V2-PASSED |
| blocking conditions | the anthropic credential is absent, so its subject trials and blind labels cannot run; a cross-provider requirement is never weakened to route around one unavailable provider |
| ready for paid trials | no |

Estimated maximum priced spend was **$9.96** - ESTIMATED, not measured.
ESTIMATED, not measured. Anthropic per-call figures are this repository's own Phase 14 subject telemetry ($1.99 over 4 attempts) and Phase 16 reader telemetry ($2.9878 over 4 reads). OpenAI attempts are unpriced and contribute nothing to this figure, so the true total will exceed it by an unknown OpenAI amount.

The preflight, the caps and that estimate were reported to the operator before any paid attempt, and
the operator authorized the campaign at the registered caps. An earlier preflight correctly recorded
the Anthropic credential as absent and blocked; the campaign began only after it was present. The
cross-provider requirement was never weakened while one provider was unavailable.

## 7. Raw Trial Matrix And Countability

| attempt | provider | model | classification | counts | reward | failed | checks | hash current | grading B6 | runtime | cost |
|---|---|---|---|---|---:|---|---|---|---|---:|---:|
| `phase17-caa-slot-1-openai` | openai | `openai/gpt-5.6-sol` | completed | yes | 1 | 0/24 | none | yes | yes | 48s | unpriced |
| `phase17-caa-slot-2-anthropic` | anthropic | `claude opus` | completed | yes | 1 | 0/24 | none | yes | yes | 88s | $0.4328 |
| `phase17-caa-slot-3-openai` | openai | `openai/gpt-5.6-sol` | completed | yes | 1 | 0/24 | none | yes | yes | 80s | unpriced |
| `phase17-caa-slot-4-anthropic` | anthropic | `claude opus` | completed | yes | 1 | 0/24 | none | yes | yes | 100s | $0.4131 |

| quantity | value |
|---|---:|
| attempted | 4 |
| countable | 4 |
| cleanSolves | 4 |
| rewardZero | 0 |
| retries | 0 |
| blindLabelsRequired | 0 |
| blindLabelsRun | 0 |
| agreedCapabilityFailures | 0 |
| pricedSubjectSpendUsd | 0.845969 |
| unpricedAttempts | 2 |
| pricedLabelSpendUsd | 0 |
| pricedCampaignSpendUsd | 0.845969 |

Stopping rule fired: **S1 - all first-stage trials were clean solves, so the campaign stops here**

Exact 95% Clopper-Pearson interval on the reward-zero rate over 4 independent attempts:
**[0.000, 0.527]**. Zero observed failures does not establish a zero
population failure rate, and **no benchmark solve-rate bound is claimed from this campaign.** The
interval is wide because four trials is a smoke test, not a matrix.

### The registered prediction, scored

| registered before any attempt | predicted | observed |
|---|---:|---:|
| first-stage clean solves | 4 | 4 |
| decision | VALID-BUT-EASY | VALID-BUT-EASY |
| per-trial failure probability | 0.15 | 0/4 observed |

Registered reasoning: *docs/INHERITED-EVIDENCE.md places a discovery that is a direct consequence of a rule stated in the instruction at p >= 0.85, and this candidate sits on that row: CAA1 states the identity binding outright and the specification's forbidden outcomes name the historical anti-pattern in words. The Phase 16 Anthropic reader independently registered the same concern before any of this was built, calling the candidate valid but likely low-yield because the source failure arose inside a large existing codebase with count-asserting tests while the derived task is greenfield with the anti-pattern named. Section 8 of the same document says the axis that works is whether the agent's natural self-check covers the rule; a fifteen-line pure function is small enough that most self-checks will.*

The prediction was right, and it was right for the reason recorded in advance. That is worth more than
the null result itself: the foundry's own inherited calibration correctly ranked this candidate before a
dollar was spent, and one of the Phase 16 readers registered the same concern before the package existed.

## 8. Blind Labels And Disagreements

Countable reward-zero trials: **0**. Blind labels owed: **0**. Blind labels run: **0**.
Agreed capability failures: **0**.

No labelling was owed because no counted attempt failed. Reward zero and capability difficulty remain
separate quantities, and with zero reward-zero attempts there is nothing to attribute in either
direction. This is protocol compliance, not missing adjudication.

## 9. Self-Check Behavior And Failure Concentration

There is no failure concentration to report: no scenario failed for any counted subject. The
self-check evidence is the informative half, and it is the axis `INHERITED-EVIDENCE.md` section 8 names
as the one that decides a hard task - *does the agent's natural self-check cover the rule?*

| attempt | wrote a self-check | ran it | tracked query identity | exercised the age boundary | named the identity-collapse mode |
|---|---|---|---|---|---|
| `phase17-caa-slot-1-openai` | yes | yes | yes | yes | yes |
| `phase17-caa-slot-2-anthropic` | yes | yes | yes | yes | yes |
| `phase17-caa-slot-3-openai` | yes | yes | no | yes | yes |
| `phase17-caa-slot-4-anthropic` | yes | yes | no | yes | yes |

**4 of 4 wrote and executed a self-check** (yes), 2 tracked which fqdn each query named,
4 exercised the recheck-window boundary, and 4 named the identity-collapse failure mode explicitly in
the transcript.

That is the exact inverse of the durable-outbox 6/6 result, where five of six either wrote no checker or
wrote one that could not express the rule under test. Here every agent's natural self-check covered the
rule, so the wall the outbox found is simply not present. Machine-readable self-check outcomes do not
survive capture, so `selfCheckOutcomeCaptured` stays false rather than being read out of model prose.

The submissions corroborate it directly: all four are close paraphrases of the reference, and both
Anthropic submissions cite the published rule codes `CAA1`, `CAA2` and `CAA3` in their comments while
implementing exactly what those rules say.

## 10. Validity Controls Versus Candidate Hardness Operators

These are permanently enabled and are **not** hardness operators. Calling any of them one is how a
validity repair gets mistaken for a difficulty result:

- an explicit adjudicating specification
- subject-inaccessible authority
- an identity-aware external verifier
- positive-work enforcement
- anti-cheat architecture
- reference correctness
- B6 controls in every grading invocation
- malformed-input refusal
- deterministic capture and replay

These were modelled separately as candidate difficulty or selection operators. Every row's local
activation is read from the package-control artifact; every agent effect is read from the trial
ledger. Nothing in this table is typed in by hand:

| candidate operator | class | subject carrying it | local activation | agent effect |
|---|---|---|---|---|
| multiple identities rather than one | difficulty | `first-name-reuse` | 18/18 activated, 0/6 control, intended check fatal in 18 | null: 0/4 countable attempts failed |
| cardinality-preserving wrong identity binding | difficulty | `cardinality-only-queries` | 18/18 activated, 2/6 control, intended check fatal in 18 | null: 0/4 countable attempts failed |
| mixed fresh and stale state | difficulty | `boundary-lenient` | 17/18 activated, 3/6 control, intended check fatal in 20 | null: 0/4 countable attempts failed |
| cache/current disagreement at the age boundary | difficulty | `boundary-inclusive` | 11/18 activated, 2/6 control, intended check fatal in 13 | null: 0/4 countable attempts failed |
| denied member placed away from the first position | selection | `always-issue` | 11/18 activated, 2/6 control, intended check fatal in 13 | null: 0/4 countable attempts failed |
| one result per name in the requested order | difficulty | `reversed-order` | 18/18 activated, 4/6 control, intended check fatal in 22 | null: 0/4 countable attempts failed |
| scenario selection against count-only self-checks | selection | `fabricated-result` | 18/18 activated, 5/6 control, intended check fatal in 23 | null: 0/4 countable attempts failed |

**The measured operator ranking from this phase is empty.** No operator here has a demonstrated positive
agent effect, and that is now true across Phase 14 and Phase 17 for every operator either phase has
measured.

## 11. Final Decision

**`VALID-BUT-EASY`.**

The package passed its exact probe and all twelve package controls, and the registered first-stage campaign produced no countable reward-zero trial in either provider family. There is therefore no agreed capability failure to attribute, and no blind labelling was owed.

Against the registered decision rules: `TRANSFER-READY` required at least two agreed capability failures
with at least one from each provider family and got zero of each. `CANDIDATE-INVALID` required a probe,
contract, verifier, witness-boundary or package-control failure and got none - the probe passed all
72 registered cells and all 12 package controls held. `INCONCLUSIVE` required single-family evidence,
label disagreement, or slots that could not be completed; all four registered slots completed cleanly in
both families, so the campaign is not short of evidence for the question it asked.

Do not transfer this as a hardness recipe. Its solve patches and trajectories are instead the repair
material for the foundry's hardness-ranking features.

## 12. Recommendation For The Following Phase

**Do not run a controlled transfer of this recipe.** Phase 18 should use this phase's four solve
trajectories to repair hardness ranking before another discovery run, in this order:

1. **Add a self-check-coverage predictor to the contract gate, and make it a ranking feature rather than
   a pass/fail one.** The measured discriminator across both this phase and the durable outbox is whether
   a competent agent's natural self-check covers the graded rule. Here 4 of 4 covered it; on the outbox 5
   of 6 did not. The gate currently has no feature that would have separated them, and it ranked this
   candidate 85 out of a possible 85.
2. **Penalise a candidate whose forbidden-outcomes text names the historical anti-pattern in words.**
   Fairness requires the graded rule stated; it does not require the specific wrong implementation
   named. `INHERITED-EVIDENCE.md` section 7 already records that the authored specification is the answer
   key, and section 4 records that moving a rule from A2 to A3 always reduces failures. This candidate is
   the measured instance: the anti-pattern is named in the contract, and every agent avoided it.
3. **Penalise small artifact size.** The reference here is roughly fifteen lines with one decision. The
   source project's own conclusion was that pushing below a coin-flip needs a second independent decision
   of comparable difficulty; this candidate has one.
4. **Keep the enforcement screen that Lane 0 introduced, and run it on every candidate contract before a
   reader packet is built.** It found five stated-and-unenforced clauses in a candidate that two
   independent frontier readers had already passed on contract fairness. Readers do not run subjects;
   this screen does.
5. **Require a negative control for every isolation and non-leakage claim.** Two of Phase 16's seven
   reported controls could not fail. Any claim of the form *X did not leak* must ship a canary that trips
   the same detector, or it is not evidence.
6. **Then repeat Discovery V3 on a fresh bounded corpus**, treating this candidate the way Phase 16
   treated the WAF candidate: a retrospective calibration fixture, not a prospective numerator.

The candidate itself stays checked in as a **valid, measured, easy** package. That is genuinely useful:
it is the repository's first prospectively discovered candidate that is fair, enforced, cheat-resistant
and agent-solvable end to end, which makes it a calibration fixture with a known answer rather than
another withdrawal.

## Corrections And Limits

- The Phase 16 CAA probe is retained as a real single-fixture B6 mutant discrimination and is no longer
  described as the declared full-procedure probe. Two of its seven reported controls carried no evidence.
- **A frozen reader packet's hash depended on live repository state.** Both Phase 15 and Phase 16 built
  their reader packets by reading the built-family registry at render time, so adding this phase's family
  changed the Phase 16 CAA packet from `45475d79...` to `9bf28a39...` - the packet whose 2-of-2 promotion
  is the entire basis for building the candidate. Phase 15 failed loudly; **Phase 16 did not**, because
  its continuation compares stored reviews against stored packets and never re-renders. The baseline both
  runs used is now recorded in `data/phase-novelty-baseline-2026-09.json` and read from there, and all
  four Phase 16 packets reproduce their frozen hashes again. No preserved review, transcript, packet hash
  or registration was altered.
- The Probe V2 implementation was reformatted for the lint gate after its first execution. The
  registration records both hashes; the expected matrix was written before any execution and is
  byte-identical across that correction.
- The challenge hash was re-registered onto the repository's canonical `hashChallengeDir` scheme before
  any paid attempt, so one definition names the package rather than two.
- Codex reports token usage and no dollar price. Its cost stays null and is counted as unpriced, never
  converted with a rate literal, so the priced total understates true spend by an unknown OpenAI amount.
- A self-check is not marked green from model prose. `selfCheckOutcomeCaptured` remains false for every
  attempt.
- Four countable attempts is a smoke test. It cannot distinguish a solve rate of 0.00 from one of 0.5,
  and the reported interval says so.
- The provider image is pinned by CLI versions and recorded image identity, but provider API behavior is
  external and networked; this is weaker than the source task's Harbor boundary.
- Local timestamps and transcript ordering establish local chronology only, not independent third-party
  proof.

## Reproducibility Inputs

| input | SHA-256 |
|---|---|
| phase16ProbeAudit | `bf98d8164c5fa2bdcbc07d122d4fee9b2fa758186d27505f6ccfb33f417f0023` (frozen probe) |
| probeV2Registration | `3293dad7230c255f14d54a33440652eae5befb4c1ee6c6c791e858dbefcfdf6c` |
| probeV2Implementation | `4aa18095e7a8596cf5e2b750f13a887f2a06b6919f6ef018612a916f7b2a4228` |
| challengePackage | `c2948f2c26f2231ceaa47d0ec2d3f04a` |
| scenarioSet | `revalidation-24-bd3bcd60` |
| providerImageDigest | `sha256:1dfbe421ae3c90efd543c8e2403bf7fc2f3cbe081fff217076eb650cae161cc4` |

Every number above comes from generated structured data in `data/phase-17-*.json` and the preserved
attempt directories under `trials/caa-revalidation/`, except the maximum-spend figure in section 6,
which is explicitly labelled estimated. This report regenerates byte for byte from those artifacts.
