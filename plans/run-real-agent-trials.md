# Running real agent trials

How to reproduce the trials in `trials/`, and how to add a new one. Every command here is real and
was used to produce something checked in; nothing is aspirational.

The three trials on record (`pic-claude-1..3`) were run this way. They took 326–371 seconds each,
produced 231–318 line implementations, and all three passed 128 of 128 — which is why the
containment family is **NOT-READY** rather than shipped.

---

## Before you start

```bash
pnpm install
pnpm build          # trials run from source via tsx too; build is needed for `pnpm verify`
pnpm check          # registry + validators. If this fails, fix it before spending money.
npx tsx src/cli.ts trials providers
```

`trials providers` prints every adapter and what it needs. Two are implemented (`shell`,
`claude-cli`); three are declared and will throw `provider not configured` rather than return an
empty submission. That distinction is deliberate: an unconfigured provider must be
indistinguishable from a missing one, never from a failing model.

---

## The one-command form

```bash
npx tsx src/cli.ts trials run \
  --run-id pic-claude-4 \
  --model anthropic/claude-opus-5 \
  --provider shell \
  --inherit-env \
  --timeout 900000 \
  --command claude -p '{instruction}' --permission-mode bypassPermissions
```

What that does, in order:

1. Rebuilds the challenge package from the family — not from `examples/` — so a trial can never run
   against a stale package. The package builder is the same one whose output `pnpm verify` diffs.
2. Copies it into a fresh sandbox directory outside the repository.
3. Runs the provider with `{instruction}` substituted for the task text.
4. Grades whatever landed in `submission/subject.mjs`, in a **subprocess**, against all 128 measured
   scenarios.
5. Applies the counting rules, then the stub veto.
6. Writes `trials/prompt-injection-containment/<run-id>/` with `metadata.json`, `result.json`,
   `countability.json`, `transcript.txt`, `verifier-output.json`, the exact `challenge/` the model
   saw, and its `submission/`.

The directory is written whether or not the trial counts. A refused or crashed run is a finding
about the provider, and it disappears if you only keep the runs that worked.

### `--inherit-env` is not optional for a CLI provider

The sandbox environment is redacted by default because **the subject is hostile** — it must not
receive this machine's credentials. A provider CLI is not the subject; it is trusted infrastructure
that needs its own login.

The first real trial died in two seconds with `Not logged in` for exactly this reason. It was
recorded as `crashed`, uncounted, transcript preserved. Set the flag deliberately for a provider
process; never set it for something that runs submitted code.

---

## Reading the result

```
counts     yes — completed with 128 graded scenario(s), no refusal, timeout or infrastructure error
graded     128 scenarios, 0 failed
```

`counts: NO` is a normal outcome, not an error. The reasons you will actually see:

| what you see | what it means |
|---|---|
| `refused` / `timeout` / `infrastructure_error` | the absence of an attempt. Can never count, under any flag. |
| `crashed` | not counted by default. Re-classify by hand only if the crash is genuinely in the subject's code. |
| `the run completed but the verifier graded nothing` | no artifact was produced. |
| `failed to run at all: every one of the 128 scenarios errored` | the file never executed. |
| `indistinguishable from the checked-in nop-faker baseline` | it ran and did nothing. |

The last two are the stub veto. They exist because a five-line do-nothing module satisfies the
counting rules perfectly — `completed`, graded, fails everything — and reads to the ship gate as *an
agent attempted this and could not do it*. A smoke test flipped the family to SHIP that way before
the veto existed.

---

## Adding a provider

If your model has a non-interactive CLI, you do not need a new adapter:

```bash
npx tsx src/cli.ts trials run --run-id pic-codex-1 --model openai/gpt-5.6 \
  --provider shell --inherit-env --command codex exec '{instruction}'
```

Write an adapter only when the invocation needs more than an argv — a wire protocol, streaming, or
its own sandbox negotiation. Add it to `PROVIDERS` in `src/trials/providers.ts` with
`status: "declared"` and a `requires` string first; a declared adapter that throws is worth more
than an implemented one that guesses.

---

## Running elsewhere and importing

For a model you can only run on someone else's infrastructure, produce this layout and import it:

```
<dir>/<run-id>/metadata.json     runId, subjectId, model, effort, status, isolation, notes
<dir>/<run-id>/subject.mjs       the artifact
```

```bash
npx tsx src/cli.ts trials import path/to/dir
```

The import path enforces the same counting rules as the runner. It will refuse a record that claims
`counts: true` for a refusal, an agent record with no model, and an agent record with no preserved
artifact.

---

## Container isolation

`subprocess` is what the counted trials ran under: the artifact is imported in a child process, so
it cannot reach the grader's memory. The test suite proves it against a subject that deliberately
mutates globals.

It does **not** stop a submission writing to the filesystem or opening a socket. That needs the
container adapter, which is designed and validated by `dockerPlan()` — challenge mounted read-only,
submission the only writable mount, `--network=none`, no verifier or matrix path mounted at all —
and refuses to run because no daemon is available here. It is declared, not claimed.

To use it once a daemon exists:

```bash
npx tsx src/cli.ts trials run --run-id pic-docker-1 --model <m> --provider docker ...
```

---

## Budgeting a campaign

From the imported historical record: 33 runs, 20 counted, $252.51 total — an effective **$12.63 per
counted run**, with 17% of genuine attempts producing nothing usable. Price the waste; a budget
built from the cost of runs that worked is short by the cost of the runs that did not.

The containment family is far cheaper than that (minutes, not hours), which is what makes it the
practical way to fill a shared subject bank. See `reports/budget-plan.md`.

---

## What to do with the result

```bash
npx tsx src/cli.ts all          # regenerate every report from the new trial record
pnpm verify                     # prove the reports are reproducible
```

Then read `reports/ship-gate-report.md`. If `not-already-solved` still fails, more trials on the
same family will not help — harden the family instead. That is the state the containment family is
in right now, and it is the finding, not a setback.
