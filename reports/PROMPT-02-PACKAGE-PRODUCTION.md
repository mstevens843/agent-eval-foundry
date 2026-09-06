# Prompt 2 — Complete native package production

Date: 2026-09-06. Base: `a228c37`. Scope: implementation and deterministic local checks only; no provider/model trial, paid rubric, commit, push or publication.

## Delivered engineering path

`pnpm package:local produce BUILD RECIPIENT` now constructs the native Go CAA service package, resolves and retains its runtime, runs executable local assurance and exports the same verified artifact graph. `build`, `inspect`, `validate` and `export` are separate operations. Inspection is read-only; failed controls block export and retain their observations. The [reproduction guide](../docs/package-production.md) contains the exact interfaces, commands and boundaries.

This advances the foundry from draft generation to one demonstrated package-production path. It does not turn native CAA into a proven-hard task, finish the other families, or satisfy unexecuted official qualification. Native `caa-revalidation-repair` remains distinct from the generic `caa-revalidation` kernel.

## Changes and their purpose

| Area | Before | Implemented outcome |
| --- | --- | --- |
| Assembly | Existing native source, manual integration and unrelated scaffold outputs | One `AssemblyPlan` over Prompt 1's immutable component graph; derived public/recipient trees, required file/executable/placeholder checks and exact export parity |
| Runtime | Recipes without a complete portable resolved-runtime boundary | Pinned Go image, Debian snapshot, Python versions; exact platform/image IDs and hashed offline runtime archive bound into package identity |
| Assurance | Checklists and separate local control scripts | Typed per-artifact/per-route execution results, exact required-control coverage, hashed retained evidence and central policy decisions |
| Native collection | Pipe output accumulated before truncation | Bounded streaming, explicit output/timeout/process status, unprivileged offline compilation, descendant termination/reaping and positive-control privilege checks |
| Valid alternatives | Heuristic source bans could reject harmless code | Structural execution/effect controls; independent alternative plus harmless `os.Setenv` and equivalent omitted/empty authorization representations exercised through the real interface |
| Native obligations | One overlap pair sufficient; report order identity unchecked; unrelated-cache preservation not specifically activated | All required rechecks share a flight interval; correct report order ID; unrelated-cache preservation fixture; dedicated partial-batching/wrong-order/cache-loss controls |
| Public contract | Bounds/type examples did not fully match execution/accepted representations | Explicit pipe/build/source limits and all valid no-authorization representations; generated baseline comes from the public source; supplied development example executes |
| Generation | Growing-array copies and eager wallet worlds | Append-based sampler with cached keys/hashes; lightweight wallet decision classification; exact historical parameter selections preserved |
| Clustering | Representative algorithm described as pairwise | Explicit representative API and compatibility alias; tested nontransitive counterexample; antichain unchanged |

These additions improve validity, completeness and repeatability. They are not evidence of improved model-failure yield. The useful reusable parts are artifact graphs, typed assurance, independent observations and narrow controls; the CAA authorization rules remain domain-specific.

## Verification

Final frozen-package/recipient results and source inventory are recorded in [the machine-readable verification receipt](verification/prompt-02.json). Both the original artifact and its copied recipient passed all 27 required operations with the same semantic verdict digest. Typecheck, lint (414 files), full ESM/CJS/declaration build, both new script checks and whitespace checks pass.

- Final build: `.local/prompt-02/build-09`; exact repeat: `.local/prompt-02/build-10`.
- Recipient: `.local/prompt-02/export-09`, including `tasks/caa-revalidation-repair` and the offline runtime archive.
- Package digest: `faa1c47953000946432d76bd2ebf0ce061867de73fdd645de440bcba14bfd60f`.
- Tested source digest: `251950ea32e1cb33b50ece0279af1c8534cd6a573f918ddf17945b56776c8d97` over 3,229 files; before/after inventories match. The two non-runtime Prompt 2 report outputs and ignored/generated files are excluded to avoid self-referential hashes.
- 838 original trial/campaign/evidence/lock files were compared with their initial snapshot; none changed.

The copied recipient's complete validation took 371.33 seconds in aggregate and reproduced the original control outcomes. The reproduction script also checked identical task graphs, runtime archive hashes and full package identity across build/repeat/export, and proved inspection leaves artifact bytes unchanged. Local-valid is allowed; trial eligibility, spending authority, measured hardness and release eligibility are not.

The targeted TypeScript regression run has 105 passed, zero failed and zero skipped. It covers the 10 package-production tests, Prompt 1 identity/policy tests, wallet family/reference/mutant tests, the axis meter, population integrity and public-surface behavior. The package-production tests include:

- An actual numeric assembly/oracle/verifier/export cycle with no CAA-specific fields.
- Private exposure, placeholders, executable modes, stale bytes and existing-destination rejection.
- Failed/empty/mismatched assurance and evidence-byte mutation rejection.
- Bounded trusted-tool output/timeouts and fully flushed evidence logs.
- Exact selected parameter order/digests for all registered executable family routes.
- Decision equality over all 82,944 wallet points, invalid sampler inputs, hash-collision tie behavior and the representative Jaccard counterexample.

The native suite comprises 27 required assurance operations, including 22 actual pinned format checks, 22 public-interface variants (3 correct, unchanged starter, 15 designated wrong implementations and 3 artifact-path controls), 12 Python artifact/process/authority tests, visible workspace execution and the full native scenario/control/repeatability gate. Counts refer to different layers and must not be summed as independent model trials. Each correct public-interface submission is graded on 24 selected scenarios and 243 pytest assertions; comparison/non-activation scenarios are not extra model attempts.

### Development failures were retained, not relabelled

The initial integration failed when a standalone gate container lacked `/logs`; export was correctly denied. A second run exposed missing format canaries/path naming and a checker that rejected the reference's empty-string representation for absent authorization. Those were package defects, not model or concurrency failures. They were fixed, and the controls rerun. Later authoring revisions corrected recipient folder naming, receipt inspection, full-public-tree visibility coverage and equivalent report/audit absence representations.

Intermediate artifacts remain under `.local/prompt-02/build-*` and are not substituted for final-version evidence. Final verification names its exact artifact. No historical agent submissions, campaign hashes or original adjudications were rewritten.

The unchanged starter and `identity-collapse` control also exit nonzero on the indeterminate-authority case `sel-13/o2`; the typed evaluator preserves that as `artifact-failure` with `process-error`, while their intended semantic defects activate on other completed cases. Their reward-zero controls are not presented as clean completed-model failures. All three correct alternatives complete and pass. The `two-query-batches` near-miss fails only one selected scenario, providing a more focused concurrency control.

The final build's local operations took 366.70 seconds in aggregate (about 6.1 minutes; excludes image build/export overhead). Its pre-revalidation recipient contains 610 files/413,163,340 bytes, including a 317,566,464-byte runtime archive. Full local assertion/evaluation evidence is retained; compressing repeated CTRF failure context is a possible Prompt 7 storage optimization, not a reason to discard observations. Intermediate diagnostic directories are intentionally retained rather than silently deleted.

## Measured generation improvements

Apple M4 Pro, macOS arm64, Node 22.22.1. Separate process per variant/size, one warmup, three measured repetitions with GC before each. Times below are medians; RSS is the process high-water mark, not isolated live algorithm memory. [Raw measurements](verification/prompt-02-generation-performance.json) retain every repeat and selection digest. The benchmark script retains the old implementation strictly as a measurement baseline.

| Work | Before | After | Peak RSS before → after |
| --- | ---: | ---: | ---: |
| Single-stratum sampler, 2,000 points | 3.15 ms | 0.94 ms | 60.1 → 53.8 MiB |
| Single-stratum sampler, 8,000 points | 34.11 ms | 3.68 ms | 88.0 → 64.2 MiB |
| Single-stratum sampler, 32,000 points | 1,097.85 ms | 14.83 ms | 149.3 → 70.8 MiB |
| Full wallet selection, 82,944 points | 688.53 ms | 106.09 ms | 296.1 → 172.1 MiB |

Wallet with only the sampler repair takes 151.86 ms and 289.6 MiB peak RSS; avoiding discarded full worlds provides the further improvement. All variants retain the same 804 selected wallet parameters. The sampler's grouping changes from quadratic copied-element work to linear insertion; ranking still sorts. This is not a 74-fold overall foundry speedup or a forecast of task-production throughput.

## Identity, compatibility and limits

Package identity covers exported source/components, private scenarios/controls, producer source, retained format-check scripts and exact runtime image/archive identity. UUID/log/time metadata is outside semantic identity. Successful repeat builds prove repeatability for the tested resolved runtime/platform, not universal byte identity across cold rebuilds, architectures or changed registries. Portable export retains the actual images so a recipient can validate without resolving fresh runtime dependencies.

The receipt verifies exact required controls and evidence bytes; it is a trusted local-author record, not an independently signed attestation. Read-only inspection rederives the shared policy decision rather than trusting a saved decision field. Independent human-time/fairness and destination qualification remain pending. Successful local tests cannot authorize model spending.

No existing valid sampler selection changed. New explicit rejections affect invalid fractions, empty/duplicate identities and invalid Jaccard thresholds. Jaccard clustering retains the historical representative relation. Native contract/check changes create new package identities; old evaluations remain historical.

Remaining timing caveat: the native authority uses delayed concurrent responses and an independent event sequence, not a fully virtualized scheduler. Repeated reference/alternative checks passed on the tested environment; arbitrary host starvation is not proven harmless. Future scheduling changes require their own reference and non-activation evidence and must not convert infrastructure effects into model-failure claims.

## Remaining ownership and next step

- Prompt 3: ten remaining protected family routes and incomplete checker/replay contracts. Reuse the assembly/assurance APIs; do not claim native controls ran on those routes.
- Prompt 4: substantial diverse portfolio and second serious production adapter. The numeric fixture proves API generality only. Keep native CAA's historical six-hour expert estimate separate from the owner's desired independently demonstrated two-to-three-hour solve.
- Prompt 5: exact authorized provider execution, reservations and the three intentionally denied old shell-runner tests recorded by Prompt 1.
- Prompt 7: broader performance/integration/public clarity and the two still-unexecuted exhaustive memory-host sweeps. No full-repository-green claim is made here.
- External/owner authorization: independent human-time/fairness, human-authored reviewer material, official rubric, standard trials and adversarial trials. None ran under Prompt 2.

The shared implementation gap ledger records scoped engineering closures and keeps the native external-qualification gap separate. Start Prompt 3 next: the common production and local assurance interfaces now exist; extending actual protected execution is the next dependency before building a serious portfolio.
