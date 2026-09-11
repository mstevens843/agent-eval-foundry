# Run one bounded model trial

This recipe supports Node portfolio and template packages using the existing isolated,
durable real-provider execution adapter. Complete [the quickstart](quickstart.md) first.
It is an optional step: local validation and the recorded replay require no subscription.

`trial init` and `trial plan` make zero model calls. Only **`trial run CONFIG --execute`**
authorizes and launches one subscription attempt. The command creates one durable reservation,
has no automatic retry, and provides no paid API fallback. A timeout does not prove task hardness.

## Prepare the provider image and credentials

```sh
docker build -t foundry-provider-agent:local containers/provider-agent
```

The existing image recipe pins the provider CLI package versions. Its base tag is resolved
when built; `trial init` records the resulting immutable local image digest in the configuration.
Save that image and config when you need the same authoring environment later.

The introductory image includes Node, Git and ripgrep. Browser tasks and tasks needing other
authoring tools need an appropriate image; use the template for your first run.

- **Codex:** authenticate your host CLI with your ChatGPT subscription. The existing adapter
  stages only its OAuth `auth.json` credential file, not your sessions/history/config, and
  rejects API-key credentials. `CODEX_HOME` is respected when already configured.
- **Claude:** provide your subscription OAuth token through `CLAUDE_CODE_OAUTH_TOKEN` in the
  invoking environment. Do not put tokens in the config, source, command arguments or Git.

The project records requested model settings in `src/execution/profiles.ts`. These settings
must be available to your subscription. Runtime identity observations can remain unknown;
a requested model name alone is not backend attestation.

## Create and inspect the configuration

From the repository root, using the quickstart's package and receipt:

```sh
pnpm foundry trial init codex .local/quickstart/build .local/quickstart/validation/assurance.json .local/quickstart/trial.json
pnpm foundry trial plan .local/quickstart/trial.json
```

Use `claude` instead of `codex` to select that provider. Config paths are relative to the
config file. The generated settings include:

| Setting | Default and meaning |
| --- | --- |
| `runId` | `first-trial`; one attempt, one slot |
| `store` | `first-trial-jobs`; must be a new directory |
| `wallSeconds` | 900; bounded authoring time, configurable from 30 to 18,000 |
| `memoryMiB` | 2,048; configurable from 512 to 16,384 |
| `authoringImage` | Exact locally inspected image digest |
| `contractReviewed` | `false`; inspect the public contract and successful assurance before setting `true` |

The plan shows the package/profile digests, requested model/effort, resource limits and
result directory. Planning does not read credentials, reserve a job or launch an agent.
The wall limit applies to authoring; preparation, grading and evidence publication take additional time.

## Explicitly execute

After reviewing the config and setting `contractReviewed` to `true`:

```sh
pnpm foundry trial run .local/quickstart/trial.json --execute
```

The solver gets a fresh writable copy of public task files in a container with the declared
resources and network access. The grader and reference are not mounted into that workspace.
The existing adapter bounds output, captures the submission and runs protected grading.
Ctrl-C requests cancellation and container cleanup; if the process is forcibly killed, inspect
the durable state before considering another attempt.

The same store cannot be reused by this introductory command. Repeating the command fails
instead of silently spending another attempt. The advanced [execution guide](authorized-execution.md)
explains uncertain dispatch, reconciliation and regrading.

## Inspect the result

```sh
pnpm foundry execution inspect .local/quickstart/first-trial-jobs first-trial
pnpm foundry execution verify .local/quickstart/first-trial-jobs/real-provider/records/first-trial
```

The completed record includes reservation, profile, capture, submitted files, observations
and grading evidence. `plan.json` lives at the store root. Incomplete records remain under
`real-provider/.incomplete/`; inspect the store even when no final directory was produced.

- A successful process exit is not a semantic pass; inspect grading results.
- Invalid execution, timeout, provider refusal and infrastructure failures require diagnosis.
- A correct service may still fail a separately required checker deliverable.
- One attempt does not establish a six-trial result, and the simple template is not a hardness benchmark.

The automated onboarding check exercises planning and execution guards without dispatching a
provider. A live subscription run must be validated separately in the intended provider environment.
