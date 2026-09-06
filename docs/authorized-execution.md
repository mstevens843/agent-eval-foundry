# Authorized execution and immutable trial evidence

The execution layer is a **local, signed-reservation lifecycle**, not permission to run models. Its shipped CLI demonstrations use an inert Go program in a Docker container. They edit real public task workspaces, run real tools, submit multi-file artifacts to the retained CAA/browser graders, and publish evidence. Their results cannot qualify as model trials.

The existing direct shell, campaign and phase-specific provider entry points remain disabled. A plain `approved: true`, a working directory, or an installed CLI cannot unlock them. Actual provider adapters must be supplied through the reserved host-service interface after separate authorization and deployment review; no live provider adapter or spending authorization is enrolled by the demo.

## Quick use

Execution storage requires Node **22.13 or later** with `node:sqlite` (tested on 22.22.1); older read-only foundry APIs retain their existing Node range. SQLite is built in, so this feature adds no package/native-module dependency. Its experimental warning on Node 22 is expected. Docker and the already-built package runtimes are needed for container integration. No downloads happen implicitly in the new authoring adapter.

```sh
pnpm build
pnpm exec vitest run test/execution-lifecycle.test.ts test/package-evidence-decisions.test.ts
pnpm package:local execution profiles
pnpm package:local execution inspect PATH_TO_JOB_STORE
pnpm package:local execution verify PATH_TO_COMPLETED_RECORD
```

Run the full no-provider integration against existing exports, not source task directories:

```sh
node scripts/verify-authorized-execution.mjs NATIVE_EXPORT BROWSER_EXPORT PINNED_GO_ENVIRONMENT_IMAGE FRESH_OUTPUT_DIRECTORY
```

It builds the small inert adapter using the cached Go image, then exercises correct/incorrect native CAA and browser submissions, malformed output, oversized output, interruption, timeout and a child process. It checks public-tool access, host-credential/private-file exclusion, a permitted HTTP tool fixture, linked regrading and read-only inspection. Missing prerequisites fail; they are not reported as skipped successes.

Individual operations:

The incorrect CAA fixture overlays the retained `any-authorizes` near-miss on the correct planner: it finishes every scenario but makes a wrong issuance decision. The unchanged starter sometimes exits with a process error, which remains invalid execution rather than a clean semantic failure. Neither local fixture is an agent attempt.

`missing-file` is an additional artifact-integrity fixture: it removes `internal/authz/planner.go` (native) or `entry.mjs` (Node) after applying the correct overlay. Native grading requires an empty destination and copies the exact captured tree without merge behavior. Its frozen grader subsequently reinstates the explicitly read-only `go.mod` and order type definitions, as it did before this work; the fixture therefore removes mutable implementation code, not one of those protected public files. It must remain invalid, never a semantic model failure.

```text
execution build-inert OUTPUT PINNED_GO_IMAGE
execution demo PACKAGE RECEIPT STORE RUN_ID MODE TARGET INERT_BINARY [LOCAL_TOOL_URL]
execution resume PACKAGE RECEIPT STORE RUN_ID INERT_BINARY
execution inspect STORE [RUN_ID]
execution verify COMPLETED_DIRECTORY
execution reconcile STORE RUN_ID EVIDENCE_JSON
execution regrade ORIGINAL_DIRECTORY NEW_PACKAGE OUTPUT_STORE NEW_ID
```

`TARGET` is `codex` or `claude`. `MODE` is `correct`, `incorrect`, `timeout`, `malformed`, `large-output`, `interrupted`, or `child-process`. These select inert fixtures, **not models**. `demo` creates only an ephemeral-key, simulation-realm authorization for that single demonstration; it never creates real spend authority. Supply the native exported `assurance.json` or the portfolio export's `verification/assurance.json`. Their content/coverage is checked, not just their existence.

## Profiles and qualification

The requested pairs in [profiles.ts](../src/execution/profiles.ts) match [TB3 defaults at the pinned revision](https://github.com/harbor-framework/terminal-bench/blob/83c7a6172d629c6575b785ab12c8db787bb2e323/.github/harbor-run-defaults.yml): `openai/gpt-5.6-sol` with `xhigh`, and `anthropic/claude-opus-5` with `max`. The Claude output request is 128,000 tokens. Those defaults use Modal; the local Docker simulation does not claim backend equivalence or current destination qualification.

Profile identity covers requested model/effort/provider/scaffold, adapter version, scaffold-version uncertainty, context handling, image, grading route, tools/network/credential policy, and resource bounds. Requested settings and observations are separate objects. Missing model/effort/scaffold-version observations or unknown/used fallback block exact-target qualification. Historical imports retain unknowns rather than copying a requested string into an observed field. Capture retains requested argv, image/runtime state, raw output and the built execution-source identity.

Official [Codex non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode) describes explicit sandbox settings and JSONL events. That informed requested launch configuration and streaming capture, not a claim that a command line attests the backend. The pinned CI does not establish an immutable CLI version, provider receipt schema, context-compaction behavior or account access for a future run.

The policy requires three genuine standard failures for each exact target and one substantive zero-reward adversarial attempt per target. Five of six may be promising; it is not six of six. A refusal, timeout, crash, invalid grading or missing artifact is not a substantive adversarial zero. A legitimate nonzero solution misses the zero-reward requirement but is not automatically an exploit. Duplicate/selected attempts, simulations, missing identity and changed package bytes cannot satisfy the policy. The package release decision also requires the exact-profile observations and substantive audit evidence; profile names alone are insufficient.

## Authorization and transactional storage

`JobStore.install` validates an Ed25519 signature over canonical JSON using an **operator-configured trusted public key**, not a key accepted from the incoming envelope. The verified public key and envelope are retained. Private signing keys and provider credentials never enter a solver workspace.

```text
envelope: authority, payload, signature
payload:
  schemaVersion, id, realm
  packageDigest, profileDigest, operations
  notBefore, expires
  maxAttempts, maxConcurrent
  maxMicroUsd, perAttemptMicroUsd
  maxMemoryMiB, maxCpuUnits, maxOutputBytes
  retryInfrastructure
```

Operations are `standard` or `adversarial`; realm is `simulation` or `real-provider`. Money uses integer microdollars. A job request binds run ID, package/profile, operation, slot, attempt, retry parent, realm, memory/CPU/capture allocation and a nullable price estimate. The store validates all bindings before reserving. It uses `BEGIN IMMEDIATE`, full durability, unique IDs/slot keys and indexed authorization/slot queries. Reservation checks do not parse the entire trial history. Independent workers cannot reserve the same slot twice.

The approval is necessary, not sufficient. Package eligibility is independently evaluated with the existing package policy. Local simulation needs local validity; real work needs trial eligibility, including required human evidence. `JobStore.reservation` produces an in-process capability backed by a currently active signed reservation; a deserialized lookalike is rejected by `decidePackage`. It is not a second source of spend authority.

Budget accounting keeps **estimate**, **reserved ceiling**, **provider-reported usage**, and **settled amount** separate. Missing price/billing remains null and holds the reservation, including after completion or uncertain dispatch. An observed overrun is retained and prevents further affordable reservations; it is not erased to fit the cap. Simulation cost zero explicitly means no provider was called.

Reservation limits prevent overcommitting local approvals; they are **not a claim of a provider-enforced billing cap**. Before connecting a real provider, its host adapter must supply reviewed credential mediation and enforceable request/account limits, retain actual usage/billing evidence, and document any unobservable settings. No such external guarantee is inferred from this local test. The default CLI cannot launch a live provider.

## States, interruption and recovery

```text
reserved → dispatching → captured → graded → publishing → completed
              ↓
       dispatch-uncertain → explicit reconciliation → cancelled
reserved → cancelled
```

Each claim has an owner, random fencing token and expiring lease. Dispatch intent is committed **before** launching an adapter. A second low-level adapter call also encounters an exclusive dispatch marker. Lease heartbeats maintain ownership while async work runs. An expired `dispatching` job becomes uncertain; it is never automatically resent. This does not promise exactly-once external spend across a lost provider response.

Before dispatch, a new worker may reclaim an expired reservation. After capture or grading, resume consumes retained stage receipts without another authoring invocation. After publication but before SQLite completion, resume verifies the published manifest and completes the index entry. Changed execution code, package/profile, mode or adapter bytes refuse resume. Use the retained executable/version or create an explicitly linked new evaluation, rather than silently continuing under a different evaluator.

If a worker dies during preparation or before a stage receipt is durable, partial files remain inspectable. They are never guessed into successful evidence. If no trustworthy capture can be recovered, reconcile explicitly and retain an invalid execution. Infrastructure retries require an allowed policy, a terminal invalid predecessor and explicit lineage. Semantic failures cannot be retried in the same slot to sample toward a preferred answer. A fresh campaign/slot is a new, separately reviewable design, not a hidden retry.

For `dispatch-uncertain`, inspect the job/events and the retained `authoring-environment.json`. Stop/reap any still-running **specific task-owned container** before releasing its resource allocation. Supply a reconciliation record with a reason, a SHA-256 receipt/evidence reference and either `not-dispatched` or `outcome-unavailable`. The first requires affirmative external/operator evidence that no dispatch occurred; missing logs do not prove it. Unknown outcome retains the monetary ceiling. Reconciliation never launches an adapter or changes original trial evidence.

## Authoring, capture and grading boundaries

Native CAA exposes its writable service at the contract's actual `/app/certd` path, backed by a fresh bounded tmpfs populated from the verified public assembly. Its pinned image supplies the read-only public `/app/harness` and `/app/spec` paths. The Node fixture works in `/work/task/public`. Captured tool events include the actual working directory.

The inert solver runs as UID 1000 in a pinned container, with dropped capabilities, no new privileges, a read-only root filesystem and bounded private tmpfs scratch. Only the exact verified public package and inert executable are mounted read-only. No foundry tree, verifier, historical solution, job database, Docker socket or host credential file is mounted. `/work` is newly created for every attempt. `/tmp` permits execution so legitimate compiled self-tests work; it is not a shared host directory.

Network policy belongs to authoring, not grading. The default simulation has no network. The HTTP-tool test explicitly selects bridge networking and records its local tool endpoint; this demonstrates legitimate external-tool access without exposing private mounts. Bridge mode is **not an egress allowlist**. A destination requiring open internet needs a reviewed matching profile, not the assertion that a no-network grader is a sufficient solver environment.

Capture writes separate stdout, stderr and JSONL files with a combined byte ceiling, backpressure, a bounded event line and short diagnostic tails. It preserves usage before later failure. Process exit, cancellation, timeout, output overflow and malformed events remain explicit. The adapter exports complete multi-file artifacts and scratch/self-check source in bounded chunks, with path/type/order/size validation. Inert adapter output is labelled simulation; task output is not treated as a trusted provider identity receipt.

Authoring has CPU, memory, process and time limits. Its Docker container is removed on cancellation/completion; process-group cleanup also reaps local descendants. CAA's profile reserves the larger four-GiB route requirement. Capture bytes and artifact bytes are separate limits; completed evidence has its own 128-MiB/4,096-entry ceiling. Runtime/toolchain archives remain content-addressed dependencies and are not recopied into every run.

Grading accepts arbitrary submitted service trees or `entry.mjs` plus companion files. CAA uses its frozen separate-verifier image; browser replay uses its authority-owned real Chromium route. Complete expected scenario/check accounting is reapplied to their outputs. Missing/duplicate scenarios, typed collector errors or conflicting reward/evaluation envelopes cannot become semantic failures.

## Durable evidence and the next consumer

Completed directories contain the public files, retained package blobs, requested profile, authorization, adapter/source identity, captured output/events, submission, scratch, independent grading observations and traces, normalized result, accounting and an explicit completion manifest. Publication flushes bytes and atomically renames an owned staging directory. IDs cannot overwrite a completed run. Manifest verification detects edits. This protects against solver writes and accidental application overwrite, not a malicious host administrator rewriting the entire store.

The compatibility trial writer now also reserves exclusively and publishes a manifest. Old trial directories remain readable without rewriting their historical bytes. New corrections/adjudications belong in separate linked records; appending to a sealed trial invalidates its manifest. Staging/reservation directories are excluded from legacy family enumeration. External intake refuses simulation provenance and retains unknown runtime identity for historical imports.

`regrade` creates a new immutable record linked to the original completion digest and new package/evaluator identity. It preserves the original submission/results and reports zero new agent attempts. `inspect` and `verify` dispatch nothing and do not rewrite evidence.

New external intake envelopes store original returned files under `packet/`, separately from the host-owned `intake-result.json` and completion manifest. Duplicate IDs refuse overwrite; older envelopes remain readable. Infrastructure retries carry `retryOf` and a nonempty `retryReason`, preserve invalid predecessors, and need retry permission in the signed authorization. A preparation error before dispatch closes an invalid job with zero external spend and retains its incomplete directory.

Prompt 6 can consume `result.json`, `capture/events.jsonl`, `workspace/`, `grading/`, `execution-events.json`, `completion.json`, and the read-only job/event queries. It should add evidence-linked views/findings and versioned adjudication rather than mutate these records. Real trials, exact effective provider observations, human reviews and release qualification remain external and unexecuted.
