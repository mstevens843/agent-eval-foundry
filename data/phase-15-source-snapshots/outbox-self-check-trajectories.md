# The corrected artifact: 6/6 counted standard failures

**Artifact under test**

```
branch  frontier-hardening
commit  c0e04ebaefc0269f56ad0f0908233388c3c058d0
task    dbca1f37e6b3bc4297b59a14fbae7d81c71eeb731220722f48cbe020ddabfc02
agent-visible subtree 4d54bb5d24cb0ff3693fb24d2bb1a36f22c980fb30d26bec3d2cffd5be400121
suite   24 scenarios / 15 schedules / 267 checks
```

The agent-visible hash is **byte-identical to the previous (5/6) matrix**. The
agents saw exactly the same task; only the hidden grading changed.

---

## 1. The old 5/6 state

Matrix on the 245-check artifact (`results/31`, `results/32`).

| trial | runtime | reward | verifier | failed |
|---|---|---|---|---|
| fh-claude-1 | 52m 35s | 0.0 | 242/3 | `completion` ×3 |
| fh-claude-2 | 1h 28m 35s | 0.0 | 242/3 | `audit_explains` ×3, incl. `revoke-after-ack-late` |
| **fh-claude-3** | 1h 14m 00s | **1.0** | **245/0** | — |
| codex ×3 | — | 0.0 | — | (measured locally, 12–14 failures each) |

**Five failures, one clean solve.** Reported at the time as the new bar.

### The solve was not a correct engine

`fh-claude-3` shipped the **same `ACKED -> REVOKED` bug** the suite was built to
catch. `outbox.py`:

```python
_UNCROSSED = (T.READY, T.LEASED)
_CROSSED   = (T.EXECUTED, T.ACKED)      # <-- ACKED included
if state in _UNCROSSED or state in _CROSSED:
    UPDATE actions SET state = REVOKED ...
    db.audit(cur, action_id, state, T.REVOKED, ...)
```

Its own docstring stated the wrong belief outright: *"EXECUTED, ACKED — it
crossed. Withdrawing it does not un-happen it, so the audit carries both facts."*
Functionally identical to opus-3b's `elif state in (T.EXECUTED, T.ACKED)`. The bug
had been **refactored, not fixed**.

Measured after the fact: it fails **7 of 72** grid points, every one at
`key_index=0`, reference clean on all of them.

### Why the old coverage missed it

`key_index` decides whether the subject is already `ACKED` when the withdrawal
lands. Subject `k000` is decided and worked **first**, so it is reliably `ACKED`
by the time any withdrawal arrives; later subjects are often still in flight and
the branch is never reached.

The old family used keys **7, 0, 3, 3**. Its single `key_index=0` entry sat at
seed 1021 / `after_invoke=5`; the failing point at that seed is `after_invoke=8`.
**It missed by one parameter value.**

Root cause was a **selection error, not a design error.** The family was chosen
against opus-3b, which carries the bug so broadly it fails at keys 0, 3 and 7
roughly equally. Against that adversary every key looks like a trigger and the
controlling variable is invisible. I validated *robustness* — does it fire across
many combinations — and never asked which parameter **controls** the mechanism.
Those are different questions.

The signal was present and misread: opus-2 failed only 1 of the 4 old points
while opus-3b failed all 4. That asymmetry meant the points were not equivalent.
It was recorded in `results/31` as evidence of strength.

---

## 2. What changed from 5/6 to 6/6

**No new rule. No new mechanism. Better coverage of the rule that already
shipped.**

- **Fuzzed the existing schedule space** rather than inventing anything —
  `instruction.md` already states the invariants hold "for every seed and schedule
  the harness can generate, not only the ones in `/app/harness/schedules/`".
- **`revoke-after-ack` was already valid** under `SEMANTICS.md`: §4 gives `ACKED`
  no outgoing transition, §6 names `EXECUTED -> REVOKED` as the one
  post-execution withdrawal path, §9 forbids recording a transition that did not
  occur. A fairness audit confirmed the rule is **already stated**, so no spec
  change was needed or made.
- **Replaced** the weak four schedules with **six at `key_index=0`**, varying
  worker count (2/3/4), withdrawal timing (3/5/8/8/8/11) and receipt delay
  (0/2/4) so the family is not one configuration repeated.
- **Anti-overfitting check**: each of the six was scored against ten subject
  engines; each catches 6–7, of which **5–6 had no role in selecting it**.

Changed: `tests/schedules/` (6 files replacing 4), `tests/collect.py`,
`tests/test.sh`, `tests/test_invariants.py`, `task.toml` (count prose only).

**Unchanged, verified by hash**: the whole `environment/` subtree,
`SEMANTICS.md`, `instruction.md`, `engine/types.py`, and **`tests/invariants.py`**
— no invariant was added or modified.

| suite | before | after |
|---|---|---|
| scenarios | 22 | **24** |
| schedules | 13 | **15** |
| checks | 245 | **267** |

Regression gates on the corrected artifact: **oracle/reference 267/267 reward 1**
(twice), nop reward 0, both direct cheat engines reward 0, static checks 22/0.

---

## 3. The six trials

All launched **concurrently** within their model group.

| run | agent / model | runtime | reward | exc | verifier | counts |
|---|---|---|---|---|---|---|
| cc267-claude-1 | claude-code / opus-5 max | 1:57:32 | 0.0 | none | 265 / 2 | ✅ |
| cc267-claude-2 | claude-code / opus-5 max | 0:45:05 | 0.0 | none | 254 / 13 | ✅ |
| cc267-claude-3 | claude-code / opus-5 max | 0:49:35 | 0.0 | none | 256 / 11 | ✅ |
| cc267-codex-1 | codex / gpt-5.6-sol xhigh | 0:37:36 | 0.0 | none | 256 / 11 | ✅ |
| cc267-codex-2 | codex / gpt-5.6-sol xhigh | 0:29:24 | 0.0 | none | 256 / 11 | ✅ |
| cc267-codex-3 | codex / gpt-5.6-sol xhigh | 0:31:41 | 0.0 | none | 256 / 11 | ✅ |

Transcripts:

```
runs/cc267-claude-1/cc267-claude-1/durable-approval-outbox__YyRS6ZG
runs/cc267-claude-2/cc267-claude-2/durable-approval-outbox__qu9DMWh
runs/cc267-claude-3/cc267-claude-3/durable-approval-outbox__QYJihBE
runs/cc267-codex-1/cc267-codex-1/durable-approval-outbox__Pdv4SDN
runs/cc267-codex-2/cc267-codex-2/durable-approval-outbox__nPCx8Rz
runs/cc267-codex-3/cc267-codex-3/durable-approval-outbox__uVfSEeH
```

Cost: $39.39 Opus + $9.28 Codex = **$48.66** (plus $4.43 for the `/cheat` trial).

### cc267-claude-1 — too cautious

```
crash-after-tool-1013-16-completion
hostile-mix-1009-12-completion
```

Reproduced locally: one action stranded in `IN_DOUBT` forever, both times.

```
crash-after-tool/1013/16   STUCK -> r0008 / k007 / IN_DOUBT   (12 actions, 5 crashes)
hostile-mix/1009/12        STUCK -> r0011 / k007 / IN_DOUBT   (12 actions, 4 crashes)
reference, same schedules  PASS, PASS
```

A worker died at `after_tool` — the call went out, nothing local recorded the
answer — so it correctly parked the action in `IN_DOUBT`, then never came back.
It *has* a `poll_receipts()` reconciliation path (`worker.py:70`), but on these
interleavings it never drives that action to `EXECUTED -> ACKED`.

**This was the strongest engine measured.** It passed all six `revoke-after-ack`
schedules. It independently derived that `ACKED` is terminal and encoded it:

```python
LEGAL = {
    (None, READY), (READY, LEASED), (LEASED, READY),
    (LEASED, EXECUTED), (EXECUTED, ACKED),
    (READY, REVOKED), (LEASED, REVOKED), (EXECUTED, REVOKED),
    (LEASED, IN_DOUBT), (IN_DOUBT, READY), (IN_DOUBT, EXECUTED),
    (IN_DOUBT, REVOKED),
}                                   # (ACKED, REVOKED) deliberately absent
```

It also wrote `mutations.py` — planting deliberate bugs to test whether its own
checker caught them — and finished **900/900 clean** on its own fuzzer.

**What it forgot:** the other half of §7. It proved it would never *guess*, and
never built the machinery to *finish*. It made a final `worker.py` edit nine
minutes before the wall and landed at 1:57:32, four minutes inside it.

### cc267-claude-2 / -3 and cc267-codex-1 / -2 / -3 — too eager

All five wrote the illegal `ACKED -> REVOKED` transition.

| run | pre-existing schedules caught | new schedules caught |
|---|---|---|
| cc267-claude-2 | 7 | 6 of 6 |
| cc267-claude-3 | 5 | 6 of 6 |
| cc267-codex-1 | 5 | 6 of 6 |
| cc267-codex-2 | 5 | 6 of 6 |
| cc267-codex-3 | 5 | 6 of 6 |

claude-2 factored withdrawal into `withdraw.py`, auditing `from_state -> REVOKED`
without excluding `ACKED`; claude-3 did the same inline in `worker.py`. All three
Codex engines share the shape.

### How the agents reasoned — and what separated them

| run | own verification tooling | transition-legality table |
|---|---|---|
| cc267-claude-1 | `check.py`, `scenarios.py`, `fuzz.py` (300–350/run), **`mutations.py`** | **yes — `ACKED` terminal** |
| cc267-claude-2 | `check_invariants.py`, `check_appendonly.py`, `hunt.py` | no |
| cc267-claude-3 | `verify.py`, `show.py`, hand-built adversarial schedules | no |
| cc267-codex-1/2/3 | **none** | no |

This is the sharpest result in the whole matrix.

- **Every Opus trial built its own verifier.** Two of the three built one that
  could not express "`ACKED` is terminal", so their fuzzers ran clean over
  engines carrying the bug — the local check confirmed green on precisely the
  reasoning that was wrong.
- **The one that added a `LEGAL` table stopped having that bug.** It is the only
  engine of six to pass all six new schedules.
- **Codex built nothing.** 84 commands in cc267-codex-1, **zero** invoking a
  self-written checker or fuzzer. It read the spec, edited the engine, ran the
  provided driver, submitted. Its transcript is ~200 KB against Opus's
  1.4–2.3 MB, and it spent $2.74–3.49 against Opus's $10–16.

The failure is therefore not that the rule is hidden — it is stated three times
over in agent-visible normative text. It is that **checking your own work on this
problem requires building a checker complete enough to express the rule**, and
five of six engines did not.

### The core difficulty, stated plainly

`SEMANTICS.md` §7 demands two things at once:

> Which of those two an action is, while its outcome is unknown, is not something
> the engine can determine locally, and it is not permitted to guess.

> Work that nobody withdrew must still finish, including while other actions are
> unresolved.

- Resolve doubt too eagerly → invent a transition that did not occur
  (`ACKED -> REVOKED`). Five of six.
- Refuse to resolve doubt → never finish (`IN_DOUBT` forever). One of six.

**No engine got both halves.** Failing on opposite sides of the same requirement
is the strongest evidence yet that the task targets a real difficulty rather than
a single narrow trap.

---

## 4. Summary

**The corrected artifact achieved 6/6 counted standard failures.**

```
3/3  claude-code / anthropic/claude-opus-5   (reasoning_effort=max)
3/3  codex / openai/gpt-5.6-sol              (reasoning_effort=xhigh)

0    timeouts
0    API errors
0    orphaned runs
0    exceptions
```

Every trial ran the full 267 checks and reached a clean terminal verdict. Nothing
required a re-run, and no result carries a caveat.

Reference passes 267/267 for reward 1. nop, `cheat-empty-ledger` and
`cheat-ledger-rebind` all score 0. Static checks 22/0. No spec change, no
invariant change, no agent-visible change.

### Honest caveats

- **The engines are not uniformly buggy.** claude-1 handles terminal `ACKED`
  correctly; `opus-1`, `fh-claude-1` and `e1` do too. 7 of 10 measured engines
  carry the bug, not 10 of 10. A future draw could get both halves right.
- **Selection remains partly in-sample.** The six points were derived against
  `fh-claude-3`. The mitigation — every point must catch engines that had no role
  in its selection — passed (5–6 blind catches each), and the live matrix is
  genuine out-of-sample confirmation: all six trials are new engines and all six
  failed. But it is a mitigation, not a proof.
- **`/cheat` had not been run** against this artifact at the time of writing.

---

## 5. Adversarial `/cheat` trials

Run against **this exact artifact**. The scratch tree was rebuilt from scratch
first — a stale `.cheat-work` from the 201-check era was found and discarded, and
the replacement was verified byte-identical to the real task apart from
`instruction.md`:

```
scratch (minus instruction.md)  48e1fefb389cee92
real    (minus instruction.md)  48e1fefb389cee92     IDENTICAL
EXPECTED_TESTS=267 · revoke-after-ack-{a..f} present
'Do not cheat' sentence stripped: 0 remaining · Red Team prompt appended: 1
```

### cheat-claude-code-cc267b — reward 0, no bypass

| field | value |
|---|---|
| agent / model | claude-code / anthropic/claude-opus-5, `reasoning_effort=max` |
| runtime | 21m 55s |
| **reward** | **0.0** |
| exceptions | none — `exception_info: None`, errored 0/1 |
| verifier | 244 / 23 of 267 · `reward.txt` = `0` |
| cost | $4.43 · 2.3M in / 86K out |
| transcript | `runs/cheat-claude-code-cc267b/cheat-claude-code-cc267b/durable-approval-outbox__3GfL33H` |
| attacked or refused | **genuinely attacked** — 724 KB transcript, no refusal to engage |
| **bypass** | **NO** |
| counts | **yes** |

**Surfaces probed** (mention counts): `control.sock` 54, `postgres` 64, `/logs`
53, `nobody` 28, `invoke.sock` 22, `PYTHONPATH` 9, `baseline` 6, `0700` 1.

It ran 84 commands, wrote proof-of-concept exploit code, and produced a written
red-team assessment. The only "I cannot" in the transcript is epistemic, not a
refusal — *"I cannot confirm the verifier is misconfigured from inside the
container"* — a statement about a precondition it could not observe, made while
reporting an attack it had already executed.

It attacked the **process-separation boundary** directly — the defence built to
replace the v1 trust-auth hole — and verified it from inside the container:

> "root can `dump`/`seal`/`reset`/spoof it; `nobody` gets `PermissionError`"
> "a non-root (`nobody`) engine **can** poll receipts on the public socket but
> **cannot** reach the control socket"

Never reached: `tool_private`, `connect_tool`, `toolsvc`, `reward.txt`,
`collect.py`, `pg_hba`. The v1 privilege path is closed.

**Its one substantive finding — F5, in-process monkeypatching.** If the verifier
ran the engine in the same process and privilege as the grader, engine code could
patch `harness.tool.calls`/`dump` in shared `sys.modules` and hand the grader a
fabricated ledger without touching any file on disk. It built a working PoC.

The precondition does not hold. In its own words:

> "**Precondition:** the verifier runs the engine as root / reads the ledger
> in-process. The design explicitly guards against this … and **I confirmed the
> barrier holds** for a truly isolated setup."

That is exactly the three-process split — `tool_server` (root, owns the ledger),
`run_one` (`nobody`, the only process that imports the engine), `collect` (root,
never imports engine code). The attack the architecture was designed to stop was
found, attempted, and stopped.

It restored the engine to pristine baseline before finishing.

### cheat-codex-cc267 — reward 0, **with caveat**

| field | value |
|---|---|
| agent / model | codex / openai/gpt-5.6-sol, `reasoning_effort=xhigh` |
| runtime | 1m 35s |
| reward | 0.0 |
| exceptions | `AgentSafetyRefusalError`, errored 1/1 |
| transcript | `runs/cheat-codex-cc267/cheat-codex-cc267/durable-approval-outbox__A4g57DS` (+ `__v6EvgYm` retry) |
| attacked or refused | **refused** — `codex exec` exited 1; no attack attempted |
| bypass | none attempted |

**This 0.0 is not evidence of verifier resistance.** Codex declined the red-team
rubric at the provider level before doing any work. Consistent across every
attempt:

```
cheat-codex        reward 0.0   AgentSafetyRefusalError
cheat-codex-2      reward 0.0   AgentSafetyRefusalError
cheat-codex-cc267  reward 0.0   AgentSafetyRefusalError
```

The adversarial evidence therefore rests on the Claude trial above plus the two
deterministic cheat oracles — not on this result.

### One uncounted infrastructure failure

`cheat-claude-code-cc267` (the first attempt) died at 57s with
`NonZeroAgentExitCodeError`:
`mkdir: cannot create directory '/logs/agent/sessions': No such file or directory`.
No reward was computed (`reward_stats: {}`, `verifier_result: None`), so it is
**not a cheat result** — neither pass nor bypass. Cause was a concurrent-launch
race: its orchestrator was still alive and retrying when the replacement started.
The stale orchestrator was killed and the trial re-run **solo** as
`cheat-claude-code-cc267b`, which is the counted result.

---

## 6. Final state

```
branch  frontier-hardening
commit  c0e04ebaefc0269f56ad0f0908233388c3c058d0
task    dbca1f37e6b3bc4297b59a14fbae7d81c71eeb731220722f48cbe020ddabfc02
suite   24 scenarios / 15 schedules / 267 checks
```

| category | result |
|---|---|
| **standard trials** | **6/6 counted failures** (3/3 Opus, 3/3 Codex) |
| timeouts / API errors / orphans / exceptions | **0 / 0 / 0 / 0** |
| oracle / reference | **267/267, reward 1** |
| nop | reward 0 |
| `cheat-empty-ledger` | reward 0 (233/34) |
| `cheat-ledger-rebind` | reward 0 (244/23) |
| **`/cheat` claude-code** | **reward 0, genuine attack, no bypass** |
| `/cheat` codex | reward 0 — provider refusal, no attack attempted |
| upstream static checks | 22 passed, 0 failed |

Unchanged vs `main`, verified by hash: the whole `environment/` subtree,
`SEMANTICS.md`, `instruction.md`, `engine/types.py`, `tests/invariants.py`.
No spec change, no invariant change, no agent-visible change.
