# Local package production

The foundry can assemble, validate and export the native Go CAA repair task from one retained artifact graph. It does not run an agent or certify task difficulty. The older scaffold/promotion commands still produce authoring drafts; this production command produces an executable recipient package.

## Run it

Prerequisites: this checkout, its installed locked dependencies, Node/pnpm, and a running Docker daemon. Build recipes pin the Go base-image digest, Debian snapshot and Python package versions. The first image build may download those inputs. Grading containers have networking disabled; the submitted service compiles offline.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm package:local produce .local/caa-build .local/caa-recipient
```

Use fresh output paths. Existing destinations are rejected, never merged or overwritten. The last command builds the artifact, runs every local assurance operation and exports only after a matching successful receipt exists. Failure leaves its logs and typed results for inspection. It does not call provider CLIs, reserve model spend, run official `/run` or `/cheat`, or publish externally. A saved approval for `pnpm package:local` covers the named local workflow, not arbitrary provider work.

The operations are also available separately:

```sh
pnpm package:local build .local/caa-build
pnpm package:local inspect .local/caa-build
pnpm package:local validate .local/caa-build
pnpm package:local inspect .local/caa-build .local/caa-build/validations/RUN_ID/assurance.json
pnpm package:local export .local/caa-build .local/caa-recipient .local/caa-build/validations/RUN_ID/assurance.json
pnpm package:local inspect .local/caa-recipient
pnpm package:local validate .local/caa-recipient
```

Replace `RUN_ID` with the receipt location printed by `validate`; it is a fresh local control run, not a model trial. `inspect` performs no Docker operation or write. Without a supplied/retained receipt it reports unknown assurance, not inferred success. Recipient inspection checks its copied receipt and all referenced evidence bytes. Revalidation makes a new receipt without replacing the export's original evidence.

For a second build from unchanged inputs, compare the complete task graph, runtime archive and package identity, and prove read-only receipt inspection:

```sh
pnpm package:local build .local/caa-repeat
node scripts/verify-native-package-reproduction.mjs .local/caa-build .local/caa-repeat .local/caa-recipient
```

## What the recipient gets

```text
caa-recipient/
  package.json                 package digest and task-directory pointer
  store/                       immutable component records and content blobs
  runtime.tar                  exact environment + verifier images
  tasks/caa-revalidation-repair/
    instruction.md
    task.toml
    environment/               working service and public development harness
    tests/                     private independent grading and local controls
    solution/                  executable oracle
  public/                      instruction + environment only
  assurance.json               exact local-control receipt
  evidence/                    logs, observations and control outputs
  export.json                  receipt binding and export description
```

The recipient is the trusted task owner/reviewer, **not the solving agent**. Never mount the whole recipient bundle into the agent workspace. Private solutions, scenarios, authority state and verifier assets stay outside the visible bundle. `tasks/caa-revalidation-repair` uses the task's actual metadata name, not a generic `task` folder.

The exported task is derived from the same `AssemblyPlan` and content-addressed package used for validation. There is no second hand-maintained export implementation. Generated baseline files come from the actual public spec/harness, and injected format canaries remain comments. The development harness understands comment lines in its time fixture, and its visible example is executed as assurance.

`runtime.tar` transports the exact resolved image IDs. Validation checks its size/hash before loading those images; it never substitutes an unverified mutable tag. Rebuilding a Dockerfile against changed resolved image bytes creates a different full identity even if the task text stayed the same. Repeatability here is within a declared platform and resolved-runtime boundary, not a claim of bit-identical fresh remote builds on every architecture. Build logs, UUID paths and elapsed times are evidence metadata, not task semantics.

## Executable local assurance

Every result names package digest, implementation/component digest, route, evidence class, control ID, status, duration and observations. The native route is `native-caa/separate-container/test.sh@2`. A list of green booleans, an empty list, mismatched artifact or modified evidence directory cannot satisfy receipt coverage.

The current 27 required operations include:

- Derivation/checking of the public section-to-obligation manifest, and actual execution of the visible Go tests/development example.
- All 22 retained static format scripts against the assembled task.
- Oracle, independently structured alternative, and an alternative using a harmless standard-library feature previously caught by a heuristic source ban. Each earns reward one through the actual public source-artifact interface.
- The unchanged starter (`nop`), 15 designated wrong implementations, and three artifact-path controls through the same `test.sh` interface. Those controls earn reward zero. They are deterministic local controls, not model adversarial trials.
- Artifact/resource/authority checks, including positive controls proving the private channel exists while the submitted privilege cannot reach it.
- Selected and non-activation scenario matrices; repeated correct/incorrect verdicts; visibility scanning over the complete assembled public tree with a detector-positive canary.

The 15 wrong implementations include wrong identity/result association, incorrect freshness boundary, stale cached decisions, any-domain instead of all-domain issuance, always issue/refuse, no work, fabricated audit, example hardcoding, three forms of serialization, wrong order identity and unrelated-cache loss. Their intended checks must actually fire. A no-op may satisfy a safety predicate while failing overall positive work; that is not a defect.

The shared section mapping establishes engineering traceability, not an independent fairness review. Local correctness and integrity are necessary conditions for trial eligibility, not proof that this package defeats frontier agents.

## Bounded execution and evidence authority

Submitted Go compilation runs unprivileged and offline, with a 180-second limit. Each service invocation has a 60-second limit, 1 MiB per output stream, and bounded regular-file artifacts. The visible contract also declares source file/count/depth limits and prohibits lingering subprocesses.

The collector streams pipe output, retains bounded excerpts/byte counts, terminates the process group and reaps descendants. In dedicated Linux verifier containers, an exclusive submission UID and subreaper also cover descendants that detach into a new session. Do not reuse that UID-cleanup facility on a shared host. Docker additionally bounds CPU, memory and process count. Only the workflow's exact generated container names are cleaned up.

Timeout, noisy output, build error, malformed output and collection failure remain typed invalid outcomes. They cannot accidentally count as completed model-solution failures. The native local evaluator explicitly sets `countsAsModelFailure: false`: no model attempt was made.

Source-string bans are not the authority boundary. Private inputs/control channels and grading output are protected structurally; actual alternative implementations and denial/positive controls exercise that boundary. No finite control bank proves the verifier universally unexploitable.

Receipts are trusted local-author records with byte consistency checks, not cryptographic attestations by an independent reviewer. A trusted owner able to rewrite all records is outside the submitted-service threat boundary. Preserve/export raw observations; downstream qualification must not substitute author confidence for independent review.

## Reuse without importing CAA semantics

- `src/packages/assembly.ts`: `AssemblyPlan`, `assemblePackage`, `inspectAssembly`, `materializeAssembly`, `verifyAssembly`, `copySnapshot`. Uses Prompt 1's record/CAS; enforces boundaries, completeness, modes and exact file parity.
- `src/packages/assurance.ts`: typed `runAssurance`, exact `assertAssuranceCoverage`, and timing-independent `assuranceVerdictDigest`. Trusted local callbacks cannot be silently relabelled as model evidence.
- `src/packages/local-process.ts`: bounded trusted-tool execution with fully flushed logs, explicit timeout/output errors and streamed large-file hashing.
- `src/packages/native-caa.ts`: the domain adapter—CAA control names, Docker assembly and per-check interpretation live here, not in generic components.

The numeric fixture in `test/package-production.test.ts` actually assembles, executes an oracle/verifier, records assurance and copies an export using these APIs without CAA fields. It is an abstraction regression, not the second serious task package. Prompt 4 owns that second production proof.

## Performance and compatibility

The sampler now appends to owned arrays and calculates each identity/hash once, retaining historical ranking and tie-breaking. Valid fractions are finite `(0, 1]`; identities must be unique and nonempty. Existing family selections are pinned in `data/package-production-generation-baseline.json` and checked for exact membership/order. Wallet classifies all 82,944 points using the same decision function without allocating a full world for rejected points; its 804 selected parameters remain identical.

`representativeJaccardGroups` names the existing representative-based grouping correctly. `jaccardGroups` remains a compatibility alias. It does not promise all pairs in a cluster meet the threshold; the antichain algorithm is unchanged.

Reproduce the isolated performance comparison:

```sh
pnpm exec tsup scripts/benchmark-package-generation.ts --out-dir .local/generation-benchmark --format esm --no-dts
node .local/generation-benchmark/benchmark-package-generation.js
```

Measured results and their hardware/memory scope are retained in `reports/verification/prompt-02-generation-performance.json`. They are generator microbenchmarks, not overall task-production throughput or predicted trial yield.

## What remains outside local completion

Independent human-time/fairness review, human-authored reviewer material, official implementation rubric, standard model trials and official adversarial trials remain pending. The task metadata's historical six-hour expert estimate is not evidence for the owner's desired two-to-three-hour human solve. No estimate was silently changed to make that gate pass. The shared package policy denies trial/release qualification until required evidence and authorization exist.

Native CAA is the first integration vehicle, not a proven-hard winner and not the generic 24-case CAA calibration route. The ten remaining protected family adapters, checker API completion, substantial portfolio construction and durable provider execution remain separate later assignments. See the tracked Prompt 2 report and implementation gap ledger for exact current proof and ownership.
