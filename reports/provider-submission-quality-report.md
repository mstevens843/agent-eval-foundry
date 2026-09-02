# Submission quality, by model

**This is not a ranking.** Every per-provider count here is below the threshold at which a rate
means anything, and two families are not a benchmark. What follows is a structured description of
how each model approached the task, so that a difference in outcome has something to be explained
by. Rows are sorted by run id for exactly that reason.

## Every counted submission

| run | subject | lab | files | lines | rules cited | self-check (shipped / described) | commands quoted | failed |
|---|---|---|---:|---:|---:|---|---:|---:|
| `checker-required-2026-08-o1` | `gpt-5.6-sol` | openai | 2 | 248 | 0/14 | **none** / — | 0 | 614 |
| `live-dom-2026-08-o2` | `gpt-5.6-sol` | openai | 1 | 510 | 0/13 | **none** / syntax-only | 1 | 219 |
| `pic-claude-1` | `claude-opus-5` | anthropic | 1 | 319 | 8/8 | **none** / synthetic-scenarios | 0 | 0 |
| `pic-claude-2` | `claude-opus-5` | anthropic | 1 | 232 | 8/8 | **none** / synthetic-scenarios | 0 | 0 |
| `pic-claude-3` | `claude-opus-5` | anthropic | 1 | 307 | 8/8 | **none** / synthetic-scenarios | 0 | 0 |
| `pic-codex-1` | `gpt-5.6-sol` | openai | 1 | 267 | 8/8 | **none** / synthetic-scenarios | 0 | 0 |
| `pic-haiku-1` | `claude-haiku-4-5` | anthropic | 1 | 164 | 8/8 | **none** / — | 0 | 0 |
| `pic-sonnet-1` | `claude-sonnet-5` | anthropic | 2 | 160 | 8/8 | legality-table / — | 0 | 0 |
| `ui-claude-1` | `claude-opus-5` | anthropic | 1 | 523 | n/a | **none** / fuzzing | 0 | 46 |
| `ui-claude-2` | `claude-opus-5` | anthropic | 1 | 698 | n/a | **none** / — | 0 | 33 |
| `ui-codex-1` | `gpt-5.6-sol` | openai | 1 | 361 | n/a | **none** / example-harness | 1 | 90 |
| `ui-haiku-1` | `claude-haiku-4-5` | anthropic | 1 | 216 | n/a | **none** / — | 0 | 62 |
| `ui-sonnet-1` | `claude-sonnet-5` | anthropic | 3 | 191 | n/a | **none** / — | 0 | 62 |

`rules cited` is `n/a` where the family publishes no numbered rule codes; zero-of-zero is not a
low score. `self-check` shows what is in the artifact and what the transcript describes, in that
order, and the two are never added.

## By lab

Descriptive, and small. The interval on every one of these is wide enough to overlap the others.

| lab | counted | failed ≥1 | median lines | mean runtime | subjects |
|---|---:|---:|---:|---:|---|
| anthropic | 9 | 4 | 232 | 391s | `claude-haiku-4-5`, `claude-opus-5`, `claude-sonnet-5` |
| openai | 4 | 3 | 361 | 582s | `gpt-5.6-sol` |

## Stated confidence against measured outcome

The one judgement in this report, and it is computed from language rather than from anything the
model knows about itself. A run whose transcript states the work is verified, and which then
fails scenarios, has not lied — its own verification did not reach the failing states. That gap
is the most actionable thing in the record, and it is reported as a **language signal**.

| run | stated | outcome | reading |
|---|---|---|---|
| `checker-required-2026-08-o1` | silent | 614 failed | **n/a** |
| `live-dom-2026-08-o2` | silent | 219 failed | **n/a** |
| `pic-claude-1` | silent | passed everything | **n/a** |
| `pic-claude-2` | silent | passed everything | **n/a** |
| `pic-claude-3` | silent | passed everything | **n/a** |
| `pic-codex-1` | assertive | passed everything | **aligned** |
| `pic-haiku-1` | assertive | passed everything | **aligned** |
| `pic-sonnet-1` | silent | passed everything | **n/a** |
| `ui-claude-1` | assertive | 46 failed | **overconfident** |
| `ui-claude-2` | silent | 33 failed | **n/a** |
| `ui-codex-1` | assertive | 90 failed | **overconfident** |
| `ui-haiku-1` | silent | 62 failed | **n/a** |
| `ui-sonnet-1` | assertive | 62 failed | **overconfident** |

**3 of 13 counted runs (23%) asserted correctness and then failed scenarios.**

- `ui-claude-1` — 46 failed. > irmation × async × replay count × two plausible app models: 0 violations of the invariants (payment never fires twice, never fires w
- `ui-codex-1` — 90 failed. > f80000gn/T/foundry-trial-RaLdsA/submission/subject.mjs). I verified it with a local harness against the visible examples: `exam
- `ui-sonnet-1` — 62 failed. > t keep retrying). The important deliverable is in place and verified: **`submission/subject.mjs`** is written and correctly hand

None of these is a model being careless. Every one of them describes a verification procedure
in the same transcript, and the procedure ran. What it did not do is generate the states where
the property breaks — which is the coverage argument, arriving from the models' own words
rather than from the axis meter.

## What each model ran

Commands quoted in the transcripts, verbatim. These are the model's account of what it executed;
nothing here re-ran them.

| command | runs |
|---|---|
| `node --check submission/subject.mjs` | 2 |

## What this report will not support

| claim | why not |
|---|---|
| that one lab is better at these families | the counts are far below the five-trial threshold and the families are two |
| that longer submissions are better | the longest submission on record is also among the highest failure counts |
| that a model is poorly calibrated in general | `overconfident` here is a property of one transcript's wording against one outcome, not a measurement of calibration |
| that the commands listed were actually run | they are quoted from the model's own account; nothing re-executed them |

---

Generated by `agent-eval-foundry`. Deterministic — no timestamp, diffable.
