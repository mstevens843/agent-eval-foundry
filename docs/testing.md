# Verification tiers and recipient reproduction

Use the pinned Node and pnpm versions. Dependencies are installed with the frozen lockfile. None of these commands needs provider credentials or runs model trials.

| Tier | Command | Purpose |
| --- | --- | --- |
| Fast pure checks | `pnpm test:pure` | Exact statistics, missingness, policy and semantic integrity fixtures |
| Developer onboarding | `pnpm test:onboarding .local/onboarding-NEW` | Custom task, correct/broken grading, standalone export, frozen replay and trial planning; Docker, no provider calls |
| Family semantics | `pnpm test:semantic` | Full selected local reference/negative sweeps, package contracts and research compatibility |
| Execution failures | `pnpm test:execution` | Inert processes, durable reservations, recovery, capture and immutable results |
| Historical evidence | `pnpm test:history` | Preserved outcomes, adjudications, inspection, findings, correction propagation and current prose |
| Required protected routes | `pnpm test:protected` | Actual Docker execution, all twelve generic routes and full retained population tests |
| All maintained tests | `pnpm test` | Every file under `test/`, with zero allowed silent skips |
| Native/browser production | `pnpm test:integration .local/integration-NEW` | All registered professional packages, primary native/browser inert execution and recipient reproduction |

The suite inventory is `scripts/test-tiers.mjs`. New test files default to the semantic tier until explicitly reviewed. Vitest discovers only `test/**/*.test.ts`: private archived workspaces and their test copies are not repository test inputs. Two workers limit duplicated large sweeps and idle memory. Every tier writes an exclusive JSON result and counts passed, failed and skipped tests. A missing required runtime fails the tier before execution; any skipped assertion or empty/failed suite also makes the tier fail.

Test runs print progress and assertion failures to the console while preserving the full `tests.json` report. Each `summary.json` also includes failed test names, paths and messages, including suite setup or collection errors. CI uploads these files and the runtime preflight log even when a test fails. Diagnose the failed assertion, rather than an earlier stderr message: the deliberately missing-image regression expects Docker startup to fail and verifies that it is classified as an infrastructure error.

The container isolation probe uses `--pull=never`. Runtime setup installs the required image before testing; a missing image stays a local infrastructure error. Its Docker error is retained in the probe result without printing an expected failure as an unrelated CI error.

The protected tier includes long whole-population compatibility checks, not just a schema or one representative cell. It is intentionally separate from the fast tier. Broad local semantic sweeps, boundary controls and whole-population route tests establish different properties; none is a substitute for another.

Generic protected cells capture bounded module bytes once, transfer them over the authority's input pipe and materialize root-owned read-only public files in a private container tmpfs. They do not mount a short-lived host staging directory. This removes a dependency that intermittently failed during Docker Desktop mount setup; it does not claim to repair Docker itself. Real route controls check the subject UID, working directory, public-file immutability and protected authority state. Startup, protocol, artifact and resource errors retain bounded diagnostics and are never automatically retried into a passing result.

## Runtime setup

Docker must start real containers. The generic tests use `node:22-alpine`; the professional runtime is pinned in its Dockerfile. Native CAA has pinned environment/verifier recipes. First-time setup may download dependencies; later validation and submitted compilation are offline.

```sh
docker pull node:22-alpine
docker build --provenance=false -t foundry-portfolio-runtime:v1 tasks/portfolio-runtime
docker pull golang:1.25-bookworm
pnpm build
pnpm test:integration .local/integration-NEW
```

The Go tag only bootstraps an inert test-author binary; the integration records and uses its actual image digest. It is not a target model. Native package builds independently retain their pinned images.

Allow two GiB per registered professional package plus six GiB reserve/build overhead,
and additional room for unrelated Docker activity: 56 GiB for twenty-five packages,
26 GiB for ten, versus the original 16 GiB five-package budget. The original measured archive/export population
was about 10 GiB for five packages. Archive publication budgets a complete copy even
when cloning succeeds; each stage checks the remaining reserve. On macOS the runtime
copier uses APFS cloning because the measured Node forced-clone API returns ENOSYS.
Recipients receive independent files, never links to another package's archive. On an
I/O failure, retain logs and treat the run as incomplete. Do not relabel failed startup
as a subject failure or prune unrelated Docker data.

## Required final checks

```sh
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm verify
pnpm verify:candidate .local/candidate-NEW
```

`verify` reproduces current generated reports and verifies preserved-version compatibility. `verify:candidate` copies the explicit intended-file manifest, excludes ignored/private artifacts, installs locked dependencies offline, rebuilds ESM/CJS/declarations, validates the registry and compares recipient gate reports. It does not use ambient `dist`, credentials, a sibling repository or private prompts. Candidate verification is not a claim that an uncommitted tree is already released. Existing destinations are refused; failed checks retain evidence.

Generated provider and shared-bank reports use the declared provider registry and retained trial evidence. They mark local availability as **not inspected**, so installed CLI versions and credential presence cannot change the checked-in output. Use `foundry trials providers` for live availability; execution preflight still performs its normal checks. Candidate verification also compares these portable provider reports.

Historical queries do not perform new grading: `phase13 report`, `phase13 results` and `phase13 design` read the retained calibration; `phase13 measure` explicitly starts current local measurements. The Phase 17 report reads its retained preflight instead of inspecting current credentials or Docker. Missing container receipts remain missing evidence, even on a healthy machine. Tests forbid child-process dispatch from these historical query paths. Full `verify` still performs its separately declared protected grading smoke; read-only report generation does not substitute for that check.

CI treats required Docker/native/browser failures as failures, not informational green skips. Destination rubric/model runs and the required human-authored reviewer README remain separate final qualification requirements. A separately measured human solve is optional and does not block exploratory trials. See [selected-package validation](top-five-implementation.md).

## CI jobs and portable source evidence

The workflow runs fast quality checks first, then runs the maintained test suite, full package integration, and report/recipient reproduction in separate required matrix jobs. They retain the same checks and no longer share a single two-hour job budget. Integration removes unused SDKs from its disposable GitHub-hosted runner before assembling archives; its storage preflight still enforces the full 56 GiB requirement. Each runtime job uploads its own diagnostics on failure.

Phase 15's frozen corpus originally named two Outbox documents in the author's sibling repository. Exact copies now live in `data/phase-15-source-snapshots/`, verified against the original corpus hashes. A fresh checkout audits those copies without accessing the author's filesystem. Missing and modified snapshots still fail; the historical preregistration and source corpus remain unchanged.

## Retained service audit

A small public [checker-defect replay](../examples/replays/premature-publication/README.md)
is available through `pnpm replay:example`. It includes an original submitted checker,
three retained traces and a scoped frozen oracle. Its documented scope is one defect;
the full historical model matrices remain a different reproduction claim.

The service-replay regression always verifies the published scenario coverage and results in a clean checkout. An additional Docker replay uses private retained submissions and frozen runtime archives; enable it explicitly on the authoring machine:

```sh
FOUNDRY_DOCKER_AUDIT=1 pnpm exec vitest run test/remaining-service-replay.test.ts
```

This command makes no model calls. Missing private archives are an error when the replay is requested. Normal CI checks the portable published evidence and runs its separate required Docker/native/browser suites.
