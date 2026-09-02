# Self-check behaviour

Did the model verify its own work — and can we actually tell?

## The headline, in numbers that must not be merged

| | |
|---|---:|
| submissions held | 34 |
| **submissions containing an executable self-check** | **1** |
| **runs that wrote checker source and shipped none of it** | **6** |
| **transcripts describing one** | **21** |
| **submissions shipping a checker as a separate file** | **2** |
| runs that neither shipped nor described one | 9 |

Checker-required trials mandate `checker.mjs`; that file is graded in the checker-required
family reports and is excluded from the voluntary shipped-checker count here.

**1 of 34 submissions ship an executable self-check; 6 wrote one and did not ship it.**

An earlier version of this analysis grepped the submissions for `assert|invariant|sanity`, found
nothing, and concluded that models do not verify themselves. That conclusion was about our own
submission format. The `unshipped` column is the correction, and it is no longer an inference from
prose: for a trial that preserves the raw agent transcript, the checker's SOURCE is in it — the
body of each file the agent wrote, and each script it piped to a shell — and can be scanned by
exactly the patterns the submission gets. **The checker was real and ephemeral**, and on those
runs that sentence is now a measurement rather than a reading of the transcripts.

## What each run did

`observed` is source we hold and anyone can re-check. `unshipped` is source the agent wrote or
piped to a shell during the session and did not submit — also source, also re-checkable, and
invisible to anyone grading the artifact. `self-reported` is the model's own account of what it
did, which is evidence about what it attempted and **not** evidence that it happened. The three
columns are never added together.

| run | family | subject | observed | unshipped | shipped files | self-reported | evidence state | scenarios failed |
|---|---|---|---|---|---|---|---|---:|
| `access-token-2026-08-o1` | expansion | `gpt-5.6-sol` | **none** | — | graded files only | syntax-only | **superseded** | 0 |
| `checker-required-2026-08-o1` | poisoning | `gpt-5.6-sol` | **none** | — | graded files only | — | counted | 614 |
| `delegated-wallet-2026-08-o1` | reconciliation | `gpt-5.6-sol` | **none** | — | graded files only | example-harness | **superseded** | 0 |
| `deployment-alias-2026-09-claude-1` | drift | `claude-opus-5` | **none** | — | graded files only | example-harness | **superseded** | 0 |
| `deployment-model-alias-rollout-drift-2026-08-o1` | drift | `gpt-5.6-sol` | **none** | — | graded files only | syntax-only | **superseded** | 192 |
| `cc267-claude-1` | outbox | `claude-opus-5` | **none** | mutation-testing | graded files only | mutation-testing | **not-run** | 2 |
| `cc267-claude-2` | outbox | `claude-opus-5` | **none** | example-harness | graded files only | — | **not-run** | 13 |
| `cc267-claude-3` | outbox | `claude-opus-5` | **none** | example-harness | graded files only | — | **not-run** | 11 |
| `cc267-codex-1` | outbox | `gpt-5.6-sol` | **none** | assertions | graded files only | — | **not-run** | 11 |
| `cc267-codex-2` | outbox | `gpt-5.6-sol` | **none** | assertions | graded files only | — | **not-run** | 11 |
| `cc267-codex-3` | outbox | `gpt-5.6-sol` | **none** | legality-table | graded files only | — | **not-run** | 11 |
| `pic-claude-1` | containment | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | counted | 0 |
| `pic-claude-2` | containment | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | counted | 0 |
| `pic-claude-3` | containment | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | counted | 0 |
| `pic-codex-1` | containment | `gpt-5.6-sol` | **none** | — | graded files only | synthetic-scenarios | counted | 0 |
| `pic-haiku-1` | containment | `claude-haiku-4-5` | **none** | — | graded files only | — | counted | 0 |
| `pic-sonnet-1` | containment | `claude-sonnet-5` | legality-table | — | **+`_test.mjs`** | — | counted | 0 |
| `mp-claude-1` | poisoning | `claude-opus-5` | **none** | — | graded files only | — | **superseded** | 0 |
| `mp-claude-2` | poisoning | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 47 |
| `mp-claude-3` | poisoning | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 32 |
| `mp-claude-r1` | poisoning | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 32 |
| `mp-claude-r2` | poisoning | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 0 |
| `mp-claude-r3` | poisoning | `claude-opus-5` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 0 |
| `mp-codex-1` | poisoning | `gpt-5.6-sol` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 0 |
| `mp-codex-2` | poisoning | `gpt-5.6-sol` | **none** | — | graded files only | synthetic-scenarios | **superseded** | 13 |
| `mp-codex-3` | poisoning | `gpt-5.6-sol` | **none** | — | graded files only | example-harness | **superseded** | 32 |
| `mp-gemini-1` | poisoning | `gemini-3-pro` | **none** | — | graded files only | — | **infra** | 0 |
| `mp-haiku-1` | poisoning | `claude-haiku-4-5` | **none** | — | graded files only | — | **superseded** | 32 |
| `mp-sonnet-1` | poisoning | `claude-sonnet-5` | **none** | — | graded files only | legality-table | **superseded** | 42 |
| `ui-claude-1` | replay | `claude-opus-5` | **none** | — | graded files only | fuzzing | counted | 46 |
| `ui-claude-2` | replay | `claude-opus-5` | **none** | — | graded files only | — | counted | 33 |
| `ui-codex-1` | replay | `gpt-5.6-sol` | **none** | — | graded files only | example-harness | counted | 90 |
| `ui-haiku-1` | replay | `claude-haiku-4-5` | **none** | — | graded files only | — | counted | 62 |
| `ui-sonnet-1` | replay | `claude-sonnet-5` | **none** | — | **+`_test_edge.mjs`, `_test_harness.mjs`** | — | counted | 62 |
| `live-dom-2026-08-o1` | dom | `gpt-5.6-sol` | **none** | — | graded files only | — | **crashed** | 0 |
| `live-dom-2026-08-o2` | dom | `gpt-5.6-sol` | **none** | — | graded files only | syntax-only | counted | 219 |

### The strongest self-reported behaviours, quoted

Quoted rather than summarised, because the classification is only as good as the text under it
and a reader should be able to disagree with the label without re-reading the transcripts.

**Superseded runs are included here and their failure counts are not.** A model's account of how
it verified itself is evidence about that model's behaviour, and a later repair to the family does
not un-write the transcript. What the repair does invalidate is the OUTCOME — the failure count is
about a task that no longer exists — so those rows carry the state and omit the number.

**`ui-claude-1`** — fuzzing, 46 scenarios failed

> E` reason vocabulary. - **6120-scenario fuzz** over two mutations at independent depths × confirmation ×

**`pic-claude-1`** — synthetic-scenarios, 0 scenarios failed

> executing in every case. I also built 20 synthetic scenarios covering the five rules the examples don't exerci

**`pic-claude-2`** — synthetic-scenarios, 0 scenarios failed

> ate actions executing in every one. - **15 synthetic cases** covering the attacks with no example (`secret_exfil

**`pic-claude-3`** — synthetic-scenarios, 0 scenarios failed

> n every one, no invariant violations. - 24 synthetic cases: every rule reached, including ones the examples don'

**`pic-codex-1`** — synthetic-scenarios, 0 scenarios failed

> ions and invoke only permitted calls. - Synthetic checks cover all eight policy rejection codes in order. - Audit tr

**`mp-claude-2`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> eir stated outcomes exactly. I also ran 12 synthetic scenarios covering the rule codes the examples don't exerci

**`mp-sonnet-1`** — legality-table, **superseded**: outcome not quotable, behaviour still is

> **Lifecycle/audit**: follows the exact legal transition graph (`PROPOSED→RECALLED→POLICY_CHECKED→{APPROVED→EXECUTED

**`mp-claude-3`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> aundering, and both store kinds against synthetic scenarios. **One thing I'd flag:** where a segment has a `memoryKey`

**`mp-claude-r1`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> nder M4 in the `vector_note` example. - 14 synthetic scenarios covering M0/M2/M3/M5/M6, rule precedence (M1 befo

**`mp-codex-2`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> passed with a local mock harness, plus synthetic checks for M0 through M6.

**`cc267-claude-1`** — mutation-testing, **not-run**: outcome not quotable, behaviour still is

> and confirming it catches each bug. Run mutation tests against the checker Run mutation tests against the checker

**`mp-claude-r2`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> over-declared provenance. I also built synthetic scenarios for the five rules the examples don't reach — `M0` (unknown

**`mp-claude-r3`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> 4 under `vector_note` in example 3. - **17 synthetic scenarios** covering each rule path and the precedence pair

**`mp-codex-1`** — synthetic-scenarios, **superseded**: outcome not quotable, behaviour still is

> examples - audit transition validity - synthetic cases for `M0` through `M6` Only file present in `submission/` i

## Where the checkers went

2 of 36 runs left a checker in the submission, where anyone grading the artifact can
re-run it. 6 wrote verification source during the session and submitted none of it. The second
number is the one an artifact scanner cannot produce, and the difference between them is a
behavioural difference between runs rather than a claim about any model's ability.

| run | subject | shipped beside the graded files |
|---|---|---|
| `pic-sonnet-1` | `claude-sonnet-5` | `_test.mjs` |
| `ui-sonnet-1` | `claude-sonnet-5` | `_test_edge.mjs`, `_test_harness.mjs` |

Written, run, and not submitted — paths quoted from the transcript, `found` scanned by exactly
the patterns the submissions get:

| run | lab | scaffolding | wrote, did not ship | found | failed |
|---|---|---|---|---|---:|
| `cc267-claude-1` | anthropic | claude-code | `/app/check.py`, `/app/fuzz.py`, `/app/scenarios.py`, `/app/mutations.py`, 1 inline shell script(s) | mutation-testing | 2 |
| `cc267-claude-2` | anthropic | claude-code | `/app/check_invariants.py`, `/app/check_appendonly.py`, `/app/hunt.py`, 1 inline shell script(s) | example-harness | 13 |
| `cc267-claude-3` | anthropic | claude-code | `/tmp/check/verify.py`, 10 inline shell script(s) | example-harness | 11 |
| `cc267-codex-1` | openai | codex | 32 inline shell script(s) | assertions | 11 |
| `cc267-codex-2` | openai | codex | 20 inline shell script(s) | assertions | 11 |
| `cc267-codex-3` | openai | codex | 30 inline shell script(s) | legality-table | 11 |

A run in that table built something, ran it, and still failed. That is why this is reported as a
behaviour and not scored as a virtue: a checker bounds what you can EXPRESS, not what you
EXPLORE. **Difficulty comes from coverage of the space, not from the difficulty of stating the
rule** — the conclusion the axis meter reaches from the other direction.

**The lab split there is confounded and must not be read as a model-level finding.** Each lab
ran under its own scaffolding (claude-code for anthropic; codex for openai), so provider and agent harness are the
same variable. A harness decides whether writing a file is cheaper than piping a script to a
shell, how much context a session holds, and what the transcript records at all — any of which
alone could produce that column. Separating them needs the same model under both scaffoldings,
which no run on record provides.

## What kinds of checking were described

| kind | runs | what it means |
|---|---:|---|
| `syntax-only` | 6 | `node --check` or equivalent: the file parses, and nothing else was established |
| `example-harness` | 5 | the published examples, run through a driver the model wrote |
| `assertions` | 1 | executable assertions or invariant checks that fail loudly |
| `legality-table` | 5 | an explicit table of permitted states or transitions, consulted rather than reasoned about each time |
| `synthetic-scenarios` | 11 | inputs the model invented beyond the ones it was given |
| `fuzzing` | 2 | randomized or exhaustive generation over an input space |
| `mutation-testing` | 1 | deliberately breaking its own code to confirm its checker notices |

Ordered weakest to strongest. `syntax-only` — `node --check` — is included because several runs
cite it as verification, and a file that parses has established nothing about its behaviour.

## Checkers that exist and are never called

_None._ No submission defines a checking routine it never invokes. That is worth stating because it is the most misleading artifact a scan can meet: it matches every pattern and does nothing at run time.

## Does self-verification predict passing?

| arm | counted runs | failed something |
|---|---:|---:|
| described verification at or above an example harness | 7 | 2 |
| did not | 6 | 5 |
**Decidable, barely.** 2/7 of the self-verifying runs failed something, against 5/6 of the rest. With arms this small the comparison is suggestive at best and no test is applied to it.

## Why the foundry should keep measuring this

| reason | what it changes |
|---|---|
| A checker is the clearest signal of how a model APPROACHED the task | it separates 'wrote behaviour' from 'built a theory and tested it', which no pass rate distinguishes |
| Ephemeral checkers are invisible to artifact grading | every benchmark that grades one file is measuring its own submission format on this axis, and does not know it. The `unshipped` column above is that claim measured rather than argued |
| It is the cheapest possible harder variant | `checker-required-memory-poisoning` is that variant, built: it grades `checker.mjs` against the reference and against held-out mutants, so a checker that passes the reference and catches none of them is a named, gradable failure |
| Coverage, not expressiveness, is where these runs fail | the failures concentrate on states the model never generated, so a family that rewards generation is testing the binding constraint |

## What this report will not claim

| claim | why not |
|---|---|
| that the models did not verify themselves | they say they did, and the transcripts are specific enough to believe |
| that they did | a transcript is the model's own account; nothing here re-ran their harnesses |
| that self-verification predicts outcome | the arms are large enough to compare and the comparison is reported above without a test applied to it |
| that a `separate-checker` was found by name | these families are ABOUT auditing and validating, so domain vocabulary and self-check vocabulary are the same words. That pattern was removed after crediting `auditAlreadyCompleted` — ordinary implementation logic — as a self-check |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
