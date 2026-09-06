# Trial orchestration

The layer that puts a model in front of a challenge package and writes down what happened —
including when what happened was nothing. Everything here is derived from durable trial
directories on disk; every row names one you can open.

## What has been run

| | |
|---|---:|
| family | `prompt-injection-containment` |
| agent trials attempted | 0 |
| **counted** | **0** |
| uncounted | 0 |
| counted trials that passed every graded scenario | 0 |

No current counted agent trial exists for this family. Preserved results do not establish difficulty for its revised package.

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
| `docker` | **implemented** | container | — |

3 adapters are implemented and 2 are declared. A declared adapter throws
`provider not configured` when invoked. It does not return an empty submission, and it does not
return a fabricated result — an unconfigured provider must be indistinguishable from a missing
one, never from a failing model.

## Isolation

| level | guarantee |
|---|---|
| `in-process` | The subject receives a frozen facade and never sees the ledger array. It cannot swap the recorder by accident. It CAN reach past its arguments — module globals, prototype patching, the filesystem — so this level is sufficient for code you wrote and insufficient for code an agent wrote. |
| `subprocess` | Historical transport, not protected collection. Host and submission share a process, filesystem and network access. A submission may forge collector output; separating the final comparison process does not make that output authoritative. |
| `container` | The provider agent runs in a per-attempt networked container with a read-only public challenge, writable trial workspace, read-only root, dropped capabilities and resource limits. The submitted module is then graded separately with its family host in fresh no-network containers while the verifier and authoritative result stay outside. The host and submission still share one process inside that container — see the `subprocess` caveat above; a container wrapped around a shared process is not a boundary between what is inside it. |
| `cell-container` | Authority-owned operation collection inside a no-network, resource-bounded container. A root authority owns private scenario state and the compiled adapter; a distinct unprivileged child imports the submitted module. Bounded, ordered requests invoke allowlisted facade operations, and only the authority records their effects. Reports remain untrusted claims; there is no child-authenticated evidence ledger. Diagnostics cannot become results. Generated checker executions use distinct child identities. Malformed, resource-limited and incomplete executions are invalid, not counted semantic failures. This is process and privilege separation, not a claim of resistance to kernel/container-runtime vulnerabilities. |

Recorded isolation describes the historical attempt, not current assurance. All twelve current
generic routes use protected subject execution and independent operation authority. Required
runtime controls must actually pass; a missing daemon is an infrastructure error, never a model failure.

## Artifacts kept per trial

| run | submitted artifact | graded scenarios | counts | why |
|---|---|---:|---|---|
| `pic-claude-1` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |
| `pic-claude-2` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |
| `pic-claude-3` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |
| `pic-codex-1` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |
| `pic-haiku-1` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |
| `pic-sonnet-1` — **superseded** by the 2026-09-06 `prompt-injection-containment` challenge migration; it does not count and its numbers are withdrawn | `_test.mjs`, `subject.mjs` | 128 | **no** | Historical grading retained; superseded package does not count now. |

A counted trial with no verifier output, or no preserved submission, is rejected by the directory
validator rather than read as a pass. The challenge copy is also re-scanned for hidden artifacts
by content as well as filename, so a leaked answer key cannot hide behind a rename.

## What the trials found

Nothing yet.

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
