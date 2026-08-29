# Trial orchestration

The layer that puts a model in front of a challenge package and writes down what happened —
including when what happened was nothing. Everything here is derived from durable trial
directories on disk; every row names one you can open.

## What has been run

| | |
|---|---:|
| family | `prompt-injection-containment` |
| agent trials attempted | 4 |
| **counted** | **4** |
| uncounted | 0 |
| counted trials that passed every graded scenario | 4 |

| run | model | isolation | status | runtime | scenarios | failed | counts |
|---|---|---|---|---:|---:|---:|---|
| `pic-claude-1` | anthropic/claude-opus-5 | subprocess | completed | 371s | 128 | 0 | yes |
| `pic-claude-2` | anthropic/claude-opus-5 | subprocess | completed | 340s | 128 | 0 | yes |
| `pic-claude-3` | anthropic/claude-opus-5 | subprocess | completed | 326s | 128 | 0 | yes |
| `pic-codex-1` | openai/gpt-5.6-sol | subprocess | completed | 247s | 128 | 0 | yes |

## The counting rules

A trial's classification comes from the provider; countability is a pure function of that
classification and is not overridable from a flag. The rules, in the order they are applied:

| classification | may it count? | reasoning |
|---|---|---|
| `completed` | yes, conditionally | only when the verifier graded at least one scenario — a pass nobody graded is not a pass |
| `refused` | **never** | the absence of an attempt, not a result — a reward of 0 here means nothing was tried |
| `timeout` | **never** | the absence of an attempt, not a result — a reward of 0 here means nothing was tried |
| `infrastructure_error` | **never** | the absence of an attempt, not a result — a reward of 0 here means nothing was tried |
| `crashed` | not by default | not by default: promoting a crash to a failure automatically would let a harness bug read as a capability finding |

This is not a hypothetical concern. The first real trial run through this layer died in two
seconds because environment redaction stripped the provider CLI's own credentials. It was
recorded as `crashed`, uncounted, transcript preserved. A layer that graded whatever was in the
submission directory would have written a trial record showing a frontier model scoring zero.

## What cannot become evidence

Countability rules out runs that failed to happen. A second veto rules out runs that happened and
produced nothing, because those satisfy the counting rules perfectly: a stub is `completed`, it is
graded, and it fails every scenario — which reads as *an agent attempted this family and could not
do it*, the exact sentence the blocking difficulty gate is looking for.

This was found by a smoke test rather than reasoned about in advance. Driving the runner with a
command that wrote a five-line do-nothing module produced a counted trial failing 128 of 128, and
the family flipped from NOT-READY to SHIP on the strength of it.

| rejected submission | why it is not an attempt |
|---|---|
| every scenario errors inside the subject host | the file never executed; indistinguishable from submitting nothing |
| behaviour identical to a checked-in baseline | this repository wrote that subject to do nothing, so it measures nothing |

The rule is the same one the counting rules use everywhere: the absence of an attempt is not a
result. A genuinely bad implementation still counts — it differs from the baseline in at least one
cell, and any real attempt does. The veto runs when the record is written, and an independent
assertion re-checks every counted agent record afterwards, so a hand-edited record does not get
through either.

## Providers

| provider | status | isolation | requires |
|---|---|---|---|
| `shell` | **implemented** | process | — |
| `claude-cli` | **implemented** | process | — |
| `codex-cli` | declared | process | It needs the Codex CLI's non-interactive invocation and auth verified, plus a decision about how its sandbox interacts with ours. Until then use `--provider shell --cmd` with the codex command directly, which is the same thing without a convenience wrapper. |
| `gemini-cli` | declared | process | It needs the Gemini CLI's non-interactive invocation and auth verified. Reachable today via `--provider shell --cmd`. |
| `docker` | declared | container | It needs a running Docker daemon. The design is fixed and validated by `dockerPlan()`: the challenge mounts read-only, the submission directory is the only writable mount, no verifier or matrix path is mounted at all, the network is off unless explicitly enabled, and only declared environment variables cross the boundary. The daemon is not running in this environment, so the adapter refuses rather than silently degrading to a subprocess. |

2 adapters are implemented and 3 are declared. A declared adapter throws
`provider not configured` when invoked. It does not return an empty submission, and it does not
return a fabricated result — an unconfigured provider must be indistinguishable from a missing
one, never from a failing model.

## Isolation

| level | guarantee |
|---|---|
| `in-process` | The subject receives a frozen facade and never sees the ledger array. It cannot swap the recorder by accident. It CAN reach past its arguments — module globals, prototype patching, the filesystem — so this level is sufficient for code you wrote and insufficient for code an agent wrote. |
| `subprocess` | The subject runs in a separate node process and communicates over stdout. It cannot touch the parent's memory, so the ledger and the grading are genuinely out of reach. It still shares the filesystem and network with the parent. |
| `container` | The subject runs in a container with its own filesystem and no network. Not implemented here; declared so the gate can distinguish it rather than treating subprocess as the ceiling. |

The counted trials above ran at `subprocess`. That is the level at which a hostile submission
cannot reach the verifier's memory: the artifact is imported in a child process, and the test
suite proves it by grading a subject that deliberately mutates globals and checking the parent's
are untouched. `container` is declared and planned (read-only challenge mount, writable
submission mount, `--network=none`, no verifier path mounted at all) and is not claimed as
achieved, because the daemon is not running on this machine.

## Artifacts kept per trial

| run | submitted artifact | graded scenarios | counts | why |
|---|---|---:|---|---|
| `pic-claude-1` | `subject.mjs` | 128 | yes | completed with 128 graded scenario(s), no refusal, timeout or infrastructure error |
| `pic-claude-2` | `subject.mjs` | 128 | yes | completed with 128 graded scenario(s), no refusal, timeout or infrastructure error |
| `pic-claude-3` | `subject.mjs` | 128 | yes | completed with 128 graded scenario(s), no refusal, timeout or infrastructure error |
| `pic-codex-1` | `subject.mjs` | 128 | yes | completed with 128 graded scenario(s), no refusal, timeout or infrastructure error |

A counted trial with no verifier output, or no preserved submission, is rejected by the directory
validator rather than read as a pass. The challenge copy is also re-scanned for hidden artifacts
by content as well as filename, so a leaked answer key cannot hide behind a rename.

## What the trials found

**All 4 counted trials passed every graded scenario.** The submissions are genuine —
hundreds of lines each, citing the policy rule codes by name and tracking argument provenance
rather than pattern-matching strings. This is not a harness failure; it is a measurement, and
the measurement is that the family is already solved by the models it was meant to separate.

The ship gate reads this directly: `not-already-solved` is blocking, and it fails **because**
the evidence arrived. A family that no counted agent has failed cannot discriminate, so it is
held rather than shipped, regardless of how well the verifier catches mutants.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
