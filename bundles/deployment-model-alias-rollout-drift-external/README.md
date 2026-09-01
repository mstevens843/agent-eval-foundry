# External evidence packet: deployment-model-alias-rollout-drift

This packet is for a third-party model or human run. It exists to make outside evidence
countable without importing hidden context into the run.

| item | pinned value |
|---|---|
| challenge hash | `0e9b87a5f260544cfbc1cdce8f08938c` |
| scenario set | `drift-339-590affe3` |
| provider slot | `external` / `external/unspecified` |

Return the whole directory after the run. The returned packet must include:

- `challenge/`
- `submission/subject.mjs`
- `transcript.txt or transcript.json`
- `metadata.json`
- `verifier-output.json`
- `run-summary.json (optional)`

Rules:

- Use only the public `challenge/` package in this directory.
- Do not edit files under `challenge/`.
- Do not include hidden verifier, reference, mutants, scenarios, answer matrix or source internals.
- Preserve the exact package hash in `challenge_hash.txt` and `metadata.json`.
- Fill in provider, model, runtime and date in `metadata.json`.
- Save the full transcript, including refusal or infrastructure failure.
- Provider refusal, infrastructure failure, stale hash, contamination and missing artifacts are preserved but do not count.
- OpenAI-only repeats estimate same-provider stability; they do not create cross-lab evidence.

The importer validates the returned packet first. A malformed packet is retained as no-count
evidence rather than quietly becoming a trial result.
