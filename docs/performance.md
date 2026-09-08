# Performance and scaling

Measure useful work and resource use before changing algorithms. Local timings are diagnostic evidence on one machine, not production SLOs or forecast task yield.

The integration benchmark uses Node 22.22.1 on an Apple M4 Pro, arm64, with 24 GiB memory. A fresh Node worker measures each matrix input first and then repeats it warm, including two seeded null-model trials and sparse cells. Here cold means the first evaluation of that input, not a cold operating-system cache. Its largest fixture has 1,000 instances, 48 subjects and 986 distinct observed catch patterns.

Initial comparison: that fixture fell from about 6.4 seconds to 1.28 seconds per full measurement. All result digests, output bytes, missingness, chain witnesses and seeded null results matched. Peak worker RSS fell from about 196 MiB to 140 MiB. Concurrent local tests affect timings; reproduce and compare distributions before extrapolating.

The changes index catch memberships once, reuse per-node subset membership sets, and avoid extracting identical rows twice during each decay step. The exact oriented subset graph and Kuhn matching remain unchanged. Graph construction is still quadratic in distinct patterns and matching can still dominate dense cases. A more complex matcher or approximate statistic is not justified by this evidence.

```sh
pnpm build
node scripts/benchmark-integration.mjs run .local/matrix-performance-NEW.json
node scripts/benchmark-system.mjs run .local/system-performance-NEW
```

The system benchmark covers registry loading, preserved evidence inspection, selected scenario construction, reference/negative validation and report composition. Native/browser integration separately records actual construction, grading, capture and recipient reproduction. Output storage, subprocesses, runtime bounds and source identities belong beside elapsed time.

Report composition remains a substantial workload: the diagnostic full render wrote about 1.8 MB of reports and reached roughly 1 GiB RSS. That is not a lightweight status call. Runtime archives are approximately 0.3 GiB for the native pair and 0.9 GiB for the Node/browser runtime; repeated standalone builds/exports reached about 10 GiB per five-package integration. An actual ENOSPC failure exposed Node's silent full-copy fallback on macOS (the forced-clone API returned ENOSYS). Runtime publication now uses the native APFS clone operation on macOS and forced reflinks where supported elsewhere, with space-checked full-copy fallback. Exported archives retain independent inodes and exact bytes. The revised preflight budgets 16 GiB, checks a four-GiB reserve between stages and records minimum observed free space; concurrent unrelated disk usage remains outside that guarantee.

One additional observed bottleneck was repeated advisory runtime checks against an unavailable Docker daemon. A plugin launched by `docker info` did not terminate normally. Server-only probes now have a hard timeout and are shared within a command, never across later commands or as a substitute for actual protected execution. The associated regression checks probe bounds and refresh behavior. Complete release/runtime proof still requires a healthy Docker engine; a fast unavailable result does not satisfy that gate.

The [checkpoint system workload profile](../reports/verification/prompt-07-system-performance.json) records all cold/warm digests matching. Registry load took 9.4/2.6 ms; historical inspection 35.9/23.6 ms; wallet parameter selection 147/116 ms; memory reference/negative sweep 743/477 ms. One-family analysis took 19.1/18.6 seconds and full report composition 286/248 seconds. Advisory memoization cut observed direct child launches in the full render from 154 to 10, but these concurrent-run measurements do **not** show an overall render-speed improvement. Exact calibration/analysis still dominates that path; no faster approximation replaced it. That full-render peak was about 909 MiB RSS and its 140 reports contained 1,804,013 bytes. Subsequent correctness repairs separate historical reporting from current grading and include the previously omitted Phase 17 report; the earlier profile is not silently reassigned to that expanded output set.

Existing optimizations remain: append-only sampler grouping, parameter classification before full wallet-world construction, bounded streamed process capture, and streamed archive hashing. Current caches are per operation; matrix keys include the complete input and settings. Mutable subject processes are never pooled for a timing improvement. Large archive storage and container startup remain real costs, not model-trial counts.

The generic protected runner now transfers captured public modules through stdin into container-local tmpfs instead of binding a short-lived host directory. This removes the dependency implicated in intermittent Docker Desktop mount-setup failures; it is not a claim to repair Docker internals. The tradeoff is one short-lived trusted bootstrap process and base64 transport overhead (roughly one-third more encoded module bytes). Per-module input remains capped at eight MiB, materialized public files at twenty MiB, `/work` at thirty-two MiB, and the complete container at its existing CPU/memory/process limits. No mutable subject is reused and no failed grade is automatically retried. This is a reliability/isolation tradeoff, not a measured throughput speedup.

The [integration report](../reports/PROMPT-07-INTEGRATION.md) records final measured results and source identities. Correctness and the independent grading boundary take precedence over a faster but weaker test.
