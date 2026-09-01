# Self-check behaviour

Did the model verify its own work — and can we actually tell?

## The headline, in two numbers that must not be merged

| | |
|---|---:|
| submissions held | 26 |
| **submissions containing an executable self-check** | **2** |
| **transcripts describing one** | **18** |
| **submissions shipping a checker as a separate file** | **2** |
| runs that neither shipped nor described one | 8 |

Checker-required trials mandate `checker.mjs`; that file is graded in the checker-required
family reports and is excluded from the voluntary shipped-checker count here.

**2 of 26 submissions contain an executable self-check.** The rows below name the exact construct and the line it sits on.

## What each run did

`observed` is source we hold and anyone can re-check. `self-reported` is the model's own account
of what it did during the session, which is evidence about what it attempted and **not** evidence
that it happened. The two columns are never added together.

| run | family | subject | observed | shipped files | self-reported | evidence state | scenarios failed |
|---|---|---|---|---|---|---|---:|
| `access-token-2026-08-o1` | expansion | `gpt-5.6-sol` | **none** | subject only | syntax-only | counted | 0 |
| `checker-required-2026-08-o1` | poisoning | `gpt-5.6-sol` | **none** | subject only | — | counted | 614 |
| `delegated-wallet-2026-08-o1` | reconciliation | `gpt-5.6-sol` | **none** | subject only | example-harness | counted | 0 |
| `pic-claude-1` | containment | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `pic-claude-2` | containment | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `pic-claude-3` | containment | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `pic-codex-1` | containment | `gpt-5.6-sol` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `pic-haiku-1` | containment | `claude-haiku-4-5` | **none** | subject only | — | counted | 0 |
| `pic-sonnet-1` | containment | `claude-sonnet-5` | legality-table | **+`_test.mjs`** | — | counted | 0 |
| `mp-claude-1` | poisoning | `claude-opus-5` | **none** | subject only | — | **superseded** | 0 |
| `mp-claude-2` | poisoning | `claude-opus-5` | **none** | subject only | synthetic-scenarios | **superseded** | 47 |
| `mp-claude-3` | poisoning | `claude-opus-5` | **none** | subject only | synthetic-scenarios | **superseded** | 32 |
| `mp-claude-r1` | poisoning | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 32 |
| `mp-claude-r2` | poisoning | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `mp-claude-r3` | poisoning | `claude-opus-5` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `mp-codex-1` | poisoning | `gpt-5.6-sol` | **none** | subject only | synthetic-scenarios | counted | 0 |
| `mp-codex-2` | poisoning | `gpt-5.6-sol` | **none** | subject only | synthetic-scenarios | counted | 13 |
| `mp-codex-3` | poisoning | `gpt-5.6-sol` | **none** | subject only | example-harness | counted | 32 |
| `mp-gemini-1` | poisoning | `gemini-3-pro` | **none** | subject only | — | **infra** | 0 |
| `mp-haiku-1` | poisoning | `claude-haiku-4-5` | **none** | subject only | — | counted | 32 |
| `mp-sonnet-1` | poisoning | `claude-sonnet-5` | **none** | subject only | legality-table | counted | 42 |
| `ui-claude-1` | replay | `claude-opus-5` | **none** | subject only | fuzzing | counted | 46 |
| `ui-claude-2` | replay | `claude-opus-5` | **none** | subject only | — | counted | 33 |
| `ui-codex-1` | replay | `gpt-5.6-sol` | **none** | subject only | example-harness | counted | 90 |
| `ui-haiku-1` | replay | `claude-haiku-4-5` | **none** | subject only | — | counted | 62 |
| `ui-sonnet-1` | replay | `claude-sonnet-5` | example-harness | **+`_test_edge.mjs`, `_test_harness.mjs`** | — | counted | 62 |
| `live-dom-2026-08-o1` | dom | `gpt-5.6-sol` | **none** | subject only | — | **infra** | 0 |
| `live-dom-2026-08-o2` | dom | `gpt-5.6-sol` | **none** | subject only | syntax-only | counted | 219 |

### The strongest self-reported behaviours, quoted

Quoted rather than summarised, because the classification is only as good as the text under it
and a reader should be able to disagree with the label without re-reading the transcripts.

**Superseded runs are included here and their failure counts are not.** A model's account of how
it verified itself is evidence about that model's behaviour, and a later repair to the family does
not un-write the transcript. What the repair does invalidate is the OUTCOME — the failure count is
about a task that no longer exists — so those rows carry the state and omit the number.

**`ui-claude-1`** — fuzzing, 46 scenarios failed

> E` reason vocabulary. - **6120-scenario fuzz** over two mutations at independent depths × confirmation ×

**`mp-sonnet-1`** — legality-table, 42 scenarios failed

> **Lifecycle/audit**: follows the exact legal transition graph (`PROPOSED→RECALLED→POLICY_CHECKED→{APPROVED→EXECUTED

**`mp-claude-r1`** — synthetic-scenarios, 32 scenarios failed

> nder M4 in the `vector_note` example. - 14 synthetic scenarios covering M0/M2/M3/M5/M6, rule precedence (M1 befo

**`mp-codex-2`** — synthetic-scenarios, 13 scenarios failed

> passed with a local mock harness, plus synthetic checks for M0 through M6.

**`pic-claude-1`** — synthetic-scenarios, 0 scenarios failed

> executing in every case. I also built 20 synthetic scenarios covering the five rules the examples don't exerci

**`pic-claude-2`** — synthetic-scenarios, 0 scenarios failed

> ate actions executing in every one. - **15 synthetic cases** covering the attacks with no example (`secret_exfil

**`pic-claude-3`** — synthetic-scenarios, 0 scenarios failed

> n every one, no invariant violations. - 24 synthetic cases: every rule reached, including ones the examples don'

**`pic-codex-1`** — synthetic-scenarios, 0 scenarios failed

> ions and invoke only permitted calls. - Synthetic checks cover all eight policy rejection codes in order. - Audit tr

**`mp-claude-r2`** — synthetic-scenarios, 0 scenarios failed

> over-declared provenance. I also built synthetic scenarios for the five rules the examples don't reach — `M0` (unknown

**`mp-claude-r3`** — synthetic-scenarios, 0 scenarios failed

> 4 under `vector_note` in example 3. - **17 synthetic scenarios** covering each rule path and the precedence pair

**`mp-codex-1`** — synthetic-scenarios, 0 scenarios failed

> examples - audit transition validity - synthetic cases for `M0` through `M6` Only file present in `submission/` i

**`mp-claude-2`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> eir stated outcomes exactly. I also ran 12 synthetic scenarios covering the rule codes the examples don't exerci

**`mp-claude-3`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> aundering, and both store kinds against synthetic scenarios. **One thing I'd flag:** where a segment has a `memoryKey`

## Who shipped their checker

2 of 28 runs left a file beside `subject.mjs`. The task asks for one file and
does not forbid a second; almost every model ships one anyway. A model that ships its checker has
made its verification auditable by somebody else — a different act from verifying and discarding,
and the only self-check evidence on this page that does not rest on the model's own account.

| run | subject | files shipped beside the artifact |
|---|---|---|
| `pic-sonnet-1` | `claude-sonnet-5` | `_test.mjs` |
| `ui-sonnet-1` | `claude-sonnet-5` | `_test_edge.mjs`, `_test_harness.mjs` |

**Every one of them is `claude-sonnet-5`.** That is a behavioural difference between models visible in the artifacts rather than in their prose, and it is the kind of thing a pass rate cannot show. With 2 run(s) it is an observation and not a rate; what makes it worth recording is that no other subject did it on any family.

## What kinds of checking were described

| kind | runs | what it means |
|---|---:|---|
| `syntax-only` | 5 | `node --check` or equivalent: the file parses, and nothing else was established |
| `example-harness` | 4 | the published examples, run through a driver the model wrote |
| `assertions` | 1 | executable assertions or invariant checks that fail loudly |
| `legality-table` | 5 | an explicit table of permitted states or transitions, consulted rather than reasoned about each time |
| `synthetic-scenarios` | 11 | inputs the model invented beyond the ones it was given |
| `fuzzing` | 1 | randomized or exhaustive generation over an input space |

Ordered weakest to strongest. `syntax-only` — `node --check` — is included because several runs
cite it as verification, and a file that parses has established nothing about its behaviour.

## Checkers that exist and are never called

_None._ No submission defines a checking routine it never invokes. That is worth stating because it is the most misleading artifact a scan can meet: it matches every pattern and does nothing at run time.

## Does self-verification predict passing?

| arm | counted runs | failed something |
|---|---:|---:|
| described verification at or above an example harness | 16 | 7 |
| did not | 7 | 5 |
**Decidable, barely.** 7/16 of the self-verifying runs failed something, against 5/7 of the rest. With arms this small the comparison is suggestive at best and no test is applied to it.

## The contrast that makes this worth measuring

**`cc267-claude-1` (Klavis durable-outbox, Claude Opus)** — not a trial in this repository, and the only run on record
that shipped its own checker. It built:

- a `LEGAL` transition table encoding which audit edges are permitted, independently derived
- a fuzzer generating schedules and seeds beyond the ones the task shipped
- mutation tests against its own checker — deliberately breaking its implementation to confirm the checker noticed
- 900/900 clean on its own suite before submitting

And the outcome: reward 0. It avoided the `ACKED -> REVOKED` bug that caught five of six frontier trials — its legality table excluded that edge — and failed liveness instead, stranding an action in `IN_DOUBT` forever. Its checker could express the rule; its generator never reached the state where the rule bit.

That is the reason this report describes a behaviour rather than scoring a virtue. The most
thoroughly self-verified implementation on record still failed, and it failed on a state its own
generator never reached. A checker bounds what you can express; it does not bound what you
explore. **Difficulty comes from coverage of the space, not from the difficulty of stating the
rule** — which is the same conclusion the axis meter reaches from the other direction.

The same pattern shows up here without the contrast: the run describing the most rigorous
self-verification in the table above is not the run that passed.

## Why the foundry should keep measuring this

| reason | what it changes |
|---|---|
| A checker is the clearest signal of how a model APPROACHED the task | it separates 'wrote behaviour' from 'built a theory and tested it', which no pass rate distinguishes |
| Ephemeral checkers are invisible to artifact grading | every benchmark that grades one file is measuring its own submission format on this axis, and does not know it |
| It is the cheapest possible harder variant | a family that asks for the checker AND the implementation grades a different capability at no extra authoring cost |
| Coverage, not expressiveness, is where these runs fail | the failures concentrate on states the model never generated, so a family that rewards generation is testing the binding constraint |

**The concrete proposal this report exists to support:** a descendant family whose submission is
`subject.mjs` **and** `checker.mjs`, where the checker is run against the reference and against a
held-out set of known-bad implementations. A model whose checker passes the reference and catches
none of the mutants has written a checker that cannot fail, and that is a measurable, named
failure mode nothing in this repository currently grades.

## What this report will not claim

| claim | why not |
|---|---|
| that the models did not verify themselves | they say they did, and the transcripts are specific enough to believe |
| that they did | a transcript is the model's own account; nothing here re-ran their harnesses |
| that self-verification predicts outcome | the arms are large enough to compare and the comparison is reported above without a test applied to it |
| that a `separate-checker` was found by name | these families are ABOUT auditing and validating, so domain vocabulary and self-check vocabulary are the same words. That pattern was removed after crediting `auditAlreadyCompleted` — ordinary implementation logic — as a self-check |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
