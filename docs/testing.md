# Verification tiers and recipient reproduction

Use the pinned Node and pnpm versions. Dependencies are installed with the frozen lockfile. None of these commands needs provider credentials or runs model trials.

| Tier | Command | Purpose |
| --- | --- | --- |
| Fast pure checks | `pnpm test:pure` | Exact statistics, missingness, policy and semantic integrity fixtures |
| Family semantics | `pnpm test:semantic` | Full selected local reference/negative sweeps, package contracts and research compatibility |
| Execution failures | `pnpm test:execution` | Inert processes, durable reservations, recovery, capture and immutable results |
| Historical evidence | `pnpm test:history` | Preserved outcomes, adjudications, inspection, findings, correction propagation and current prose |
| Required protected routes | `pnpm test:protected` | Actual Docker execution, all twelve generic routes and full retained population tests |
| All maintained tests | `pnpm test` | Every file under `test/`, with zero allowed silent skips |
| Native/browser production | `pnpm test:integration .local/integration-NEW` | Five package builds/controls/exports, primary native/browser inert execution and recipient reproduction |

The suite inventory is `scripts/test-tiers.mjs`. New test files default to the semantic tier until explicitly reviewed. Vitest discovers only `test/**/*.test.ts`: private archived workspaces and their test copies are not repository test inputs. Two workers limit duplicated large sweeps and idle memory. Every tier writes an exclusive JSON result and counts passed, failed and skipped tests. A missing required runtime fails the tier before execution; any skipped assertion or empty/failed suite also makes the tier fail.

The protected tier includes long whole-population compatibility checks, not just a schema or one representative cell. It is intentionally separate from the fast tier. Broad local semantic sweeps, boundary controls and whole-population route tests establish different properties; none is a substitute for another.

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

Allow at least 12 GiB of free host space for the five-package integration and additional room for Docker's own storage. The observed archive/export population is about 10 GiB; copy-on-write is best-effort, not a storage guarantee. The integration refuses insufficient space before building. On an I/O failure, retain logs and treat the run as incomplete; do not relabel failed startup as a subject failure or prune unrelated Docker data.

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

CI treats required Docker/native/browser failures as failures, not informational green skips. Destination rubric/model runs and independent human reviews remain separate external qualification requirements.
