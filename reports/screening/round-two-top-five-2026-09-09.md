# Trial 2: three zero rewards, two supported task failures

September 9, 2026. Five optimized successors completed fresh real-agent trials.
**Three recorded reward 0: incremental build (21), issued report (25) and variant
cache (19). Two are supported as substantive completed-but-wrong task failures.**
Both 21 and 25 passed their service suites but failed their explicitly required
release validators. Cache also failed its service suite, with a specific disagreement
between the written matching rule and the private replacement check still unresolved.

This is concrete progress for the Foundry's analyze → revise → retrial loop. Agents
completed substantial implementations and still submitted incorrect required checkers.
The original causal-replica screening already contained a checker-overconstraint failure;
these are new successor results, not the repository's first-ever checker failures.
Each package has one fresh attempt here; repeatability remains unmeasured.

Issued report's checker had a documented API-observation route to all required facts,
but preferred aggregate arrays that it parsed incorrectly. Offline replay identifies
that concrete implementation error and supports the failure assessment. Original
scores and submissions are retained alongside the diagnostic evidence.

## Recorded outcomes and audited interpretation

| Package | Requested target | Reward | Service | Required checker | Audited interpretation |
| --- | --- | ---: | ---: | ---: | --- |
| [07 — Causal replica](next-five/07-causal-replica-repair.md#trial-2--implementation-successor--september-9-2026) | Codex / Sol xhigh | 1 | 33/33 | 11/11 | Both deliverables passed |
| [21 — Incremental build](fifth-five/21-incremental-build-repair.md#trial-2--implementation-successor--september-9-2026) | Codex / Sol xhigh | 0 | 27/27 | 14/15 | Substantive required-checker failure: premature publication accepted |
| [24 — Diagnostic transport](fifth-five/24-diagnostic-transport-repair.md#trial-2--implementation-successor--september-9-2026) | Codex / Sol xhigh | 1 | 28/28 | 17/17 | Both deliverables passed; target changed from Claude |
| [19 — Variant cache](fourth-five/19-variant-cache-repair.md#trial-2--implementation-successor--september-9-2026) | Claude / Opus 5 max | 0 | 24/25 | 14/15 | Wildcard replacement fails the private rule; public matching/reuse distinction leaves attribution held |
| [25 — Issued report](fifth-five/25-issued-report-repair.md#trial-2--implementation-successor--september-9-2026) | Claude / Opus 5 max | 0 | 27/27 | 12/14 | Substantive required-checker failure: rejects valid runs despite documented observations providing the needed facts |

Four services passed their complete frozen suites. A suite pass is not proof of universal
correctness. Service and checker are both explicitly required deliverables; a checker
failure can be a real overall task failure. The private grader evaluates the submitted
checker, so a bug in the agent's checker and a defect in our grader are different things.
Checker reason text was diagnostic-only in every Trial 2 package. No zero depended on
an exact reason string. All five already required a checker in Trial 1.

## What the audit established

### 21: a valid implied consequence was missed

The frozen contract says only compiler-issued handles may be published. The raw checker
input includes ordered API observations. In the `premature-publication` control's first
cell, `built-4` is published at sequence **13**, but the compiler only issues it at
sequence **17**. The submitted checker accepts that candidate. The reference and valid
alternative are accepted correctly; the other twelve defective candidates are rejected.

The checker checks final artifact structure and round-level call counts without enforcing
issuance before use. Its final claim that it validates protocol ordering therefore exceeds
its actual coverage. No extra tutorial is needed to derive that issuance must precede
publication. Preserve this task version and prioritize a fresh independent attempt.
Do not repair the retained solver submission or add an answer hint to make this zero go away.

Trial 1's build zero was a reason-taxonomy concern. A later diagnostic regrade showed that
older checker also missed the new ordering control, but that was not a second model trial.
Trial 2 is a fresh submission from the same requested Codex pairing, with a newly written
checker and this control present before dispatch.

### 19: first recorded service failure, with an attribution concern

The service replaces a prior `/wildcard` shield entry at sequence 12, retaining the new
origin response and dropping the entry stored at time 0. Its deliveries remain correct;
only `cache_provenance` fails in `case-022`. The submitted checker also accepts the
`wildcard-eviction` negative control. Unchanged-checker replay reproduces that miss.

However, the public contract defines matching by equal path and equal values of headers
named by the old `vary`, with absent headers equal to the empty string. It separately
states that a wildcard is never **reusable**, and instructs replacement of matching entries.
For `vary: ["*"]` and empty headers, a literal application of that matching rule succeeds.
The private predicate adds `!vary.includes("*")` to matching itself, including replacement.
The bounded API expressly does not adopt the complete HTTP specification.

Thus the observed deletion is real, but classifying it as an undisputed violation of the
public contract is too strong. State wildcard **matching** semantics compactly in a new
version, without a worked eviction example, validate it, then retrial. Preserve the original
zero and its concern. Trial 1's self-fuzzing found related misses while its scored service
passed; it does not supply a second scored service failure or demonstrate durability.

### 25: a supported checker failure after correcting the rules interpretation

Actual publication rows are `{after, record: Publication}` and delivery rows are
`{after, receipt: Receipt}`. The checker reads them as flat publications and deliveries.
Its `null vnull` diagnostics are missing fields on real wrapper objects, not phantom
records created by prefix removal or the multiset comparison. The frozen checker interface
names the arrays and `after`, but does not specify either nested wrapper.

An offline replay of the unchanged checker exactly reproduced both captured verdict sets.
A separate diagnostic replay flattened **only those wrappers**, preserving all values,
ordering, observations and submitted source bytes. Both valid implementations were then
accepted. Classification became **13/14**, with `reverse-dependency-order` now wrongly
accepted. That exposes a latent substantive ordering gap: comparing publication multisets
loses required dependency order. It is useful follow-up evidence, not the cause of the
original two false rejections, a new model attempt, or a retroactive score.

A further diagnostic omits only the two aggregate arrays, exercising the submitted
checker's existing fallback to the **original, documented API observations**. Again,
both valid candidates are accepted and the dependency-order mutant is missed (13/14).
No observation, semantic fact or submitted source byte is changed. The checker already
knew how to read the sufficient documented representation; its choice to trust the
misparsed aggregate arrays caused the original false rejections.

The task explicitly documents its output verdict format, the observation envelope,
and API request/response meanings. The exact-schema rubric addresses expected outputs;
a correct checker can use the documented observations without guessing private
correctness rules. **25 is a supported substantive checker failure.** The diagnostic
ordering miss adds evidence of incomplete validation but does not change its original
12/14 score or create another model trial.

No new input-format tutorial or package rewrite is required solely by this finding.
Clarifying aggregate wrappers is an optional interface improvement; it is not a
benchmark-mandated precondition for another exploratory attempt on this frozen version.

### Rules boundary used in this review

TB3 permits expert prerequisites, deriving consequences, and hidden cases that test
stated requirements. It discourages solution hints and does not require listing each
check. Its exact structured-schema requirement addresses expected output. See the
[implementation rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-implementation.toml)
(`instruction_concision`, `test_instruction_alignment`, `structured_data_schema`)
and [proposal rubric](https://github.com/harbor-framework/terminal-bench/blob/main/docs/prompts/task-proposal.md)
(`Well-specified`). These rules do not demand a proof against every imaginable reading.

The remaining cache concern is narrower: the published header-equality definition
can match a wildcard for replacement while the private predicate explicitly cannot.
Its actual submitted code follows that distinction. This is a concrete competing
interpretation, not an automatic objection to expert inference. The result remains
reward 0, but we do not yet claim all three zeroes as undisputed fair failures.
These are repository assessments, not an external benchmark acceptance decision.

## What changed before these trials

The [engineering record](top-five-implementation-plan-2026-09-09.md) describes removal of
mostly solved public starter modules, disclosure cleanup, integrated successor controls,
diagnostic-only reasons, complete private service/checker oracles, native Harbor packaging,
and verifier isolation. All five received fresh submissions. Changes were bundled, so
these observations do not isolate the causal effect of starter removal alone.

Local oracle/control success established executability and calibration. The fresh
trials now support two required-checker failures and identify a remaining cache contract
question. Recorded outcomes, diagnostic replays and qualification remain separate.

## Execution and integrity

Exactly five retained real-provider attempts ran in the fresh campaign
`.local/round-two-top-five-2026-09-09/real-campaign-frozen/`. Each used attempt slot 1,
one signed subscription-only reservation, a 10,800-second budget, 2 CPUs and 2 GiB.
Reservations span **232 ms**, from 11:35:50.888Z to 11:35:51.120Z. The dispatching agent
recorded all five containers running concurrently via `docker ps`. No automatic retry,
substitution or timeout is recorded. Authoring times were 13m38s (07), 13m52s (21),
9m06s (24), 42m20s (19) and 19m57s (25). Time spent is not itself evidence of hardness.

The launched controller used its `frozen-source/` build, source identity
`2184eee80cf416d7c7dd07c884bdef27919889cbfeaaaa4e7cb9e0f7f6fe74c4`, and pinned author image
`sha256:3e9a15ec4fbc5c8a1d4603025392a946bb9a3ab1418ed33406eca970a225d39a`.
Earlier preparation encountered source drift and permission denials before dispatch;
the original unlaunched preparation remains under `real-campaign/`. The separate
`campaign-isolated.mjs` controller was never dispatched. No claim about malicious or
illegitimate provenance of that unused artifact is supported or needed here.

The publication audit verified **4,644/4,644 manifest-listed files**, 15 published
completion/result/grade hashes, and 20 public contract files against their frozen exports.
All five original Trial 1 document prefixes match the previously committed versions.
Three unchanged-checker replays matched the captured results. Wrapper normalization
and the documented-observation fallback were separate offline diagnostics; no new
model calls were made.

The immutable execution records remain `adjudication: unlabelled`,
`modelEvidenceEligible: false` and `countsAsModelFailure: false`. This report's assessments
of 21 and 25 do not silently alter those qualification fields. Requested model/effort settings
are not runtime attestations: Claude model strings were observed; Codex model identity
and effort/scaffold version were unobservable in the captured event streams. CLI price
estimates are not subscription charges; no paid-API fallback is recorded. Billing itself
was not independently audited.

## Next decisions

1. Prioritize **21 and 25** for independent repeats on their unchanged frozen packages.
   Both have supported required-checker failures. Do not repair retained solver artifacts.
2. Resolve **19**'s wildcard matching/replacement distinction. If its public rule is
   changed, validate the new version and retrial; preserve the original zero and analysis.
   Keep preservation controls without adding a worked solution example.
3. Lower **07/24** in the immediate difficulty-search queue after their complete passes.
   Passing calibration is necessary, but a clean solver pass does not make a task a
   stronger candidate for a failure-based qualification campaign.
4. Continue recording each trial in its existing analysis file. **20 — Workflow authority
   did not run in this campaign**; its engineering update must not be labelled Trial 2.

No six-run repeatability, official cheat qualification, external blind adjudication or
hard-task yield is claimed. New versioned work and future model dispatch are separate steps.

[Sanitized campaign evidence](evidence/2026-09-09-round-two-top-five.json) preserves recorded
scores alongside corrected assessments. [Audit evidence](evidence/2026-09-09-round-two-top-five-audit.json)
contains manifest counts, artifact hashes, the ordering witness and diagnostic verdicts.
Raw workspaces and transcripts remain local.
