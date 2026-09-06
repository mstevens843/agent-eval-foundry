# Evidence, findings and package selection

Build aggressively, validate locally, inspect each outcome briefly, and reserve deep causal work for meaningful evidence. This implementation provides a read-only inspection path and a versioned learning loop; it does not authorize model execution or certify hardness.

## Start with an actual run

After `pnpm build`, one command opens the corrected outbox case:

```sh
pnpm package:local learning case durableoutbox-cc267
```

It renders all six runs, failures, source hashes, current adjudications, contract/code navigation suggestions, inline checking source and a transcript timeline. `--json` returns the structured view. No provider, submitted code, grader, browser or replay runs when opening a case.

For a manageable saved view, publish an exclusive private case folder:

```sh
pnpm package:local learning publish-case durableoutbox-cc267 .local/learning/outbox-review-01
pnpm package:local learning run trials/durable-approval-outbox/cc267-codex-3
pnpm package:local learning index trials
pnpm package:local learning case memory-host-contract-correction
```

Publication creates a README, machine-readable finding/assessment, individual Markdown/JSON run views, and a completion manifest. The destination must be new, below `.local/learning/` or `findings/generated/`; both are ignored. Never edit the sealed view to update a finding: publish another view. Generated reports contain local absolute links so they work immediately; regenerate after moving the evidence checkout.

The tracked source of truth is `findings/cases/<case-id>/<revision>.json`. The earlier ignored `findings/durableoutbox/README.md` remains untouched author analysis, not an input to code or tests. Primary historical trial files must be explicitly supplied in a recipient checkout; missing artifacts return unknown/unavailable, not fabricated evidence.

## What the viewer establishes—and what it does not

| View | Authority and limit |
| --- | --- |
| Observed outcome | Actual retained reward/cells, not a new evaluation. Modern native and portfolio execution grades are checked against retained scenario/check sets, public assembly and complete capture. |
| Package identity | Retained full snapshot/public bytes for modern execution. Legacy visible-only identity cannot identify the missing historical evaluator. |
| Model settings | Requested profile and effective observation are separate. Missing effort, fallback and unobserved scaffold/version cannot qualify exact-target evidence. |
| Failed obligation | JSON pointer to a real graded cell; raw external witnesses linked where mapped. Historical grade cells alone are not an independent raw event ledger. |
| Code/clause/checker links | Keyword navigation suggestions, not causal attribution. Full source and raw record remain available. |
| Timeline | Logged commands, edits, statements and outputs in transcript record order. Missing timestamps remain missing. This is not a reconstruction of private reasoning. |
| Self-check source | Inline scripts and retained workspace source included. Source presence does not prove execution, completeness or adequacy; duplicate log records may duplicate extracted scripts. |

Files are read as data, never imported as submitted code. Markdown/terminal control escaping and indented source blocks keep transcript text inert. Raw links intentionally open underlying evidence, not execute it. Trust the operator-supplied evidence root: a digest detects changes, but is not by itself proof a provider or human performed an event.

Inspection limits are explicit: 128 MiB/file tree, 4,096 entries, depth 24; parsing at most 16 MiB per JSON/transcript and 2 MiB per code-search file; 32 MiB text cache; 20,000 timeline events and 4 KiB/event preview. Full accepted raw bytes remain linked. Oversized content is reported missing or refused; index rows report individual unreadable sources without disappearing. These are inspection resource limits, never criteria for declaring a model failure.

## Finding lifecycle

Claims separately carry observation, failed obligation, what worked, visible checking, interpretation/basis, alternative explanations, counterevidence, promotion/withdrawal conditions, source identities and dependencies. Do not mark a whole case proven because one claim is useful.

Statuses are `observation`, `hypothesis`, `disputed`, `local-reproduction`, `capability-supported`, `transferred-hardness`, `withdrawn`, and `superseded`. Assessment can downgrade a declared status to `source-unavailable` or `needs-revalidation`.

To append a revision, prepare a JSON `FindingInput` using the types in `src/learning/findings.ts`: copy a prior input, increment `revision`, set `previous` to its digest, retain correction provenance, and change the relevant claims. Omit the derived `digest` field. Append explicitly:

```sh
pnpm package:local learning append .local/learning/new-finding-revision.json
pnpm package:local learning assess durableoutbox-cc267,memory-host-contract-correction
```

Numbered files are exclusive; a conflicting writer or stale parent is rejected. Loading checks the whole chain. Original results, sidecars, submissions and dissent are never rewritten. Old generated views remain historical snapshots; newly generated summaries reassess current heads. CLI queries recursively resolve the latest dependency revisions; missing dependencies fail closed.

The dependency path is:

```text
preserved source bytes + adjudication
       → claim assessment + revision digest
       → dependent claims and transfer assessment
       → package ranking digest and regenerated summary
```

A correction changes assessment/cache identity even without a code change. Revised dependencies require explicit revalidation; withdrawn/disputed sources lose proven-support credit while their raw observations remain inspectable. Consumers must key caches by the returned assessment/selection digest, not just package code hashes. No cache is persisted by this implementation.

New adjudications belong in the claim's `adjudications` overlays, not in a sealed trial. An overlay that upgrades disputed/unlabelled to capability requires an attested human review and cannot override simulation, incomplete evaluation, mismatched identity or exact-profile blockers. The review is a detached Ed25519 signature over the UTF-8 finding digest; `findingDigest` normalizes `review.signature` to null. The owner separately supplies trusted reviewer public keys with `--reviewers .local/learning/trusted-reviewers.json` (a map from enrolled reviewer IDs to PEM public keys). Agent-filled `kind: human` is never sufficient. No reviewer or key is enrolled automatically. Signature validity is provenance, not proof the review's reasoning is correct.

## Corrected examples

The outbox source records preserve six completed zero rewards. Current labels are five `spec-underspecified`, one `unlabelled`. All six retain authored checking source; Codex 3's extracted table permits the disputed transition. This is useful engineering/inspection evidence, not six established fair capability failures. The different history/completion outcomes are retained, not erased to fit a new narrative.

The separate memory case links three `harness-contract-violation` adjudications. Those records attribute a repeated 32-scenario signature to the host recreating a facade that the visible contract promised to keep identical. The current import does not rerun that experiment or claim the historical reproduction output is newly verified. Repetition across agents cannot turn a shared host defect into a universal model weakness.

## Transfer records

`findings/transfers/` contains fifteen versioned maps: three categories for each actual Prompt 4 package digest. Query their current support:

```sh
pnpm package:local learning transfers durableoutbox-cc267,memory-host-contract-correction
pnpm package:local learning directions
```

Each names professional applicability, source claim/digest, target package/contract digest, affected layers, visible obligations, solution difference, independent observations, alternative correct solutions, narrow controls, counterevidence and falsifiers.

| Category | Meaning |
| --- | --- |
| Validity infrastructure | Reuse protected observation, positive work and independent grading, adapting collectors to the domain. |
| Domain invariant | Adapt a legitimate requirement such as ownership, immutable accepted history or bounded resolution. |
| Hardness hypothesis | A proposed difficult interaction; requires qualified evidence on the new target, not just a renamed outbox. |

Native CAA focuses on per-name authority and order-wide issuance; browser replay on current DOM/value/confirmation and exact backend effects; persistence on revisioned dependency closure and lineage; wallet on cumulative authority/budget/receipt identity; rollout on generation/ABI health and selective recovery. Wallet is the closest relative of outbox and requires explicit essential-solution comparison. Shared collector code alone neither proves nor disproves diversity.

The five packages were inspected during construction/selection, so none is untouched held-out evidence. Transfer revisions append exposure events and cannot remove prior events or change target identity in place. Exposure is merged across transfer aliases for the same exact target. A changed target gets a new package identity and a new transfer record. The system cannot detect undisclosed off-record inspection; researchers must record it honestly.

```sh
pnpm package:local learning append-transfer .local/learning/transfer-revision.json
```

Input is `{ "record": <TransferRecord>, "previous": <digest-or-null> }`. A one-off `learning transfer RECORD_JSON FINDING_IDS` is explicitly a preview; use the stored `transfers` query for exposure-aware decisions. No current mapping is proven target-model hardness.

## Package-first selection

`selectPackages` uses the existing `decidePackage` policy; it does not establish another release gate. Decisions include repair, construct, local validation, eligibility review, authorized execution, brief triage, deep investigation, transfer, retirement and hold. It never dispatches work.

`learning select INPUT_JSON` resolves actual native/portfolio exports and byte-verified assurance receipts. Its input schema is `PortfolioSelectionInput` in `src/learning/command.ts`; the integration script builds a complete example from supplied exports. Include explicit `knownIssues`, construction review/evidence/uncertainty, trial paths and reviewed source digests. No absent human review is inferred from an automated assurance receipt. Broader programmatic callers supply separately verified policy evidence to `selectPackages`.

Selection respects bounded WIP, a portfolio limit and digest-bound pairwise diversity reviews. Known ambiguity/bypass takes precedence over difficulty. A current untriaged solve gets brief triage; deep investigation requires a current qualified failure plus supported finding. Stale history alone does not demand repairing an already revised package. Axis count is irrelevant to eligibility. Retirement is explicit.

Weights are disclosed ordinal planning preferences, not model failure probabilities: promise 8, completeness 2, qualified support 3, remaining hours 0.05. The result includes half/double-weight sensitivity rankings. Unknown remaining cost stays null; the ranking uses a disclosed conservative assumption of the greater of 24 hours or the largest known estimate, not zero. No lexical cheapest-first ordering, mechanism/knob count or prose-length bonus predicts hardness. The legacy discovery/adaptive reports remain advisory compatibility views, not dispatch authority.

Construction review is a judgment input, not an author self-certification of fairness, expert solve time or release. The actual portfolio review leaves those qualifications pending and explicitly returns the frozen browser mock defect to repair.

## Cohorts and economics

`learning cohort INPUT_JSON` takes `[cohortId, startISO, endISO, CohortEntry[]]`. One entry is a candidate/package-version. Keep entry evidence links to policy decisions, receipts and accounting records. Metrics are an accounting aggregation over supplied events, not a second qualification engine.

- Candidate-to-valid: valid versions / entered versions.
- Valid-to-promising: promising versions / valid versions.
- Qualification yield: qualified versions / valid versions. Neither is extrapolated to 1,000 tasks.
- Invalid execution: invalid actual agent attempts / actual agent attempts. Regrades and simulations are excluded.
- Time to valid and supported diagnosis use ordered timestamps; cohort boundaries and duplicate attempt identities are validated.
- Author/reviewer/provider/compute/storage cost retain known sums, missing counts and unknown totals. Local work is not described as free.
- Rework records known hours plus unknown entries. Duplicate-adjusted qualification reports reviewed essential-solution clusters and separately counts unreviewed packages.

No generic model-learning probability is fitted to the six selected outbox outcomes. Cost and diversity declarations require source review before making production economics claims.

## Verification and handoff

`test/learning.test.ts` exercises historical negative cases, synthetic signed-review/correction/withdrawal propagation, selection policy, immutable transfers, privacy, rendering and economics. Synthetic positive-policy fixtures are explicitly not persisted as real results.

For actual local integration, supply five retained exports and a Prompt 5 execution evidence root:

```sh
node scripts/verify-evidence-learning.mjs NATIVE_EXPORT BROWSER_EXPORT MEMORY_EXPORT WALLET_EXPORT ROLLOUT_EXPORT PRESERVED_EXECUTION_ROOT .local/learning/review-01
```

The script reads matching receipts, opens all six outbox runs, maps all fifteen transfers, verifies preserved native/browser pass/fail/invalid records and a regrade, resolves failure pointers and checks raw source preservation. It publishes private views and proof siblings; no new evaluation occurs. It fails if required artifacts are absent rather than silently skipping them.

Historical adversarial summaries now retain original count flags/hashes but exclude changed-package audits from current support. Full historical evaluator verification is unknown, not asserted from an old hash. Registry validation no longer asks historical records to impersonate today's package. Legacy bundle preparation/readiness expectations remain a separately tracked integration issue.

Prompt 7 owns broader compatibility reconciliation, public entry-point curation, measured whole-system performance, and a new browser package version fixing the visible mock. Human review, effective provider attestation and real standard/adversarial qualification still require separate authority and evidence.
