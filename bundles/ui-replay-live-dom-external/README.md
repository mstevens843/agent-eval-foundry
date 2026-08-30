# Run this trial: ui-replay-live-dom on Run elsewhere and imported

This directory is a complete, self-contained trial bundle. Nothing in it is optional.

## What to do

1. Run `./run.sh`, or give `INSTRUCTION.txt` to the model any way you like.
2. The model must write **exactly one file**: `submission/subject.mjs`.
3. Save the model's full output to `transcript.txt` — including a refusal, if that is what happened.
4. Fill in `metadata.json`. Do not change `challengeHash` or `scenarioSetId`.
5. Hand the directory back:

```bash
foundry trials campaign import --family ui-replay-live-dom <this-directory>
```

## What the importer will check

| check | why |
|---|---|
| `challengeHash` equals `18c3f5afc5973604205cd7df23ce4cad` | a trial run against a different version of the task is evidence about that version, not this one |
| `transcript.txt` exists and is non-empty | a run with no transcript cannot be audited, so it cannot count |
| `submission/subject.mjs` exists | a counted trial needs the artifact it was graded on |
| the submission is not a checked-in baseline | an artifact that does nothing is the absence of an attempt |
| `status` is one of the declared classifications | a refusal is not a failure and must not be filed as one |

**If the model refused**, set `status` to `refused`, save the transcript, and import it anyway.
A refusal is a real result about the provider and it is never counted as a model failure.

**If the provider could not authenticate or errored**, set `status` to `infrastructure_error`.

## The task

9 files under `challenge/`, scenario set `dom-864-3a8cb30a`.
The grading is not in this bundle and must not be: the model is graded against scenarios it has
never seen, drawn from the declared space its `SPEC.md` publishes in full.
