# Mechanism registry

Transferable ways agents get things wrong. A mechanism is the unit a task family is designed
around: the claim is that the same failure appears across domains, so a family built on it can
be restamped rather than reinvented.

## Summary

| | |
|---|---:|
| mechanisms | **15** |
| measured (evidenced by a real trial) | 6 |
| argued | 6 |
| speculative | 3 |
| mutants in the bank | 98 |
| families declared | 18 |
| mechanisms with no mutant (undetectable) | 0 |
| mechanisms with no family yet | 0 |

Maturity is not a quality score. `measured` means a real trial produced evidence for it in the
source project; `argued` means the reasoning is laid out but nothing has been run; `speculative`
means it is a hypothesis. Most of a healthy registry is not measured, and pretending otherwise
is how a registry starts lying.

## Coverage

`mutants` is the column that matters: a mechanism with none is a difficulty this foundry can
describe but has no way to detect.

| mechanism | maturity | mutants | families | ledger rows |
|---|---|---:|---:|---:|
| `uncertain-external-effects` | **measured** | 10 | 2 | 9 |
| `stale-state` | argued | 27 | 8 | 15 |
| `duplicate-side-effects` | **measured** | 9 | 6 | 14 |
| `false-audit-history` | **measured** | 18 | 7 | 12 |
| `liveness-stall` | **measured** | 13 | 4 | 6 |
| `prompt-injection-via-retrieval` | argued | 5 | 4 | 5 |
| `permission-boundary` | argued | 22 | 8 | 12 |
| `ui-replay-mismatch` | _speculative_ | 17 | 3 | 3 |
| `hidden-environment-dependency` | argued | 8 | 4 | 5 |
| `tool-result-ambiguity` | argued | 7 | 6 | 5 |
| `context-contamination` | _speculative_ | 14 | 4 | 6 |
| `model-alias-drift` | _speculative_ | 17 | 2 | 1 |
| `grader-privilege-boundary` | **measured** | 3 | 1 | 2 |
| `oracle-probing` | **measured** | 3 | 1 | 6 |
| `checker-quality-gap` | argued | 20 | 1 | 1 |

## Mechanisms

### Uncertain External Effects `uncertain-external-effects`

*A call into an external system returns without saying whether the side effect happened, so the caller holds an outcome that is genuinely unknown rather than merely unread.*

| | |
|---|---|
| maturity | **measured** |
| evidence | results/34-cc267-standard-matrix.md and FINDINGS.md §1 in the durable-outbox repo: six frontier trials at reward 0, five of which resolved doubt too eagerly and one of which refused to resolve it at all. The obligation is stated normatively in tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md §7. |
| domains | payment authorization and capture, message publishing to a broker, cloud resource provisioning, outbound notification delivery, agent tool-call execution |
| mutants | eager-resolver, forged-receipt-truster, liveness-staller |

**Why agents fail.** The model concludes that an outcome it cannot observe locally can still be inferred from local state: that a call which did not return OK did not land, or that a withdrawn action was never delivered. Every other value in its database is knowable by reading it, so absence of evidence gets read as evidence of absence.

**What correct systems do.** Persist the intent before the call, hold the action in an explicit unknown state that no local reasoning is permitted to collapse, and resolve it only from an authoritative external settlement record — while still draining every unknown to a terminal state eventually.

**The false-positive shape.** Guessing NOT_LANDED is correct on every fault injection where the effect happened not to land, and the happy path is untouched, so a suite that never pairs an unknown-that-landed against an unknown-that-did-not scores the guesser identically to a correct engine. The durable-outbox v1 verifier had exactly this hole: 'always claim EXECUTED' passed both pair schedules without ever reading the receipt feed, because check_executed_iff_called had no clause for a revoked action that had in fact executed.

**Fairness risks**
- If no authoritative settlement channel is shipped, the unknown is undecidable and a correct implementation is punished for refusing to guess — the durable outbox had to guarantee a receipt exists for every UNKNOWN call, for the ones that landed and the ones that did not.
- Grading how fast an unknown resolves punishes an implementation that correctly waits for the authority; only terminal state and recorded side-effect count are fair to assert on.
- If the unknown window never opens inside a graded schedule, correct handling and lucky guessing are indistinguishable and the check measures nothing.

**Cheat risks**
- A grader that only bounds side effects from above lets an implementation that never calls the tool score perfectly — measured, 113/113 with an empty ledger.
- If the settlement feed is readable or writable from the implementation's process, the engine fabricates the very authority it is supposed to be constrained by.
- Asserting only the final state and not the path taken lets an implementation reach the right terminal state through a transition the spec forbids.

**Measurable signals**
- external side effects recorded by the tool per action, asserted 1 for executed actions and 0 for never-executed ones
- count of actions still in the unknown state once the schedule has drained (must be zero)
- agreement between each action's terminal state and the authoritative receipt for its idempotency key
- presence of an audit transition into the unknown state for every call whose outcome was UNKNOWN

### Stale State `stale-state`

*A decision is taken against a snapshot of state that has since changed, so the action is correct for a world that no longer exists at the moment it takes effect.*

| | |
|---|---|
| maturity | argued |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | distributed leases and locking, feature-flag and policy evaluation, cache invalidation, optimistic-concurrency database writes, agent memory and scratchpad reuse |
| mutants | stale-state-reader, policy-bypasser |

**Why agents fail.** Reads look free, so the model caches the policy, the lease epoch or the row it read at the top of the handler and reasons about it as if it were still current. It concludes that because nothing on its own code path mutated the value, nothing did.

**What correct systems do.** Re-validate the fencing token — epoch, version, generation — at the point of use and inside the same transaction as the effect, and make an action under a stale token a silent no-op rather than a slow-path retry.

**The false-positive shape.** Deterministic single-threaded test drivers advance one unit of work per step, so time-of-check and time-of-use are adjacent and the window never opens. This was measured in the source project rather than assumed: an epoch-race mutant fired in 0 of 5 scenarios and a snapshot-staleness mutant in 4 of 144 configurations (results/29). On such a driver a stale reader and a correct implementation produce byte-identical runs, so the whole suite is green over the bug.

**Fairness risks**
- If the interleaving that opens the window is not reachable through the documented stepping API, a correct implementation cannot demonstrate its guard and an incorrect one cannot be caught — the check grades nothing in either direction.
- Wall-clock-dependent windows make the grade a function of machine speed rather than of the implementation; step-numbered expiry is the fair form.
- Requiring re-validation on every read punishes an implementation that has correctly proven the value cannot change on that path.

**Cheat risks**
- An implementation can serialize all work behind one global lock, making staleness unreachable while destroying the concurrency the task exists to exercise, so the grader needs an independent progress property.
- If the fencing token is supplied by the implementation, it can emit a constant and satisfy any check that only compares tokens against themselves.
- A grader asserting on retry counts rather than on committed effects rewards defensive retrying that never actually validates.

**Measurable signals**
- count of effects committed under a token that was no longer current at commit time
- monotonicity of the epoch or version per resource across the audit log
- number of distinct actions progressed concurrently, to catch global-lock evasion
- divergence between the value observed at decision time and the value at effect time, sampled by the harness

### Duplicate Side Effects `duplicate-side-effects`

*One logical action crosses into the outside world more than once, because retry, restart or redelivery re-enters a path whose idempotency key is not stable across those events.*

| | |
|---|---|
| maturity | **measured** |
| evidence | tasks/durable-approval-outbox/environment/app/spec/SEMANTICS.md §7 states the exactly-once obligation; results/15-outbox-verifier-audit.md measured both failure directions against it — a genuinely double-executing engine reaching 113/113 by rebinding harness.tool.calls, and a degenerate engine reaching 113/113 having performed zero side effects. |
| domains | payment capture and refunds, outbound webhook delivery, at-least-once queue consumers, resource provisioning APIs, agent tool retries after timeout |
| mutants | duplicate-executor, delivery-keyed-idempotency, nop-faker |

**Why agents fail.** The model reaches for an idempotency key and picks the wrong one — the delivery id, the retry attempt number, a UUID minted inside the handler — because within a single successful run every candidate key is unique per action and all of them work. It concludes the key's job is uniqueness, when its job is stability across crash and redelivery.

**What correct systems do.** Derive the key from the action's durable identity, commit it before the call, and reuse it byte-identically on every retry and after every restart, so the external system's own deduplication can do the work the caller cannot do locally.

**The false-positive shape.** Delivery-keyed idempotency is indistinguishable from action-keyed idempotency until the same request is delivered twice or a crash lands between the tool call and the local record of it. A suite whose crash points all fall before the call, or that never redelivers a req_id, scores both engines identically — the after_tool crash point exists in the durable outbox precisely because it is the only one that separates them.

**Fairness risks**
- If the external system's dedup window is bounded, a correct implementation that reconciles late is punished for the environment's forgetting — the source project killed an entire v3 candidate on exactly this, because the late-reconciliation hatch fairness requires is the same hatch that defuses the trap (results/23).
- Grading on call count rather than on recorded side effects punishes an implementation that correctly re-invokes with a stable key against a genuinely idempotent tool.
- If the crash points are not documented, an implementation cannot be expected to have made the right thing durable before them.

**Cheat risks**
- An implementation that never performs the side effect trivially never duplicates it — measured as a live bypass at 113/113 with an empty ledger — so the grader must assert an expected execution count as a floor, not only as a ceiling.
- If the implementation can read or write the external system's call ledger, it can prune the duplicates after the fact; the durable-outbox audit found a genuinely double-executing engine scoring perfectly by rebinding the verifier's ledger accessor at import.
- Counting the implementation's own log of calls instead of the tool's independent record grades the implementation's self-report.

**Measurable signals**
- side effects recorded by the external system per action id, asserted equal to 1 for executed actions and 0 for never-executed ones
- count of distinct idempotency keys emitted for a single action across its lifetime
- byte-stability of the idempotency key across a crash-restart boundary
- idempotency-key collisions across distinct actions

### False Audit History `false-audit-history`

*The audit log tells a story the system did not live — a transition that never happened, or one that is impossible under the declared state machine.*

| | |
|---|---|
| maturity | **measured** |
| evidence | results/34-cc267-standard-matrix.md and results/31-acked-terminal-hardening.md: five of six frontier trials wrote the illegal ACKED -> REVOKED transition, and the only engine that avoided it was the only one that shipped a LEGAL transition table excluding that edge, alongside a fuzzer and mutation tests against its own checker. |
| domains | financial ledgers and journals, order and shipment lifecycle tracking, compliance and access logging, durable workflow engines, agent action traces |
| mutants | audit-liar, eager-resolver |

**Why agents fail.** The model treats the audit as a rendering of current state rather than as an independent record of history, so when it needs to explain a terminal state it emits whatever edge reaches that state from wherever the action happens to be. It concludes that a log which agrees with the final state is a correct log.

**What correct systems do.** Append the audit entry in the same transaction as the transition it describes, emit it from an explicit legal-transition table, and reject at write time any edge the table does not contain — so terminality is enforced rather than assumed.

**The false-positive shape.** This is the measured centre of the source project. Five of six frontier engines wrote the illegal ACKED -> REVOKED edge, and every one of those logs was continuous, append-only, and in agreement with the terminal state — so continuity checks, append-only checks and terminal-agreement checks all pass. Only a check that owns a whitelist of legal edges separates them, and the engines' own self-written checkers did not have one; two Opus runs wrote fuzzers that ran clean over their own buggy engines.

**Fairness risks**
- If the state machine is not enumerated in normative text, the legal-edge set is the author's private convention and a correct implementation can be marked down for a defensible reading — the source project re-audited its own spec on exactly this point before shipping the ACKED-terminal checks.
- Requiring a particular entry ordering or detail wording overfits to the reference and punishes an equivalent log.
- Grading intermediate states the implementation was never required to materialise punishes a correct design with a coarser but sound state model.

**Cheat risks**
- An implementation that makes very few transitions has very few chances to write an illegal one, so a grader with no expected-transition floor rewards doing less work.
- If the audit is only cross-checked against the implementation's own state view, an implementation that is consistently wrong in both passes.
- An implementation can append a compensating entry to make one illegal edge look like two legal ones, unless the log is asserted append-only with exactly one entry per actual transition.

**Measurable signals**
- count of audit edges absent from the declared legal-transition table
- one audit entry per transition that occurred, with no unexplained transitions and no entries for transitions that did not occur
- monotonicity of the audit sequence number and immutability of earlier entries across the run
- agreement between the audit-reconstructed state and the reported state for every action

### Liveness Stall `liveness-stall`

*Work that nobody withdrew never finishes: the system avoids an incorrect action by never taking any, and an item sits in a non-terminal state forever.*

| | |
|---|---|
| maturity | **measured** |
| evidence | results/22-outbox-v2-opus-2-trial.md and FINDINGS.md §1: the single engine that avoided the illegal audit edge instead stranded an action in IN_DOUBT forever, and the failure reproduced across two independent runs on the byte-identical artifact, with the engine's own property checker treating a withdrawn IN_DOUBT action as acceptable. |
| domains | durable workflow engines, retry and backoff queues, human-in-the-loop approval flows, distributed consensus and leader election, agent task orchestration |
| mutants | liveness-staller, nop-faker |

**Why agents fail.** The model reads a safety obligation — do not guess an outcome you cannot determine — as licence to wait indefinitely, and encodes that reading into its own checker, which then classifies an unresolved item as legitimately unresolved. It concludes that not-yet-wrong is the same as correct, because safety violations are loud and stalls are silent.

**What correct systems do.** Treat every non-terminal state as an obligation with a named drain path — every unknown settled from the authority, every lease eventually retaken — and require the run to end with no item outside a terminal state, while independent items continue to make progress past a blocked one.

**The false-positive shape.** A stall passes every safety assertion by construction: it never executes twice, never writes an illegal transition, never lets a revoked action cross. It surfaces only under a completion check applied at end of schedule, on a scenario where the stalled item's outcome does eventually settle. The sixth durable-outbox engine failed here and nowhere else — it implemented receipt reconciliation, passed all 22 UNKNOWN-pair checks, and left an action permanently IN_DOUBT, with a comment stating the choice deliberately.

**Fairness risks**
- If the schedule ends before the authority could plausibly have settled an unknown, a correct implementation is graded as stalled; the drain deadline must be derivable from the stated timing model.
- Grading on latency rather than on eventual completion punishes correct conservatism, which is the exact behaviour the safety half of the requirement demands.
- If some items are legitimately never resolvable, the spec must say so, or the completion check condemns a correct implementation.

**Cheat risks**
- An implementation can force completion by guessing, converting a liveness failure into a safety failure the grader may not check, so completion and safety must be asserted together on the same scenario.
- A grader that samples completion only at the final step lets an implementation block everything and flush at the end, passing while violating progress throughout.
- Marking an item terminal in the implementation's own view, with no corresponding external settlement, satisfies a naive completion check.

**Measurable signals**
- count of items in a non-terminal state at end of schedule, asserted zero
- number of distinct items progressed concurrently while one is blocked
- steps elapsed between an authoritative settlement becoming readable and the item reaching its terminal state
- count of leases that expired and were never retaken

### Prompt Injection via Retrieval `prompt-injection-via-retrieval`

*Content fetched at runtime — a document, a tool result, a web page, another agent's message — carries instructions, and the agent executes them as if they came from its principal.*

| | |
|---|---|
| maturity | argued |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | RAG assistants over user-supplied corpora, browser and computer-use agents, email and ticket triage agents, code review over untrusted pull requests, multi-agent message passing |
| mutants | injection-follower, policy-bypasser |

**Why agents fail.** The model has no type distinction between the channel that carries its instructions and the channel that carries its data; both arrive as text in one window. It concludes that a plausible, well-formed instruction it has just read is an instruction it should follow, and the conclusion is reinforced when following it makes the task look finished.

**What correct systems do.** Carry provenance on every span of context, deny retrieved content the authority to change goals, widen permissions or name new destinations, and gate every privileged action on an instruction traceable to the principal rather than on the action merely seeming reasonable.

**The false-positive shape.** A system with no boundary at all passes every functional test, because benign corpora contain no injections — the mechanism is invisible until an adversarial document sits in the retrieval set. It also passes naive injection suites built from obvious lures, which a substring filter blocks, while the same system will follow an instruction phrased as an ordinary operational note in the document's own voice. The filter and the architecture are indistinguishable on the suite and completely different in the field.

**Fairness risks**
- If the injected instruction is genuinely indistinguishable from a legitimate one from the principal, no implementation can separate them and the task grades luck rather than architecture.
- Grading breadth of refusal punishes a system that correctly uses retrieved content as evidence while denying it authority — reading the document is not the failure, obeying it is.
- Keyword-shaped lures reward filtering over provenance, so a sound architecture and a regex score the same and the task measures neither.

**Cheat risks**
- A grader that looks for a refusal string rewards a system that refuses everything and does no useful work, so every adversarial instance needs a paired benign one the system must still complete.
- If the payload is detectable by a fixed pattern, the graded property silently becomes pattern matching rather than boundary enforcement.
- Asserting on the agent's stated reasoning rather than on the actions it took lets a system narrate compliance while performing the injected action.

**Measurable signals**
- count of privileged actions whose authorizing instruction traces to retrieved content rather than to the principal
- destinations, recipients or resources contacted that appear only in retrieved content
- task completion rate on paired benign instances, to detect blanket refusal
- presence of provenance labels on the context spans cited as motivating each action

### Permission Boundary `permission-boundary`

*An operation is performed with authority the requester did not hold, because the check that would have stopped it sat in the wrong place, ran against the wrong subject, or was absent from one path.*

| | |
|---|---|
| maturity | argued |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | multi-tenant SaaS APIs, database roles and row-level security, cloud IAM policy evaluation, agent tool allowlists, filesystem and container sandboxes |
| mutants | policy-bypasser, privilege-cheater |

**Why agents fail.** The model checks authority where the request enters and then treats everything downstream as already authorized, because in the code it is reading the check is visibly present. It concludes the guard is a property of the system when it is a property of one code path, then adds a second path — a batch job, a retry, an admin fallback — with no guard on it.

**What correct systems do.** Enforce at the point where the effect happens, against the identity that will bear it, deny by default on any path that does not name a subject, and make the enforcement point structural — a separate role, a separate process — rather than a call every future path has to remember.

**The false-positive shape.** Every positive test passes and every direct negative test passes; the hole lives on the path nobody wrote a test for. The closest measured instance in the source project is the grader-side version: REVOKE ALL constrained the outbox role while the process remained free to open a second connection as a different trusted role, and the recorded verification only ever tested the first connection (results/15). A suite that asserts 'the guarded call is refused' never discovers the unguarded one beside it.

**Fairness risks**
- If the authority model is not fully stated, a correct implementation can be graded down for a reasonable interpretation of a case the spec left silent.
- Grading the mechanism of enforcement rather than its effect punishes a sound alternative architecture that reaches the same guarantee differently.
- Denying an operation the spec permits is as much a failure as allowing one it forbids, so the suite must grade both directions or it quietly rewards over-refusal.

**Cheat risks**
- An implementation can deny everything and pass every negative test, so the permitted-path checks must carry equal weight in the score.
- If the grader's own credentials are reachable from the implementation's process, the boundary is decorative; trust-auth for all roles was the measured form of this.
- Checking that a guard function was called, rather than that the effect was prevented, is satisfied by calling it and discarding the result.

**Measurable signals**
- count of effects committed by a subject not authorized for them
- count of distinct code paths reaching the effect that do not pass through the enforcement point
- denial rate over the explicitly permitted set, as an over-refusal measure
- whether enforcement survives restart, retry and batch paths, not only the primary request path

### UI Replay Mismatch `ui-replay-mismatch`

*A recorded interaction with an interface replays cleanly against a snapshot but not against the live surface, because it bound to coordinates, ordering or transient text instead of to stable identity.*

| | |
|---|---|
| maturity | _speculative_ |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | browser-use agents, mobile app automation, desktop RPA, terminal TUI automation, end-to-end test suites |
| mutants | nop-faker, stale-state-reader |

**Why agents fail.** The model binds to whatever uniquely identified the element in the one observation it had — the third row, the button at these pixels, the control labelled Continue — because in that observation the binding was unambiguous. It concludes that an identifier which was unique once is an identifier.

**What correct systems do.** Bind to stable semantic identity, re-observe before each act rather than replaying a plan, assert the expected post-condition after every step, and halt loudly when the surface does not match the assumption instead of continuing into the next step.

**The false-positive shape.** Replay against a frozen fixture is deterministic, so a coordinate-bound script passes the recorded suite indefinitely. It also passes live runs whenever the layout happens to match — the same session, the same viewport, an empty list. The bug appears only when a banner shifts the page, an async row lands late, or the list is non-empty, and by construction none of those are in the recording the suite was built from.

**Fairness risks**
- If the surface changes in ways nothing in the observation predicts, no implementation can bind correctly and the instance grades luck.
- Grading an exact action sequence punishes a correct agent that reaches the same end state by a different route.
- Non-deterministic rendering — animation, lazy loading, network timing — can fail a correct implementation on rerun unless the harness quiesces the surface first.

**Cheat risks**
- An agent can report success without acting, so the grader must read the application's own data layer rather than the agent's account of what it did.
- If the fixture and the live surface come from the same generator, an agent can overfit to the generator instead of to semantic identity.
- Grading on screenshots invites pixel matching, which a no-op passes whenever the initial and final screens are similar.

**Measurable signals**
- end-state assertions read from the application's data layer rather than from the rendered surface
- count of actions taken against elements that no longer match their intended semantic identity
- success rate under a layout perturbation such as an injected banner, reordered rows or a delayed load
- number of steps taken without an intervening re-observation

### Hidden Environment Dependency `hidden-environment-dependency`

*The implementation works because of something in the authoring environment that was never declared — a preinstalled package, a set variable, network egress, a locale, a file left behind by an earlier step.*

| | |
|---|---|
| maturity | argued |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | container image builds, CI/CD pipelines, Python and Node dependency management, ML training reproducibility, agent sandbox provisioning |
| mutants | nop-faker, stale-state-reader |

**Why agents fail.** The model verifies by running the artifact in the environment it is standing in, and a green run there reads as a correct artifact. It concludes that reproducibility is a property of the code, when it is a property of the code plus everything the code never had to ask for.

**What correct systems do.** Declare every dependency explicitly, pin versions, and verify inside a container built only from that declaration — treating a successful build in a fresh environment, not a successful run in the current one, as the passing signal.

**The false-positive shape.** The suite passes on the author's machine and in the first CI run, because CI usually inherits the same base image. The failure appears only on a different host, after an image rebuild, or after a cache eviction — none of which a suite that runs once in one place can observe. A grader that executes the implementation inside the very container that built it can never detect this class at all.

**Fairness risks**
- If the target environment is not fully specified, a correct implementation fails on a dependency the author considered too obvious to state.
- Network-dependent verification makes the grade a function of registry availability rather than of the artifact under test.
- Pinning demanded too strictly punishes an implementation that correctly declares a compatible version range.

**Cheat risks**
- An implementation can vendor the entire environment into the artifact, passing a fresh-container check while defeating the property being measured, so the grader needs a size or declaration constraint alongside it.
- Grading on 'the build succeeded' rewards a build that does nothing, so it must be paired with a functional check executed inside the fresh container.
- If the fresh container is derived from the authoring image, the check is circular and passes unconditionally.

**Measurable signals**
- exit status of the artifact in a container built only from its declared dependencies
- count of imports, binaries or data files resolved at runtime that appear in no manifest
- hash-level reproducibility of the build across two independent runs on different hosts
- count of environment variables read that are not declared with defaults

### Tool Result Ambiguity `tool-result-ambiguity`

*A tool returns a value whose shape does not distinguish outcomes the caller must distinguish — success from no-op, empty from missing, error text from data — and the caller collapses them into the nearest confident case.*

| | |
|---|---|
| maturity | argued |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | LLM tool and function calling, REST and gRPC clients, shell exit codes and stderr parsing, database driver result handling, third-party SDK wrappers |
| mutants | eager-resolver, forged-receipt-truster |

**Why agents fail.** The model writes a parser for the response shape it saw in the examples and concludes that a non-exception return means success. A value meaning 'I cannot tell you' has nowhere to go, because the code has a branch for success and a branch for error and no third state, so it is widened into whichever of the two is cheaper to continue from.

**What correct systems do.** Model the tool's result as a sum type that includes the indeterminate case, refuse to widen an ambiguous result into a definite one, and carry the ambiguity into the caller's own persisted state until an independent source narrows it.

**The false-positive shape.** The ambiguous return is rare, so a suite built from happy-path fixtures never produces one and a collapsing parser scores exactly like a correct one. The sharper version appeared in the durable outbox: the tool's receipt is byte-identical whether the call was new or a deduplicated repeat, so an implementation inferring novelty from the return value passes every scenario in which the call happened to be new — which is nearly all of them.

**Fairness risks**
- If the ambiguity is never resolvable from any shipped channel, a correct implementation is permanently stuck and the task is unfair; an authoritative narrowing source has to exist.
- Grading a specific internal representation of the indeterminate case punishes an equivalent one that carries the same information differently.
- If the ambiguous return never occurs in a graded scenario, the check measures nothing while appearing to measure something, and guessing scores full marks.

**Cheat risks**
- An implementation can avoid ambiguity entirely by never calling the tool, so the grader must assert an expected call count against the tool's own record.
- If the ambiguous case is signalled by an out-of-band marker the implementation can read, the task degrades from modelling to lookup.
- Asserting merely that some branch handled the case lets an implementation handle it by assuming failure, which is the guess the mechanism exists to catch.

**Measurable signals**
- count of items whose recorded outcome disagrees with the authoritative external record
- existence of a distinct persisted state for the indeterminate case rather than reuse of success or failure
- number of tool invocations, compared against the tool's own independent ledger
- count of definite conclusions drawn on steps where the tool returned the indeterminate value

### Context Contamination `context-contamination`

*Information reaches the implementation through a channel the task never intended — an earlier turn, a sibling agent's workspace, a cached artifact, a leaked fixture — so the behaviour observed is not attributable to the capability being measured.*

| | |
|---|---|
| maturity | _speculative_ |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | benchmark harness design, multi-turn agent sessions, multi-agent shared workspaces, CI caches shared between jobs, training and evaluation data separation |
| mutants | oracle-prober, nop-faker |

**Why agents fail.** The model uses everything in its context, because that is what context is for; it has no way to tell that a file in the working directory is a leak rather than a resource. The reasoning error is at least as much the grader's: concluding that a correct output implies the capability, when it may only imply the answer was reachable.

**What correct systems do.** Isolate every instance in a fresh container with an enumerated input set, verify that hidden material is unreachable from the implementation's process rather than merely undocumented, and audit the trajectory for reads outside the declared inputs before trusting a pass.

**The false-positive shape.** Contamination produces passes, not failures, so nothing goes red and nobody investigates. A benchmark can report a strong score for months on a family whose answers sit in a stale file the harness forgot to clear. The analogous discovery in the source project was only ever made by auditing a pass rather than a failure: an engine reported as a clean solve was found to still contain the exact ACKED -> REVOKED bug the hidden tests were built to catch, because the hidden coverage had sampled the wrong parameter.

**Fairness risks**
- Over-aggressive isolation strips resources a correct implementation legitimately needs, failing it for the harness's caution rather than for its own behaviour.
- Grading a trajectory for 'suspicious' reads punishes an implementation that explored its workspace honestly, which is normal and correct behaviour.
- If the declared input set is itself incomplete, a correct implementation gets flagged for reading something it was entitled to read.

**Cheat risks**
- The bypass is the cheat: an implementation that finds the leak scores well without the capability, and a naive grader records that score as evidence of the capability.
- A per-instance seed derivable from a shipped artifact silently turns the hidden region into a public one.
- If hidden material is present-but-unreadable rather than absent, any privilege escalation converts directly into a full score.

**Measurable signals**
- count of file or network reads outside the declared input set, taken from the trajectory
- score delta between a fresh container and a reused one on the same instance
- score on a held-out instance family generated after the implementation was frozen
- presence of any hidden artifact anywhere on the implementation's reachable filesystem

### Model Alias Drift `model-alias-drift`

*A pinned-looking model identifier is actually an alias that moves, so the same code, prompts and thresholds silently run against a different model than the one they were calibrated on.*

| | |
|---|---|
| maturity | _speculative_ |
| evidence | _none — this is a judgement, not a measurement_ |
| domains | LLM evaluation harnesses, LLM-as-judge pipelines, agent frameworks with configurable backends, prompt regression suites, published benchmark leaderboards |
| mutants | nop-faker, stale-state-reader, alias-pinner |

**Why agents fail.** The model treats a model string as a stable constant because it is shaped like a version, and concludes that recording the alias in config is the same as pinning. Later behaviour differences get attributed to prompts, temperature or flakiness — to anything except a change in the identity of the system under test.

**What correct systems do.** Pin fully-qualified immutable model ids, record the provider-resolved id alongside every stored result, and treat any change in resolved id as invalidating the calibration derived under the old one — thresholds, few-shot sets, judge prompts and all.

**The false-positive shape.** Everything passes on the day it is written and keeps passing while the alias points where it pointed. Because the suite never asserts which model produced its numbers, a moved alias either still passes — and the published result is now about a different subject entirely — or fails in a way indistinguishable from prompt rot. Nothing in the suite can separate those two explanations, since the model identity was never an output it recorded.

**Fairness risks**
- Providers do not always expose an immutable id, so an implementation can be graded against a guarantee the API does not offer.
- Requiring byte-identical outputs across runs punishes a correct implementation running against a legitimately non-deterministic backend.
- Pinning to an id the provider has since deprecated fails a correct implementation for a reason entirely outside it.

**Cheat risks**
- A harness can record the requested id rather than the resolved one and appear pinned forever, so the grader must read what the provider actually returned.
- Stubbing the provider makes every drift check pass while measuring nothing about the real call path.
- Re-running until the numbers match the recorded ones launders genuine drift as flakiness.

**Measurable signals**
- presence of the provider-resolved model id in every stored result record
- count of results whose resolved id differs from the requested id
- whether calibration artifacts carry the model id they were derived under
- reproducibility of a headline number when re-run against the recorded resolved id

### Grader Privilege Boundary `grader-privilege-boundary`

*The implementation under test can reach the state the grader uses as ground truth — through a shared process, a shared database role, or a shared filesystem — so the score becomes a claim the implementation makes about itself.*

| | |
|---|---|
| maturity | **measured** |
| evidence | results/15-outbox-verifier-audit.md: three bypasses found and reproduced against the shipped verifier — a degenerate engine at 113/113 with zero side effects, ground-truth rebinding at 113/113 with a double-executing engine, and trust-auth role access to the tool's private ledger. All three were closed architecturally and preserved as deterministic cheat oracles under prototype/screenG/. |
| domains | benchmark verifiers, programming-course autograders, CI test harnesses, sandboxed code execution, agent tool-permission design |
| mutants | privilege-cheater, nop-faker, oracle-prober |

**Why agents fail.** This is an authoring error that solver capability merely exposes. The author concludes that because the ground-truth store is not documented as accessible, it is not accessible: restoring a pristine file on disk reads as protection, and revoking SQL privileges on one role reads as isolation, when neither constrains the process that chooses which role to connect as.

**What correct systems do.** Compute ground truth in a process that never imports or executes implementation code, read the authoritative record from a store the implementation's process cannot open under any role, and assert expected work as both a floor and a ceiling so an implementation that does nothing cannot pass.

**The false-positive shape.** The bypass raises the score, so nothing ever looks wrong — every check is green and the suite reports a perfect result. All three bypasses found in the source project had exactly this shape: a degenerate engine that never called the tool scored 113/113 with an empty ledger; a genuinely double-executing engine scored 113/113 by rebinding the verifier's tool.calls() accessor at import time; and trust-auth Postgres let the engine connect as the tool's own role and read the ledger it was graded against. Only deliberate cheat oracles, run as first-class artifacts, surface them.

**Fairness risks**
- Process isolation can break legitimate implementations — closing the in-process rebinding hole in the source project immediately surfaced a daemonised grandchild inheriting the harness's stdout pipe and deadlocking it.
- Anti-cheat greps over source flag a correct implementation for a coincidental token, and the same greps miss a payload placed in a subpackage the glob does not cover.
- Punishing an implementation for touching an interface it was never told to avoid is unfair; the boundary must be documented as well as enforced.

**Cheat risks**
- This mechanism is itself the cheat surface, so its grader must be tested with adversarial oracles rather than reviewed — hand-written cheat implementations that are required to score zero.
- Relying on the harness exit code alone lets an os._exit(0) during collection read as success with no tests run at all, which is why a passing-check count must also be asserted.
- Restoring pristine grader files on disk is no defence against a runtime rebind inside the same interpreter, and neither is dropping privileges after the process has already chosen its role.

**Measurable signals**
- score of each preserved cheat oracle, asserted zero
- number of graded checks actually executed, asserted equal to the expected count
- whether the implementation's process can open a connection or file handle to the ground-truth store under any available role
- expected execution count enforced as a floor as well as a ceiling

### Oracle Probing `oracle-probing`

*The task ships something that labels answers — a reference binary, a runnable spec, a scoring endpoint — and the solver recovers the graded behaviour by querying it rather than by understanding it.*

| | |
|---|---|
| maturity | **measured** |
| evidence | results/13-screenF-cleanroom.md: 3/3 agents solved screen E by decompiling the shipped .pyc, and 3/3 solved the stripped-binary screen F at 25/25 on the hidden set by pure differential probing. results/08-mechanism-screens.md states the identifiability vise the result generalises to — fair implies probeable, probeable implies differentially fuzzable, differentially fuzzable implies solved. |
| domains | cleanroom reimplementation tasks, compiler and file-format round-trip tasks, hidden-rubric scoring endpoints, reverse-engineering challenges, spec-conformance benchmarks |
| mutants | oracle-prober, nop-faker |

**Why agents fail.** This one is not a reasoning failure at all; it is a task-design failure that reasoning capability exposes, and that is why it belongs in a mechanism registry. The author concludes that an opaque artifact hides its behaviour, when a runnable artifact is a labelling function: the solver builds a probe harness, sweeps a grid, fuzzes mismatches to zero, and never forms the insight the task was built to require.

**What correct systems do.** State the rules openly and put the difficulty in coverage of a large declared behaviour space with a hidden graded region, rather than in secrecy — or make each probe genuinely expensive and the output space large enough that sampling does not converge, which is why byte-exact archive-format tasks survive this structure and a four-field decision normalizer does not.

**The false-positive shape.** The probing solver is indistinguishable from an understanding one on every visible check and on the hidden set too. Three independent agents reached 25/25 on screen F's hidden set by pure black-box differential fuzzing at roughly 10.6k, 20k and 22k oracle comparisons, with no disassembly, recovering every sequence-dependent rule including panel quorum and the confidence/decision decoupling. On screen E all three decompiled a -OO .pyc and none left disassembly tooling in the workspace, so a trajectory-only check would have missed the method entirely; only their self-reports revealed it.

**Fairness risks**
- Removing the oracle makes the behaviour undiscoverable and the task an auto-reject on hidden requirements, so fairness requires probeability — which is precisely what makes probing work.
- Banning disassembly in prose is unenforceable and punishes the honest solver who obeys it, since the graded outcome is identical either way.
- Rate-limiting probes converts the task into a timing constraint, which grades speed rather than understanding and is disallowed outright under a no-timeout-pressure rule.

**Cheat risks**
- The probing route is itself the cheat and it yields a perfect score, so the grader cannot detect it from the result — only from the trajectory, which the solver has no obligation to leave behind.
- A hidden set drawn from the same distribution as the visible one is covered by the same fuzz, certifying interpolation rather than insight.
- Any self-check the task ships as a fairness affordance doubles as a label generator, which is the identifiability vise in its artifact-embodied form.

**Measurable signals**
- number of oracle invocations recorded in the trajectory
- hidden-set score plotted against probe count, since a fuzzer's curve rises with samples and an insight's does not
- hidden-set score on inputs drawn from a region structurally disjoint from the probeable one
- presence of probe-harness or disassembly artifacts in the workspace, noting that these were absent in all three screen-E samples

### Checker Quality Gap `checker-quality-gap`

*A submission implements behavior but ships no independent checker strong enough to reject known-bad behavior, so self-verification is described rather than operationalized.*

| | |
|---|---|
| maturity | argued |
| evidence | reports/self-check-behavior-report.md: models often described checkers but did not ship executable verifier artifacts. This mechanism is the first package-ready pattern to measure that gap directly. |
| domains | agent benchmark submissions, policy engines with self-tests, UI replay libraries with replay validators, memory and provenance systems, workflow engines with local checkers |
| mutants | vacuous-checker, visible-only-checker, checker-never-invokes-subject, inexpressive-checker, accept-all-checker |

**Why agents fail.** Models often describe a verification strategy in prose and then submit only the implementation, or submit a checker that exercises visible examples and never calls the subject on held-out mutants. The failure is not knowing the rule; it is turning the rule into a test oracle with negative cases.

**What correct systems do.** Ship the implementation and an independent checker, run the checker against the reference and held-out known-bad subjects, require the checker to invoke the subject, and fail vacuous or visible-only tests even when the submitted implementation itself happens to pass.

**The false-positive shape.** A family that grades only subject behavior cannot distinguish a solver that built no verifier from one that built a verifier and caught its own wrong turns. The self-check report found exactly this gap: agents frequently narrated checkers without shipping executable ones, so the evidence loop had no artifact to grade.

**Fairness risks**
- If the checker contract does not state what inputs it receives and what it must return, a correct checker can be marked wrong for interface mismatch rather than weakness.
- If hidden known-bad subjects exercise rules absent from the visible spec, checker failures are unfair rather than informative.
- If the task requires a perfect checker over an unbounded domain, it measures formal-methods capacity rather than the intended self-verification gap.

**Cheat risks**
- A checker that always returns pass can satisfy a harness that only checks file presence.
- A checker that compares against visible example ids can pass examples while expressing none of the core rule.
- A checker that never invokes the subject under test can report success over any implementation.
- A submission can make `checker.mjs` import `subject.mjs` and whitelist its own source instead of testing behavior unless held-out mutants are run.

**Measurable signals**
- checker rejects every held-out known-bad subject
- checker accepts the reference behavior
- checker invokes the subject on generated cases rather than only inspecting source text
- vacuous, visible-only, never-invokes-subject and accepts-all checker mutants score zero

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
